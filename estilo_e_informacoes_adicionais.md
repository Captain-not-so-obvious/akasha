# Design System & Identidade do APK: AKASHA

**Propósito deste Documento:** Servir como o guia definitivo de Interface do Usuário (UI), Experiência do Usuário (UX) e Branding para a criação do frontend e do empacotamento do APK do aplicativo Akasha para Android TV.

---

## 1. Branding e Conceito
* **Nome do App:** Akasha
* **Conceito:** Inspirado nos "Registros Akáshicos" (a biblioteca universal da mitologia hindu). O aplicativo não é apenas um rastreador, mas um compêndio épico e ancestral de histórias, construído com tecnologia moderna.
* **Vibe:** Elegante, orgânico, monumental.

---

## 2. Paleta de Cores (Variáveis CSS Root)

A paleta foge do padrão neon/dark mode tradicional, focando em tons terrosos, profundos e quentes.

* **`--color-floresta-negra` (#283618)**
  * *Uso:* Background principal do aplicativo, cantos de tela, sombras profundas. Traz o peso e o contraste.
* **`--color-folha-oliva` (#606c38)**
  * *Uso:* Background secundário, áreas de respiro, gradientes de fundo para criar volume e profundidade no cenário.
* **`--color-seda-milharal` (#fefae0)**
  * *Uso:* Tipografia principal, ícones, e a base transparente para o efeito de vidro (veja a seção Liquid Glass). É a cor da clareza e da leitura.
* **`--color-caramelo-claro` (#dda15e)**
  * *Uso:* Destaques primários, estado de foco (`:focus`) na navegação da TV, botões de ação principal ("Assistir", "Adicionar à Lista").
* **`--color-cobre` (#bc6c25)**
  * *Uso:* Acentos de design, bordas ativas secundárias, estrelas de avaliação, detalhes de profundidade nos botões.

---

## 3. Tipografia (Google Fonts)

* **Primária (Títulos, Logos, Nomes de Filmes/Séries): `Cinzel`**
  * *Peso Recomendado:* 400 (Regular), 700 (Bold).
  * *Característica:* Fonte serifada de proporções clássicas e romanas. Traz a aura de "monumento" e "épico" para o nome Akasha e para os títulos.
* **Secundária (Sinopses, Menus, UI, Metadados): `Outfit`**
  * *Peso Recomendado:* 300 (Light), 400 (Regular), 600 (SemiBold).
  * *Característica:* Fonte sans-serif geométrica e limpa. Garante legibilidade impecável a 3 metros de distância da tela da TV.

---

## 4. Estética Principal: Liquid Glass (Glassmorfismo)

Nenhum card ou painel de interface deve ser totalmente opaco. A interface flutua sobre o fundo (Floresta/Oliva) usando vidro fosco iluminado.

**Classe CSS Padrão para Cards e Painéis (`.glass-panel`):**
```css
.glass-panel {
  /* Fundo de Seda no Milharal com 8% a 10% de opacidade */
  background: rgba(254, 250, 224, 0.08); 
  
  /* Efeito de desfoque do vidro */
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  
  /* Borda sutil simulando o reflexo da luz no vidro */
  border: 1px solid rgba(254, 250, 224, 0.15);
  
  /* Sombra escura para destacar do fundo */
  box-shadow: 0 12px 40px 0 rgba(40, 54, 24, 0.5); 
  
  border-radius: 16px;
}
```

---

## 5. UI/UX Otimizado para Android TV (D-Pad)

A interação não ocorre somente por mouse ou toque, mas sim pelas setas direcionais do controle remoto.

* **Regra de Foco:** O navegador da TV precisa saber onde o usuário está. O outline padrão do browser deve ser ocultado (`outline: none;`).
* **Estado de Foco (`:focus` / `:focus-visible`):** Quando um pôster ou botão for selecionado, ele deve saltar da tela e brilhar com a cor destaque.

**Exemplo de Comportamento para o Card de Filme em Foco:**
```css
.movie-card:focus {
  transform: scale(1.08); /* Card salta em direção ao usuário */
  transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
  
  /* Borda muda de vidro transparente para Ouro/Caramelo brilhante */
  border-color: var(--color-caramelo-claro); 
  
  /* Brilho da cor de destaque atrás do vidro */
  box-shadow: 0 0 24px rgba(221, 161, 94, 0.5), 
              0 16px 40px rgba(40, 54, 24, 0.8);
}
```

---

## 6. Diretrizes para os Ativos do APK

Quando for gerar os arquivos estáticos para o empacotamento do Capacitor (`icon.png` e `splash.png`):

* **Ícone do App (Logo Akasha):** * Fundo sólido na cor Floresta Negra (`#283618`).
  * A letra "A" centralizada ou a palavra "AKASHA" usando a fonte `Cinzel`.
  * A cor do texto/letra deve ser o degradê sutil do Seda no Milharal (`#fefae0`) para o Caramelo Claro (`#dda15e`).
* **Splash Screen (Tela de Carregamento):**
  * Fundo sólido Folha de Oliva (`#606c38`) ou gradiente escuro das cores de base.
  * Logo centralizada. Sem textos adicionais para manter a estética de cinema.