# SPEC-014: Separação Canônica entre Motivo de Recomendação (ML) e Sinopse da Obra

## 1. Visão Geral e Problema
Nos trilhos de recomendação do Akasha (`BookRecommendationRail` e `GameRecommendationRail`), ao abrir o modal de detalhes de uma obra recomendada, o campo destinado à **Sinopse** exibia o motivo da recomendação gerado pelo motor de inteligência/ML (ex.: *"Porque você apreciou obras de George Orwell"*), em vez do resumo/enredo real da obra literária ou do jogo.

Essa anomalia decorria de:
1. **Contrato de DTO Reduzido:** Os tipos de recomendação (`BookRecommendationItem` e `GameRecommendationItem`) no backend e frontend continham apenas o campo `reason: string` e omitiam os campos `description` / `summary` originais das APIs canônicas (Google Books/Open Library e IGDB/Twitch).
2. **Atribuição Indevida no Frontend:** Na tela de biblioteca (`Library.tsx`), os handlers de seleção repassavam `description: book.reason` e `summary: game.reason`, propagando a justificativa do algoritmo de recomendação para os modais e corrompendo o `extraMeta` gravado no banco de dados.
3. **Ausência de Bloco Dedicado no Modal:** Os modais de detalhes (`BookDetailsModal`, `GameDetailsModal`, `MediaDetailsModal`) não possuíam uma seção visual distinta para a explicação do algoritmo de IA/ML, concentrando todo o texto descritivo sob o cabeçalho "SINOPSE".

---

## 2. Requisitos e Solução Arquitetural

1. **Separação Estrita de Domínios de Informação:**
   - **Sinopse (`description` / `summary` / `overview`):** Reservada exclusivamente ao enredo e conteúdo editorial da obra.
   - **Motivo de Recomendação (`reason`):** Reservado à justificativa de relevância calculada pelo Akasha Engine / ML (ex.: afinidade por autor, tema, avaliação prévia ou tendência).

2. **Extensão dos DTOs de Recomendação (Backend & Frontend):**
   - `BookRecommendationItem`: adicionado `description?: string`.
   - `GameRecommendationItem`: adicionado `summary?: string`.
   - `MediaDetails`: adicionado `reason?: string`.
   - `BookDetails`: adicionado `reason?: string`.

3. **Resolução Canônica Resiliente em Modais:**
   - Se o modal for aberto para um item recomendado ou da estante onde a sinopse esteja vazia ou corrompida (idêntica a `reason`), o modal dispara automaticamente uma requisição canônica em background (`GET /books/:id` ou `GET /games/:id`) para recuperar a sinopse original sem bloquear a interface.
   - Ao adicionar ou alterar status a partir do modal, a sinopse canônica correta é preservada na biblioteca.

4. **Design e UX Multiplataforma (TV, Mobile e Desktop):**
   - Criação de um card dedicado:
     `💡 Por que o Akasha recomenda este título?` com fundo semitransparente suave (`var(--color-caramelo-claro)` ou amarelo âmbar), borda delicada e tipografia *Outfit*, separado fisicamente da seção **SINOPSE**.
   - Preservação da acessibilidade por controle remoto (Android TV / D-Pad), compatibilidade *touch* mobile e expansão responsiva desktop.

---

## 3. Matriz de Componentes e Arquivos Alterados

| Componente / Módulo | Caminho do Arquivo | Papel da Alteração |
|---|---|---|
| **Book Rec Service** | `backend/src/services/book-recommendation.service.ts` | Popula `description` nos candidatos e cold start de livros |
| **Game Rec Service** | `backend/src/services/game-recommendation.service.ts` | Popula `summary` nos candidatos e cold start de jogos |
| **Book Types** | `frontend/src/types/book.ts` | Adiciona `description` a `BookRecommendationItem` e `reason` a `BookDetails` |
| **Game Types** | `frontend/src/types/game.ts` | Adiciona `summary` a `GameRecommendationItem` |
| **Media Types** | `frontend/src/types/media.ts` | Adiciona `reason` a `MediaDetails` |
| **Library Page** | `frontend/src/pages/Library.tsx` | Corrige mapeamento de clique dos trilhos sem sobrescrever sinopse |
| **Book Modal** | `frontend/src/components/ui/BookDetailsModal.tsx` | Bloco próprio de recomendação + busca de sinopse canônica |
| **Game Modal** | `frontend/src/components/ui/GameDetailsModal.tsx` | Bloco próprio de recomendação + busca de sinopse canônica |
| **Media Modal** | `frontend/src/components/ui/MediaDetailsModal.tsx` | Bloco próprio de recomendação do Akasha |
| **Rec Rail** | `frontend/src/components/recommendations/RecommendationRail.tsx` | Propaga `reason` no evento `onSelectMedia` |

---

## 4. Testes Automatizados
- `frontend/tests/components/ui/BookDetailsModal.test.tsx`: validação da coexistência harmoniosa de `reason` e `description`.
- `frontend/tests/components/ui/GameDetailsModal.test.tsx`: validação da coexistência harmoniosa de `reason` e `summary`.
- Suíte completa do frontend (164 testes) e backend (157 testes) aprovada com 100% de sucesso.
