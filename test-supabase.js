const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('Testing Supabase connection...');
console.log('URL:', supabaseUrl ? 'Set' : 'Not set');
console.log('Key:', supabaseKey ? 'Set' : 'Not set');

if (supabaseUrl && supabaseKey) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Test connection
  supabase.from('users').select('count', { count: 'exact', head: true })
    .then(({ data, error, count }) => {
      if (error) {
        console.error('Supabase connection failed:', error.message);
      } else {
        console.log('Supabase connection successful! User count:', count);
      }
    })
    .catch(err => {
      console.error('Connection test failed:', err.message);
    });
} else {
  console.error('Missing Supabase credentials');
}