import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase environment variables')
}

// Client for frontend usage (respects RLS)
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // Evita deadlock do navigator.locks em navegadores móveis (Safari iOS / Android)
        // quando a aba entra em segundo plano ao abrir câmera/galeria nativa
        lock: (name, acquireTimeout, fn) => fn()
    }
})

// Client for server-side usage (bypasses RLS) - NEVER use in frontend components
export function createServiceClient() {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
        throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
    }
    return createClient(supabaseUrl || '', serviceRoleKey)
}
