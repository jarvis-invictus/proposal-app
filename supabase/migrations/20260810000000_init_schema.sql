-- Create Enums
CREATE TYPE source_type_enum AS ENUM ('url', 'image', 'document', 'manual');
CREATE TYPE proposal_status_enum AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE transaction_type_enum AS ENUM ('GRANT', 'DEDUCT');

-- Create tables
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    default_payment_info JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'admin'
);

CREATE TABLE brand_kits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    source_type source_type_enum NOT NULL,
    source_reference TEXT,
    colors JSONB,
    fonts JSONB,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    structure JSONB NOT NULL,
    is_system_default BOOLEAN DEFAULT FALSE NOT NULL,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    brand_kit_id UUID REFERENCES brand_kits(id) ON DELETE SET NULL,
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE RESTRICT,
    status proposal_status_enum DEFAULT 'DRAFT' NOT NULL,
    content JSONB NOT NULL,
    payment_info JSONB,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    transaction_type transaction_type_enum NOT NULL,
    amount INT NOT NULL,
    proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_brand_kits_updated_at
BEFORE UPDATE ON brand_kits
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_proposals_updated_at
BEFORE UPDATE ON proposals
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Trigger for auto-creating accounts and users on sign-up
CREATE OR REPLACE FUNCTION on_auth_user_created()
RETURNS TRIGGER AS $$
DECLARE
    new_account_id UUID;
BEGIN
    INSERT INTO public.accounts (name)
    VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'My Account'))
    RETURNING id INTO new_account_id;

    INSERT INTO public.users (id, account_id, role)
    VALUES (NEW.id, new_account_id, 'admin');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION on_auth_user_created();

-- RLS Policies

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's account_id
-- We look up the account_id directly from the users table for the authenticated user.
CREATE OR REPLACE FUNCTION public.get_account_id() RETURNS UUID AS $$
  SELECT account_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Accounts
CREATE POLICY "Users can read own account" ON accounts
FOR SELECT USING (id = public.get_account_id());

CREATE POLICY "Users can update own account" ON accounts
FOR UPDATE USING (id = public.get_account_id());

-- Users
CREATE POLICY "Users can read users in own account" ON users
FOR SELECT USING (account_id = public.get_account_id());

CREATE POLICY "Users can update users in own account" ON users
FOR UPDATE USING (account_id = public.get_account_id());

-- Brand Kits
CREATE POLICY "Users can manage own brand kits" ON brand_kits
FOR ALL USING (account_id = public.get_account_id());

-- Templates
CREATE POLICY "Public can read system templates" ON templates
FOR SELECT USING (is_system_default = true);

CREATE POLICY "Users can manage own templates" ON templates
FOR ALL USING (account_id = public.get_account_id());

-- Proposals
CREATE POLICY "Public can read published proposals" ON proposals
FOR SELECT USING (status = 'PUBLISHED');

CREATE POLICY "Users can manage own proposals" ON proposals
FOR ALL USING (account_id = public.get_account_id());

-- Credit Transactions
CREATE POLICY "Users can read own credit transactions" ON credit_transactions
FOR SELECT USING (account_id = public.get_account_id());
