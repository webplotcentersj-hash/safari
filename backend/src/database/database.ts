import { supabaseAdmin } from '../config/supabase.js';

// Función para inicializar las tablas (ejecutar manualmente en Supabase SQL Editor)
// Las tablas se crean mediante migraciones SQL en Supabase
export async function initDatabase() {
  console.log('✅ Using Supabase database');
  console.log('⚠️  Make sure to run the SQL migrations in Supabase SQL Editor');
  
  // Verificar conexión
  const { data, error } = await supabaseAdmin.from('pilots').select('count').limit(1);
  
  if (error && error.code === '42P01') {
    console.error('❌ Tables not found. Please run the SQL migrations in Supabase SQL Editor.');
    throw new Error('Database tables not initialized. Run migrations first.');
  }
  
  console.log('✅ Database connection verified');
}

export { supabaseAdmin as db };
