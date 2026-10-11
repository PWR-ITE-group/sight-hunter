/**
 * In-memory mock of the API contract, for trying the app without a backend.
 * Enabled with EXPO_PUBLIC_MOCK_API=1. State lives in memory and resets on reload.
 *
 * Rules mirror the real server: ledger-style points/XP, hints cut only round points by 25%
 * (floor 25%), geofence against the search zone, every submitted photo is accepted after ~2 s.
 */
import { components } from '../schema';
import { haversineDistance } from '../../utils/geo';
import { DAILY_QUESTIONS, LEADERBOARD, PLACES, PUBLIC_REELS, type MockPlace } from './data';

type User = components['schemas']['User'];
type Round = components['schemas']['Round'];
type Attempt = components['schemas']['Attempt'];
type Reel = components['schemas']['Reel'];
type Comment = components['schemas']['Comment'];

export class MockHttpError {
  constructor(
    public status: number,
    public code: string,
    public message: string,
    public details?: Record<string, unknown>
  ) {}
}

type Params = Record<string, string | number> | undefined;
type Body = Record<string, unknown> | undefined;

const LATENCY_MS = 250;
const MAX_HINTS = 3;
const MAX_ATTEMPTS = 5;
const WELCOME_POINTS = 50;
const ZONE_RADIUS_M = 150;
const SLACK_M = 25;

interface MockState {
  user: User | null;
  password: string | null;
  points: number;
  xp: number;
  found: Set<string>; // task ids
  rounds: Map<string, Round>;
  attempts: Map<string, Attempt & { round_id: string; submitted_at?: number }>;
  unlocked: Set<string>; // reel ids
  comments: Map<string, Comment[]>;
  daily: { started: boolean; result: components['schemas']['DailyGameResult'] | null };
}

function freshState(): MockState {
  return {
    user: null,
    password: null,
    points: 0,
    xp: 0,
    found: new Set(),
    rounds: new Map(),
    attempts: new Map(),
    unlocked: new Set(PUBLIC_REELS.filter((r) => r.price_points === null).map((r) => r.id)),
    comments: new Map([
      [
        'reel-city',
        [
          { id: 'c1', author_nickname: 'Zosia', text: 'Super krótka historia!', created_at: new Date().toISOString() },
        ],
      ],
    ]),
    daily: { started: false, result: null },
  };
}

let state = freshState();
let seq = 0;
const nextId = (prefix: string) => `${prefix}-${++seq}`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function requireUser(): User {
  if (!state.user) throw new MockHttpError(401, 'unauthorized', 'Zaloguj się ponownie.');
  return state.user;
}

function me(): User {
  const u = requireUser();
  return { ...u, points: state.points, xp: state.xp };
}

function tokens() {
  return { access: `mock-access-${Date.now()}`, refresh: `mock-refresh-${Date.now()}`, user: me() };
}

function placeByTask(taskId: string): MockPlace {
  const p = PLACES.find((x) => x.task_id === taskId);
  if (!p) throw new MockHttpError(404, 'not_found', 'Nie znaleziono.');
  return p;
}

/** Stable offset so the map circle hides the real point, like the real API. */
function zoneFor(p: MockPlace) {
  const shift = 60 / 111_320;
  return { lat: p.lat + shift, lng: p.lng - shift, radius_m: ZONE_RADIUS_M };
}

function marker(p: MockPlace) {
  const found = state.found.has(p.task_id);
  return {
    id: p.id,
    task_id: p.task_id,
    found,
    name: found ? p.name : null,
    zone: found ? { lat: p.lat, lng: p.lng, radius_m: p.radius_m } : zoneFor(p),
  };
}

function activeRound(taskId: string): Round | undefined {
  return [...state.rounds.values()].find((r) => r.task_id === taskId && r.status === 'active');
}

function rewardAfterHints(base: number, used: number): number {
  return Math.round(base * Math.max(0.25, 1 - 0.25 * used));
}

function attemptsUsed(roundId: string): number {
  return [...state.attempts.values()].filter((a) => a.round_id === roundId && a.status !== 'awaiting_upload').length;
}

function reelOut(id: string): Reel {
  const place = PLACES.find((p) => p.reel_id === id);
  const pub = PUBLIC_REELS.find((r) => r.id === id);
  const unlocked = state.unlocked.has(id);
  if (place) {
    return {
      id,
      place_id: place.id,
      kind: 'reward',
      title: place.reel_title,
      locked: !unlocked,
      playback_url: unlocked ? place.video : null,
      duration_s: 30,
      finders_count: place.finders + (state.found.has(place.task_id) ? 1 : 0),
      price_points: null,
    };
  }
  if (pub) {
    return {
      id,
      place_id: null,
      kind: 'public',
      title: pub.title,
      locked: !unlocked,
      playback_url: unlocked ? pub.video : null,
      duration_s: 40,
      finders_count: 0,
      price_points: pub.price_points,
    };
  }
  throw new MockHttpError(404, 'not_found', 'Nie znaleziono.');
}

function allReelIds(): string[] {
  return [...PUBLIC_REELS.map((r) => r.id), ...PLACES.map((p) => p.reel_id)];
}

function requireReel(id: string) {
  if (!allReelIds().includes(id)) throw new MockHttpError(404, 'not_found', 'Nie znaleziono.');
}

/** Worker stand-in: a queued attempt is accepted two seconds after submit. */
function settleAttempt(a: Attempt & { round_id: string; submitted_at?: number }) {
  if (a.status !== 'queued' || !a.submitted_at || Date.now() - a.submitted_at < 2000) return;
  const round = state.rounds.get(a.round_id)!;
  const place = placeByTask(round.task_id);
  a.status = 'accepted';
  a.points_awarded = round.reward_points;
  a.xp_awarded = place.base_xp;
  a.reel_id = place.reel_id;
  round.status = 'completed';
  if (!state.found.has(round.task_id)) {
    state.found.add(round.task_id);
    state.points += round.reward_points;
    state.xp += place.base_xp;
    state.unlocked.add(place.reel_id);
  }
}

type Handler = (m: RegExpMatchArray, params: Params, body: Body) => unknown;
const routes: [string, RegExp, Handler][] = [
  ['POST', /^\/auth\/register$/, (_m, _p, body) => {
    const email = String(body?.email ?? '').toLowerCase();
    if (state.user && state.user.email === email) {
      throw new MockHttpError(409, 'email_taken', 'Ten e-mail jest już zajęty.');
    }
    state = freshState();
    state.user = { id: 'user-1', email, nickname: null, avatar_url: null, points: 0, xp: 0, ref_code: 'LOWCY2026' };
    state.password = String(body?.password ?? '');
    state.points = WELCOME_POINTS;
    return tokens();
  }],
  ['POST', /^\/auth\/login$/, (_m, _p, body) => {
    const email = String(body?.email ?? '').toLowerCase();
    if (!state.user || state.user.email !== email || state.password !== body?.password) {
      // Any credentials work for a fresh mock session, so the demo never gets stuck on login.
      if (state.user) throw new MockHttpError(401, 'invalid_credentials', 'Nieprawidłowy e-mail lub hasło.');
      state = freshState();
      state.user = { id: 'user-1', email, nickname: null, avatar_url: null, points: 0, xp: 0, ref_code: 'LOWCY2026' };
      state.password = String(body?.password ?? '');
      state.points = WELCOME_POINTS;
    }
    return tokens();
  }],
  ['POST', /^\/auth\/refresh$/, () => {
    requireUser();
    return tokens();
  }],
  ['POST', /^\/auth\/password-reset$/, () => undefined],

  ['GET', /^\/me$/, () => me()],
  ['PUT', /^\/me\/nickname$/, (_m, _p, body) => {
    const u = requireUser();
    const nick = String(body?.nickname ?? '');
    if (LEADERBOARD.some((e) => e.nickname.toLowerCase() === nick.toLowerCase())) {
      throw new MockHttpError(409, 'nickname_taken', 'Ten nick jest już zajęty.');
    }
    state.user = { ...u, nickname: nick };
    return me();
  }],

  ['GET', /^\/places\/nearby$/, (_m, params) => {
    requireUser();
    const lat = Number(params?.lat), lng = Number(params?.lng), radius = Number(params?.radius ?? 2000);
    return {
      items: PLACES.filter((p) => haversineDistance(lat, lng, p.lat, p.lng) <= radius).map(marker),
    };
  }],
  ['GET', /^\/places\/next$/, (_m, params) => {
    requireUser();
    const lat = Number(params?.lat), lng = Number(params?.lng), mode = String(params?.mode ?? 'nearest');
    const unfound = PLACES.filter((p) => !state.found.has(p.task_id))
      .map((p) => ({ p, d: haversineDistance(lat, lng, p.lat, p.lng) }))
      .sort((a, b) => a.d - b.d);
    if (unfound.length === 0) throw new MockHttpError(404, 'not_found', 'Wszystko odkryte.');
    const pick =
      mode === 'popular'
        ? [...unfound].sort((a, b) => b.p.finders - a.p.finders)[0]
        : mode === 'random'
          ? unfound[Math.floor(Math.random() * Math.min(5, unfound.length))]
          : unfound[0];
    const z = zoneFor(pick.p);
    return { ...marker(pick.p), distance_m: Math.round(haversineDistance(lat, lng, z.lat, z.lng)) };
  }],

  ['GET', /^\/tasks\/([^/]+)$/, (m) => {
    requireUser();
    const p = placeByTask(m[1]);
    const r = activeRound(p.task_id);
    return {
      id: p.task_id,
      place_id: p.id,
      riddle: p.riddle,
      archival_photo_url: null,
      hints_total: Math.min(p.hints.length, MAX_HINTS),
      reward_points: r?.reward_points ?? p.base_points,
      reward_xp: p.base_xp,
    };
  }],
  ['GET', /^\/tasks\/([^/]+)\/share-link$/, (m) => {
    const u = requireUser();
    placeByTask(m[1]);
    return { url: `https://lowcyhistorii.pl/t/${m[1]}?ref=${u.ref_code}` };
  }],
  ['POST', /^\/tasks\/([^/]+)\/rounds$/, (m) => {
    requireUser();
    const p = placeByTask(m[1]);
    const existing = activeRound(p.task_id);
    if (existing) return { ...existing, attempts_left: MAX_ATTEMPTS - attemptsUsed(existing.id) };
    if (state.found.has(p.task_id)) {
      throw new MockHttpError(409, 'round_not_active', 'To miejsce jest już odkryte.');
    }
    const round: Round = {
      id: nextId('round'),
      task_id: p.task_id,
      status: 'active',
      hints_used: 0,
      hints: [],
      reward_points: p.base_points,
      attempts_left: MAX_ATTEMPTS,
      started_at: new Date().toISOString(),
    };
    state.rounds.set(round.id, round);
    return round;
  }],

  ['POST', /^\/rounds\/([^/]+)\/hints$/, (m) => {
    requireUser();
    const round = state.rounds.get(m[1]);
    if (!round) throw new MockHttpError(404, 'not_found', 'Nie znaleziono.');
    if (round.status !== 'active') throw new MockHttpError(409, 'round_not_active', 'Ta runda nie jest aktywna.');
    const p = placeByTask(round.task_id);
    if (round.hints_used >= Math.min(p.hints.length, MAX_HINTS)) {
      throw new MockHttpError(409, 'no_hints_left', 'Nie ma więcej podpowiedzi.');
    }
    round.hints_used += 1;
    round.hints = p.hints.slice(0, round.hints_used);
    round.reward_points = rewardAfterHints(p.base_points, round.hints_used);
    return { hint_text: p.hints[round.hints_used - 1], hints_used: round.hints_used, reward_points: round.reward_points };
  }],
  ['POST', /^\/rounds\/([^/]+)\/attempts$/, (m, _p, body) => {
    requireUser();
    const round = state.rounds.get(m[1]);
    if (!round) throw new MockHttpError(404, 'not_found', 'Nie znaleziono.');
    if (round.status !== 'active') throw new MockHttpError(409, 'round_not_active', 'Ta runda nie jest aktywna.');
    if (attemptsUsed(round.id) >= MAX_ATTEMPTS) {
      throw new MockHttpError(429, 'attempts_limit', 'Wykorzystałeś wszystkie próby w tej rundzie.');
    }
    const p = placeByTask(round.task_id);
    const lat = Number(body?.lat), lng = Number(body?.lng);
    const distance = haversineDistance(lat, lng, p.lat, p.lng);
    // Lenient in the mock: anywhere inside the search circle counts as "there".
    if (distance > ZONE_RADIUS_M + SLACK_M) {
      throw new MockHttpError(422, 'too_far', `Podejdź bliżej, jesteś ${Math.round(distance)} m od celu.`, {
        distance_m: Math.round(distance),
      });
    }
    const id = nextId('attempt');
    state.attempts.set(id, { id, status: 'awaiting_upload', round_id: round.id });
    return {
      attempt_id: id,
      upload_url: `mock://upload/${id}`,
      upload_expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
    };
  }],

  ['POST', /^\/attempts\/([^/]+)\/submit$/, (m) => {
    requireUser();
    const a = state.attempts.get(m[1]);
    if (!a) throw new MockHttpError(404, 'not_found', 'Nie znaleziono.');
    if (a.status === 'awaiting_upload') {
      a.status = 'queued';
      a.submitted_at = Date.now();
    }
    const { round_id: _r, submitted_at: _s, ...out } = a;
    return out;
  }],
  ['GET', /^\/attempts\/([^/]+)$/, (m) => {
    requireUser();
    const a = state.attempts.get(m[1]);
    if (!a) throw new MockHttpError(404, 'not_found', 'Nie znaleziono.');
    settleAttempt(a);
    const { round_id: _r, submitted_at: _s, ...out } = a;
    return out;
  }],

  ['GET', /^\/reels\/feed$/, () => {
    requireUser();
    return { items: allReelIds().map(reelOut), next_cursor: null };
  }],
  ['POST', /^\/reels\/([^/]+)\/views$/, (m) => {
    requireUser();
    requireReel(m[1]);
    return undefined;
  }],
  ['GET', /^\/reels\/([^/]+)\/comments$/, (m) => {
    requireUser();
    requireReel(m[1]);
    return { items: state.comments.get(m[1]) ?? [], next_cursor: null };
  }],
  ['POST', /^\/reels\/([^/]+)\/comments$/, (m, _p, body) => {
    const u = requireUser();
    requireReel(m[1]);
    const c: Comment = {
      id: nextId('comment'),
      author_nickname: u.nickname ?? 'Gracz',
      text: String(body?.text ?? '').trim(),
      created_at: new Date().toISOString(),
    };
    state.comments.set(m[1], [c, ...(state.comments.get(m[1]) ?? [])]);
    return c;
  }],

  ['GET', /^\/daily-game$/, () => {
    requireUser();
    return {
      date: new Date().toISOString().slice(0, 10),
      played: state.daily.result !== null,
      questions: DAILY_QUESTIONS.map(({ id, text, image_url, options }) => ({ id, text, image_url, options })),
      result: state.daily.result,
    };
  }],
  ['POST', /^\/daily-game\/start$/, () => {
    requireUser();
    if (state.daily.result) throw new MockHttpError(409, 'already_played', 'Dzisiaj już grałeś.');
    state.daily.started = true;
    return { started_at: new Date().toISOString() };
  }],
  ['POST', /^\/daily-game\/answers$/, (_m, _p, body) => {
    requireUser();
    if (state.daily.result) throw new MockHttpError(409, 'already_played', 'Dzisiaj już grałeś.');
    const answers = (body?.answers ?? []) as { question_id: string; option_index: number }[];
    const score = DAILY_QUESTIONS.filter((q) => answers.find((a) => a.question_id === q.id)?.option_index === q.correct).length;
    const points = score * 3;
    state.points += points;
    state.daily.result = {
      score,
      points_awarded: points,
      correct: DAILY_QUESTIONS.map((q) => ({ question_id: q.id, option_index: q.correct })),
    };
    return state.daily.result;
  }],

  ['GET', /^\/leaderboard$/, () => {
    const u = requireUser();
    const mine = { nickname: u.nickname ?? 'Gracz', xp: state.xp };
    const all = [...LEADERBOARD, mine].sort((a, b) => b.xp - a.xp);
    const items = all.map((e, i) => ({ rank: i + 1, nickname: e.nickname, xp: e.xp }));
    const myRank = state.xp > 0 ? items.find((e) => e.nickname === mine.nickname)?.rank ?? null : null;
    return { items: items.filter((e) => e.xp > 0), me: { rank: myRank, nickname: mine.nickname, xp: state.xp } };
  }],

  ['GET', /^\/shop\/items$/, () => {
    requireUser();
    return {
      balance: state.points,
      items: PUBLIC_REELS.filter((r) => r.price_points !== null && !state.unlocked.has(r.id)).map((r) => ({
        id: r.id,
        type: 'reel',
        name: r.title,
        description: 'Rolka o historii Wrocławia',
        price_points: r.price_points,
      })),
    };
  }],
  ['POST', /^\/shop\/purchases$/, (_m, _p, body) => {
    requireUser();
    const r = PUBLIC_REELS.find((x) => x.id === body?.item_id && x.price_points !== null);
    if (!r || state.unlocked.has(r.id)) throw new MockHttpError(404, 'not_found', 'Nie znaleziono.');
    if (state.points < r.price_points!) {
      throw new MockHttpError(409, 'insufficient_points', 'Za mało punktów.', {
        balance: state.points,
        price_points: r.price_points,
      });
    }
    state.points -= r.price_points!;
    state.unlocked.add(r.id);
    return {
      balance: state.points,
      item: { id: r.id, type: 'reel', name: r.title, description: 'Rolka o historii Wrocławia', price_points: r.price_points },
      coupon_code: null,
    };
  }],
];

export async function mockRequest<T>(method: string, path: string, params: Params, body: Body): Promise<T> {
  await sleep(LATENCY_MS);
  for (const [m, re, handler] of routes) {
    const match = m === method ? path.match(re) : null;
    if (match) return handler(match, params, body) as T;
  }
  throw new MockHttpError(404, 'not_found', `Mock: brak trasy ${method} ${path}`);
}
