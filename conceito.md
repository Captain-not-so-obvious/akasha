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
Ao concluir qualquer mídia, o usuário atribui uma nota de 1 a 5 estrelas. Essas notas, combinadas com o status de consumo, constroem o mapa comportamental e o perfil de gosto do usuário.

## 3. Escalabilidade e Motores de Inteligência

### Motores de Recomendação Especialistas & Transmídia
O Akasha opera motores de recomendação dedicados por domínio (TMDB para cinema, IGDB para games, Google Books para livros e Comic Vine/AniList para HQs/mangás), complementados por um **Motor Transmídia**:
* Descoberta cruzada de franquias e universos expandidos (ex: conectar games a livros e adaptações cinematográficas baseadas nas notas do usuário).

### Agente Autônomo e Camada MCP (Model Context Protocol)
Compatibilidade nativa com assistentes agênticos (como Google Spark) para gerenciar o acervo, catalogar mídias e solicitar recomendações personalizadas via comandos conversacionais.

### Camada de Interação Social (Visão Futura)
Evolução para uma rede fechada entre amigos: feeds de atividade transmídia, comparação de bibliotecas e recomendações orgânicas entre contatos.