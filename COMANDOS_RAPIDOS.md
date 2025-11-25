# 🚀 Comandos Rápidos - BordadoHub

## Desenvolvimento Local

### Iniciar servidor de desenvolvimento
```bash
cd C:\APPS\BordadoHUB
npm run dev
```
Acesse: http://localhost:3000

### Parar servidor
`Ctrl + C` no terminal

### Reinstalar dependências
```bash
npm install --legacy-peer-deps
```

---

## Git & GitHub

### Status do repositório
```bash
git status
```

### Adicionar alterações
```bash
git add .
```

### Commitar alterações
```bash
git commit -m "Descrição das alterações"
```

### Enviar para GitHub
```bash
git push origin main
```

### Puxar atualizações
```bash
git pull origin main
```

### Criar nova branch
```bash
git checkout -b nome-da-feature
```

### Voltar para main
```bash
git checkout main
```

---

## Vercel (Deploy)

### Deploy via Git (Automático)
1. Faça commit das alterações
2. Push para GitHub
3. Vercel faz redeploy automático ✨

### Deploy manual via CLI
```bash
# Instalar Vercel CLI (primeira vez)
npm i -g vercel

# Login
vercel login

# Deploy
vercel
```

### Ver logs de produção
```bash
vercel logs
```

---

## Banco de Dados (Supabase)

### Acessar dashboard
https://supabase.com/dashboard

### Executar SQL
1. SQL Editor no dashboard
2. Cole o SQL
3. RUN (Ctrl/Cmd + Enter)

### Ver tabelas
Table Editor → Selecione a tabela

### Ver storage
Storage → Selecione o bucket

---

## Variáveis de Ambiente

### Local (.env.local)
```bash
# Editar
notepad .env.local

# Após editar, reinicie o servidor
# Ctrl+C, depois npm run dev
```

### Produção (Vercel)
1. https://vercel.com/
2. Projeto → Settings → Environment Variables
3. Editar e salvar (redeploy automático)

---

## Troubleshooting Rápido

### Erro: "Cannot find module"
```bash
npm install --legacy-peer-deps
```

### Erro: "Port 3000 already in use"
```bash
# No PowerShell
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Ou mude a porta
set PORT=3001 && npm run dev
```

### Erro: Missing environment variables
1. Verifique `.env.local` existe
2. Verifique tem TODAS as variáveis
3. Reinicie o servidor

### Erro: Git push rejected
```bash
git pull origin main
# Resolva conflitos se houver
git push origin main
```

### Build falha na Vercel
1. Verifique logs na aba "Deployments"
2. Verifique environment variables
3. Tente build local:
```bash
npm run build
```

---

## Testes Rápidos

### Testar build de produção local
```bash
npm run build
npm start
```

### Limpar cache do Next.js
```bash
rm -rf .next
npm run dev
```

### Ver versões instaladas
```bash
node --version
npm --version
git --version
```

---

## Links Úteis

| Serviço | Dashboard |
|---------|-----------|
| **GitHub** | https://github.com/SEU-USUARIO/bordadohub |
| **Vercel** | https://vercel.com/dashboard |
| **Supabase** | https://supabase.com/dashboard |
| **Mercado Pago** | https://www.mercadopago.com.br/developers |
| **PayPal** | https://developer.paypal.com/dashboard |

---

## Estrutura de Arquivos

```
BordadoHUB/
├── src/
│   ├── app/              # Páginas Next.js (App Router)
│   │   ├── api/          # API Routes
│   │   ├── dashboard/    # Dashboard (cliente/criador)
│   │   ├── jobs/         # Listagem e detalhes de jobs
│   │   └── ...
│   ├── components/       # Componentes React
│   │   ├── Navbar.tsx
│   │   └── JobCard.tsx
│   └── lib/              # Utilitários
│       ├── supabaseClient.js
│       ├── payments.js
│       └── helpers.js
├── sql/                  # Scripts SQL
│   └── init_tables.sql
├── public/               # Arquivos estáticos
├── .env.local            # Variáveis de ambiente (LOCAL)
├── .env.example          # Template de env vars
└── package.json
```

---

## Fluxo de Trabalho Recomendado

### Desenvolvimento
1. `git pull` (puxar atualizações)
2. `npm run dev` (iniciar servidor)
3. Fazer alterações
4. Testar localmente
5. `git add .` → `git commit -m "..."` → `git push`
6. Vercel faz deploy automático

### Adicionar Feature
1. `git checkout -b nova-feature`
2. Desenvolver e testar
3. `git add .` → `git commit`
4. `git checkout main` → `git merge nova-feature`
5. `git push`

---

## Atalhos do Editor (VS Code)

- `Ctrl + P` - Buscar arquivo
- `Ctrl + Shift + F` - Buscar em todos arquivos
- `Ctrl + B` - Toggle sidebar
- `Ctrl + ~` - Abrir terminal
- `F5` - Iniciar debug
- `Ctrl + Shift + P` - Command Palette

---

**Dica**: Salve este arquivo nos favoritos para consulta rápida! 📌
