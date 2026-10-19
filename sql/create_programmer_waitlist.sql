-- =============================================================================
-- TABELA: programmer_waitlist (Lista de Espera de Programadores)
-- Execute no SQL Editor do Supabase se desejar criar a tabela física.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.programmer_waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    softwares TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    status TEXT DEFAULT 'pendente' NOT NULL
);

-- Índices para busca rápida e ordenação
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON public.programmer_waitlist (email);
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON public.programmer_waitlist (created_at DESC);

-- Habilita RLS (Row Level Security)
ALTER TABLE public.programmer_waitlist ENABLE ROW LEVEL SECURITY;
