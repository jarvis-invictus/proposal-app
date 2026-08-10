require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function patchPaymentInfo() {
  console.log("Setting up payment info test...");
  
  // 1. Get first account
  const { data: accounts, error: accErr } = await supabase.from('accounts').select('id').limit(1);
  const accountId = accounts[0].id;
  
  // 2. Set default_payment_info on account
  await supabase.from('accounts').update({
    default_payment_info: { instructions: "ACCOUNT DEFAULT: Please pay via Wire Transfer to Account #123456789" }
  }).eq('id', accountId);
  console.log("Updated account default_payment_info");

  // 3. Set proposal-level override payment_info on one of the proposals
  const { data: proposals } = await supabase.from('proposals').select('id').eq('account_id', accountId).limit(1);
  if (proposals && proposals.length > 0) {
    await supabase.from('proposals').update({
      payment_info: { instructions: "PROPOSAL OVERRIDE: For this specific Acme project, please pay via UPI to acme-project@upi" }
    }).eq('id', proposals[0].id);
    console.log("Updated proposal override payment_info on proposal ID:", proposals[0].id);
  }
}

patchPaymentInfo().catch(console.error);
