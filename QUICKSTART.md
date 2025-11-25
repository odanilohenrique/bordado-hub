# 🚀 Quick Start - BordadoHub

Este guia vai te ajudar a ter o projeto funcionando em **menos de 30 minutos**.

## Passo 1: Instalar Dependências (2 min)

```bash
npm install --legacy-peer-deps
```

> ⚠️ **Importante**: Use `--legacy-peer-deps` devido ao React 19.

---

## Passo 2: Criar Conta no Supabase (5 min)

1. Acesse https://supabase.com/
2. Clique em **"Start your project"** → Faça login com GitHub
3. **"New Project"**:
   - Nome: `bordadohub`
   - Password: Crie e **anote**
   - Region: South America
4. Aguarde 2 minutos para criar

---

## Passo 3: Configurar Banco de Dados (3 min)

### 3.1 - Obter Credenciais

1. No Supabase, vá em **Settings** (engrenagem) → **API**
2. Copie:
   - **Project URL**
   - **anon/public key**
   - **service_role key** (clique em "Reveal")

### 3.2 - Configurar .env.local

1. Duplique `.env.example` → Renomeie para `.env.local`
2. Cole as credenciais do Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUz...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUz...
```

### 3.3 - Criar Tabelas

1. No Supabase, vá em **SQL Editor** → **New Query**
2. Abra `sql/init_tables.sql` deste projeto
3. Copie **TODO** o conteúdo
4. Cole no SQL Editor
5. Clique em **RUN** (ou Ctrl/Cmd + Enter)
6. Deve aparecer "Success"

### 3.4 - Criar Storage Buckets

1. No Supabase, vá em **Storage**
2. **New bucket**:
   - Name: `deliveries`
   - Public: ❌ NÃO
   - Create
3. **New bucket** novamente:
   - Name: `portfolio`
   - Public: ✅ SIM
   - Create

---

## Passo 4: Configurar Mercado Pago (OPCIONAL - 5 min)

> ⚠️ Pode pular este passo e adicionar depois. O site vai funcionar sem pagamentos.

1. Acesse https://www.mercadopago.com.br/developers
2. Faça login (crie conta se necessário)
3. **"Suas integrações"** → **"Criar aplicação"**
4. Nome: BordadoHub → Produto: Pagamentos online
5. Após criar, vá em **"Credenciais de teste"**
6. Copie para `.env.local`:

```env
MERCADO_PAGO_PUBLIC_KEY=TEST-xxxxxxxx
MERCADO_PAGO_ACCESS_TOKEN=TEST-xxxxxxxx
```

---

## Passo 5: Rodar o Projeto (1 min)

```bash
npm run dev
```

Aguarde aparecer:
```
✓ Ready in 3s
○ Local:        http://localhost:3000
```

---

## Passo 6: Testar! (5 min)

1. Abra http://localhost:3000
2. Clique em **"Cadastrar"**
3. Crie um usuário **Cliente**:
   - Nome: João
   - Email: joao@test.com
   - Senha: 123456
   - Tipo: Cliente
4. No Dashboard, clique em **"Novo Pedido"**
5. Preencha e publique

6. **Abra janela anônima** (Ctrl+Shift+N)
7. Cadastre usuário **Criador**:
   - Nome: Maria
   - Email: maria@test.com
   - Senha: 123456
   - Tipo: Criador
8. Você verá o job postado
9. Clique e envie uma proposta!

---

## ✅ Funcionou? Próximos Passos

Se chegou até aqui, parabéns! Seu marketplace está funcionando.

### Para Publicar na Internet (15 min):

1. Crie repositório no GitHub
2. Faça push do código
3. Acesse https://vercel.com/
4. Importe o repositório
5. Adicione as mesmas variáveis do `.env.local` nas Environment Variables
6. Deploy!

📖 **Guia completo**: Veja `walkthrough.md` para instruções detalhadas.

---

## ❌ Deu Erro?

### "Cannot find module 'react'"
```bash
npm install --legacy-peer-deps
```

### "Missing environment variables"
Verifique se o `.env.local` tem TODAS as variáveis do Supabase.

### "RLS policy violation"
Certifique-se de ter executado TODO o `init_tables.sql`.

### Outro erro?
Abra o `README.md` → Seção **Troubleshooting**

---

## 📚 Documentação Completa

- **README.md**: Documentação geral
- **walkthrough.md**: Guia passo a passo completo (200+ linhas)
- **SUMMARY.md**: Resumo executivo do projeto
- **task.md**: Checklist de funcionalidades

---

**Dúvidas?** Leia primeiro o `walkthrough.md` - ele tem praticamente tudo! 

Bom desenvolvimento! 🚀
