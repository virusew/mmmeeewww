'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  const [wishes, setWishes] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  async function loadWishes() {
    const { data, error } = await supabase
      .from('public_wishes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) {
      console.error('Ошибка загрузки:', error);
      return;
    }
    setWishes(data || []);
  }

  async function sendWish() {
    if (!text.trim() || text.length > 500 || cooldown > 0) return;
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    let authorId = user?.id;

    if (!authorId) {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) {
        console.error('Ошибка анонимного входа:', error);
        setLoading(false);
        return;
      }
      authorId = data.user?.id;
    }

    const { error } = await supabase.from('wishes').insert({
      content: text.trim(),
      author_id: authorId,
    });

    if (error) {
      console.error('Ошибка отправки:', error);
      if (error.message.includes('Слишком часто')) {
        alert('Слишком часто! Подожди минуту.');
      } else {
        alert('Не получилось отправить. Попробуй ещё раз.');
      }
    } else {
      setText('');
      loadWishes();
      // Запускаем кулдаун на 60 секунд
      setCooldown(60);
      const interval = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadWishes();

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <main
      ref={containerRef}
      className="min-h-screen bg-gradient-to-br from-neutral-900 via-black to-neutral-800 relative overflow-hidden"
    >
      {/* Большое красное свечение за курсором (слабое) */}
      <div
        className="pointer-events-none fixed w-[700px] h-[700px] rounded-full"
        style={{
          left: mousePos.x - 350,
          top: mousePos.y - 350,
          background:
            'radial-gradient(circle, rgba(255,60,60,0.07) 0%, rgba(255,60,60,0.02) 40%, transparent 70%)',
          filter: 'blur(50px)',
        }}
      />

      {/* Маленькое красное свечение (поярче, но тоже мягкое) */}
      <div
        className="pointer-events-none fixed w-[300px] h-[300px] rounded-full"
        style={{
          left: mousePos.x - 150,
          top: mousePos.y - 150,
          background:
            'radial-gradient(circle, rgba(255,80,80,0.10) 0%, transparent 60%)',
          filter: 'blur(40px)',
        }}
      />

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-16">

        {/* Заголовок */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-light text-neutral-100 tracking-tight">
            Анонимные сообщения
          </h1>
        </div>

        {/* Форма */}
        <div
          className={`bg-neutral-900/70 backdrop-blur-sm rounded-2xl border transition-all duration-500 ease-out mb-12 ${
            focused
              ? 'border-red-500/40 shadow-lg shadow-red-500/10 scale-[1.01]'
              : 'border-neutral-800'
          }`}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Что ты хочешь сказать?"
            maxLength={500}
            rows={4}
            className="w-full p-5 text-neutral-100 placeholder-neutral-500 resize-none focus:outline-none bg-transparent rounded-t-2xl transition-colors duration-300"
          />
          <div className="flex justify-between items-center px-5 py-3 border-t border-neutral-800">
            <span
              className={`text-xs font-light transition-colors duration-300 ${
                text.length > 450 ? 'text-orange-400' : 'text-neutral-500'
              }`}
            >
              {text.length}/500
            </span>
            <button
              onClick={sendWish}
              disabled={loading || !text.trim() || cooldown > 0}
              className="px-5 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 ease-out"
            >
              {loading
                ? 'Отправка...'
                : cooldown > 0
                ? `Подожди ${cooldown}с`
                : 'Отправить'}
            </button>
          </div>
        </div>

        {/* Лента */}
        <div className="space-y-3">
          {wishes.length === 0 && (
            <p className="text-center text-neutral-600 text-sm py-12 font-light">
              Пока ничего нет.
            </p>
          )}
          {wishes.map((wish, index) => (
            <div
              key={wish.id}
              className="bg-neutral-900/60 backdrop-blur-sm rounded-xl border border-neutral-800 p-5 hover:border-red-500/30 hover:bg-neutral-900/80 transition-all duration-300 ease-out"
              style={{
                animation: `fadeInUp 0.5s ease-out ${index * 0.05}s both`,
              }}
            >
              <p className="text-neutral-200 leading-relaxed">{wish.content}</p>
              <div className="flex justify-between items-center mt-3 text-xs text-neutral-500 font-light">
                <span>{new Date(wish.created_at).toLocaleString('ru-RU')}</span>
                <span className="transition-colors duration-300 hover:text-red-400">
                  ❤️ {wish.likes}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}