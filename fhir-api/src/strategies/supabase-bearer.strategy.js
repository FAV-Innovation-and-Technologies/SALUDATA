const Strategy = require('passport-http-bearer').Strategy;
const { createClient } = require('@supabase/supabase-js');
const env = require('var');
const logger = require('@bluehalo/node-fhir-server-core').loggers.get();

/**
 * Supabase Bearer Strategy
 *
 * Valida tokens JWT de Supabase Auth en las peticiones FHIR.
 * El frontend debe enviar el token en el header: Authorization: Bearer <token>
 *
 * Requiere variables de entorno:
 * - SUPABASE_URL: URL de tu proyecto Supabase
 * - SUPABASE_ANON_KEY: Anon key pública de Supabase (para validar tokens)
 */

let supabaseClient = null;

function getSupabaseClient() {
    if (!supabaseClient) {
        const supabaseUrl = env.SUPABASE_URL;
        const supabaseAnonKey = env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
            throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required for authentication');
        }

        supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    }
    return supabaseClient;
}

module.exports.strategy = new Strategy(async function (token, done) {
    try {
        const supabase = getSupabaseClient();

        // Validar el token con Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error) {
            logger.warn('[SupabaseAuth] Token validation failed');
            return done(null, false, { message: 'Invalid or expired token' });
        }

        if (!user) {
            logger.warn('[SupabaseAuth] No user found for token');
            return done(null, false, { message: 'User not found' });
        }

        logger.info('[SupabaseAuth] User authenticated');

        // Extraer información del usuario
        const userInfo = {
            user_id: user.id,
            sub: user.id,
            email: user.email,
            role: user.role || 'user',
        };

        // Scopes básicos para FHIR (puedes personalizarlos según roles)
        const scope = 'patient/*.read patient/*.write'; // Acceso completo a recursos del paciente

        // Context con info del usuario de Supabase
        const context = {
            userId: user.id,
            email: user.email,
            role: user.role || 'user',
        };

        // Retornar usuario autenticado con scopes y context
        return done(null, userInfo, { scope, context });

    } catch (err) {
        logger.error('[SupabaseAuth] Authentication unavailable');
        return done(err);
    }
});
