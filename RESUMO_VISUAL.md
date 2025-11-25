# 🎯 Resumo Visual - 3 Passos Principais

## 1️⃣ TESTAR LOCAL (30 min)

```
┌─────────────────────────────────────────┐
│ 1. Instalar dependências                │
│    npm install --legacy-peer-deps       │
└─────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│ 2. Configurar Supabase                  │
│    • Criar conta em supabase.com        │
│    • Criar projeto                      │
│    • Copiar 3 keys (URL, anon, service) │
│    • Executar sql/init_tables.sql       │
│    • Criar 2 buckets (deliveries,       │
│      portfolio)                          │
└─────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│ 3. Criar .env.local                     │
│    • Duplicar .env.example              │
│    • Renomear para .env.local           │
│    • Colar as 3 keys do Supabase        │
└─────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│ 4. Rodar projeto                        │
│    npm run dev                          │
│    Abrir: http://localhost:3000         │
└─────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│ 5. Testar                               │
│    • Cadastrar cliente                  │
│    • Criar job                          │
│    • Cadastrar criador (janela anônima) │
│    • Enviar proposta                    │
│    • Aceitar proposta                   │
│    ✅ Funcionou!                        │
└─────────────────────────────────────────┘
```

---

## 2️⃣ SUBIR PARA GITHUB (5 min)

```
┌─────────────────────────────────────────┐
│ 1. Criar repositório no GitHub          │
│    github.com → New repository          │
│    Nome: bordadohub                     │
└─────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│ 2. Enviar código (PowerShell)           │
│    git init                             │
│    git add .                            │
│    git commit -m "Initial commit"       │
│    git branch -M main                   │
│    git remote add origin <URL>          │
│    git push -u origin main              │
└─────────────────────────────────────────┘
```

---

## 3️⃣ DEPLOY NO VERCEL (10 min)

```
┌─────────────────────────────────────────┐
│ 1. Criar conta no Vercel                │
│    vercel.com → Sign up with GitHub     │
└─────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│ 2. Importar projeto                     │
│    Add New → Project                    │
│    Selecionar: bordadohub               │
│    Import                               │
└─────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│ 3. ⚠️ IMPORTANTE: Adicionar Env Vars    │
│    ❗ ANTES de fazer deploy             │
│                                         │
│    Expandir "Environment Variables"     │
│    Adicionar uma por uma:               │
│                                         │
│    NEXT_PUBLIC_SUPABASE_URL            │
│    NEXT_PUBLIC_SUPABASE_ANON_KEY       │
│    SUPABASE_SERVICE_ROLE_KEY           │
│    MERCADO_PAGO_PUBLIC_KEY (opcional)  │
│    MERCADO_PAGO_ACCESS_TOKEN (opcional)│
│    PAYPAL_CLIENT_ID (deixe vazio)      │
│    PAYPAL_SECRET (deixe vazio)         │
│    NEXTAUTH_URL (URL do Vercel)        │
│    NODE_ENV=production                 │
│                                         │
│    Cole os valores do .env.local       │
└─────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│ 4. Deploy                               │
│    Clicar em "Deploy"                   │
│    Aguardar 2-3 min                     │
│    🎉 Pronto!                           │
└─────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│ 5. Atualizar NEXTAUTH_URL               │
│    Copiar URL (ex: bordadohub.vercel...)│
│    Settings → Environment Variables     │
│    Editar NEXTAUTH_URL → Colar URL real │
│    Deployments → Redeploy               │
└─────────────────────────────────────────┘
```

---

## 📍 ONDE COLOCAR AS CHAVES API

### Para Teste Local (.env.local)

```
Localização: Raiz do projeto
Arquivo: .env.local (você cria duplicando .env.example)

NEXT_PUBLIC_SUPABASE_URL=          ← Supabase → Settings → API
NEXT_PUBLIC_SUPABASE_ANON_KEY=     ← Supabase → Settings → API  
SUPABASE_SERVICE_ROLE_KEY=         ← Supabase → Settings → API (Reveal)
MERCADO_PAGO_PUBLIC_KEY=           ← MP Developers → Credenciais de teste
MERCADO_PAGO_ACCESS_TOKEN=         ← MP Developers → Credenciais de teste
```

### Para Produção (Vercel)

```
Localização: Painel do Vercel
Onde: Settings → Environment Variables → Add New

Adicione as MESMAS variáveis do .env.local
(copie e cole os valores)
```

---

## 🔑 Onde Conseguir Cada Chave

| Chave | Onde Conseguir | Instruções |
|-------|----------------|------------|
| **Supabase URL** | supabase.com | Projeto → Settings → API → Project URL |
| **Supabase Anon Key** | supabase.com | Projeto → Settings → API → anon public |
| **Supabase Service Key** | supabase.com | Projeto → Settings → API → service_role (Reveal) |
| **Mercado Pago Public** | mercadopago.com.br/developers | Suas integrações → App → Credenciais de teste |
| **Mercado Pago Token** | mercadopago.com.br/developers | Suas integrações → App → Credenciais de teste |
| **PayPal Client ID** | developer.paypal.com | Apps & Credentials → Sandbox → Create App |
| **PayPal Secret** | developer.paypal.com | Apps & Credentials → Sandbox → Create App |

---

## ⚡ Comandos Rápidos

### Primeira vez
```bash
npm install --legacy-peer-deps
npm run dev
```

### Se der erro no npm install
```bash
npm cache clean --force
npm install --legacy-peer-deps
```

### Para fazer deploy de nova versão
```bash
git add .
git commit -m "Descrição da mudança"
git push
# Deploy automático no Vercel!
```

---

## 📚 Documentação Completa

Para guia detalhado com prints e explicações:
👉 **Leia: `COMO_TESTAR_E_DEPLOYAR.md`**

Para início super rápido:
👉 **Leia: `QUICKSTART.md`**

Para entender tudo sobre o projeto:
👉 **Leia: `PROJECT_OVERVIEW.md`**

---

## ✅ Checklist Rápido

### Teste Local
- [ ] `npm install` sem erros
- [ ] Conta Supabase criada
- [ ] Tabelas SQL executadas
- [ ] Buckets criados
- [ ] `.env.local` com 3 keys do Supabase
- [ ] `npm run dev` rodando
- [ ] Consigo cadastrar e criar job

### Deploy
- [ ] Código no GitHub
- [ ] Conta Vercel criada
- [ ] Projeto importado
- [ ] 9 env vars adicionadas no Vercel
- [ ] Deploy concluído (🎉)
- [ ] Site acessível pela URL

---

**Dúvida? Veja o arquivo `COMO_TESTAR_E_DEPLOYAR.md` para versão completa!**
