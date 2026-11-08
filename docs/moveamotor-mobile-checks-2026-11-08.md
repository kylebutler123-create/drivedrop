# MoveAMotor mobile checks — 8 November 2026

Checked the live production site in the owner's connected Chrome using temporary 390×844 and 375×812 viewport settings. Browser scrollbar behavior produced content widths of 360–375 pixels. Restored the browser's normal viewport after the checks.

## Results

| Screen | Result |
| --- | --- |
| Homepage, 390px viewport | Original-style MoveAMotor header logo, coastal hero, quote CTA and transporter CTA displayed correctly; visible images loaded |
| Mobile navigation | Opened correctly; MoveAMotor heading/logo, public links, customer/transporter sign-in and account creation controls were readable and usable |
| For transporters, 390px viewport | MoveAMotor wordmark on jacket visible; header, hero and join CTA fit; visible images loaded |
| Transporter registration, 375px viewport | Form, role switch, verification notice, submit button and policy links fit |
| Customer registration, 375px viewport | Form, role switch and submit button fit |
| Get quotes, 375px viewport | Journey form, progress steps, date and time controls fit; opened date picker and confirmed its calendar stayed within screen width |
| Contact, 375px viewport | Form, contact details and footer fit; email link is `mailto:support@moveamotor.co.uk` |
| Customer and transporter login, 375px viewport | Role switch and login controls worked; customer form visually inspected; no overflow in either role |
| Transporter password-reset page, 375px viewport | Correct page reached from the transporter login link; form and navigation fit |

DOM measurements on all nine page states showed no horizontal overflow (`scrollWidth` did not exceed `clientWidth`) and no visible `DriveDrop` / `Drive Drop` text. Header and footer logos retained their established artwork and MoveAMotor capitalisation. No layout changes were needed.

This was responsive browser inspection of public pages, not testing on a physical handset or a full authenticated booking/payment workflow. No registration, quote, login or password-reset form was submitted. The separately authorised contact-form email retest is recorded in `moveamotor-email-switch-2026-11-08.md`.

No application code or logo assets were changed. Screenshots were inspected during the check; no private account screenshots were saved.
