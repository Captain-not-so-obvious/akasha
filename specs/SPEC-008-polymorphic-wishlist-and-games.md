# SPEC-008: Fundação Polimórfica Universal & Módulo de Recomendação de Games

| Metadado | Detalhe |
| :--- | :--- |
| **Status** | Concluído / Implementado |
| **Versão** | 1.0.0 |
| **Data** | 2026-09-29 |
| **Autor** | Engenharia de Software & Arquitetura Akasha |
| **Alvos** | `backend`, `frontend`, `prisma/schema.prisma`, `routes/games.routes.ts`, `services/game-recommendation.service.ts` |

---

## 1. Visão Geral e Contexto

Com a consolidação da camada social e de cinema (Fases 1 a 5), o Akasha entra na **Fase 6 (Fundação Polimórfica Universal)** e inicia o ecossistema de **Jogos (Games)**. O objetivo desta especificação é garantir que a aplicação transicione para um modelo transmídia polimórfico universal sem perda de dados legados, integrando o catálogo de games (IGDB/Twitch API), o motor de recomendação ponderado de jogos, avaliações (notas 1 a 5 estrelas e críticas) e interface responsiva para Android TV, Mobile e Desktop.

---

## 2. Modelo de Dados Polimórfico (Prisma)

### 2.1 Enums e Tabela `wishlist`
O modelo `Wishlist` foi expandido para suportar identificadores externos genéricos (`externalId: String`), o domínio (`domain: DomainType`) e metadados cacheados locais (`title`, `coverUrl`, `releaseYear`, `extraMeta`), mantendo compatibilidade com `tmdbId` e `mediaType`:

```prisma
enum DomainType {
  movie
  tv
  game
}

model Wishlist {
  id          Int         @id @default(autoincrement())
  userId      String      @map("user_id") @db.Uuid
  domain      DomainType  @default(movie)
  externalId  String      @default("") @map("external_id")
  tmdbId      Int?        @map("tmdb_id")
  mediaType   MediaType?  @map("media_type")
  status      WatchStatus @default(plan_to_watch)
  userRating  Int?        @map("user_rating")
  notes       String?
  title       String      @default("Sem título")
  coverUrl    String?     @map("cover_url")
  releaseYear Int?        @map("release_year")
  extraMeta   Json?       @map("extra_meta")
  createdAt   DateTime    @default(now()) @map("created_at")
  updatedAt   DateTime    @default(now()) @updatedAt @map("updated_at")
  profile     Profile     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, domain, externalId])
  @@index([userId, domain, status])
  @@map("wishlist")
}
```

### 2.2 Preservação do Feed Social (`activities`)
A tabela `activities` também foi enriquecida com `domain` e `externalId`, tornando `tmdbId` e `mediaType` opcionais para que notas e resenhas de jogos sejam publicadas organicamente no Feed de Atividades da rede de amigos.

---

## 3. Catálogo de Jogos & Ingestão (IGDB com Isolamento Estrito de Mocks)

* **Serviço IGDB (`backend/src/services/igdb.service.ts`):**
  - Autenticação OAuth Client Credentials com a Twitch (`TWITCH_CLIENT_ID` e `TWITCH_CLIENT_SECRET`).
  - **Proibição Estrita de Mocks em Produção (`NODE_ENV === 'production'`):**
    - Se a API da IGDB/Twitch falhar ou se as credenciais estiverem ausentes, o serviço retorna listas vazias (`[]`) ou `null`, com registro em `console.error`.
    - Sob nenhuma hipótese dados mockados de catálogo (`MOCK_GAMES`) são vazados para usuários em produção.
  - **Fallback em Memória Condicional:**
    - Permitido exclusivamente para testes automatizados offline (`NODE_ENV === 'test'`) e ambiente de desenvolvimento local desprovido de chaves da Twitch.
  - Endpoints implementados em `backend/src/routes/games.routes.ts`:
    - `GET /games/search?q=&limit=`
    - `GET /games/popular?limit=`
    - `GET /games/recommendations?limit=` (protegido por JWT)
    - `GET /games/:id`

---

## 4. Motor de Recomendação de Jogos

* **Serviço (`backend/src/services/game-recommendation.service.ts`):**
  - Aplica o algoritmo de ponderação Akasha:
    - 5★: +3.0
    - 4★: +2.0
    - 3★: +1.0
    - 2★: -1.0
    - 1★: -2.0
    - Status `dropped`: -3.0
    - Multiplicadores de status: `completed` (1.5x), `watching` / Jogando (1.2x), `plan_to_watch` / Quero Jogar (1.0x).
  - Identifica até 3 sementes positivas mais fortes do usuário e busca `similar_games` da IGDB.
  - Cold Start: Se o usuário não possui histórico avaliado positivamente, recomenda os jogos de maior rating geral.
  - Desduplicação: Elimina jogos já catalogados no acervo do usuário.

---

## 5. Frontend & Design System (Liquid Glass)

* **Seletor de Domínio na Biblioteca (`Library.tsx`):**
  - Alternância rápida entre 🎬 **Cinema & Séries** e 🎮 **Jogos (Games)**.
  - Adaptação semântica das abas da Biblioteca:
    - Cinema: **Assistindo** / **Quero Ver** / **Concluídos**
    - Games: **Jogando** / **Quero Jogar** / **Concluídos (Zerados)**
* **Componente `GameRecommendationRail`:**
  - Carrossel com capa `aspect-[3/4]`, badges de plataformas, nota percentual e justificativa explicativa ("Porque você jogou Elden Ring").
  - Ação rápida "+ Quero Jogar" para adição imediata à biblioteca.
  - Acessibilidade Android TV: `tabIndex={0}`, foco animado `tv-focus-glow`, rolagem automática para centralização do card no D-Pad.
  - Mobile Touch: targets mínimos de 44px e scroll horizontal por toque nativo.

* **Busca Universal (`Search.tsx` e `SearchBar.tsx`):**
  - Alternância de pesquisa por tipo de mídia: 🎬 **Filmes**, 📺 **Séries** e 🎮 **Jogos**.
  - Placeholder dinâmico e contextual (`Buscar jogos (ex: Elden Ring, Zelda)...`).
  - Cold Start inteligente: Exibição prévia de títulos populares (`/games/popular`) para inspirar o backlog antes mesmo da digitação.
  - Hook `useGameSearch` com debounce automático de 400ms e cancelamento de requisições pendentes.
* **Componente `GameCard`:**
  - Capa com aspecto `aspect-[3/4]` e fallback SVG temático.
  - Badges de nota IGDB/Metacritic, plataformas suportadas (PC, PS5, Switch) e selo verde "Na Biblioteca".
  - Acessibilidade Android TV: `tabIndex={0}`, classe `tv-focus-glow` e ativação por teclado (Enter / Espaço).
* **Modal de Detalhes `GameDetailsModal`:**
  - Backdrop em alta definição com gradiente líquido e capa destacada.
  - Exibição de sinopse completa, desenvolvedor, gêneros e plataformas.
  - Ações diretas de catálogo: "Quero Jogar", "Jogando Agora", "Já Zerei" ou transições de status e remoção para itens já salvos.

---

## 6. Cobertura de Testes Automatizados

* **Backend (`Vitest`):**
  - Schemas polimórficos (`tests/schemas/wishlist.schema.test.ts`)
  - Rotas polimórficas de wishlist (`tests/routes/wishlist.routes.test.ts`)
  - Motor de recomendação de jogos (`tests/services/game-recommendation.service.test.ts`)
  - Rotas de jogos (`tests/routes/games.routes.test.ts`)
* **Frontend (`Testing Library` + `Vitest`):**
  - Componente de recomendação (`tests/components/recommendations/GameRecommendationRail.test.tsx`)
  - Alternância de abas e domínios da Biblioteca (`tests/pages/Library.test.tsx`)
  - Barra de busca com toggle de jogos (`tests/components/search/SearchBar.test.tsx`)
  - Card de jogo com acessibilidade TV (`tests/components/search/GameCard.test.tsx`)
  - Modal de detalhes e adição à biblioteca (`tests/components/ui/GameDetailsModal.test.tsx`)
  - Hook de busca IGDB com debounce (`tests/hooks/useGameSearch.test.ts`)
  - Integração da busca universal (`tests/pages/Search.test.tsx`)
