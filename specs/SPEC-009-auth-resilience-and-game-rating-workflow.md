# SPEC-009: Resiliência de Autenticação e Fluxo de Avaliação de Jogos na Busca

## 1. Contexto e Problema
1. **Erro 401 (Unauthorized) no POST `/wishlist`:**
   - O middleware de autenticação (`auth.middleware.ts`) e a rota `/auth/me` liam primeiramente o cookie HttpOnly `access_token`.
   - O token JWT emitido pelo Supabase possui expiração padrão de 1 hora (`exp: 3600`), enquanto o cookie possuía `maxAge: 7 dias`.
   - Ao expirar após 1 hora, o cookie persistente no navegador falhava na validação JWT local e na validação remota, bloqueando requisições mesmo quando o frontend enviava tokens renovados no cabeçalho `Authorization: Bearer <token>`.
   - Além disso, na ausência de refresh no backend ou falha de token no frontend, não havia mecanismo de auto-recuperação (BFF).

2. **Fluxo Incompleto de "Já Zerei" na Busca:**
   - Ao buscar um jogo e clicar na opção "Já Zerei" (`status: 'completed'`), a aplicação invocava imediatamente `addToList` sem solicitar a nota (1 a 5 estrelas) nem a resenha opcional do usuário.
   - O item ingressava na biblioteca sem `userRating`, privando o motor de recomendação de jogos (`gameRecommendation.service.ts`) do cálculo de afinidade e ranking baseado nas avaliações do usuário.

---

## 2. Decisões de Arquitetura e Engenharia

### 2.1 Resolução de Tokens e Fallback Multi-Camadas (Backend)
- **Prioridade 1:** Cabeçalho `Authorization: Bearer <token>` (token explícito gerenciado ativamente pelo cliente Supabase com auto-refresh).
- **Prioridade 2:** Cookie HttpOnly `access_token` (armazenado pelo navegador).
- **Prioridade 3:** Query param `?token=` (suporte a SSE/MCP).
- **Auto-Refresh via `refresh_token` (BFF Pattern):**
  - Se nenhum token de acesso for válido, mas o navegador possuir o cookie HttpOnly `refresh_token`, o backend consulta `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`.
  - Havendo sucesso, renova os cookies HttpOnly (`access_token` e `refresh_token`), popula `request.userId` e conclui a operação sem emitir 401 indevido.

### 2.2 Interceptor de 401 com Retry Único (Frontend)
- Em `frontend/src/lib/api.ts`:
  - Se qualquer requisição retornar status `401`, o cliente executa `supabase.auth.refreshSession()`.
  - Em caso de renovação válida, re-injeta o cabeçalho `Authorization: Bearer <new_token>` e repete a requisição de forma transparente.

### 2.3 Fluxo de Avaliação de Jogos na Busca (`Search.tsx`)
- Integração com o componente acessível `RatingModal`:
  - Ao clicar em "Já Zerei" em um novo jogo ou "Marcar como Zerado" em um jogo pré-existente na biblioteca, o modal de detalhes do jogo é fechado e o `RatingModal` é aberto imediatamente.
  - O usuário seleciona de 1 a 5 estrelas e pode registrar observações/resenha.
  - Ao clicar em "Salvar Avaliação", o payload é enviado com `status: 'completed'`, `userRating: rating` e `notes: review`.
### 2.4 Estado de Espera e Feedback Positivo de Adição (`GameDetailsModal`)
- Ao clicar em **Quero Jogar** (`plan_to_watch`) ou **Jogando Agora** (`watching`):
  - O botão clicado entra em estado de espera com spinner giratório (`Loader2`) e texto contextual (*"Adicionando..."* ou *"Iniciando..."*).
  - Os botões de ação ficam temporariamente desabilitados (`disabled={isAdding}`) para impedir requisições duplicadas.
  - O modal **não é fechado bruscamente**; ele aguarda a resolução do `POST /wishlist`.
  - Assim que a adição é confirmada pelo backend, a interface transiciona imediatamente para o bloco de feedback:
    > **"Já está na sua Biblioteca"** acompanhado do ícone de Check verde esmeralda, do badge correspondente do status e dos atalhos contextuais de ciclo de vida (*Começar a Jogar*, *Marcar como Zerado* e *Remover*), espelhando o padrão já consagrado no modal de cinema e séries (`MediaDetailsModal`).

---

## 3. Compatibilidade Universal de Plataforma
- **Android TV / D-Pad:**
  - `RatingModal` mantém `tabIndex={0}` em cada botão de estrela, campo de texto e botão de confirmação.
  - Foco gerenciado automaticamente com suporte a `.tv-focus-glow` e tecla `Escape` para cancelamento.
- **Mobile (Touch):**
  - Áreas de toque de no mínimo 44x44px em cada estrela e nos botões de ação ("Salvar Avaliação" / "Cancelar").
- **Desktop:**
  - Suporte a navegação por mouse e teclado, feedback visual em hover nas estrelas.

---

## 4. Testes Automatizados
- `backend/tests/routes/wishlist.routes.test.ts`: Valida inserção polimórfica e integridade com autenticação.
- `frontend/tests/lib/api.test.ts`: Testa injeção de headers, Content-Type condicional e retry automático com `refreshSession()` após status 401.
- `frontend/tests/pages/Search.test.tsx`: Testa abertura do `RatingModal` ao clicar em "Já Zerei" e persistência com `status: 'completed'`, `userRating` e `notes`.
