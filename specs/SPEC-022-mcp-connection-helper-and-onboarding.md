# SPEC-022: Facilitador de Conexão e Onboarding de Agentes de IA (MCP)

## 1. Visão Geral & Contexto
O Akasha possui suporte nativo ao **Model Context Protocol (MCP)** via transporte SSE e descoberta automática OAuth 2.0. No entanto, o painel de gerenciamento de privacidade (`PrivacySettingsPanel`) apresentava o card *Agentes Conectados (MCP)* de forma estritamente passiva e reativa (apenas listagem e botão de revogação). Quando nenhum agente estava conectado, o usuário visualizava apenas a mensagem estática *"Nenhum agente de IA conectado no momento"*, sem qualquer instrução de como iniciar uma integração, qual endpoint utilizar ou como configurar clientes externos (Claude Desktop, Google Spark, Cursor).

Esta especificação define a implementação de uma experiência de onboarding fluida, prática e orientada a "1-Click Copy", permitindo que qualquer viajante conecte seus assistentes de IA de forma intuitiva, tanto em telas touch (mobile), desktop e navegadores de TV (Android TV via D-Pad).

---

## 2. Requisitos Funcionais
1. **Exibição Dinâmica do Endpoint MCP:**
   - Expor a URL do endpoint SSE do servidor MCP (`/mcp/sse`), resolvida dinamicamente a partir da variável `VITE_BACKEND_URL` ou fallback de ambiente de produção (`https://akasha-backend.onrender.com/mcp/sse`).
2. **Cópia Rápida em 1-Clique (Clipboard):**
   - Botão para copiar a URL direta do endpoint MCP.
   - Botão para copiar o bloco completo de configuração JSON no formato padrão esperado por **Claude Desktop** e **Cursor**:
     ```json
     {
       "mcpServers": {
         "akasha": {
           "url": "https://akasha-backend.onrender.com/mcp/sse"
         }
       }
     }
     ```
   - Feedback visual imediato de sucesso ("Copiado!" com ícone de confirmação) e desaparecimento temporizado.
3. **Modal de Guia e Onboarding ("Como Conectar"):**
   - Botão no cabeçalho do painel de Agentes Conectados para acionar um modal com instruções passo a passo.
   - Instruções específicas e separadas para:
     - **Claude Desktop & Cursor** (Arquivo de configuração e URL SSE).
     - **Google Spark & Clientes OAuth Web** (Descoberta automática via URL base).
   - Descrição dos poderes e permissões concedidas (consulta ao acervo, recomendações e notas) e garantia de revogabilidade imediata (LGPD Art. 18, IX).
4. **Acessibilidade Universal (TV, Mobile e Desktop):**
   - Todos os botões com `tabIndex={0}` e classe de foco visual `tv-focus-glow`.
   - Modais com foco inicial no botão de fechar para controle remoto D-Pad e backdrop com fechamento acessível.
   - Touch targets mínimos de 44x44px para dispositivos móveis.

---

## 3. Arquitetura e Componentes
* **Componente:** `frontend/src/components/privacy/PrivacySettingsPanel.tsx`
  - Inclusão dos estados `showMcpModal`, `copiedType` ('url' | 'json' | null).
  - Subcomponente de cópia rápida inline no card de agentes.
  - Modal acessível com tabs/seções visuais Liquid Glass.
* **Utilitário de Resolução de URL:**
  - Extração de `getBackendBaseUrl()` e `getMcpSseUrl()`.
* **Suíte de Testes:**
  - `frontend/tests/components/privacy/PrivacySettingsPanel.test.tsx` com cobertura para cliques de cópia, renderização do modal e fluxo de teclado D-Pad.

---

## 4. Conformidade e Segurança
* As credenciais do usuário **nunca** são expostas nos snippets de cópia; a autenticação permanece delegada ao fluxo OAuth 2.0 / token efêmero emitido após login consentido pelo titular.
* O direito de revogação de acessos concedidos é mantido e destacado ao usuário.
