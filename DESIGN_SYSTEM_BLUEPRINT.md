# 🎨 BordadoHUB Design System 2.0 — Blueprint Oficial de Rebranding

> **Padrão:** BigTech Fosco & Clean (*Matte Cobalt & Turquoise Dual-Theme*)  
> **Benchmark Visual & UX/UI:** FlowNinja (estrutura de Hero, Marquee 3 colunas, botões translúcidos nítidos, tipografia editorial e adaptação mobile) + Linear/Gumroad  
> **Tipografia Oficial:** `Inter` (`400`, `500`, `600`, `700`)  
> **Status:** Pronto para produção de assets (logos, imagens e micro-vídeos) e implementação por qualquer Designer ou IA.

---

## 1. Kit Oficial de Logomarcas (O que entregar/preparar)

Mantemos o **símbolo icônico de ponto ziguezague (7 pontas)** acima/ao lado do texto **`BordadoHub`** na fonte **Inter Bold/SemiBold** (`tracking-tight`).  
Para qualidade perfeita em telas Retina (4K, iPhone, Mac) sem pixelar nem pesar o site, os arquivos de logo devem seguir estas especificações:

| Variação da Logo | Fundo onde será usada | Cores Exatas da Logo | Formato Ideal & Tamanho | Caminho Destino no Projeto |
| :--- | :--- | :--- | :--- | :--- |
| **1. Logo Principal Dark Mode** | Navbar / Sidebar / Rodapé no **Tema Escuro** (`#0A0F1D`, `#111827`) | Símbolo ziguezague: `#3B82F6` → `#14B8A6` (ou `#3B82F6` sólido) · Texto `"Bordado"`: `#FFFFFF` · Texto `"Hub"`: `#3B82F6` | **SVG vetorial** (preferencial, ~3 KB) + **PNG transparente** `600x260px` (`@2x`) | `public/brand/logo-v2-dark.svg` (e `.png`) |
| **2. Logo Principal Light Mode** | Navbar / Sidebar / Rodapé no **Tema Claro** (`#F8FAFC`, `#FFFFFF`) | Símbolo ziguezague: `#2563EB` · Texto `"Bordado"`: `#0F172A` · Texto `"Hub"`: `#2563EB` | **SVG vetorial** + **PNG transparente** `600x260px` (`@2x`) | `public/brand/logo-v2-light.svg` (e `.png`) |
| **3. Logo Horizontal Compacta** *(opcional para Navbar Mobile/Desktop)* | Barra superior de `64px` de altura (símbolo à esquerda do texto) | Mesmas cores das versões Dark e Light | **SVG** `200x48px` (altura máx. visual `32px–40px`) | `public/brand/logo-v2-horizontal-dark.svg` e `-light.svg` |
| **4. Ícone / App Icon (PWA + Favicon)** | Aba do navegador, iPhone/Android (Tela Inicial PWA), WhatsApp Link Fallback | Símbolo ziguezague `#2563EB` centralizado sobre fundo sólido `#0A0F1D` | **SVG Mestre (`icons.svg` `512×512`)** → gerar PNGs `512×512px`, `180×180px` e `favicon.ico` | `public/brand/Rebrand/icons.svg` |

### ✅ Arquivos Oficiais Já Adicionados em `public/brand/Rebrand/`
| Arquivo Salvo | Tipo / Fundo | Cores Detectadas | Onde & Quando Usar no Rebrand |
| :--- | :--- | :--- | :--- |
| `Logo Horizontal Dark Mode.svg` | Horizontal · Transparente | `#F8FAFC` + `#3B82F6` | Navbar e Sidebar no **Tema Escuro** *(ajustar `viewBox` na aplicação)* |
| `Logo Horizontal Light Mode.svg` | Horizontal · Transparente | `#0A0F1D` + `#3B82F6` | Navbar e Sidebar no **Tema Claro** *(ajustar `viewBox` na aplicação)* |
| `Logo Dark Mode.svg` | Empilhada · Transparente | `#F8FAFC` + `#3B82F6` | Login, Cadastro, Footer e destaques no **Tema Escuro** |
| `Logo Light Mode.svg` | Empilhada · Transparente | `#0A0F1D` + `#3B82F6` | Login, Cadastro, Footer e destaques no **Tema Claro** |
| `logo fundo escuro.svg` | Card sólido `#0F172A` | `#F8FAFC` + `#3B82F6` | Preview OpenGraph/WhatsApp e avatares institucionais escuros |
| `Logo fundo claro.svg` | Card sólido `#F8FAFC` | `#0A0F1D` + `#3B82F6` | Preview OpenGraph/WhatsApp e avatares institucionais claros |
| `icons.svg` | Ícone `512×512` `#0A0F1D` | `#0A0F1D` + `#2563EB` | Fonte para `favicon.ico`, `icon.png` (`512×512`) e `apple-icon.png` (`180×180` sem arredondamento) |

> 💡 **Dica técnica de ouro:** Se você tiver apenas o símbolo em **SVG** (ou PNG em alta resolução), nós mesmos conseguimos gerar todas as versões Light/Dark e todos os tamanhos (`180x180`, `192x192`, `512x512`, horizontal e empilhada) direto no código sem perda de nitidez!

---

## 2. Paleta Oficial de Cores (Harmonia Análoga Fria 60/30/10 — Zero Neon)

A combinação **Azul Cobalto** ($220^\circ$) + **Azul Turquesa/Teal** ($175^\circ$) segue a regra **60% Neutros Foscas / 30% Superfícies & Textos / 10% Acentos de Marca**.

### 🌑 Tokens do Tema Escuro (*Matte Deep Navy & Graphite*)
| Token CSS | Cor HEX | RGB | Onde Usar |
| :--- | :--- | :--- | :--- |
| `--bg-primary` | **`#0A0F1D`** | `10, 15, 29` | Fundo principal da página (*Deep Matte Navy*) |
| `--bg-surface` | **`#111827`** | `17, 24, 39` | Cards padrão, Sidebar e modais |
| `--bg-surface-elevated` | **`#161F33`** | `22, 31, 51` | Cards destacados e hover de superfícies |
| `--border-hairline` | `rgba(255, 255, 255, 0.09)` | — | Borda ultrafina de `1px` em todos os cards e inputs |
| `--border-glass` | `rgba(255, 255, 255, 0.14)` | — | Borda nítida dos botões translúcidos e pills |
| `--text-primary` | **`#FFFFFF`** / **`#F8FAFC`** | `248, 250, 252` | Títulos e subtítulos de máxima leitura |
| `--text-secondary` | **`#94A3B8`** | `148, 163, 184` | Descrições de apoio e metadados |
| `--btn-primary-bg` | **`#FFFFFF`** | `255, 255, 255` | Botão principal sólido do Hero/Navbar (texto `#0A0F1D`) |
| `--btn-glass-bg` | `rgba(255, 255, 255, 0.06)` | — | Fundo translúcido com `backdrop-filter: blur(12px)` |

### ☀️ Tokens do Tema Claro (*Matte Ice & Crisp Slate*)
| Token CSS | Cor HEX | RGB | Onde Usar |
| :--- | :--- | :--- | :--- |
| `--bg-primary` | **`#F8FAFC`** | `248, 250, 252` | Fundo principal limpo (*Matte Ice*) |
| `--bg-surface` | **`#FFFFFF`** | `255, 255, 255` | Cards, modais e barra lateral |
| `--bg-surface-elevated` | **`#F1F5F9`** | `241, 245, 249` | Áreas secundárias, inputs e tags |
| `--border-hairline` | `rgba(15, 23, 42, 0.08)` | — | Borda de precisão `1px` em cards claros |
| `--border-glass` | `rgba(15, 23, 42, 0.14)` | — | Borda dos botões translúcidos no tema claro |
| `--text-primary` | **`#0F172A`** | `15, 23, 42` | Títulos e textos principais (*Deep Slate*) |
| `--text-secondary` | **`#475569`** | `71, 85, 105` | Descrições e labels |
| `--btn-primary-bg` | **`#2563EB`** | `37, 99, 235` | Botão principal sólido (texto `#FFFFFF`) |
| `--btn-glass-bg` | `rgba(15, 23, 42, 0.04)` | — | Fundo translúcido no modo claro |

### 🎯 Cores de Marca, Ação & Confiança (Ambos os Temas)
| Função | Modo Claro | Modo Escuro | Uso Correto |
| :--- | :--- | :--- | :--- |
| **Azul Cobalto Primário** | **`#2563EB`** | **`#3B82F6`** | Links ativos, destaques de marca, botões Cobalto, seleção |
| **Azul Cobalto Hover / Profundo** | **`#1D4ED8`** | **`#2563EB`** | Estado `:hover` e degradês arquitetônicos |
| **Azul Turquesa / Teal Confiança** | **`#0D9488`** | **`#14B8A6`** | Selo de *"Custódia Segura"*, *"Download Imediato"*, status pago/aprovado |
| **Erro / Alerta** | `#DC2626` | `#EF4444` | Somente erros e exclusões |

### 🌫️ Degradês Foscas Oficiais (Permitidos — ZERO Glow / ZERO Shadow Luminoso)
1. **Fundo Arquitetônico do Hero (Escuro):**  
   `linear-gradient(180deg, #0A0F1D 0%, #0F1E45 55%, #0A0F1D 100%)` com faixas horizontais discretas (`repeating-linear-gradient` em `rgba(59, 130, 246, 0.045)`).
2. **Fundo Arquitetônico do Hero (Claro):**  
   `linear-gradient(180deg, #F8FAFC 0%, #EFF6FF 55%, #F8FAFC 100%)` com faixas horizontais sutis em `rgba(37, 99, 235, 0.03)`.
3. **Degradê no Texto do Título (`h1`):**
   - Escuro: `linear-gradient(180deg, #FFFFFF 0%, #93C5FD 100%)`
   - Claro: `linear-gradient(180deg, #0F172A 0%, #1E40AF 100%)`
4. **Degradê Marca Cobalto → Turquesa (Badges/Destaques):**  
   `linear-gradient(135deg, #2563EB 0%, #0D9488 100%)`

---

## 3. Sistema Tipográfico (`Inter` Exclusiva)

| Elemento | Desktop (`>= 1024px`) | Mobile (`390px`) | Peso (`font-weight`) | Tracking & Line-Height |
| :--- | :--- | :--- | :--- | :--- |
| **`H1` (Título do Hero)** | `56px` (`3.5rem`) | `36px` (`2.25rem`) | `600` (SemiBold) | `-0.035em` / `1.06` |
| **`H2` (Títulos de Seção)** | `40px` (`2.5rem`) | `28px` (`1.75rem`) | `600` (SemiBold) | `-0.03em` / `1.12` |
| **`H3` (Títulos de Cards)** | `20px` (`1.25rem`) | `18px` (`1.125rem`) | `600` (SemiBold) | `-0.02em` / `1.3` |
| **Subtítulo do Hero** | `18px` (`1.125rem`) | `16px` (`1rem`) | `400` (Regular) | `-0.01em` / `1.55` |
| **Corpo / Descrições** | `15px` (`0.9375rem`) | `15px` | `400` (Regular) | `0` / `1.6` |
| **Botões & Navbar** | `14px` (`0.875rem`) | `15px` (legível) | `600` (SemiBold) | `-0.01em` / `1` |
| **Micro-badges / Formatos** | `12px` (`0.75rem`) | `12px` | `500` (Medium) | `+0.02em` / `1` |

---

## 4. Materiais Visuais da Lateral (Marquee 3 Colunas) — Imagens & Vídeos Ultraleves

No padrão **FlowNinja**, o lado direito do Hero exibe **3 colunas verticais em movimento contínuo** (Colunas 1 e 3 sobem; Coluna 2 desce). No Mobile (`390px`), essas 3 colunas descem e ficam logo abaixo dos 2 botões.

Para que essas imagens e micro-vídeos **NÃO deixem o site pesado nem lento no 4G**:

### 📸 A. Imagens dos Cards Laterais (Recomendado: 9 a 12 fotos no total — 3 a 4 por coluna)
- **O que mostrar:** Fotos nítidas e de alto impacto do seu universo real:
  1. Close macro de bordado pronto no tecido (ponto cheio em alto relevo, brasão escolar, logo empresarial bordado em polo/boné).
  2. Comparativo "Arte / Logo → Matriz Bordada Real".
  3. Print limpo da tela do software (Wilcom/Embird mostrando os pontos coloridos da matriz).
  4. Pacotes/coleções populares (ex.: Infantil, Floral, Patches).
- **Proporção Exata:** **`3:4` (Vertical / Retrato)** — exatamente como os cards laterais do FlowNinja!
- **Dimensões em Pixels:** **`600 x 800 px`** (ou no máximo `750 x 1000 px`). *Nunca usar fotos 4000px direto do celular.*
- **Formato & Peso Máximo:** **`WebP` ou `AVIF`** (o Next.js `<Image>` também converte, mas já subir leve economiza banda), com **35 KB a 90 KB por imagem**.
- **Regra Total da Galeria:** Somando todas as 12 imagens, o peso total fica abaixo de **900 KB** (menos de 1 segundo no 4G!).

### 🎥 B. Vídeos Curtos em Loop no Marquee (Opcional — Máximo 2 a 3 cards com vídeo!)
> ⚠️ **Atenção de Performance:** Colocar 12 vídeos pesados travaria o celular da bordadeira. O segredo BigTech é **mesclar 9 fotos WebP + no máximo 2 ou 3 micro-vídeos mudos** (ex.: máquina bordadeira trabalhando em close ou simulação rápida de pontos do Wilcom).
- **Formato Obrigatório:** **`.mp4` (codec H.264 sem faixa de áudio)** + opcional **`.webm` (VP9)** para compressão ainda menor. **JAMAIS use `.GIF`** (um GIF de 4 segundos pesa 8 MB; um MP4 mudo pesa 350 KB!).
- **Duração:** **`3 a 5 segundos`** em loop contínuo (`autoPlay loop muted playsInline`).
- **Resolução:** **`480 x 640 px`** (proporção `3:4`), **24 ou 30 fps**, sem áudio.
- **Peso Máximo por Vídeo:** **Até `500 KB` a `700 KB`** (com *poster* estático `.webp` carregando instantaneamente antes do play).

### 🏷️ C. Badges de Formatos / Marcas (Faixa abaixo do Hero — Logowall Marquee)
- Ícones/textos monocromáticos limpos (`.PES Brother`, `.DST Tajima`, `.JEF Janome`, `.EXP Bernina`, `.XXX Singer`, `.EMB Wilcom`, `Barudan`, `SWF`) em SVG leve (`< 2 KB` cada).

---

## 5. Checklist de Anatomia dos Componentes (Para Execução na `staging`)

1. **Navbar (`64px` fixa):** `backdrop-filter: blur(20px)`, borda `1px` inferior, Logo adaptativa Claro/Escuro, links centrais limpos, botão **Trocar Tema (Sol/Lua)** e CTA primário à direita. Menu mobile de `100dvh` sem cortar o 1º item no topo.
2. **Hero Assimétrico:** Fundo arquitetônico com degradê fosco Cobalto, lado esquerdo com Pill + H1 (`Inter SemiBold` com degradê no texto) + Subtítulo sólido + 2 botões (`48px` de altura no mobile: *"Pedir Matriz Agora"* sólido + *"Explorar Marketplace"* translúcido nítido), lado direito com Marquee 3 colunas.
3. **Seção 2 (Faixa de Confiança + Formatos Compatíveis):** Logowall horizontal contínua no mobile e grid/faixa limpa no desktop.
4. **Seção 3 (Vitrine Ágil do Marketplace):** Filtros rápidos + cards foscas `1px border` com foto `4:3`, formatos `.PES/.DST/.JEF`, preço destacado e botão direto.
5. **Seção 4 (3 Cards Estilo Case FlowNinja):** *Encomenda Sob Medida*, *Marketplace Instantâneo*, *Garantia em Custódia* — com degradês foscas sem glow e métricas abaixo (`90% Programador`, `85% Loja`, `PIX / 12x`).
