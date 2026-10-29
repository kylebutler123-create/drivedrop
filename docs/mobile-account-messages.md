# Mobile account and messaging design

Extends the approved DriveDrop app to Account, the Messages inbox and an open conversation. Reference: “DriveDrop account and messaging preview.png”, approved 29 October 2026 (Library file `libfile_a2fa29c3ce4081919b1fa1c7b36b9bdf`).

The mobile account overview uses the actual name, role and account status. Its grouped menu exposes the existing personal/business editors, profile photos, verification, payout setup, job-email preferences, login security and account-closure controls. Customers receive customer-specific settings and payment history. Existing forms remain mounted, retaining drafts and their original save/validation flows.

The mobile inbox uses the existing search, unread filters, conversation data and authorised vehicle photos. The conversation view reuses the existing message stream, sending, attachments, unread marking, draft confirmation and deletion. Support retains its text-only behaviour. The composer and white bottom navigation adapt to the visual viewport. All new presentation rules are scoped below 1024px and to customer/transporter pages; admin is unchanged.

No API endpoints, database schema, payment rules or production configuration changed. The mockup's example names, statuses, photographs and conversations are replaced by real account data. Missing vehicle photos use the existing fallback.

## Validation

- TypeScript and the actual application production build passed.
- 18 isolated browser checks passed with synthetic accounts and intercepted API responses: role-specific settings, account-closure blockers, search/unread filters, draft protection, send failure, image selection/removal, delete confirmation, support restrictions, empty inbox and 320/390/430/768px/reduced-height layouts.
- Desktop screenshots of customer/transporter Account and Messages match the previous preview source: zero differing pixels in all four comparisons with identical fixtures.
- Test authentication and database fixtures are outside the repository. No real messages, account updates, account closure or payment operations were performed during validation.
- Physical-device keyboard behaviour remains a real-device check; browser tests cover viewport resizing.
