import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { SparkleStar } from './Sparkle';

interface Meteor {
  id: number;
  top: number;
  left: number;
  length: number;
  duration: number;
  dx: number;
  dy: number;
  angle: number;
}

/** 몇 초에 한 번씩 별똥별을 하나 띄운다. '동작 줄이기' 설정이면 띄우지 않는다. */
function useMeteors(enabled: boolean) {
  const [meteors, setMeteors] = useState<Meteor[]>([]);

  useEffect(() => {
    if (!enabled || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let timer: number;
    let nextId = 0;
    const schedule = (delay: number) => {
      timer = window.setTimeout(() => {
        // 오른쪽 위에서 왼쪽 아래로 비스듬히 떨어진다
        const angle = 140 + Math.random() * 25;
        const distance = 260 + Math.random() * 220;
        const rad = (angle * Math.PI) / 180;
        setMeteors((list) => [
          ...list,
          {
            id: nextId++,
            top: 2 + Math.random() * 40,
            left: 35 + Math.random() * 60,
            length: 90 + Math.random() * 90,
            duration: 0.9 + Math.random() * 0.7,
            dx: Math.cos(rad) * distance,
            dy: Math.sin(rad) * distance,
            angle,
          },
        ]);
        schedule(1500 + Math.random() * 2500);
      }, delay);
    };
    schedule(800);
    return () => window.clearTimeout(timer);
  }, [enabled]);

  const remove = (id: number) => setMeteors((list) => list.filter((m) => m.id !== id));
  return { meteors, remove };
}

/** 장식용 배경 별. 스크린리더에는 숨긴다. */
export default function StarField({
  count = 140,
  seed = 7,
  meteors: withMeteors = true,
}: {
  count?: number;
  seed?: number;
  meteors?: boolean;
}) {
  const stars = useMemo(() => {
    let s = seed;
    const rand = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    return Array.from({ length: count }, () => ({
      x: rand() * 1440,
      y: rand() * 900,
      r: 0.4 + rand() * 1.3,
      o: 0.15 + rand() * 0.45,
    }));
  }, [count, seed]);

  const { meteors, remove } = useMeteors(withMeteors);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        {stars.map((st, i) =>
          // 열에 하나꼴로 큰 별은 가는 빛살이 있는 반짝이 별로
          i % 10 === 0 ? (
            <SparkleStar key={i} cx={st.x} cy={st.y} r={8 + st.r * 7} color="#EEF0FF" opacity={st.o + 0.3} glow={0.7} twinkle delay={i * 0.37} />
          ) : (
            <circle key={i} cx={st.x} cy={st.y} r={st.r} fill="#EEF0FF" opacity={st.o} />
          ),
        )}
      </svg>
      {meteors.map((m) => (
        <span
          key={m.id}
          className="meteor"
          onAnimationEnd={() => remove(m.id)}
          style={
            {
              top: `${m.top}%`,
              left: `${m.left}%`,
              width: m.length,
              animationDuration: `${m.duration}s`,
              '--dx': `${m.dx}px`,
              '--dy': `${m.dy}px`,
              '--angle': `${m.angle}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
