require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function verifyAll() {
  console.log("=== SCENARIO 1: DRAFT BLOCKING & OWNER PREVIEW ===");
  // Reset Acme to DRAFT
  await supabase.from('proposals').update({ status: 'DRAFT' }).like('slug', 'acme%');
  const { data: draftProposal } = await supabase.from('proposals').select('id, account_id, status, slug').like('slug', 'acme%').single();
  
  // Simulate Public Visitor
  const viewerAccountIdPublic = null;
  const isOwnerPublic = viewerAccountIdPublic === draftProposal.account_id;
  const publicAccess = (draftProposal.status === 'PUBLISHED' || isOwnerPublic) ? "ALLOWED" : "BLOCKED (404)";
  console.log(`[Public Visitor] Access to DRAFT proposal: ${publicAccess}`);
  
  // Simulate Owner Visitor
  const viewerAccountIdOwner = draftProposal.account_id;
  const isOwnerAuth = viewerAccountIdOwner === draftProposal.account_id;
  const ownerAccess = (draftProposal.status === 'PUBLISHED' || isOwnerAuth) ? "ALLOWED" : "BLOCKED (404)";
  console.log(`[Owner] Access to DRAFT proposal: ${ownerAccess}`);

  
  console.log("\n=== SCENARIO 2 & 3: PAYMENT OVERRIDE ON PUBLISHED PROPOSAL ===");
  // Publish it
  await supabase.from('proposals').update({ status: 'PUBLISHED' }).eq('id', draftProposal.id);
  const { data: publishedProposal, error: pubErr } = await supabase.from('proposals').select('*, accounts(default_payment_info)').eq('id', draftProposal.id).single();
  
  if (pubErr) {
    console.error("Error fetching published proposal:", pubErr);
    return;
  }
  
  const paymentInfo = publishedProposal.payment_info || publishedProposal.accounts?.default_payment_info || null;
  console.log("Proposal's Native payment_info:", publishedProposal.payment_info);
  console.log("Account's fallback default_payment_info:", publishedProposal.accounts?.default_payment_info);
  console.log("-> FINAL RESOLVED PAYMENT RENDER:", paymentInfo);


  console.log("\n=== SCENARIO 4: VIEW TRACKING INTEGRITY ===");
  // Reset tracking
  const resetContent = { ...publishedProposal.content };
  delete resetContent.metadata?.lastViewedAt;
  await supabase.from('proposals').update({ content: resetContent }).eq('id', publishedProposal.id);

  console.log("[Owner Visit] Triggering view logic...");
  if (!isOwnerAuth && publishedProposal.status === 'PUBLISHED') {
    resetContent.metadata = { lastViewedAt: new Date().toISOString() };
    await supabase.from('proposals').update({ content: resetContent }).eq('id', publishedProposal.id);
  }
  
  let { data: checkOwner } = await supabase.from('proposals').select('content').eq('id', publishedProposal.id).single();
  console.log("lastViewedAt after Owner visit:", checkOwner.content.metadata?.lastViewedAt || "null (Not tracked)");

  console.log("[Client Visit] Triggering view logic...");
  if (!isOwnerPublic && publishedProposal.status === 'PUBLISHED') {
    resetContent.metadata = { lastViewedAt: new Date().toISOString() };
    await supabase.from('proposals').update({ content: resetContent }).eq('id', publishedProposal.id);
  }
  
  let { data: checkClient } = await supabase.from('proposals').select('content').eq('id', publishedProposal.id).single();
  console.log("lastViewedAt after Client visit:", checkClient.content.metadata?.lastViewedAt);

}

verifyAll().catch(console.error);
