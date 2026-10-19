import { createClient } from '@supabase/supabase-js'

export interface WaitlistRecord {
    id: string
    name: string
    email: string
    whatsapp: string
    softwares?: string | null
    created_at: string
    status: 'pendente' | 'convidado' | 'rejeitado'
}

const WAITLIST_VAULT_USER_ID = '00000000-0000-0000-0000-000000000002'
const WAITLIST_VAULT_EMAIL = 'system.waitlist@bordadohub.internal'

function getSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

/**
 * Lê todos os candidatos da lista de espera.
 * Se a tabela 'programmer_waitlist' existir, usa ela.
 * Se não existir (PGRST205), usa o cofre resiliente em 'users' para funcionamento imediato sem SQL.
 */
export async function getWaitlist(): Promise<WaitlistRecord[]> {
    const supabase = getSupabase()

    // 1. Tenta tabela física 'programmer_waitlist'
    const { data, error } = await supabase
        .from('programmer_waitlist')
        .select('*')
        .order('created_at', { ascending: false })

    if (!error && data) {
        return data as WaitlistRecord[]
    }

    // 2. Se a tabela não existe no schema, usa o cofre transparente em 'users'
    const { data: vaultUser } = await supabase
        .from('users')
        .select('bio')
        .eq('supabase_user_id', WAITLIST_VAULT_USER_ID)
        .maybeSingle()

    if (!vaultUser || !vaultUser.bio) {
        return []
    }

    try {
        const parsed = JSON.parse(vaultUser.bio)
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

/**
 * Adiciona um novo candidato à lista de espera de programadores.
 */
export async function insertWaitlistRecord(record: WaitlistRecord): Promise<WaitlistRecord> {
    const supabase = getSupabase()

    // 1. Tenta tabela física 'programmer_waitlist'
    const { data, error } = await supabase
        .from('programmer_waitlist')
        .insert([record])
        .select()
        .single()

    if (!error && data) {
        return data as WaitlistRecord
    }

    // 2. Se a tabela física não existe, salva no cofre seguro
    const currentList = await getWaitlist()
    const updatedList = [record, ...currentList.filter(i => i.email !== record.email)]

    await supabase
        .from('users')
        .upsert({
            supabase_user_id: WAITLIST_VAULT_USER_ID,
            email: WAITLIST_VAULT_EMAIL,
            name: 'Sistema de Waitlist (Vault)',
            role: 'cliente',
            is_client: false,
            is_programmer: false,
            bio: JSON.stringify(updatedList)
        }, { onConflict: 'supabase_user_id' })

    return record
}
