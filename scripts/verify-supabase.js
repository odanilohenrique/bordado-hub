/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unused-vars */
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyTables() {
    console.log('Verificando conexão com Supabase...');

    const tables = ['users', 'jobs', 'proposals', 'transactions', 'deliveries', 'messages'];
    let allExist = true;

    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('id').limit(1);
        if (error) {
            console.error(`❌ Erro ao acessar tabela '${table}':`, error.message);
            allExist = false;
        } else {
            console.log(`✅ Tabela '${table}' encontrada.`);
        }
    }

    if (allExist) {
        console.log('\n🎉 Todas as tabelas foram verificadas com sucesso!');
    } else {
        console.error('\n⚠️ Algumas tabelas estão faltando ou inacessíveis.');
    }
}

verifyTables();
