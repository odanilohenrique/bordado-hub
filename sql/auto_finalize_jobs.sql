-- Cria uma função para finalizar automaticamente jobs "entregue" após 12 horas
CREATE OR REPLACE FUNCTION auto_finalize_expired_jobs()
RETURNS integer AS $$
DECLARE
  finalized_count integer;
BEGIN
  UPDATE public.jobs
  SET status = 'finalizado'
  WHERE status = 'entregue'
    AND delivered_at IS NOT NULL
    AND delivered_at < (NOW() - INTERVAL '12 hours');

  -- Pega a quantidade de linhas afetadas
  GET DIAGNOSTICS finalized_count = ROW_COUNT;
  
  RETURN finalized_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
