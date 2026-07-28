-- Fixes the onboarding redirect loop.
--
-- The app assumes exactly one business per owner (AuthContext.fetchBusiness,
-- the dashboard, every useData hook). But nothing enforced that: OnboardingPage
-- INSERTed a fresh business every run, and fetchBusiness used .single(), which
-- ERRORS on 2+ rows and left `business` null — so the dashboard bounced the
-- user back to onboarding, who then created yet another duplicate. A loop.
--
-- Step 1: collapse any existing duplicates, keeping the most recently created
-- business per owner (that's the user's latest onboarding attempt). Deleting
-- the older empty duplicates cascades to their leads/appointments, which is
-- correct — those rows are empty artefacts of the loop.
DELETE FROM businesses a
USING businesses b
WHERE a.owner_id = b.owner_id
  AND (
    a.created_at < b.created_at
    OR (a.created_at = b.created_at AND a.id < b.id)
  );

-- Step 2: enforce one business per owner from now on. This also lets the
-- onboarding save use upsert(onConflict: 'owner_id') so re-running onboarding
-- updates the existing row instead of creating a duplicate.
ALTER TABLE businesses
  ADD CONSTRAINT businesses_owner_id_key UNIQUE (owner_id);
