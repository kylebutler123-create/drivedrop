export type Role = 'CUSTOMER' | 'TRANSPORTER';
export type Booking = {
  id: string; status: string;
  job: {vehicleMake: string; vehicleModel: string; registration: string | null; collection: string; delivery: string; collectionDate: string; collectionFrom: string | null; collectionUntil: string | null};
};
export type Overview = {
  version: 1; fetchedAt: string;
  user: {id: string; name: string; email: string; role: Role; workRestricted: boolean};
  bookings: Booking[];
  notifications: {id: string; title: string; body: string; href: string | null; readAt: string | null; createdAt: string}[];
};
