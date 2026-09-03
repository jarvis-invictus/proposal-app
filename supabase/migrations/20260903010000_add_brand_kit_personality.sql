-- A single freeform sentence describing the brand's tone/voice, from Firecrawl's website scan
-- (source_type = 'url' only — other sources have no personality signal). It only ever becomes
-- one sentence in a generation prompt, so there's no reason to model it as structured data the
-- way colors/fonts are.
ALTER TABLE brand_kits ADD COLUMN IF NOT EXISTS personality TEXT;
