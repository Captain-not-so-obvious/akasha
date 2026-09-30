# SPEC-013: Unified Mobile & Multiplatform Actions Workflow (Ações Unificadas de Títulos)

## 1. Visão Geral e Motivação
Na versão mobile do Akasha para filmes, séries, jogos e livros, o fluxo para iniciar o consumo de uma obra ("Começar a assistir / jogar / ler") e gerenciar seu ciclo de vida estava fragmentado e pouco intuitivo. 

Dispositivos móveis com tela de toque (*touchscreens*) não disparam eventos de `:hover`, fazendo com que os botões rápidos sobrepostos nos cards ficassem inacessíveis sem tocar no card para abrir o modal. Contudo, ao abrir o modal de detalhes, as opções de ação eram inconsistentes entre mídias (por exemplo, ausência de botão para transicionar diretamente para "Assistindo/Jogando/Lendo" ou ausência de botão "Avaliar" nos modais de jogos e livros).

A especificação introduz um **painel unificado de ações centralizado** no mesmo local em todos os modais de detalhes (`MediaDetailsModal`, `GameDetailsModal`, `BookDetailsModal`) e uma barra de transição de status rápida e visível nos cards de biblioteca em telas mobile (`LibraryItemCard`).

---

## 2. Requisitos de Negócio e Funcionais

As quatro ações primárias do ciclo de vida de qualquer obra devem estar agrupadas e disponíveis no **mesmo local**:

1. **Começar a assistir / jogar / ler (`watching`):**
   - Transiciona o item de `plan_to_watch` para `watching` imediatamente.
   - Contextualizado por mídia: "Começar a Assistir" (filmes/séries), "Começar a Jogar" (games), "Começar a Ler" (livros).
   - Quando o item ainda não está na biblioteca, permite adicionar diretamente iniciando o consumo com um único toque.
2. **Concluir (`completed`):**
   - Transiciona o item para `completed` (ou abre modal de avaliação se configurado).
   - Contextualizado por mídia: "Marcar como Assistido", "Marcar como Zerado", "Marcar como Lido".
3. **Avaliar (`rating`):**
   - Abre o `RatingModal` para atribuir nota (1 a 5 estrelas), data de conclusão e notas/resenha pessoal.
   - Disponível para itens já adicionados em qualquer status ou na conclusão.
4. **Remover (`remove`):**
   - Remove o título da biblioteca com confirmação de ação e feedback visual.

---

## 3. Arquitetura e Componentes Atualizados

```
                ┌─────────────────────────────────┐
                │        Library / Search         │
                └───────────────┬─────────────────┘
                                │
        ┌───────────────────────┴───────────────────────┐
        ▼                                               ▼
┌───────────────────────────┐               ┌───────────────────────────┐
│     LibraryItemCard       │               │   Universal Modals Panel  │
│  (Quick Mobile Bar 44px)  │               │   (Centralized Actions)   │
└───────────────────────────┘               └─────────────┬─────────────┘
                                                          │
                    ┌─────────────────────────────────────┼─────────────────────────────────────┐
                    ▼                                     ▼                                     ▼
      ┌───────────────────────────┐         ┌───────────────────────────┐         ┌───────────────────────────┐
      │     MediaDetailsModal     │         │     GameDetailsModal      │         │     BookDetailsModal      │
      │  (Filmes & Séries - TMDB) │         │       (Jogos - IGDB)      │         │    (Livros - Google Books)│
      └───────────────────────────┘         └───────────────────────────┘         └───────────────────────────┘
```

### 3.1. `MediaDetailsModal.tsx`
- Seção de ações unificadas agrupando os 4 botões quando o item está na biblioteca:
  - Botão Play ("Começar a Assistir") com destaque visual caso o status seja `plan_to_watch`.
  - Botão Check ("Concluir / Assistido").
  - Botão Star ("Avaliar").
  - Botão Trash2 ("Remover").
- Quando fora da biblioteca, oferece adições diretas em "Quero Assistir" ou "Começar a Assistir".

### 3.2. `GameDetailsModal.tsx` e `BookDetailsModal.tsx`
- Adição da propriedade `onEdit?: (item: LibraryItem) => void`.
- Inclusão do botão "Avaliar" (Star) conectado ao modal de avaliação rápida.
- Centralização dos 4 botões na mesma barra de comandos no rodapé do modal.

### 3.3. `LibraryItemCard.tsx`
- Adição de um botão de ação rápida mobile (`md:hidden`) posicionado no canto inferior do card com touch target mínimo de 44x44px.
- Permite avançar o status com 1 toque diretamente da listagem ("Começar", "Concluir").

---

## 4. Adaptação Multiplataforma (TV, Celular e Desktop)

| Plataforma | Comportamento e Acessibilidade |
| :--- | :--- |
| **Mobile (Touch)** | Touch targets generosos (mínimo de 44px de altura/largura), botões visíveis sem depender de `:hover`, labels com texto e ícone claros, fechamento rápido. |
| **Android TV (D-Pad)** | Todos os botões possuem `tabIndex={0}` e classe `tv-focus-glow`, anéis de foco dourados luminosos (`focus:ring-2 focus:ring-[var(--color-ouro-astral)]`), suporte integral a navegação por controle remoto. |
| **Desktop (Mouse/Teclado)** | Grid flexível com layout expansivo no modal, hover micro-animado, atalhos via tecla `Escape`. |

---

## 5. Testes Automatizados
- Testes unitários de renderização e acionamento de eventos em `frontend/tests/components/ui/MediaDetailsModal.test.tsx`:
  - Renderização das 4 ações unificadas ("Começar a Assistir", "Marcar como Assistido", "Avaliar", "Remover").
  - Acionamento correto de `onStatusChange`, `onEdit` e `onRemove`.
- Teste em `frontend/tests/components/ui/LibraryItemCard.test.tsx`:
  - Botão rápido mobile visível e funcional para transição de status.
