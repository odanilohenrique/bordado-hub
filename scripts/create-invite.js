/**
 * Script para gerar códigos de convite diretamente via terminal
 * 
 * USO:
 *   node scripts/create-invite.js
 *   node scripts/create-invite.js WILCOM-VIP 5   (Código: WILCOM-VIP, Limite: 5 usos)
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

// Carrega .env.local
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8')
    for (const line of envContent.split('\n')) {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#')) {
            const eqIndex = trimmed.indexOf('=')
            if (eqIndex > 0) {
                const key = trimmed.substring(0, eqIndex).trim()
                const val = trimmed.substring(eqIndex + 1).trim()
                if (!process.env[key]) process.env[key] = val
            }
        }
    }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Erro: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes no .env.local')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const VAULT_USER_ID = '00000000-0000-0000-0000-000000000001'
const VAULT_EMAIL = 'system.invites@bordadohub.internal'
const INVITE_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

function generateInviteCode(length = 8) {
    let result = ''
    for (let i = 0; i < length; i++) {
        const randIndex = crypto.randomInt(0, INVITE_CHARS.length)
        result += INVITE_CHARS[randIndex]
    }
    return result
}

async function run() {
    const customCode = process.argv[2] ? process.argv[2].toUpperCase().trim() : null
    const maxUses = process.argv[3] ? parseInt(process.argv[3], 10) || 1 : 1

    const finalCode = customCode || generateInviteCode(8)

    console.log(`\n🎟️  Gerando código de convite para programador...`)

    const inviteObj = {
        id: crypto.randomUUID(),
        code: finalCode,
        created_at: new Date().toISOString(),
        used_at: null,
        used_by: null,
        max_uses: maxUses,
        current_uses: 0,
        active: true
    }

    // 1. Tenta tabela física 'invites'
    const { data, error } = await supabase
        .from('invites')
        .insert([inviteObj])
        .select()
        .single()

    if (error) {
        // 2. Se a tabela física não existir, usa o cofre transparente em 'users'
        let currentList = []
        const { data: vaultUser } = await supabase
            .from('users')
            .select('bio')
            .eq('supabase_user_id', VAULT_USER_ID)
            .maybeSingle()

        if (vaultUser && vaultUser.bio) {
            try {
                currentList = JSON.parse(vaultUser.bio) || []
            } catch {
                currentList = []
            }
        }

        const updatedList = [inviteObj, ...currentList.filter(i => i.code !== inviteObj.code)]

        const { error: vaultErr } = await supabase
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

        if (vaultErr) {
            console.error('❌ Erro ao salvar convite no cofre:', vaultErr.message)
            process.exit(1)
        }
    }

    console.log('\n✅ Convite criado com sucesso!')
    console.log('--------------------------------------------------')
    console.log(`🔑 Código:         ${inviteObj.code}`)
    console.log(`🔢 Limite de Usos:  ${inviteObj.max_uses} (uso único descartável)`)
    console.log(`🔗 Link Direto:     https://bordadohub.com/profile/me?convite=${inviteObj.code}`)
    console.log('--------------------------------------------------\n')
}

run()
