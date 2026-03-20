// Fixed ID for the platform onboarding campaign.
// Must match the UUID inserted via SQL seed.
export const ONBOARDING_CAMPAIGN_ID = '00000000-0000-0000-0000-000000000002'

export type OnboardingStatus = 'loading' | 'unlocked' | 'review' | 'submit' | 'start'
