export type StudentMode = '회기중' | '유지';

export interface Student {
  id: string;
  name: string;
  /**
   * 지금 진행 중인 회기 (1~8). 상담사가 "다음 회기로"를 누르면 올라간다.
   * 지금 정거장은 회기 번호로 계산한다 (data/planets.ts의 STATIONS).
   * 별똥별 도구는 행성 상태와 상관없이 1회기부터 늘 쓸 수 있다
   */
  currentSession: number;
  /** 지금 회기가 시작된 시각 (상담사가 "다음 회기로"를 누른 때) */
  sessionStartedAt?: string;
  /** YYYY-MM-DD, 아직 정해지지 않았으면 null */
  nextSessionDate: string | null;
  mode: StudentMode;
  /** 가입(등록) 시각 */
  joinedAt: string;
  /** 담당 상담사 계정 id. 이 상담사의 관측소에만 보인다 */
  counselorId: string | null;
  /** 상담사가 두근 행성의 "두근 실험"(30초 제자리 뛰기)을 꺼 두었는지 */
  heartExperimentOff?: boolean;
}

export type Role = 'student' | 'counselor';

export interface Account {
  id: string;
  username: string;
  /** SHA-256(username:password). 데모용이며 실제 인증 수준의 보안은 아님 */
  passwordHash: string;
  role: Role;
  displayName: string;
  /** role이 student일 때 연결된 Student */
  studentId?: string;
  /** role이 counselor일 때, 학생이 가입하며 입력하는 초대 코드 */
  inviteCode?: string;
  createdAt: string;
  /** 예시 데이터로 들어간 계정 */
  demo?: boolean;
}

/** 몸 지도에서 고를 수 있는 곳 */
export const BODY_PARTS = ['머리', '얼굴', '목·어깨', '가슴', '배', '팔·손', '다리'] as const;
export type BodyPart = (typeof BODY_PARTS)[number];

export interface CheckIn {
  id: string;
  studentId: string;
  /** ISO 문자열 */
  timestamp: string;
  /** -1(불쾌) ~ 1(유쾌). 화면 크기와 무관한 비율 좌표 */
  valence: number;
  /** -1(에너지 낮음) ~ 1(에너지 높음). 화면 크기와 무관한 비율 좌표 */
  arousal: number;
  /** 세부 감정. 상위 감정만 골랐다면 broadEmotion과 같은 값 */
  emotionWord: string;
  broadEmotion: string;
  /** 몸 지도에서 감정을 느낀 곳 (두근 행성부터, 선택) */
  bodyLocation?: BodyPart;
  /** 0 ~ 10 */
  intensity: number;
  situation: string;
}

export const LENSES = ['1년 뒤 궤도', '친구별 시점', '3인칭 관측일지'] as const;
export type Lens = (typeof LENSES)[number];

export const STRATEGIES = ['1년 뒤 궤도', '친구별 시점', '3인칭 관측일지', '별똥별', '호흡', '감각 찾기'] as const;
export type Strategy = (typeof STRATEGIES)[number];

export interface StrategyUse {
  id: string;
  checkInId: string;
  strategy: Strategy;
  /** 시작 전 예보한 강도 (0~10) */
  predictedAfter: number;
  /** 끝난 뒤 실제 강도 (0~10) */
  actualAfter: number;
  /** 관측 메모 (선택) */
  note?: string;
  createdAt?: string;
}

export interface MeteorReading {
  minute: number;
  intensity: number;
}

export interface MeteorSession {
  id: string;
  studentId: string;
  startedAt: string;
  readings: MeteorReading[];
}

/** 학생마다 계산되는 행성 상태 */
export type PlanetStatus = '완료' | '탐사중' | '열림' | '잠김';

/** 행성 6개 = UP-A 모듈에 대응 */
export interface Planet {
  id: number;
  name: string;
  /** 대응하는 UP-A 모듈 (예: "모듈 2·3") */
  upaModule: string;
  /** 이 행성에서 배우는 정서조절 기술 */
  theme: string;
  /** 행성 미션 2개를 모두 마치면 얻는 발견물 */
  discoveryName: string;
  color: string;
}

/** 행성 미션: 연습(앱 안에서 기술 연습) + 현실(생활에서 해보기). 모든 학생에게 같다 */
export type MissionKind = '연습' | '현실';

export interface Mission {
  /** 예: p3-real */
  id: string;
  planetId: number;
  kind: MissionKind;
  title: string;
  description: string;
  /** 연습 미션: 바로 가는 화면 */
  to?: string;
  /** 현실 미션 중 하기 전·한 후 기분(0~10)을 함께 적는 미션 */
  recordMood?: boolean;
}

export type MissionProgressStatus = '대기' | '완료' | '다음 항해로';

/** 완료한 미션을 "한 번 더 해보기"로 반복한 기록 */
export interface MissionRepeat {
  reflection?: string;
  moodBefore?: number;
  moodAfter?: number;
  at: string;
}

export interface MissionProgress {
  id: string;
  studentId: string;
  missionId: string;
  status: MissionProgressStatus;
  /** 첫 완료 때의 기록. 현실 미션 한 줄 소감 (현실 미션은 완료하려면 필수) */
  reflection?: string;
  /** recordMood 미션: 하기 전·한 후 기분 (0 아주 안 좋음 ~ 10 아주 좋음) */
  moodBefore?: number;
  moodAfter?: number;
  /** 첫 완료 시각. 발견물과 완료율은 첫 완료만 기준으로 센다 */
  completedAt?: string;
  /** 첫 완료 뒤 반복한 기록 (오래된 것부터) */
  repeats?: MissionRepeat[];
}

/** 도전 미션: 회기에서 상담사와 함께 정한 다가가기 과제 (UP-A 모듈 7, 정서 노출) */
export type ChallengeStatus = '보냄' | '실행 전 기록' | '완료' | '다음 주로';

export interface Challenge {
  id: string;
  studentId: string;
  title: string;
  /** 다가가기 단계 1~3 */
  step: 1 | 2 | 3;
  /** YYYY-MM-DD */
  dueDate: string;
  counselorMessage: string;
  /** 챙겨갈 기술 = 연결된 행성 id */
  linkedSkills: number[];
  /** 하기 전 마음 (0~10) */
  predicted?: number;
  /** 하고 나서 마음 (0~10) */
  actual?: number;
  reflection?: string;
  status: ChallengeStatus;
  /** 보낸 회기 (1~8). 6~7회기에 보낸 도전은 용기 구간에 모인다 */
  session: number;
  createdAt: string;
  completedAt?: string;
}

/** 힘들 때 연락할 사람 (1~3명) */
export interface TrustedContact {
  id: string;
  studentId: string;
  name: string;
  relation: string;
}

export interface Consent {
  studentId: string;
  agreedAt: string;
  guardianConsent: boolean;
}

export type AssessmentTiming = '사전' | '사후';

/** 정서조절 척도. 문항 수·응답 범위는 data/assessment.ts 설정을 따른다 */
export interface Assessment {
  id: string;
  studentId: string;
  timing: AssessmentTiming;
  /** 문항 순서대로의 응답 */
  scores: number[];
  takenAt: string;
}

/** 위기 신호 종류 */
export type CrisisKind = '강도 10 연속' | '위험 키워드';
/** 상담사 처리 상태 */
export type CrisisStatus = '새 신호' | '확인함' | '연락함';

/**
 * 위기 신호(적색 경보) 기록. 감지되는 순간 따로 저장해서,
 * 학생이 그 체크인이나 소감을 지워도 상담사 쪽 기록은 남는다.
 */
export interface CrisisAlert {
  /** 감지한 기록으로 정해지는 키 (같은 신호를 두 번 만들지 않게) */
  id: string;
  studentId: string;
  kind: CrisisKind;
  /** 어디서 감지했는지 (체크인 상황 메모, 미션 소감 등) */
  source: string;
  /** 상담사에게 보여줄 내용 (메모 원문 또는 강도 10 기록 요약) */
  detail: string;
  keyword?: string;
  /** 신호가 생긴 시각 (근무 시간 안/밖을 가른다) */
  detectedAt: string;
  /** 신호를 만든 원래 기록 id들 (지울 때 학생에게 알려주기 위해) */
  sourceIds: string[];
  status: CrisisStatus;
  memo?: string;
  handledAt?: string;
}

export interface Letter {
  id: string;
  studentId: string;
  content: string;
  createdAt: string;
}

/** 저장 형식 버전. 바뀌면 저장된 데이터를 모두 지우고 새 예시 데이터로 채운다 (6: 8회기 · 정거장 7곳) */
export const DB_VERSION = 10;

export interface DB {
  version: typeof DB_VERSION;
  seededAt: string;
  accounts: Account[];
  students: Student[];
  checkIns: CheckIn[];
  strategyUses: StrategyUse[];
  meteorSessions: MeteorSession[];
  missionProgress: MissionProgress[];
  challenges: Challenge[];
  trustedContacts: TrustedContact[];
  consents: Consent[];
  assessments: Assessment[];
  letters: Letter[];
  crisisAlerts: CrisisAlert[];
}

export type Session =
  | { role: 'student'; accountId: string; studentId: string }
  | { role: 'counselor'; accountId: string }
  | null;
