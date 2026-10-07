# SPEC-017: Motor Transmídia, Dashboard do Grande Acervo e Ferramentas MCP Universais

| Metadado | Detalhe |
| :--- | :--- |
| **Status** | Implementado & Validado (100% Concluído) |
| **Versão** | 1.0.0 |
| **Data** | 2026-10-07 |
| **Autor** | Engenharia de Software & Arquitetura Akasha |
| **Alvos** | `backend/src/services/transmedia.service.ts`, `backend/src/mcp/mcp-server.ts`, `frontend/src/pages/Transmedia.tsx`, `frontend/src/components/transmedia/` |

---

## 1. Visão Geral e Motivação

Com a conclusão das Fases 1 a 9, o **Akasha** consolidou seus silos especializados de Cinema, TV, Jogos, Livros e Quadrinhos/Mangás. No entanto, o verdadeiro poder dos "Registros Akáshicos" se manifesta na **interconexão entre mídias**: a capacidade de reconhecer que um romance literário de Frank Herbert (*Duna*), um filme de Denis Villeneuve (*Dune: Part One*), uma saga de quadrinhos e um jogo de estratégia (*Dune: Spice Wars*) pertencem a um mesmo continuum criativo.

A **FASE 10** entrega:
1. **Motor Transmídia:** Descoberta e recomendação cruzada de obras entre diferentes mídias a partir de Propriedades Intelectuais (IPs) consumidas e avaliadas pelo usuário.
2. **Dashboard do Grande Acervo:** Central analítica com métricas consolidadas de consumo cultural (horas de tela, horas de jogos, páginas lidas, volumes de quadrinhos, distribuição de notas e Índice de Amplitude Akasha).
3. **Servidor MCP Universal:** Atualização de todas as ferramentas Fastify MCP para aceitar o parâmetro `domain` (`movie`, `tv`, `game`, `book`, `comic`, `transmedia`), com novas ferramentas analíticas e retrocompatibilidade legada.
4. **Interface Universal Adaptativa:** Página dedicada `O Grande Acervo` (`/transmedia`) com foco D-Pad para Android TV (`tabIndex={0}`), touch targets mobile generosos e visual Liquid Glass terroso.

---

## 2. Arquitetura e Engenharia de Software

### 2.1 Backend: Motor Transmídia (`transmedia.service.ts`)
* **Catálogo Canônico Transmídia:** Base interna contendo mais de 20 grandes universos transmidiáticos mapeados (ex: *The Witcher*, *Dune*, *The Last of Us*, *Cyberpunk*, *O Senhor dos Anéis*, *Harry Potter*, *Star Wars*, *Arcane / League of Legends*, *Fallout*, *One Piece*, *Castlevania*, *Batman*, *Homem-Aranha*, *The Sandman*, etc.).
* **Detecção e Resolução de IP (`identifyFranchise`):** Normaliza títulos (remoção de diacríticos e pontuação) e cruza `externalId` e domínio para identificar universos em que o usuário possui obras ativas.
* **Geração de Pontes Transmídia (`getUserTransmediaRecommendations`):**
  - Mapeia os silos que o usuário ainda **não** experimentou naquela franquia.
  - Prioriza sementes com maiores notas (4★ e 5★) ou status `completed`/`watching`.
  - Constrói justificativas dinâmicas ricas (ex: *"Porque você avaliou The Witcher 3 com 5★ em Jogos, descubra a obra literária original de Andrzej Sapkowski em Livros"*).
  - Inclui Cold-Start resiliente para usuários recém-chegados.

### 2.2 Backend: Métricas Consolidadas do Grande Acervo (`getUserArchiveStats`)
* Agregação polimórfica sobre a tabela `wishlist`:
  - Contagem e percentual por domínio (`movie`, `tv`, `game`, `book`, `comic`) e médias ponderadas de notas.
  - Contagem e percentual por status (`plan_to_watch`, `watching`, `completed`, `dropped`).
  - Distribuição analítica de avaliações (histograma 1★ a 5★ e média geral).
  - Métricas de imersão estimada:
    - `estimatedScreenHours`: ~2h por filme e ~10h por série.
    - `estimatedGameHours`: ~35h por jogo concluído e ~15h jogando.
    - `estimatedPagesRead`: extraído de `extraMeta.pageCount` ou padrão editorial de 300 páginas.
    - `totalComicVolumes`: volume consolidado de sagas e mangás.
  - **Índice de Amplitude Akasha (0 a 100):** Cálculo de entropia e balanceamento entre os 5 domínios culturais com atribuição de arquétipo de perfil (*Polímata Transmídia*, *Cinéfilo Devoto*, *Arquiteto de Mundos Virtuais*, *Guardião da Arte Literária*, *Explorador Multiverso*).

### 2.3 Backend: Ferramentas MCP Fastify Universais (`backend/src/mcp/mcp-server.ts`)
As ferramentas do Model Context Protocol passam a aceitar `domain` e incorporam as novas rotas analíticas:
1. `search_media(query, domain, limit?)`: Despacha busca inteligente para TMDB, IGDB, Google Books ou Comic Vine/AniList conforme o domínio selecionado.
2. `get_recommendations(domain, limit?)`: Suporta `movie`, `tv`, `game`, `book`, `comic`, `all` e o novo modo `transmedia`.
3. `add_to_library(externalId, domain, status, title?, coverUrl?, releaseYear?, userRating?, notes?)`: Upsert universal polimórfico na wishlist.
4. `rate_media(externalId, domain, rating, notes?)`: Avaliação de 1 a 5 estrelas em qualquer mídia.
5. `remove_from_list(externalId, domain)`: Remoção polimórfica do acervo.
6. `get_library_stats()`: Consulta imediata ao dashboard analítico do usuário para agentes de IA.
7. `get_transmedia_connections(limit?)`: Descoberta de pontes e correlações transmídia para agentes LLM.

### 2.4 Frontend: O Grande Acervo (`frontend/src/pages/Transmedia.tsx`)
* **Navegação em Abas:**
  - `Métricas`: Visualização do `GrandArchiveDashboard` com contadores, barras de progresso Liquid Glass e arquétipo cultural.
  - `Conexões`: Exploração de pontes transmídia sugeridas com justificativas visuais e atalhos de adição rápida.
  - `Universos`: Catálogo de franquias canônicas com enumeração de obras em cada mídia.
* **Componentes Modulares:**
  - `TransmediaCard`: Card responsivo com selo de franquia, indicação visual De -> Para (`🎮 Jogos -> 📚 Livros`), afinidade percentual e foco D-Pad para Android TV.
  - `TransmediaRail`: Carrossel horizontal suave com foco animado `scale(1.04)` e scroll automático ao focar.
  - `GrandArchiveDashboard`: Painel de métricas consolidado com design system Liquid Glass.

### 2.5 Resolução de IDs Canônicos e Proteção Defensiva do Modal
* **Alinhamento Rigoroso de IDs Externos:** Todos os identificadores de jogos (IGDB), filmes/séries (TMDB), livros (Google Books/Open Library) e HQs (Comic Vine/AniList) do catálogo canônico foram conferidos e alinhados diretamente com as APIs oficiais (ex: *Batman: Arkham City* ajustado para o ID real `501` da IGDB e capa oficial `co1voh.jpg`).
* **Preservação de Retrocompatibilidade (`legacyExternalIds`):** Adicionado suporte a identificadores legados nas franquias para garantir que usuários com obras previamente salvas no banco continuem tendo suas conexões transmídia e deduplicações identificadas sem fricção.
* **Consistência Semântica Defensiva no Frontend:** `Transmedia.tsx` implementa checagem `isTitleConsistent` ao abrir o modal de detalhes via ID externo. Caso a API de terceiros retorne metadados divergentes ou falhe, o sistema aplica fallback gracioso aos metadados do card recomendado, eliminando qualquer discrepância visual.

---

## 3. Matriz de Arquivos Criados e Atualizados

| Módulo | Caminho do Arquivo | Função |
| :--- | :--- | :--- |
| **Transmedia Schemas** | `backend/src/schemas/transmedia.schema.ts` | Schemas Zod de validação para query, recomendações e métricas do acervo |
| **Transmedia Service** | `backend/src/services/transmedia.service.ts` | Motor de franquias, pontes transmídia e agregações analíticas de consumo |
| **Transmedia Routes** | `backend/src/routes/transmedia.routes.ts` | Endpoints Fastify: `/transmedia/recommendations`, `/transmedia/stats` e `/transmedia/franchises` |
| **Fastify Server** | `backend/src/server.ts` | Registro das novas rotas com prefixo `/transmedia` |
| **MCP Server Universal** | `backend/src/mcp/mcp-server.ts` | Atualização das tools MCP com suporte a `domain`, `transmedia` e `get_library_stats` |
| **Testes Backend** | `backend/tests/services/transmedia.service.test.ts` | 12 testes unitários para identificação de franquias, recomendações e métricas |
| **Testes Backend** | `backend/tests/routes/transmedia.routes.test.ts` | 3 testes de integração das rotas Fastify |
| **Testes Backend** | `backend/tests/mcp/mcp-server.test.ts` | 8 testes unitários para as novas ferramentas MCP universais |
| **Tipagem Frontend** | `frontend/src/types/transmedia.ts` | Interfaces TypeScript para pontes transmídia, domínios e métricas |
| **Hook Frontend** | `frontend/src/hooks/useTransmedia.ts` | Hook React para busca de recomendações, métricas e catálogo |
| **Card Transmídia** | `frontend/src/components/transmedia/TransmediaCard.tsx` | Card com indicação visual da ponte transmídia e acessibilidade TV D-Pad |
| **Rail Transmídia** | `frontend/src/components/transmedia/TransmediaRail.tsx` | Trilho horizontal animado de conexões entre franquias |
| **Dashboard Frontend** | `frontend/src/components/transmedia/GrandArchiveDashboard.tsx` | Painel analítico de métricas consolidadas em Liquid Glass |
| **Página Frontend** | `frontend/src/pages/Transmedia.tsx` | Página "O Grande Acervo" com abas de Métricas, Conexões e Universos e modal defensivo |
| **Navegação Frontend** | `frontend/src/components/ui/Navbar.tsx` | Inclusão do link "Grande Acervo" na barra lateral e menu mobile |
| **Roteamento Frontend** | `frontend/src/App.tsx` | Registro da rota protegida `/transmedia` |
| **Testes Frontend** | `frontend/tests/components/transmedia/TransmediaCard.test.tsx` | Testes de renderização, clique e atalho de teclado Android TV |
| **Testes Frontend** | `frontend/tests/components/transmedia/TransmediaRail.test.tsx` | Testes de integração do carrossel |
| **Testes Frontend** | `frontend/tests/components/transmedia/GrandArchiveDashboard.test.tsx` | Testes de exibição das métricas analíticas e domínios |
| **Testes Frontend** | `frontend/tests/pages/Transmedia.test.tsx` | Testes de alternância de abas, listagem de universos e validação defensiva do modal |

---

## 4. Testes e Validação de Qualidade
* **Backend:** 221 testes automatizados em 28 suítes com 100% de aprovação (Vitest).
* **Frontend:** 199 testes automatizados em 40 suítes com 100% de aprovação (Vitest + Testing Library).
* **Total do Projeto:** 420 testes automatizados cobrindo ponta a ponta todas as regras de negócio.
