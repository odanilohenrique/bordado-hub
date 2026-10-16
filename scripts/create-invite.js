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

    const { data, error } = await supabase
        .from('invites')
        .insert([
            {
                code: finalCode,
                max_uses: maxUses,
                current_uses: 0,
                active: true
            }
        ])
        .select()
        .single()

    if (error) {
        if (error.code === 'PGRST205') {
            console.error('\n❌ A tabela public.invites ainda não existe no seu Supabase!')
            console.error('   Abra o painel do Supabase -> SQL Editor e execute o comando:')
            console.error(`
CREATE TABLE IF NOT EXISTS public.invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    used_at TIMESTAMPTZ,
    used_by TEXT,
    max_uses INTEGER NOT NULL DEFAULT 1,
    current_uses INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS idx_invites_code ON public.invites (code);
CREATE INDEX IF NOT EXISTS idx_invites_active ON public.invites (active);
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
`)
            process.exit(1)
        }
        console.error('❌ Erro ao salvar convite:', error.message)
        process.exit(1)
    }

    console.log('\n✅ Convite criado com sucesso!')
    console.log('--------------------------------------------------')
    console.log(`🔑 Código:         ${data.code}`)
    console.log(`🔢 Limite de Usos:  ${data.max_uses}`)
    console.log(`🔗 Link Direto:     https://bordadohub.com/profile/me?convite=${data.code}`)
    console.log('--------------------------------------------------\n')
}

run()
