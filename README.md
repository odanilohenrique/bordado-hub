# BordadoHub - Marketplace de Matrizes de Bordado

Este é um MVP (Produto Mínimo Viável) de um marketplace para conectar clientes e criadores de matrizes de bordado.

## Funcionalidades

- **Clientes**: Postam pedidos (Jobs), recebem propostas, pagam via Mercado Pago ou PayPal, e baixam os arquivos.
- **Criadores**: Enviam propostas, entregam arquivos e recebem pagamentos (simulado/split).
- **Pagamentos**: Sistema de Escrow (o valor fica retido até a aprovação).
- **Taxas**: R$ 5,00 do cliente + R$ 5,00 do criador por transação.

## Pré-requisitos

Para rodar este projeto, você precisará de contas nos seguintes serviços (gratuitos para desenvolvimento):

1.  **Node.js**: Instale a versão 18 ou superior (https://nodejs.org/).
2.  **Supabase**: Para Banco de Dados e Autenticação (https://supabase.com/).
3.  **Mercado Pago**: Para processar pagamentos no Brasil (https://www.mercadopago.com.br/developers).
4.  **PayPal**: Para processar pagamentos internacionais (https://developer.paypal.com/).
5.  **Vercel**: Para hospedar o site (https://vercel.com/).
6.  **GitHub**: Para armazenar o código.

---

## Passo a Passo para Instalação e Configuração

### 1. Configuração Local

1.  **Clone ou Baixe o Repositório**:
    Se você baixou o zip, extraia em uma pasta.
    Se usar git: `git clone <url-do-repo>`

2.  **Instale as Dependências**:
    Abra o terminal na pasta do projeto e rode:
    ```bash
    npm install
    ```

3.  **Configure as Variáveis de Ambiente**:
    - Duplique o arquivo `.env.example` e renomeie para `.env.local`.
    - Preencha os valores (veja as seções abaixo como obter cada chave).

### 2. Configurando o Supabase (Banco de Dados)

1.  Crie um novo projeto no [Supabase](https://supabase.com/).
2.  Vá em **Project Settings -> API**.
3.  Copie a `Project URL` e cole em `NEXT_PUBLIC_SUPABASE_URL` no seu `.env.local`.
4.  Copie a `anon` `public` key e cole em `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5.  Copie a `service_role` `secret` key e cole em `SUPABASE_SERVICE_ROLE_KEY`. **CUIDADO**: Essa chave dá acesso total ao banco, nunca a compartilhe.
6.  Vá no menu **SQL Editor** no Supabase.
7.  Clique em **New Query**.
8.  Copie o conteúdo do arquivo `sql/init_tables.sql` deste projeto e cole no editor.
9.  Clique em **Run** para criar as tabelas e as regras de segurança.
10. Vá em **Storage** no menu lateral.
    - Crie um bucket chamado `deliveries` (privado).
    - Crie um bucket chamado `portfolio` (público).
    - Configure as policies (regras) para permitir upload/download (ou use o SQL Editor para isso se souber, mas pelo painel é fácil: "New Policy" -> "Give users access to their own folder" ou similar).

### 3. Configurando Pagamentos

#### Mercado Pago
1.  Acesse [Suas Integrações](https://www.mercadopago.com.br/developers/panel).
2.  Crie uma aplicação.
3.  Vá em **Credenciais de produção** (ou Teste para sandbox).
4.  Copie a `Public Key` para `MERCADO_PAGO_PUBLIC_KEY`.
5.  Copie o `Access Token` para `MERCADO_PAGO_ACCESS_TOKEN`.

#### PayPal
1.  Acesse [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/).
2.  Vá em **Apps & Credentials** -> **Sandbox** -> **Create App**.
3.  Copie o `Client ID` para `PAYPAL_CLIENT_ID`.
4.  Copie o `Secret` para `PAYPAL_SECRET`.

### 4. Rodando o Projeto

No terminal, execute:

```bash
npm run dev
```

Acesse `http://localhost:3000` no seu navegador.

---

## Deploy (Colocar no Ar)

### Usando Vercel

1.  Crie um repositório no GitHub e suba seu código.
2.  Acesse o [Vercel](https://vercel.com/) e clique em **Add New...** -> **Project**.
3.  Importe seu repositório do GitHub.
4.  Na configuração do projeto, abra a seção **Environment Variables**.
5.  Adicione TODAS as variáveis que você configurou no `.env.local` (Supabase, Mercado Pago, PayPal, etc.).
6.  Clique em **Deploy**.

### Webhooks (Notificações de Pagamento)

Para que o sistema saiba quando um pagamento foi aprovado automaticamente:

1.  **Mercado Pago**: Nas configurações da sua aplicação no Mercado Pago, coloque a URL de notificação: `https://seu-projeto.vercel.app/api/payments/mercadopago/webhook`.
2.  **PayPal**: No App do PayPal Developer, adicione um Webhook para o evento `CHECKOUT.ORDER.APPROVED` apontando para `https://seu-projeto.vercel.app/api/payments/paypal/webhook`.

---

## Transformando em App (PWA)

Este projeto já está configurado como um site responsivo. Para criar um app instalável:

1.  **PWA**: O Next.js pode ser configurado como PWA. Adicione um `manifest.json` na pasta `public`.
2.  **App Nativo (Android/iOS)**:
    - Instale o Capacitor: `npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios`.
    - Inicialize: `npx cap init`.
    - Gere a versão estática do site: `npm run build` (configure `output: 'export'` no `next.config.ts` se necessário, ou use o wrapper do Capacitor).
    - Adicione plataformas: `npx cap add android`.
    - Abra o projeto nativo: `npx cap open android`.

---

## Troubleshooting (Erros Comuns)

-   **Erro de Permissão (RLS)**: Se não conseguir ver dados, verifique se rodou o script SQL completo.
-   **Pagamento não atualiza**: Verifique se os Webhooks estão configurados corretamente e se a URL do Vercel está acessível publicamente.
-   **Imagens não carregam**: Verifique se os buckets no Supabase Storage foram criados e se o bucket `portfolio` está como "Public".

---

Desenvolvido com Next.js, Tailwind CSS e Supabase.
