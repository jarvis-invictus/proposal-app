import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function seed() {
  const templates = [
    {
      name: 'Growth Retainer Proposal',
      category: 'Digital Marketing Agency',
      structure: { sections: [{ type: 'hero', title: 'Accelerate Your Growth' }, { type: 'services', items: ['SEO', 'PPC', 'Content'] }, { type: 'pricing', tiers: ['Basic', 'Pro', 'Enterprise'] }] },
      is_system_default: true,
      account_id: null
    },
    {
      name: 'AI Implementation Strategy',
      category: 'AI/Tech Agency',
      structure: { sections: [{ type: 'hero', title: 'Transform Your Business with AI' }, { type: 'process', steps: ['Audit', 'Model Selection', 'Integration'] }, { type: 'roi', metrics: ['Efficiency', 'Cost Savings'] }] },
      is_system_default: true,
      account_id: null
    },
    {
      name: 'Brand Identity Package',
      category: 'Creative/Freelance',
      structure: { sections: [{ type: 'hero', title: 'Your Brand, Elevated' }, { type: 'portfolio', style: 'grid' }, { type: 'deliverables', list: ['Logo', 'Brand Book', 'Assets'] }] },
      is_system_default: true,
      account_id: null
    }
  ]

  console.log('Seeding templates...')
  
  for (const template of templates) {
    // Check if it already exists to emulate ON CONFLICT DO NOTHING
    const { data: existing } = await supabase
      .from('templates')
      .select('id')
      .eq('name', template.name)
      .eq('is_system_default', true)
      .maybeSingle()
      
    if (!existing) {
      const { error } = await supabase.from('templates').insert(template as any)
      if (error) {
        console.error(`Failed to seed ${template.name}:`, error)
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
