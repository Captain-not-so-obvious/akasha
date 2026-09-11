# Integração MCP (Model Context Protocol) - Akasha

O Akasha possui suporte nativo ao **Model Context Protocol (MCP)**, permitindo que agentes LLM (como o Google Spark) interajam de forma segura e autônoma com a plataforma em nome do usuário.

## Segurança Agêntica (Agentic Security)

A integração foi projetada para garantir que o LLM só consiga realizar ações em nome do usuário que o invocou.
Isso é feito através de uma **Sessão MCP atrelada ao Token JWT do usuário**.
O servidor MCP embutido no Fastify intercepta a conexão inicial do agente e extrai o ID do usuário. Dessa forma, as "Tools" expostas não recebem o ID do usuário como parâmetro do agente, mas sim utilizam o ID validado no momento da conexão (Contexto Seguro).

**Configuração Automática (Recomendado):**
Graças à implementação do OAuth 2.0 Authorization Server nativo, o Google Spark consegue descobrir todas as rotas necessárias automaticamente.
1. No Google Spark, insira a URL Base do backend:
   `https://akasha-backend.onrender.com`
2. O Spark detectará o endpoint de metadados (`/.well-known/oauth-authorization-server`).
3. Uma janela será aberta pedindo para você fazer login no Akasha.
4. Após o login, a janela fecha e a integração está pronta! O Spark usará um JWT Stateless seguro para realizar as ações.

> [!WARNING]
> **Cold Start no Render:** Como o backend está hospedado no Render (plano gratuito), ele pode "dormir" após inatividade. Ao conectar o Spark, certifique-se de configurar um timeout generoso (pelo menos 60 segundos) para aguardar o Cold Start da aplicação caso seja a primeira requisição do dia.

## Ferramentas Disponíveis (Tools)

As seguintes ferramentas são expostas pelo servidor MCP e executadas com a identidade do usuário:

### 1. `get_recommendations`
Busca as recomendações personalizadas do usuário baseadas no histórico de visualizações (Wishlist) e algoritmos de pesos.
- **Parâmetros:**
  - `mediaType` (Opcional): 'movie', 'tv', ou 'all'. Padrão é 'all'.
  - `limit` (Opcional): Quantidade desejada. Padrão é 10.

### 2. `search_media`
Busca por filmes ou séries no TMDB por nome.
- **Parâmetros:**
  - `query` (Obrigatório): Termo de busca (ex: "Matrix").
  - `mediaType` (Obrigatório): 'movie' ou 'tv'.

### 3. `start_watching`
Adiciona ou atualiza um filme/série na Wishlist do usuário marcando o status como "watching" (assistindo).
- **Parâmetros:**
  - `tmdbId` (Obrigatório): O ID numérico da mídia no TMDB.
  - `mediaType` (Obrigatório): 'movie' ou 'tv'.

### 4. `remove_from_list`
Remove uma mídia da lista do usuário.
- **Parâmetros:**
  - `tmdbId` (Obrigatório): O ID da mídia no TMDB.
  - `mediaType` (Obrigatório): 'movie' ou 'tv'.

### 5. `rate_media`
Avalia um filme/série de 1 a 5 estrelas. Isso melhora drasticamente as futuras recomendações.
- **Parâmetros:**
  - `tmdbId` (Obrigatório): O ID da mídia.
  - `mediaType` (Obrigatório): 'movie' ou 'tv'.
  - `rating` (Obrigatório): Um número de 1 a 5.
