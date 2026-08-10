const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const email = `test_${Date.now()}@example.com`;
  const { data, error } = await supabase.auth.signUp({ email, password: 'testpassword123' });
  console.log("Session:", data.session ? "Exists" : "Null");
  console.log("Error:", error);
}
run();
