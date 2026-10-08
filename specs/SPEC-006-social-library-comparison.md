# SPEC-006: Sincronia Cósmica Universal & Comparação de Acervos Multidomínio

| Metadado | Detalhe |
| :--- | :--- |
| **Status** | Aprovado / Implementado |
| **Versão** | 2.0.0 (Expansão Universal Multidomínio) |
| **Data** | 2026-10-08 (v1.0.0 em 2026-09-25) |
| **Autor** | Engenharia de Software & Arquitetura Akasha |
| **Alvos** | `backend`, `frontend`, `roadmap.md`, `conceito.md`, `arquitetura.md` |

---

## 1. Visão Geral e Motivação

O Akasha conta com uma rede bilateral de viajantes (amizades via Friend Code / Username, SPEC-002) e um Feed de Atividades Sociais (SPEC-003).
A **Sincronia Cósmica** eleva a experiência social a um novo patamar, transformando a simples inspeção de bibliotecas em uma experiência colaborativa, lúdica e prática para casais e grupos de amigos.

Originalmente concebida para o acervo audiovisual, a **v2.0.0** expande a Sincronia Cósmica para abranger **todos os módulos culturais do Akasha**:
1. **Cinema** (`movie` - TMDB)
2. **Séries de TV** (`tv` - TMDB)
3. **Jogos Eletrônicos** (`game` - IGDB / Twitch Helix)
4. **Livros e Literatura** (`book` - Google Books / Open Library)
5. **Quadrinhos e Mangás** (`comic` - AniList / Comic Vine)

Ela resolve três dores essenciais do entretenimento compartilhado:
1. **A jornada compartilhada:** *"O que nós dois estamos querendo curtir agora?"* (Backlog comum: filmes/séries para ver no sofá, jogos para maratonar em coop, livros e mangás para ler em clube a dois).
2. **O choque de opiniões:** *"Como nossas avaliações se comparam para obras que ambos concluímos?"* (Consensos cirúrgicos vs Duelos de notas em qualquer mídia).
3. **Descoberta de alta confiança:** *"O que o meu amigo amou com nota 4★ ou 5★ que eu ainda não consumi?"* (Recomendações orgânicas cruzadas com adição instantânea à estante correta).

---

## 2. O Algoritmo de Afinidade Cósmica (*Resonance Score*)

### 2.1 Chaveamento Polimórfico de Obras
Cada obra nos acervos (`Wishlist`) é identificada universalmente por sua tupla de domínio e identificador externo:
$$\text{Key} = \text{domain} : \text{externalId}$$

Para registros audiovisuais legados, a chave é resolvida via `mediaType:tmdbId`.

### 2.2 Resonance Score Global (Afinidade Cósmica Universal)
A **Afinidade Cósmica** é uma métrica normalizada entre 0% e 100%, combinando dois fatores determinantes:

$$\text{Afinidade}_{\text{Global}} = \left( 0.4 \times \text{Score}_{\text{Sobreposição}} \right) + \left( 0.6 \times \text{Score}_{\text{Notas}} \right)$$

1. **Score de Sobreposição (Similaridade de Jaccard):**
   $$\text{Score}_{\text{Sobreposição}} = \frac{|\text{Acervo}_A \cap \text{Acervo}_B|}{|\text{Acervo}_A \cup \text{Acervo}_B|} \times 100$$
   *Se a união for vazia, o score é 0.*

2. **Score de Concordância de Notas:**
   Para as $N$ obras em que ambos atribuíram estrelas (1 a 5):
   $$\text{Score}_{\text{Notas}} = \left( 1 - \frac{\sum_{i=1}^N |\text{Nota}_{A,i} - \text{Nota}_{B,i}|}{4 \times N} \right) \times 100$$
   *Se $N = 0$, o score de notas herda o score de sobreposição ou padrão neutro de 50%.*

3. **Tabela de Faixas Cósmicas:**
   | Faixa (%) | Rótulo Akáshico | Descrição |
   |---|---|---|
   | **90% - 100%** | **Almas Cósmicas** 🌌 | Sintonia quase absoluta de gostos e escolhas. |
   | **75% - 89%** | **Frequência Harmônica** ✨ | Forte convergência com discussões pontuais e produtivas. |
   | **50% - 74%** | **Mundos Paralelos** 🪐 | Áreas de interesse compartilhadas, mas repertórios divergentes. |
   | **0% - 49%** | **Caos Gravitacional** ☄️ | Opostos completos; terreno fértil para debates acalorados. |

### 2.3 Ressonância Específica por Módulo Cultural (`domainAffinities`)
O motor calcula adicionalmente a afinidade individualizada para cada módulo cultural em que ambos os viajantes possuam obras registradas:
- 🎬 **Cinema** (`movie`)
- 📺 **Séries** (`tv`)
- 🎮 **Jogos** (`game`)
- 📚 **Livros** (`book`)
- 💥 **Quadrinhos & Mangás** (`comic`)

---

## 3. Arquitetura de Backend (Fastify + Prisma + Zod)

### 3.1 Endpoint Privado de Comparação Enriquecido
`GET /friends/:id/compare?domain={movie|tv|game|book|comic|all}`
* **Autenticação Obrigatória:** Via middleware `verifySupabaseAuth` (`request.userId`).
* **Query param opcional:** `domain` filtra os resultados das listas para um módulo específico ou retorna a visão global (`all` ou omitido).
* **Regra de Privacidade & Autorização:**
  * O backend consulta a tabela `Friendship` entre `request.userId` e `params.id`.
  * Se não existir amizade ou `status !== 'accepted'`, retorna **403 Forbidden**.
  * Se houver bloqueio mútuo (`blocked`), retorna **404 Not Found**.

### 3.2 Otimização de Performance e Hidratação de Metadados
Como a tabela `Wishlist` armazena diretamente `title`, `coverUrl`, `releaseYear`, `domain` e `externalId`, a resolução é instantânea.
Para obras audiovisuais que ainda dependam de metadados externos:
1. Busca metadados cacheados locais na tabela `Activity`.
2. Para obras ainda pendentes, executa resolução controlada via `fetchMediaDetails` com o cache em memória do serviço TMDB.

### 3.3 Contrato Universal de Resposta (JSON):
```json
{
  "friend": {
    "id": "uuid",
    "username": "amigo_viajante",
    "avatarUrl": "https://...",
    "friendCode": "AK-48B1-92A3"
  },
  "affinity": {
    "percentage": 88,
    "label": "Frequência Harmônica",
    "totalShared": 18,
    "totalOverlapRated": 10
  },
  "domainAffinities": {
    "movie": { "percentage": 85, "label": "Frequência Harmônica", "totalShared": 6, "totalOverlapRated": 4 },
    "game": { "percentage": 94, "label": "Almas Cósmicas", "totalShared": 7, "totalOverlapRated": 4 },
    "book": { "percentage": 70, "label": "Mundos Paralelos", "totalShared": 3, "totalOverlapRated": 1 },
    "comic": { "percentage": 80, "label": "Frequência Harmônica", "totalShared": 2, "totalOverlapRated": 1 }
  },
  "watchTogether": [
    {
      "domain": "game",
      "externalId": "1942",
      "title": "The Witcher 3: Wild Hunt",
      "coverUrl": "https://images.igdb.com/...",
      "releaseYear": 2015
    }
  ],
  "ratedOverlap": [
    {
      "domain": "book",
      "externalId": "zyTCAlFPjgYC",
      "title": "Duna",
      "coverUrl": "https://books.google.com/...",
      "myRating": 5,
      "friendRating": 5,
      "myReview": "Marco da ficção científica",
      "friendReview": "Incrível do início ao fim",
      "delta": 0
    }
  ],
  "friendRecommendations": [
    {
      "domain": "comic",
      "externalId": "anilist-30002",
      "title": "Berserk",
      "coverUrl": "https://s4.anilist.co/...",
      "friendRating": 5,
      "friendReview": "Arte monumental",
      "inMyBacklog": false
    }
  ]
}
```

---

## 4. Arquitetura Frontend & Universalidade (Android TV, Mobile & Desktop)

### 4.1 Estrutura de Componentes
* `AffinityBadge`: Círculo/gauge cósmico que exibe a porcentagem, animação de aura sutil, rótulo akáshico e **chips interativos de ressonância por módulo**.
* `ComparisonView`: Componente mestre com seletor de módulos culturais e abas de jornada:
  1. **Seletor de Módulos:** `Todas as Mídias`, `Cinema & Séries`, `Jogos`, `Livros`, `Quadrinhos & Mangás`.
  2. **Curtir Juntos:** Grid de cartões de obras em comum no backlog com badges temáticos de mídia.
  3. **Consenso & Duelo:** Cards duplos com visualização lado a lado de notas e resenhas, selo de Consenso Perfeito ($\Delta = 0$) e Duelo ($\Delta \ge 2$).
  4. **Recomendações:** Cartões com a avaliação do amigo e botão de ação rápida contextual:
     - `+ Quero Jogar` (Jogos)
     - `+ Quero Ler` (Livros e HQs/Mangás)
     - `+ Quero Assistir` (Cinema e Séries)

### 4.2 Acessibilidade & Compatibilidade Universal
* **Android TV (D-Pad):**
  - Todos os botões de filtros, abas, cartões e ações possuem `tabIndex={0}`.
  - Estados `:focus-visible` com anel dourado iluminado (`outline-none ring-2 ring-amber-400`).
  - Suporte ao atalho `Escape` para retornar à lista geral de amigos sem recarregar a tela.
* **Mobile (Touch):**
  - Touch targets amplos (mínimo de 44px) em todos os botões e abas.
  - Grid fluido e adaptável sem dependência de `:hover`.
* **Desktop:**
  - Layout dinâmico com colunas amplas para leitura confortável de resenhas.

---

## 5. Plano de Cobertura de Testes Automatizados (Vitest)

1. **Testes Unitários de Algoritmo Multidomínio (`comparison.service.test.ts`):**
   - Cálculo exato de Jaccard e concordância de notas para acervos mistos (jogos, livros, quadrinhos, filmes).
   - Cálculo de afinidades isoladas por domínio (`calculateDomainAffinities`).
   - Filtragem por `domainFilter`.
2. **Testes de Integração de Rota Fastify (`comparison.routes.test.ts`):**
   - Validação Zod de parâmetros e do query param `?domain=game`.
   - Autorização bilateral, bloqueio e payload 200 completo.
3. **Testes de Componente Frontend (`ComparisonView.test.tsx`):**
   - Renderização dos badges temáticos de diferentes módulos.
   - Alternância entre abas e filtragem dinâmica de módulos.
   - Ação rápida contextual de backlog (`+ Quero Ler`, `+ Quero Jogar`, `+ Quero Assistir`).
