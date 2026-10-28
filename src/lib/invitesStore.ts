import { createClient } from '@supabase/supabase-js'

export interface InviteRecord {
    id: string
    code: string
    created_at: string
    used_at: string | null
    used_by: string | null
    max_uses: number
    current_uses: number
    active: boolean
}

const VAULT_USER_ID = '00000000-0000-0000-0000-000000000001'
const VAULT_EMAIL = 'system.invites@bordadohub.internal'

function getSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

/**
 * Lê todos os convites do sistema.
 * Se a tabela 'invites' existir, usa ela.
 * Se não existir (PGRST205), usa o cofre transparente em 'users' para funcionamento imediato sem SQL.
 */
export async function getInvitesList(): Promise<InviteRecord[]> {
    const supabase = getSupabase()

    // 1. Tenta tabela física 'invites'
    const { data, error } = await supabase
        .from('invites')
        .select('*')
        .order('created_at', { ascending: false })

    if (!error && data) {
        return data as InviteRecord[]
    }

    // 2. Se a tabela não existe no schema, usa o cofre em 'users'
    const { data: vaultUser } = await supabase
        .from('users')
        .select('bio')
        .eq('supabase_user_id', VAULT_USER_ID)
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
 * Cria e armazena um novo código de convite.
 */
export async function insertInvite(invite: InviteRecord): Promise<InviteRecord> {
    const supabase = getSupabase()

    // 1. Tenta tabela física 'invites'
    const { data, error } = await supabase
        .from('invites')
        .insert([invite])
        .select()
        .single()

    if (!error && data) {
        return data as InviteRecord
    }

    // 2. Se a tabela física não existe, salva no cofre seguro
    const currentList = await getInvitesList()
    const updatedList = [invite, ...currentList.filter(i => i.code !== invite.code)]

    await supabase
        .from('users')
        .upsert({
            supabase_user_id: VAULT_USER_ID,
            email: VAULT_EMAIL,
            name: 'Sistema de Convites (Vault)',
            role: 'cliente',
            is_client: false,
            is_programmer: false,
            bio: JSON.stringify(updatedList)
        }, { onConflict: 'supabase_user_id' })

    return invite
}

/**
 * Valida se um código de convite existe e ainda pode ser utilizado.
 */
export async function checkInviteValidity(codeToTest: string): Promise<{ valid: boolean; message: string; invite?: InviteRecord }> {
    const clean = codeToTest.trim().toUpperCase()
    if (!clean) {
        return { valid: false, message: 'Código de convite não informado.' }
    }

    const invites = await getInvitesList()
    const target = invites.find(i => i.code.toUpperCase() === clean)

    if (!target) {
        return { valid: false, message: 'Código de convite não encontrado.' }
    }

    if (!target.active || target.current_uses >= target.max_uses) {
        return { valid: false, message: 'Este código de convite já foi utilizado ou está esgotado.' }
    }

    return { valid: true, message: 'Código de convite válido!', invite: target }
}

/**
 * Consome o código de convite, marcando o usuário que utilizou e desativando se atingiu o limite.
 */
export async function consumeInviteCode(codeToConsume: string, usedByEmail: string): Promise<boolean> {
    const clean = codeToConsume.trim().toUpperCase()
    const supabase = getSupabase()

    // 1. Tenta tabela física 'invites'
    const { data: physicalInvite } = await supabase
        .from('invites')
        .select('*')
        .eq('code', clean)
        .maybeSingle()

    if (physicalInvite) {
        const newUses = (physicalInvite.current_uses || 0) + 1
        const shouldDeactivate = newUses >= (physicalInvite.max_uses || 1)

        // Agrupa os e-mails dos usuários que usaram o convite sem duplicar
        const existingUsers = (physicalInvite.used_by || '')
            .split(',')
            .map((e: string) => e.trim())
            .filter(Boolean)

        if (usedByEmail && !existingUsers.includes(usedByEmail)) {
            existingUsers.push(usedByEmail)
        }
        const updatedUsedBy = existingUsers.join(', ') || usedByEmail || 'desconhecido'

        await supabase
            .from('invites')
            .update({
                current_uses: newUses,
                used_by: updatedUsedBy,
                used_at: new Date().toISOString(),
                active: !shouldDeactivate
            })
            .eq('code', clean)

        return true
    }

    // 2. Se for cofre em 'users'
    const list = await getInvitesList()
    const index = list.findIndex(i => i.code.toUpperCase() === clean)
    if (index === -1) return false

    const inv = list[index]
    const newUses = (inv.current_uses || 0) + 1
    const shouldDeactivate = newUses >= inv.max_uses

    const existingUsers = (inv.used_by || '')
        .split(',')
        .map((e: string) => e.trim())
        .filter(Boolean)

    if (usedByEmail && !existingUsers.includes(usedByEmail)) {
        existingUsers.push(usedByEmail)
    }
    const updatedUsedBy = existingUsers.join(', ') || usedByEmail || 'desconhecido'

    list[index] = {
        ...inv,
        current_uses: newUses,
        used_by: updatedUsedBy,
        used_at: new Date().toISOString(),
        active: !shouldDeactivate
    }

    await supabase
        .from('users')
        .upsert({
            supabase_user_id: VAULT_USER_ID,
            email: VAULT_EMAIL,
            name: 'Sistema de Convites (Vault)',
            role: 'cliente',
            is_client: false,
            is_programmer: false,
            bio: JSON.stringify(list)
        }, { onConflict: 'supabase_user_id' })

    return true
}
