# SPEC-005: Campo de Opinião/Resenha na Avaliação e Propagação para o Feed Social

| Metadado | Detalhe |
| :--- | :--- |
| **Status** | Implementado |
| **Versão** | 1.0.0 |
| **Data** | 2026-09-25 |
| **Autor** | Engenharia de Software & Arquitetura Akasha |
| **Alvos** | `backend`, `frontend`, `prisma/schema.prisma`, `docs` |
| **Branch** | `main` |

---

## 1. Visão Geral e Motivação

Item **3.5.1 / 3.4.10** do [`roadmap.md`]:
Permitir que os usuários, no ato de avaliar filmes ou séries (1 a 5 estrelas), possam opcionalmente redigir uma breve opinião/resenha (até 300 caracteres no frontend e backend). Essa opinião é persistida na biblioteca pessoal (`wishlist.notes`) e propagada automaticamente para o Feed de Atividades Sociais (`activities.review`), permitindo que a rede de amigos bilaterais visualize a nota e a opinião contextualizada diretamente em sua linha do tempo.

### Princípios Norteadores:
1. **Pragmatismo & KISS (Opcionalidade Sem Fricção):** A opinião é 100% opcional. Usuários que desejam apenas atribuir a nota de estrelas continuam fazendo isso com agilidade.
2. **Consistência Social:** Ao registrar ou atualizar a nota e opinião na biblioteca, a atividade correspondente no Feed (`RATED_MEDIA`) reflete a opinião deixada.
3. **Compatibilidade Universal (Android TV, Mobile e Desktop):**
   - **Android TV:** Foco total via D-Pad (`tabIndex={0}`, `:focus` e `.tv-focus-glow`). Seleção de estrelas via teclas de direção e clique/Enter, navegação vertical fluida para o campo de texto e botões de ação.
   - **Mobile Touch:** Alvos de toque generosos (`min-h-[44px]`), sem dependência de hover.
   - **Desktop:** Feedback interativo imediato, contador de caracteres em tempo real e atalho ESC para fechar.

---

## 2. Modelo de Dados Unificado (Prisma Schema)

### 2.1 Modelo `Wishlist` (Existente)
* O campo `notes` (`String?`) existe na tabela `wishlist` e armazena a anotação/resenha pessoal da obra (máximo 300 caracteres).

### 2.2 Modelo `Activity` em `backend/prisma/schema.prisma`
Adicionado o campo `review`:

```prisma
model Activity {
  id         Int          @id @default(autoincrement())
  userId     String       @map("user_id") @db.Uuid
  type       ActivityType
  tmdbId     Int          @map("tmdb_id")
  mediaType  MediaType    @map("media_type")
  title      String?
  posterPath String?      @map("poster_path")
  userRating Int?         @map("user_rating")
  status     WatchStatus?
  review     String?      // Opinião / Resenha opcional do usuário (máx 300 chars)
  createdAt  DateTime     @default(now()) @map("created_at")

  profile Profile @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt(sort: Desc)])
  @@map("activities")
}
```

---

## 3. Contratos de API e Validação Zod

### 3.1 Schemas Zod (`wishlist.schema.ts`)
* `notes` aceita texto de até 300 caracteres, sendo opcional e anulável (`nullable().optional()`):
  ```typescript
  export const createWishlistItemSchema = z.object({
    tmdbId: z.number().int().positive(),
    mediaType: z.enum(['movie', 'tv']),
    status: z.enum(['plan_to_watch', 'watching', 'completed', 'dropped']).default('plan_to_watch'),
    userRating: z.number().int().min(1).max(5).optional(),
    notes: z.string().max(300).nullable().optional(),
    title: z.string().optional(),
    posterPath: z.string().optional(),
  });

  export const updateWishlistItemSchema = z.object({
    status: z.enum(['plan_to_watch', 'watching', 'completed', 'dropped']).optional(),
    userRating: z.number().int().min(1).max(5).optional(),
    notes: z.string().max(300).nullable().optional(),
    title: z.string().optional(),
    posterPath: z.string().optional(),
  });
  ```

### 3.2 Ingestão de Atividades (`wishlist.routes.ts`)
* Ao criar (`POST /wishlist`) ou atualizar (`PATCH /wishlist/:id`), `recordActivity` recebe `review: item.notes`.
* Se o usuário atualiza a resenha de um item previamente avaliado, a rota classifica o evento no feed como `RATED_MEDIA` para que a nova opinião seja exibida aos amigos.

---

## 4. Frontend & Design System (Liquid Glass)

### 4.1 Componente `RatingModal` (`frontend/src/components/ui/RatingModal.tsx`)
- Seleção de 1 a 5 estrelas mantendo o estado ativo visual com gradiente caramelo.
- Seção opcional *"Quer deixar uma opinião? (opcional)"* com `textarea`, `maxLength={300}` e contador de caracteres dinâmico (`X/300`).
- Botão "Salvar Avaliação" só habilitado após ao menos 1 estrela selecionada.
- Suporte a `initialRating` e `initialReview` para edição de avaliações já salvas.
- Suporte estrito a Android TV (`tabIndex={0}`, foco personalizado, teclas Enter e Escape).

### 4.2 Componente `ActivityCard` (`frontend/src/components/ActivityCard.tsx`)
- Renderização elegante da opinião do amigo no feed social:
  - Bloco em estilo *Liquid Glass* (`bg-stone-950/60`, borda sutil `border-stone-800/80`).
  - Aspas tipográficas destacadas em `var(--color-caramelo-claro)` e texto em itálico `font-outfit`.
  - Mantém acessibilidade universal com `tabIndex={0}`.

### 4.3 Componente `LibraryItemCard` (`frontend/src/components/ui/LibraryItemCard.tsx`)
- Exibição de trecho da opinião pessoal do usuário na listagem da biblioteca com borda lateral decorativa.

---

## 5. Cobertura de Testes Automatizados (Vitest)

1. **Backend (`vitest run`):**
   - `wishlist.schema.test.ts`: Validação de `notes` (válido, nulo, rejeição acima de 500 caracteres).
   - `activity.service.test.ts`: Persistência do campo `review` na criação da atividade.
   - `wishlist.routes.test.ts`: Atualização via PATCH contendo `userRating` e `notes`.
2. **Frontend (`npx vitest run`):**
   - `RatingModal.test.tsx`: Renderização, acessibilidade TV com `tabIndex={0}`, seleção de nota sem opinião, digitação de opinião com contador e submissão conjunta, preenchimento de valores iniciais.
   - `ActivityCard.test.tsx`: Renderização correta da resenha/opinião no card da atividade social.
