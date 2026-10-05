# SPEC-015: Módulo de Quadrinhos & Mangás (Sagas, Séries e Acervo de Leituras)

| Metadado | Detalhe |
| :--- | :--- |
| **Status** | Aprovado / Em Implementação |
| **Versão** | 1.0.0 |
| **Data** | 2026-10-02 |
| **Autor** | Engenharia de Software & Arquitetura Akasha |
| **Alvos** | `backend/src/services/comics.service.ts`, `backend/src/services/comic-recommendation.service.ts`, `backend/src/routes/comics.routes.ts`, `backend/src/schemas/comic.schema.ts`, `frontend/src/types/comic.ts`, `frontend/src/components/search/ComicCard.tsx`, `frontend/src/pages/Search.tsx`, `frontend/src/pages/Library.tsx` |

---

## 1. Visão Geral e Motivação

O **Akasha** agora consolida o quarto grande pilar transmídia da biblioteca universal: o universo das **Histórias em Quadrinhos e Mangás**.

### 1.1 Decisão Arquitetural: Granularidade por Sagas e Obras Completas
Acompanhando a mesma analogia consolidada nas séries de TV (onde o usuário avalia e acompanha a *Série* como um todo e não episódios isolados), no módulo de Quadrinhos o acervo é modelado no nível de **Saga, Volume ou Série Completa (Run)** (ex: *Batman: O Longo Dia das Bruxas*, *Guerra Civil*, *Watchmen*, *Berserk*, *Monster*, *Sandman*).
* **Edições Avulsas (Single Issues):** Não são indexadas como entidades de topo do catálogo nem inundam a busca ou a biblioteca.
* **Detalhamento Interativo:** Quando uma saga/volume é consultada, a aplicação disponibiliza uma lista enumerada/checklist das edições individuais que compõem aquele arco ou volume (ex: *Homem-Aranha #1*, *Hulk #2*, etc.), permitindo visualização sob demanda (toggle).

---

## 2. Ingestão Externa & Provedores

### 2.1 HQs Ocidentais: Comic Vine API (Volumes & Story Arcs)
* **Entidades:** `volume` (coleções, encadernados e minisséries fechadas) e `story_arc` (grandes sagas e crossovers como *Guerra Civil* ou *Crise nas Infinitas Terras*).
* **Autenticação:** `COMICVINE_API_KEY` fornecida via variável de ambiente.
* **Cabeçalho:** `User-Agent: AkashaMediaHub/1.0.0` (exigência estrita da Comic Vine).
* **Cache em Memória:** Cache com TTL de 30 minutos para amenizar o limite de 200 req/hora.

### 2.2 Mangás, Manhwas & Manhuas: AniList GraphQL API
* **Endpoint:** `POST https://graphql.anilist.co` (Público, sem necessidade de chaves ou tokens).
* **Entidade:** `Media` com `type: MANGA`, recuperando título (romaji, inglês e nativo), contagem de volumes, contagem de capítulos, status de publicação, mangaka/equipe criativa e gêneros.

### 2.3 Convenção de Busca Internacional na UI (KISS & YAGNI)
Como Comic Vine e AniList indexam seus acervos primariamente em inglês e romaji, a interface de busca do Akasha orienta ativamente o usuário através de:
* Placeholder contextual: *"Buscar sagas de HQs ou mangás em inglês (ex: Civil War, Berserk)..."*
* Dica destacada na tela de Busca: aviso amigável explicando que os acervos são internacionais e orientando a digitação de títulos em inglês/romaji.
* Empty states contextualizados alertando para tentar termos em inglês caso a busca inicial não encontre resultados.

### 2.4 Resiliência e Fallback Gracioso (Zero-Mock)
Caso a Comic Vine atinja rate limit ou enfrente instabilidade, o serviço utiliza a **AniList** para mangás e o catálogo pré-configurado de clássicos para cold start, garantindo que buscas nunca quebrem a aplicação.

---

## 3. Modelo de Dados e Metadados Cacheados

No Prisma (`backend/prisma/schema.prisma`), o modelo polimórfico `Wishlist` utiliza:
* `domain`: `comic`
* `externalId`: ID com prefixo de domínio (ex: `cv-vol-123`, `cv-arc-456`, `al-789`)
* `title`: Nome da saga ou mangá
* `coverUrl`: Capa em alta resolução
* `releaseYear`: Ano de início da publicação
* `extraMeta`: Metadados complementares:
  ```json
  {
    "type": "comic" | "manga" | "manhwa",
    "publisher": "Marvel Comics" | "DC Comics" | "Shueisha",
    "creators": ["Jeph Loeb", "Tim Sale"],
    "issueCount": 13,
    "volumeCount": 1,
    "chapterCount": null,
    "issues": [
      { "id": "1", "name": "Batman: The Long Halloween #1", "issueNumber": "1" },
      { "id": "2", "name": "Batman: The Long Halloween #2", "issueNumber": "2" }
    ]
  }
  ```

---

## 4. Contratos de API do Backend (`/comics`)

### 4.1 Endpoints Fastify
* `GET /comics/search?q=&type=&limit=`: Busca unificada por sagas e mangás.
* `GET /comics/popular?limit=`: Retorna sagas e mangás consagrados para Cold Start.
* `GET /comics/recommendations?limit=`: Retorna recomendações personalizadas com base no histórico do usuário.
* `GET /comics/:id`: Retorna os detalhes da obra incluindo a checklist de edições ou volumes.

### 4.2 Schemas Zod (`backend/src/schemas/comic.schema.ts`)
* `searchComicsQuerySchema`: `{ q: string.min(1), type: z.enum(['all', 'comic', 'manga']).default('all'), limit: z.coerce.number().min(1).max(40).default(12) }`
* `comicRecommendationsQuerySchema`: `{ limit: z.coerce.number().min(1).max(30).default(10) }`

---

## 5. Motor de Recomendação de Quadrinhos (`comic-recommendation.service.ts`)

1. **Ponderação e Função de Utilidade:**
   - 5 estrelas: `+3.0`, 4 estrelas: `+2.0`, 3 estrelas: `+1.0`, 2 estrelas: `-1.0`, 1 estrela: `-2.0`.
   - Status `dropped`: `-3.0` (penalidade imediata).
   - Multiplicador de status: `completed` (1.5x), `watching` / lendo (1.2x), `plan_to_watch` (1.0x).

2. **Perfil Vetorial de Tags e Afinidade (`UserComicProfile`):**
   - **Vetor de Tags/Gêneros:** Extrai as categorias e tags reais salvas em `extraMeta.genres` e pondera o score de cada uma proporcionalmente à nota e ao status (`tagScores.set(genre, sum)`).
   - **Conjunto Aversivo (Negative Set):** Obras avaliadas com 1★, 2★ ou abandonadas (`dropped`) alimentam o `negativeTags`. Candidatos que apresentem essas tags recebem penalização direta no score (`-8%` por tag negativa).
   - **Mapeamento de Editoras e Autores:** Constrói índices dinâmicos de preferências por estúdio/editora (`favoritePublishers`) e autores (`favoriteCreators`).

3. **Arquitetura 100% Dinâmica (Sem Listas Estáticas de Gostos):**
   - **Zero Listas Estáticas:** Todas as buscas e gerações de candidatos partem estritamente do acervo real presente na biblioteca do usuário.
   - **AniList Graph Collaborative Filtering (Tempo Real):** Para obras orientais (`al-*`), consulta recomendações colaborativas da comunidade global (`Media(id: $id, type: MANGA) { recommendations(sort: [RATING_DESC]) }`).
   - **Ingestão Dinâmica por Gênero na AniList (`fetchMangaByGenresFromAniList`):** Consulta a AniList filtrando por `genre_in: $topGenres` ordenado por `[SCORE_DESC, POPULARITY_DESC]`, descobrindo novas obras de alta aclamação alinhadas aos temas favoritos do usuário.
   - **Extração Dinâmica de Séries via NLP Agnóstico (`extractSeriesCore`):** Processa o título de qualquer obra para isolar o núcleo da franquia (removendo subtítulos, edições, volumes e numerais, preservando termos com hífen como *Spider-Man* e *X-Men*), buscando dinamicamente sagas correlatas.
   - **Busca Dinâmica por Criadores:** Extrai os autores e roteiristas reais (`extraMeta.creators`) das obras da biblioteca e busca outras publicações dos mesmos criadores.
   - **Blacklist de Metatermos:** Termos genéricos de formato (`'quadrinhos'`, `'hq'`, `'hq ocidental'`, `'comics'`, `'manga'`, `'livro'`) são estritamente expurgados de termos de busca e afinidade.
   - **Filtro de Segurança Estrito (Anti-NSFW / Junk):** Qualquer obra contendo termos eróticos, adultos ou junk (`planet sex`, `hentai`, `erotic`, `ninfeta`, etc.) é liminarmente banida de buscas e recomendações. Na AniList GraphQL, aplica `isAdult: false`.

4. **Cálculo da Probabilidade de Afinidade (% Match Real) e Justificativa Explicável:**
   - O percentual exibido nos cards (`{score}% Match`) é calculado via sobreposição ponderada de tags, bônus de autor/editora e avaliações prévias:
     $$\text{Score} = \text{Base} + \text{TagBonus} + \text{CreatorBonus} + \text{PublisherBonus} - \text{NegativePenalty}$$
   - Faixa de valor normalizada: de `65%` a `99%` Match (nunca mais valores estáticos ou repetitivos).
   - **Justificativa Humanizada e Contextual:** Cada recomendação exibe o motivo preciso dinamicamente atrelado à nota, autor ou tags da obra (ex: *"95% de afinidade: combina com seu gosto por Dark Fantasy e Sobrenatural"* ou *"Para quem avaliou Batman: The Killing Joke com 5★: saga correlata no mesmo universo"* ou *"Do mesmo criador de The Sandman (Neil Gaiman)"*).

5. **Cold Start Neutro:**
   - Apenas quando o usuário não possui nenhum item avaliado positivamente na biblioteca, sugere um conjunto mínimo e neutro de sagas fundamentais de introdução para não deixar a tela vazia. Assim que o usuário adiciona seu primeiro título, o motor vetorial dinâmico assume o controle integral.

---

## 6. UI/UX e Design System Liquid Glass

1. **Proporção do Card:** Proporção editorial `aspect-[2/3]`.
2. **Badges Contextuais:**
   - Tipo: `Saga / HQ`, `Mangá`, `Manhwa`.
   - Contagem: `12 Edições`, `34 Volumes` ou `Arco Fechado`.
   - Editora: Marvel, DC, Image, Dark Horse, Kodansha, etc.
3. **Toggle de Edições (Accordion Interativo):**
   - Na listagem de detalhes ou card expandido, um botão interativo permite abrir a lista das edições que compõem a saga, enumerando cada HQ com facilidade.
4. **Compatibilidade Android TV (D-Pad):**
   - Todos os botões, cards e toggles possuem `tabIndex={0}`.
   - Foco com glow dourado Liquid Glass (`border-[var(--color-caramelo-claro)]`) e elevação fluida `scale(1.05)`.
5. **Mobile Touch Target:**
   - Botões de ação rápida com mínimo de 48px e navegação por toque sem hover bloqueante.
6. **Confirmação Otimista & Tag de Biblioteca Unificada:**
   - Ao adicionar ou interagir com um quadrinho/mangá, a interface exibe feedback imediato com loader nos botões (`Adicionando...`, `Iniciando...`, `Concluindo...`).
   - Após a inclusão na biblioteca, o bloco de botões transiciona dinamicamente para o banner esmeralda com o ícone de Check verde, texto *"Já está na sua Biblioteca"* e o `StatusBadge` com ações rápidas contextuais (*Começar a Ler*, *Marcar como Lido*, *Avaliar*, *Remover*), espelhando o padrão consolidado de Jogos e Cinema.
   - **Badge no Card de Busca (`ComicCard.tsx`):** Exibe no rodapé do poster a tag esmeralda `Na Biblioteca` com ícone SVG de check idêntica a `GameCard` e `MovieCard`, refletindo instantaneamente adições recentes graças à atualização síncrona do cache do `useWishlist`.
   - **Consolidação Multi-camadas de Metadados (`ComicDetailsModal.tsx`):** Ao abrir qualquer obra (esteja ela recém-pesquisada ou já constante na biblioteca com `extraMeta`), o modal consolida os dados em cascata (`fullDetails` -> `comic` -> `libraryItem.extraMeta`), garantindo que título, capa, sinopse, criadores, editora, contagem de volumes e edições nunca sumam da tela.
   - **Biblioteca (`LibraryItemCard.tsx`):** O acionador do modal de detalhes de itens polimórficos de quadrinhos prioriza `onSelectItem` para abrir o modal especialista `ComicDetailsModal` em vez de tentar carregar pelo modal de cinema do TMDB.
7. **Badge de Afinidade (% Match) e Tag Temática no Trilho (ComicRecommendationRail.tsx):**
    - Exibe no canto superior do poster o badge {score}% Match com fundo translúcido e borda âmbar, alinhando a experiência visual ao padrão do trilho de Cinema.
    - Apresenta a tag temática principal da obra junto aos criadores, justificando visualmente ao leitor o motivo da sugestão.
