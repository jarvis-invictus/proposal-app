require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE URL or KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log("Seeding proposal...");
  
  // 1. Get first account
  const { data: accounts, error: accErr } = await supabase.from('accounts').select('id').limit(1);
  if (accErr || !accounts || accounts.length === 0) {
    console.error("Failed to find account", accErr);
    process.exit(1);
  }
  const accountId = accounts[0].id;
  console.log("Found account:", accountId);

  // 2. Get or create a system template
  let { data: templates, error: tplErr } = await supabase.from('templates').select('id').limit(1);
  let templateId;
  if (!templates || templates.length === 0) {
    const { data: newTpl, error: newTplErr } = await supabase.from('templates').insert({
      name: 'Standard Proposal',
      category: 'General',
      structure: {},
      is_system_default: true,
      account_id: accountId
    }).select('id').single();
    if (newTplErr) throw newTplErr;
    templateId = newTpl.id;
  } else {
    templateId = templates[0].id;
  }
  console.log("Found template:", templateId);

  // 3. Insert the Acme Corp proposal
  const content = {
    "title": "Website Redesign Proposal for Acme Corp",
    "clientName": "Acme Corp",
    "preparedFor": "John",
    "preparedBy": "WebStudio",
    "dateIssued": "October 24, 2023",
    "validUntil": "November 7, 2023",
    "packages": [
      {
        "name": "Standard",
        "description": "Ideal for small businesses looking to establish an online presence with essential features.",
        "originalPrice": 6000,
        "discountedPrice": 5000,
        "popular": false,
        "deliverables": [
          "Design and development of 5 web pages",
          "Basic SEO setup",
          "Responsive design"
        ]
      },
      {
        "name": "Pro",
        "description": "Perfect for growing businesses needing more advanced features and a robust CMS.",
        "originalPrice": 10000,
        "discountedPrice": 8000,
        "popular": true,
        "deliverables": [
          "Design and development of 10 web pages",
          "Content Management System (CMS) integration",
          "Advanced SEO setup",
          "Responsive design"
        ]
      }
    ],
    "addOns": [
      {
        "name": "Logo Design",
        "description": "Enhance your brand identity with a custom logo design.",
        "price": 1000,
        "deliverables": [
          "Custom logo concepts",
          "Final design delivered in multiple formats"
        ]
      }
    ],
    "timeline": [
      {
        "phase": "Design",
        "duration": "2 weeks",
        "description": "Create bespoke designs tailored to Acme Corp's brand and objectives."
      },
      {
        "phase": "Development",
        "duration": "2 weeks",
        "description": "Develop functional and responsive web solutions based on approved designs."
      }
    ],
    "terms": [
      "Revisions beyond 2 rounds billed hourly",
      "All content to be provided by Acme Corp prior to project commencement",
      "Client feedback required within 48 hours of request to maintain timeline"
    ],
    "paymentSection": {
      "schedule": "50% advance, 50% on completion",
      "terms": "Invoices payable within 14 days of issue."
    }
  };

  const { data: proposal, error: propErr } = await supabase.from('proposals').insert({
    account_id: accountId,
    template_id: templateId,
    status: 'DRAFT',
    content: content,
    slug: 'acme-corp-' + Math.random().toString(36).substring(7)
  }).select('id').single();

  if (propErr) {
    console.error("Failed to insert proposal:", propErr);
    process.exit(1);
  }

  console.log("Successfully inserted proposal with ID:", proposal.id);
}

seed();
