export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedDate?: string;
}

export interface UserProfile {
  name: string;
  username: string;
  avatar: string;
  level: number;
  currentXP: number;
  nextLevelXP: number;
  title: string;
  experiencesBooked: number;
  experiencesCompleted: number;
  reviewsWritten: number;
  citiesVisited: number;
  badges: Badge[];
}

export const USER_PROFILE: UserProfile = {
  name: 'Sarah Chen',
  username: '@sarahexplores',
  avatar: 'https://i.pravatar.cc/300?img=47',
  level: 12,
  currentXP: 2850,
  nextLevelXP: 3500,
  title: 'Urban Explorer',
  experiencesBooked: 24,
  experiencesCompleted: 18,
  reviewsWritten: 15,
  citiesVisited: 7,
  badges: [
    {
      id: 'first_steps',
      name: 'First Steps',
      description: 'Completed your first experience',
      icon: '👣',
      earned: true,
      earnedDate: '2025-08-15',
    },
    {
      id: 'foodie',
      name: 'Foodie',
      description: 'Completed 5 food experiences',
      icon: '🍽️',
      earned: true,
      earnedDate: '2025-09-22',
    },
    {
      id: 'adventurer',
      name: 'Adventurer',
      description: 'Completed 3 adventure activities',
      icon: '⛰️',
      earned: true,
      earnedDate: '2025-10-05',
    },
    {
      id: 'culture_vulture',
      name: 'Culture Vulture',
      description: 'Attended 5 cultural events',
      icon: '🎭',
      earned: true,
      earnedDate: '2025-10-18',
    },
    {
      id: 'early_bird',
      name: 'Early Bird',
      description: 'Booked 10 morning experiences',
      icon: '🌅',
      earned: false,
    },
    {
      id: 'night_owl',
      name: 'Night Owl',
      description: 'Completed 5 evening experiences',
      icon: '🦉',
      earned: true,
      earnedDate: '2025-10-30',
    },
    {
      id: 'local_hero',
      name: 'Local Hero',
      description: 'Supported 20 local businesses',
      icon: '❤️',
      earned: false,
    },
    {
      id: 'globe_trotter',
      name: 'Globe Trotter',
      description: 'Visited 10 different cities',
      icon: '🌍',
      earned: false,
    },
    {
      id: 'reviewer',
      name: 'Reviewer',
      description: 'Written 10 helpful reviews',
      icon: '⭐',
      earned: true,
      earnedDate: '2025-11-01',
    },
  ],
};

export const LEVEL_TITLES = [
  { level: 1, title: 'Curious Newbie' },
  { level: 5, title: 'Weekend Wanderer' },
  { level: 10, title: 'Urban Explorer' },
  { level: 15, title: 'Experience Seeker' },
  { level: 20, title: 'Adventure Master' },
  { level: 25, title: 'Culture Connoisseur' },
  { level: 30, title: 'Legend' },
];
