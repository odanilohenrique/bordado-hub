-- Adiciona colunas para controle de revisão e fotos de defeitos do bordado
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS revision_notes TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS revision_image_url TEXT;
