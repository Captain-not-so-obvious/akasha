# SPEC-004: Provedores de Streaming (Onde Assistir com JustWatch via TMDB)

| Metadado | Detalhe |
| :--- | :--- |
| **Status** | Aprovado / Em Implementação |
| **Versão** | 1.0.0 |
| **Data** | 2026-09-24 |
| **Autor** | Engenharia de Software & Arquitetura Akasha |
| **Alvos** | `backend/src/services/tmdb.service.ts`, `frontend/src/types/media.ts`, `frontend/src/components/ui/MediaDetailsModal.tsx`, `docs` |
| **Branch** | `dev` |

---

## 1. Visão Geral e Motivação

O **Akasha** é um catálogo e repositório inteligente de entretenimento. Para elevar a utilidade prática da aplicação (Requisito 3.3.6 no [`roadmap.md`]), os usuários precisam saber imediatamente **em quais plataformas de streaming** (Netflix, Prime Video, Disney+, Max, etc.) uma obra pesquisada ou salva na biblioteca pode ser assistida no Brasil.

### Princípios Norteadores:
1. **Custo e Complexidade Zero (KISS):** Aproveitamento da integração oficial do TMDB com a base do JustWatch (`watch/providers`), sem necessidade de serviços externos adicionais ou assinaturas pagas.
2. **Latência Otimizada:** Utilização do parâmetro `append_to_response=watch/providers` na busca de detalhes (`GET /tmdb/:type/:id`), recuperando sinopse, metadados e provedores de streaming em **uma única chamada HTTP**.
3. **Localização Automática (pt-BR):** Extração orientada ao catálogo brasileiro (`results.BR`), priorizando a categoria `flatrate` (assinatura de streaming), com fallback inteligente para opções de compra/aluguel digital (`rent` / `buy`).
4. **Universalidade (Android TV & Mobile):** Badges de provedores com tamanhos confortáveis para touch (`min-h-[44px]`), suporte a foco via D-Pad para TV (`tabIndex={0}` com classe `tv-focus-glow`) e créditos formais da fonte ("Disponibilizado por JustWatch").

---

## 2. Contratos de Dados e Tipos TypeScript

### 2.1 Backend (`backend/src/services/tmdb.service.ts`) e Frontend (`frontend/src/types/media.ts`)

```typescript
export interface WatchProvider {
  id: number;
  name: string;
  logoUrl: string;
}

export interface WatchProvidersData {
  link?: string | null;
  flatrate: WatchProvider[];
  rent: WatchProvider[];
  buy: WatchProvider[];
}

export interface MediaDetails {
  id: number;
  title: string;
  overview: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  releaseDate: string | null;
  mediaType: 'movie' | 'tv';
  voteAverage: number | null;
  genreIds?: number[];
  watchProviders?: WatchProvidersData | null;
}
```

---

## 3. Integração com a API do TMDB

### 3.1 Endpoint Consumido no Backend
```http
GET https://api.themoviedb.org/3/{mediaType}/{tmdbId}?language=pt-BR&append_to_response=watch/providers
Authorization: Bearer <TMDB_READ_ACCESS_TOKEN>
```

### 3.2 Extração e Normalização
1. Lê o nó `data['watch/providers']?.results?.BR`.
2. Se `BR` existir:
   - Converte itens de `flatrate`, `rent` e `buy` em objetos `WatchProvider` contendo `id`, `name` e `logoUrl` (utilizando `${TMDB_IMAGE_BASE}/w185${logo_path}`).
   - Extrai o `link` direto fornecido pelo JustWatch para consulta detalhada.
3. Se `BR` não existir: define `watchProviders: null`.

---

## 4. UI/UX e Design System

### 4.1 Localização no Modal de Detalhes (`MediaDetailsModal.tsx`)
A seção é exibida logo abaixo da sinopse e antes das ações principais da biblioteca:
- Título da seção: **"Onde Assistir"** (tipografia `font-outfit`, peso semibold, tom caramelo/dourado).
- Ícones em formato de cards suaves com Liquid Glass (`bg-white/5 border border-white/10 rounded-xl p-1.5`).
- Imagem do logo do provedor com `rounded-lg` e resolução otimizada (`w-10 h-10` ou `w-12 h-12`).
- Badge informativo quando a mídia não estiver disponível em nenhuma plataforma no Brasil:
  > *"Não disponível em streaming no Brasil no momento."*
- Link de atribuição sutil: *"Disponibilizado por JustWatch"*.

### 4.2 Acessibilidade e Plataformas
- **Android TV:** Os cards dos streamings contam com `tabIndex={0}`, classe `tv-focus-glow`, permitindo navegação fluida pelo controle remoto.
- **Mobile Touch:** Dispostos em linha com wrap responsivo, áreas de toque generosas e rótulos acessíveis (`aria-label={provider.name}`).
- **Desktop:** Efeito de hover suave com leve escala (`hover:scale-105`) e transição CSS nativa.

---

## 5. Estratégia de Testes

1. **Backend (`backend/tests/services/tmdb.service.test.ts`):**
   - Validação de que `fetchMediaDetails` normaliza corretamente `watchProviders` do Brasil com base no nó `watch/providers`.
   - Validação de comportamento gracioso quando a obra não possui provedores no Brasil.
2. **Frontend (`frontend/tests/components/ui/MediaDetailsModal.test.tsx`):**
   - Renderização dos logos e nomes dos serviços de streaming quando presentes.
   - Renderização da mensagem de fallback quando não houver streaming.
   - Garantia de que elementos interativos possuem `tabIndex={0}` para Android TV.
