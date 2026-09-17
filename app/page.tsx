'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  const [wishes, setWishes] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

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
    if (!text.trim() || text.length > 500) return;
    
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
      alert('Не получилось отправить. Попробуй ещё раз.');
    } else {
      setText('');
      loadWishes();
    }
    
    setLoading(false);
  }

  useEffect(() => {
    loadWishes();
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-white text-center mb-2">
          🎓 Желания колледжа
        </h1>
        <p className="text-white/80 text-center mb-8">
          Анонимно. Честно. Без имён.
        </p>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8 border border-white/20">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Что ты хочешь? Напиши анонимно..."
            maxLength={500}
            rows={3}
            className="w-full p-4 rounded-xl bg-white/90 text-gray-900 placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-white"
          />
          <div className="flex justify-between items-center mt-3">
            <span className="text-white/70 text-sm">{text.length}/500</span>
            <button
              onClick={sendWish}
              disabled={loading || !text.trim()}
              className="px-6 py-2 bg-white text-purple-600 font-semibold rounded-xl hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Отправка...' : 'Отправить анонимно'}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {wishes.length === 0 && (
            <p className="text-white/60 text-center py-10">
              Пока желаний нет. Будь первым! ✨
            </p>
          )}
          {wishes.map((wish) => (
            <div
              key={wish.id}
              className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 hover:bg-white/20 transition"
            >
              <p className="text-white text-lg">{wish.content}</p>
              <div className="flex justify-between items-center mt-3 text-white/60 text-sm">
                <span>{new Date(wish.created_at).toLocaleString('ru-RU')}</span>
                <span>❤️ {wish.likes}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}