-- Seed System Default Templates
INSERT INTO public.templates (name, category, structure, is_system_default, account_id) 
VALUES
('Growth Retainer Proposal', 'Digital Marketing Agency', '{"sections": [{"type": "hero", "title": "Accelerate Your Growth"}, {"type": "services", "items": ["SEO", "PPC", "Content"]}, {"type": "pricing", "tiers": ["Basic", "Pro", "Enterprise"]}]}', true, null),
('AI Implementation Strategy', 'AI/Tech Agency', '{"sections": [{"type": "hero", "title": "Transform Your Business with AI"}, {"type": "process", "steps": ["Audit", "Model Selection", "Integration"]}, {"type": "roi", "metrics": ["Efficiency", "Cost Savings"]}]}', true, null),
('Brand Identity Package', 'Creative/Freelance', '{"sections": [{"type": "hero", "title": "Your Brand, Elevated"}, {"type": "portfolio", "style": "grid"}, {"type": "deliverables", "list": ["Logo", "Brand Book", "Assets"]}]}', true, null)
ON CONFLICT DO NOTHING;
