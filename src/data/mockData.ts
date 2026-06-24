export type ClassStatus = 'reserved' | 'full' | 'open';

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

export const CLASSES_TODAY: ClassItem[] = [
  {
    id: '1',
    name: 'WOD CrossFit',
    time: '07:00',
    coach: 'Sara Martínez',
    duration: '60 min',
    enrolled: 12,
    capacity: 16,
    status: 'reserved',
    wod: '3 rounds:\n10 Pull-ups\n15 Push-ups\n20 Air Squats\nPor tiempo — cap 20 min',
    avatars: [
      { initial: 'C', color: '#f95c00' },
      { initial: 'M', color: '#8b5cf6' },
      { initial: 'A', color: '#06b6d4' },
    ],
  },
  {
    id: '2',
    name: 'Open Box',
    time: '10:00',
    coach: 'Libre',
    duration: '60 min',
    enrolled: 5,
    capacity: 20,
    status: 'open',
    wod: 'Todo el material disponible.',
    avatars: [
      { initial: 'L', color: '#8b5cf6' },
      { initial: 'N', color: '#ec4899' },
    ],
  },
  {
    id: '3',
    name: 'Halterofilia',
    time: '12:00',
    coach: 'Marcos Díaz',
    duration: '75 min',
    enrolled: 16,
    capacity: 16,
    status: 'full',
    wod: 'Snatch + Clean & Jerk\nTécnica + levantamientos máximos',
    avatars: [
      { initial: 'R', color: '#f95c00' },
      { initial: 'J', color: '#22c55e' },
      { initial: 'T', color: '#06b6d4' },
    ],
  },
  {
    id: '4',
    name: 'WOD CrossFit',
    time: '18:00',
    coach: 'Sara Martínez',
    duration: '60 min',
    enrolled: 3,
    capacity: 16,
    status: 'open',
    wod: 'AMRAP 20 min:\n5 Deadlifts @ 100kg\n10 Box Jumps\n15 KB Swings @ 24kg',
    avatars: [
      { initial: 'D', color: '#f59e0b' },
      { initial: 'E', color: '#8b5cf6' },
    ],
  },
  {
    id: '5',
    name: 'Endurance',
    time: '19:30',
    coach: 'Marcos Díaz',
    duration: '60 min',
    enrolled: 8,
    capacity: 12,
    status: 'open',
    wod: '4x800m @ ritmo 5K\n2 min descanso entre series',
    avatars: [
      { initial: 'G', color: '#22c55e' },
      { initial: 'I', color: '#06b6d4' },
      { initial: 'V', color: '#f95c00' },
    ],
  },
];

export const DATE_PILLS = [
  { day: 'LUN', num: '22' },
  { day: 'MAR', num: '23' },
  { day: 'MIÉ', num: '24', active: true },
  { day: 'JUE', num: '25' },
  { day: 'VIE', num: '26' },
  { day: 'SÁB', num: '27' },
  { day: 'DOM', num: '28' },
];

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
