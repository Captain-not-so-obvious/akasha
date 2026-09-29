# SPEC-010: Integração de Tendências em Tempo Real da Twitch Helix e Arquitetura Zero-Mock

## 1. Contexto e Motivação
Anteriormente, o serviço `igdb.service.ts` possuía uma lista estática embutida no código (`MOCK_GAMES`) de mais de 200 linhas utilizada como fallback local. Embora houvesse uma proteção para `NODE_ENV === 'production'`, manter dados fixos de catálogo no código-fonte contrariava a arquitetura viva da plataforma, incorrendo no risco de expor itens desatualizados e desprovidos do dinamismo de tendências ao vivo.

A Twitch Helix API disponibiliza o endpoint oficial de tendências em tempo real (`GET /helix/games/top`), fornecendo dados dos jogos mais assistidos e com maior engajamento pela comunidade global. Esta especificação documenta a arquitetura de eliminação de mocks estáticos e a integração direta com as tendências da Twitch Helix.

---

## 2. Decisões Arquiteturais

### 2.1. Arquitetura Zero-Mock em Produção e Código-Fonte
- **Remoção Absoluta de Catálogo Hardcoded:** O arquivo [backend/src/services/igdb.service.ts](file:///d:/Users/Public/codigo/akasha/backend/src/services/igdb.service.ts) não possui mais nenhuma lista hardcoded (`MOCK_GAMES`).
- **Comportamento Resiliente e Seguro:**
  - Em produção (`NODE_ENV === 'production'`), caso as credenciais da Twitch/IGDB estejam ausentes ou as chamadas de rede falhem, o backend responde com coleções vazias (`[]`) ou `null`, registrando erro explícito via `console.error` sem vazar dados fictícios.
  - Testes unitários utilizam mocks de rede e injeção controlada via `vi.fn()` / `globalThis.fetch`, isolando fixtures no escopo dos testes.

### 2.2. Pipeline de Tendências: Twitch Helix + IGDB v4
O fluxo de catálogo de jogos em alta / tendências opera em três etapas:

1. **Obtenção do App Access Token:**
   - Requisição OAuth2 via Client Credentials em `https://id.twitch.tv/oauth2/token` utilizando `TWITCH_CLIENT_ID` e `TWITCH_CLIENT_SECRET`.
   - Token armazenado em cache volátil em memória com expiração controlada (`expires_in`).

2. **Consulta às Tendências ao Vivo (Twitch Helix):**
   - Requisição: `GET https://api.twitch.tv/helix/games/top?first=${limit * 2}` com headers `Client-ID` e `Authorization: Bearer <token>`.
   - **Filtro de Conteúdo Não-Jogo:** Remoção de categorias de streaming que não correspondem a jogos reais (`'Just Chatting'`, `'IRL'`, `'Special Events'`, `'Slots'`, `'Art'`, `'Music'`, etc.).

3. **Enriquecimento de Metadados Oficiais (IGDB v4 Batch):**
   - A Twitch Helix retorna os IDs IGDB associados aos jogos (`igdb_id`).
   - O backend executa consulta em lote ao endpoint `POST https://api.igdb.com/v4/games`:
     ```text
     where id = (id1, id2, ...) & cover != null;
     fields id, name, slug, summary, cover.url, screenshots.url, first_release_date, genres.name, platforms.name, total_rating, involved_companies.company.name, involved_companies.developer, involved_companies.publisher, similar_games;
     ```
   - **Preservação de Ranking:** Os resultados do IGDB são reordenados para respeitar a exata posição de popularidade da Twitch.
   - **Fallback Dinâmico de Alta Disponibilidade:** Caso o IGDB esteja pontualmente indisponível, os cards são construídos com as capas em alta definição fornecidas pela própria Twitch Helix (`box_art_url.replace('{width}x{height}', '600x800')`).

---

## 3. Impacto nas Recomendações e Cold Start
- **Recomendações Personalizadas:** No motor `game-recommendation.service.ts`, quando o usuário não possui jogos catalogados ou com notas positivas (Cold Start), ou quando os candidatos similares forem insuficientes, o algoritmo consome os títulos em alta na Twitch com o selo de justificativa: `"Em alta na Twitch e na comunidade gamer"`.
- **Tela de Busca de Jogos:** Quando o usuário seleciona a aba **Jogos** sem digitar query, o grid exibe a vitrine **"🔥 Tendências na Twitch"**, carregando os jogos mais assistidos do momento.

---

## 4. Garantia de Qualidade e Testes
- **Testes Unitários de Backend (`igdb.service.test.ts`):**
  - Validação de que em produção chamadas sem credenciais ou com erro 500 retornam `[]` ou `null`.
  - Validação de filtragem de não-jogos da Twitch e ordenação idêntica ao rank da Twitch.
  - Validação de busca vazia retornando tendências da Twitch.
- **Conformidade de Tipos:** `npx tsc --noEmit` executado sem erros.
