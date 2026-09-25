#!/usr/bin/env node

/**
 * Script para generar un token JWT de Supabase para testing
 * 
 * Uso:
 *   node scripts/generate-test-token.js email@ejemplo.com password123
 * 
 * O con variables de entorno:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_ANON_KEY=xxx \
 *   TEST_EMAIL=email@ejemplo.com \
 *   TEST_PASSWORD=password123 \
 *   node scripts/generate-test-token.js
 */

const { createClient } = require('@supabase/supabase-js');

// Obtener credenciales de env o argumentos
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const email = process.argv[2] || process.env.TEST_EMAIL;
const password = process.argv[3] || process.env.TEST_PASSWORD;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: SUPABASE_URL y SUPABASE_ANON_KEY son requeridas');
    console.log('\nUso:');
    console.log('  SUPABASE_URL=https://xxx.supabase.co \\');
    console.log('  SUPABASE_ANON_KEY=xxx \\');
    console.log('  node scripts/generate-test-token.js email@ejemplo.com password123');
    process.exit(1);
}

if (!email || !password) {
    console.error('❌ Error: Email y password son requeridos');
    console.log('\nUso:');
    console.log('  node scripts/generate-test-token.js email@ejemplo.com password123');
    console.log('\nO con variables de entorno:');
    console.log('  TEST_EMAIL=email@ejemplo.com TEST_PASSWORD=password123 node scripts/generate-test-token.js');
    process.exit(1);
}

async function generateToken() {
    console.log('🔑 Generando token de Supabase...\n');

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // Intentar login
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            console.error('❌ Error al autenticar:', error.message);

            // Sugerencia si el usuario no existe
            if (error.message.includes('Invalid login credentials')) {
                console.log('\n💡 Tip: Crea el usuario primero en Supabase Dashboard:');
                console.log('   https://app.supabase.com → Authentication → Users → Invite user');
            }

            process.exit(1);
        }

        const token = data.session.access_token;
        const user = data.user;

        console.log('✅ Token generado exitosamente!\n');
        console.log('👤 Usuario:', user.email);
        console.log('🆔 ID:', user.id);
        console.log('📅 Expira:', new Date(data.session.expires_at * 1000).toLocaleString());
        console.log('\n🔐 TOKEN:\n');
        console.log(token);
        console.log('\n📋 Usar en curl:\n');
        console.log(`curl -H "Authorization: Bearer ${token}" \\`);
        console.log(`     -H "Accept: application/fhir+json" \\`);
        console.log(`     http://localhost:3000/4_0_0/Patient/test-user`);
        console.log('\n📋 Usar en Postman/Insomnia:\n');
        console.log('  Header: Authorization');
        console.log(`  Value:  Bearer ${token}`);
        console.log('\n📋 Exportar como variable:\n');
        console.log(`export TOKEN="${token}"`);
        console.log('curl -H "Authorization: Bearer $TOKEN" ...');

    } catch (err) {
        console.error('❌ Error inesperado:', err.message);
        process.exit(1);
    }
}

generateToken();

