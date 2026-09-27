# Tarefas Pendentes - BordadoHub

As seguintes tarefas foram mapeadas para serem realizadas amanhã (Continuação do fluxo de entrega e avaliação):

1. **Botão "Baixar Todas as Matrizes"**
   - Adicionar uma funcionalidade na interface do Cliente para baixar todas as matrizes de uma vez só (ex: compactar em um arquivo `.zip` e baixar, ou usar a API do Supabase para forçar o download em lote).

2. **Manter o Nome Original dos Arquivos**
   - Atualmente a rotina de upload de matriz renomeia os arquivos adicionando uma Hash/Job ID (`${jobId}_${Math.random()}.${fileExt}`).
   - Ajustar a rotina para manter o nome original (`file.name`) no Supabase, garantindo que o cliente saiba exatamente o que é cada arquivo que o programador enviou.

3. **Correção no Envio da Avaliação (Erro na API / Payout)**
   - O botão de "Enviar Avaliação & Finalizar" está dando "falha na avaliação".
   - É necessário debugar o payload enviado para `/api/jobs/approve`.
   - Verificar se o ID do `revieweeId` está sendo passado corretamente.
   - Analisar o retorno de erro completo que a rota está gerando ao tentar inserir na tabela `reviews` ou acionar a liberação do Asaas (`transferPixToCreator`).
