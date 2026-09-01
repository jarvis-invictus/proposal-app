# Database Schema & Data Dictionary

## Enums
* `source_type_enum`: `'url'`, `'image'`, `'document'`, `'manual'`
* `proposal_status_enum`: `'DRAFT'`, `'PUBLISHED'`, `'ARCHIVED'`, `'PENDING_APPROVAL'`

## Tables

### 1. `accounts`
Core tenant table. Created automatically on auth user signup.
* `id`: UUID PRIMARY KEY
* `name`: TEXT NOT NULL
* `payment_upi_id`: TEXT
* `payment_link`: TEXT
* `payment_qr_url`: TEXT
* `business_address`: TEXT
* `gstin`: TEXT
* `default_validity_days`: INT NOT NULL DEFAULT 30
* `plan_tier`: TEXT NOT NULL DEFAULT 'free' (CHECK: 'free', 'pay_per_proposal', 'agency')
* `extra_domain_slots`: INT NOT NULL DEFAULT 0
* `category`: TEXT (CHECK: 'agency', 'dev', 'design', 'freelance', 'other')
* `onboarding_completed_at`: TIMESTAMPTZ
* `created_at`: TIMESTAMPTZ NOT NULL DEFAULT NOW()
* **RLS:** `Users can read own account`, `Users can update own account`.

### 2. `users`
Maps Auth users to Accounts and defines roles.
* `id`: UUID PRIMARY KEY (references auth.users.id ON DELETE CASCADE)
* `account_id`: UUID NOT NULL (references accounts.id)
* `role`: TEXT NOT NULL DEFAULT 'owner' (CHECK: 'owner', 'approver', 'drafter')
* `avatar_url`: TEXT
* **RLS:** `Users can read users in own account`, `Users can update users in own account`.

### 3. `invitations`
Pending team invites.
* `id`: UUID PRIMARY KEY
* `account_id`: UUID NOT NULL (references accounts.id)
* `email`: TEXT NOT NULL
* `role`: TEXT NOT NULL (CHECK: 'owner', 'approver', 'drafter')
* `invited_by`: UUID (references users.id)
* `invited_at`: TIMESTAMPTZ NOT NULL DEFAULT NOW()
* `accepted_at`: TIMESTAMPTZ
* **RLS:** `Account members can manage own invitations`.

### 4. `domains`
Custom domains per account.
* `id`: UUID PRIMARY KEY
* `account_id`: UUID NOT NULL (references accounts.id)
* `domain_name`: TEXT NOT NULL UNIQUE
* `cname_verified`: BOOLEAN NOT NULL DEFAULT false
* `ssl_issued`: BOOLEAN NOT NULL DEFAULT false
* `created_at`: TIMESTAMPTZ NOT NULL DEFAULT NOW()
* **RLS:** `Account members can manage own domains`.

### 5. `brand_kits`
Saved branding assets extracted via the wizard or manually uploaded.
* `id`: UUID PRIMARY KEY
* `account_id`: UUID NOT NULL (references accounts.id)
* `name`: TEXT
* `source_type`: source_type_enum NOT NULL
* `source_reference`: TEXT
* `colors`: JSONB (Implicit shape: `{ primary: string, secondary: string, accent: string, background: string, text: string, extra: string[] }`)
* `fonts`: JSONB (Implicit shape: `{ heading: string, body: string, accent: string }`)
* `logo_url`: TEXT
* `created_at`: TIMESTAMPTZ NOT NULL DEFAULT NOW()
* `updated_at`: TIMESTAMPTZ NOT NULL DEFAULT NOW()
* **RLS:** `Users can manage own brand kits`.

### 6. `templates`
Structure for proposals, either system default or saved by the account.
* `id`: UUID PRIMARY KEY
* `name`: TEXT NOT NULL
* `category`: TEXT NOT NULL
* `structure`: JSONB (Implicit shape: `{ sections: Array<{ type: string, [key: string]: any }> }`. Example: `{"sections": [{"type": "hero", "title": "Accelerate Your Growth"}]}`)
* `is_system_default`: BOOLEAN NOT NULL DEFAULT false
* `account_id`: UUID (references accounts.id)
* **RLS:** `Public can read system templates`, `Users can manage own templates`.

### 7. `proposals`
Core document table.
* `id`: UUID PRIMARY KEY
* `account_id`: UUID NOT NULL (references accounts.id)
* `brand_kit_id`: UUID (references brand_kits.id)
* `template_id`: UUID NOT NULL (references templates.id)
* `status`: proposal_status_enum NOT NULL DEFAULT 'DRAFT'
* `content`: JSONB NOT NULL (Validates against `ProposalSchemaV1` Zod schema - includes title, clientName, packages, timeline, etc.)
* `slug`: TEXT NOT NULL UNIQUE
* `submitted_by`: UUID (references users.id)
* `submitted_at`: TIMESTAMPTZ
* `approved_by`: UUID (references users.id)
* `approved_at`: TIMESTAMPTZ
* `accepted_at`: TIMESTAMPTZ
* `accepted_by_name`: TEXT
* `last_viewed_at`: TIMESTAMPTZ
* `created_at`: TIMESTAMPTZ NOT NULL DEFAULT NOW()
* `updated_at`: TIMESTAMPTZ NOT NULL DEFAULT NOW()
* **RLS:** `Public can read published proposals` (using status = 'PUBLISHED'), `Users can manage own proposals`.

### 8. `notifications`
Events triggered for the account owner.
* `id`: UUID PRIMARY KEY
* `account_id`: UUID NOT NULL (references accounts.id)
* `proposal_id`: UUID (references proposals.id)
* `message`: TEXT NOT NULL
* `read`: BOOLEAN NOT NULL DEFAULT FALSE
* `created_at`: TIMESTAMPTZ NOT NULL DEFAULT NOW()
* **RLS:** `Users can view their own account notifications`, `Users can update their own account notifications`.

## JSONB Implicit Shapes

### `brand_kits.colors`
```json
{
  "primary": "#7cbcdc",
  "secondary": "#cfe4f2",
  "accent": "#17384f",
  "background": "#f7f7f7",
  "text": "#000000",
  "extra": ["#3d4451"]
}
```

### `brand_kits.fonts`
```json
{
  "heading": "Inter Tight",
  "body": "Inter Tight",
  "accent": "Instrument Serif"
}
```

### `templates.structure`
```json
{
  "sections": [
    {
      "type": "hero",
      "title": "Your Brand, Elevated"
    },
    {
      "type": "deliverables",
      "list": ["Logo", "Brand Book"]
    }
  ]
}
```

### `proposals.content`
```json
{
  "title": "Website Redesign",
  "clientName": "Acme Corp",
  "preparedFor": "John Doe",
  "preparedBy": "Marg Studio",
  "dateIssued": "October 24, 2024",
  "validUntil": "November 7, 2024",
  "packages": [
    {
      "name": "Core",
      "description": "Essential items",
      "originalPrice": 5000,
      "discountedPrice": 4500,
      "popular": true,
      "deliverables": ["Design", "Dev"]
    }
  ],
  "addOns": [],
  "timeline": [],
  "terms": ["Standard terms"],
  "paymentSection": {
    "schedule": "50% upfront",
    "terms": ""
  },
  "metadata": {
    "lastViewedAt": "2026-08-31T00:00:00Z"
  }
}
```
