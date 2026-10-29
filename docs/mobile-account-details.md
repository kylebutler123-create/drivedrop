# Mobile account details

Applies the approved account-page design below 1024px to Personal details, Business & photos, Verification & insurance, and Stripe payout setup. The installed home-screen app and mobile website share these components. Navy identity panels, orange actions, white cards and the existing white bottom navigation match the account and messages screens.

Personal and business summaries use existing account data. A shared editing context opens the original account editor without duplicating saves or losing its draft. Success messages remain visible after saving. Photo rows retain the original file inputs, crop/position dialog, uploads and remove actions. Empty photo slots use initials or vehicle icons, never sample imagery.

Verification cards use actual document status, expiry, insurer/policy details and authorised document links. Replacement controls reveal and focus the existing appropriate upload form. Missing-document choices, expiry warnings, review notes, business editing and review-submission eligibility remain available. No upload, approval or eligibility logic changes.

Stripe setup retains its original status request, dashboard/onboarding actions, disabled states, requirement and bank-payout warnings, refresh and error handling. The mobile summary reflects the current connection and environment; no bank details, balances or approved states are invented. No payment configuration, API routes, authentication or database code changes.

Validation: TypeScript, production build and 20 isolated browser checks passed. Fixtures cover transporter and customer editing, save confirmation, photo crop/upload/remove, signed document upload, review submission, expired/pending/rejected verification, missing documents, Stripe error recovery and incomplete/review/paused/failed-bank states. Layouts were checked at 320, 390, 430 and 768px. Production-build desktop comparisons at 1440px showed zero changed pixels for transporter account, customer account and verification. No browser runtime errors occurred. All browser mutations were intercepted locally; live accounts, uploads, payments and messages were not modified by QA.
