# SPEC-016: Motor Inteligente de Recomendações de Quadrinhos & Mangás (Multi-Seed & Editorial Interleaving)

## 1. Visão Geral e Problema
O algoritmo de recomendações de quadrinhos e mangás apresentava comportamento estático e subótimo quando comparado aos motores maduros de Filmes/Séries (TMDB) e Jogos (IGDB), manifestando três gargalos críticos:
1. **Saturação Monotemática por Mesma Franquia:** Quando um usuário possuía e avaliava múltiplos volumes da mesma obra (ex.: volumes de *Before Watchmen* ou *Batman*), o motor extraía todas as sementes da mesma saga. As buscas na Comic Vine e AniList retornavam apenas variações da mesma obra já catalogada, que eram filtradas, reduzindo drasticamente o número de candidatos finais.
2. **Subutilização do Grafo Semântico AniList:** Se o usuário tinha avaliado predominantemente HQs ocidentais (`cv-*`), a semente primária não possuía correspondente direto no grafo de relações da AniList (`mediaRecommendations`). A busca caía em um fallback genérico por tags com limite estático baixo (6 itens), que após desduplicação contra a biblioteca resultava em um conjunto diminuto (apenas 4 itens).
3. **Catálogo de Fallback Reduzido e Justificativas Repetitivas:** O catálogo popular de emergência continha apenas 6 clássicos (muitos já salvos pelo usuário), gerando porcentagens idênticas e frases redundantes (`"87% de afinidade: combina com seu gosto por Action e..."`).
4. **Ausência de Filtros Rápidos de Formato:** A interface do trilho de quadrinhos não disponibilizava segmentação por mídia (Todos, Quadrinhos Ocidentais, Mangás/Manhwas), forçando uma mistura rígida ou restrita.

---

## 2. Requisitos e Solução Arquitetural

### 2.1 Backend: Multi-Seed Dedup, Expansão Editorial & Interleaving Dinâmico
1. **Desduplicação Inteligente de Sementes por Radical (`extractSeriesCore`):**
   - Extrai o radical semântico do título (removendo números de volume, *issue numbers*, anos e subtítulos).
   - Assegura que apenas **uma edição por franquia** ocupe slot de semente prioritária, liberando os demais slots para diversificar autores, franquias e mídias distintas.
2. **Expansão por Editoras Favoritas (`userProfile.favoritePublishers`):**
   - Agrega as editoras mais bem avaliadas pelo usuário (DC Comics, Marvel, Vertigo, Image Comics, Dark Horse, Shueisha, Kodansha) e executa buscas canônicas exploratórias de novos volumes caso os candidatos por semente direta sejam escassos.
3. **Expansão do Catálogo Canônico Canônico (`POPULAR_COMICS_CATALOG`):**
   - Ampliado de 6 para 31 obras-primas canônicas e aclamadas mundialmente, cobrindo o espectro ocidental e oriental (Watchmen, Sandman, Kingdom Come, Saga, Berserk, Monster, Solo Leveling, etc.), garantindo abundância em cenários de *cold-start* e listas enxutas.
4. **Sanitização Refinada contra Itens Parasitas (`isNsfwOrJunkComic`):**
   - Adicionadas regras com expressões regulares para expurgar livros de colorir, facsimiles, samplers, activity books e edições especiais promocionais oriundas da Comic Vine.
5. **Editorial Interleaving & Filtros de Tipo:**
   - Suporte ao parâmetro query `type: 'all' | 'comic' | 'manga'` no schema Zod e na rota `GET /comics/recommendations`.
   - Quando `type === 'all'`, o serviço intercala candidatos ocidentais e mangás de forma cadenciada (1 HQ : 1 Mangá), assegurando representatividade transmídia equilibrada.
   - Desduplicação semântica agressiva entre candidatos por chave normalizada de título.
6. **Justificativas Dinâmicas e Distribuição de Afinidade:**
   - O algoritmo calcula afinidades distintas e ponderadas (entre 75% e 99%), associando o título da obra original e a nota do usuário (ex.: *"Porque você avaliou Marvel Super Heroes Secret Wars com 5★: arco correlato"* ou *"Alta afinidade temática e narrativa com Vinland Saga"*). Gêneros em inglês são mapeados para português fluente.

### 2.2 Frontend: Abas de Formato, Navegação D-Pad TV e UI Liquid Glass
1. **Segmentação por Abas no Trilho (`ComicRecommendationRail`):**
   - Filtros de chip intuitivos: `Todos`, `Quadrinhos` e `Mangás & Manhwas`, permitindo ao usuário navegar na modalidade desejada instantaneamente.
2. **Responsividade Universal (TV, Mobile e Desktop):**
   - **Android TV / D-Pad:** Todos os seletores e cards possuem `tabIndex={0}`, `:focus` com destaque temático `.tv-focus-glow` e atalho de teclado / botão `⏮ Início` para retornar o carrossel ao primeiro card.
   - **Mobile Touch:** Suporte a arraste horizontal com *scroll-snap*, touch targets generosos (mínimo 44px) e botões de ação rápida.
   - **Desktop:** Layout fluido com hover states, respiro tipográfico (*Cinzel* para cabeçalhos e *Outfit* para metadados).
3. **Exibição Dedicada de Metadados e Justificativa:**
   - Badges para Formato (`HQ` / `Mangá`), Match (`XX% Match`), Ano e Número de Edições.
   - Bloco escurecido translúcido em *liquid glass* realçando a justificativa gerada pelo motor.

---

## 3. Matriz de Componentes e Arquivos Alterados

| Componente / Módulo | Caminho do Arquivo | Responsabilidade |
|---|---|---|
| **Comic Schema** | `backend/src/schemas/comic.schema.ts` | Adiciona `type` enum (`all`, `comic`, `manga`) e amplia limite até 40 |
| **Comics Routes** | `backend/src/routes/comics.routes.ts` | Validação de query string e repasse ao serviço de recomendação |
| **Comics Service** | `backend/src/services/comics.service.ts` | Expansão de catálogo popular (31 obras) e filtros anti-junk |
| **Comic Recommendation Service** | `backend/src/services/comic-recommendation.service.ts` | Desduplicação de sementes, interleaving transmídia, expansão por editoras e justificativas ricas |
| **Backend Tests** | `backend/tests/services/comic-recommendation.service.test.ts` e `backend/tests/routes/comics.routes.test.ts` | Testes unitários e de integração de filtros, limites e interleaving |
| **Frontend Hook** | `frontend/src/hooks/useComicRecommendations.ts` | Suporte a parâmetros `{ limit, type }` com cache e recarregamento |
| **Frontend Component** | `frontend/src/components/recommendations/ComicRecommendationRail.tsx` | Abas de filtro, cards responsivos, atalhos TV D-Pad e caixa de motivo |
| **Frontend Tests** | `frontend/tests/components/recommendations/ComicRecommendationRail.test.tsx` | Testes de renderização, alternância de abas e disparos de ação |

---

## 4. Testes Automatizados e Validação
- **Backend:** 194 testes unitários e de integração executados com 100% de aprovação (incluindo testes de interleaving, diversificação de sementes e tipos).
- **Frontend:** Suíte de componentes validada com Vitest e Testing Library com 100% de sucesso.
- **Rigor TypeScript:** Zero uso de `any`, validação estrita com Zod e contratos de interfaces sincronizados.
