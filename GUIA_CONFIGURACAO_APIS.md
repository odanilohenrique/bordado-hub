# 💳 Guia de Configuração de APIs de Pagamento

## 📋 Índice

1. [Mercado Pago - Brasil](#1-mercado-pago---brasil)
2. [PayPal - Internacional](#2-paypal---internacional)
3. [Adicionar Credenciais na Vercel](#3-adicionar-credenciais-na-vercel)
4. [Testar Pagamentos](#4-testar-pagamentos)

---

## Visão Geral

O BordadoHub suporta dois gateways de pagamento:

| Gateway | Região | Quando Usar |
|---------|--------|-------------|
| **Mercado Pago** | 🇧🇷 Brasil/LATAM | Clientes brasileiros (PIX, boleto, cartão) |
| **PayPal** | 🌍 Mundial | Clientes internacionais |

> [!TIP]
> Você pode configurar apenas um deles inicialmente. Recomendo começar com **Mercado Pago** se seu público é brasileiro.

---

## 1. Mercado Pago - Brasil

### Tempo Estimado: 15 minutos (Sandbox) | 30 minutos (Produção)

### Passo 1.1: Criar Conta de Desenvolvedor

1. Acesse https://www.mercadopago.com.br/developers
2. Faça login com sua conta Mercado Pago
   - Se não tiver, clique em **"Criar conta"**
   - Use um email válido (vai precisar confirmar)

### Passo 1.2: Criar Aplicação

1. No dashboard de desenvolvedores, vá em **"Suas integrações"**
2. Clique em **"Criar aplicação"**
3. Preencha:
   - **Nome da aplicação**: `BordadoHub`
   - **Produto**: Selecione **"Pagamentos online"**
   - **Tipo de integração**: **"Checkout Pro"** ou **"Checkout API"**
4. Clique em **"Criar aplicação"**

### Passo 1.3: Obter Credenciais de TESTE (Sandbox)

1. Após criar a aplicação, vá em **"Credenciais"**
2. Você verá duas abas:
   - **Credenciais de teste** (Sandbox - para testar)
   - **Credenciais de produção** (Real - para vender de verdade)

3. Na aba **"Credenciais de teste"**, copie:

```
Public Key: TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
Access Token: TEST-xxxxxxxxxxxx-xxxxxx-xxxxxxxxxxxxxxxxxxxxxxxx-xxxxxxxxxx
```

### Passo 1.4: Obter Credenciais de PRODUÇÃO (Para Produção)

> [!WARNING]
> Só faça isso quando estiver pronto para receber pagamentos reais!

1. Na aba **"Credenciais de produção"**
2. Clique em **"Ativar credenciais de produção"**
3. Você pode precisar:
   - Completar dados da empresa
   - Validar identidade
   - Aguardar aprovação (pode levar alguns dias)

4. Após aprovação, copie:

```
Public Key: APP-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
Access Token: APP-xxxxxxxxxxxx-xxxxxx-xxxxxxxxxxxxxxxxxxxxxxxx-xxxxxxxxxx
```

### Passo 1.5: Entender as Taxas

O Mercado Pago cobra:
- **4,99%** + R$ 0,39 por transação (PIX, débito, crédito à vista)
- Valores podem variar, veja: https://www.mercadopago.com.br/costs-section/market-place

> [!IMPORTANT]
> O BordadoHub adiciona **10% de taxa da plataforma** além das taxas do Mercado Pago.

### ✅ Checklist Mercado Pago

- [ ] Conta de desenvolvedor criada
- [ ] Aplicação criada
- [ ] Credenciais de TESTE copiadas
- [ ] (Opcional) Credenciais de PRODUÇÃO obtidas

---

## 2. PayPal - Internacional

### Tempo Estimado: 15 minutos (Sandbox) | 30 minutos (Produção)

### Passo 2.1: Criar Conta de Desenvolvedor

1. Acesse https://developer.paypal.com/
2. Clique em **"Log in to Dashboard"**
3. Faça login com sua conta PayPal
   - Se não tiver, clique em **"Sign Up"**
   - Recomendo usar a mesma conta PayPal que vai receber os pagamentos

### Passo 2.2: Criar App

1. No dashboard, vá em **"Apps & Credentials"**
2. Certifique-se de estar na aba **"Sandbox"** (para testes)
3. Na seção **"REST API apps"**, clique em **"Create App"**
4. Preencha:
   - **App Name**: `BordadoHub`
   - **Merchant**: Selecione a conta sandbox
5. Clique em **"Create App"**

### Passo 2.3: Obter Credenciais SANDBOX (Teste)

Após criar o app, você verá:

```
Client ID: AXXXXXXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Secret: EXXXXXXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> [!TIP]
> Clique em **"Show"** ao lado de Secret para revelar a chave completa.

### Passo 2.4: Criar Contas de Teste

Para testar pagamentos, você precisa de contas sandbox:

1. Vá em **"Sandbox"** → **"Accounts"**
2. Você verá 2 contas criadas automaticamente:
   - **Personal** (comprador)
   - **Business** (vendedor/você)

3. Anote o email e senha dessas contas (clique no "•••" → "View/Edit account")

### Passo 2.5: Obter Credenciais de PRODUÇÃO

> [!WARNING]
> Só faça isso quando estiver pronto para receber pagamentos reais!

1. No dashboard, mude para a aba **"Live"** (em vez de Sandbox)
2. Clique em **"Create App"** (novamente, mas para produção)
3. Nome: `BordadoHub Production`
4. Copie as credenciais:

```
Client ID: AXXXXXXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Secret: EXXXXXXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Passo 2.6: Configurar Webhook (Importante!)

Para receber notificações de pagamentos:

1. No seu app (Sandbox ou Live), role até **"Webhooks"**
2. Clique em **"Add Webhook"**
3. **Webhook URL**: `https://SEU-SITE.vercel.app/api/payments/paypal/webhook`
   - Substitua `SEU-SITE` pela URL do seu Vercel
4. **Event types**: Selecione:
   - ✅ `PAYMENT.CAPTURE.COMPLETED`
   - ✅ `PAYMENT.CAPTURE.DENIED`
   - ✅ `PAYMENT.CAPTURE.REFUNDED`
5. Clique em **"Save"**

### Passo 2.7: Entender as Taxas

O PayPal cobra (Brasil):
- **4,99%** + taxa fixa (varia por país)
- Transações internacionais: **+ 3,9%** de conversão
- Veja mais: https://www.paypal.com/br/webapps/mpp/merchant-fees

> [!IMPORTANT]
> O BordadoHub adiciona **10% de taxa da plataforma** além das taxas do PayPal.

### ✅ Checklist PayPal

- [ ] Conta de desenvolvedor criada
- [ ] App criado
- [ ] Credenciais SANDBOX copiadas
- [ ] Contas de teste sandbox anotadas
- [ ] Webhook configurado (URL do Vercel)
- [ ] (Opcional) Credenciais LIVE obtidas

---

## 3. Adicionar Credenciais na Vercel

### Para Ambiente de TESTE (Sandbox)

1. Acesse https://vercel.com/
2. Vá no seu projeto **BordadoHub**
3. Clique em **"Settings"** → **"Environment Variables"**
4. Adicione as variáveis:

#### Mercado Pago (Teste)

| Name | Value |
|------|-------|
| `MERCADO_PAGO_PUBLIC_KEY` | `TEST-xxxxxxxx-xxxx-xxxx...` |
| `MERCADO_PAGO_ACCESS_TOKEN` | `TEST-xxxxxxxxxxxx-xxxx...` |

#### PayPal (Sandbox)

| Name | Value |
|------|-------|
| `PAYPAL_CLIENT_ID` | `AXXXXXXxxxxxxxxxxxxxxx...` |
| `PAYPAL_SECRET` | `EXXXXXXxxxxxxxxxxxxxxx...` |
| `PAYPAL_MODE` | `sandbox` |

5. Clique em **"Save"**

### Para Ambiente de PRODUÇÃO

Quando estiver pronto para receber pagamentos reais:

1. **EDITE** as variáveis existentes (não crie novas):
   - `MERCADO_PAGO_PUBLIC_KEY` → Substitua por `APP-xxxx...`
   - `MERCADO_PAGO_ACCESS_TOKEN` → Substitua por `APP-xxxx...`
   - `PAYPAL_CLIENT_ID` → Substitua pelas credenciais LIVE
   - `PAYPAL_SECRET` → Substitua pelas credenciais LIVE
   - `PAYPAL_MODE` → Mude para `live`

2. Clique em **"Save"**
3. A Vercel vai fazer um **redeploy automático**

> [!CAUTION]
> **NUNCA** tenha credenciais de produção misturadas com sandbox! Escolha um ou outro.

---

## 4. Testar Pagamentos

### Teste Local (com Sandbox)

1. Atualize seu `.env.local` com as credenciais sandbox:

```env
# Mercado Pago (Sandbox)
MERCADO_PAGO_PUBLIC_KEY=TEST-xxxxxxxx
MERCADO_PAGO_ACCESS_TOKEN=TEST-xxxxxxxx

# PayPal (Sandbox)
PAYPAL_CLIENT_ID=AXXXXxxxxx
PAYPAL_SECRET=EXXXXxxxxx
PAYPAL_MODE=sandbox
```

2. Reinicie o servidor local:
```bash
# Pare o servidor (Ctrl+C) e inicie novamente
npm run dev
```

### Teste em Produção (Vercel com Sandbox)

Após adicionar as credenciais na Vercel:

#### Testar Mercado Pago

1. Acesse seu site: `https://seu-site.vercel.app`
2. Crie um pedido e aceite uma proposta
3. Na tela de pagamento, clique em **"Pagar com Mercado Pago"**
4. Use os **cartões de teste** do Mercado Pago:

**Cartões de Teste (Sandbox)**:

| Status | Número do Cartão | CVV | Validade |
|--------|------------------|-----|----------|
| ✅ Aprovado | `5031 4332 1540 6351` | 123 | 11/25 |
| ❌ Recusado | `5031 7557 3453 0604` | 123 | 11/25 |
| ⏳ Pendente | `5031 4332 1540 6351` | 123 | 11/25 |

**Nome**: APRO (aprovado) ou OTHE (recusado)  
**CPF**: 12345678909

Mais cartões de teste: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-content/test-cards/

#### Testar PayPal

1. Na tela de pagamento, clique em **"Pagar com PayPal"**
2. Será redirecionado para o PayPal
3. Faça login com a conta **Personal** do Sandbox que você criou
4. Complete o pagamento

> [!TIP]
> Você pode ver os pagamentos de teste no dashboard do PayPal Sandbox.

### Verificar Webhooks

Para confirmar que os webhooks estão funcionando:

**Mercado Pago**:
1. Dashboard → Sua aplicação → Webhooks
2. Veja os eventos recebidos

**PayPal**:
1. Developer Dashboard → Webhooks
2. Clique no webhook → **"Webhook events"**
3. Veja os eventos disparados

---

## 🎉 Configuração Completa!

Checklist final:

- [ ] Mercado Pago configurado (sandbox ou produção)
- [ ] PayPal configurado (sandbox ou produção)
- [ ] Credenciais adicionadas na Vercel
- [ ] Redeploy feito (automático ao salvar env vars)
- [ ] Pagamento teste funcionou
- [ ] Webhooks recebendo eventos

---

## 💰 Fluxo de Pagamento no BordadoHub

### Como Funciona

1. **Cliente** cria um pedido
2. **Criador** envia uma proposta com valor
3. **Cliente** aceita a proposta
4. Sistema calcula:
   - Valor do criador: R$ 100,00
   - **Taxa da plataforma (10%)**: R$ 10,00
   - **Taxa do gateway (~5%)**: R$ 5,50
   - **Total cobrado do cliente**: R$ 115,50

5. Cliente paga via Mercado Pago ou PayPal
6. Dinheiro fica em **escrow** (retido)
7. Criador envia o trabalho
8. Cliente aprova
9. Dinheiro é liberado para o criador

### Valores que Cada Um Recebe

- **Criador**: R$ 100,00 (valor da proposta)
- **Você (plataforma)**: R$ 10,00 (10% de taxa)
- **Gateway**: R$ 5,50 (taxas deles)

---

## 🚨 Problemas Comuns

### "Payment method not configured"
→ Variáveis de ambiente não foram adicionadas na Vercel

### "Invalid credentials"
→ Credenciais erradas ou expiradas. Verifique no dashboard do gateway.

### Webhook não dispara
→ Verifique a URL do webhook (deve ser HTTPS e pública)

### Pagamento aprovado mas não atualiza
→ Verifique os logs do webhook. Pode haver erro no processamento.

### Erro ao testar com cartão
→ Certifique-se de usar os cartões de teste corretos (sandbox)

---

## 📚 Links Úteis

### Mercado Pago
- Documentação: https://www.mercadopago.com.br/developers/pt/docs
- Cartões de Teste: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-content/test-cards
- Dashboard: https://www.mercadopago.com.br/developers

### PayPal
- Documentação: https://developer.paypal.com/docs/
- Contas Sandbox: https://developer.paypal.com/dashboard/accounts
- Dashboard: https://developer.paypal.com/dashboard/

---

## 📝 Quando Migrar para Produção?

Migre quando:
- ✅ Testou TODOS os fluxos (criar pedido, proposta, pagamento, entrega)
- ✅ Tem os documentos necessários (CNPJ ou CPF+endereço)
- ✅ Leu os termos de uso dos gateways
- ✅ Configurou suporte ao cliente
- ✅ Tem um plano de como lidar com disputas/estornos

> [!WARNING]
> Pagamentos reais = responsabilidades reais! Certifique-se de estar preparado.

---

**Pronto!** Seus pagamentos estão configurados! 🚀
