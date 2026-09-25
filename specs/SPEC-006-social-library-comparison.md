# SPEC-006: Sincronia Cósmica & Comparação de Acervos com Amigos

| Metadado | Detalhe |
| :--- | :--- |
| **Status** | Aprovado / Em Implementação |
| **Versão** | 1.0.0 |
| **Data** | 2026-09-25 |
| **Autor** | Engenharia de Software & Arquitetura Akasha |
| **Alvos** | `backend`, `frontend`, `roadmap.md`, `conceito.md`, `arquitetura.md` |

---

## 1. Visão Geral e Motivação

O Akasha já conta com uma rede bilateral de viajantes (amizades via Friend Code / Username, SPEC-002) e um Feed de Atividades Sociais (SPEC-003).
A funcionalidade **Sincronia Cósmica (Comparação de Acervos)** eleva a experiência social a um novo patamar, transformando a simples inspeção de bibliotecas em uma experiência colaborativa, lúdica e prática para casais e grupos de amigos.

Ela resolve três dores essenciais do entretenimento compartilhado:
1. **O dilema do sofá:** *"O que nós dois estamos querendo assistir agora?"* (Sessão a dois / Backlog comum).
2. **O choque de opiniões:** *"Como nossas avaliações se comparam para obras que ambos vimos?"* (Consensos vs Duelos).
3. **Descoberta de alta confiança:** *"O que o meu amigo amou com nota máxima que eu ainda nem conheço?"* (Recomendações orgânicas).

---

## 2. O Algoritmo de Afinidade Cósmica (*Resonance Score*)

A **Afinidade Cósmica** é uma métrica normalizada entre 0% e 100%, combinando dois fatores determinantes:

$$\text{Afinidade} = \left( 0.4 \times \text{Score}_{\text{Sobreposição}} \right) + \left( 0.6 \times \text{Score}_{\text{Notas}} \right)$$

1. **Score de Sobreposição (Similaridade de Jaccard):**
   $$\text{Score}_{\text{Sobreposição}} = \frac{|\text{Acervo}_A \cap \text{Acervo}_B|}{|\text{Acervo}_A \cup \text{Acervo}_B|} \times 100$$
   *Se a união for vazia, o score é 0.*

2. **Score de Concordância de Notas:**
   Para as $N$ obras em que ambos atribuíram estrelas (1 a 5):
   $$\text{Score}_{\text{Notas}} = \left( 1 - \frac{\sum_{i=1}^N |\text{Nota}_{A,i} - \text{Nota}_{B,i}|}{4 \times N} \right) \times 100$$
   *Se $N = 0$, o score de notas herda o score de sobreposição ou padrão neutro de 50%.*

3. **Tabela de Faixas Cósmicas:**
   | Faixa (%) | Rótulo Akáshico | Descrição |
   |---|---|---|
   | **90% - 100%** | **Almas Cósmicas** 🌌 | Sintonia quase absoluta de gostos e escolhas. |
   | **75% - 89%** | **Frequência Harmônica** ✨ | Forte convergência com discussões pontuais e produtivas. |
   | **50% - 74%** | **Mundos Paralelos** 🪐 | Áreas de interesse compartilhadas, mas repertórios divergentes. |
   | **0% - 49%** | **Caos Gravitacional** ☄️ | Opostos completos; terreno fértil para debates acalorados. |

---

## 3. Arquitetura de Backend (Fastify + Prisma + Zod)

### 3.1 Endpoint Privado de Comparação
`GET /friends/:id/compare`
* **Autenticação Obrigatória:** Via middleware `verifySupabaseAuth` (`request.userId`).
* **Regra de Privacidade & Autorização:**
  * O backend consulta a tabela `Friendship` entre `request.userId` e `params.id`.
  * Se não existir amizade ou `status !== 'accepted'`, retorna **403 Forbidden** com mensagem amigável.
  * Se houver bloqueio mútuo (`blocked`), retorna **404 Not Found**.

### 3.2 Otimização de Performance e Hidratação de Metadados
Como a tabela `Wishlist` armazena chaves compactas (`tmdbId`, `mediaType`, `status`, `userRating`, `notes`), a hidratação dos dados visuais (título, poster) segue a estratégia:
1. Buscar metadados cacheados locais na tabela `Activity` para as chaves `(tmdbId, mediaType)`.
2. Para obras ainda sem metadados locais, resolver em paralelo controlado via `fetchMediaDetails` com o cache em memória do serviço TMDB.

### 3.3 Contrato de Resposta (JSON):
```json
{
  "friend": {
    "id": "uuid",
    "username": "amigo_cinefilo",
    "avatarUrl": "https://...",
    "friendCode": "AK-48B1-92A3"
  },
  "affinity": {
    "percentage": 85,
    "label": "Frequência Harmônica",
    "totalShared": 14,
    "totalOverlapRated": 8
  },
  "watchTogether": [
    {
      "tmdbId": 157336,
      "mediaType": "movie",
      "title": "Interestelar",
      "posterUrl": "https://image.tmdb.org/t/p/w500/..."
    }
  ],
  "ratedOverlap": [
    {
      "tmdbId": 27205,
      "mediaType": "movie",
      "title": "A Origem",
      "posterUrl": "https://image.tmdb.org/t/p/w500/...",
      "myRating": 5,
      "friendRating": 4,
      "myReview": "Obra-prima de Nolan",
      "friendReview": "Muito bom, roteiro impecável",
      "delta": 1
    }
  ],
  "friendRecommendations": [
    {
      "tmdbId": 603,
      "mediaType": "movie",
      "title": "Matrix",
      "posterUrl": "https://image.tmdb.org/t/p/w500/...",
      "friendRating": 5,
      "friendReview": "Revolucionário",
      "inMyBacklog": false
    }
  ]
}
```

---

## 4. Arquitetura Frontend & Universalidade (Android TV, Mobile & Desktop)

### 4.1 Estrutura de Componentes
* `AffinityBadge`: Círculo/gauge cósmico que exibe a porcentagem, animação de aura sutil e o rótulo akáshico.
* `ComparisonView`: Componente mestre com seletor de abas:
  1. **🍿 Para Ver Juntos:** Grid de cartões de obras em comum no backlog.
  2. **⚖️ Consenso & Duelo:** Cards duplos com visualização lado a lado da nota do usuário e da nota do amigo, resenhas e selo de Consenso Perfeito (quando $\Delta = 0$).
  3. **✨ Recomendações:** Cartões com a avaliação do amigo e botão de ação rápida `+ Quero Ver`.

### 4.2 Acessibilidade & Compatibilidade Universal
* **Android TV (D-Pad):**
  * Todos os botões de abas, cartões e ações de "+ Quero Ver" possuem `tabIndex={0}`.
  * Estados `:focus-visible` com anel dourado/caramelo iluminado (`outline-none ring-2 ring-caramelo-claro shadow-glow`).
  * Suporte a atalho de retorno (Back / Esc) para voltar à lista geral de amigos sem recarregar a página.
* **Mobile (Touch):**
  * Toque amplo com altura mínima de 44px em todos os controles.
  * Abas deslizantes horizontais e badges adaptáveis em resoluções pequenas.
* **Desktop:**
  * Layout em colunas dinâmicas, aproveitando o espaço lateral para resenhas mais longas.

---

## 5. Plano de Cobertura de Testes Automatizados (Vitest)

1. **Testes Unitários de Algoritmo:**
   - Cálculo exato de Jaccard e afinidade com 100% de sobreposição, 0% e casos mistos.
   - Tratamento de bibliotecas vazias sem divisão por zero.
2. **Testes de Integração de Rota:**
   - Usuário não autenticado -> `401`.
   - Usuários que não são amigos -> `403`.
   - Usuários bloqueados -> `404`.
   - Amigos confirmados -> `200` com payload completo estruturado.
3. **Testes de Componentes Frontend:**
   - Renderização correta do `AffinityBadge` e das abas.
   - Navegação entre abas e renderização dos cards com `tabIndex={0}`.
   - Disparo da ação de adicionar ao backlog a partir de uma recomendação.
