# 🌿 Akasha — Roadmap de Desenvolvimento

> Guia mestre feature-a-feature. Construído a partir dos documentos `conceito.md`, `arquitetura.md` e `estilo_e_informacoes_adicionais.md`.

---

## Como ler este roadmap

| Símbolo | Significado |
|---|---|
| 🟢 | Feature simples — 1 sessão |
| 🟡 | Feature média — 2-3 sessões |
| 🔴 | Feature complexa — requer planejamento dedicado |
| 🔒 | Bloqueada: depende de outra feature |

---

## FASE 1 — Infraestrutura & Fundação
**Objetivo:** Repositório funcionando, banco configurado, pipelines prontos. Zero código de produto ainda.

| # | Feature | Complexidade | Dependência | Status |
|---|---|---|---|---|
| 1.1 | Inicializar monorepo com `backend/` e `frontend/` | 🟢 | — | **Done** |
| 1.2 | Configurar `backend`: Fastify + TypeScript + `tsconfig.json` | 🟢 | 1.1 | **Done** |
| 1.3 | Configurar `frontend`: Vite + React + TypeScript | 🟢 | 1.1 | **Done** |
| 1.4 | Criar projeto no Supabase (PostgreSQL + Auth OAuth) | 🟢 | — | **Done** |
| 1.5 | Configurar Prisma: `schema.prisma` com modelos `Profile` e `Wishlist` | 🟡 | 1.2, 1.4 | **Done** |
| 1.6 | Rodar primeira migration (`prisma migrate dev --name init`) | 🟢 | 1.5 | **Done** |
| 1.7 | Aplicar políticas RLS no Supabase SQL Editor | 🟢 | 1.6 | **Done** |
| 1.8 | Configurar arquivos `.env.example` (backend e frontend) | 🟢 | 1.5 | **Done** |
| 1.9 | Pipeline CI no GitHub Actions: lint + type-check em PRs | 🟡 | 1.2, 1.3 | **Done** |

---

## FASE 2 — Backend MVP
**Objetivo:** API REST completa, validada, segura e testada.

| # | Feature | Complexidade | Dependência | Status |
|---|---|---|---|---|
| 2.1 | Singleton do `PrismaClient` (`src/lib/prisma.ts`) | 🟢 | Fase 1 | **Done** |
| 2.2 | Schemas Zod: `createWishlistItemSchema` e `updateWishlistItemSchema` | 🟢 | 2.1 | **Done** |
| 2.3 | Middleware de Auth: validar JWT Supabase, injetar `userId` | 🟡 | 2.1 | **Done** |
| 2.4 | Rota `GET /wishlist` — listar itens do usuário | 🟢 | 2.3 | **Done** |
| 2.5 | Rota `POST /wishlist` — adicionar item | 🟢 | 2.3, 2.2 | **Done** |
| 2.6 | Rota `PATCH /wishlist/:id` — atualizar status/nota | 🟢 | 2.3, 2.2 | **Done** |
| 2.7 | Rota `DELETE /wishlist/:id` — remover item | 🟢 | 2.3 | **Done** |
| 2.8 | Serviço TMDB: `fetchMediaDetails()` com tipos TS rígidos | 🟡 | — | **Done** |
| 2.9 | Rota `GET /tmdb/search?q=&type=` — busca de filmes/séries | 🟡 | 2.8 | **Done** |
| 2.10 | Rota `GET /tmdb/:type/:id` — detalhes de uma mídia | 🟢 | 2.8 | **Done** |
| 2.11 | Rota `GET /health` — health check | 🟢 | — | **Done** |
| 2.12 | Testes unitários: schemas Zod (validações de borda) | 🟡 | 2.2 | **Done** |
| 2.13 | Testes de integração: rotas wishlist com mock do Prisma | 🔴 | 2.4–2.7 | **Done** |

---

## FASE 3 — Frontend MVP
**Objetivo:** Interface funcional e visualmente épica, com design system implementado, autenticação real e CRUD da biblioteca funcionando na TV, mobile e desktop.

### 3.1 — Design System & Shell

| # | Feature | Complexidade | Dependência | Status |
|---|---|---|---|---|
| 3.1.1 | Configurar Google Fonts: Cinzel + Outfit via CSS `@import` | 🟢 | Fase 1 | **Done** |
| 3.1.2 | Criar `index.css` com variáveis CSS (paleta completa, tipografia, bordas) | 🟢 | 3.1.1 | **Done** |
| 3.1.3 | Componente `GlassPanel` (`.glass-panel` encapsulado em React) | 🟢 | 3.1.2 | **Done** |
| 3.1.4 | Layout shell: Sidebar/Navbar com navegação (Biblioteca, Busca, Perfil) | 🟡 | 3.1.3 | **Done** |
| 3.1.5 | Lógica D-Pad: `tabIndex={0}` global, estilos `:focus-visible` | 🟡 | 3.1.2 | **Done** |
| 3.1.6 | Responsividade: breakpoints TV (1920px), Desktop (1024px), Mobile (375px) | 🟡 | 3.1.4 | **Done** |

### 3.2 — Autenticação

| # | Feature | Complexidade | Dependência | Status |
|---|---|---|---|---|
| 3.2.1 | Instância Supabase client (`src/lib/supabase.ts`) | 🟢 | Fase 1 | **Done** |
| 3.2.2 | Hook `useAuth`: session, `signInWithGoogle()`, `signOut()` | 🟡 | 3.2.1 | **Done** |
| 3.2.3 | Tela de Login — design épico com logo Akasha + botão Google | 🟡 | 3.2.2, 3.1.3 | **Done** |
| 3.2.4 | Rota protegida: redirecionar para login se não autenticado | 🟢 | 3.2.2 | **Done** |
| 3.2.5 | Hook `getAuthToken()`: injeta Bearer token em todas as chamadas ao backend | 🟢 | 3.2.2 | **Done** |
| 3.2.6 | Testes de componente: tela de login renderiza, botão chama `signIn` | 🟡 | 3.2.3 | **Done** |

### 3.3 — Busca de Mídias

| # | Feature | Complexidade | Dependência | Status |
|---|---|---|---|---|
| 3.3.1 | Hook `useSearch(query, type)`: debounce + chamada `GET /tmdb/search` | 🟡 | 3.2.5, Fase 2 | **Done** |
| 3.3.2 | Componente `SearchBar` com toggle Filmes/Séries | 🟢 | 3.1.2 | **Done** |
| 3.3.3 | Componente `MovieCard`: pôster, título, ano — com foco TV animado | 🟡 | 3.1.3, 3.1.5 | **Done** |
| 3.3.4 | Grid de resultados de busca com estado de loading e vazio | 🟡 | 3.3.2, 3.3.3 | **Done** |
| 3.3.5 | Modal/Drawer de detalhes da mídia (backdrop, sinopse, botão "Adicionar") | 🟡 | 3.3.3 | **Done** |
| 3.3.6 | Provedores de Streaming onde o filme / série está disponível (JustWatch via TMDB) | 🟢 | 3.3.5 | **Done** |

### 3.4 — Biblioteca (Wishlist)

| # | Feature | Complexidade | Dependência | Status |
|---|---|---|---|---|
| 3.4.1 | Hook `useWishlist()`: CRUD completo contra o backend | 🟡 | 3.2.5, Fase 2 | **Done** |
| 3.4.2 | Tela da Biblioteca com 3 abas: **Assistindo / Concluídos / Quero Ver** | 🟡 | 3.4.1, 3.1.4 | **Done** |
| 3.4.3 | Ação "Adicionar à Biblioteca" a partir dos resultados de busca | 🟢 | 3.4.1, 3.3.5 | **Done** |
| 3.4.4 | Componente `StatusBadge`: chip visual com cor por status | 🟢 | 3.1.2 | **Done** |
| 3.4.5 | Ação "Mover para Concluído" com trigger do modal de avaliação | 🟡 | 3.4.1, 3.4.6 | **Done** |
| 3.4.6 | Componente `RatingModal`: 5 estrelas interativas (clicáveis + foco D-Pad) | 🟡 | 3.1.5 | **Done** |
| 3.4.7 | Ação "Remover da Biblioteca" com confirmação | 🟢 | 3.4.1 | **Done** |
| 3.4.8 | Componente `RatingStars`: exibição read-only das estrelas (1–5) | 🟢 | 3.1.2 | **Done** |
| 3.4.9 | Testes de componente: `RatingModal`, `useWishlist` mock de API | 🔴 | 3.4.6, 3.4.1 | **Done** |
| 3.4.10 | Campo opcional de opinião na avaliação com propagação para o feed de atividades (SPEC-005) | 🟡 | 3.4.6, 5.4 | **Done** |

### 3.5 — Página de Perfil

| # | Feature | Complexidade | Dependência | Status |
|---|---|---|---|---|
| 3.5.1 | Tela de Perfil: avatar, username, estatísticas (total, concluídos, nota média) | 🟡 | 3.4.1, 3.2.2 | **Done** |
| 3.5.2 | Botão de logout | 🟢 | 3.2.2 | **Done** |

---

## FASE 4 — Empacotamento Android TV (APK)
**Objetivo:** Transformar o app React em APK funcional para Android TV com Capacitor.

| # | Feature | Complexidade | Dependência | Status |
|---|---|---|---|---|
| 4.1 | Instalar e configurar Capacitor no frontend | 🟡 | Fase 3 | Pendente |
| 4.2 | Gerar assets: `icon.png` (1024x1024) — fundo Floresta Negra + "A" Cinzel | 🟡 | 4.1 | Pendente |
| 4.3 | Gerar `splash.png` — gradiente Oliva + logo centralizado | 🟡 | 4.1 | Pendente |
| 4.4 | Configurar `capacitor.config.ts`: app ID, nome, server URL | 🟢 | 4.1 | Pendente |
| 4.5 | Build `npm run build` + `npx cap sync android` | 🟢 | 4.4 | Pendente |
| 4.6 | Abrir no Android Studio, testar em emulador de Android TV | 🟡 | 4.5 | Pendente |
| 4.7 | Ajustes finais de D-Pad: testar navegação real por controle remoto | 🔴 | 4.6 | Pendente |
| 4.8 | Gerar APK de produção assinado | 🟡 | 4.7 | Pendente |

---

## FASE 5 — Social, Recomendações & Notificações (100% Concluída)
**Objetivo:** Módulos avançados que conectam a experiência individual do acervo à rede social de viajantes e alertas de novos lançamentos.

> 📄 **Spec Social (Amizades Bilaterais & Privacidade):** [`specs/SPEC-002-social-friendship-network.md`](specs/SPEC-002-social-friendship-network.md)  
> 📄 **Spec Feed de Atividades:** [`specs/SPEC-003-activity-feed.md`](specs/SPEC-003-activity-feed.md)  
> 📄 **Spec Avaliação com Opinião/Resenha:** [`specs/SPEC-005-media-opinion-review-feed.md`](specs/SPEC-005-media-opinion-review-feed.md)  
> 📄 **Spec Sincronia Cósmica:** [`specs/SPEC-006-social-library-comparison.md`](specs/SPEC-006-social-library-comparison.md)  
> 📄 **Spec Notificações Multiplataforma & Push:** [`specs/SPEC-007-push-notifications.md`](specs/SPEC-007-push-notifications.md)

| # | Feature | Complexidade | Dependência | Status |
|---|---|---|---|---|
| 5.1 | **Motor de Recomendação ML:** Modelo treinado com histórico + notas do usuário | 🔴 | 3+ meses de dados | Concluído |
| 5.2 | Tela de Recomendações: "Akasha sugere para você" | 🔴 | 5.1 | Concluído |
| 5.3 | **Camada Social:** Sistema de amizades bilateral (solicitação estilo MSN/Friend Code TV) | 🔴 | Fase 3 estável | **Done** |
| 5.3.1 | Ajuste no Perfil: visualização/edição de `@username` e exibição de `Friend Code` seguro | 🟡 | 5.3 | **Done** |
| 5.3.2 | Schema Prisma: model `Friendship` + campos `friendCode` e `email` em `Profile` | 🟡 | 5.3 | **Done** |
| 5.3.3 | Endpoints Fastify: envio de pedido, listagem, aceite/recusa e regeneração de código | 🟢 | 5.3.2 | **Done** |
| 5.3.4 | Tela Social (Web/Mobile & Android TV com D-Pad e atalho QR Code) | 🟡 | 5.3.3 | **Done** |
| 5.3.5 | Personalização de Avatar: upload local com crop/canvas, presets Akasha e restauração OAuth | 🟡 | 5.3.1 | **Done** |
| 5.3.6 | Gestão de Bloqueio & Desbloqueio bilateral de usuários | 🟢 | 5.3 | **Done** |
| 5.4 | **Feed de Atividades:** O que sua rede está assistindo e avaliando | 🔴 | 5.3 | **Done** |
| 5.4.1 | Schema Prisma: model `Activity` e enum `ActivityType` | 🟢 | 5.4 | **Done** |
| 5.4.2 | Ingestão Automática de Eventos no Backend ao alterar Wishlist | 🟡 | 5.4.1 | **Done** |
| 5.4.3 | Endpoint Fastify `GET /feed` paginado com privacidade por amizade | 🟢 | 5.4.2 | **Done** |
| 5.4.4 | Componentes Frontend: `ActivityCard` e `ActivityFeed` (TV D-Pad & Mobile) | 🟡 | 5.4.3 | **Done** |
| 5.5 | **Sincronia Cósmica Universal:** Comparar listas, notas e afinidade com amigos em todos os módulos ([`SPEC-006`](specs/SPEC-006-social-library-comparison.md)) | 🔴 | 5.3 | **Done** |
| 5.5.1 | Algoritmo de Afinidade Cósmica Multidomínio e agregação de acervo no backend (`comparison.service`) | 🟢 | 5.5 | **Done** |
| 5.5.2 | Endpoint Fastify `GET /friends/:id/compare` com suporte a `?domain=` e autorização estrita | 🟢 | 5.5.1 | **Done** |
| 5.5.3 | Hook e Componentes Frontend: `AffinityBadge` com breakdown de módulos, `ComparisonView` (3 abas + seletor de domínios) com TV D-Pad | 🟡 | 5.5.2 | **Done** |
| 5.5.4 | Ações rápidas contextuais ("+ Quero Jogar", "+ Quero Ler", "+ Quero Assistir") e integração fluida na página `/social` | 🟢 | 5.5.3 | **Done** |
| 5.6 | **Central de Notificações & Push:** Novos episódios e avaliações de amigos ([`SPEC-007`](specs/SPEC-007-push-notifications.md)) | 🔴 | 5.3, 5.4 | **Done** |
| 5.6.1 | Schema Prisma: model `Notification`, `PushSubscription` e enum `NotificationType` | 🟢 | 5.6 | **Done** |
| 5.6.2 | Serviços de Backend: persistência, checagem TMDB de episódios e disparos sociais | 🟡 | 5.6.1 | **Done** |
| 5.6.3 | Endpoints Fastify com Zod: listagem, unread-count, marcar lidas e push subscriptions | 🟢 | 5.6.2 | **Done** |
| 5.6.4 | Frontend Universal: Sino com badge na Navbar, `NotificationCenter` (TV D-Pad & Mobile) | 🟡 | 5.6.3 | **Done** |

---

## FASE 6 — Fundação & Modelo Polimórfico Universal (100% Concluída)
> 📄 **Spec Polimórfica & Games:** [`specs/SPEC-008-polymorphic-wishlist-and-games.md`](specs/SPEC-008-polymorphic-wishlist-and-games.md)  
> 📄 **Spec Transmídia Geral:** [`specs/SPEC-001-universal-media-expansion.md`](specs/SPEC-001-universal-media-expansion.md)  
**Objetivo:** Adaptar o banco e backend para suportar Games, Livros e HQs sem quebrar os dados existentes de Cinema/TV.

| # | Feature | Complexidade | Dependência | Status |
|---|---|---|---|---|
| 6.1 | Atualizar `schema.prisma` com enums `DomainType` e `ConsumptionStatus` + campos de metadados | 🟡 | Fase 2 | **Done** |
| 6.2 | Migration sem perda de dados (`prisma migrate dev`) mapeando dados legados do TMDB | 🟡 | 6.1 | **Done** |
| 6.3 | Atualizar schemas Zod de Wishlist para aceitar `domain` e metadados cacheados | 🟢 | 6.1 | **Done** |
| 6.4 | Adaptar rotas `/wishlist` para suportar filtros por domínio (`?domain=...`) | 🟢 | 6.3 | **Done** |
| 6.5 | Testes unitários com Vitest para schemas polimórficos e migração | 🟡 | 6.4 | **Done** |

---

## FASE 7 — Módulo de Jogos (Games)
> 📄 **Specs:** [`specs/SPEC-008-polymorphic-wishlist-and-games.md`](file:///d:/Users/Public/codigo/akasha/specs/SPEC-008-polymorphic-wishlist-and-games.md), [`specs/SPEC-009-auth-resilience-and-game-rating-workflow.md`](file:///d:/Users/Public/codigo/akasha/specs/SPEC-009-auth-resilience-and-game-rating-workflow.md) & [`specs/SPEC-010-twitch-helix-trending-games-and-zero-mock-architecture.md`](file:///d:/Users/Public/codigo/akasha/specs/SPEC-010-twitch-helix-trending-games-and-zero-mock-architecture.md)  
**Objetivo:** Ingestão de jogos via IGDB, motor de recomendação por jogabilidade e interface na TV/Web.

| # | Feature | Complexidade | Dependência | Status |
|---|---|---|---|---|
| 7.1 | Serviço IGDB (`igdb.service.ts`) com autenticação Twitch OAuth e tipagem estrita | 🟡 | Fase 6 | **Done** |
| 7.2 | Rotas Fastify: `GET /games/search` e `GET /games/:id` | 🟢 | 7.1 | **Done** |
| 7.3 | Motor de Recomendação de Jogos baseado em ponderação de notas e `similar_games` da IGDB | 🔴 | 7.1, Fase 6 | **Done** |
| 7.4 | Componente `GameCard` com badges de plataforma, busca universal e foco D-Pad para TV | 🟡 | 7.2 | **Done** |
| 7.5 | Tela da Biblioteca com abas Jogando/Quero Jogar/Zerados e Rail de Recomendação de Jogos | 🟡 | 7.3, 7.4 | **Done** |
| 7.6 | Testes unitários e de componente para módulo de Jogos | 🟡 | 7.5 | **Done** |
| 7.7 | Resiliência de autenticação e fluxo de avaliação de jogos na busca (`RatingModal` em "Já Zerei") | 🟢 | 7.5 | **Done** |
| 7.8 | Tendências em tempo real da Twitch Helix API e arquitetura Zero-Mock (sem catálogo estático em prod) | 🟢 | 7.1, 7.3 | **Done** |

---

## FASE 8 — Módulo de Livros (Books) (100% Concluída)
> 📄 **Specs:** [`specs/SPEC-011-books-module-and-reading-shelf.md`](specs/SPEC-011-books-module-and-reading-shelf.md) & [`specs/SPEC-001-universal-media-expansion.md`](specs/SPEC-001-universal-media-expansion.md)  
**Objetivo:** Ingestão de livros via Google Books, controle de páginas e recomendações literárias.

| # | Feature | Complexidade | Dependência | Status |
|---|---|---|---|---|
| 8.1 | Serviço Google Books (`books.service.ts`) com busca em pt-BR e ISBN | 🟡 | Fase 6 | **Done** |
| 8.2 | Rotas Fastify: `GET /books/search` e `GET /books/:id` | 🟢 | 8.1 | **Done** |
| 8.3 | Motor de Recomendação de Livros por autor e assuntos/gêneros literários | 🔴 | 8.1, Fase 6 | **Done** |
| 8.4 | Componente `BookCard` com proporção de capa editorial e foco D-Pad para TV | 🟡 | 8.2 | **Done** |
| 8.5 | Tela de Busca e Rails de Leituras Recomendadas no Frontend | 🟡 | 8.3, 8.4 | **Done** |
| 8.6 | Testes unitários e de componente para módulo de Livros | 🟡 | 8.5 | **Done** |
| 8.7 | Delight UX: `ThematicLoader` com frases temáticas e spinner em toda a biblioteca ([`SPEC-012`](specs/SPEC-012-thematic-loading-and-delight-ux.md)) | 🟢 | 8.5 | **Done** |
| 8.8 | Ações Unificadas Mobile e Multiplataforma: começar a assistir/jogar/ler, concluir, avaliar e remover no mesmo local ([`SPEC-013`](specs/SPEC-013-unified-mobile-actions.md)) | 🟡 | 8.5, 7.5 | **Done** |
| 8.9 | Separação Canônica entre Motivos de Recomendação (ML) e Sinopse da Obra ([`SPEC-014`](specs/SPEC-014-separation-of-recommendation-reason-and-synopsis.md)) | 🟢 | 8.8 | **Done** |

---

## FASE 9 — Módulo de Quadrinhos (Comics & Mangás) (100% Concluída)
> 📄 **Specs:** [`specs/SPEC-015-comics-and-manga-module.md`](specs/SPEC-015-comics-and-manga-module.md) & [`specs/SPEC-001-universal-media-expansion.md`](specs/SPEC-001-universal-media-expansion.md)  
**Objetivo:** Ingestão de HQs e Mangás (Comic Vine + AniList) no nível de Saga/Volume completo com rastreio de edições, motor de recomendação especializado e interface universal (TV, Mobile e Desktop).

| # | Feature | Complexidade | Dependência | Status |
|---|---|---|---|---|
| 9.1 | Ingestão Híbrida: Comic Vine REST (HQs ocidentais/sagas) e AniList GraphQL (Mangás/Manhwas) com tipagem estrita e catálogo cold-start | 🔴 | Fase 6 | **Done** |
| 9.2 | Rotas Fastify com Zod: `GET /comics/search`, `GET /comics/popular`, `GET /comics/recommendations` e `GET /comics/:id` | 🟢 | 9.1 | **Done** |
| 9.3 | Motor de Recomendação de Quadrinhos (afinidade por criadores, roteiristas, desenhistas, editoras e gêneros) | 🔴 | 9.1, Fase 6 | **Done** |
| 9.4 | Componente `ComicCard` com proporção editorial, badges de tipo/saga e foco Android TV (`tabIndex={0}`) | 🟡 | 9.2 | **Done** |
| 9.5 | Interface Universal no Frontend: Busca integrada, aba na Biblioteca, `ComicRecommendationRail` e `ComicDetailsModal` com toggle sanfona para enumerar edições/volumes da saga | 🟡 | 9.3, 9.4 | **Done** |
| 9.6 | Cobertura total de testes unitários e de integração (backend e frontend com Vitest) | 🟡 | 9.5 | **Done** |
| 9.7 | Motor Inteligente de Recomendações de Quadrinhos e Mangás: desduplicação de sementes por radical (`extractSeriesCore`), expansão por editoras favoritas, catálogo de 31 obras canônicas, interleaving transmídia, abas de filtro (`Todos`, `Quadrinhos`, `Mangás`) e justificativas dinâmicas ([`SPEC-016`](specs/SPEC-016-enhanced-comic-recommendation-engine.md)) | 🔴 | 9.3, 9.5 | **Done** |

---

## FASE 10 — O Grande Acervo Transmídia & MCP Universal (100% Concluída)
> 📄 **Specs:** [`specs/SPEC-017-transmedia-engine-and-grand-archive-dashboard.md`](specs/SPEC-017-transmedia-engine-and-grand-archive-dashboard.md) & [`specs/SPEC-019-grand-archive-modal-rating-and-library-integration.md`](specs/SPEC-019-grand-archive-modal-rating-and-library-integration.md)  
**Objetivo:** Conexão cruzada entre franquias (filme <-> livro <-> jogo <-> quadrinho), central analítica universal e suporte total ao assistente agêntico MCP.

| # | Feature | Complexidade | Dependência | Status |
|---|---|---|---|---|
| 10.1 | **Motor Transmídia:** Descoberta de pontes e obras relacionadas entre diferentes mídias a partir de IPs e franquias canônicas | 🔴 | Fases 7, 8, 9 | **Done** |
| 10.2 | **Dashboard do Grande Acervo:** Métricas consolidadas de consumo cultural (horas de tela, jogos, páginas, volumes e Índice de Amplitude Akasha) | 🟡 | Fases 7, 8, 9 | **Done** |
| 10.3 | **Tools MCP Fastify Universais:** Atualização para aceitar parâmetro `domain` e novas rotas analíticas | 🟡 | Fase 6 | **Done** |
| 10.4 | **Testes de Integração e Ponta a Ponta:** Cobertura completa no backend (221 testes) e frontend (203 testes) | 🔴 | 10.1–10.3 | **Done** |
| 10.5 | **Integração de Avaliação e Sincronização de Biblioteca nos Modais do Grande Acervo:** Abertura do `RatingModal` ao concluir obras sugeridas ("Já Assisti", "Já Zerei", "Já Li"), sincronização em tempo real com `useWishlist` e ciclo completo de gerenciamento ([`SPEC-019`](specs/SPEC-019-grand-archive-modal-rating-and-library-integration.md)) | 🟡 | 10.1, 10.2 | **Done** |

---

## FASE 11 — Sincronia Cósmica Universal & Ressonância Multidomínio (100% Concluída)
> 📄 **Spec:** [`specs/SPEC-006-social-library-comparison.md`](specs/SPEC-006-social-library-comparison.md) (v2.0.0)  
**Objetivo:** Expansão da Sincronia Cósmica para abranger a totalidade dos módulos do Akasha (Cinema, TV, Games, Livros, Quadrinhos & Mangás), com cálculo de afinidade global e desagregada por domínio, seletor de módulos interativo, cards com badges temáticos e ações rápidas semânticas por mídia.

| # | Feature | Complexidade | Dependência | Status |
|---|---|---|---|---|
| 11.1 | **Algoritmo Multidomínio:** Cruzamento polimórfico de acervos (`domain` + `externalId`), Resonance Score global e cálculo de `domainAffinities` | 🔴 | Fases 7, 8, 9 | **Done** |
| 11.2 | **Endpoint Fastify Enriquecido:** Suporte a `GET /friends/:id/compare?domain=` com validação Zod e autorização bilateral | 🟢 | 11.1 | **Done** |
| 11.3 | **Seletor de Módulos & Badges Temáticos:** Interface `ComparisonView` com filtros para Cinema/TV, Jogos, Livros e Quadrinhos | 🟡 | 11.2 | **Done** |
| 11.4 | **Ações Semânticas Contextuais:** Botões rápidos de adição ao backlog com verbos por mídia ("+ Quero Jogar", "+ Quero Ler", "+ Quero Assistir") integrados ao `POST /wishlist` polimórfico | 🟢 | 11.3 | **Done** |
| 11.5 | **Cobertura de Testes Automatizados:** Testes unitários e de integração no backend (225 testes) e frontend (204 testes) com Vitest | 🔴 | 11.1–11.4 | **Done** |


