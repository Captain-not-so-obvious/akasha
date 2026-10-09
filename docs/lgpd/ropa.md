# Registro de Operações de Tratamento de Dados Pessoais (ROPA) — Akasha
*Em conformidade com o Artigo 37 da Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD)*

## 1. Identificação do Controlador
- **Controlador:** Fillipe Moreira (Projeto Akasha)
- **Canal de Atendimento do Titular / Encarregado:** `fillipemoreira979@gmail.com`
- **Enquadramento Regulatório:** Agente de tratamento de pequeno porte (Resolução CD/ANPD nº 2/2022).

---

## 2. Inventário de Operações de Tratamento

| # | Operação / Finalidade | Categoria de Titulares | Dados Pessoais Tratados | Base Legal (LGPD) | Compartilhamento / Operadores | Prazo de Retenção |
|---|---|---|---|---|---|---|
| **01** | **Autenticação e Gestão de Contas**<br>Permitir acesso seguro à plataforma via Google OAuth. | Usuários cadastrados (viajantes) | E-mail, nome, URL do avatar, identificador UUID único. | **Art. 7º, V**<br>(Execução de contrato / prestação do serviço) | Supabase Inc. (Auth & Postgres — Oregon, EUA), Google LLC (OAuth). | Enquanto a conta estiver ativa. Exclusão imediata sob requisição do titular (**Art. 18, VI**). |
| **02** | **Gestão de Acervo e Backlog Cultural (Wishlist)**<br>Registrar obras consumidas, notas (1 a 5 estrelas) e anotações. | Usuários cadastrados | IDs de mídias externas, notas, status de consumo, resenhas textuais. | **Art. 7º, V**<br>(Execução de contrato) | Supabase Inc. (banco de dados relacional). APIs de catálogo (TMDB, IGDB, Google Books, AniList, Comic Vine) recebem apenas termos de busca agnósticos. | Enquanto a conta estiver ativa. Exclusão em cascata junto à conta do usuário. |
| **03** | **Motor de Recomendações e Perfilamento Cultural**<br>Inferir afinidade temática, de criadores e franquias para sugerir obras. | Usuários cadastrados | Histórico de notas, mídias concluídas e abandonadas, gêneros favoritos. | **Art. 7º, IX**<br>(Legítimo interesse — teste LIA aprovado) c/c **Art. 20** (Transparência de perfilamento). | Execução local no backend do Akasha. Nenhum dado pessoal é transmitido para motores de ML de terceiros. | Enquanto a conta estiver ativa. Usuário pode optar por manter o perfil privado. |
| **04** | **Rede Social e Sincronia Cósmica**<br>Feed de atividades, cálculo de ressonância de acervos e solicitações de amizade. | Usuários que estabeleceram amizade bilateral | Username público, avatar, código de amigo (*Friend Code*), notas e resenhas compartilhadas. | **Art. 7º, V**<br>(Execução de contrato com controle estrito do titular) | Amigos confirmados no Akasha. Usuário pode configurar `activityVisibility = 'private'` e `discoverableByEmail = false`. | Enquanto durar a amizade ou a conta do usuário. |
| **05** | **Conexão Agêntica com IAs via MCP (Model Context Protocol)**<br>Permitir que agentes LLM autorizados (Google Spark, Claude) interajam com o acervo. | Usuários que autorizarem via fluxo OAuth 2.0 | Concessão de acesso (`McpGrant`), escopos de leitura/escrita, histórico de consultas via tools. | **Art. 7º, I**<br>(Consentimento específico e revogável a qualquer momento — **Art. 8º §5**). | Provedor do agente de IA configurado pelo usuário. Tokens emitidos com validade máxima de 30 dias. | Revogação instantânea pelo painel de Privacidade; expurgo definitivo de concessões revogadas após 30 dias. |
| **06** | **Notificações Push e Avisos de Sistema**<br>Alertas de novos episódios de séries e atividades de amigos. | Usuários que ativaram push no navegador/app | Endpoint de push, chave pública p256dh, auth secret. | **Art. 7º, I**<br>(Consentimento via Web Push API) | Provedor de push do navegador (Google FCM / Mozilla). | Notificações lidas são expurgadas após 90 dias. Inscrição pode ser cancelada no navegador a qualquer momento. |
| **07** | **Segurança da Informação e Prevenção a Fraudes**<br>Auditoria de requisições, contenção de ataques e logs de servidor. | Todos os visitantes e usuários | Endereço IP (sanitizado), User-Agent, método HTTP, rota consultada (com tokens mascarados). | **Art. 7º, IX**<br>(Legítimo interesse do controlador) c/c **Art. 46** (Dever de segurança). | Render Services Inc. (hospedagem de aplicação — EUA). | Logs de aplicação retidos temporariamente conforme política do provedor de infraestrutura (máximo 30 dias). |

---

## 3. Transferência Internacional de Dados (LGPD Art. 33)
- **Destino dos Dados:** Estados Unidos da América (Supabase na região `us-west-2` Oregon e Render).
- **Fundamento Legal:** **Art. 33, IX** da LGPD (transferência necessária para a execução de contrato ou de procedimentos preliminares a pedido do titular).
- **Garantias de Proteção:** Conexão criptografada ponta a ponta (TLS 1.3), criptografia em repouso (AES-256 no Supabase/PostgreSQL) e isolamento lógico via políticas de banco.

---

## 4. Medidas Técnicas de Segurança Implementadas (LGPD Art. 46)
1. **Tokens Criptográficos Estritos:** Tokens MCP gerados com assinatura digital HMAC-SHA256 e validação mandatória de `jwtid` atrelado a `McpGrant` ativo no banco de dados. Eliminação total de decodificações sem assinatura.
2. **Prevenção a Sequestro OAuth:** Exigência de sessão autenticada do titular para emissão de códigos de autorização OAuth, com suporte a PKCE (S256) e verificação de `redirect_uri` contra allowlist.
3. **CORS Restritivo e Cookies HttpOnly:** Credenciais de sessão restritas a domínios seguros autorizados com flags `HttpOnly`, `Secure` e `SameSite`.
4. **Sanitização Proativa de Logs:** Mascaramento automático (`[REDACTED]`) de parâmetros sensíveis (`token`, `code`, `access_token`) nas URLs e redaction nativo nos cabeçalhos Pino.
5. **Row Level Security (RLS):** Bloqueio de acesso anônimo direto ao banco de dados Supabase PostgREST.
6. **Controle e Expurgo Automatizado:** Rotina diária de expurgo (`retention.service.ts`) para eliminar códigos temporários, notificações antigas e concessões revogadas.
