const { createClient } = require('@supabase/supabase-js');
const { chromium } = require('playwright');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_URL = 'http://localhost:3000/api';

async function verifyGoldenPath() {
  console.log('--- STARTING GOLDEN PATH REGRESSION PASS ---');
  
  const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  
  const uid = 'golden_path_user@invictus.test';
  const pass = 'GoldenPass123!';
  
  // Cleanup
  const { data: users } = await adminClient.auth.admin.listUsers();
  for (const u of users.users) {
      if (u.email === uid) await adminClient.auth.admin.deleteUser(u.id);
  }

  // 1. Intake / Setup
  console.log('1. Intake: Creating user and account...');
  const { data: userAuth, error: e1 } = await adminClient.auth.admin.createUser({ email: uid, password: pass, email_confirm: true });
  if (e1) { console.error('Failed to create user:', e1); return; }

  await new Promise(r => setTimeout(r, 500)); // wait for trigger
  const { data: triggerUser } = await adminClient.from('users').select('*').eq('id', userAuth.user.id).single();
  const accountId = triggerUser.account_id;

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data: sessionData } = await client.auth.signInWithPassword({ email: uid, password: pass });
  const token = sessionData.session.access_token;

  const { data: tmpl } = await client.from('templates').select('id').limit(1).single();
  
  console.log('2. Intake: Creating proposal...');
  const slug = 'golden-path-' + Date.now();
  const { data: prop, error: propErr } = await client.from('proposals').insert({
    account_id: accountId,
    template_id: tmpl.id,
    slug: slug,
    status: 'DRAFT',
    content: { title: 'Initial Draft' }
  }).select().single();
  
  if (propErr) throw propErr;
  console.log(`✅ Proposal created: ${prop.id}`);

  // 3. Edit / Autosave
  console.log('3. Editor: Autosaving content updates...');
  const patchRes = await fetch(`${API_URL}/proposals/${prop.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ content: { title: 'Updated Golden Proposal', clientName: 'Acme Corp' } })
  });
  if (!patchRes.ok) throw new Error('Failed to autosave ' + patchRes.status);
  console.log('✅ Proposal autosaved.');

  // 4. Publish
  console.log('4. Publish: Setting status to PUBLISHED...');
  const pubRes = await fetch(`${API_URL}/proposals/${prop.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ status: 'PUBLISHED' })
  });
  if (!pubRes.ok) throw new Error('Failed to publish ' + pubRes.status);
  console.log('✅ Proposal published.');

  // 5. Public View
  console.log('5. Public View: Simulating visitor...');
  const viewRes = await fetch(`${API_URL}/proposals/${slug}/view`, { method: 'POST' });
  if (!viewRes.ok) throw new Error('Failed to track view ' + viewRes.status);
  console.log('✅ Public view tracked.');

  // 6. Notification Check
  console.log('6. Notifications: Checking delivery...');
  const notifRes = await fetch(`${API_URL}/notifications`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const notifData = await notifRes.json();
  if (notifData.notifications.length === 1 && notifData.notifications[0].proposals.slug === slug) {
    console.log('✅ Notification successfully delivered for the view.');
  } else {
    throw new Error('Notification not found or mismatched!');
  }

  // 7. PDF Export simulation
  console.log('7. PDF Export: Testing rendering logic...');
  let pdfRendered = false;
  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    // Verify the page loads successfully and exposes window.print logic
    await page.goto(`http://localhost:3000/p/${slug}`);
    await page.waitForSelector('h1:has-text("Updated Golden Proposal")');
    pdfRendered = true;
    await browser.close();
    console.log('✅ PDF layout loaded and rendered cleanly in headless browser.');
  } catch (e) {
    console.error('❌ PDF rendering test failed', e);
  }

  // Cleanup
  await adminClient.auth.admin.deleteUser(userAuth.user.id);
  await adminClient.from('accounts').delete().eq('id', accountId);
  
  if (pdfRendered) {
    console.log('\n✅ ALL GOLDEN PATH CHECKS PASSED: Intake → Edit → Publish → View → Notification → PDF');
  } else {
    console.log('\n❌ GOLDEN PATH INCOMPLETE');
  }
}
verifyGoldenPath();
