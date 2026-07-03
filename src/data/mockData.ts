export type ClassStatus = 'reserved' | 'waitlist' | 'full' | 'open';

export interface Attendee {
  bookingId: string;
  athleteId: string;
  name: string;
  initials: string;
  color: string;
  url?: string | null;
}

export interface CancelledBooking {
  bookingId: string;
  name: string;
  initials: string;
  color: string;
  cancelledAt: string | null;
}

export interface ClassItem {
  id: string;
  name: string;
  date: string;
  time: string;
  coach: string;
  duration: string;
  enrolled: number;
  capacity: number;
  status: ClassStatus;
  wod: string;
  avatars: { initial: string; color: string; url?: string | null }[];
  attendees: Attendee[];
  waitlist: Attendee[];
  cancelled: CancelledBooking[];
}


