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
| 3.3.5 | Modal/Drawer de detalhes da mídia (backdrop, sinopse, botão "Adicionar") | 🟡 | 3.3.3 | Pendente |

### 3.4 — Biblioteca (Wishlist)

| # | Feature | Complexidade | Dependência | Status |
|---|---|---|---|---|
| 3.4.1 | Hook `useWishlist()`: CRUD completo contra o backend | 🟡 | 3.2.5, Fase 2 | Pendente |
| 3.4.2 | Tela da Biblioteca com 3 abas: **Assistindo / Concluídos / Quero Ver** | 🟡 | 3.4.1, 3.1.4 | Pendente |
| 3.4.3 | Ação "Adicionar à Biblioteca" a partir dos resultados de busca | 🟢 | 3.4.1, 3.3.5 | Pendente |
| 3.4.4 | Componente `StatusBadge`: chip visual com cor por status | 🟢 | 3.1.2 | Pendente |
| 3.4.5 | Ação "Mover para Concluído" com trigger do modal de avaliação | 🟡 | 3.4.1, 3.4.6 | Pendente |
| 3.4.6 | Componente `RatingModal`: 5 estrelas interativas (clicáveis + foco D-Pad) | 🟡 | 3.1.5 | Pendente |
| 3.4.7 | Ação "Remover da Biblioteca" com confirmação | 🟢 | 3.4.1 | Pendente |
| 3.4.8 | Componente `RatingStars`: exibição read-only das estrelas (1–5) | 🟢 | 3.1.2 | Pendente |
| 3.4.9 | Testes de componente: `RatingModal`, `useWishlist` mock de API | 🔴 | 3.4.6, 3.4.1 | Pendente |

### 3.5 — Página de Perfil

| # | Feature | Complexidade | Dependência | Status |
|---|---|---|---|---|
| 3.5.1 | Tela de Perfil: avatar, username, estatísticas (total, concluídos, nota média) | 🟡 | 3.4.1, 3.2.2 | Pendente |
| 3.5.2 | Botão de logout | 🟢 | 3.2.2 | Pendente |

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

## FASE 5 — Futuro (Pós-MVP)
**Objetivo:** Módulos avançados que exigem o histórico real de uso gerado nas fases anteriores.

| # | Feature | Complexidade | Dependência | Status |
|---|---|---|---|---|
| 5.1 | **Motor de Recomendação ML:** Modelo treinado com histórico + notas do usuário | 🔴 | 3+ meses de dados | Pendente |
| 5.2 | Tela de Recomendações: "Akasha sugere para você" | 🔴 | 5.1 | Pendente |
| 5.3 | **Camada Social:** Sistema de amizades (seguir/ser seguido) | 🔴 | Fase 3 estável | Pendente |
| 5.4 | Feed de Atividades: o que a sua rede está assistindo | 🔴 | 5.3 | Pendente |
| 5.5 | Comparar listas e avaliações com amigos | 🔴 | 5.3 | Pendente |
| 5.6 | Notificações push (novo episódio, amigo avaliou algo) | 🔴 | 5.3, 5.4 | Pendente |
