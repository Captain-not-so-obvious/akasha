# SPEC-020: Arquitetura de Conformidade com a LGPD e Governança de Dados Pessoais

| Metadado | Detalhe |
| :--- | :--- |
| **Status** | Implementado & Validado (100% Concluído) |
| **Versão** | 1.0.0 |
| **Data** | 2026-10-09 |
| **Autor** | Engenharia de Software & Arquitetura Akasha |
| **Controlador** | Fillipe Moreira (`fillipemoreira979@gmail.com`) |
| **Alvos** | `backend/src/lib/mcpToken.ts`, `backend/src/lib/oauthValidator.ts`, `backend/src/lib/legalVersions.ts`, `backend/src/services/privacy.service.ts`, `backend/src/services/retention.service.ts`, `backend/src/routes/privacy.routes.ts`, `backend/src/routes/mcp.routes.ts`, `backend/src/routes/oauth.routes.ts`, `frontend/src/components/privacy/*`, `frontend/src/pages/PrivacyPolicy.tsx`, `frontend/src/pages/TermsOfUse.tsx` |

---

## 1. Visão Geral e Contexto

O **Akasha** é um repositório inteligente e imersivo de entretenimento digital que cataloga filmes, séries, livros, games e quadrinhos, além de conectar assistentes de Inteligência Artificial via Model Context Protocol (MCP).

Para operar em estrita conformidade com a **Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD)** em ambiente de produção com usuários ativos, a arquitetura foi blindada em todos os seus eixos: segurança da informação, consentimento granular, exercício autônomo dos direitos do titular (Art. 18), governança de retenção de dados e conformidade com transferência internacional (Art. 33).

---

## 2. Decisões Arquiteturais e Engenharia de Solução

### 2.1 Fase 0: Criptografia e Blindagem do Protocolo MCP & OAuth 2.0
* **Eliminação de Tokens Inseguros:** Tokens de IA não utilizam mais decodificação sem assinatura (`jwt.decode`). Foi introduzido o módulo `backend/src/lib/mcpToken.ts`, com assinatura criptográfica `HS256`, validação de `jwtid` atrelado a um registro ativo na tabela `mcp_grants` e expiração máxima de 30 dias.
* **Revogabilidade Imediata:** Se uma concessão for revogada pelo usuário ou expirar, qualquer requisição SSE/MCP é rejeitada imediatamente (`HTTP 401`).
* **Proteção contra Redirecionamento Aberto (Open Redirect):** Validação estrita de `redirect_uri` em `backend/src/lib/oauthValidator.ts` contra uma allowlist configurável (`MCP_ALLOWED_REDIRECT_URIS`) e origens conhecidas (Claude, Google Spark e web app).
* **Sanitização de Logs e Prevenção de Vazamento:** Logger Pino configurado com serializers sanitizados (`backend/src/lib/sanitizeUrl.ts`), mascarando tokens e query strings sensíveis como `[REDACTED]`.
* **Fim de Sessões Fantasma / Impersonação:** Bloqueio categórico de sessões anônimas (`guest`) nas rotas do MCP e eliminação de autenticação por input arbitrário de username no fluxo OAuth.

### 2.2 Fase 1: Extensão do Esquema de Dados (Prisma & PostgreSQL)
* **Modelos Adicionados no Schema:**
  - `McpGrant`: Registro auditável de autorizações de agentes de IA (`userId`, `clientId`, `jti`, `expiresAt`, `revokedAt`).
  - `ConsentRecord`: Trilhas auditáveis de consentimento com versão do documento aceito (`userId`, `documentType`, `version`, `acceptedAt`, `ipHash`, `userAgent`).
* **Novas Preferências de Privacidade no `Profile`:**
  - `activityVisibility`: Enum (`friends` ou `private`), definindo se resenhas e notas entram no feed social.
  - `discoverableByEmail`: Booleano (padrão `false` - Privacy by Default), controlando se amigos podem buscar o perfil pelo e-mail.
* **Segurança do Fluxo OAuth:** Modelo `OAuthCode` estendido com `code_challenge` (PKCE S256) e `scope`.

### 2.3 Fase 2: Direitos do Titular (Art. 18 da LGPD)
* **Portabilidade de Dados (Art. 18, II e V):**
  - Endpoint `GET /privacy/export` gera um dump estruturado em formato JSON com perfil, acervo cultural, avaliações, resenhas, amizades ativas, histórico de consentimentos e concessões MCP ativas.
* **Direito à Eliminação Definitiva (Art. 18, VI):**
  - Endpoint `DELETE /privacy/account` implementa o *Hard Delete* em cascata (`onDelete: Cascade`), expurgando instantaneamente listas, avaliações, notificações, conexões sociais, registros de consentimento e tokens MCP, seguido de desconexão da sessão do usuário.
* **Revogação de Acesso a Terceiros (Art. 18, IX):**
  - Endpoint `POST /privacy/connections/:id/revoke` revoga imediatamente a concessão do agente de IA.
* **Versionamento de Termos e Consentimento:**
  - `CURRENT_TERMS_VERSION = "1.0.0"` e `CURRENT_PRIVACY_VERSION = "1.0.0"`.
  - Endpoint `GET /privacy/consent/pending` consulta se o usuário já aceitou a versão em vigor.
  - Endpoint `POST /privacy/consent` registra o aceite formal de forma irreversível.

### 2.4 Fase 3: Minimização de Dados e Privacidade por Padrão (Art. 6º, III e 20)
* **Feed de Atividades:** O serviço `activity.service.ts` omite do feed social quaisquer atualizações geradas por usuários que configuraram `activityVisibility = 'private'`.
* **Notificações Sociais:** O serviço `notification.service.ts` não dispara push notifications para amigos se a ação tiver sido realizada por um perfil com visibilidade privada.
* **Busca Social:** Em `friends.routes.ts`, buscas por endereço de e-mail só retornam resultados se o usuário-alvo tiver explicitamente habilitado `discoverableByEmail = true`.

### 2.5 Fase 4: Retenção, Descarte e Governança de Dados
* **Expurgo Automatizado (`backend/src/services/retention.service.ts`):**
  - Execução periódica a cada 24 horas:
    - Códigos de autorização efêmeros (`OAuthCode`) com mais de 24 horas são deletados.
    - Notificações de leitura confirmada com mais de 90 dias são expurgadas.
    - Concessões MCP revogadas com mais de 30 dias são eliminadas do banco.
* **Documentação de Governança Obrigatória:**
  - `docs/lgpd/ropa.md`: Registro formal das Operações de Tratamento de Dados (ROPA / Art. 37 da LGPD).
  - `docs/lgpd/plano-resposta-incidentes.md`: Procedimento Operacional Padrão para detecção, contenção, investigação e notificação à ANPD em até 3 dias úteis (Art. 48 e Resolução CD/ANPD nº 15/2024).

### 2.6 Fase 5: Experiência do Usuário (Frontend)
* **`ConsentGate.tsx`:** Modal bloqueante que intercepta qualquer usuário autenticado com versões pendentes de termos ou política, exigindo concordância explícita antes de liberar a aplicação.
* **`PrivacySettingsPanel.tsx`:** Painel integrado à tela de Perfil (`/profile`) permitindo alterar visibilidade social, alternar busca por e-mail, visualizar/revogar agentes de IA, baixar dados em JSON e acionar a exclusão definitiva da conta.
* **Páginas Legais Públicas:**
  - `/privacidade` (`PrivacyPolicy.tsx`): Detalha controlador (Fillipe Moreira), canal de atendimento (`fillipemoreira979@gmail.com`), bases legais, transferência internacional para servidores Supabase nos EUA (Oregon / *us-west-2*) via Art. 33, IX e direitos do titular.
  - `/termos` (`TermsOfUse.tsx`): Contrato de uso e regras de conduta.
* **Tela de Login (`Login.tsx`):** Links para Termos e Política de Privacidade adicionados ao rodapé de autenticação.

---

## 3. Acessibilidade e Diretrizes Multiplataforma

* **Android TV (D-Pad & Controle Remoto):**
  - Todos os elementos interativos possuem `tabIndex={0}` e classe visual de alto contraste `tv-focus-glow`.
  - **Prevenção de Exclusão Acidental:** Ao abrir o modal de exclusão de conta em `PrivacySettingsPanel`, um `useEffect` foca imediatamente no botão *"Cancelar e Manter Minha Conta"*, impedindo que um pressionamento inadvertido do botão Enter/OK no controle remoto da TV acione o *Hard Delete*.
* **Mobile (Touch):**
  - Todos os seletores, botões e checkboxes possuem área de toque generosa (mínimo de 44px de altura) com espaçamento otimizado para evitar acionamentos falsos em telas sensíveis ao toque.
* **Desktop:**
  - Layout em grid flexível com estética Liquid Glass (paleta terrosa do Akasha e vidro fosco `backdrop-blur-md`).

---

## 4. Cobertura de Testes Automatizados

* **Backend (253 testes):** Cobertura de schemas Zod, rotas privadas com token Supabase, exportação em JSON, expurgo com cascata, revogação de tokens MCP, validação de redirect URIs, PKCE S256 e sanitização de logs.
* **Frontend:** Cobertura de `ConsentGate.test.tsx`, `PrivacySettingsPanel.test.tsx`, `PrivacyPolicy.test.tsx`, `TermsOfUse.test.tsx` e `Login.test.tsx`, validando estados de carregamento, interações de consentimento, chamadas de API e foco de acessibilidade.
