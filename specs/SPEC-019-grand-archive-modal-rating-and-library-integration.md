# SPEC-019: Integração de Avaliação (RatingModal) e Sincronização de Biblioteca no Grande Acervo

| Metadado | Detalhe |
| :--- | :--- |
| **Status** | Implementado & Validado (100% Concluído) |
| **Versão** | 1.0.0 |
| **Data** | 2026-10-07 |
| **Autor** | Engenharia de Software & Arquitetura Akasha |
| **Alvos** | `frontend/src/pages/Transmedia.tsx`, `frontend/tests/pages/Transmedia.test.tsx` |

---

## 1. Visão Geral e Contexto

No módulo do **Grande Acervo** (`/transmedia`), o motor transmídia sugere pontes culturais entre diferentes domínios (Cinema, Séries, Jogos, Livros e Quadrinhos). Ao interagir com uma obra recomendada (ex: *Batman 1989*), o modal de detalhes correspondente (`MediaDetailsModal`, `GameDetailsModal`, `BookDetailsModal` ou `ComicDetailsModal`) é aberto para inspeção e catalogação.

### O Problema Identificado
Ao clicar na ação de conclusão imediata (**"Já Assisti"**, **"Já Zerei"** ou **"Já Li"**), a requisição adicionava o item diretamente na lista com status `completed`, fechava o modal de detalhes e **não abria o modal de avaliação (`RatingModal`)**. Com isso, o usuário ficava impedido de atribuir de 1 a 5 estrelas e de redigir sua resenha/opinião para alimentar o motor de inteligência e o arquétipo cultural.
Além disso, os modais de recomendação não possuíam sincronização ativa com a biblioteca do usuário (`useWishlist`), não exibiam a indicação de que o título já estava catalogado e não permitiam alterar status, editar avaliação ou remover a obra.

---

## 2. Decisões Arquiteturais e Engenharia de Solução

### 2.1 Interceptação de Conclusão e Abertura do `RatingModal`
* No handler `onAdd` de cada modal especialista em `Transmedia.tsx`:
  - Se o `status === 'completed'`, o modal de detalhes é fechado e a entidade é preservada no estado pendente correspondente (`pendingRatingMedia`, `pendingRatingGame`, `pendingRatingBook` ou `pendingRatingComic`).
  - O estado `ratingModalOpen` é acionado para `true`, exibindo o componente `RatingModal`.
  - Ao submeter a avaliação com nota (1 a 5) e resenha opcional, o payload consolidado é despachado via `addToList` contendo `status: 'completed'`, `userRating` e `notes`.

### 2.2 Sincronização Ativa de Biblioteca (`useWishlist`)
* `Transmedia.tsx` passa a consumir `{ items, fetchWishlist, addToList, updateListItem, removeFromList }` de `useWishlist`.
* O `fetchWishlist` é disparado na montagem da tela, mantendo os mapas de verificação (`libraryGameMap`, `libraryBookMap`, `libraryComicMap` e correspondência de `tmdbId`/`externalId` para cinema/TV).
* Cada modal agora recebe:
  - `isInLibrary`: boolean indicando presença prévia no acervo.
  - `libraryItem`: registro original do acervo.
  - `onStatusChange`: permite transitar entre status (`plan_to_watch`, `watching`, `completed`), abrindo o `RatingModal` caso mude para `completed`.
  - `onEdit`: abre o `RatingModal` para editar a nota e resenha existentes.
  - `onRemove`: remove o item da biblioteca diretamente pelo modal.

### 2.3 Tratamento Consistente de Outras Funções do Modal
1. **"Quero Ver" / "Quero Jogar" / "Quero Ler" (`plan_to_watch`):** Adiciona diretamente à estante com status de planejamento, transicionando o modal para feedback otimista imediato.
2. **"Começar a Assistir" / "Jogando Agora" / "Lendo Agora" (`watching`):** Adiciona ou atualiza para status em andamento com indicador visual ativo.
3. **"Quick Add" (`+` nos cards do `TransmediaRail`):** Preserva inferência de `domain`, `externalId`, `tmdbId` e `mediaType` para compatibilidade total.

---

## 3. Acessibilidade e Diretrizes Multiplataforma

* **Android TV (D-Pad):** O `RatingModal` e os botões de ação dos modais especialistas possuem `tabIndex={0}`, classes `tv-focus-glow` e suporte a navegação por teclado (Enter/Espaço para selecionar estrelas e salvar, Escape para fechar).
* **Mobile (Touch):** Botões com altura mínima de 44px (`min-h-[44px]`) e grid responsivo (`grid-cols-1 sm:grid-cols-3`) para toque confortável em smartphones.
* **Desktop:** Diálogos centralizados com `backdrop-blur-md` e paleta Liquid Glass terrosa.

---

## 4. Cobertura de Testes Automatizados

A funcionalidade foi blindada em `frontend/tests/pages/Transmedia.test.tsx` com 8 testes unitários/integração cobrindo:
1. Renderização das abas e layout do Grande Acervo.
2. Abertura do modal com título consistente e proteção contra divergência de APIs externas.
3. Abertura do `RatingModal` ao clicar em "Já Assisti" e despacho com nota e resenha.
4. Adição direta com "Quero Ver" (`plan_to_watch`).
5. Adição com "Começar a Assistir" (`watching`).
6. Detecção de item já na biblioteca e exibição de botões de remoção e gerenciamento.
