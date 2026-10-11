# 📋 Guia Master de Homologação & Testes — BordadoHUB

> [!IMPORTANT]
> **Setup Inicial para o Teste:**
> Abra **dois navegadores diferentes** lado a lado (exemplo: **Chrome normal** para o Cliente e **Chrome em Aba Anônima** ou **Edge** para o Programador) para validar a comunicação e sincronia em tempo real sem conflito de sessões.

---

## 🎭 Personas de Teste

| Identificador | Perfil | E-mail Sugerido | Papel no Fluxo |
|---|---|---|---|
| **USER A** | Cliente / Comprador | `cliente.teste@exemplo.com` | Publica pedidos de matrizes, escolhe propostas e paga |
| **USER B** | Programador de Bordado | `dev.teste@exemplo.com` | Ativa perfil profissional, cadastra portfólio e envia lances |

---

## 🟢 FASE 1: Registro, Autenticação e Configuração de Perfis

### Teste 1.1 — Criação e Onboarding da Conta do Cliente (USER A)
- **Onde:** Navegador 1 (Aba Normal)
- **Pré-condição:** Banco 100% limpo, usuário deslogado.
- **Passo a Passo:**
  1. Acesse `http://localhost:3000/`.
  2. Clique em **Entrar / Cadastrar**.
  3. Registre uma nova conta com `cliente.teste@exemplo.com` e defina uma senha.
  4. Complete a autenticação e acerte o login.
  5. Acesse o menu do usuário e vá em **Meu Perfil**.
- **O que observar (Critérios de Sucesso):**
  - [ ] Usuário é criado no Supabase Auth e na tabela `users`.
  - [ ] Ao acessar o perfil, aparece o **Banner de Boas-Vindas/Onboarding** orientando sobre a plataforma.
  - [ ] Clicar em "Editar Perfil", subir uma foto de perfil:
    - [ ] A miniatura/preview da foto aparece **instantaneamente** (sem tela preta ou atraso).
    - [ ] Preencher Nome ("Carlos Bordados") e Bio ("Buscando matrizes em DST/PES").
    - [ ] Clicar em "Salvar Alterações": botão processa e exibe confirmação sem travar.

---

### Teste 1.2 — Criação e Ativação Profissional do Programador (USER B)
- **Onde:** Navegador 2 (Aba Anônima)
- **Pré-condição:** USER A logado no Navegador 1.
- **Passo a Passo:**
  1. Acesse `http://localhost:3000/register`.
  2. Crie a conta com `dev.teste@exemplo.com` e efetue login.
  3. Acesse a página do seu perfil.
  4. Clique no botão de destaque: **"Ativar e Completar Perfil de Programador"** (ou na sidebar).
  5. No modal/editor que se abre:
    - [ ] Verifique se o toggle "Quero receber pedidos e enviar propostas" já vem **marcado**.
    - [ ] Faça upload da foto de perfil (teste preview imediato).
    - [ ] Selecione no campo de portfólio **múltiplas imagens de uma vez** (3 a 5 arquivos JPG/PNG simultâneos).
    - [ ] Preencha: Nome Profissional, Anos de Experiência (ex: 5), Softwares (Wilcom, Embird), Máquinas compatíveis (Barudan, Brother, Tajima), Valor Base/Hora e Chave PIX de recebimento.
  6. Clique em **Salvar Perfil**.
- **O que observar (Critérios de Sucesso):**
  - [ ] Nenhuma mensagem de erro de `src=""` no console.
  - [ ] O upload em lote de portfólio processa todas as imagens e salva com sucesso.
  - [ ] Ao salvar, o perfil público exibe o selo de Programador, bio, ferramentas e a galeria de portfólio montada.

---

## 🟡 FASE 2: Ciclo de Criação do Pedido e Envio de Proposta

### Teste 2.1 — Publicação de Pedido pelo Cliente (USER A)
- **Onde:** Navegador 1
- **Passo a Passo:**
  1. No menu superior, clique em **"Criar Pedido"** (ou acerte `/jobs/new`).
  2. Preencha o formulário:
     - **Título:** `Matriz Logo Empresa em Ponto Cheio 10x10`
     - **Descrição:** `Preciso de uma matriz de bordado do logotipo anexo, tamanho 10x10cm, formato PES e DST. Ponto firme para piquet.`
     - **Prazo:** Selecione uma data (ex: 3 dias à frente).
     - **Orçamento Previsto:** `R$ 50,00`.
     - **Arquivo anexo:** Faça upload de uma imagem do logo (JPEG/PNG).
  3. Clique em **"Publicar Pedido"**.
- **O que observar (Critérios de Sucesso):**
  - [ ] Redirecionamento correto para o Mural de Pedidos (`/jobs`) ou para o detalhe do pedido (`/jobs/[id]`).
  - [ ] O pedido aparece no topo do feed com o status **"Aberto para propostas"**.

---

### Teste 2.2 — Visualização no Mural e Envio de Lance pelo Programador (USER B)
- **Onde:** Navegador 2
- **Passo a Passo:**
  1. Navegue até o Mural de Pedidos (`/jobs`).
  2. Localize o pedido recém-criado por USER A (`Matriz Logo Empresa...`).
  3. Clique para abrir os detalhes (`/jobs/[id]`).
  4. Note que, como o perfil de USER B já está completo, o formulário de proposta está disponível.
  5. Preencha a proposta:
     - **Valor da Proposta:** `R$ 45,00`
     - **Prazo de Entrega:** `2 dias`
     - **Mensagem/Apresentação:** `Olá! Trabalho com Wilcom há 5 anos, garanto compensação de encolhimento para piquet e entrego em PES e DST.`
  6. Clique em **"Enviar Proposta"**.
- **O que observar (Critérios de Sucesso):**
  - [ ] Proposta salva instantaneamente.
  - [ ] A tela do programador exibe que a proposta dele foi enviada (com status "Aguardando resposta do cliente").
  - [ ] **Validação de Sincronia:** Sem recarregar o Navegador 1 (USER A), veja se o pedido atualiza em tempo real indicando "1 proposta recebida".

---

## 🟠 FASE 3: Negociação em Tempo Real, Aceite e Chat

### Teste 3.1 — Aceite de Proposta pelo Cliente (USER A)
- **Onde:** Navegador 1
- **Passo a Passo:**
  1. Na tela do pedido (`/jobs/[id]`), visualize o card da proposta de USER B (`R$ 45,00`).
  2. Clique em **"Aceitar Proposta"**.
  3. Confirme a ação no modal/alerta.
- **O que observar (Critérios de Sucesso):**
  - [ ] O status do pedido muda para **"Em Andamento"** ou **"Aguardando Pagamento"**.
  - [ ] No Navegador 2 (USER B), a proposta é atualizada em tempo real para **"Aceita"**.
  - [ ] Uma notificação no sininho é gerada para USER B.

---

### Teste 3.2 — Chat e Mensageria da Proposta
- **Onde:** Navegador 1 e Navegador 2 alternados
- **Passo a Passo:**
  1. Com a proposta aceita, abra o chat da proposta em ambas as abas.
  2. **USER A** envia: *"Pode enviar também em formato JEF por favor?"*
  3. **USER B** verifica no Navegador 2 se a mensagem chegou sem precisar dar F5.
  4. **USER B** responde: *"Sim, gero em JEF sem custo adicional!"*
  5. **USER A** confere o recebimento instantâneo.
- **O que observar (Critérios de Sucesso):**
  - [ ] Sincronia bidirecional via Supabase Realtime sem travas de renderização.
  - [ ] Mensagens alinhadas corretamente (minhas à direita, do interlocutor à esquerda).
  - [ ] Não há duplicação de balões de mensagens.

---

## 🟣 FASE 4: Pagamento PIX, Entrega de Arquivos e Avaliação

### Teste 4.1 — Fluxo de Pagamento PIX (USER A)
- **Onde:** Navegador 1
- **Passo a Passo:**
  1. Na página do pedido, clique em **"Pagar Pedido" / "Liberar Garantia"**.
  2. Escolha a opção **PIX**.
  3. Visualize os dados gerados (QR Code e chave Copia e Cola).
- **O que observar (Critérios de Sucesso):**
  - [ ] Código Copia e Cola gerado com botão de copiar funcional.
  - [ ] Status da transação gravado no banco como `pending` (ou simular confirmação no webhook/banco se em sandbox).

---

### Teste 4.2 — Entrega dos Arquivos pelo Programador (USER B)
- **Onde:** Navegador 2
- **Passo a Passo:**
  1. Com o status apto para produção/entrega, acesse a área de entrega do pedido.
  2. Faça o upload do arquivo final da matriz (ex: arquivo compactado `.zip` contendo os formatos `.PES` e `.DST`).
  3. Escreva um comentário de entrega: *"Matriz pronta e compensada para tecido piquet."*
  4. Clique em **"Enviar Entrega"**.
- **O que observar (Critérios de Sucesso):**
  - [ ] O arquivo sobe para o bucket `job-deliveries` com sucesso.
  - [ ] No Navegador 1 (USER A), surge a notificação e o botão para baixar a entrega.

---

### Teste 4.3 — Aprovação e Download pelo Cliente (USER A)
- **Onde:** Navegador 1
- **Passo a Passo:**
  1. Baixe o arquivo anexado por USER B e verifique se o download conclui.
  2. Clique em **"Aprovar Entrega e Concluir Pedido"**.
- **O que observar (Critérios de Sucesso):**
  - [ ] O status do pedido muda para **"Concluído"**.
  - [ ] O valor fica liberado/liquidado para o programador.

---

### Teste 4.4 — Avaliação Mútua (Reviews)
- **Onde:** Ambos os navegadores
- **Passo a Passo:**
  1. **USER A** avalia USER B com 5 estrelas e comentário: *"Trabalho impecável, bordou perfeitamente!"*.
  2. **USER B** avalia USER A com 5 estrelas e comentário: *"Excelente cliente, passou todas as especificações claras."*.
  3. Acesse o perfil público de ambos (`/profile/[id]`).
- **O que observar (Critérios de Sucesso):**
  - [ ] A média de estrelas é calculada e exibida.
  - [ ] A lista de avaliações aparece no perfil público de cada um.

---

## 🛡️ FASE 5: Testes Críticos de Borda, UX e Resiliência

| ID | Cenário de Teste | Ação Executada | Resultado Esperado |
|---|---|---|---|
| **5.1** | **Tentativa de Proposta sem Perfil** | Crie um USER C (não programador) e tente enviar proposta no job | Sistema deve bloquear e exibir banner explicativo para ativar perfil profissional |
| **5.2** | **F5 / Recarregamento de Página** | Em qualquer tela (`/jobs`, `/jobs/[id]`, `/profile/[id]`), aperte F5 repetidamente | A página deve renderizar sem crash, sem hydration mismatch e sem travar em loading eterno |
| **5.3** | **Segurança de Acesso RLS** | Tentar acessar rota privada de outro usuário por URL direta | Redirecionamento ou mensagem de acesso não autorizado amigável |
| **5.4** | **Upload de Arquivo Inválido** | Tentar subir um `.exe` ou arquivo corrompido no avatar/portfólio | O sistema deve rejeitar e mostrar mensagem de formato não suportado |
| **5.5** | **Responsividade Mobile** | Abra o DevTools (F12) e ative a visão mobile (iPhone 14 / Pixel 7) | Menus colapsados em hamburger, cards adaptados sem quebra horizontal |
