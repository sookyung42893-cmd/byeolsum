import { useState } from 'react';
import { Mail, Trash2 } from 'lucide-react';
import { useApp, useCurrentStudent } from '../../context/AppContext';
import { newId } from '../../lib/auth';
import { formatDate } from '../../lib/dates';
import { VisibleToCounselor } from './PlanetMissions';
import { askConfirm } from '../../lib/confirm';
import type { DB, Letter } from '../../types';

const LETTER_MAX = 400;
/** 이 강도 이상으로 체크인하면 써 둔 편지가 도착한다 */
export const LETTER_ARRIVAL_INTENSITY = 8;

export function lettersOf(db: DB, studentId: string): Letter[] {
  return db.letters.filter((l) => l.studentId === studentId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** 강도 8 이상 체크인 때 도착할 편지 하나 (체크인마다 정해진 편지가 고르게 돌아가며 온다) */
export function letterFor(db: DB, studentId: string, checkInId: string): Letter | undefined {
  const list = lettersOf(db, studentId);
  if (list.length === 0) return undefined;
  const h = [...checkInId].reduce((s, ch) => (s * 31 + ch.charCodeAt(0)) % 9973, 7);
  return list[h % list.length];
}

/** 도착한 편지 카드 */
export function ArrivedLetter({ letter }: { letter: Letter }) {
  return (
    <section
      aria-labelledby="arrived-title"
      className="rounded-2xl border border-[#E3D3FF]/50 bg-[radial-gradient(circle_at_15%_20%,rgba(227,211,255,0.18),transparent_60%)] p-5"
    >
      <h3 id="arrived-title" className="flex items-center gap-2 font-display text-lg text-[#E3D3FF]">
        <Mail aria-hidden="true" className="h-5 w-5" />
        과거의 너에게서 빛이 도착했어
      </h3>
      <p className="mt-1 text-xs text-night-sub">{formatDate(letter.createdAt)}의 네가 쓴 편지</p>
      <p className="mt-3 whitespace-pre-line leading-relaxed text-night-text">{letter.content}</p>
    </section>
  );
}

export default function LettersPage() {
  const { db, updateDb } = useApp();
  const student = useCurrentStudent()!;
  const list = lettersOf(db, student.id);
  const [text, setText] = useState('');
  const [saved, setSaved] = useState('');

  const save = () => {
    const t = text.trim();
    if (!t) return;
    const l: Letter = { id: newId('lt'), studentId: student.id, content: t, createdAt: new Date().toISOString() };
    updateDb((d) => ({ ...d, letters: [...d.letters, l] }));
    setText('');
    setSaved('편지를 별빛으로 보관했어. 마음이 많이 셀 때 도착할 거야.');
  };

  return (
    <div className="max-w-3xl space-y-8">
      <header>
        <h1 className="text-3xl text-night-text">별빛편지</h1>
        <p className="mt-2 leading-relaxed text-night-sub">
          괜찮은 날의 내가 미래의 나에게 보내는 빛이야. 지금 마음이 괜찮을 때 써 두면, 나중에 강도 {LETTER_ARRIVAL_INTENSITY} 이상으로
          마음이 셀 때 "과거의 너에게서 빛이 도착했어"라며 이 편지가 떠.
        </p>
      </header>

      <form
        className="space-y-2 rounded-3xl border border-night-line bg-night-card p-6"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <label htmlFor="letter-new" className="block font-sans text-base font-medium text-night-text">
          힘들 때의 나에게
        </label>
        <textarea
          id="letter-new"
          rows={6}
          value={text}
          maxLength={LETTER_MAX}
          onChange={(e) => {
            setText(e.target.value);
            setSaved('');
          }}
          placeholder="예: 지금 많이 힘들지? 예전에도 별똥별은 결국 지나갔어. 숨 한 번 쉬고, 연락할 사람 한 명만 떠올려 보자."
          className="w-full resize-none rounded-xl border border-night-line bg-night-bg px-4 py-3 leading-relaxed text-night-text outline-none placeholder:text-night-sub/70 focus:border-night-star"
        />
        <div className="flex items-start justify-between gap-3">
          <VisibleToCounselor />
          <span className="text-xs tabular-nums text-night-sub">
            {text.length} / {LETTER_MAX}
          </span>
        </div>
        <div className="flex items-center gap-4 pt-1">
          <button
            type="submit"
            disabled={!text.trim()}
            className="rounded-xl bg-night-star px-5 py-2.5 font-medium text-night-bg hover:brightness-105 disabled:cursor-not-allowed disabled:bg-night-line disabled:text-night-sub"
          >
            별빛으로 보관하기
          </button>
          <p className="text-sm text-night-star" aria-live="polite">
            {saved}
          </p>
        </div>
      </form>

      <section aria-labelledby="letters-list">
        <h2 id="letters-list" className="font-sans text-lg font-medium text-night-text">
          보관한 편지 {list.length}통
        </h2>
        {list.length === 0 ? (
          <p className="mt-3 text-sm text-night-sub">아직 보관한 편지가 없어.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {list.map((l) => (
              <li key={l.id} className="rounded-2xl border border-night-line bg-night-card p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-night-sub">{formatDate(l.createdAt)}에 씀</p>
                  <button
                    type="button"
                    onClick={() =>
                      void askConfirm('이 편지를 지울까?', '지우기').then(
                        (ok) => ok && updateDb((d) => ({ ...d, letters: d.letters.filter((x) => x.id !== l.id) })),
                      )
                    }
                    aria-label={`${formatDate(l.createdAt)}에 쓴 편지 지우기`}
                    className="rounded-lg p-1 text-night-sub hover:text-night-text"
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-2 whitespace-pre-line leading-relaxed text-night-text">{l.content}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
