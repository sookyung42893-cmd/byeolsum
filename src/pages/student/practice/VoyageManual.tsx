import { useState } from 'react';
import { ArrowRight, Plus, X } from 'lucide-react';
import { useApp, useCurrentStudent } from '../../../context/AppContext';
import { newId } from '../../../lib/auth';
import type { Letter } from '../../../types';
import PracticeShell, { PracticeDone, usePracticeComplete } from './PracticeShell';
import { VisibleToCounselor } from '../PlanetMissions';

const MISSION = 'p6-practice';
const MAX_RECIPES = 3;
const LETTER_MAX = 400;

/** 레시피 칸에 띄울 추천 (직접 써도 된다) */
const FEELING_HINTS = ['화날 때', '불안할 때', '슬플 때', '무기력할 때', '창피할 때'];
const SKILL_HINTS = [
  '별똥별 띄우고 지켜보기',
  '망원경 렌즈 끼우기',
  '1분 그대로 머물기',
  '몸 어디가 반응하는지 살피기',
  '생각 함정인지 확인하기',
  '연락할 사람에게 말하기',
  '천천히 숨 네 번 쉬기',
];

interface Recipe {
  id: string;
  when: string;
  first: string;
  then: string;
}

const emptyRecipe = (): Recipe => ({ id: newId('rc'), when: '', first: '', then: '' });
const isComplete = (r: Recipe) => Boolean(r.when.trim() && r.first.trim() && r.then.trim());

export default function VoyageManualPage() {
  const { updateDb } = useApp();
  const student = useCurrentStudent()!;
  const { complete, alreadyDone } = usePracticeComplete(MISSION);
  const [recipes, setRecipes] = useState<Recipe[]>([emptyRecipe()]);
  const [letter, setLetter] = useState('');
  const [done, setDone] = useState(false);

  const ready = recipes.some(isComplete) && letter.trim().length > 0;
  const set = (id: string, key: keyof Omit<Recipe, 'id'>, value: string) =>
    setRecipes((list) => list.map((r) => (r.id === id ? { ...r, [key]: value } : r)));

  const finish = () => {
    const lines = recipes.filter(isComplete).map((r) => `${r.when.trim()} → ${r.first.trim()} → ${r.then.trim()}`);
    const saved: Letter = { id: newId('lt'), studentId: student.id, content: letter.trim(), createdAt: new Date().toISOString() };
    updateDb((d) => ({ ...d, letters: [...d.letters, saved] }));
    complete(lines.join('\n'));
    setDone(true);
  };

  if (done) {
    return (
      <PracticeShell missionId={MISSION}>
        <PracticeDone missionId={MISSION}>
          <p className="mt-2 text-sm text-night-sub">
            별빛편지도 함께 보관했어. 나중에 마음이 많이 셀 때, 지금의 네가 쓴 편지가 빛처럼 도착할 거야.
          </p>
        </PracticeDone>
      </PracticeShell>
    );
  }

  return (
    <PracticeShell missionId={MISSION}>
      <datalist id="feeling-hints">
        {FEELING_HINTS.map((h) => (
          <option key={h} value={h} />
        ))}
      </datalist>
      <datalist id="skill-hints">
        {SKILL_HINTS.map((h) => (
          <option key={h} value={h} />
        ))}
      </datalist>

      <section aria-labelledby="recipe-title" className="space-y-4">
        <div>
          <h2 id="recipe-title" className="font-sans text-lg font-medium text-night-text">
            1. 나만의 조절 레시피
          </h2>
          <p className="mt-1 text-sm text-night-sub">
            지금까지 행성에서 연습한 기술 중 나한테 맞았던 걸 순서대로 적어 봐. 칸을 누르면 추천도 보여.
          </p>
        </div>
        <ul className="space-y-3">
          {recipes.map((r, i) => (
            <li key={r.id} className="rounded-2xl border border-night-line bg-night-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-night-sub">레시피 {i + 1}</p>
                {recipes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setRecipes((list) => list.filter((x) => x.id !== r.id))}
                    aria-label={`레시피 ${i + 1} 지우기`}
                    className="rounded-lg p-1 text-night-sub hover:text-night-text"
                  >
                    <X aria-hidden="true" className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {(
                  [
                    ['when', '언제', 'feeling-hints', '화날 때'],
                    ['first', '먼저', 'skill-hints', '별똥별 띄우고 지켜보기'],
                    ['then', '그다음', 'skill-hints', '연락할 사람에게 말하기'],
                  ] as const
                ).map(([key, label, list, ph], k) => (
                  <div key={key} className="flex min-w-0 flex-1 items-center gap-2">
                    {k > 0 && <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-night-star" />}
                    <label className="min-w-0 flex-1">
                      <span className="sr-only">
                        레시피 {i + 1} {label}
                      </span>
                      <input
                        list={list}
                        value={r[key]}
                        maxLength={30}
                        placeholder={ph}
                        onChange={(e) => set(r.id, key, e.target.value)}
                        className="w-full rounded-xl border border-night-line bg-night-bg px-3 py-2 text-sm text-night-text outline-none placeholder:text-night-sub/70 focus:border-night-star"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
        {recipes.length < MAX_RECIPES && (
          <button
            type="button"
            onClick={() => setRecipes((list) => [...list, emptyRecipe()])}
            className="inline-flex items-center gap-1.5 rounded-xl border border-night-line px-4 py-2 text-sm text-night-text hover:bg-night-line/50"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            레시피 하나 더
          </button>
        )}
      </section>

      <section aria-labelledby="letter-title" className="space-y-2">
        <h2 id="letter-title" className="font-sans text-lg font-medium text-night-text">
          2. 힘들 때의 나에게 별빛편지
        </h2>
        <label htmlFor="letter" className="block text-sm text-night-sub">
          괜찮은 지금의 내가, 마음이 많이 셀 미래의 나에게 하고 싶은 말을 써 봐.
        </label>
        <textarea
          id="letter"
          rows={5}
          value={letter}
          maxLength={LETTER_MAX}
          onChange={(e) => setLetter(e.target.value)}
          placeholder="예: 지금 많이 힘들지? 예전에도 별똥별은 결국 지나갔어. 레시피대로 하나만 해 보자."
          className="w-full resize-none rounded-xl border border-night-line bg-night-bg px-4 py-3 text-night-text outline-none placeholder:text-night-sub/70 focus:border-night-star"
        />
        <div className="flex items-start justify-between gap-3">
          <VisibleToCounselor />
          <span className="text-xs tabular-nums text-night-sub">
            {letter.length} / {LETTER_MAX}
          </span>
        </div>
      </section>

      <div>
        <button
          type="button"
          disabled={!ready}
          onClick={finish}
          className="rounded-xl bg-night-star px-6 py-3 font-medium text-night-bg hover:brightness-105 disabled:cursor-not-allowed disabled:bg-night-line disabled:text-night-sub"
        >
          {alreadyDone ? '매뉴얼 다시 기록하기' : '항해 매뉴얼 완성하기'}
        </button>
        {!ready && <p className="mt-2 text-xs text-night-sub">레시피 하나(세 칸 모두)와 별빛편지를 쓰면 완성할 수 있어.</p>}
      </div>
    </PracticeShell>
  );
}
