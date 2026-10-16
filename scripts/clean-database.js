/**
 * Script para limpar TODAS as tabelas do banco de dados BordadoHUB
 * 
 * USO: node scripts/clean-database.js
 * 
 * ATENÇÃO: Este script apaga TODOS os dados de todas as tabelas.
 * Os usuários do Supabase Auth NÃO são afetados (login continua funcionando).
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load .env.local manually
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
    console.error('❌ Variáveis NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessárias no .env.local')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Tabelas na ordem correta (respeita foreign keys - filhas primeiro, pais depois)
const TABLES_IN_ORDER = [
    'proposal_attachments',  // FK → proposals
    'proposal_messages',     // FK → proposals  
    'deliveries',            // FK → transactions/proposals
    'reviews',               // FK → users
    'notifications',         // FK → users
    'transactions',          // FK → proposals/users
    'proposals',             // FK → jobs/users
    'jobs',                  // FK → users
    'marketplace_orders',    // FK → marketplace_products/users
    'marketplace_products',  // FK → users
    'portfolio',             // FK → users
    'users',                 // Tabela principal
]

async function cleanDatabase() {
    console.log('🗑️  Iniciando limpeza TOTAL do banco de dados...\n')
    
    let totalDeleted = 0
    
    for (const table of TABLES_IN_ORDER) {
        try {
            // Count before delete
            const { count } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true })
            
            // Delete all rows (neq filter that matches everything)
            const { error } = await supabase
                .from(table)
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000')
            
            if (error) {
                // Try with different ID format for tables that use integer IDs
                const { error: error2 } = await supabase
                    .from(table)
                    .delete()
                    .gte('id', 0)
                
                if (error2) {
                    console.error(`  ❌ ${table}: ${error2.message}`)
                    continue
                }
            }
            
            const rowCount = count || 0
            totalDeleted += rowCount
            console.log(`  ✅ ${table}: ${rowCount} registros removidos`)
            
        } catch (err) {
            console.error(`  ❌ ${table}: ${err.message}`)
        }
    }
    
    console.log(`\n✅ Limpeza concluída! ${totalDeleted} registros removidos no total.`)
    console.log('\n📌 Lembrete: Os usuários do Supabase Auth continuam existindo.')
    console.log('   Eles podem fazer login normalmente e criar um novo perfil.')
}

cleanDatabase().catch(console.error)
