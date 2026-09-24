# SPEC-003: Feed de Atividades Sociais (Atividades da Rede de Amigos)

| Metadado | Detalhe |
| :--- | :--- |
| **Status** | Aprovado / Em Desenvolvimento |
| **Versão** | 1.0.0 |
| **Data** | 2026-09-24 |
| **Autor** | Engenharia de Software & Arquitetura Akasha |
| **Alvos** | `backend`, `frontend`, `prisma/schema.prisma`, `docs` |
| **Branch** | `dev` |

---

## 1. Visão Geral e Motivação

O **Feed de Atividades** (Requisito 5.4 no [`roadmap.md`]) provê uma linha do tempo social privada e focada. Em vez de posts abertos ou redes ruidosas, o feed exibe exclusivamente o histórico de consumo e avaliações de mídias dos **amigos bilaterais confirmados** (`FriendshipStatus.accepted`).

### Princípios Norteadores:
1. **Privacidade por Padrão:** Apenas usuários que são amigos bilaterais podem visualizar as atividades um do outro no feed. Usuários bloqueados são filtrados estritamente.
2. **Automação Sem Frito:** Atividades são geradas de forma transparente no backend sempre que o usuário adiciona um item à biblioteca, altera o status de consumo ou atribui uma nota de 1 a 5 estrelas.
3. **Eficiência Cognitiva (KISS):** O feed é focado em ações reais de consumo (`plan_to_watch`, `watching`, `completed`, `dropped`) e notas (`userRating`), sem exigir o gerenciamento de comentários/resenhas complexos.

---

## 2. Modelo de Dados Unificado (Prisma Schema)

### 2.1 Novo Modelo `Activity` em `backend/prisma/schema.prisma`

```prisma
enum ActivityType {
  ADDED_TO_LIST
  STATUS_CHANGED
  RATED_MEDIA
}

model Activity {
  id          Int          @id @default(autoincrement())
  userId      String       @map("user_id") @db.Uuid
  type        ActivityType
  tmdbId      Int          @map("tmdb_id")
  mediaType   MediaType    @map("media_type")
  title       String?      // Cache do título da obra para evitar requests redundantes ao TMDB
  posterPath  String?      @map("poster_path") // Cache da imagem do poster
  userRating  Int?         @map("user_rating") // 1-5 estrelas
  status      WatchStatus?
  createdAt   DateTime     @default(now()) @map("created_at")

  profile     Profile      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt(sort: Desc)])
  @@map("activities")
}
```

---

## 3. Contratos de API (Fastify + Zod)

Todas as rotas exigem autenticação via Supabase JWT (`authMiddleware`).

### 3.1 Obter Feed da Rede
* **Rota:** `GET /feed`
* **Query Params (Zod):**
  ```typescript
  export const getFeedQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  });
  ```
* **Regra de Privacidade (SQL/Prisma):**
  A consulta busca atividades onde `userId` seja:
  - O próprio usuário logado; OU
  - Usuários que possuem `Friendship` com status `accepted` onde o usuário logado é o `requester` ou `addressee`.
  - Exclui qualquer atividade de usuários onde exista relação de `blocked`.
* **Exemplo de Retorno (JSON):**
  ```json
  {
    "activities": [
      {
        "id": 105,
        "type": "RATED_MEDIA",
        "tmdbId": 550,
        "mediaType": "movie",
        "title": "Clube da Luta",
        "posterPath": "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
        "userRating": 5,
        "status": "completed",
        "createdAt": "2026-09-24T12:00:00.000Z",
        "user": {
          "id": "uuid-do-amigo",
          "username": "cinefilo_mor",
          "avatarUrl": "https://..."
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1
    }
  }
  ```

---

## 4. Ingestão Automática de Eventos Backend

No backend (`wishlist.routes.ts`), sempre que um item de wishlist é criado ou atualizado via `upsert` ou `patch`:
1. Se for uma nova inserção $\rightarrow$ registra `ADDED_TO_LIST` (e `RATED_MEDIA` se houver nota).
2. Se o `status` for modificado $\rightarrow$ registra `STATUS_CHANGED`.
3. Se a `userRating` for modificada $\rightarrow$ registra `RATED_MEDIA`.

---

## 5. Arquitetura Frontend & Experiência Universal

### 5.1 Android TV (Navegação via D-Pad)
- Todo card no feed possui `tabIndex={0}`.
- O estado `:focus-visible` exibe contorno iluminado em `var(--color-caramelo-claro)` com leve escala (`scale-105`), idêntico aos cards da biblioteca.
- Navegação vertical fluida entre as atividades.

### 5.2 Mobile & Desktop
- Layout em grade/lista adaptável (*Liquid Glass*).
- Formatação de data relativa humanizada (ex: "há 10 min", "ontem").
- Badges visuais coloridos indicando a ação (Estrelas para Nota, Ícone de Play para Assistindo, Check para Concluído).

---

## 6. Cobertura de Testes Obrigatória (Vitest)

1. **Testes Backend:**
   - Validação da privacidade do `GET /feed` (garantir que não retorna dados de não-amigos ou bloqueados).
   - Teste do service de criação de `Activity` ao atualizar `Wishlist`.
2. **Testes Frontend:**
   - Renderização dos cards de atividade no `ActivityFeedList.test.tsx`.
   - Garantia de que `tabIndex={0}` está presente nos cards.
