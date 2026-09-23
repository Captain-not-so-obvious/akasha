# SPEC-002: Camada Social & Sistema de Conexões Bilaterais (Estilo MSN)

| Metadado | Detalhe |
| :--- | :--- |
| **Status** | Aprovado / Em Planejamento |
| **Versão** | 1.0.0 |
| **Data** | 2026-09-23 |
| **Autor** | Engenharia de Software & Arquitetura Akasha |
| **Alvos** | `backend`, `frontend`, `prisma/schema.prisma`, `docs` |
| **Branch** | `dev` |

---

## 1. Visão Geral e Motivação

O **Akasha** é uma plataforma de curadoria e consumo de entretenimento transmídia. Ao contrário de redes sociais abertas com feeds ruidosos e impessoais, a camada social do Akasha é inspirada no modelo do **MSN Messenger / Steam**:
1. **Conexões Íntimas e Simétricas:** Relações bilaterais onde ambas as partes precisam aceitar a solicitação de amizade.
2. **Privacidade Absoluta:** O acervo, notas pessoais e histórico de consumo de um usuário só são visíveis por amigos confirmados.
3. **Curadoria Relevante:** Estabelece a fundação de confiança necessária para as etapas subsequentes do roadmap:
   - **5.4:** Feed de Atividades ("O que seus amigos estão assistindo/jogando/lendo").
   - **5.5:** Comparação direta de acervos e avaliações de mídias em comum.

---

## 2. Análise de Segurança & Blindagem contra Abusos

Como o sistema permite localizar usuários para envio de solicitações, foram desenhadas defesas rígidas contra riscos clássicos de enumeração e assédio/spam.

### 2.1 Análise de Riscos

| Vetor de Risco | Cenário de Ataque | Mitigação Arquitetural no Akasha |
| :--- | :--- | :--- |
| **Enumeração por Força Bruta** | Hacker tenta adivinhar códigos ou e-mails em lote para mapear todos os usuários da base. | **Entropia Alta + Rate Limit:** Código alfanumérico com mais de 1 trilhão de combinações (`AK-XXXX-XXXX`). Rate limit de **5 tentativas/minuto** por usuário/IP no Fastify. |
| **Spam de Solicitações (DoS Pessoal)** | Atacante inunda a caixa de solicitações de um usuário com convites. | **Rate Limit Global & Individual:** Máximo de 1 solicitação pendente ativa por par de usuários (`requesterId` + `addresseeId`). Recusa ou Bloqueio definitivo. |
| **Vazamento de Dados Pessoais (Data Leak)** | O atacante busca um e-mail ou código para descobrir quem é o dono. | **Zero Retorno de Dados Sensíveis:** O endpoint de solicitação **nunca** retorna o e-mail, listas ou metadados privados. Retorna apenas `{ success: true, message: "Solicitação enviada" }`. |
| **Vazamento Público do Friend Code** | Usuário expõe acidentalmente seu código em live/rede social. | **Revogação Instantânea ("Regenerar Código"):** O usuário pode clicar em um botão no Perfil e invalidar o código antigo imediatamente. |

---

## 3. Modelo de Dados Unificado (Prisma Schema)

### 3.1 Alterações no `backend/prisma/schema.prisma`

```prisma
enum FriendshipStatus {
  pending   // Solicitação enviada, aguardando aceite
  accepted  // Amizade mútua confirmada
  declined  // Recusada pelo destinatário
  blocked   // Bloqueio unilateral (impede novas solicitações)
}

model Profile {
  id          String       @id @db.Uuid
  email       String?      @unique
  username    String?      @unique
  avatarUrl   String?      @map("avatar_url")
  friendCode  String       @unique @map("friend_code") // Ex: "AK-98BF-72A1"
  updatedAt   DateTime     @default(now()) @updatedAt @map("updated_at")

  wishlists   Wishlist[]
  oauthCodes  OAuthCode[]
  
  // Relacionamentos sociais
  sentRequests     Friendship[] @relation("SentFriendships")
  receivedRequests Friendship[] @relation("ReceivedFriendships")

  @@map("profiles")
}

model Friendship {
  id           Int              @id @default(autoincrement())
  requesterId  String           @map("requester_id") @db.Uuid
  addresseeId  String           @map("addressee_id") @db.Uuid
  status       FriendshipStatus @default(pending)
  createdAt    DateTime         @default(now()) @map("created_at")
  updatedAt    DateTime         @default(now()) @updatedAt @map("updated_at")

  requester    Profile          @relation("SentFriendships", fields: [requesterId], references: [id], onDelete: Cascade)
  addressee    Profile          @relation("ReceivedFriendships", fields: [addresseeId], references: [id], onDelete: Cascade)

  @@unique([requesterId, addresseeId])
  @@index([addresseeId, status])
  @@index([requesterId, status])
  @@map("friendships")
}
```

---

## 4. Contratos de API (Fastify + Zod)

Todos os endpoints exigem autenticação via Supabase JWT (`verifySupabaseAuth`).

### 4.1 Enviar Solicitação de Amizade
* **Rota:** `POST /friends/request`
* **Schema Zod:**
  ```typescript
  export const sendFriendRequestSchema = z.object({
    target: z.string().min(3).max(120), // Pode ser email, @username ou friendCode
  });
  ```
* **Regras de Negócio:**
  1. Identifica o alvo procurando por `email = target`, `username = target` ou `friend_code = target`.
  2. Impede solicitação para si mesmo.
  3. Verifica se já existe relação entre os dois:
     - Se `accepted`, retorna erro 400 ("Vocês já são amigos").
     - Se `blocked`, retorna 404 (resposta indistinguível para não expor bloqueio).
     - Se `pending`, retorna erro 400 ("Solicitação já enviada").

### 4.2 Listar Amigos Confirmados
* **Rota:** `GET /friends`
* **Retorno:**
  ```json
  [
    {
      "id": "uuid-do-amigo",
      "username": "cinefilo_mor",
      "avatarUrl": "https://...",
      "friendCode": "AK-41A8-99B2",
      "totalMedia": 142,
      "friendsSince": "2026-09-23T10:00:00Z"
    }
  ]
  ```

### 4.3 Listar Solicitações Pendentes
* **Rota:** `GET /friends/requests`
* **Retorno:**
  ```json
  {
    "received": [
      {
        "id": 12,
        "requester": { "id": "uuid", "username": "amigo_legal", "avatarUrl": null },
        "createdAt": "2026-09-23T09:30:00Z"
      }
    ],
    "sent": [
      {
        "id": 13,
        "addressee": { "id": "uuid", "username": "colega", "avatarUrl": null },
        "createdAt": "2026-09-23T09:40:00Z"
      }
    ]
  }
  ```

### 4.4 Responder Solicitação
* **Rota:** `PATCH /friends/requests/:id`
* **Schema Zod:**
  ```typescript
  export const respondFriendRequestSchema = z.object({
    action: z.enum(['accept', 'decline', 'block']),
  });
  ```

### 4.5 Bloquear Usuário Diretamente
* **Rota:** `POST /friends/:id/block` (onde `:id` é o UUID do alvo)
* Corta imediatamente a amizade existente e seta o status para `blocked`.

### 4.6 Desbloquear Usuário
* **Rota:** `POST /friends/:id/unblock` (onde `:id` é o UUID do alvo)
* Remove o registro da tabela `friendships`, permitindo futuras conexões caso desejado.

### 4.7 Listar Usuários Bloqueados
* **Rota:** `GET /friends/blocked`
* Retorna a lista de usuários bloqueados pelo usuário atual.

### 4.8 Desfazer Amizade
* **Rota:** `DELETE /friends/:id` (onde `:id` é o UUID do amigo)
* Remove o registro da tabela `friendships`.

### 4.9 Regenerar Friend Code
* **Rota:** `POST /friends/regenerate-code`
* Gera um novo código alfanumérico seguro com entropia Crockford Base32. O código antigo deixa de funcionar imediatamente.

### 4.10 Obter e Atualizar Perfil / Foto (`/profile/me`)
* **Rota:** `GET /profile/me`
  * Retorna `{ id, email, username, avatarUrl, friendCode, totalMedia, totalFriends }`.
* **Rota:** `PATCH /profile/me`
  * Schema Zod: `updateProfileSchema`
  * Suporta atualização de `@username` (único, alfanumérico) e `avatarUrl`.
  * **Segurança Reforçada (Anti-XSS & Anti-Tracking):** Para impedir injeção de scripts (XSS via SVGs maliciosos), rastreamento de IP dos amigos (tracking pixels) e ataques de rede (SSRF), **URLs arbitrárias da internet são estritamente rejeitadas**. O sistema aceita exclusivamente:
    1. Upload direto do dispositivo (sanitizado e compactado no frontend para raster JPEG/WebP em base64 `data:image/...` até 500KB);
    2. Avatares temáticos oficiais do Akasha (presets auditados DiceBear);
    3. Foto de perfil oficial do Google OAuth (`*.googleusercontent.com`).

---

## 5. Arquitetura Frontend & Experiência Universal

### 5.1 Android TV (Prioridade D-Pad e Controle Remoto)
* **Aba Social na Navegação Lateral:**
  * Ícone `Users` no menu de navegação.
  * `tabIndex={0}` em todos os cards e botões.
  * Contorno iluminado no estado `:focus-visible` (`var(--color-caramelo-claro)`).
* **Card "Conectar Amigos":**
  * Exibe com destaque o Friend Code do usuário (ex: `AK-89XY-42K3`).
  * Mostra um **QR Code** na tela. O usuário aponta o celular para a TV e o link abre diretamente no app mobile/web para adicionar na hora, poupando a digitação no controle remoto.
* **Badges de Notificação:**
  * Indicador visual na barra de navegação quando `receivedRequests.length > 0`.

### 5.2 Mobile & Desktop
* **Tela de Perfil (`/profile`):**
  * Permite ao usuário editar seu `@username` público com validação instantânea.
  * Mostra o Friend Code com botão de "Copiar" e "Regenerar".
* **Tela Social (`/social`):**
  * Campo de busca unificado para adicionar por E-mail, Username ou Friend Code.
  * Listas separadas: "Amigos", "Solicitações Recebidas" e "Solicitações Enviadas".

---

## 6. Cobertura de Testes Obrigatória (Vitest)

1. **Testes Unitários de Validação (Zod):**
   - Validar formatos de entrada (rejeitar targets vazios, usernames com caracteres inválidos).
2. **Testes de Integração de Rotas:**
   - Fluxo completo: Enviar solicitação -> Verificar lista pendente -> Aceitar -> Verificar lista de amigos.
   - Bloqueio de duplicidade (não permitir múltiplos `pending`).
   - Rate limit de buscas (rejeitar após 5 chamadas em curto período).
3. **Testes de Componentes React:**
   - Renderização dos cartões com `tabIndex={0}` para acessibilidade na TV.
   - Disparo das ações de aceitar/recusar ao receber clique/foco com tecla Enter.
