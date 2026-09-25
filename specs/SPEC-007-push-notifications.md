# SPEC-007: Central de Notificações Multiplataforma & Push (Lançamentos de Séries e Atividades Sociais)

| Metadado | Detalhe |
| :--- | :--- |
| **Status** | Implementado |
| **Versão** | 1.0.0 |
| **Data** | 2026-09-25 |
| **Autor** | Engenharia de Software & Arquitetura Akasha |
| **Alvos** | `backend`, `frontend`, `prisma/schema.prisma`, `roadmap.md`, `conceito.md`, `arquitetura.md` |
| **Branch** | `main` |

---

## 1. Visão Geral e Motivação

O **Item 5.6** do [`roadmap.md`] encerra a **Fase 5 (Social & Recomendações)** do Akasha.  
Com a camada social bilateral consolidada ([`SPEC-002`](SPEC-002-social-friendship-network.md)), o feed de atividades em tempo real ([`SPEC-003`](SPEC-003-activity-feed.md)), as opiniões em avaliações ([`SPEC-005`](SPEC-005-media-opinion-review-feed.md)) e a Sincronia Cósmica ([`SPEC-006`](SPEC-006-social-library-comparison.md)), o Akasha agora estabelece um canal ativo de comunicação com o viajante.

O sistema de notificações do Akasha resolve duas necessidades críticas sem recorrer a ruídos invasivos:
1. **Lançamento de Novos Episódios:** Avisa quando um episódio novo for ao ar no TMDB para séries que o usuário tem ativas em sua biblioteca com status `watching`.
2. **Engajamento Social de Alta Relevância:** Notifica quando um amigo confirmado avalia uma obra (com sua nota de 1 a 5 estrelas e eventual opinião), ou quando há novas interações de amizade (solicitação recebida ou aceita).

---

## 2. Princípios Norteadores & Arquitetura Híbrida

Para atender a diretriz de **compatibilidade universal** (Android TV, Mobile e Desktop) mantendo **KISS & YAGNI**:

1. **Canal Primário Universal: In-App Notification Center:**
   - Persistência das notificações no PostgreSQL via Prisma.
   - Ícone de sino com contador luminoso de não-lidas na `Navbar`.
   - Painel flutuante / gaveta com design *Liquid Glass*, acessível por toque no celular, mouse no desktop e **100% controlável via D-Pad na Android TV**.
   - Funciona de forma resiliente e imediata mesmo se o dispositivo não tiver suporte a push background.

2. **Canal Secundário em Background: Web Push API (PWA / Mobile / Desktop):**
   - Utiliza a API aberta de Web Push do W3C (`PushManager`, Service Worker `sw.js` e chaves VAPID).
   - O usuário escolhe ativar/desativar notificações do sistema através de uma preferência no `/profile`.
   - Não cria dependências de serviços externos pagos ou proprietários (ex: OneSignal ou planos restritos).

3. **Privacidade e Segurança Estrita:**
   - Notificações sociais só são despachadas entre **amigos bilaterais confirmados** (`FriendshipStatus.accepted`).
   - Relações bloqueadas (`blocked`) são filtradas na raiz, impossibilitando qualquer vazamento ou envio indevido.
   - Todas as rotas de notificações exigem autenticação via Supabase JWT (`authMiddleware`).

---

## 3. Modelo de Dados Unificado (Prisma Schema)

### 3.1 Novos Tipos e Modelos em `backend/prisma/schema.prisma`

```prisma
enum NotificationType {
  FRIEND_REQUEST
  FRIEND_ACCEPTED
  FRIEND_RATED
  NEW_EPISODE
  SYSTEM
}

model Notification {
  id        Int              @id @default(autoincrement())
  userId    String           @map("user_id") @db.Uuid
  type      NotificationType
  title     String           // Ex: "cinefilo_mor avaliou Duna: Parte 2"
  message   String           // Ex: "Nota: 5 estrelas — 'Obra-prima impecável!'"
  data      Json?            // { tmdbId, mediaType, friendId, posterPath, actionUrl, seasonNumber, episodeNumber }
  read      Boolean          @default(false)
  createdAt DateTime         @default(now()) @map("created_at")

  profile   Profile          @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, read, createdAt(sort: Desc)])
  @@map("notifications")
}

model PushSubscription {
  id        Int      @id @default(autoincrement())
  userId    String   @map("user_id") @db.Uuid
  endpoint  String   @unique
  p256dh    String
  auth      String
  createdAt DateTime @default(now()) @map("created_at")

  profile   Profile  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("push_subscriptions")
}
```

Atualização no model `Profile`:
```prisma
model Profile {
  // ... campos existentes
  notifications     Notification[]
  pushSubscriptions PushSubscription[]
}
```

---

## 4. Contratos de API (Fastify + Zod)

Todas as rotas são protegidas pelo middleware `verifySupabaseAuth` e operam sobre o `request.userId`.

### 4.1 Listar Notificações
* **Rota:** `GET /notifications`
* **Query Params (Zod):**
  ```typescript
  export const getNotificationsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    unreadOnly: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
  });
  ```
* **Resposta (200 OK):**
  ```json
  {
    "notifications": [
      {
        "id": 142,
        "type": "FRIEND_RATED",
        "title": "cinefilo_mor avaliou Clube da Luta",
        "message": "Atribuiu 5 estrelas: 'Filme excelente!'",
        "data": {
          "tmdbId": 550,
          "mediaType": "movie",
          "posterPath": "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
          "userRating": 5,
          "actionUrl": "/library?tmdbId=550"
        },
        "read": false,
        "createdAt": "2026-09-25T14:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "unreadCount": 1
    }
  }
  ```

### 4.2 Contador de Não-Lidas (Polling Leve / Badge Navbar)
* **Rota:** `GET /notifications/unread-count`
* **Resposta (200 OK):**
  ```json
  {
    "count": 3
  }
  ```

### 4.3 Marcar Notificação como Lida
* **Rota:** `PATCH /notifications/:id/read`
* **Resposta (200 OK):**
  ```json
  {
    "id": 142,
    "read": true
  }
  ```

### 4.4 Marcar Todas como Lidas
* **Rota:** `PATCH /notifications/read-all`
* **Resposta (200 OK):**
  ```json
  {
    "count": 5
  }
  ```

### 4.5 Registrar Inscrição Web Push
* **Rota:** `POST /notifications/push-subscription`
* **Body Schema (Zod):**
  ```typescript
  export const savePushSubscriptionSchema = z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  });
  ```
* **Resposta (201 Created):** `{ "success": true }`

### 4.6 Remover Inscrição Web Push
* **Rota:** `DELETE /notifications/push-subscription`
* **Body Schema (Zod):**
  ```typescript
  export const deletePushSubscriptionSchema = z.object({
    endpoint: z.string().url(),
  });
  ```
* **Resposta (200 OK):** `{ "success": true }`

### 4.7 Checagem de Novos Episódios para Séries em Acompanhamento
* **Rota:** `POST /notifications/check-episodes`
* **Descrição:** Executado sob demanda ou agendamento para o usuário autenticado. Varre séries com status `watching`, consulta dados de episódios no TMDB e gera notificações de episódios exibidos recentemente (janela dos últimos 7 dias) que ainda não foram notificados.
* **Resposta (200 OK):** `{ "newEpisodesFound": 1 }`

---

## 5. Lógica de Disparo e Serviços (Backend)

O novo serviço `backend/src/services/notification.service.ts` centraliza:

1. **`createNotification(input)`:**
   - Cria o registro no banco de dados.
   - Envia push assíncrono para as `push_subscriptions` registradas do usuário (se configuradas as chaves VAPID). Falhas em push individual (ex: endpoints expirados 410 Gone) removem a inscrição obsoleta automaticamente.

2. **`notifyFriendsOnRating(authorUserId, tmdbId, mediaType, rating, review, title, posterPath)`:**
   - Busca todos os amigos bilaterais aceitos (`FriendshipStatus.accepted`).
   - Exclui amizades onde exista bloqueio mútuo (`blocked`).
   - Cria uma notificação `FRIEND_RATED` para cada amigo elegível.

3. **`notifyFriendRequest(requesterId, addresseeId)` & `notifyFriendAccepted(requesterId, addresseeId)`:**
   - Cria notificação `FRIEND_REQUEST` para o destinatário ao receber solicitação.
   - Cria notificação `FRIEND_ACCEPTED` para o solicitante quando a amizade é aceita.

4. **`checkNewEpisodesForWatching(userId)`:**
   - Busca todas as obras na `wishlist` do usuário onde `mediaType === 'tv'` e `status === 'watching'`.
   - Consulta o TMDB para cada série buscando `last_episode_to_air`.
   - Se o episódio foi ao ar recentemente (<= 7 dias) e ainda não existe notificação `NEW_EPISODE` para aquele `tmdbId` + `seasonNumber` + `episodeNumber`, cria a notificação.

---

## 6. Experiência do Usuário & Compatibilidade Universal

### 6.1 Android TV (Navegação D-Pad Impecável)
* **Botão do Sino na Navbar:**
  - Elemento interativo com `tabIndex={0}`, classe `tv-focus-glow`, contorno e escala suaves ao focar.
  - Ao pressionar `Enter` / tecla central do D-Pad, abre a janela `NotificationCenterModal`.
* **Painel de Notificações na TV:**
  - Cada card de notificação possui `tabIndex={0}`.
  - Pressionar `Enter` sobre a notificação navega diretamente para o conteúdo (abre os detalhes da mídia via `MediaDetailsModal` ou redireciona para a aba de amigos).
  - Tecla `Escape` ou botão "Voltar" do controle fecha o painel e devolve o foco ao sino da Navbar.

### 6.2 Mobile Touch (Dispositivos Portáteis)
* Botão do sino integrado no cabeçalho mobile superior com alvo de toque mínimo de `44px x 44px`.
* Painel de notificações abre como *Drawer* ou *Bottom Sheet* / Modal com fundo escurecido e *Liquid Glass*.
* Botão "Marcar todas como lidas" acessível no topo do painel.

### 6.3 Desktop (Mouse & Atalhos)
* Dropdown estilizado suspenso com rolagem suave.
* Feedback visual de status lido/não-lido (indicador luminoso âmbar/dourado para itens novos).

---

## 7. Estratégia de Testes Automatizados

### 7.1 Testes de Backend (Vitest)
* `backend/tests/services/notification.service.test.ts`:
  - Criação de notificação unitária e cálculo de não-lidas.
  - Disparo de `notifyFriendsOnRating` para amigos aceitos.
  - Garantia de que amigos bloqueados NÃO recebem notificações.
  - Detecção de novo episódio com mock do TMDB.
* `backend/tests/routes/notification.routes.test.ts`:
  - Validação de rotas protegidas (rejeição 401 sem token Supabase).
  - Validação Zod para query params e payloads de push subscription.
  - Endpoints de leitura (`read` e `read-all`).

### 7.2 Testes de Frontend (Testing Library + Vitest)
* `frontend/tests/components/notifications/NotificationCenter.test.tsx`:
  - Renderização do sino com contagem de não-lidas.
  - Abertura do painel e exibição correta dos cards.
  - Interação com D-Pad / teclado (Enter, Escape).
  - Execução da ação "Marcar todas como lidas".
* `frontend/tests/hooks/useNotifications.test.ts`:
  - Atualização do estado global de notificações e integração com o backend.

---

## 8. Critérios de Aceite para Fechamento da Fase 5

- [x] Migration Prisma executada com sucesso adicionando `Notification` e `PushSubscription`.
- [x] Endpoints `/notifications` respondendo com segurança e validação Zod.
- [x] Avaliação de obras na biblioteca gerando notificações automáticas para a rede de amigos.
- [x] Verificação de novos episódios de séries em andamento funcionando de forma consistente.
- [x] Sino de notificações visível e operante em todas as plataformas (TV, Mobile e Desktop).
- [x] 100% dos testes unitários e de integração aprovados.
- [x] Documentos mestres sincronizados (`roadmap.md`, `conceito.md`, `arquitetura.md`), marcando a **Fase 5 como Concluída**.
