-- Correction 4: the real brand-review screen has an editable "Kit name" field
-- (ui_kits/app/BrandExtract.jsx's BrandReview), which brand_kits had no column for.
ALTER TABLE brand_kits
  ADD COLUMN IF NOT EXISTS name TEXT;
