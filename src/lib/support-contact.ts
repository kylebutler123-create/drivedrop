// Public customer-support details, matching the live Stripe business profile.
export const SUPPORT_CONTACT = {
  email: 'support@drive-drop.com',
  phone: '07438 285027',
  phoneHref: 'tel:+447438285027',
  address: ['12 Elizabeth Avenue', 'Newbury', 'RG14 6EY', 'United Kingdom'],
} as const;

export const CONTACT_ENQUIRY_TYPES = [
  'General enquiry',
  'Customer account',
  'Transporter account',
  'Booking enquiry',
  'Feedback',
  'Other',
] as const;
