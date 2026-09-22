# SPEC-001: Expansão Universal do Acervo (Games, Livros e Quadrinhos)

| Metadado | Detalhe |
| :--- | :--- |
| **Status** | Aprovado / Em Planejamento |
| **Versão** | 1.0.0 |
| **Data** | 2026-09-22 |
| **Autor** | Engenharia de Software & Arquitetura Akasha |
| **Alvos** | `backend`, `frontend`, `prisma/schema.prisma`, `mcp` |

---

## 1. Visão Geral e Motivação

O **Akasha** nasceu conceitualmente inspirado nos "Registros Akáshicos" — a biblioteca mística universal que compila todas as experiências e conhecimentos da existência. No MVP (Fases 1 a 3), a aplicação foi restrita a filmes e séries via TMDB para validação de produto.

Esta especificação define a transição do Akasha para uma **plataforma transmídia universal**, introduzindo três novos módulos:
1. **🎮 Jogos (Games):** Coleção pessoal e recomendações baseadas em jogabilidade, desenvolvedoras e gêneros.
2. **📚 Livros (Books):** Biblioteca pessoal, controle de leitura e recomendações por autores, assuntos e estilos literários.
3. **📖 Quadrinhos (Comics & Mangás):** Acervo de HQs ocidentais, Graphic Novels e Mangás com rastreamento de volumes e arcos.

---

## 2. Seleção de APIs e Contratos de Ingestão

Todas as integrações externas serão intermediadas pelo backend Fastify (`backend/src/services/`). O cliente frontend **nunca** expõe chaves de API nem sofre com bloqueios de CORS.

### 2.1 Módulo Games: IGDB (Twitch API) & Fallback RAWG
* **API Primária:** [IGDB.com](https://api-docs.igdb.com/) via Twitch OAuth.
* **Autenticação:** `Client-ID` + App Access Token (Bearer) obtido em `https://id.twitch.tv/oauth2/token`.
* **Endpoints Utilizados:**
  * `POST https://api.igdb.com/v4/games`: Busca textual, detalhes, capas (`covers`), gêneros (`genres`), plataformas (`platforms`) e estúdios (`involved_companies`).
  * `POST https://api.igdb.com/v4/games` com filtro de `id = (...)`: Resolução de recomendações nativas (`similar_games`).
* **Fallback:** RAWG API (`https://api.rawg.io/api/games?key=...`).

### 2.2 Módulo Livros: Google Books API & Open Library
* **API Primária:** [Google Books Volumes API](https://developers.google.com/books/docs/v1/using).
* **Autenticação:** `API_KEY` pública do Google Cloud (gratuito, sem cartão de crédito).
* **Endpoints Utilizados:**
  * `GET https://www.googleapis.com/books/v1/volumes?q={query}&langRestrict=pt`: Busca geral em língua portuguesa.
  * `GET https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}`: Busca cirúrgica por código de barras/ISBN.
  * `GET https://www.googleapis.com/books/v1/volumes?q=subject:{category}`: Semente para recomendações temáticas.
* **Fallback:** Open Library Books API (`https://openlibrary.org/api/books`).

### 2.3 Módulo Quadrinhos: Comic Vine & AniList
* **HQs Ocidentais (Marvel/DC/Dark Horse):** [Comic Vine API](https://comicvine.gamespot.com/api/documentation).
  * Endpoint: `GET https://comicvine.gamespot.com/api/volumes/?api_key={KEY}&filter=name:{query}&format=json`.
* **Mangás & Manhwas:** [AniList GraphQL API](https://anilist.gitbook.io/anilist-apiv2-docs/).
  * Endpoint: `POST https://graphql.anilist.co` com query de mídia `type: MANGA`.
* **Graphic Novels encadernadas:** Resolução secundária via Google Books (por ISBN).

---

## 3. Modelo de Dados Unificado (Prisma Schema)

Para suportar múltiplos domínios sem proliferação descontrolada de tabelas nem quebra da integridade referencial, o modelo `Wishlist` é expandido de forma polimórfica com cache local de metadados.

### 3.1 Definição no Prisma (`backend/prisma/schema.prisma`)

```prisma
enum DomainType {
  movie
  tv
  game
  book
  comic
}

enum ConsumptionStatus {
  backlog      // "Quero Ver / Quero Jogar / Quero Ler"
  in_progress  // "Assistindo / Jogando / Lendo"
  completed    // "Concluído / Lido / Zerado"
  dropped      // "Abandonado"
}

model Wishlist {
  id           Int               @id @default(autoincrement())
  userId       String            @map("user_id") @db.Uuid
  externalId   String            @map("external_id") // ID externo (TMDB id, IGDB id, Google Books id, ComicVine id)
  domain       DomainType        @default(movie)
  status       ConsumptionStatus @default(backlog)
  userRating   Int?              @map("user_rating") // 1 a 5 estrelas
  notes        String?

  // Metadados Cacheados (Garante renderização instantânea do acervo)
  title        String            @default("Sem título")
  coverUrl     String?           @map("cover_url")
  releaseYear  Int?              @map("release_year")
  extraMeta    Json?             @map("extra_meta") // Ex: { author, developer, publisher, platform, pages }

  createdAt    DateTime          @default(now()) @map("created_at")
  updatedAt    DateTime          @default(now()) @updatedAt @map("updated_at")
  profile      Profile           @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, domain, externalId])
  @@index([userId, domain, status])
  @@map("wishlist")
}
```

### 3.2 Estratégia de Migração (Zero Downtime & Zero Data Loss)
1. Criar migration que adiciona as novas colunas com valores padrão mapeados a partir dos dados legados (`tmdb_id` -> `external_id`, `media_type` -> `domain`).
2. Atualizar a base de dados mantendo compatibilidade transitória caso necessário.

---

## 4. Engenharia dos Motores de Recomendação

### 4.1 Função de Pesos Compartilhada (`calculateItemWeight`)
O algoritmo base do Akasha já validado para filmes mantém-se universal:
* **Nota 5 Estrelas:** Peso `+3.0`
* **Nota 4 Estrelas:** Peso `+2.0`
* **Nota 3 Estrelas:** Peso `+1.0`
* **Nota 2 Estrelas:** Peso `-1.0`
* **Nota 1 Estrela:** Peso `-2.0`
* **Status `dropped`:** Penalidade imediata `-3.0` (evita obras similares a algo que o usuário rejeitou).
* **Multiplicador de Status:** `completed` (1.5x), `in_progress` (1.2x), `backlog` (1.0x).

### 4.2 Motores Especialistas por Domínio

```
                                  [ Perfil do Usuário ]
                                            │
               ┌────────────────────────────┼────────────────────────────┐
               ▼                            ▼                            ▼
      [ Motor de Jogos ]           [ Motor de Livros ]         [ Motor de Quadrinhos ]
      • Semente: 3 Jogos 5★        • Semente: Autores e        • Semente: Roteiristas,
      • Query IGDB similar_games   • Assuntos (Google Books)   • Universos e Artistas
      • Filtro de Plataforma       • Filtrar lidos             • Filtrar arcos lidos
```

### 4.3 Motor Transmídia (Descoberta Cruzada de Franquias)
Uma inovação chave do Akasha: identificação de propriedade intelectual (IP) compartilhada.
* Exemplo: Se o usuário avaliou com 5★ o jogo *The Witcher 3: Wild Hunt* (`domain: game`), o motor transmídia pesquisa correlações literárias (*O Último Desejo* no Google Books) e cinematográficas (*The Witcher* no TMDB).

---

## 5. UI/UX e Design System Adaptativo

Seguindo rigorosamente o design system **Liquid Glass** (tons terrosos `#283618`, `#606c38`, `#fefae0`, `#dda15e`, `#bc6c25` com fontes `Cinzel` e `Outfit`):

1. **Navegador de Domínios:** O topo da aplicação e o menu lateral recebem um seletor rápido com ícones e rótulos:
   * 🎬 **Cinema** (Filmes & Séries)
   * 🎮 **Jogos** (Games)
   * 📚 **Livros** (Leituras)
   * 📖 **Quadrinhos** (HQs & Mangás)
2. **Proporção Visual dos Cards:**
   * Cinema: `aspect-[2/3]`
   * Jogos: `aspect-[3/4]` com badge de plataforma
   * Livros & Quadrinhos: `aspect-[1/1.5]` com textura de relevo Liquid Glass
3. **Acessibilidade Android TV (D-Pad):**
   * Todos os seletores e cards com `tabIndex={0}`.
   * Ao focar via controle remoto: elevação `scale(1.08)`, borda `border-[var(--color-caramelo-claro)]` e brilho de foco `box-shadow`.
4. **Mobile Touch Target:**
   * Áreas de clique mínimas de 48x48px, gestos de swipe para trocar de abas (Quero Ver / Consumindo / Concluído).

---

## 6. Ferramentas MCP (Model Context Protocol) Expandidas

As ferramentas do servidor MCP Fastify passarão a aceitar o parâmetro `domain`:

1. `search_media(query, domain)`: Busca mídias no domínio especificado.
2. `get_recommendations(domain, limit)`: Retorna recomendações para uma mídia específica ou mistas.
3. `add_to_library(externalId, domain, status, rating?)`: Adiciona obra ao acervo pessoal.
4. `rate_media(externalId, domain, rating)`: Avalia obra de 1 a 5 estrelas.

---

## 7. Critérios de Aceite e Validação

* [ ] Todos os schemas Zod de entrada e saída validados sem ocorrência de `any`.
* [ ] Cobertura de testes unitários com Vitest para os parsers de cada API externa.
* [ ] Testes de navegação via teclado simulando o D-Pad de controle remoto em todas as novas abas.
* [ ] Preservação integral do histórico existente de filmes e séries.
