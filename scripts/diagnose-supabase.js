const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Manually parse .env.local
let supabaseUrl = '';
let supabaseKey = '';

try {
    const envPath = path.resolve(__dirname, '../.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');

    envContent.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value) {
            const val = value.join('=').trim();
            if (key.trim() === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = val;
            if (key.trim() === 'SUPABASE_SERVICE_ROLE_KEY') supabaseKey = val;
        }
    });
} catch (e) {
    console.error('❌ Could not read .env.local:', e.message);
    process.exit(1);
}

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Environment Variables in .env.local');
    process.exit(1);
}

console.log('🔍 Testing connection to:', supabaseUrl);
// console.log('🔑 With Key starting:', supabaseKey.substring(0, 10) + '...');

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    console.log('\n--- 1. Testing Connection & User Table ---');
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('count', { count: 'exact', head: true });

    if (userError) {
        console.error('❌ Error accessing public.users:', userError.message);
        console.error('   Code:', userError.code);
        if (userError.code === '42P01') {
            console.error('   👉 CAUSE: The table "users" DOES NOT EXIST. The SQL script was not run or failed.');
        } else if (userError.code === 'PGRST301') {
            console.error('   👉 CAUSE: Service Key is invalid or RLS blocked access (unlikely for Service Key).');
        }
    } else {
        console.log('✅ Access to public.users successful!');
    }

    console.log('\n--- 2. List of Tables in "public" schema ---');
    const { data: jobs, error: jobError } = await supabase
        .from('jobs')
        .select('count', { count: 'exact', head: true });

    if (jobError) {
        console.error('❌ Error accessing public.jobs:', jobError.message);
    } else {
        console.log('✅ Access to public.jobs successful!');
    }

    console.log('\n--- 3. Testing Auth (SignUp/SignIn) ---');
    const { data, error } = await supabase.auth.signInWithPassword({
        email: 'diagnostic_check@test.com',
        password: 'wrongpassword'
    });

    if (error && error.message === 'Invalid login credentials') {
        console.log('✅ Auth Endpoint is reachable (Sign In tested).');
    } else if (error) {
        console.error('❌ Auth Endpoint Error:', error.message);
    }

    console.log('\n--- 4. Testing User Creation (SignUp) ---');
    const testEmail = `diagnostic_${Date.now()}@test.com`;
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: testEmail,
        password: 'diagnostic_pass_123'
    });

    if (signUpError) {
        console.error('❌ SignUp Failed:', signUpError.message);
        console.error('   Status:', signUpError.status);
    } else {
        console.log('✅ SignUp Successful for:', testEmail);
        console.log('   User ID:', signUpData.user?.id);
    }
}

diagnose();
