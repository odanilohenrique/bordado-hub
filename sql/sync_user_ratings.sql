-- ==============================================================================
-- SINCRONIZAÇÃO COMPLETA DE AVALIAÇÕES (RATINGS E CONTAGEM REAL)
-- ==============================================================================
-- 1. Calcula a média real com 1 casa decimal (ex: 4.3, 4.8, 5.0) e a contagem real
-- 2. Não arredonda para cima: mantém a nota fidedigna igual Uber, Upwork e Airbnb
-- 3. Zera programadores sem avaliação para não exibir estrelas ou notas fictícias
-- ==============================================================================

-- Atualiza usuários que possuem avaliações na tabela reviews
UPDATE users u
SET 
    rating = COALESCE(sub.avg_rating, 0),
    reviews_count = COALESCE(sub.cnt, 0)
FROM (
    SELECT 
        reviewee_id, 
        ROUND(AVG(rating)::numeric, 1) AS avg_rating,
        COUNT(*) AS cnt
    FROM reviews
    WHERE reviewee_id IS NOT NULL
    GROUP BY reviewee_id
) sub
WHERE u.id = sub.reviewee_id OR u.supabase_user_id = sub.reviewee_id;

-- Garante que usuários sem nenhuma avaliação fiquem com 0 e sem selos indevidos
UPDATE users
SET 
    rating = 0,
    reviews_count = 0
WHERE id NOT IN (
    SELECT DISTINCT reviewee_id FROM reviews WHERE reviewee_id IS NOT NULL
)
AND (supabase_user_id IS NULL OR supabase_user_id NOT IN (
    SELECT DISTINCT reviewee_id FROM reviews WHERE reviewee_id IS NOT NULL
));

-- Recarrega o cache do PostgREST
NOTIFY pgrst, 'reload schema';
