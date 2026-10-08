Contexto do Produto e Regras de Negócio: AKASHA

## 1. Visão Geral do Produto
O **Akasha** é um repositório inteligente e acervo universal de entretenimento. Inspirado conceitualmente nos "Registros Akáshicos" (o compêndio cósmico da sabedoria), ele atua como o registro definitivo do usuário para documentar sua jornada através de múltiplas mídias: **Filmes, Séries, Jogos, Livros e Quadrinhos (HQs/Mangás)**.

> 📄 **Especificação Técnica de Referência:** [`specs/SPEC-001-universal-media-expansion.md`](file:///d:/Users/Public/codigo/akasha/specs/SPEC-001-universal-media-expansion.md)

## 2. Funções Principais e Módulos do Acervo

### 2.1 Gestão Universal de Catálogo e Status
Permite que o usuário organize suas obras em status de consumo padronizados e semânticos por mídia:
* **Quero Consumir (Backlog):** Filmes/séries a assistir, jogos a jogar, livros e quadrinhos a ler.
* **Em Progresso:** Obras sendo consumidas ativamente no momento.
* **Concluídos:** Histórico de obras finalizadas, com sistema obrigatório de avaliação.
* **Abandonados (Dropped):** Obras interrompidas (sinal negativo forte para o motor de recomendação).

### 2.2 Sistema de Avaliação Cirúrgico
> 📄 **Especificação Técnica:** [`specs/SPEC-009-auth-resilience-and-game-rating-workflow.md`](file:///d:/Users/Public/codigo/akasha/specs/SPEC-009-auth-resilience-and-game-rating-workflow.md)  
Ao concluir qualquer mídia ou marcar como "Já Zerei" / "Concluído" diretamente pela busca ou catálogo, o usuário atribui uma nota de 1 a 5 estrelas e comentários opcionais. Essas notas, combinadas com o status de consumo, constroem o mapa comportamental e alimentam imediatamente o motor de recomendação inteligente.

## 3. Escalabilidade e Motores de Inteligência

### Motores de Recomendação Especialistas & Transmídia
> 📄 **Especificação Técnica de Jogos e Tendências Twitch:** [`specs/SPEC-010-twitch-helix-trending-games-and-zero-mock-architecture.md`](file:///d:/Users/Public/codigo/akasha/specs/SPEC-010-twitch-helix-trending-games-and-zero-mock-architecture.md)  
> 📄 **Especificação Técnica de Livros e Estante Literária:** [`specs/SPEC-011-books-module-and-reading-shelf.md`](file:///d:/Users/Public/codigo/akasha/specs/SPEC-011-books-module-and-reading-shelf.md)  
> 📄 **Especificação Técnica de Quadrinhos e Mangás (Sagas & Volumes):** [`specs/SPEC-015-comics-and-manga-module.md`](file:///d:/Users/Public/codigo/akasha/specs/SPEC-015-comics-and-manga-module.md)  
> 📄 **Especificação Técnica Motor Inteligente de Recomendações de Quadrinhos e Mangás:** [`specs/SPEC-016-enhanced-comic-recommendation-engine.md`](file:///d:/Users/Public/codigo/akasha/specs/SPEC-016-enhanced-comic-recommendation-engine.md)  
> 📄 **Especificação Técnica Motor Transmídia, Dashboard do Grande Acervo e MCP Universal:** [`specs/SPEC-017-transmedia-engine-and-grand-archive-dashboard.md`](file:///d:/Users/Public/codigo/akasha/specs/SPEC-017-transmedia-engine-and-grand-archive-dashboard.md)  
> 📄 **Especificação Técnica Separação entre Recomendação (ML) e Sinopse:** [`specs/SPEC-014-separation-of-recommendation-reason-and-synopsis.md`](file:///d:/Users/Public/codigo/akasha/specs/SPEC-014-separation-of-recommendation-reason-and-synopsis.md)  
O Akasha opera motores de recomendação dedicados por domínio (TMDB para cinema, Twitch Helix + IGDB para games, Google Books para livros e Comic Vine/AniList para HQs/mangás), coroados pelo **Motor Transmídia e o Dashboard do Grande Acervo**:
* **Jogos e Tendências em Tempo Real:** O catálogo e cold start de games refletem o pulso da Twitch Helix API (`/helix/games/top`) sem dependência de dados mockados estáticos, enriquecidos com capas e metadados oficiais do IGDB v4.
* **Literatura e Afinidade de Autores:** Ingestão de acervo via Google Books API com busca textual em pt-BR e por código ISBN, controle de páginas, estante de leituras e motor de recomendação baseado em ponderação de notas e autores/gêneros favoritos.
* **Quadrinhos e Mangás por Saga e Arco:** Ingestão híbrida via Comic Vine REST (HQs ocidentais/sagas fechadas) e AniList GraphQL (Mangás japoneses e Manhwas coreanos), com rastreamento no nível da obra/saga completa (e não de edições mensais soltas), enumeração colapsável de edições/volumes e recomendações orientadas a roteiristas, desenhistas e mangakas.
* **Motor Inteligente de HQs & Mangás (SPEC-016):** Desduplicação de sementes por radical da franquia (`extractSeriesCore`), expansão por editoras favoritas, 31 obras canônicas verificadas, *editorial interleaving* balanceado (1 HQ : 1 Mangá) e abas de filtro segmentadas no frontend com justificativas dinâmicas de afinidade contextual.
* **Motor Transmídia & Descoberta Cruzada de Franquias (SPEC-017):** Mapeamento ativo de mais de 20 grandes universos transmidiáticos canônicos (The Witcher, Duna, The Last of Us, Cyberpunk, Star Wars, Senhor dos Anéis, etc.), gerando pontes inteligentes que conectam o que o usuário já avaliou positivamente aos silos culturais ainda não explorados.
* **Dashboard do Grande Acervo (SPEC-017):** Métricas consolidadas de consumo cultural (horas de telas, horas de jogos, páginas lidas, volumes de quadrinhos, distribuição de notas) e cálculo do Índice de Amplitude Akasha com atribuição de arquétipo cultural (*Polímata Transmídia*, *Cinéfilo Devoto*, etc.).

### Agente Autônomo e Camada MCP Universal (Model Context Protocol)
Compatibilidade total com assistentes agênticos (como Google Spark e Claude) via ferramentas universais enriquecidas com o parâmetro `domain` (`search_media`, `get_recommendations`, `add_to_library`, `rate_media`, `remove_from_list`, `get_library_stats`, `get_transmedia_connections`).

### Camada de Interação Social & Sincronia Cósmica Universal
> 📄 **Especificação Técnica:** [`specs/SPEC-006-social-library-comparison.md`](specs/SPEC-006-social-library-comparison.md)  
Rede fechada entre viajantes Akasha: feeds de atividades transmídia, cálculo unificado de Afinidade Cósmica (*Resonance Score* global e desagregado por módulos culturais: Cinema, Séries, Jogos, Livros e Quadrinhos), identificação de obras para curtir juntos no sofá ou em modo cooperativo (*Shared Backlog Match*), consensos/duelos cirúrgicos de notas e recomendações orgânicas cruzadas entre amigos com adição instantânea à estante correta.

### Central de Notificações Multiplataforma & Push
> 📄 **Especificação Técnica:** [`specs/SPEC-007-push-notifications.md`](specs/SPEC-007-push-notifications.md)  
Canal de comunicação ativo e não invasivo integrado em todas as plataformas (Android TV, Mobile e Desktop): alertas de novos episódios de séries em acompanhamento ativo (`watching`), avisos de novas avaliações e opiniões na rede de amigos e solicitações de conexão social.

### Experiência de Carregamento Temático & Delight UX
> 📄 **Especificação Técnica:** [`specs/SPEC-012-thematic-loading-and-delight-ux.md`](specs/SPEC-012-thematic-loading-and-delight-ux.md)  
Componente universal de carregamento que substitui spinners estáticos por uma experiência interativa e imersiva: combina o círculo giratório característico na paleta do projeto com alternância periódica de frases espirituosas e contextuais a cada domínio (livros, cinema, games e biblioteca geral).

### Ciclo de Ações Unificadas Multiplataforma & Mobile
> 📄 **Especificação Técnica:** [`specs/SPEC-013-unified-mobile-actions.md`](specs/SPEC-013-unified-mobile-actions.md)  
Centralização das quatro ações essenciais do ciclo de vida de consumo cultural ("Começar a assistir/jogar/ler", "Concluir", "Avaliar" e "Remover") no mesmo painel unificado em modais de detalhes e cards, eliminando a dependência de `:hover` no celular e garantindo navegação D-Pad contínua na Android TV.
