# SPEC-012: Thematic Loading & Delight UX (Carregamento Temático e Criativo)

## 1. Visão Geral e Motivação
Durante o carregamento de acervos pesados e cálculo assíncrono de recomendações (cinema, games e livros), spinners estáticos com textos genéricos ("Carregando...") geram fricção cognitiva e tédio ao usuário. 

A especificação introduz o componente **`ThematicLoader`**, transformando os momentos de espera em experiências de *delight* imersivas, utilizando o design system **Liquid Glass** e combinando um círculo giratório característico com rotação periódica de frases divertidas e contextuais aos domínios do Akasha.

---

## 2. Requisitos & Comportamento

### 2.1. Círculo Giratório Padrão (Spinner)
- Indicador giratório contínuo com bordas estilizadas na paleta do projeto (`var(--color-caramelo-claro)` e `var(--color-seda-milharal)`).
- Halo luminoso suave (`blur-sm` com `animate-pulse`) em volta do núcleo giratório.
- Três perfis de dimensão: `sm` (24px), `md` (36px) e `lg` (48px).

### 2.2. Frases Alternantes Criativas
- Transição periódica a cada 2.6 segundos (configurável via `intervalMs`), com micro-animação suave de `fade-out` (250ms), alteração do índice e `fade-in`.
- Segmentação contextual por domínio:
  - **Livros (`book`):**
    - *"Organizando a sua estante..."*
    - *"Tem alguns livros empoeirados por aqui..."*
    - *"Folheando os manuscritos do Akasha..."*
    - *"Separando os melhores marcadores de página..."*
    - *"Desvendando novos capítulos..."*
    - *"Quase lá..."*
  - **Cinema & Séries (`movie`):**
    - *"Organizando a sua estante..."*
    - *"Ajustando a lente do projetor..."*
    - *"Rebobinando as fitas da estante..."*
    - *"Estourando a pipoca quentinha..."*
    - *"Sintonizando frequências cinematográficas..."*
    - *"Quase lá..."*
  - **Jogos (`game`):**
    - *"Organizando a sua estante..."*
    - *"Assoprando a poeira dos cartuchos..."*
    - *"Compilando shaders na memória..."*
    - *"Calibrando os controles e joysticks..."*
    - *"Sintonizando o próximo checkpoint..."*
    - *"Quase lá..."*
  - **Geral (`general`):**
    - *"Organizando a sua estante..."*
    - *"Tem alguns livros empoeirados por aqui..."*
    - *"Consultando os registros etéreos do Akasha..."*
    - *"Tirando a poeira das relíquias do acervo..."*
    - *"Polindo as prateleiras da sua coleção..."*
    - *"Quase lá..."*

---

## 3. Arquitetura e Componentes Integrados

```
frontend/src/components/ui/ThematicLoader.tsx
      │
      ├──> frontend/src/pages/Library.tsx (Acervo Universal da Biblioteca)
      ├──> frontend/src/components/recommendations/BookRecommendationRail.tsx (Trilho Literário)
      ├──> frontend/src/components/recommendations/RecommendationRail.tsx (Trilho de Cinema)
      └──> frontend/src/components/recommendations/GameRecommendationRail.tsx (Trilho de Games)
```

---

## 4. Acessibilidade e Multiplataforma (TV, Celular, Desktop)

1. **Acessibilidade Universal (A11y):**
   - O container possui `role="status"` e `aria-live="polite"`.
   - Leitores de tela anunciam as atualizações de forma não intrusiva.
   - Textos semânticos e tags sem armadilhas de foco (sem roubar o cursor do usuário).
2. **Android TV (D-Pad):**
   - Cores de alto contraste contra fundos escuros (`#283618`).
   - Sizing dimensionado para legibilidade em telas de TV a 3 metros de distância (`size="lg"` com `text-lg` na biblioteca).
3. **Mobile & Desktop:**
   - Layout fluido, centralizado, sem *layout shifts* verticais (reserva de altura mínima via `min-h-[1.75rem]`).
   - Leveza de renderização sem dependências externas pesadas (apenas CSS Tailwind e hooks nativos).

---

## 5. Testes Automatizados
- `frontend/tests/components/ui/ThematicLoader.test.tsx`:
  - Validação do role `status` e `aria-live="polite"`.
  - Renderização do círculo giratório com classe `animate-spin`.
  - Verificação das frases do domínio `book`.
  - Verificação do avanço de tempo com `vi.useFakeTimers()` e micro-animação.
  - Suporte a frases personalizadas e subtextos.
- Testes integrados de loading com mocks em:
  - `frontend/tests/pages/Library.test.tsx`
  - `frontend/tests/components/recommendations/BookRecommendationRail.test.tsx`
  - `frontend/tests/components/recommendations/RecommendationRail.test.tsx`
