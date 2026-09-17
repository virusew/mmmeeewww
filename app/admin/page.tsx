'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState<any>(null);
  const [wishes, setWishes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    week: 0,
    chartData: [] as { day: string; count: number }[],
    topWords: [] as { word: string; count: number }[],
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        loadWishes();
      }
    });
  }, []);

  async function login() {
    setLoading(true);
    setError('');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setUser(data.user);
    loadWishes();
    setLoading(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setWishes([]);
  }

  async function loadWishes() {
    const { data, error } = await supabase
      .from('wishes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Ошибка загрузки:', error);
      return;
    }
    setWishes(data || []);
    computeStats(data || []);
  }

  function computeStats(list: any[]) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const total = list.length;
    const today = list.filter((w) => new Date(w.created_at) >= startOfDay).length;
    const week = list.filter((w) => new Date(w.created_at) >= weekAgo).length;

    // График за 7 дней
    const chartData: { day: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const count = list.filter((w) => {
        const t = new Date(w.created_at);
        return t >= dayStart && t < dayEnd;
      }).length;
      chartData.push({
        day: d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
        count,
      });
    }

    // Топ-слова
    const wordMap: Record<string, number> = {};
    const stopWords = new Set(['это', 'что', 'как', 'для', 'или', 'быть', 'если', 'есть', 'ещё', 'еще', 'меня', 'мне', 'тебя', 'его', 'она', 'они', 'все', 'всё', 'так', 'там', 'тут', 'где', 'когда', 'почему', 'зачем', 'очень', 'просто', 'тоже', 'также', 'чтобы', 'можно', 'нужно', 'надо']);
    list.forEach((w) => {
      w.content
        .toLowerCase()
        .replace(/[^\wа-яё\s]/gi, '')
        .split(/\s+/)
        .filter((word: string) => word.length > 3 && !stopWords.has(word))
        .forEach((word: string) => {
          wordMap[word] = (wordMap[word] || 0) + 1;
        });
    });
    const topWords = Object.entries(wordMap)
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);

    setStats({ total, today, week, chartData, topWords });
  }

  async function deleteWish(id: string) {
    if (!confirm('Удалить это сообщение?')) return;
    const { error } = await supabase.from('wishes').delete().eq('id', id);
    if (error) {
      alert('Ошибка удаления: ' + error.message);
      return;
    }
    loadWishes();
  }

  async function toggleApprove(id: string, current: boolean) {
    const { error } = await supabase.from('wishes').update({ is_approved: !current }).eq('id', id);
    if (error) {
      alert('Ошибка: ' + error.message);
      return;
    }
    loadWishes();
  }

  async function saveReply(id: string) {
    const reply = (replyTexts[id] || '').trim();
    const { error } = await supabase
      .from('wishes')
      .update({
        admin_reply: reply || null,
        admin_replied_at: reply ? new Date().toISOString() : null,
      })
      .eq('id', id);
    if (error) {
      alert('Ошибка: ' + error.message);
      return;
    }
    setReplyTexts((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    loadWishes();
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
        <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md">
          <h1 className="text-3xl font-bold text-white mb-6 text-center">🔐 Админ-панель</h1>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 mb-3 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 mb-3 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          {error && <p className="text-red-400 mb-3 text-sm">{error}</p>}
          <button
            onClick={login}
            disabled={loading}
            className="w-full py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">🛡️ Админ-панель</h1>
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-sm">{user.email}</span>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Выйти
            </button>
          </div>
        </div>

        {/* Три карточки статистики */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="text-gray-400 text-xs mb-1">Всего</div>
            <div className="text-white text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="text-gray-400 text-xs mb-1">Сегодня</div>
            <div className="text-white text-2xl font-bold">{stats.today}</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="text-gray-400 text-xs mb-1">За неделю</div>
            <div className="text-white text-2xl font-bold">{stats.week}</div>
          </div>
        </div>

        {/* График за 7 дней */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 mb-6">
          <div className="text-gray-400 text-xs mb-3">Активность за 7 дней</div>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="day" stroke="#9CA3AF" fontSize={11} />
                <YAxis stroke="#9CA3AF" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                  labelStyle={{ color: '#9CA3AF' }}
                  formatter={(value: any) => [`${value} сообщ.`, '']}
                />
                <Bar dataKey="count" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Топ-слова */}
        {stats.topWords.length > 0 && (
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 mb-6">
            <div className="text-gray-400 text-xs mb-3">Топ-слова</div>
            <div className="flex flex-wrap gap-2">
              {stats.topWords.map(({ word, count }) => (
                <span
                  key={word}
                  className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-lg"
                >
                  {word} <span className="text-red-400 font-medium">{count}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <p className="text-gray-400 mb-4">Всего сообщений: {wishes.length}</p>

        <div className="space-y-3">
          {wishes.length === 0 && (
            <p className="text-gray-500 text-center py-10">Пока пусто.</p>
          )}
          {wishes.map((wish) => (
            <div
              key={wish.id}
              className={`bg-gray-800 rounded-xl p-5 border ${
                wish.is_approved ? 'border-gray-700' : 'border-yellow-500/50'
              }`}
            >
              <p className="text-white text-lg mb-2">{wish.content}</p>

              {wish.admin_reply && (
                <div className="mb-3 pl-3 border-l-2 border-blue-500/40">
                  <div className="text-[10px] text-blue-400 uppercase tracking-wider mb-1">
                    Твой ответ
                  </div>
                  <p className="text-gray-300 text-sm">{wish.admin_reply}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-3 items-center text-sm text-gray-400 mb-3">
                <span>🕐 {new Date(wish.created_at).toLocaleString('ru-RU')}</span>
                <span>❤️ {wish.likes}</span>
                <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                  🆔 {wish.author_id}
                </span>
                {!wish.is_approved && (
                  <span className="text-yellow-400">⚠️ Скрыто</span>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-gray-700">
                <textarea
                  placeholder="Ответить анонимно (видно всем)..."
                  value={replyTexts[wish.id] ?? wish.admin_reply ?? ''}
                  onChange={(e) =>
                    setReplyTexts((prev) => ({ ...prev, [wish.id]: e.target.value }))
                  }
                  rows={2}
                  className="w-full p-2 rounded-lg bg-gray-700 text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                />
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => saveReply(wish.id)}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    💬 Сохранить ответ
                  </button>
                  <button
                    onClick={() => toggleApprove(wish.id, wish.is_approved)}
                    className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
                  >
                    {wish.is_approved ? '🙈 Скрыть' : '👁️ Показать'}
                  </button>
                  <button
                    onClick={() => deleteWish(wish.id)}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                  >
                    🗑️ Удалить
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}