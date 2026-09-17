'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

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

  // Проверяем, вошёл ли уже
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        loadWishes();
      }
    });
  }, []);

  // Вход
  async function login() {
    setLoading(true);
    setError('');
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setUser(data.user);
    loadWishes();
    setLoading(false);
  }

  // Выход
  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setWishes([]);
  }

  // Загрузка всех желаний (включая author_id)
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
  }

  // Удалить желание
  async function deleteWish(id: string) {
    if (!confirm('Удалить это желание?')) return;
    const { error } = await supabase.from('wishes').delete().eq('id', id);
    if (error) {
      alert('Ошибка удаления: ' + error.message);
      return;
    }
    loadWishes();
  }

  // Скрыть/показать
  async function toggleApprove(id: string, current: boolean) {
    const { error } = await supabase
      .from('wishes')
      .update({ is_approved: !current })
      .eq('id', id);
    if (error) {
      alert('Ошибка: ' + error.message);
      return;
    }
    loadWishes();
  }

  // Если не вошёл — показываем форму входа
  if (!user) {
    return (
      <main className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
        <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md">
          <h1 className="text-3xl font-bold text-white mb-6 text-center">
            🔐 Админ-панель
          </h1>
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

  // Если вошёл — панель управления
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

        <p className="text-gray-400 mb-4">
          Всего желаний: {wishes.length}
        </p>

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
              <div className="flex gap-2">
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
          ))}
        </div>
      </div>
    </main>
  );
}