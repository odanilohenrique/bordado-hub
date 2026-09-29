-- ==============================================================================
-- CRIAÇÃO COMPLETA DA TABELA DE NOTIFICAÇÕES COM REALTIME E POLÍTICAS RLS
-- ==============================================================================

-- 1. Cria a tabela 'notifications' caso ainda não exista
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link_url TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Habilita RLS (Segurança por linha)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de segurança (Remove anteriores se houver para evitar conflitos)
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() IN (SELECT supabase_user_id FROM public.users WHERE id = user_id));

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() IN (SELECT supabase_user_id FROM public.users WHERE id = user_id));

DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
CREATE POLICY "Authenticated users can create notifications" ON public.notifications
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 4. Habilita réplica completa para envio no Realtime
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- 5. Adiciona à publicação do supabase_realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- 6. Recarrega o cache do PostgREST
NOTIFY pgrst, 'reload schema';
