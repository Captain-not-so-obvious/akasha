# SPEC-021: Blindagem de Segurança da Aplicação e Proteção de APIs (Security Hardening)

| Metadado | Detalhe |
| :--- | :--- |
| **Status** | Implementado & Validado (100% Concluído) |
| **Versão** | 1.0.0 |
| **Data** | 2026-10-13 |
| **Autor** | Engenharia de Software & Arquitetura Akasha |
| **Alvos** | `backend/src/server.ts`, `backend/src/services/igdb.service.ts`, `backend/src/routes/games.routes.ts`, `backend/src/routes/tmdb.routes.ts`, `backend/src/routes/books.routes.ts`, `backend/src/routes/comics.routes.ts`, `backend/src/routes/oauth.routes.ts`, `backend/src/routes/mcp.routes.ts`, `backend/src/middlewares/auth.middleware.ts`, `frontend/src/utils/safeRedirect.ts`, `frontend/src/pages/Login.tsx`, `backend/tests/security/security-hardening.test.ts`, `frontend/tests/utils/safeRedirect.test.ts` |

---

## 1. Visão Geral e Contexto

O **Akasha** opera como repositório transmídia de entretenimento digital e expõe endpoints públicos, privados e conexões de agentes de IA via Model Context Protocol (MCP).

Para blindar o ecossistema contra ataques cibernéticos em ambiente produtivo, foi realizada uma auditoria integral de segurança seguida pela implementação de defesas ativas em sete camadas críticas:
1. Injeção de queries em dialetos externos (Apicalypse).
2. Ausência de cabeçalhos de segurança HTTP e vulnerabilidade a Clickjacking.
3. Riscos de DoS e esgotamento de cotas de APIs externas por ausência de Rate Limiting.
4. Falsificação de requisições cross-site (CSRF) em formulários de autorização com cookies `SameSite=None`.
5. Falha na validação Zod de parâmetros de rota dinâmicos (`:id`).
6. Redirecionamento aberto (Open Redirect) no fluxo de login SPA.
7. Envenenamento de cabeçalho de host (Host Header Poisoning) e tráfego de credenciais em query string.

---

## 2. Decisões Arquiteturais e Engenharia de Solução

### 2.1 Blindagem contra Injeção de Apicalypse no IGDB
* **Vulnerabilidade Prévia:** Em `fetchGameDetails`, o parâmetro `gameId` era concatenado diretamente na cláusula `where id = ${gameId};` sem validação de tipo numérico. Na busca textual, aspas duplas eram removidas, mas caracteres de controle do dialeto Apicalypse (ponto-e-vírgula e quebras de linha) permaneciam desprotegidos.
* **Solução:**
  - `backend/src/schemas/game.schema.ts`: Criação do schema `gameParamSchema` que exige formato estritamente numérico (`/^\d+$/`).
  - `backend/src/services/igdb.service.ts`: Validação de segurança em tempo de execução rejeitando imediatamente qualquer identificador não numérico antes de montar a query.
  - Sanitização de strings de busca em `searchGames` removendo aspas, ponto-e-vírgula e quebras de linha (`/["';\r\n\\]/g`).

### 2.2 Cabeçalhos HTTP Defensivos e Anti-Clickjacking (`@fastify/helmet`)
* **Vulnerabilidade Prévia:** O servidor não emitia cabeçalhos defensivos básicos do navegador, permitindo que a tela de autorização OAuth do MCP fosse embutida em `<iframe>` transparente por terceiros.
* **Solução:**
  - Instalação e registro do plugin `@fastify/helmet`.
  - Configuração de `frameguard: { action: 'deny' }` (`X-Frame-Options: DENY`).
  - Configuração de `Content-Security-Policy` estrita com `frame-ancestors 'none'`, impedindo qualquer renderização embutida em páginas externas.
  - Ativação de `X-Content-Type-Options: nosniff`.

### 2.3 Rate Limiting Global e Defesa contra Quota Exhaustion (`@fastify/rate-limit`)
* **Vulnerabilidade Prévia:** Ausência de limitação de requisições por IP, expondo cotas de APIs externas (TMDB, Twitch Helix, Google Books, AniList) a ataques de negação de serviço e consumo abusivo. Simultaneamente, o carregamento da biblioteca no frontend executava chamadas N+1 em paralelo para cada item de cinema, consumindo desnecessariamente cotas.
* **Solução:**
  - Instalação e registro do plugin `@fastify/rate-limit`.
  - Limite global defensivo calibrado para tráfego legítimo de SPA (600 req/min em produção configurável via `RATE_LIMIT_MAX`, e 3000 req/min em desenvolvimento).
  - Allowlist com bypass seguro para health checks do Render (`/health`) e requisições de loopback local (`127.0.0.1`, `::1`) em desenvolvimento.
  - Resposta padronizada RFC com código HTTP `429 Too Many Requests` e tempo de espera `ttl`.
  - Otimização em `frontend/src/hooks/useWishlist.ts`: Utilização imediata dos metadados já persistidos no banco de dados (`title`, `coverUrl`, `releaseYear`), eliminando dezenas de requisições paralelas a `/tmdb/:type/:id` na montagem da tela, mantendo o fetch completo sob demanda exclusivamente ao abrir o modal de detalhes.

### 2.4 Proteção Anti-CSRF no Formulário Server-Side de Autorização OAuth
* **Vulnerabilidade Prévia:** Devido à configuração `SameSite=None` dos cookies em produção para permitir autenticação cross-domain entre Vercel e Render, um formulário HTML `<form method="POST" action="/oauth/authorize">` poderia ser disparado de sites de terceiros sem checagem de origem.
* **Solução:**
  - No `GET /oauth/authorize`, geração de um token criptográfico efêmero (`csrfToken = crypto.randomUUID()`) armazenado em cookie HttpOnly com política `SameSite=Lax` e tempo de expiração de 10 minutos.
  - Injeção de campo oculto `<input type="hidden" name="csrf_token" value="...">` no HTML renderizado.
  - No `POST /oauth/authorize`, validação estrita da igualdade entre o token do cookie e o campo do formulário, rejeitando submissões divergentes com `HTTP 403 Forbidden` (`csrf_validation_failed`).

### 2.5 Validação Zod Estrita em Parâmetros de Rota (Diretriz 4)
* **Vulnerabilidade Prévia:** Rotas de catálogo cultural (`/tmdb/:type/:id`, `/games/:id`, `/books/:id`, `/comics/:id`) recebiam identificadores tipados apenas em TypeScript, permitindo valores como `NaN` e strings inválidas.
* **Solução:**
  - Criação de `backend/src/schemas/tmdb.schema.ts` (`searchMediaQuerystringSchema`, `mediaDetailsParamSchema`).
  - Criação de `bookParamSchema` em `book.schema.ts`.
  - Aplicação ativa de `comicIdParamSchema` em `comics.routes.ts`.
  - Rejeição imediata com `HTTP 400 Bad Request` em caso de falha de validação antes de invocar serviços ou bancos.

### 2.6 Prevenção de Redirecionamento Aberto (Open Redirect) no Frontend
* **Vulnerabilidade Prévia:** Em `Login.tsx`, o parâmetro de query `returnTo` era utilizado em redirecionamentos após autenticação sem conferir se apontava para esquemas absolutos ou domínios arbitrários.
* **Solução:**
  - Criação de `frontend/src/utils/safeRedirect.ts` com o método `isSafeRelativePath`.
  - Bloqueio de caminhos que contenham esquemas de protocolo (`http:`, `https:`, `javascript:`, `data:`) ou barras duplas (`//evil.com`).
  - Fallback automático e seguro para a raiz `/` em caso de URL maliciosa.

### 2.7 Mitigação de Host Header Poisoning, Eliminação de URLs Hardcoded e Exposição de Tokens
* **Vulnerabilidade Prévia:** O domínio do Render (`akasha-backend.onrender.com`) estava chumbado diretamente em múltiplos arquivos (`oauth.routes.ts`, `server.ts`, `mcp.routes.ts`, `auth.middleware.ts`, `OAuthAuthorize.tsx`) como fallback de host, violando a separação de ambientes (12-Factor App) e expondo a infraestrutura.
* **Solução:**
  - Criação do módulo utilitário centralizado `backend/src/lib/baseUrl.ts`.
  - Prioridade máxima concedida a `process.env.BACKEND_URL` (sem barras no final).
  - Inspeção dinâmica de `request.headers.host` com validação estrita contra injeções (`/^[a-zA-Z0-9.:-]+$/`).
  - Fallback padrão agnóstico e seguro para `http://localhost:${PORT || 3000}`, eliminando qualquer menção chumbada a provedores externos na base de código.
  - Registro de `BACKEND_URL=http://localhost:3000` em `backend/.env.example`.
  - Registro de log com nível `warn` quando tokens são enviados via query string (`?token=`), orientando a migração para `Authorization: Bearer <token>`.

---

## 3. Compatibilidade Universal e Responsividade (TV, Celular e Desktop)

* **Android TV (D-Pad):** As respostas de erro estruturadas e as telas de consentimento do OAuth preservam `tabIndex={0}` nos botões de ação e campos interativos, mantendo navegação por controle remoto totalmente íntegra.
* **Mobile / Desktop:** As proteções de cabeçalho (Helmet) e Rate Limiting operam de forma transparente sem degradar a latência da experiência em conexões móveis (4G/5G).

---

## 4. Testes Automatizados e Critérios de Aceite

* **Backend:** `backend/tests/security/security-hardening.test.ts` (9 testes)
  - Validação de cabeçalhos de segurança (`X-Frame-Options`, CSP frame-ancestors, nosniff).
  - Bloqueio de injeção de Apicalypse em `fetchGameDetails` e `/games/:id`.
  - Validação Zod em `/tmdb/:type/:id` e `/tmdb/search`.
  - Emissão e validação de token anti-CSRF no `/oauth/authorize`.
* **Frontend:** `frontend/tests/utils/safeRedirect.test.ts` (7 testes)
  - Validação de URLs relativas permitidas e bloqueio de ataques com esquemas `javascript:`, `data:` e `//`.
* **Regressão:** Total de 490 testes automatizados passando (263 no backend e 227 no frontend).
