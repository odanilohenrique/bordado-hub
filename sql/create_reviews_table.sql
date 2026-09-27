-- Fix reviews table: drop FK constraints to auth.users, recreate with public.users
DROP TABLE IF EXISTS public.reviews;

CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL,
    reviewee_id UUID NOT NULL,
    rating_matrix INTEGER NOT NULL,
    rating_service INTEGER NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select on reviews" ON public.reviews FOR SELECT TO public USING (true);
CREATE POLICY "Allow insert reviews via service role" ON public.reviews FOR INSERT TO authenticated WITH CHECK (true);
