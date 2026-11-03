# SPEC-023: TV Modal-First Clean Flow & Card Action Streamlining (Fluxo Focado em TV e Limpeza de Atalhos de Cards)

## 1. Visão Geral e Motivação
Durante testes reais de uso do Akasha em ambiente de **Android TV** com controle remoto (D-Pad), identificou-se um problema crítico de usabilidade:
A existência de múltiplos botões rápidos aninhados diretamente sobre a superfície dos cards de biblioteca (`LibraryItemCard`) — como ícone de sinopse, estrela de avaliação, lixeira de remoção e botões de avanço de status — gerava "armadilhas de foco" (*focus traps*) e disparos acidentais indesejados. O usuário, ao tentar apenas selecionar a obra para visualizá-la, acabava frequentemente acionando a remoção acidental ou alterando o status sem intenção ("erros bobos").

Esta especificação define o **Fluxo Modal-First Limpo**:
1. **Superfície do Card Atômica e Limpa:** O card de filme/série na biblioteca e buscas passa a ser uma única entidade interativa (`role="button"`, `tabIndex={0}`), sem nenhum botão filho ou atalho superficial.
2. **Abertura Centralizada do Card de Opções:** Clicar ou pressionar `Enter`/`Space`/`OK` sobre o banner/card abre imediatamente o modal de detalhes completo (`MediaDetailsModal`).
3. **Fidelidade Visual Absoluta ao Design do Akasha:** O modal de opções apresenta a mídia com pôster lateral, título em Cinzel, metadados (`Ano`, `Tipo`, `★ Nota`), sinopse, provedores de exibição ("ONDE ASSISTIR" via JustWatch), indicação de presença na biblioteca (`✓ Já está na sua Biblioteca [Quero Ver]`) e barra de comandos padronizada com as 4 opções: `Começar a Assistir`, `Concluir`, `Avaliar` e `Remover`.

---

## 2. Requisitos Funcionais e de Design

### 2.1. `LibraryItemCard` (Card da Biblioteca Limpo)
- **Zero Botões Aninhados:** Remoção completa da camada de overlay com botões de atalho rápido (Info, Star, Trash2 e botões de status rápido).
- **Entidade Focalizável Única:** Todo o card recebe `tabIndex={0}`, classe `tv-focus-glow` e tratamento de ativação com `onClick` e `onKeyDown` (`Enter` / `Space`).
- **Feedback Visual e Escaneabilidade:**
  - Pôster com proporção 2:3 e fallback gráfico.
  - Badge de avaliação pessoal (quando existente) no canto superior esquerdo.
  - Título em Cinzel e ano de lançamento.
  - `StatusBadge` discreto no rodapé do card informando a situação atual (`Quero Ver`, `Assistindo`, `Concluído`).

### 2.2. `MediaDetailsModal` (Modal de Opções de Mídia)
- **Pôster Lateral & Fechamento:** Pôster vertical lateral de alta resolução e botão de fechamento `✕` no canto superior direito acessível via D-Pad.
- **Cabeçalho & Metadados:**
  - Título em fonte Cinzel dourada (`text-[var(--color-caramelo-claro)]`).
  - Linha de metadados: `{Ano}  {Filme|Série}  ★ {Nota}`.
  - Sinopse completa com tipografia Outfit legível.
- **Onde Assistir (Watch Providers):**
  - Seção com link oficial de atribuição `via JustWatch ↗`.
  - Badges quadradas com cantos arredondados para serviços de streaming disponíveis (ex.: HBO Max, Claro TV+, Netflix, etc.).
- **Indicador de Status do Acervo:**
  - Ícone de verificação circular verde com `Já está na sua Biblioteca`.
  - Pílula de status correspondente (ex.: `Quero Ver`, `Assistindo`, `Concluído`).
- **Barra de 4 Ações Unificadas:**
  Dispostas lado a lado horizontalmente com altura mínima de 44px e realce dourado ao foco (`tv-focus-glow`):
  1. `[ ▶ Começar a Assistir ]` (ou `Assistir Novamente` se concluído) — Fundo âmbar/caramelo (`bg-[var(--color-caramelo-claro)] text-black`).
  2. `[ ✓ Concluir ]` — Fundo verde floresta/esmeralda escuro (`bg-[#0d3b2e] border border-emerald-500/40 text-emerald-300`).
  3. `[ ★ Avaliar ]` — Fundo grafite/carvão (`bg-[#1f2227] border border-white/10 text-white`) com estrela dourada.
  4. `[ 🗑 Remover ]` — Fundo bordô/vinho escuro (`bg-[#321318] border border-red-800/40 text-red-300`).

---

## 3. Arquitetura e Adaptação Multiplataforma

```
Controle Remoto (D-Pad) / Mouse / Touch
                   │
                   ▼
       ┌───────────────────────┐
       │   LibraryItemCard     │  ◄── Single Focus Element (tabIndex=0)
       │ (Sem botões aninhados)│      Zero focus-traps / Zero acionamentos errôneos
       └───────────┬───────────┘
                   │  Click / Enter / Space
                   ▼
       ┌───────────────────────┐
       │   MediaDetailsModal   │  ◄── Card de Opções Completo (Design 1:1)
       │  (Painel Centralizado)│
       └───────────┬───────────┘
                   │
  ┌────────────────┼────────────────┬────────────────┐
  ▼                ▼                ▼                ▼
[▶ Começar]   [✓ Concluir]    [★ Avaliar]      [🗑 Remover]
```

### 3.1. Android TV (D-Pad)
- Ao navegar pela grade da biblioteca, o foco salta limpo de pôster em pôster com anel dourado luminoso (`.tv-focus-glow`).
- Não há elementos filhos que "roubem" o foco ao passar pela grade.
- O acionamento da tecla OK abre o card de opções, onde os 4 botões de ação são grandes e espaçados, eliminando cliques equivocados.

### 3.2. Celular (Touch-First)
- O card completo atua como área de toque generosa (muito superior a 44x44px), sem requerer múltiplos toques para abrir ou revelar ações.
- Todas as decisões de ciclo de vida da obra são tomadas com conforto e confirmação clara dentro do modal.

### 3.3. Desktop
- Efeito suave de elevação no hover (`hover:-translate-y-1 hover:border-[var(--color-caramelo-claro)]/40 hover:shadow-xl`).
- Atalho `Escape` fecha o modal rapidamente.

---

## 4. Testes e Validação
- **`LibraryItemCard.test.tsx`:**
  - Renderização correta de título, ano, status e nota.
  - Disparo de `onSelect` / `onSelectItem` via clique do mouse, tecla Enter e tecla Espaço.
  - Verificação de ausência de botões aninhados na superfície do card (apenas 1 role `button` correspondente ao próprio card).
- **`MediaDetailsModal.test.tsx`:**
  - Apresentação das 4 opções no mesmo lugar quando a obra está na biblioteca em status `plan_to_watch`.
  - Disparo correto de `onStatusChange`, `onEdit` e `onRemove`.
  - Exibição consistente da seção "ONDE ASSISTIR" com providers do TMDB / JustWatch.

