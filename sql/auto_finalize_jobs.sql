-- ==============================================================================
-- FINALIZAÇÃO AUTOMÁTICA DE JOBS ENTREGUES APÓS 24 HORAS
-- ==============================================================================

-- Cria ou atualiza a função para finalizar automaticamente jobs "entregue" após 24 horas
CREATE OR REPLACE FUNCTION auto_finalize_expired_jobs()
RETURNS integer AS $$
DECLARE
  finalized_count integer;
BEGIN
  -- 1. Atualiza transações para 'liberado' para os jobs que expiraram o prazo de 24 horas
  UPDATE public.transactions t
  SET status = 'liberado'
  FROM public.jobs j
  WHERE t.job_id = j.id
    AND j.status = 'entregue'
    AND j.delivered_at IS NOT NULL
    AND j.delivered_at < (NOW() - INTERVAL '24 hours')
    AND t.status = 'pago';

  -- 2. Finaliza os jobs entregues há mais de 24 horas sem avaliação ou contestação
  UPDATE public.jobs
  SET status = 'finalizado'
  WHERE status = 'entregue'
    AND delivered_at IS NOT NULL
    AND delivered_at < (NOW() - INTERVAL '24 hours');

  -- Pega a quantidade de linhas afetadas
  GET DIAGNOSTICS finalized_count = ROW_COUNT;
  
  RETURN finalized_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualiza cache do PostgREST
NOTIFY pgrst, 'reload schema';
