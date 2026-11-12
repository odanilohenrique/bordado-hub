-- ==============================================================================
-- CRIAÇÃO DA TABELA DE INSCRIÇÕES DE NOTIFICAÇÕES WEB PUSH
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    role TEXT DEFAULT 'cliente',
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para buscas ultrarrápidas no momento do disparo
CREATE INDEX IF NOT EXISTS idx_push_sub_user_id ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_sub_role ON public.push_subscriptions(role);
CREATE INDEX IF NOT EXISTS idx_push_sub_endpoint ON public.push_subscriptions(endpoint);

-- Habilita Row Level Security
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "Qualquer um pode registrar ou atualizar uma inscrição" ON public.push_subscriptions;
CREATE POLICY "Qualquer um pode registrar ou atualizar uma inscrição" ON public.push_subscriptions
    FOR ALL USING (true) WITH CHECK (true);

-- Notifica PostgREST para recarregar o schema
NOTIFY pgrst, 'reload schema';
