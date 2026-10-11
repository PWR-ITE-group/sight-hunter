/** Seed content for the in-memory mock API (Polish, like the real content). */

export interface MockPlace {
  id: string;
  task_id: string;
  reel_id: string;
  name: string;
  lat: number;
  lng: number;
  radius_m: number;
  riddle: string;
  hints: string[];
  base_points: number;
  base_xp: number;
  reel_title: string;
  video: string;
  finders: number;
}

const SAMPLE = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/';

export const PLACES: MockPlace[] = [
  {
    id: 'place-ratusz',
    task_id: 'task-ratusz',
    reel_id: 'reel-ratusz',
    name: 'Ratusz we Wrocławiu',
    lat: 51.11,
    lng: 17.0318,
    radius_m: 60,
    riddle: 'Znajdź gotycki budynek z wieżą i zegarem pośrodku rynku.',
    hints: [
      'Stoi na środku dużego placu, otoczonego ogródkami kawiarni.',
      'Ma bogato zdobiony szczyt i astronomiczny zegar.',
      'To dawna siedziba władz miasta — dziś muzeum.',
    ],
    base_points: 40,
    base_xp: 100,
    reel_title: 'Ratusz: 700 lat w centrum miasta',
    video: `${SAMPLE}ForBiggerBlazes.mp4`,
    finders: 142,
  },
  {
    id: 'place-katedra',
    task_id: 'task-katedra',
    reel_id: 'reel-katedra',
    name: 'Katedra św. Jana Chrzciciela',
    lat: 51.1143,
    lng: 17.0464,
    radius_m: 70,
    riddle: 'Znajdź kościół z dwiema wysokimi, ostrymi wieżami.',
    hints: [
      'Szukaj na wyspie, na którą prowadzi most pełen kłódek.',
      'Wieczorem latarnik ręcznie zapala tu gazowe lampy.',
      'To najstarsza część miasta — Ostrów Tumski.',
    ],
    base_points: 40,
    base_xp: 100,
    reel_title: 'Katedra na Ostrowie Tumskim',
    video: `${SAMPLE}ForBiggerEscapes.mp4`,
    finders: 87,
  },
  {
    id: 'place-hala',
    task_id: 'task-hala',
    reel_id: 'reel-hala',
    name: 'Hala Stulecia',
    lat: 51.1069,
    lng: 17.0773,
    radius_m: 90,
    riddle: 'Znajdź ogromną betonową kopułę obok iglicy.',
    hints: [
      'Stoi przy ogrodzie zoologicznym.',
      'Zbudowano ją na stulecie bitwy pod Lipskiem.',
      'Jest na liście UNESCO.',
    ],
    base_points: 60,
    base_xp: 150,
    reel_title: 'Hala Stulecia: beton, który zadziwił świat',
    video: `${SAMPLE}ForBiggerFun.mp4`,
    finders: 320,
  },
];

export interface MockPublicReel {
  id: string;
  title: string;
  video: string;
  price_points: number | null;
}

export const PUBLIC_REELS: MockPublicReel[] = [
  { id: 'reel-how', title: 'Jak grać w Łowców Historii', video: `${SAMPLE}ForBiggerJoyrides.mp4`, price_points: null },
  { id: 'reel-city', title: 'Wrocław w 40 sekund', video: `${SAMPLE}ForBiggerMeltdowns.mp4`, price_points: null },
  { id: 'reel-krasnale', title: 'Skąd się wzięły krasnale?', video: `${SAMPLE}ElephantsDream.mp4`, price_points: 40 },
  { id: 'reel-festung', title: 'Festung Breslau 1945', video: `${SAMPLE}BigBuckBunny.mp4`, price_points: 60 },
];

export const LEADERBOARD = [
  { nickname: 'WroclawKing', xp: 1500 },
  { nickname: 'HistoryBuff', xp: 1200 },
  { nickname: 'Explorer99', xp: 950 },
  { nickname: 'Zosia', xp: 600 },
  { nickname: 'Marek', xp: 450 },
  { nickname: 'Kasia', xp: 300 },
];

export const DAILY_QUESTIONS = [
  {
    id: 'q1',
    text: 'W którym roku wybudowano Halę Stulecia?',
    image_url: null,
    options: ['1911–1913', '1920–1922', '1899–1901', '1935–1937'],
    correct: 0,
  },
  {
    id: 'q2',
    text: 'Na jakiej wyspie stoi wrocławska katedra?',
    image_url: null,
    options: ['Wyspa Słodowa', 'Ostrów Tumski', 'Wyspa Piasek', 'Kępa Mieszczańska'],
    correct: 1,
  },
];
