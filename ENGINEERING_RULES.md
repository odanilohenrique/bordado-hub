# 🛡️ Diretrizes de Engenharia e Segurança de Produção — BordadoHUB

> **STATUS ATUAL: PRODUTO EM PRODUÇÃO REAL COM USUÁRIOS E PAGAMENTOS ATIVOS.**  
> Qualquer erro em produção afeta clientes reais, pedidos em andamento e transações financeiras.  
> Esta diretriz é mandatória para qualquer desenvolvedor ou agente de Inteligência Artificial que atue neste repositório.

---

## 1. Regra de Ouro: Isolamento de Ambientes

1. **Branch `main` (Produção):**
   - Conectada diretamente ao domínio oficial (`bordadohub.com.br`).
   - **PROIBIDO** comitar alterações experimentais diretamente na `main`.
   - Apenas código completamente testado e com build aprovado pode chegar à `main`.

2. **Branch `staging` (Homologação / Pré-produção):**
   - Todo ajuste, nova funcionalidade ou correção de bug deve ser desenvolvido e testado na branch `staging`.
   - Gera ambientes de *Preview* automáticos na Vercel para testes antes de ir para o ar.

3. **Banco de Dados e Gateways de Pagamento:**
   - **NUNCA** rodar scripts de limpeza em massa (`TRUNCATE`, `DELETE` sem WHERE, limpeza de buckets de storage) sem autorização expressa e confirmação do ambiente.
   - Credenciais de produção do Asaas e chaves Service Role do Supabase devem ser tratadas como dados ultrassensíveis.

---

## 2. Protocolo Anti-Regressão (Zero Reincidência de Bugs)

> **Princípio:** *Um bug corrigido uma vez jamais poderá retornar em versões futuras.*

Sempre que qualquer alteração de código for realizada:

### A. Mapeamento de Impacto Cruzado (Blast Radius)
- Antes de alterar um arquivo, componente compartilhado ou função utilitária (`src/lib/*`, `src/components/*`), a IA/desenvolvedor deve executar uma busca de referências (`git grep`) para entender todos os locais que dependem daquele código.

### B. Checklist de Regressão Obrigatório por Domínio
Sempre que tocar nas áreas abaixo, o teste do fluxo completo é obrigatório:

1. **Financeiro e Checkout (`/checkout`, `src/lib/payments.js`, APIs do Asaas):**
   - [ ] Cálculo progressivo de juros de cartão (1x a 12x) repassado ao comprador.
   - [ ] Valor líquido da plataforma e do programador preservado integralmente.
   - [ ] Webhook do Asaas com resposta ágil e handler `GET` de diagnóstico ativo.
   - [ ] Criação de cobrança PIX gerando QR Code e Pix Copia e Cola válidos.

2. **Negociação e Chat (`/jobs/[id]`, `NegotiationChat.tsx`, `/api/jobs/counter-proposal`):**
   - [ ] Botão de enviar contraproposta funcional (sem travar em loading).
   - [ ] Ações de Aceitar, Recusar e Fechar Negócio atualizando o status do pedido via Service Client.
   - [ ] Notificações geradas corretamente para ambas as partes.

3. **Perfis e Acesso (`/profile/[id]`, `ProfileEditor.tsx`, `ProgrammerAccessModal.tsx`):**
   - [ ] Campo de descrição/bio amplo, expansível e com quebras de linha preservadas.
   - [ ] Timeout de segurança (failsafe) em todas as chamadas de salvamento/autenticação para evitar "bolinha de loading infinita".
   - [ ] Validação e consumo de convites VIP sincronizados sem travar a interface.
   - [ ] Portfólio exibido em grade quadrada (`object-cover object-center`) com fundo neutro e sem distorção.

4. **Entregas de Arquivos de Matrizes (`/jobs/[id]`, `/api/jobs/deliver`, `/api/upload-delivery`):**
   - [ ] Suporte a múltiplos formatos (.PES, .DST, .JEF, .EXP, .PXF, etc.) e PDFs de fichas técnicas.
   - [ ] Links de download gerados via URLs seguras do storage.

---

## 3. Critérios de Conclusão de Tarefa (Definition of Done)

Nenhuma tarefa pode ser considerada concluída ou enviada para merge sem cumprir 100% dos itens abaixo:

1. **Compilação Estática Limpa:**
   - O comando `npm run build` deve rodar localmente e finalizar com código `0` (Zero erros de TypeScript, zero rotas quebradas).
2. **Preservação de Contexto e Documentação:**
   - Comentários funcionais e regras de negócio existentes não devem ser apagados.
3. **Commits Semânticos e Rastreáveis:**
   - Formato padronizado: `fix: ...`, `feat: ...`, `refactor: ...`, `test: ...`.
   - Mensagem descritiva explicando o problema resolvido e as áreas afetadas.

---

## 4. Diretriz Operacional para Agentes de IA

Ao atuar no repositório:
- Execute a máxima quantidade de verificações e testes de forma autônoma (análise estática, build, verificação de dados).
- Solicite a intervenção do usuário apenas para decisões de produto, aprovações de negócio ou testes visuais na máquina física.
- Em caso de dúvida sobre a intenção de uma regra de negócio, preserve a versão mais segura para o cliente e consulte o usuário antes de alterar.
