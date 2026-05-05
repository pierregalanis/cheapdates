export interface CityConfig {
  id: string;
  name: string;
  state: string;
  neighborhoods: string[];
  comingSoon: boolean;
  emoji: string;
}

export const CITIES: CityConfig[] = [
  {
    id: 'dallas',
    name: 'Dallas',
    state: 'TX',
    comingSoon: false,
    emoji: '🤠',
    neighborhoods: [
      'Uptown', 'Deep Ellum', 'Design District', 'Oak Cliff',
      'Bishop Arts', 'Lower Greenville', 'Knox-Henderson',
      'Downtown', 'East Dallas', 'Lakewood', 'Lake Highlands',
      'Turtle Creek', 'Preston Hollow', 'Addison', 'Plano', 'Frisco',
    ],
  },
  {
    id: 'austin',
    name: 'Austin',
    state: 'TX',
    comingSoon: true,
    emoji: '🎸',
    neighborhoods: ['South Congress', 'East Austin', 'Downtown', 'Hyde Park', 'Rainey Street', '6th Street', 'South Lamar'],
  },
  {
    id: 'houston',
    name: 'Houston',
    state: 'TX',
    comingSoon: true,
    emoji: '🚀',
    neighborhoods: ['Midtown', 'Montrose', 'Downtown', 'Heights', 'River Oaks', 'EaDo', 'Museum District'],
  },
  {
    id: 'san-antonio',
    name: 'San Antonio',
    state: 'TX',
    comingSoon: true,
    emoji: '🌮',
    neighborhoods: ['Downtown', 'Pearl District', 'Southtown', 'King William', 'Alamo Heights', 'Riverwalk'],
  },
  {
    id: 'miami',
    name: 'Miami',
    state: 'FL',
    comingSoon: true,
    emoji: '🌴',
    neighborhoods: ['Wynwood', 'Brickell', 'South Beach', 'Coconut Grove', 'Little Havana', 'Design District'],
  },
  {
    id: 'new-york',
    name: 'New York',
    state: 'NY',
    comingSoon: true,
    emoji: '🗽',
    neighborhoods: ['SoHo', 'East Village', 'West Village', 'Midtown', 'Williamsburg', 'Lower East Side'],
  },
  {
    id: 'los-angeles',
    name: 'Los Angeles',
    state: 'CA',
    comingSoon: true,
    emoji: '🎬',
    neighborhoods: ['Silver Lake', 'West Hollywood', 'Santa Monica', 'Downtown', 'Los Feliz', 'Venice'],
  },
  {
    id: 'chicago',
    name: 'Chicago',
    state: 'IL',
    comingSoon: true,
    emoji: '🌬️',
    neighborhoods: ['Wicker Park', 'River North', 'West Loop', 'Lincoln Park', 'Logan Square', 'Gold Coast'],
  },
];

export const DEFAULT_CITY = CITIES[0];
