# SPEC-011: Módulo de Livros, Google Books API e Estante de Leituras

| Metadado | Detalhe |
| :--- | :--- |
| **Status** | Concluído / Implementado |
| **Versão** | 1.0.0 |
| **Data** | 2026-09-30 |
| **Autor** | Engenharia de Software & Arquitetura Akasha |
| **Alvos** | `backend/src/services/books.service.ts`, `backend/src/services/book-recommendation.service.ts`, `backend/src/routes/books.routes.ts`, `frontend/src/components/search/BookCard.tsx`, `frontend/src/components/ui/BookDetailsModal.tsx`, `frontend/src/components/recommendations/BookRecommendationRail.tsx`, `frontend/src/pages/Search.tsx`, `frontend/src/pages/Library.tsx` |

---

## 1. Visão Geral e Motivação

O **Akasha** nasceu conceitualmente inspirado nos "Registros Akáshicos" — o repositório universal de todo o conhecimento e experiências da existência humana. Após consolidar Cinema/TV (Fases 1 a 5) e Games (Fases 6 e 7), a **Fase 8** introduz a literatura e o universo dos livros.

Esta especificação formaliza a ingestão de obras literárias através da **Google Books API**, normalização de capas e metadados editoriais, criação da estante de leitura ("Quero Ler", "Lendo", "Lidos" e "Abandonei"), motor de recomendação por afinidade de autores e gêneros literários, além da interface universal acessível via Android TV (D-Pad), Mobile (Touch) e Desktop.

---

## 2. Ingestão e Integração Externa (Google Books API)

Todas as requisições à Google Books API são intermediadas pelo backend Fastify (`backend/src/services/books.service.ts`). O frontend nunca chama a API externa diretamente.

### 2.1 Endpoints Consumidos
* `GET https://www.googleapis.com/books/v1/volumes?q={query}&langRestrict=pt&maxResults={limit}`: Busca geral textual priorizando edições em língua portuguesa.
* `GET https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}`: Busca direta por código ISBN-10 ou ISBN-13.
* `GET https://www.googleapis.com/books/v1/volumes/{volumeId}`: Consulta detalhada de metadados de uma obra.
* `GET https://www.googleapis.com/books/v1/volumes?q=inauthor:{author}&langRestrict=pt`: Resolução de obras do mesmo autor para o motor de recomendação.
* `GET https://www.googleapis.com/books/v1/volumes?q=subject:{category}&langRestrict=pt`: Resolução de obras por categoria/gênero afim.

### 2.2 Arquitetura de Provedor Duplo e Resiliência (Google Books + Open Library Fallback)
1. **Credenciais Opcionais do Google Cloud (`GOOGLE_BOOKS_API_KEY`):** Requisições não autenticadas ao Google Books podem sofrer bloqueio de cota (`HTTP 429 RESOURCE_EXHAUSTED: defaultPerDayPerProject limit reached`). Ao fornecer `GOOGLE_BOOKS_API_KEY` no `backend/.env`, o Akasha desfruta de cota oficial elevada.
2. **Fallback Transparente com Open Library API:** Caso `GOOGLE_BOOKS_API_KEY` não esteja presente ou o Google Books retorne 429 ou erro de rede, o serviço de livros aciona automaticamente a **Open Library API** (`https://openlibrary.org`), garantindo que o usuário nunca fique sem resultados ou com a busca travada.
3. **Higienização de Capas (HTTPS & Sem Mixed Content):** URLs do Google Books em `http://` são convertidas para `https://` e flags `&edge=curl` são removidas. Para obras da Open Library, capas em alta resolução são consumidas via `https://covers.openlibrary.org/b/id/{cover_i}-L.jpg`.
4. **Fallback Sem Restrição de Idioma:** Se uma busca com `langRestrict=pt` retornar zero itens, uma segunda tentativa é executada sem o filtro de idioma, garantindo que buscas por títulos universais ou nomes de autores estrangeiros (ex: "Dune", "1984", "George Orwell") encontrem seus resultados.
5. **Extração de Ano e ISBNs:** O ano de lançamento é extraído com segurança dos 4 primeiros dígitos de `publishedDate` ou `first_publish_year`, e os códigos `ISBN_10` e `ISBN_13` são extraídos de `industryIdentifiers` ou `isbn`.
6. **Sanitização de HTML:** Tags como `<p>`, `<b>` e entidades HTML (`&quot;`, `&#39;`) retornadas nas descrições são devidamente sanitizadas.

---

## 3. Contratos de API do Backend (`/books`)

### 3.1 Schemas Zod (`backend/src/schemas/book.schema.ts`)
* `searchBooksQuerySchema`: `{ q: string (min 1), limit: number (1..40, default 12) }`
* `popularBooksQuerySchema`: `{ limit: number (1..40, default 12) }`
* `bookRecommendationsQuerySchema`: `{ limit: number (1..30, default 10) }`

### 3.2 Rotas Fastify (`backend/src/routes/books.routes.ts`)
* `GET /books/search?q=&limit=`: Retorna `{ results: BookDetails[] }`.
* `GET /books/popular?limit=`: Retorna obras aclamadas e clássicos em alta para evitar telas vazias.
* `GET /books/recommendations?limit=`: Protegido por `authMiddleware`, retorna recomendações literárias baseadas no perfil do usuário autenticado.
* `GET /books/:id`: Retorna o objeto `BookDetails` ou 404 se não encontrado.

---

## 4. Engenharia do Motor de Recomendação Literária

Localizado em `backend/src/services/book-recommendation.service.ts`:

### 4.1 Função de Pesos (`calculateBookWeight`)
* **Nota 5 Estrelas:** Peso `+3.0`
* **Nota 4 Estrelas:** Peso `+2.0`
* **Nota 3 Estrelas:** Peso `+1.0`
* **Nota 2 Estrelas:** Peso `-1.0`
* **Nota 1 Estrela:** Peso `-2.0`
* **Status `dropped`:** Penalidade imediata `-3.0`
* **Multiplicadores de Status:** `completed` (Lido: 1.5x), `watching` (Lendo: 1.2x), `plan_to_watch` (Quero Ler: 1.0x).

### 4.2 Sementes e Deduplicação
1. Seleciona até 3 livros semente com maior pontuação positiva na estante do usuário (`domain: 'book'`).
2. Extrai os autores e categorias principais a partir do campo `extraMeta`.
3. Consulta obras do mesmo autor e assuntos relacionados.
4. Exclui livros que já constam na biblioteca (por `externalId` ou título normalizado).
5. Atribui pontuação ponderada com razões explicáveis (ex: *"Porque você apreciou obras de Machado de Assis"*).
6. **Cold Start Inteligente:** Caso o usuário não possua avaliações na estante, apresenta clássicos universais e brasileiros recomendados para o pontapé inicial.

---

## 5. UI/UX e Acessibilidade Universal

### 5.1 Proporção Editorial e Liquid Glass
* O componente `BookCard` adota proporção editorial `aspect-[1/1.5]` com sombra volumétrica e efeito de relevo na borda esquerda simulando a lombada de um livro.
* Exibição de autores, ano de publicação e quantidade de páginas (`FileText`).

### 5.2 Acessibilidade Android TV (D-Pad)
* Todos os elementos interativos possuem `tabIndex={0}`.
* Efeito luminoso animado `tv-focus-glow` com borda e realce em tons caramelo (`#dda15e`).
* Acionamento completo por controle remoto via teclas `Enter` e `Espaço`. Tecla `Escape` fecha os modais.

### 5.3 Mobile Touch Target
* Áreas de toque generosas nos botões (mínimo de 44x44px ou 48px).
* Scroll suave horizontal no `BookRecommendationRail` com suporte a gestos de swipe.

### 5.4 Terminologia Literária
Na biblioteca e status badges, os estados do banco são mapeados para a linguagem natural do leitor:
* `plan_to_watch` ➔ **Quero Ler**
* `watching` ➔ **Lendo**
* `completed` ➔ **Lido** (abre o modal de avaliação de 1 a 5 estrelas)
* `dropped` ➔ **Abandonei**

---

## 6. Cobertura de Testes Automatizados

* **Backend (`backend/tests/`):**
  * `books.service.test.ts`: 11 testes (normalização, capas HTTPS, extração de ISBN e ano, sanitização HTML).
  * `book-recommendation.service.test.ts`: 7 testes (cálculo de pesos, sementes por autor, deduplicação e cold start).
  * `books.routes.test.ts`: 6 testes (validação Zod, status codes, autenticação).
* **Frontend (`frontend/tests/`):**
  * `BookCard.test.tsx`: 3 testes (renderização editorial, acessibilidade TV e badge de estante).
  * `useBookSearch.test.ts`: 3 testes (debounce, populares e erro).
  * `BookDetailsModal.test.tsx`: 3 testes (metadados completos, ações de estante e status).
  * `BookRecommendationRail.test.tsx`: 4 testes (trilho horizontal, motivos e foco TV).
