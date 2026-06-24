export type ClassStatus = 'reserved' | 'full' | 'open';

export interface Attendee {
  name: string;
  initials: string;
  color: string;
}

export interface ClassItem {
  id: string;
  name: string;
  time: string;
  coach: string;
  duration: string;
  enrolled: number;
  capacity: number;
  status: ClassStatus;
  wod: string;
  avatars: { initial: string; color: string }[];
  attendees: Attendee[];
}

export interface Member {
  id: string;
  name: string;
  initials: string;
  color: string;
  plan: string;
  status: 'active' | 'pending' | 'inactive';
}

export interface Invoice {
  id: string;
  number: string;
  member: string;
  date: string;
  plan: string;
  amount: string;
  paid: boolean;
}

export interface DM {
  id: string;
  name: string;
  initials: string;
  color: string;
  preview: string;
  time: string;
  unread: number;
  messages: string[];
}

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildWeekDays() {
  const today = new Date();
  const dow = today.getDay();
  const daysFromMon = dow === 0 ? 6 : dow - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysFromMon);
  const dayNames = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { day: dayNames[d.getDay()], num: String(d.getDate()), isoDate: isoDate(d) };
  });
}

export const TODAY_ISO = isoDate(new Date());
export const DATE_PILLS = buildWeekDays();
export const TODAY_IDX = DATE_PILLS.findIndex(d => d.isoDate === TODAY_ISO);

export const MEMBERS: Member[] = [
  { id: '1', name: 'Carlos Martínez', initials: 'CM', color: '#f95c00', plan: 'Ilimitado · vence 31 jul', status: 'active' },
  { id: '2', name: 'Laura García', initials: 'LG', color: '#8b5cf6', plan: '3 días/semana · vence 30 jun', status: 'active' },
  { id: '3', name: 'Javier Ruiz', initials: 'JR', color: '#f59e0b', plan: 'Mensual · pago pendiente', status: 'pending' },
  { id: '4', name: 'Ana Pérez', initials: 'AP', color: '#22c55e', plan: 'Bono 10 clases · 4 restantes', status: 'active' },
  { id: '5', name: 'Miguel Sánchez', initials: 'MS', color: '#ef4444', plan: 'Expiró 15 jun', status: 'inactive' },
];

export const INVOICES: Invoice[] = [
  { id: '1', number: 'FAC-2026-024', member: 'Carlos Martínez', date: '1 jun', plan: 'Ilimitado', amount: '55,00€', paid: true },
  { id: '2', number: 'FAC-2026-023', member: 'Laura García', date: '1 jun', plan: '3 días/semana', amount: '40,00€', paid: true },
  { id: '3', number: 'FAC-2026-022', member: 'Nuria Fernández', date: '1 jun', plan: 'Ilimitado', amount: '55,00€', paid: true },
];

export const ATHLETE_DMS: DM[] = [
  {
    id: '1',
    name: 'Box Admin',
    initials: 'A',
    color: '#f95c00',
    preview: 'Hola Carlos, te confirmamos tu renovación para agosto...',
    time: '10:05',
    unread: 1,
    messages: ['Hola Carlos, te confirmamos tu renovación para agosto.'],
  },
  {
    id: '2',
    name: 'Sara Martínez (Coach)',
    initials: 'SM',
    color: '#8b5cf6',
    preview: '¡Buen trabajo hoy! Tu técnica en el snatch...',
    time: 'Ayer',
    unread: 0,
    messages: ['¡Buen trabajo hoy! Tu técnica en el snatch está mejorando mucho.'],
  },
];

export const ADMIN_DMS: DM[] = [
  {
    id: '1',
    name: 'Carlos Martínez',
    initials: 'CM',
    color: '#f95c00',
    preview: '¿Puedo cambiar mi membresía a 3 días?',
    time: '09:50',
    unread: 1,
    messages: ['¿Puedo cambiar mi membresía a 3 días?'],
  },
  {
    id: '2',
    name: 'Javier Ruiz',
    initials: 'JR',
    color: '#f59e0b',
    preview: 'Perdona el retraso, esta semana te pago...',
    time: 'Ayer',
    unread: 2,
    messages: ['Perdona el retraso, esta semana te pago sin falta.', '¿Me mandáis el número de cuenta?'],
  },
  {
    id: '3',
    name: 'Laura García',
    initials: 'LG',
    color: '#8b5cf6',
    preview: '¡Muchas gracias por la felicitación!',
    time: 'Lun',
    unread: 0,
    messages: ['¡Muchas gracias por la felicitación del PR! 😊'],
  },
];
