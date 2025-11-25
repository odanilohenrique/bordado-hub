# 🚀 Guia Completo de Deploy - BordadoHub

## 📋 Índice

1. [GitHub - Criar Repositório e Upload](#1-github---criar-repositório-e-upload)
2. [Supabase - Banco de Dados e Storage](#2-supabase---banco-de-dados-e-storage)
3. [Vercel - Deploy em Produção](#3-vercel---deploy-em-produção)
4. [Verificação Final](#4-verificação-final)

---

## Status Atual

✅ **Git Inicializado**: Repositório local criado com commit inicial  
✅ **Código Pronto**: 46 arquivos commitados (10,437 linhas)  
⏳ **Próximo Passo**: Criar repositório no GitHub

---

## 1. GitHub - Criar Repositório e Upload

### Tempo Estimado: 5 minutos

### Passo 1.1: Criar Repositório no GitHub

1. Acesse https://github.com
2. Faça login (ou crie conta se não tiver)
3. Clique no botão **"+"** no canto superior direito
4. Selecione **"New repository"**

### Passo 1.2: Configurar Repositório

Preencha os campos:

- **Repository name**: `bordadohub` (ou o nome que preferir)
- **Description** (opcional): `Marketplace de bordados conectando clientes e bordadeiras`
- **Public ou Private**: 
  - ✅ **Private** se quiser manter privado
  - ✅ **Public** se quiser código aberto
- **❌ NÃO** marque "Initialize with README" (já temos o código!)
- **❌ NÃO** adicione .gitignore (já temos!)
- **❌ NÃO** escolha license agora

5. Clique em **"Create repository"**

### Passo 1.3: Conectar Repositório Local

Após criar, o GitHub vai mostrar instruções. Você verá algo como:

```bash
git remote add origin https://github.com/SEU-USUARIO/bordadohub.git
git branch -M main
git push -u origin main
```

✅ **EXECUTE ESTES COMANDOS** no PowerShell da pasta do projeto:

```powershell
# Navegue até a pasta
cd C:\APPS\BordadoHUB

# Adicione o remote (substitua SEU-USUARIO pelo seu usuário GitHub!)
git remote add origin https://github.com/SEU-USUARIO/bordadohub.git

# Renomeie branch para main
git branch -M main

# Faça o push
git push -u origin main
```

> [!IMPORTANT]
> Substitua `SEU-USUARIO` pelo seu nome de usuário do GitHub!

### Passo 1.4: Autenticação

Se for a primeira vez usando Git no PC, o GitHub vai pedir autenticação:

- **Opção 1**: Login via navegador (mais fácil)
- **Opção 2**: Personal Access Token

Siga as instruções na tela.

### ✅ Verificação

Após o push, acesse https://github.com/SEU-USUARIO/bordadohub

Você deve ver todos os arquivos do projeto! 🎉

---

## 2. Supabase - Banco de Dados e Storage

### Tempo Estimado: 15 minutos

### Passo 2.1: Criar Projeto

1. Acesse https://supabase.com/
2. Clique em **"Start your project"**
3. Faça login:
   - **GitHub** (recomendado - mais rápido)
   - Ou crie conta com email

4. Clique em **"New Project"**

### Passo 2.2: Configurar Projeto

Preencha:

- **Name**: `bordadohub`
- **Database Password**: 
  - Clique em **"Generate a password"** (recomendado)
  - ⚠️ **COPIE E SALVE** esta senha em um local seguro!
- **Region**: **South America (São Paulo)** 🇧🇷
- **Pricing Plan**: **Free** (até 500MB - suficiente para começar)

5. Clique em **"Create new project"**  
6. ⏳ Aguarde 2-3 minutos (vai preparar o banco)

### Passo 2.3: Obter Credenciais

Após o projeto ser criado:

1. Vá em **Settings** ⚙️ (menu lateral esquerdo, embaixo)
2. Clique em **API**
3. Você verá estas informações:

```
Project URL: https://xxxxxxxxxxxxx.supabase.co
anon public: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Passo 2.4: Salvar Credenciais Localmente

1. Abra o arquivo **`C:\APPS\BordadoHUB\.env.local`**
2. Substitua os valores placeholder:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6Ik... (sua chave anon)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6Ik... (sua chave service_role - clique em Reveal)
```

3. **Salve o arquivo** (Ctrl+S)

### Passo 2.5: Criar Tabelas no Banco de Dados

1. No Supabase, vá em **SQL Editor** 📝 (menu lateral esquerdo)
2. Clique em **"+ New query"**
3. Abra o arquivo **`C:\APPS\BordadoHUB\sql\init_tables.sql`** no seu editor
4. **Copie TODO o conteúdo** (Ctrl+A, Ctrl+C)
5. **Cole no SQL Editor** do Supabase (Ctrl+V)
6. Clique em **"RUN"** (ou pressione `Ctrl + Enter`)

Você verá a mensagem:

```
✅ Success. No rows returned
```

### Passo 2.6: Verificar Tabelas Criadas

1. Vá em **Table Editor** 📊 (menu lateral esquerdo)
2. Você deve ver estas tabelas:
   - ✅ `users`
   - ✅ `jobs`
   - ✅ `proposals`
   - ✅ `payments`

### Passo 2.7: Criar Buckets de Storage

1. Vá em **Storage** 🗃️ (menu lateral esquerdo)
2. Clique em **"New bucket"**

**Bucket 1 - Deliveries (Privado)**:
- Name: `deliveries`
- Public bucket: **❌ NÃO** (deixe desmarcado)
- Clique em **"Create bucket"**

**Bucket 2 - Portfolio (Público)**:
- Clique em **"New bucket"** novamente
- Name: `portfolio`
- Public bucket: **✅ SIM** (marque esta opção)
- Clique em **"Create bucket"**

### ✅ Verificação Supabase

Checklist:
- ✅ Projeto criado
- ✅ Credenciais copiadas para `.env.local`
- ✅ Tabelas criadas (4 tabelas visíveis)
- ✅ 2 buckets criados (deliveries + portfolio)

---

## 3. Vercel - Deploy em Produção

### Tempo Estimado: 10 minutos

### Passo 3.1: Criar Conta na Vercel

1. Acesse https://vercel.com/
2. Clique em **"Start Deploying"** ou **"Sign Up"**
3. **Faça login com GitHub** (recomendado - mais fácil!)
4. Autorize a Vercel a acessar seus repositórios

### Passo 3.2: Importar Repositório

1. No dashboard da Vercel, clique em **"Add New..."** → **"Project"**
2. Você verá a lista dos seus repositórios do GitHub
3. Encontre **`bordadohub`**
4. Clique em **"Import"**

### Passo 3.3: Configurar Projeto

Na tela de configuração:

- **Project Name**: `bordadohub` (pode deixar como está)
- **Framework Preset**: **Next.js** (deve detectar automaticamente)
- **Root Directory**: `./` (padrão)
- **Build Command**: `npm run build` (padrão)
- **Output Directory**: `.next` (padrão)

### Passo 3.4: IMPORTANTE - Configurar Variáveis de Ambiente

Antes de fazer o deploy, você PRECISA adicionar as variáveis de ambiente!

Na mesma tela, role até **"Environment Variables"**:

Adicione estas variáveis (pegue os valores do seu arquivo `.env.local`):

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUz...` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUz...` |
| `NODE_ENV` | `production` |

> [!WARNING]
> **NÃO pule este passo!** Sem as variáveis de ambiente, a aplicação não vai funcionar!

Para adicionar cada variável:
1. Digite o **Name** (ex: `NEXT_PUBLIC_SUPABASE_URL`)
2. Digite o **Value** (ex: `https://xxxxx.supabase.co`)
3. Clique em **"Add"**
4. Repita para todas as variáveis

### Passo 3.5: Deploy!

1. Após adicionar TODAS as variáveis, clique em **"Deploy"**
2. ⏳ Aguarde 2-5 minutos (vai instalar dependências e fazer build)
3. Você verá o progresso em tempo real

### Passo 3.6: Verificar Deploy

Após concluir, você verá 🎉 **"Congratulations!"**

1. Clique em **"Visit"** ou no preview da aplicação
2. Seu site estará online em uma URL como:
   ```
   https://bordadohub-xxxxx.vercel.app
   ```

### ✅ Verificação Vercel

- ✅ Deploy concluído com sucesso
- ✅ Site acessível publicamente
- ✅ Homepage carrega corretamente
- ✅ Páginas de login/cadastro funcionam

---

## 4. Verificação Final

### Teste 1: Cadastro de Usuário

1. Acesse seu site: `https://bordadohub-xxxxx.vercel.app`
2. Clique em **"Cadastrar"**
3. Crie um usuário **Cliente**:
   - Nome: Teste Cliente
   - Email: cliente@test.com
   - Senha: teste123
   - Tipo: **Cliente**
4. Clique em **"Cadastrar"**

✅ **Deve funcionar** e redirecionar para o dashboard!

### Teste 2: Criar Pedido

1. No dashboard do cliente, clique em **"Novo Pedido"**
2. Preencha os campos
3. Publique o pedido

✅ **Deve criar o pedido** e aparecer na lista!

### Teste 3: Criar Usuário Criador

1. Abra uma **janela anônima** (Ctrl+Shift+N)
2. Acesse seu site novamente
3. Cadastre como **Criador**:
   - Nome: Teste Criador
   - Email: criador@test.com
   - Senha: teste123
   - Tipo: **Criador**

✅ **Deve ver os pedidos disponíveis!**

---

## 🎉 Parabéns!

Seu BordadoHub está **ONLINE** e funcionando em produção! 🚀

| Serviço | Status | URL |
|---------|--------|-----|
| **GitHub** | ✅ Online | `https://github.com/SEU-USUARIO/bordadohub` |
| **Vercel** | ✅ Deployed | `https://bordadohub-xxxxx.vercel.app` |
| **Supabase** | ✅ Rodando | Dashboard do Supabase |

---

## 📱 Próximos Passos (Opcional)

Agora que está funcionando, você pode:

1. **Configurar Pagamentos**: Veja o [Guia de APIs](#) (próximo documento)
2. **Domínio Customizado**: Adicionar `www.bordadohub.com.br`
3. **Analytics**: Adicionar Google Analytics
4. **SEO**: Otimizar para busca
5. **Melhorias**: Adicionar mais funcionalidades

---

## 🆘 Problemas Comuns

### Deploy falhou na Vercel
→ Verifique se adicionou TODAS as variáveis de ambiente

### "Missing Supabase environment variables"
→ Verifique se as variáveis estão corretas (sem espaços, etc)

### Erro ao criar usuário
→ Verifique se executou o SQL completo no Supabase

### Erro ao fazer upload
→ Verifique se criou os 2 buckets de storage

### Site não carrega
→ Verifique o log de deploy na Vercel (aba "Deployments")

---

## 📚 Documentos Relacionados

- [Guia de Configuração de APIs](./GUIA_CONFIGURACAO_APIS.md) - Mercado Pago e PayPal
- [README.md](../README.md) - Documentação geral
- [Troubleshooting](../README.md#troubleshooting) - Mais soluções de problemas

---

**Dúvidas?** Releia o guia passo a passo ou verifique os logs de erro!
