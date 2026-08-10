const fs = require('fs')
const path = require('path')

// Parse .env.local
const envPath = path.join(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
const env = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) env[match[1]] = match[2].trim()
})

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

async function seed() {
  const templates = [
    {
      name: 'Growth Retainer Proposal',
      category: 'Digital Marketing Agency',
      structure: { sections: [{ type: 'hero', title: 'Accelerate Your Growth' }, { type: 'services', items: ['SEO', 'PPC', 'Content'] }, { type: 'pricing', tiers: ['Basic', 'Pro', 'Enterprise'] }] },
      is_system_default: true,
    },
    {
      name: 'AI Implementation Strategy',
      category: 'AI/Tech Agency',
      structure: { sections: [{ type: 'hero', title: 'Transform Your Business with AI' }, { type: 'process', steps: ['Audit', 'Model Selection', 'Integration'] }, { type: 'roi', metrics: ['Efficiency', 'Cost Savings'] }] },
      is_system_default: true,
    },
    {
      name: 'Brand Identity Package',
      category: 'Creative/Freelance',
      structure: { sections: [{ type: 'hero', title: 'Your Brand, Elevated' }, { type: 'portfolio', style: 'grid' }, { type: 'deliverables', list: ['Logo', 'Brand Book', 'Assets'] }] },
      is_system_default: true,
    }
  ]

  console.log('Seeding templates...')
  
  for (const template of templates) {
    const checkRes = await fetch(`${supabaseUrl}/rest/v1/templates?name=eq.${encodeURIComponent(template.name)}&is_system_default=eq.true&select=id`, {
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      }
    })
    const existing = await checkRes.json()
    
    if (existing.length === 0) {
      const insertRes = await fetch(`${supabaseUrl}/rest/v1/templates`, {
        method: 'POST',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(template)
      })
      if (!insertRes.ok) {
        console.error(`Failed to seed ${template.name}:`, await insertRes.text())
      } else {
        console.log(`Seeded ${template.name}`)
      }
    } else {
      console.log(`Template ${template.name} already exists. Skipping.`)
    }
  }
  
  console.log('Done seeding.')
}

seed().catch(console.error)
