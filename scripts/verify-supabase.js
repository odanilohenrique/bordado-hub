const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zodviesgpochuzwetbtt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvZHZpZXNncG9jaHV6d2V0YnR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDEzNDA5MywiZXhwIjoyMDc5NzEwMDkzfQ.H5gEAqYIjQKWgOCqJbRxGrXKB7SmSSKjXjcNThs4e7E';

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
