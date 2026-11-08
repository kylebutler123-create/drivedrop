# MoveAMotor Stripe branding — 8 November 2026

Updated the existing production Stripe account `acct_1US4BsLo6y2NJoQw` through the owner's connected Chrome browser. The account was originally labelled `drivedrop`; no new Stripe account was created.

## Saved settings

| Setting | Saved value |
| --- | --- |
| Dashboard account name | MoveAMotor |
| Public business/trading name | MoveAMotor |
| Business website | https://moveamotor.co.uk |
| Customer support email | support@moveamotor.co.uk |
| Customer support URL | https://moveamotor.co.uk/contact |
| Privacy policy URL | https://moveamotor.co.uk/privacy |
| Terms of service URL | https://moveamotor.co.uk/terms |
| Statement descriptor | MOVEAMOTOR |
| Connect branding business name | MoveAMotor |
| Stripe profile display name | MoveAMotor |
| Stripe profile business email | support@moveamotor.co.uk |
| Stripe profile business website | https://moveamotor.co.uk |

- Replaced only the initial `DriveDrop` name with `MoveAMotor` in the existing business product description and Stripe profile About text. The description of booking, collection, delivery and payout behavior was preserved.
- The optional shortened statement descriptor was empty and remains empty.
- Stripe's separate Connect branding override still contained `drivedrop`; it was updated. The saved onboarding preview now reads **MoveAMotor uses Stripe for secure payments.** The editor explains that its business-name setting applies to dashboards and onboarding.
- The existing profile handle `@drive_drop` and its `stripe.com/@drive_drop` URL were retained. This task changed the profile's display details, not its existing link or network identity.
- Default branding offered icon/logo uploads; no logo, icon, colour or theming change was made. The website's restored original-style MoveAMotor logos were not edited.

## Verification

- Public details were reopened after saving; trading name, website, contact, privacy and terms URLs matched the new values. The saved Business details page displayed the new support email and statement descriptor.
- Account-name save completed with the Save button disabled and the account switcher labelled MoveAMotor.
- Connect branding save returned to a MoveAMotor preview with no pending outer Save action.
- Stripe profile save completed with the Save details button disabled and the saved display name, email, website and About values present.
- Account status showed **No active tasks to complete** and **Payments / Payouts Active**. The separate Cartes Bancaires capability was listed as paused; it was not changed or investigated as part of the rebrand.
- A targeted source search found no statement-descriptor override or old DriveDrop text in `src/lib/stripe*`, `src/app/api/payments` or `src/app/api/stripe`.

No payment was made, refunded or released. No legal entity, representative, bank account, payout destination, verification document, API key, webhook, payment flag or database setting was changed. No private account screenshots or identity details were saved.

## Remaining rebrand follow-up

- Microsoft mailbox DKIM was subsequently enabled, and retest MM-1108-B passed SPF/DKIM/DMARC. Both emails still reached Junk; see `moveamotor-email-switch-2026-11-08.md`.
- Public mobile visual checks subsequently passed; see `moveamotor-mobile-checks-2026-11-08.md`. The separate genuine live booking validation is not completed by these settings checks.
- Google ownership, sitemap and change of address are complete; see `moveamotor-google-migration-2026-11-08.md`.
