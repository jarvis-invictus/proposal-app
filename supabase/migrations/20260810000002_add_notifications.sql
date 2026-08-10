-- Create Notifications Table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    proposal_id UUID REFERENCES public.proposals(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Notifications RLS Policies
CREATE POLICY "Users can view their own account notifications"
    ON public.notifications FOR SELECT
    USING (account_id IN (
        SELECT account_id FROM public.users WHERE users.id = auth.uid()
    ));

CREATE POLICY "Users can update their own account notifications"
    ON public.notifications FOR UPDATE
    USING (account_id IN (
        SELECT account_id FROM public.users WHERE users.id = auth.uid()
    ));
