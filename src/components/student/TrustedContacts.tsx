import { useState } from 'react';
import { Plus, Trash2, UserRound } from 'lucide-react';
import { useApp, useCurrentStudent } from '../../context/AppContext';
import { newId } from '../../lib/auth';
import type { TrustedContact } from '../../types';

export const MAX_CONTACTS = 3;
const RELATION_HINTS = ['가족', '친구', '담임 선생님', '학원 선생님', '상담 선생님'];

export function contactsOf(contacts: TrustedContact[], studentId: string) {
  return contacts.filter((c) => c.studentId === studentId);
}

/** 힘들 때 연락할 사람 1~3명 (이름, 관계) 등록·지우기 */
export default function TrustedContactsEditor() {
  const { db, updateDb } = useApp();
  const student = useCurrentStudent()!;
  const list = contactsOf(db.trustedContacts, student.id);
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('');
  const [error, setError] = useState('');

  const add = () => {
    if (!name.trim() || !relation.trim()) {
      setError('이름(또는 부르는 말)과 관계를 모두 적어 줘.');
      return;
    }
    const c: TrustedContact = { id: newId('tc'), studentId: student.id, name: name.trim(), relation: relation.trim() };
    updateDb((d) => ({ ...d, trustedContacts: [...d.trustedContacts, c] }));
    setName('');
    setRelation('');
    setError('');
  };

  return (
    <div className="space-y-3">
      {list.length > 0 ? (
        <ul className="space-y-2">
          {list.map((c) => (
            <li key={c.id} className="flex items-center gap-3 rounded-xl border border-night-line bg-night-bg/60 px-4 py-2.5">
              <UserRound aria-hidden="true" className="h-4 w-4 shrink-0 text-night-star" />
              <span className="min-w-0 flex-1 text-night-text">
                {c.name} <span className="text-sm text-night-sub">· {c.relation}</span>
              </span>
              <button
                type="button"
                onClick={() => updateDb((d) => ({ ...d, trustedContacts: d.trustedContacts.filter((x) => x.id !== c.id) }))}
                aria-label={`${c.name} 지우기`}
                className="rounded-lg p-1 text-night-sub hover:text-night-text"
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-night-sub">아직 등록한 사람이 없어. 한 명만 적어 둬도 충분해.</p>
      )}

      {list.length < MAX_CONTACTS ? (
        <form
          noValidate
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <datalist id="relation-hints">
            {RELATION_HINTS.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
          <label className="min-w-0 flex-1">
            <span className="mb-1 block text-xs text-night-sub">이름 또는 부르는 말</span>
            <input
              value={name}
              maxLength={12}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 엄마, 민지"
              className="w-full rounded-xl border border-night-line bg-night-bg px-3 py-2 text-sm text-night-text outline-none placeholder:text-night-sub/70 focus:border-night-star"
            />
          </label>
          <label className="min-w-0 flex-1">
            <span className="mb-1 block text-xs text-night-sub">관계</span>
            <input
              value={relation}
              maxLength={12}
              list="relation-hints"
              onChange={(e) => setRelation(e.target.value)}
              placeholder="예: 가족, 친구"
              className="w-full rounded-xl border border-night-line bg-night-bg px-3 py-2 text-sm text-night-text outline-none placeholder:text-night-sub/70 focus:border-night-star"
            />
          </label>
          <button type="submit" className="inline-flex items-center gap-1.5 rounded-xl border border-night-star/60 px-4 py-2 text-sm text-night-text hover:bg-night-star/10">
            <Plus aria-hidden="true" className="h-4 w-4" />
            등록
          </button>
        </form>
      ) : (
        <p className="text-xs text-night-sub">세 명까지 등록할 수 있어.</p>
      )}
      {error && (
        <p role="alert" className="text-xs text-emo-hot">
          {error}
        </p>
      )}
    </div>
  );
}
