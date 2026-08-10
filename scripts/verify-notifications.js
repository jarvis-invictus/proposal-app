const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// API route URL
const API_URL = 'http://localhost:3000/api/proposals';

async function testNotifications() {
  console.log('--- STARTING NOTIFICATIONS SERVER-SIDE EXCLUSION TEST ---');
  
  const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  
  const uid = 'owner_view_test@invictus.test';
  const pass = 'TestPassword123!';
  
  // Cleanup
  const { data: users } = await adminClient.auth.admin.listUsers();
  for (const u of users.users) {
      if (u.email === uid) {
          await adminClient.auth.admin.deleteUser(u.id);
      }
  }
  await adminClient.from('accounts').delete().eq('name', 'Owner Test Account');
  
  // Setup
  const { data: user1, error: e1 } = await adminClient.auth.admin.createUser({ email: uid, password: pass, email_confirm: true });
  if (e1) console.log('Error creating user', e1);
  
  // Wait for trigger
  await new Promise(r => setTimeout(r, 500));
  
  const { data: existingUser } = await adminClient.from('users').select('account_id').eq('id', user1.user.id).single();
  let acc1;
  if (existingUser) {
    acc1 = { id: existingUser.account_id };
  } else {
    const { data: newAcc } = await adminClient.from('accounts').insert({ name: 'Owner Test Account' }).select().single();
    await adminClient.from('users').insert({ id: user1.user.id, account_id: newAcc.id, role: 'admin' });
    acc1 = newAcc;
  }
  
  const ownerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data: sessionData } = await ownerClient.auth.signInWithPassword({ email: uid, password: pass });
  
  const { data: tmpl } = await ownerClient.from('templates').select('id').limit(1).single();
  
  const { data: prop, error: propErr } = await ownerClient.from('proposals').insert({
    account_id: acc1.id,
    template_id: tmpl.id,
    slug: 'owner-exclusion-test-' + Date.now(),
    status: 'PUBLISHED',
    content: { title: 'Notification Test Proposal' }
  }).select().single();

  if (propErr || !prop) {
    console.error('Failed to create proposal', propErr);
    return;
  }
  
  console.log('✅ Created Proposal:', prop.id, 'with slug:', prop.slug);
  
  // 1. Owner visits the proposal (using their session cookie)
  console.log('\n--- TEST 1: OWNER VISIT ---');
  const resOwner = await fetch(`${API_URL}/${prop.slug}/view`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${sessionData.session.access_token}` }
  });
  
  console.log('Owner fetch status:', resOwner.status);
  const ownerResult = await resOwner.text();
  console.log('Owner View API Response (text):', ownerResult);
  
  const { count: ownerCount } = await adminClient.from('notifications').select('*', { count: 'exact', head: true }).eq('proposal_id', prop.id);
  console.log(`Notification count after owner view: ${ownerCount} (Expected: 0)`);
  if (ownerCount === 0) console.log('✅ PASS: Owner view was successfully ignored.');
  else console.log('❌ FAIL: Owner view created a notification.');

  // 2. Public visits the proposal (unauthenticated)
  console.log('\n--- TEST 2: PUBLIC VISIT ---');
  
  const resPublic = await fetch(`${API_URL}/${prop.slug}/view`, { method: 'POST' });
  console.log('Public fetch status:', resPublic.status);
  const publicResult = await resPublic.text();
  console.log('Public View API Response (text):', publicResult);
  
  const { count: publicCount } = await adminClient.from('notifications').select('*', { count: 'exact', head: true }).eq('proposal_id', prop.id);
  console.log(`Notification count after public view: ${publicCount} (Expected: 1)`);
  if (publicCount === 1) console.log('✅ PASS: Public view successfully created exactly 1 notification.');
  else console.log('❌ FAIL: Public view did not create a notification.');

  // Cleanup
  // await adminClient.auth.admin.deleteUser(user1.user.id);
  // await adminClient.from('accounts').delete().eq('name', 'Owner Test Account');
  console.log('\n--- TESTS COMPLETE ---');
}
testNotifications();
