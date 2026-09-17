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
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
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

  function getShareUrl() {
    if (typeof window === 'undefined') return '';
    return window.location.origin;
  }

  function shareTo(platform: 'telegram' | 'whatsapp' | 'copy') {
    const url = getShareUrl();
    const text = 'Заходи на анонимную доску сообщений 🎓';

    if (platform === 'telegram') {
      window.open(
        `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
        '_blank'
      );
    } else if (platform === 'whatsapp') {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,
        '_blank'
      );
    } else {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function sendWish() {
    if (!text.trim() || text.length > 500 || cooldown > 0) return;
    setLoading(true);
    setMessage(null);

    const { data: { user } } = await supabase.auth.getUser();
    let authorId = user?.id;

    if (!authorId) {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) {
        console.error('Ошибка анонимного входа:', error);
        setMessage({ type: 'error', text: 'Ошибка входа. Попробуй ещё раз.' });
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
        setMessage({ type: 'error', text: 'Слишком часто! Подожди минуту.' });
      } else {
        setMessage({ type: 'error', text: 'Не получилось отправить. Попробуй ещё раз.' });
      }
    } else {
      setText('');
      setMessage({ type: 'success', text: 'Отправлено анонимно ✨' });
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
      setTimeout(() => setMessage(null), 3000);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadWishes();

    const channel = supabase
      .channel('wishes-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wishes' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newWish = payload.new as any;
            if (newWish.is_approved) {
              setWishes((prev) => {
                if (prev.some((w) => w.id === newWish.id)) return prev;
                return [newWish, ...prev];
              });
              setNewIds((prev) => new Set(prev).add(newWish.id));
              setTimeout(() => {
                setNewIds((prev) => {
                  const copy = new Set(prev);
                  copy.delete(newWish.id);
                  return copy;
                });
              }, 5000);
            }
          } else if (payload.eventType === 'UPDATE') {
            // Обновляем сообщение (например, появился ответ админа)
            const updated = payload.new as any;
            setWishes((prev) =>
              prev.map((w) =>
                w.id === updated.id
                  ? { ...w, admin_reply: updated.admin_reply, admin_replied_at: updated.admin_replied_at }
                  : w
              )
            );
          }
        }
      )
      .subscribe();

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const cooldownProgress = cooldown > 0 ? ((60 - cooldown) / 60) * 100 : 0;

  return (
    <main
      ref={containerRef}
      className="min-h-screen bg-gradient-to-br from-neutral-900 via-black to-neutral-800 relative overflow-hidden"
    >
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

        <div className="text-center mb-12">
          <h1 className="text-3xl font-light text-neutral-100 tracking-tight mb-4">
            Анонимные сообщения
          </h1>
          <div className="flex justify-center gap-2 flex-wrap">
            <button
              onClick={() => shareTo('telegram')}
              className="px-3 py-1.5 text-xs text-neutral-400 border border-neutral-800 rounded-lg hover:border-red-500/40 hover:text-red-400 transition-all duration-300"
            >
              Telegram
            </button>
            <button
              onClick={() => shareTo('whatsapp')}
              className="px-3 py-1.5 text-xs text-neutral-400 border border-neutral-800 rounded-lg hover:border-red-500/40 hover:text-red-400 transition-all duration-300"
            >
              WhatsApp
            </button>
            <button
              onClick={() => shareTo('copy')}
              className="px-3 py-1.5 text-xs text-neutral-400 border border-neutral-800 rounded-lg hover:border-red-500/40 hover:text-red-400 transition-all duration-300"
            >
              {copied ? 'Скопировано ✓' : 'Скопировать ссылку'}
            </button>
          </div>
        </div>

        <div
          className={`bg-neutral-900/70 backdrop-blur-sm rounded-2xl border transition-all duration-500 ease-out mb-4 ${
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
            disabled={cooldown > 0}
            className="w-full p-5 text-neutral-100 placeholder-neutral-500 resize-none focus:outline-none bg-transparent rounded-t-2xl transition-colors duration-300 disabled:opacity-50"
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
              {loading ? 'Отправка...' : cooldown > 0 ? 'Заблокировано' : 'Отправить'}
            </button>
          </div>
        </div>

        {cooldown > 0 && (
          <div
            className="mb-6 bg-neutral-900/60 backdrop-blur-sm rounded-xl border border-red-500/20 p-4 overflow-hidden"
            style={{ animation: 'fadeInUp 0.4s ease-out' }}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-neutral-400 font-light">
                Следующее сообщение через
              </span>
              <span className="text-sm text-red-400 font-medium tabular-nums">
                {cooldown} сек
              </span>
            </div>
            <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${cooldownProgress}%` }}
              />
            </div>
          </div>
        )}

        {message && cooldown === 0 && (
          <div
            className={`mb-6 text-center text-sm font-light py-3 px-4 rounded-xl border transition-all duration-300 ${
              message.type === 'success'
                ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5'
                : 'text-red-400 border-red-500/20 bg-red-500/5'
            }`}
            style={{ animation: 'fadeInUp 0.4s ease-out' }}
          >
            {message.text}
          </div>
        )}

        <div className="space-y-3 mt-8">
          {wishes.length === 0 && (
            <p className="text-center text-neutral-600 text-sm py-12 font-light">
              Пока ничего нет.
            </p>
          )}
          {wishes.map((wish, index) => {
            const isNew = newIds.has(wish.id);
            return (
              <div
                key={wish.id}
                className={`backdrop-blur-sm rounded-xl border p-5 transition-all duration-500 ease-out ${
                  isNew
                    ? 'bg-red-500/5 border-red-500/40 shadow-lg shadow-red-500/10'
                    : 'bg-neutral-900/60 border-neutral-800 hover:border-red-500/30 hover:bg-neutral-900/80'
                }`}
                style={{
                  animation: `fadeInUp 0.5s ease-out ${isNew ? 0 : index * 0.05}s both`,
                }}
              >
                {isNew && (
                  <span className="inline-block text-[10px] text-red-400 border border-red-500/30 bg-red-500/10 px-2 py-0.5 rounded-full mb-2 uppercase tracking-wider">
                    Новое
                  </span>
                )}
                <p className="text-neutral-200 leading-relaxed">{wish.content}</p>

                {/* Ответ администрации */}
                {wish.admin_reply && (
                  <div className="mt-3 pl-4 border-l-2 border-red-500/40">
                    <div className="text-[10px] text-red-400 uppercase tracking-wider mb-1">
                      Ответ администрации
                    </div>
                    <p className="text-neutral-300 text-sm leading-relaxed">
                      {wish.admin_reply}
                    </p>
                  </div>
                )}

                <div className="flex justify-between items-center mt-3 text-xs text-neutral-500 font-light">
                  <span>{new Date(wish.created_at).toLocaleString('ru-RU')}</span>
                  <span className="transition-colors duration-300 hover:text-red-400">
                    ❤️ {wish.likes}
                  </span>
                </div>
              </div>
            );
          })}
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