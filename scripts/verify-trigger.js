const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testTriggerAndRLS() {
  console.log('--- STARTING TRIGGER & RLS VERIFICATION ---');
  
  const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  
  const uid = 'trigger_test_user@invictus.test';
  const pass = 'TestPassword123!';
  
  // Cleanup
  const { data: users } = await adminClient.auth.admin.listUsers();
  for (const u of users.users) {
      if (u.email === uid) {
          await adminClient.auth.admin.deleteUser(u.id);
      }
  }
  
  // Create User using standard signup equivalent (or admin create)
  console.log('Creating auth user to fire trigger...');
  const { data: userAuth, error: e1 } = await adminClient.auth.admin.createUser({ email: uid, password: pass, email_confirm: true });
  
  if (e1) {
    console.error('Failed to create user:', e1);
    return;
  }

  // Wait for Postgres trigger to finish executing asynchronously (it's usually synchronous, but just in case)
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Check if account and user rows were AUTO-CREATED
  const { data: triggerUser } = await adminClient.from('users').select('*').eq('id', userAuth.user.id).single();
  
  if (!triggerUser || !triggerUser.account_id) {
    console.log('❌ FAIL: Trigger did not automatically create the users table row or account_id is missing.');
    return;
  }
  
  const { data: triggerAccount } = await adminClient.from('accounts').select('*').eq('id', triggerUser.account_id).single();
  
  if (!triggerAccount) {
    console.log('❌ FAIL: Trigger did not automatically create the accounts table row.');
    return;
  }
  
  console.log('✅ PASS: Trigger successfully auto-created Account (' + triggerAccount.id + ') and User record.');
  
  // Now verify RLS for this trigger-created user
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  await client.auth.signInWithPassword({ email: uid, password: pass });
  
  const { data: tmpl } = await client.from('templates').select('id').limit(1).single();
  
  const { data: prop, error: propErr } = await client.from('proposals').insert({
    account_id: triggerAccount.id, // Must match the auto-created account!
    template_id: tmpl.id,
    slug: 'trigger-rls-test-' + Date.now(),
    status: 'DRAFT',
    content: { title: 'RLS Test' }
  }).select().single();
  
  if (propErr) {
    console.log('❌ FAIL: RLS blocked the user from inserting a proposal under their auto-created account. Error:', propErr);
  } else {
    console.log('✅ PASS: RLS successfully allowed insert under auto-created account. (Proposal ID: ' + prop.id + ')');
  }
  
  // Cleanup
  await adminClient.auth.admin.deleteUser(userAuth.user.id);
  // Deleting auth user cascades to `users`, but does NOT cascade to `accounts`. We need to delete the account manually to clean up.
  await adminClient.from('accounts').delete().eq('id', triggerAccount.id);
  
  console.log('\n--- VERIFICATION COMPLETE ---');
}
testTriggerAndRLS();
