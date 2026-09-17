'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { SECTIONS } from './sections';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);

  useEffect(() => {
    async function loadCounts() {
      const { data } = await supabase
        .from('public_wishes')
        .select('tag');
      if (!data) return;
      const map: Record<string, number> = {};
      data.forEach((w: any) => {
        const t = w.tag || 'other';
        map[t] = (map[t] || 0) + 1;
      });
      setCounts(map);
      setTotal(data.length);
    }
    loadCounts();

    const handleMouseMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-900 via-black to-neutral-800 relative overflow-hidden">
      <div className="pointer-events-none fixed w-[700px] h-[700px] rounded-full" style={{ left: mousePos.x - 350, top: mousePos.y - 350, background: 'radial-gradient(circle, rgba(255,60,60,0.07) 0%, rgba(255,60,60,0.02) 40%, transparent 70%)', filter: 'blur(50px)' }} />
      <div className="pointer-events-none fixed w-[300px] h-[300px] rounded-full" style={{ left: mousePos.x - 150, top: mousePos.y - 150, background: 'radial-gradient(circle, rgba(255,80,80,0.10) 0%, transparent 60%)', filter: 'blur(40px)' }} />

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-light text-neutral-100 tracking-tight mb-2">
            Анонимные сообщения
          </h1>
          <p className="text-neutral-500 text-sm font-light">
            Выбери раздел и напиши туда. Всего сообщений: {total}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SECTIONS.map((s) => (
            <Link
              key={s.id}
              href={`/section/${s.id}`}
              className={`group block bg-gradient-to-br ${s.color} bg-neutral-900/60 backdrop-blur-sm rounded-2xl border ${s.border} p-6 hover:scale-[1.02] hover:shadow-lg transition-all duration-300 ease-out`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="text-4xl">{s.emoji}</div>
                <div className={`text-xs ${s.accent} border ${s.border} px-2 py-0.5 rounded-full`}>
                  {counts[s.id] || 0}
                </div>
              </div>
              <h2 className="text-lg text-neutral-100 font-medium mb-1">{s.label}</h2>
              <p className="text-neutral-500 text-sm font-light leading-relaxed">
                {s.description}
              </p>
              <div className={`mt-4 text-xs ${s.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}>
                Зайти →
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-12 text-xs text-neutral-600 font-light">
          Пиши свободно. Без имён. Без следов.
        </div>
      </div>
    </main>
  );
}