# SPEC-018: Estado Assíncrono de Carregamento e Confirmação de API em Filmes e Séries

## 1. Contexto & Motivação
Nos módulos especialistas do Akasha (Jogos via `GameDetailsModal`, Livros via `BookDetailsModal` e Quadrinhos/Mangás via `ComicDetailsModal`), ao clicar nos botões de adição ao acervo ("Quero Jogar/Ler", "Jogando Agora / Lendo Agora"), a interface assume um estado de carregamento explícito (`Loader2 animate-spin`, texto dinâmico "Adicionando..." / "Iniciando...", botões desabilitados com `aria-busy` e prevenção contra múltiplos disparos acidentais). O modal permanece aberto enquanto aguarda a resposta positiva da API e, após o sucesso, transiciona suavemente para o estado "Já está na sua Biblioteca", permitindo ações adicionais imediatas.

No modal de Cinema e Séries (`MediaDetailsModal.tsx`), o botão "Quero Ver" anteriormente realizava um disparo síncrono seguido do fechamento imediato do modal (`onAdd(media); onClose();`), sem exibir feedback visual de processamento na rede e sem confirmação prévia de persistência no banco de dados.

## 2. Requisitos da Especificação

### 2.1 Estado Visual de Carregamento (Loading State)
1. Ao clicar em **"Quero Ver"**:
   - `addingStatus` assume `'plan_to_watch'`.
   - O botão é desabilitado (`disabled={addingStatus !== null}`), prevenindo cliques repetidos (*double submit*).
   - O ícone `Bookmark` é substituído por `Loader2` com animação `animate-spin` na paleta de cor caramelo claro (`var(--color-caramelo-claro)`).
   - O rótulo textual muda para **"Adicionando..."**.
   - O atributo de acessibilidade `aria-busy="true"` é acionado no elemento.
2. Ao clicar em **"Começar a Assistir"**:
   - `addingStatus` assume `'watching'`.
   - O ícone `Play` é substituído por `Loader2 animate-spin`.
   - O rótulo textual muda para **"Iniciando..."**.
   - O botão permanece desabilitado até a resposta da requisição.
3. Ao clicar em **"Já Assisti"**:
   - Dispara o fluxo de conclusão/avaliação (`status === 'completed'`), acionando o `RatingModal`.

### 2.2 Resposta Positiva da API e Transição Otimista
1. A função `handleAddWithStatus` executa `await onAdd(media, status)`.
2. Se a Promise resolver com sucesso:
   - `optimisticStatus` é atualizado para o status adicionado.
   - O componente recalcula `isCurrentlyInLibrary = isInLibrary || Boolean(optimisticStatus)` e exibe o bloco "Já está na sua Biblioteca" com o badge temático.
3. Se a Promise for rejeitada (falha de rede ou erro 5xx):
   - O erro é capturado no bloco `catch`.
   - `optimisticStatus` permanece nulo, garantindo que a mídia não seja falsamente marcada como adicionada.
   - O usuário pode tentar novamente após o loader ser desativado no bloco `finally`.

### 2.3 Reset de Estados
- Sempre que o modal for fechado ou a mídia selecionada for alterada (`[media?.id, isOpen]`), os estados `addingStatus` e `optimisticStatus` são imediatamente resetados para `null`.

## 3. Compatibilidade Universal & Acessibilidade

### 3.1 Android TV & Controle Remoto (D-Pad)
- Todos os botões preservam `tabIndex={0}` e classe `.tv-focus-glow`.
- Durante o carregamento, `disabled` impede disparos acidentais da tecla *Select/Enter* no controle.
- Leitores de tela são notificados via `aria-busy` e atributos `aria-label`.

### 3.2 Mobile Touch Targets
- Botões mantêm altura mínima de `min-h-[44px]` com área de clique ampla.
- Ícone `Loader2` e texto possuem alinhamento flexível e `shrink-0` para não quebrar em telas estreitas (320px - 375px).

## 4. Testes Automatizados
- Validação no arquivo `frontend/tests/components/ui/MediaDetailsModal.test.tsx`:
  - Renderização inicial de "Quero Ver" com `tabIndex={0}`.
  - Verificação do estado de carregamento com texto "Adicionando..." e atributo `disabled` enquanto a Promise está pendente.
  - Transição para "Já está na sua Biblioteca" após resolução da Promise.
  - Verificação de "Começar a Assistir" com texto "Iniciando..." e loader.
