import {
  BODY_PARTS,
  DB_VERSION,
  type Account,
  type Assessment,
  type Challenge,
  type CheckIn,
  type Consent,
  type DB,
  type Letter,
  type MeteorSession,
  type MissionProgress,
  type Strategy,
  type StrategyUse,
  type Student,
  type StudentMode,
  type TrustedContact,
} from '../types';
import { findBroad } from './emotions';
import { BODY_MAP_PLANET, COUNSELOR_NAME, MISSIONS, TOTAL_SESSIONS, sessionOfPlanet } from './planets';
import { ASSESSMENT_CONFIG, ASSESSMENT_ITEM_COUNT, isReverseItem } from './assessment';
import { syncCrisisAlerts } from '../lib/crisis';
import { DAY, HOUR, MINUTE, startOfDay, toDateKey } from '../lib/dates';

/* 결정적 난수: 같은 시드면 항상 같은 예시 데이터 */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
type Rng = () => number;

const randInt = (rng: Rng, min: number, max: number) => min + Math.floor(rng() * (max - min + 1));
const pick = <T,>(rng: Rng, arr: readonly T[]) => arr[Math.floor(rng() * arr.length)];
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const round2 = (v: number) => Math.round(v * 100) / 100;

function weighted<T>(rng: Rng, items: { item: T; w: number }[]): T {
  const total = items.reduce((s, i) => s + i.w, 0);
  let r = rng() * total;
  for (const i of items) {
    r -= i.w;
    if (r <= 0) return i.item;
  }
  return items[items.length - 1].item;
}

interface Template {
  broad: string;
  w: number;
  situations: string[];
}

interface FixedEntry {
  offset: number;
  hour: number;
  minute: number;
  broad: string;
  fine: string | null;
  intensity: number;
  situation: string;
}

interface Profile {
  id: string;
  name: string;
  mode: StudentMode;
  nextSessionInDays: number;
  seed: number;
  /** 기록이 없는 날 (0 = 오늘) */
  skipDays: number[];
  perDay: [number, number];
  hours: number[];
  intensity: [number, number];
  templates: Template[];
  /** 상위 감정만 고를 확률: [지난주, 이번 주] */
  broadOnlyRate: [number, number];
  fixed: FixedEntry[];
  strategyRate: number;
  /** 이 강도 이상일 때 전략을 써본 것으로 생성 (기본 6) */
  strategyMin?: number;
  strategyWeights: Partial<Record<Strategy, number>>;
  /** 전략별 평균 강도 감소 */
  strategyEffect: Partial<Record<Strategy, number>>;
  meteor: { offset: number; hour: number; peak: number; minutes: number; decay: number }[];
  /** 지금 회기 (1~8) */
  session: number;
  /** 마지막 회기가 며칠 전이었는지 (없으면 다음 회기 7일 전) */
  lastSessionDaysAgo?: number;
  /** 미션 진행. 적지 않은 미션은 '대기' */
  voyage: VoyageEntry[];
  /** 두근 행성이 열린 뒤 체크인에 몸 위치를 남긴 비율 */
  bodyRate: number;
  /** 도전 미션. session = 보낸 회기, day = 그 회기 날로부터 며칠 뒤에 보냈는지. 기한은 보낸 날 + 6일 */
  challenges: SeedChallenge[];
  contacts: { name: string; relation: string }[];
  guardianConsent: boolean;
  /** 사전·사후 DERS 응답 경향: 정서조절 곤란 정도 (0~4, 높을수록 어려움) */
  assessment: { pre: number; post?: number };
  letters: { offset: number; content: string }[];
}

interface VoyageEntry {
  m: string;
  s: '완료' | '다음 항해로';
  /** 현실 미션 한 줄 소감 */
  text?: string;
  /** 기분을 함께 적는 미션: [하기 전, 한 후] */
  mood?: [number, number];
}

interface SeedChallenge {
  title: string;
  step: 1 | 2 | 3;
  session: number;
  day: number;
  message: string;
  skills: number[];
  status: Challenge['status'];
  predicted?: number;
  actual?: number;
  reflection?: string;
}

const done = (m: string, text?: string, mood?: [number, number]): VoyageEntry => ({ m, s: '완료', text, mood });
const later = (m: string): VoyageEntry => ({ m, s: '다음 항해로' });

const PROFILES: Profile[] = [
  {
    id: 'stu-a',
    name: '학생 A',
    mode: '회기중',
    nextSessionInDays: 2,
    seed: 101,
    skipDays: [],
    perDay: [1, 2],
    hours: [8, 12, 17, 21, 22, 22, 23],
    intensity: [3, 9],
    templates: [
      { broad: '짜증', w: 4, situations: ['단톡방에서 내 말만 읽씹당함', '동생이 내 물건을 또 허락 없이 씀', '조별과제에서 나만 일하는 느낌', '엄마가 내 말을 끝까지 안 들어줌'] },
      { broad: '화남', w: 3, situations: ['선생님이 나만 지목해서 혼냄', '친구가 내 비밀을 다른 애한테 말함', '게임하다가 팀원이 계속 욕함'] },
      { broad: '슬픔', w: 1, situations: ['예전에 친했던 친구랑 어색해짐', '아무도 내 생일을 기억 못 함'] },
      { broad: '즐거움', w: 1.5, situations: ['체육시간에 골 넣음', '친구랑 편의점 가서 수다 떪'] },
      { broad: '평온', w: 1, situations: ['혼자 음악 들으면서 산책함', '숙제 다 끝내고 누움'] },
    ],
    broadOnlyRate: [0.55, 0.25],
    fixed: [],
    strategyRate: 0.65,
    strategyWeights: { '친구별 시점': 4, '1년 뒤 궤도': 2, '3인칭 관측일지': 1, '별똥별': 2, '호흡': 1.5 },
    strategyEffect: { '친구별 시점': 3.2, '1년 뒤 궤도': 2.1, '3인칭 관측일지': 1.4, '별똥별': 2.6, '호흡': 1.9 },
    meteor: [
      { offset: 9, hour: 22, peak: 9, minutes: 10, decay: 0.16 },
      { offset: 5, hour: 23, peak: 8, minutes: 8, decay: 0.22 },
      { offset: 2, hour: 21, peak: 9, minutes: 7, decay: 0.28 },
    ],
    session: 4,
    voyage: [
      done('p1-practice'),
      done('p1-real', '아침 4점, 점심 6점, 밤 3점. 생각보다 하루에 많이 바뀜'),
      done('p2-practice'),
      done('p2-real', '단톡방 읽씹 당했을 때 폰을 엎어버림. 피하니까 밤에 더 신경 쓰였음'),
      done('p2-opposite', '방에 틀어박히고 싶었는데 거실에서 동생이랑 5분 TV 봄', [3, 5]),
      done('p3-practice'),
      done('p3-real', '뛰고 나니까 심장이 엄청 뛰었는데 1분쯤 지나니까 가라앉음'),
      done('p4-practice'),
      // 너울 행성은 5회기에 열린다 (별똥별 기록은 1회기부터 있어도 된다)
    ],
    bodyRate: 0.6,
    // 1~5회기에도 상담사가 원하면 도전 미션을 보낼 수 있다 (주로 1단계)
    challenges: [
      {
        title: '단톡방에 먼저 한마디 남기기',
        step: 1,
        session: 1,
        day: 2,
        message: '짧은 인사 한마디면 충분해.',
        skills: [1],
        status: '완료',
        predicted: 7,
        actual: 4,
        reflection: '생각보다 다들 답해줌',
      },
      {
        title: '수업 시간에 모르는 것 손 들고 질문하기',
        step: 1,
        session: 2,
        day: 2,
        message: '피하고 싶은 마음이 들면, 그것도 알아차려 봐.',
        skills: [2],
        status: '다음 주로',
      },
      {
        title: '수업 시간에 모르는 것 손 들고 질문하기',
        step: 1,
        session: 3,
        day: 1,
        message: '지난주에 못 했어도 괜찮아. 심장이 뛰면 두근 행성에서 연습한 대로 지켜봐줘.',
        skills: [2, 3],
        status: '완료',
        predicted: 8,
        actual: 5,
        reflection: '심장 엄청 뛰었는데 쌤이 좋은 질문이래',
      },
      {
        title: '동생에게 내 물건 쓸 땐 먼저 물어봐 달라고 차분하게 말하기',
        step: 1,
        session: 4,
        day: 1,
        message: '말하기 전에 "동생이 일부러 그랬다"는 생각이 함정인지 렌즈로 한 번 봐줘.',
        skills: [4, 3],
        status: '보냄',
      },
    ],
    contacts: [
      { name: '엄마', relation: '가족' },
      { name: '민지', relation: '친구' },
    ],
    guardianConsent: true,
    assessment: { pre: 2.2 },
    letters: [{ offset: 6, content: '지금 화나 있다면, 그때도 결국 지나갔다는 걸 기억해. 넌 생각보다 잘 버티는 사람이야. 노래 한 곡 듣고 다시 생각해보자.' }],
  },
  {
    id: 'stu-b',
    name: '학생 B',
    mode: '유지',
    nextSessionInDays: 9,
    seed: 202,
    skipDays: [12, 10, 7, 4, 2],
    perDay: [1, 1],
    hours: [16, 19, 20, 21],
    intensity: [2, 6],
    templates: [
      { broad: '평온', w: 3, situations: ['동아리 끝나고 친구랑 걸어옴', '도서관에서 조용히 책 읽음'] },
      { broad: '만족', w: 2.5, situations: ['수행평가 무사히 끝냄', '방 정리를 깔끔하게 함'] },
      { broad: '기쁨', w: 2, situations: ['좋아하는 가수 컴백 소식', '친구가 손편지를 써줌'] },
      { broad: '불안', w: 1, situations: ['다음 주 발표 준비가 덜 됨'] },
      { broad: '무기력', w: 0.8, situations: ['비 와서 하루 종일 축 처짐'] },
    ],
    broadOnlyRate: [0.2, 0.15],
    // 이번 주에 같은 마음을 여러 번 띄워 밤하늘에 별자리가 생기게 (차분함 · 홀가분함 · 뿌듯함)
    fixed: [
      { offset: 6, hour: 20, minute: 12, broad: '평온', fine: '차분함', intensity: 3, situation: '동아리 끝나고 친구랑 걸어옴' },
      { offset: 5, hour: 17, minute: 40, broad: '만족', fine: '홀가분함', intensity: 4, situation: '수행평가 무사히 끝냄' },
      { offset: 4, hour: 20, minute: 25, broad: '기쁨', fine: '뿌듯함', intensity: 5, situation: '발표 연습한 걸 선생님이 칭찬해줌' },
      { offset: 3, hour: 21, minute: 5, broad: '평온', fine: '차분함', intensity: 2, situation: '자기 전에 짧게 일기 씀' },
      { offset: 2, hour: 19, minute: 50, broad: '만족', fine: '홀가분함', intensity: 3, situation: '미뤄 둔 방 정리를 끝냄' },
      { offset: 2, hour: 21, minute: 30, broad: '기쁨', fine: '뿌듯함', intensity: 4, situation: '동생 숙제를 끝까지 도와줌' },
      { offset: 1, hour: 19, minute: 15, broad: '평온', fine: '차분함', intensity: 3, situation: '도서관에서 조용히 책 읽음' },
    ],
    strategyRate: 0.6,
    strategyMin: 4,
    strategyWeights: { '3인칭 관측일지': 3, '1년 뒤 궤도': 2, '친구별 시점': 1 },
    strategyEffect: { '3인칭 관측일지': 2.4, '1년 뒤 궤도': 2.0, '친구별 시점': 1.5 },
    meteor: [{ offset: 11, hour: 20, peak: 6, minutes: 5, decay: 0.35 }],
    // 8회기를 모두 마치고 유지 모드. 마지막 회기는 12일 전
    session: 8,
    lastSessionDaysAgo: 12,
    voyage: [
      done('p1-practice'),
      done('p1-real', '아침엔 5, 오후엔 7, 밤엔 6이었음'),
      done('p2-practice'),
      done('p2-real', '발표 준비 안 하고 유튜브만 봄. 보고 나니까 더 불안해짐'),
      done('p2-opposite', '숨고 싶었는데 그냥 발표 대본 첫 줄만 써 봄', [4, 6]),
      done('p3-practice'),
      done('p3-real', '두근거리는 게 불안이랑 비슷한데 그냥 몸이 뛰는 거였음'),
      done('p4-practice'),
      done('p4-real', '친구가 답이 늦었던 건 학원 때문이었음'),
      done('p5-practice'),
      done('p5-real', '발표 전에 1분 그냥 있어봤는데 버틸 만했음'),
      done('p6-practice'),
      done('p6-real', '3인칭 관측일지가 제일 도움 됐다고 말씀드림'),
    ],
    bodyRate: 0.5,
    // 용기 구간(6~7회기)에 보낸 도전 4개: 1단계 → 3단계
    challenges: [
      {
        title: '조별 과제에서 내 의견 한 가지 말하기',
        step: 1,
        session: 6,
        day: 1,
        message: '틀려도 괜찮은 의견 하나면 돼.',
        skills: [2],
        status: '완료',
        predicted: 6,
        actual: 3,
        reflection: '애들이 내 의견대로 하자고 함',
      },
      {
        title: '반 앞에서 1분 발표 연습 해보기',
        step: 2,
        session: 6,
        day: 4,
        message: '떨리는 건 정상이야. 그 떨림을 지켜봐줘.',
        skills: [3, 5],
        status: '완료',
        predicted: 8,
        actual: 6,
        reflection: '목소리 떨렸는데 끝까지 함',
      },
      {
        title: '친구에게 먼저 주말 약속 제안하기',
        step: 2,
        session: 7,
        day: 1,
        message: '거절당할까 봐 걱정되면, 그 생각이 함정인지 렌즈로 먼저 봐줘.',
        skills: [4],
        status: '완료',
        predicted: 7,
        actual: 4,
        reflection: '거절당할까 봐 무서웠는데 바로 좋다고 함',
      },
      {
        title: '수행평가 발표 미루지 않고 첫 순서로 하기',
        step: 3,
        session: 7,
        day: 4,
        message: '가장 높은 계단이야. 해본 것 자체가 기록이 될 거야.',
        skills: [3, 4, 5],
        status: '완료',
        predicted: 9,
        actual: 5,
        reflection: '먼저 하니까 기다리는 동안 덜 불안했음',
      },
    ],
    contacts: [
      { name: '언니', relation: '가족' },
      { name: '박서윤 선생님', relation: '담임 선생님' },
    ],
    guardianConsent: true,
    assessment: { pre: 2.4, post: 1.2 },
    letters: [
      { offset: 6, content: '요즘의 나는 꽤 괜찮아. 혹시 다시 불안해지면, 발표 끝나고 홀가분했던 그 저녁을 떠올려줘.' },
    ],
  },
  {
    id: 'stu-c',
    name: '학생 C',
    mode: '회기중',
    nextSessionInDays: 1,
    seed: 303,
    skipDays: [1],
    perDay: [1, 3],
    hours: [7, 13, 18, 22, 23, 23],
    intensity: [4, 9],
    templates: [
      { broad: '불안', w: 4, situations: ['모의고사 점수가 생각보다 낮음', '내일 수행평가가 걱정돼서 잠이 안 옴', '부모님이 성적 얘기를 꺼냄'] },
      { broad: '슬픔', w: 3, situations: ['점심을 혼자 먹음', '친구들이 나 빼고 약속을 잡음'] },
      { broad: '실망', w: 2, situations: ['열심히 했는데 등수가 떨어짐', '또 계획을 못 지킴'] },
      { broad: '무기력', w: 1.5, situations: ['아침에 일어나기가 너무 힘듦'] },
      { broad: '만족', w: 0.6, situations: ['학원 쌤이 칭찬해줌'] },
    ],
    broadOnlyRate: [0.6, 0.5],
    fixed: [
      { offset: 1, hour: 22, minute: 10, broad: '불안', fine: '막막함', intensity: 10, situation: '성적표 보고 숨이 잘 안 쉬어짐' },
      { offset: 1, hour: 23, minute: 40, broad: '슬픔', fine: '외로움', intensity: 10, situation: '아무한테도 말을 못 하겠음' },
    ],
    strategyRate: 0.45,
    strategyWeights: { '별똥별': 3, '1년 뒤 궤도': 2, '3인칭 관측일지': 1 },
    strategyEffect: { '별똥별': 2.2, '1년 뒤 궤도': 1.2, '3인칭 관측일지': 1.8 },
    meteor: [
      { offset: 10, hour: 23, peak: 9, minutes: 12, decay: 0.1 },
      { offset: 6, hour: 22, peak: 8, minutes: 10, decay: 0.14 },
      { offset: 1, hour: 23, peak: 10, minutes: 12, decay: 0.12 },
    ],
    session: 3,
    voyage: [
      done('p1-practice'),
      done('p1-real', '아침 3점, 학원 끝나고 2점, 자기 전 4점'),
      done('p2-practice'),
      later('p2-real'),
      done('p3-practice'),
    ],
    bodyRate: 0.55,
    challenges: [
      {
        title: '점심시간에 반 친구 옆자리에 앉아보기',
        step: 1,
        session: 2,
        day: 2,
        message: '아무 말 안 해도 괜찮아. 옆에 앉는 것까지만.',
        skills: [2],
        status: '다음 주로',
      },
      {
        title: '점심시간에 반 친구 옆자리에 앉아보기',
        step: 1,
        session: 3,
        day: 1,
        message: '지난주엔 어려웠지. 이번엔 가기 전 마음 점수부터 적어보자.',
        skills: [2, 3],
        status: '실행 전 기록',
        predicted: 8,
      },
    ],
    contacts: [{ name: '정 선생님', relation: '학원 선생님' }],
    guardianConsent: true,
    assessment: { pre: 2.9 },
    letters: [],
  },
  {
    id: 'stu-d',
    name: '학생 D',
    mode: '회기중',
    nextSessionInDays: 3,
    seed: 404,
    skipDays: [0, 1, 2, 3, 8, 11],
    perDay: [1, 2],
    hours: [10, 15, 20, 21],
    intensity: [3, 8],
    templates: [
      { broad: '무기력', w: 4, situations: ['학교 끝나고 아무것도 하기 싫음', '주말 내내 누워만 있었음'] },
      { broad: '슬픔', w: 2, situations: ['전학 간 친구가 보고 싶음'] },
      { broad: '짜증', w: 1.5, situations: ['형이 내 방에 막 들어옴'] },
      { broad: '즐거움', w: 1, situations: ['친구랑 노래방 감'] },
      { broad: '느긋함', w: 1, situations: ['따뜻한 이불 속에서 웹툰 봄'] },
    ],
    broadOnlyRate: [0.4, 0.4],
    fixed: [],
    strategyRate: 0.4,
    strategyWeights: { '1년 뒤 궤도': 2, '친구별 시점': 2, '별똥별': 1 },
    strategyEffect: { '1년 뒤 궤도': 1.6, '친구별 시점': 2.4, '별똥별': 1.8 },
    meteor: [{ offset: 7, hour: 21, peak: 7, minutes: 7, decay: 0.2 }],
    session: 2,
    voyage: [done('p1-practice'), later('p1-real'), done('p2-practice')],
    bodyRate: 0.3,
    challenges: [
      {
        title: '주말에 10분 동네 산책하기',
        step: 1,
        session: 2,
        day: 1,
        message: '나가기 싫은 마음이 들어도, 그 마음을 데리고 10분만.',
        skills: [1],
        status: '보냄',
      },
    ],
    contacts: [],
    guardianConsent: false,
    assessment: { pre: 2.5 },
    letters: [],
  },
];

function makeCheckIn(
  p: Profile,
  rng: Rng,
  ts: number,
  broadName: string,
  fine: string | null,
  intensity: number,
  situation: string,
): Omit<CheckIn, 'id'> {
  const found = findBroad(broadName)!;
  const q = found.quadrant;
  const sv = q === 'hot' || q === 'low' ? -1 : 1;
  const sa = q === 'hot' || q === 'joy' ? 1 : -1;
  const mag = 0.25 + 0.65 * (intensity / 10);
  return {
    studentId: p.id,
    timestamp: new Date(ts).toISOString(),
    valence: round2(sv * clamp(mag * (0.7 + rng() * 0.4), 0.08, 0.97)),
    arousal: round2(sa * clamp(mag * (0.6 + rng() * 0.5), 0.08, 0.97)),
    broadEmotion: broadName,
    emotionWord: fine ?? broadName,
    intensity,
    situation,
  };
}

function generateStudent(p: Profile, now: number) {
  const rng = mulberry32(p.seed);
  const today = startOfDay(now);
  const raw: Omit<CheckIn, 'id'>[] = [];

  for (let off = 13; off >= 0; off--) {
    if (p.skipDays.includes(off)) continue;
    const n = randInt(rng, p.perDay[0], p.perDay[1]);
    for (let i = 0; i < n; i++) {
      const ts = today - off * DAY + pick(rng, p.hours) * HOUR + randInt(rng, 0, 59) * MINUTE;
      if (ts > now) continue;
      const tpl = weighted(rng, p.templates.map((t) => ({ item: t, w: t.w })));
      const broad = findBroad(tpl.broad)!.broad;
      const broadOnly = rng() < p.broadOnlyRate[off >= 7 ? 0 : 1];
      const fine = broadOnly ? null : pick(rng, broad.fine);
      const pleasant = ['기쁨', '자신감', '즐거움', '평온', '만족', '느긋함'].includes(tpl.broad);
      const intensity = pleasant
        ? randInt(rng, 2, Math.min(7, p.intensity[1]))
        : randInt(rng, p.intensity[0], p.intensity[1]);
      raw.push(makeCheckIn(p, rng, ts, tpl.broad, fine, intensity, pick(rng, tpl.situations)));
    }
  }
  for (const f of p.fixed) {
    const ts = today - f.offset * DAY + f.hour * HOUR + f.minute * MINUTE;
    if (ts <= now) raw.push(makeCheckIn(p, rng, ts, f.broad, f.fine, f.intensity, f.situation));
  }

  raw.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const checkIns: CheckIn[] = raw.map((c, i) => ({ ...c, id: `${p.id}-ci-${String(i + 1).padStart(3, '0')}` }));

  // 전략 사용 기록
  const strategyUses: StrategyUse[] = [];
  const strategyItems = Object.entries(p.strategyWeights).map(([s, w]) => ({ item: s as Strategy, w: w! }));
  for (const c of checkIns) {
    if (c.intensity < (p.strategyMin ?? 6) || rng() >= p.strategyRate) continue;
    const strategy = weighted(rng, strategyItems);
    const effect = p.strategyEffect[strategy] ?? 1.5;
    const actualAfter = clamp(Math.round(c.intensity - effect + (rng() - 0.5) * 2), 0, 10);
    const predictedAfter = clamp(Math.round(c.intensity - 1 - rng() * 1.5), 0, 10);
    strategyUses.push({
      id: `${c.id}-su`,
      checkInId: c.id,
      strategy,
      predictedAfter,
      actualAfter,
      createdAt: new Date(new Date(c.timestamp).getTime() + 15 * MINUTE).toISOString(),
    });
  }

  // 별똥별 궤적 기록
  const meteorSessions: MeteorSession[] = p.meteor
    .map((m, i) => {
      const startedAt = today - m.offset * DAY + m.hour * HOUR + randInt(rng, 0, 50) * MINUTE;
      const readings = Array.from({ length: m.minutes + 1 }, (_, minute) => {
        const base = minute === 0 ? m.peak - 1 : m.peak * Math.exp(-m.decay * (minute - 1));
        const noisy = minute <= 1 ? base : base + (rng() - 0.5) * 1.2;
        return { minute, intensity: clamp(Math.round(minute === 1 ? m.peak : noisy), 0, 10) };
      });
      return { id: `${p.id}-ms-${i + 1}`, studentId: p.id, startedAt: new Date(startedAt).toISOString(), readings };
    })
    .filter((s) => new Date(s.startedAt).getTime() <= now);

  // 회기는 일주일에 한 번. 마지막 회기 날짜에서 일주일씩 거슬러 올라가 각 회기 날짜를 정한다
  const lastSession = today - (p.lastSessionDaysAgo ?? Math.max(1, 7 - p.nextSessionInDays)) * DAY + 16 * HOUR;
  const sessionAt = (session: number) => lastSession - (p.session - session) * 7 * DAY;
  /** 행성이 열린 날 = 그 행성 회기 날짜 */
  const openedAt = (planetId: number) => sessionAt(sessionOfPlanet(planetId));

  const missionProgress: MissionProgress[] = p.voyage.map((v, i) => {
    const mission = MISSIONS.find((m) => m.id === v.m)!;
    const nth = p.voyage.slice(0, i).filter((x) => x.m.startsWith(`p${mission.planetId}-`)).length;
    // 아직 회기가 오지 않은 너울 행성 미션은 지금 회기 즈음에 해본 것으로
    const base = sessionAt(Math.min(sessionOfPlanet(mission.planetId), p.session));
    const at = Math.min(now - HOUR, base + (nth + 1) * DAY + 3 * HOUR);
    return {
      id: `${p.id}-mp-${v.m}`,
      studentId: p.id,
      missionId: v.m,
      status: v.s,
      reflection: v.text,
      moodBefore: v.mood?.[0],
      moodAfter: v.mood?.[1],
      completedAt: v.s === '완료' ? new Date(at).toISOString() : undefined,
    };
  });

  const challenges: Challenge[] = p.challenges.map((c, i) => {
    const created = Math.min(now - 2 * HOUR, sessionAt(c.session) + c.day * DAY + HOUR);
    return {
      id: `${p.id}-ch-${i + 1}`,
      studentId: p.id,
      title: c.title,
      step: c.step,
      session: c.session,
      dueDate: toDateKey(created + 6 * DAY),
      counselorMessage: c.message,
      linkedSkills: c.skills,
      predicted: c.predicted,
      actual: c.actual,
      reflection: c.reflection,
      status: c.status,
      createdAt: new Date(created).toISOString(),
      completedAt: c.status === '완료' ? new Date(Math.min(now - HOUR, created + 3 * DAY)).toISOString() : undefined,
    };
  });

  const trustedContacts: TrustedContact[] = p.contacts.map((c, i) => ({ id: `${p.id}-tc-${i + 1}`, studentId: p.id, ...c }));

  const consent: Consent = {
    studentId: p.id,
    agreedAt: new Date(openedAt(1) - DAY).toISOString(),
    guardianConsent: p.guardianConsent,
  };

  // 척도 응답: 평균 경향 근처에서 문항마다 조금씩 흔들리게
  // DERS 응답: 곤란 정도 근처에서 문항마다 조금씩 흔들리고, 역채점 문항은 반대로 답한다
  const answer = (difficulty: number) =>
    Array.from({ length: ASSESSMENT_ITEM_COUNT }, (_, i) => {
      const level = clamp(Math.round(difficulty + (rng() - 0.5) * 2), ASSESSMENT_CONFIG.scaleMin, ASSESSMENT_CONFIG.scaleMax);
      return isReverseItem(i) ? ASSESSMENT_CONFIG.scaleMax + ASSESSMENT_CONFIG.scaleMin - level : level;
    });
  const assessments: Assessment[] = [
    { id: `${p.id}-as-pre`, studentId: p.id, timing: '사전', scores: answer(p.assessment.pre), takenAt: consent.agreedAt },
  ];
  if (p.assessment.post !== undefined) {
    assessments.push({
      id: `${p.id}-as-post`,
      studentId: p.id,
      timing: '사후',
      scores: answer(p.assessment.post),
      takenAt: new Date(sessionAt(TOTAL_SESSIONS) + 2 * HOUR).toISOString(),
    });
  }

  // 두근 행성이 열린 뒤의 체크인 일부에는 몸 위치가 있다
  if (p.session >= sessionOfPlanet(BODY_MAP_PLANET)) {
    for (const c of checkIns) {
      if (new Date(c.timestamp).getTime() >= openedAt(BODY_MAP_PLANET) && rng() < p.bodyRate)
        c.bodyLocation = pick(rng, BODY_PARTS);
    }
  }

  const letters: Letter[] = p.letters.map((l, i) => ({
    id: `${p.id}-lt-${i + 1}`,
    studentId: p.id,
    content: l.content,
    createdAt: new Date(today - l.offset * DAY + 20 * HOUR).toISOString(),
  }));

  const student: Student = {
    id: p.id,
    name: p.name,
    currentSession: p.session,
    sessionStartedAt: new Date(lastSession).toISOString(),
    mode: p.mode,
    nextSessionDate: toDateKey(today + p.nextSessionInDays * DAY),
    joinedAt: new Date(openedAt(1) - DAY).toISOString(),
    counselorId: DEMO_COUNSELOR_ID,
  };

  return { student, checkIns, strategyUses, meteorSessions, missionProgress, challenges, trustedContacts, consent, assessments, letters };
}

/** 예시 계정 비밀번호 (모두 동일) */
export const DEMO_PASSWORD = 'star1234';

/** SHA-256(`${username}:${DEMO_PASSWORD}`) — 미리 계산해 둔 값 */
const DEMO_ACCOUNTS: { username: string; hash: string; role: Account['role']; displayName: string; studentId?: string }[] = [
  { username: 'student-a', hash: '857a86f3c73435d0086dee4e4bc08e0e11c29a805b0dce6d6ae335e0663a3c39', role: 'student', displayName: '학생 A', studentId: 'stu-a' },
  { username: 'student-b', hash: '614cd78ee9157d268cff9e379ed3bd3a10cf245e5b458ef5132235e265cfa88e', role: 'student', displayName: '학생 B', studentId: 'stu-b' },
  { username: 'student-c', hash: '208139cba1664dfb71ec30d0c999ba29a830ea806635cecdfd45491b27c4a3df', role: 'student', displayName: '학생 C', studentId: 'stu-c' },
  { username: 'student-d', hash: '3d40582194e870d453d81ed7e31523324dff66845060e2321ee09787bd67a78f', role: 'student', displayName: '학생 D', studentId: 'stu-d' },
  { username: 'counselor', hash: '8fd029560f4557b82d220a72e81ea4a5afa1b340ef91a12cfd34c35191c8826c', role: 'counselor', displayName: COUNSELOR_NAME },
];

export const DEMO_COUNSELOR_ID = 'acc-counselor';
export const DEMO_INVITE_CODE = 'DEMO01';
export const DEMO_STUDENT_IDS = PROFILES.map((p) => p.id);

export function createDemoAccounts(now = Date.now()): Account[] {
  return DEMO_ACCOUNTS.map((a) => ({
    id: `acc-${a.username}`,
    username: a.username,
    passwordHash: a.hash,
    role: a.role,
    displayName: a.displayName,
    studentId: a.studentId,
    inviteCode: a.role === 'counselor' ? DEMO_INVITE_CODE : undefined,
    createdAt: new Date(startOfDay(now) - 30 * DAY).toISOString(),
    demo: true,
  }));
}

/** 학생 4명 × 최근 2주치 예시 데이터. 실행 시점 기준으로 날짜를 맞춘다. */
export function createSeedData(now = Date.now()): DB {
  const db: DB = {
    version: DB_VERSION,
    seededAt: new Date(now).toISOString(),
    accounts: createDemoAccounts(now),
    students: [],
    checkIns: [],
    strategyUses: [],
    meteorSessions: [],
    missionProgress: [],
    challenges: [],
    trustedContacts: [],
    consents: [],
    assessments: [],
    letters: [],
    crisisAlerts: [],
  };
  for (const p of PROFILES) {
    const g = generateStudent(p, now);
    db.students.push(g.student);
    db.checkIns.push(...g.checkIns);
    db.strategyUses.push(...g.strategyUses);
    db.meteorSessions.push(...g.meteorSessions);
    db.missionProgress.push(...g.missionProgress);
    db.challenges.push(...g.challenges);
    db.trustedContacts.push(...g.trustedContacts);
    db.consents.push(g.consent);
    db.assessments.push(...g.assessments);
    db.letters.push(...g.letters);
  }
  // 예시 기록에 있는 위기 신호 (학생 C: 어젯밤 강도 10 연속)를 경보로 남긴다
  return syncCrisisAlerts(db);
}
