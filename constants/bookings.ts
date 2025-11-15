export interface Booking {
  id: string;
  experienceId: string;
  experienceTitle: string;
  experienceImage: string;
  provider: string;
  date: string;
  time: string;
  location: string;
  price: number;
  currency: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  bookingReference: string;
  guests: number;
}

export const BOOKINGS: Booking[] = [
  {
    id: 'b1',
    experienceId: '1',
    experienceTitle: 'Create Your Own Azulejo Tile',
    experienceImage: 'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?w=800&q=80',
    provider: 'Azulejos Design',
    date: '2025-11-15',
    time: '15:00',
    location: 'Lisbon',
    price: 60,
    currency: '€',
    status: 'upcoming',
    bookingReference: 'BRD-1234567',
    guests: 2,
  },
  {
    id: 'b2',
    experienceId: '5',
    experienceTitle: 'Fado Night Experience',
    experienceImage: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80',
    provider: 'Casa do Fado',
    date: '2025-11-20',
    time: '20:00',
    location: 'Bairro Alto',
    price: 55,
    currency: '€',
    status: 'upcoming',
    bookingReference: 'BRD-7654321',
    guests: 2,
  },
  {
    id: 'b3',
    experienceId: '3',
    experienceTitle: 'Secret Food Tour: Alfama',
    experienceImage: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80',
    provider: 'Taste of Lisboa',
    date: '2025-10-28',
    time: '18:30',
    location: 'Lisbon',
    price: 75,
    currency: '€',
    status: 'completed',
    bookingReference: 'BRD-9876543',
    guests: 1,
  },
  {
    id: 'b4',
    experienceId: '2',
    experienceTitle: 'Sunset Kayaking on the Tagus',
    experienceImage: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80',
    provider: 'River Adventures',
    date: '2025-10-15',
    time: '18:00',
    location: 'Lisbon',
    price: 45,
    currency: '€',
    status: 'completed',
    bookingReference: 'BRD-5432109',
    guests: 2,
  },
];
