# 🚀 Como Testar e Deployar o BordadoHub

## Parte 1: Testar Localmente (30 minutos)

### Passo 1: Instalar Dependências

Abra o PowerShell na pasta do projeto e execute:

```bash
# Limpar cache do npm (importante!)
npm cache clean --force

# Instalar dependências
npm install --legacy-peer-deps
```

> ⏱️ **Aguarde**: Isso pode levar 2-5 minutos.

Se der erro, tente:
```bash
# Deletar node_modules se existir
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue

# Instalar novamente
npm install --legacy-peer-deps --prefer-offline
```

---

### Passo 2: Configurar Supabase

#### 2.1 - Criar Conta e Projeto

1. Acesse: https://supabase.com/
2. Clique em **"Start your project"**
3. Faça login com GitHub (recomendado) ou email
4. Clique em **"New Project"**
5. Preencha:
   - **Organization**: Escolha ou crie uma
   - **Name**: `bordadohub`
   - **Database Password**: Crie uma senha forte (ANOTE!)
   - **Region**: `South America (São Paulo)`
6. Clique em **"Create new project"**
7. ⏱️ **Aguarde 2 minutos** enquanto o projeto é criado

#### 2.2 - Copiar Credenciais

1. Quando o projeto estiver pronto, clique no ícone de **Settings** (engrenagem) no menu lateral
2. Vá em **API**
3. Você verá 3 informações importantes:

**Project URL:**
```
https://xxxxxxxxxx.supabase.co
```

**anon public (API key):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS...
```

**service_role (API key):**
- Clique em **"Reveal"** ao lado de `service_role`
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS...
```

#### 2.3 - Criar Arquivo .env.local

1. Na pasta do projeto, **duplique** o arquivo `.env.example`
2. **Renomeie** a cópia para `.env.local`
3. Abra `.env.local` no VS Code (ou Bloco de Notas)
4. **Cole suas credenciais do Supabase**:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Mercado Pago (deixe vazio por enquanto)
MERCADO_PAGO_PUBLIC_KEY=
MERCADO_PAGO_ACCESS_TOKEN=

# PayPal (deixe vazio por enquanto)
PAYPAL_CLIENT_ID=
PAYPAL_SECRET=

# App
NEXTAUTH_URL=http://localhost:3000
NODE_ENV=development
```

> ⚠️ **IMPORTANTE**: Nunca compartilhe o arquivo `.env.local`! Ele contém suas chaves secretas.

#### 2.4 - Criar Tabelas no Banco de Dados

1. No Supabase, vá em **SQL Editor** (ícone `</>` no menu lateral)
2. Clique em **"New Query"**
3. Abra o arquivo `sql/init_tables.sql` do projeto (pode usar VS Code)
4. **Copie TODO o conteúdo** (Ctrl+A, Ctrl+C)
5. **Cole** no SQL Editor do Supabase
6. Clique em **"Run"** (ou pressione `Ctrl+Enter`)
7. ✅ Deve aparecer: **"Success. No rows returned"**

#### 2.5 - Criar Buckets de Storage

1. No Supabase, vá em **Storage** (ícone de pasta no menu lateral)
2. Clique em **"New bucket"**

**Primeiro bucket:**
- Name: `deliveries`
- Public bucket: ❌ **Não marque** (deve ficar privado)
- Clique em **"Create bucket"**

**Segundo bucket:**
- Clique em **"New bucket"** novamente
- Name: `portfolio`
- Public bucket: ✅ **Marque** (público)
- Clique em **"Create bucket"**

---

### Passo 3: Rodar o Projeto

No PowerShell, execute:

```bash
npm run dev
```

Aguarde aparecer:
```
✓ Ready in 3s
○ Local:        http://localhost:3000
```

**Abra seu navegador** em: http://localhost:3000

🎉 **Você deve ver a landing page do BordadoHub!**

---

### Passo 4: Testar o Fluxo Completo

#### 4.1 - Criar Conta de Cliente

1. Clique em **"Cadastrar"** (canto superior direito)
2. Preencha:
   - **Nome**: João Silva
   - **Email**: joao@teste.com
   - **Senha**: 123456
   - **Eu sou**: Selecione **"Cliente (Quero comprar)"**
3. Clique em **"Criar Conta"**
4. ✅ Você será redirecionado para o Dashboard do Cliente

#### 4.2 - Criar um Job

1. No Dashboard, clique em **"Novo Pedido"**
2. Preencha:
   - **Título**: Logo da Empresa em Matriz DST
   - **Descrição**: Preciso do logo da minha empresa em formato DST, tamanho 10x10cm, cores azul e branco
   - **Prazo**: Escolha uma data futura (ex: próxima semana)
3. Clique em **"Publicar Pedido"**
4. ✅ Você voltará para o Dashboard e verá seu job listado

#### 4.3 - Criar Conta de Criador

1. **Abra uma janela anônima** no navegador (Ctrl+Shift+N no Chrome)
2. Acesse: http://localhost:3000
3. Clique em **"Cadastrar"**
4. Preencha:
   - **Nome**: Maria Bordados
   - **Email**: maria@teste.com
   - **Senha**: 123456
   - **Eu sou**: Selecione **"Criador (Faço matrizes)"**
5. Clique em **"Criar Conta"**
6. ✅ Você será redirecionado para o Dashboard do Criador

#### 4.4 - Enviar Proposta

1. No Dashboard do Criador, você verá o job que João criou
2. Clique no job para ver os detalhes
3. Role até a seção de **"Propostas"**
4. Preencha:
   - **Valor (R$)**: 50.00
   - **Mensagem**: Tenho 5 anos de experiência criando matrizes de bordado. Posso entregar em 2 dias!
5. Clique em **"Enviar Proposta"**
6. ✅ A página recarregará mostrando "Sua Proposta"

#### 4.5 - Aceitar Proposta (Como Cliente)

1. **Volte para a janela normal** (janela do Cliente)
2. Vá em **"Meus Pedidos"**
3. Clique no job que você criou
4. Role até a seção **"Propostas"**
5. Você verá a proposta de Maria (R$ 50,00)
6. Clique em **"Aceitar"**
7. ✅ Você será redirecionado para a página de **Checkout**

#### 4.6 - Ver Checkout

Na página de Checkout, você verá:
- Valor do Serviço: R$ 50,00
- Taxa de Serviço (Cliente): R$ 5,00
- **Total a Pagar: R$ 55,00**

> **Nota**: O botão de pagamento funcionará após configurar Mercado Pago (próxima seção).

---

### Passo 5 (OPCIONAL): Configurar Mercado Pago para Testes

#### 5.1 - Criar Conta no Mercado Pago

1. Acesse: https://www.mercadopago.com.br/developers
2. Faça login (ou crie conta se não tiver)
3. Aceite os termos de desenvolvedor

#### 5.2 - Criar Aplicação

1. Clique em **"Suas integrações"** (menu lateral)
2. Clique em **"Criar aplicação"**
3. Preencha:
   - **Nome da aplicação**: BordadoHub
   - **Selecione o produto**: Pagamentos online
4. Clique em **"Criar aplicação"**

#### 5.3 - Copiar Credenciais de Teste

1. Após criar, você verá a tela da aplicação
2. Vá na aba **"Credenciais de teste"**
3. Copie as duas chaves:

**Public Key:**
```
TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**Access Token:**
```
TEST-xxxxxxxxxxxx-xxxxxx-xxxxxxxxxxxxxxxxxxxxxxxx-xxxxxxxxxxxx
```

#### 5.4 - Adicionar no .env.local

Abra seu `.env.local` e atualize:

```env
MERCADO_PAGO_PUBLIC_KEY=TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MERCADO_PAGO_ACCESS_TOKEN=TEST-xxxxxxxxxxxx-xxxxxx-xxxxxxxxxxxxxxxxxxxxxxxx-xxxxxxxxxxxx
```

#### 5.5 - Reiniciar o Servidor

No PowerShell onde está rodando o projeto:
1. Pressione `Ctrl+C` para parar
2. Execute novamente: `npm run dev`

#### 5.6 - Testar Pagamento (Sandbox)

1. Volte à página de Checkout
2. Clique em **"Pagar com Mercado Pago"**
3. Você será redirecionado para o checkout do Mercado Pago
4. Use os dados de teste:
   - **Cartão**: 5031 4332 1540 6351
   - **Vencimento**: 11/25
   - **CVV**: 123
   - **Titular**: APRO (para aprovar) ou OTHE (para rejeitar)
5. Confirme o pagamento
6. ✅ Você será redirecionado de volta ao Dashboard

---

## Parte 2: Deploy no Vercel (15 minutos)

### Passo 1: Criar Repositório no GitHub

#### 1.1 - Criar Repositório

1. Acesse: https://github.com/
2. Faça login (ou crie conta)
3. Clique no **"+"** (canto superior direito) → **"New repository"**
4. Preencha:
   - **Repository name**: `bordadohub`
   - **Description**: Marketplace de Matrizes de Bordado
   - **Public** ou **Private**: Escolha (recomendo Private)
   - ❌ **NÃO marque** "Initialize with README"
5. Clique em **"Create repository"**

#### 1.2 - Copiar Comandos

Você verá uma página com comandos. **Não feche ainda**.

#### 1.3 - Preparar o Projeto

No PowerShell, na pasta do projeto, execute (linha por linha):

```bash
# Inicializar git (se ainda não foi)
git init

# Adicionar todos os arquivos
git add .

# Criar primeiro commit
git commit -m "Initial commit - BordadoHub MVP"

# Renomear branch para main
git branch -M main

# Adicionar repositório remoto (SUBSTITUA com a URL do seu repo)
git remote add origin https://github.com/SEU-USUARIO/bordadohub.git

# Enviar código
git push -u origin main
```

> **Importante**: Substitua `SEU-USUARIO` pelo seu nome de usuário do GitHub.

✅ **Código enviado!** Atualize a página do GitHub para ver os arquivos.

---

### Passo 2: Deploy no Vercel

#### 2.1 - Criar Conta no Vercel

1. Acesse: https://vercel.com/
2. Clique em **"Start Deploying"** ou **"Sign Up"**
3. Escolha **"Continue with GitHub"** (recomendado)
4. Autorize o Vercel a acessar sua conta GitHub

#### 2.2 - Importar Projeto

1. Na dashboard do Vercel, clique em **"Add New..."** → **"Project"**
2. Você verá a lista dos seus repositórios do GitHub
3. Encontre **"bordadohub"**
4. Clique em **"Import"**

#### 2.3 - Configurar Projeto

1. **Framework Preset**: Deve detectar automaticamente "Next.js"
2. **Root Directory**: Deixe como está (./)
3. **Build Command**: `npm run build` (já está preenchido)
4. **Output Directory**: Deixe vazio (Next.js cuida disso)

#### 2.4 - IMPORTANTE: Adicionar Variáveis de Ambiente

**ANTES DE CLICAR EM DEPLOY**, expanda a seção **"Environment Variables"**.

Adicione TODAS estas variáveis (uma por vez):

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Copie do seu `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Copie do seu `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | Copie do seu `.env.local` |
| `MERCADO_PAGO_PUBLIC_KEY` | Copie do seu `.env.local` (ou deixe vazio) |
| `MERCADO_PAGO_ACCESS_TOKEN` | Copie do seu `.env.local` (ou deixe vazio) |
| `PAYPAL_CLIENT_ID` | Deixe vazio por enquanto |
| `PAYPAL_SECRET` | Deixe vazio por enquanto |
| `NEXTAUTH_URL` | `https://seu-projeto.vercel.app` (estimado, atualize depois) |
| `NODE_ENV` | `production` |

**Como adicionar cada variável:**
1. Digite o **Name** (ex: `NEXT_PUBLIC_SUPABASE_URL`)
2. Cole o **Value** correspondente
3. Clique em **"Add"**
4. Repita para todas as variáveis

#### 2.5 - Deploy!

1. Após adicionar todas as variáveis, clique em **"Deploy"**
2. ⏱️ **Aguarde 2-3 minutos**
3. Você verá confetes 🎉 quando concluir

#### 2.6 - Atualizar NEXTAUTH_URL

1. Copie a URL do seu projeto (ex: `https://bordadohub-abc123.vercel.app`)
2. No Vercel, vá em **Settings** (aba superior)
3. Vá em **"Environment Variables"** (menu lateral)
4. Encontre `NEXTAUTH_URL`
5. Clique nos **"..."** → **"Edit"**
6. Substitua pela URL real: `https://bordadohub-abc123.vercel.app`
7. Clique em **"Save"**

#### 2.7 - Redeploy

1. Vá na aba **"Deployments"**
2. Clique nos **"..."** do deploy mais recente
3. Clique em **"Redeploy"**
4. Marque ✅ **"Use existing Build Cache"**
5. Clique em **"Redeploy"**

---

### Passo 3: Configurar Webhooks (OPCIONAL - se configurou Mercado Pago)

#### 3.1 - Obter URL do Webhook

Sua URL de webhook será:
```
https://seu-projeto.vercel.app/api/payments/mercadopago/webhook
```

Substitua `seu-projeto.vercel.app` pela URL real do Vercel.

#### 3.2 - Adicionar no Mercado Pago

1. Volte para https://www.mercadopago.com.br/developers
2. Vá em **"Suas integrações"** → Selecione sua aplicação
3. Procure por **"Webhooks"** ou **"Notificações"**
4. Clique em **"Configurar notificações"**
5. Cole a URL: `https://seu-projeto.vercel.app/api/payments/mercadopago/webhook`
6. Selecione eventos:
   - ✅ **Pagamentos**
   - ✅ **payment** (se tiver opção específica)
7. Salve

---

## 🎉 Pronto! Seu Site Está no Ar!

Acesse: `https://seu-projeto.vercel.app`

### Testar em Produção

Repita os testes que fez localmente:
1. Cadastre cliente
2. Crie job
3. Cadastre criador (janela anônima)
4. Envie proposta
5. Aceite e pague (se configurou MP)

---

## 📋 Checklist Completo

### Teste Local
- [ ] npm install concluído sem erros
- [ ] .env.local criado e preenchido
- [ ] Supabase configurado (tabelas + buckets)
- [ ] npm run dev rodando
- [ ] Consegui criar conta de cliente
- [ ] Consegui criar job
- [ ] Consegui criar conta de criador
- [ ] Consegui enviar proposta
- [ ] Consegui aceitar proposta
- [ ] Vi página de checkout

### Deploy
- [ ] Código no GitHub
- [ ] Projeto importado no Vercel
- [ ] Todas env vars adicionadas
- [ ] Deploy concluído
- [ ] NEXTAUTH_URL atualizado
- [ ] Site acessível publicamente
- [ ] Teste completo funcionando online

---

## ❓ Perguntas Frequentes

**P: Deu erro no npm install. O que fazer?**
R: Execute:
```bash
npm cache clean --force
Remove-Item -Recurse -Force node_modules
npm install --legacy-peer-deps
```

**P: Esqueci minha senha do Supabase**
R: Não há problema, ela é só para o dashboard. O importante são as API keys.

**P: Posso usar domínio próprio?**
R: Sim! No Vercel → Settings → Domains → Add Domain

**P: Como ver os logs de erros?**
R: Vercel → Seu Projeto → Functions → Selecione a função → Logs

**P: Os webhooks não estão funcionando**
R: Certifique-se:
1. URL está correta (https://)
2. Vercel deployment está ativo
3. Mercado Pago está em modo test
4. Verifique logs no Vercel

---

## 🆘 Precisa de Ajuda?

1. **Erro de setup**: Veja o README.md → Seção Troubleshooting
2. **Dúvidas conceituais**: Leia o walkthrough.md
3. **Visão geral**: Consulte PROJECT_OVERVIEW.md

Boa sorte! 🚀
