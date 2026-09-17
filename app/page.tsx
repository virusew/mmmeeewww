'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const TAGS = [
  { id: 'study', label: 'Учёба', emoji: '📚' },
  { id: 'party', label: 'Тусовки', emoji: '🎉' },
  { id: 'love', label: 'Любовь', emoji: '❤️' },
  { id: 'complaint', label: 'Жалоба', emoji: '😤' },
  { id: 'idea', label: 'Идея', emoji: '💡' },
  { id: 'other', label: 'Другое', emoji: '💬' },
];

const AVATARS = ['🎭', '🦊', '🐼', '🐸', '🦉', '🐺', '🦁', '🐯', '🐨', '🦄', '👻', '👽'];
const REACTIONS = ['🔥', '😂', '😢', '👍', '❤️'];

const RULES_TEXT = `
1. Не матерись и не оскорбляй других.
2. Не спамь и не пиши одно и то же.
3. Не делись личными данными — своими или чужими.
4. Уважай чужое мнение, даже если не согласен.
5. За нарушение — мут или бан.

Заходишь сюда — значит согласен с правилами.
`;

export default function Home() {
  const [wishes, setWishes] = useState<any[]>([]);
  const [reactions, setReactions] = useState<Record<string, any[]>>({});
  const [text, setText] = useState('');
  const [tag, setTag] = useState<string>('other');
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [restriction, setRestriction] = useState<{ type: 'ban' | 'mute'; reason: string; until: string | null } | null>(null);
  const [avatar, setAvatar] = useState('🎭');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ============= ЗАГРУЗКА =============
  async function loadWishes() {
    const { data, error } = await supabase
      .from('public_wishes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) { console.error('Ошибка загрузки:', error); return; }
    setWishes(data || []);
  }

  async function loadReactions() {
    const { data, error } = await supabase.from('reactions').select('*');
    if (error) { console.error('Ошибка реакций:', error); return; }
    const grouped: Record<string, any[]> = {};
    (data || []).forEach((r) => {
      if (!grouped[r.wish_id]) grouped[r.wish_id] = [];
      grouped[r.wish_id].push(r);
    });
    setReactions(grouped);
  }

  async function checkRestriction(uid: string) {
    const { data, error } = await supabase
      .from('bans')
      .select('*')
      .eq('user_id', uid)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(5);
    if (error) return;

    if (data && data.length > 0) {
      const activeBan = data.find((b) => (b.type === 'ban' || !b.type) && (!b.banned_until || new Date(b.banned_until) > new Date()));
      const activeMute = data.find((b) => b.type === 'mute' && (!b.banned_until || new Date(b.banned_until) > new Date()));
      if (activeBan) setRestriction({ type: 'ban', reason: activeBan.reason, until: activeBan.banned_until });
      else if (activeMute) setRestriction({ type: 'mute', reason: activeMute.reason, until: activeMute.banned_until });
      else setRestriction(null);
    } else setRestriction(null);
  }

  // ============= ПРОВЕРКА ТОКСИЧНОСТИ =============
  async function checkToxicity(content: string): Promise<{ ok: boolean; reason?: string }> {
    try {
      const res = await fetch('/api/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content }),
      });
      if (!res.ok) return { ok: true };
      const data = await res.json();
      return data;
    } catch (e) {
      console.error('Ошибка проверки токсичности:', e);
      return { ok: true };
    }
  }

  // ============= ПРОФИЛЬ =============
  function loadLocalProfile() {
    if (typeof window === 'undefined') return;
    const savedAvatar = localStorage.getItem('user_avatar');
    const savedDraft = localStorage.getItem('wish_draft');
    const savedTag = localStorage.getItem('wish_tag');
    if (savedAvatar) setAvatar(savedAvatar);
    if (savedDraft) setText(savedDraft);
    if (savedTag) setTag(savedTag);
  }

  function saveAvatar(a: string) {
    setAvatar(a);
    setShowAvatarPicker(false);
    if (typeof window !== 'undefined') localStorage.setItem('user_avatar', a);
  }

  function saveDraft(value: string) {
    setText(value);
    if (typeof window !== 'undefined') localStorage.setItem('wish_draft', value);
  }

  function saveTag(value: string) {
    setTag(value);
    if (typeof window !== 'undefined') localStorage.setItem('wish_tag', value);
  }

  // ============= ШАРИНГ =============
  function shareTo(platform: 'telegram' | 'whatsapp' | 'copy') {
    const url = typeof window !== 'undefined' ? window.location.origin : '';
    const shareText = 'Заходи на анонимную доску сообщений 🎓';
    if (platform === 'telegram') {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`, '_blank');
    } else if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + url)}`, '_blank');
    } else {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  // ============= ОТПРАВКА =============
  async function sendWish() {
    if (!text.trim() || text.length > 500 || cooldown > 0 || restriction) return;
    setLoading(true);
    setMessage(null);

    // ПРОВЕРКА ТОКСИЧНОСТИ
    const toxicity = await checkToxicity(text.trim());
    if (!toxicity.ok) {
      setMessage({ type: 'error', text: toxicity.reason || 'Сообщение заблокировано' });
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    let authorId = user?.id;

    if (!authorId) {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) {
        setMessage({ type: 'error', text: 'Ошибка входа. Попробуй ещё раз.' });
        setLoading(false);
        return;
      }
      authorId = data.user?.id;
    }

    if (!authorId) {
      setMessage({ type: 'error', text: 'Ошибка авторизации. Обнови страницу.' });
      setLoading(false);
      return;
    }

    await checkRestriction(authorId);

    const { error } = await supabase.from('wishes').insert({
      content: text.trim(),
      author_id: authorId,
      tag: tag,
      avatar: avatar,
      quote_id: quote?.id || null,
    });

    if (error) {
      if (error.message.includes('забанены') || error.message.includes('муте')) {
        setMessage({ type: 'error', text: error.message });
        await checkRestriction(authorId);
      } else if (error.message.includes('Слишком часто')) {
        setMessage({ type: 'error', text: 'Слишком часто! Подожди минуту.' });
      } else {
        setMessage({ type: 'error', text: 'Не получилось отправить. Попробуй ещё раз.' });
      }
    } else {
      setText('');
      setQuote(null);
      if (typeof window !== 'undefined') localStorage.removeItem('wish_draft');
      setMessage({ type: 'success', text: 'Отправлено анонимно ✨' });
      setCooldown(60);
      const interval = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) { clearInterval(interval); return 0; }
          return prev - 1;
        });
      }, 1000);
      setTimeout(() => setMessage(null), 3000);
    }
    setLoading(false);
  }

  // ============= РЕАКЦИИ =============
  async function toggleReaction(wishId: string, emoji: string) {
    if (!userId) return;
    const list = reactions[wishId] || [];
    const existing = list.find((r) => r.user_id === userId && r.emoji === emoji);

    if (existing) {
      await supabase.from('reactions').delete().eq('id', existing.id);
    } else {
      await supabase.from('reactions').insert({ wish_id: wishId, user_id: userId, emoji });
    }
  }

  // ============= useEffect =============
  useEffect(() => {
    loadWishes();
    loadReactions();
    loadLocalProfile();

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      let uid = user?.id;
      if (!uid) {
        const { data } = await supabase.auth.signInAnonymously();
        uid = data.user?.id;
      }
      if (uid) { setUserId(uid); await checkRestriction(uid); }
    })();

    const channel = supabase
      .channel('home-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wishes' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const n = payload.new as any;
          if (n.is_approved) {
            setWishes((prev) => prev.some((w) => w.id === n.id) ? prev : [n, ...prev]);
            setNewIds((prev) => new Set(prev).add(n.id));
            setTimeout(() => {
              setNewIds((prev) => { const c = new Set(prev); c.delete(n.id); return c; });
            }, 5000);
          }
        } else if (payload.eventType === 'UPDATE') {
          const u = payload.new as any;
          setWishes((prev) => prev.map((w) => w.id === u.id ? { ...w, ...u } : w));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, () => {
        loadReactions();
      })
      .subscribe();

    const handleMouseMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [userId]);

  const cooldownProgress = cooldown > 0 ? ((60 - cooldown) / 60) * 100 : 0;
  const restrictionUntilText = restriction?.until ? new Date(restriction.until).toLocaleString('ru-RU') : 'навсегда';

  return (
    <main ref={containerRef} className="min-h-screen bg-gradient-to-br from-neutral-900 via-black to-neutral-800 relative overflow-hidden">
      <div className="pointer-events-none fixed w-[700px] h-[700px] rounded-full" style={{ left: mousePos.x - 350, top: mousePos.y - 350, background: 'radial-gradient(circle, rgba(255,60,60,0.07) 0%, rgba(255,60,60,0.02) 40%, transparent 70%)', filter: 'blur(50px)' }} />
      <div className="pointer-events-none fixed w-[300px] h-[300px] rounded-full" style={{ left: mousePos.x - 150, top: mousePos.y - 150, background: 'radial-gradient(circle, rgba(255,80,80,0.10) 0%, transparent 60%)', filter: 'blur(40px)' }} />

      {/* Модалка правил */}
      {showRules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm" onClick={() => setShowRules(false)}>
          <div className="bg-neutral-900 rounded-2xl border border-neutral-700 max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl text-neutral-100 font-light">📜 Правила</h2>
              <button onClick={() => setShowRules(false)} className="text-neutral-500 hover:text-neutral-300 text-2xl">×</button>
            </div>
            <pre className="text-neutral-300 text-sm whitespace-pre-wrap font-light leading-relaxed">{RULES_TEXT}</pre>
            <button onClick={() => setShowRules(false)} className="mt-6 w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition">Понятно</button>
          </div>
        </div>
      )}

      {/* Модалка выбора аватара */}
      {showAvatarPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm" onClick={() => setShowAvatarPicker(false)}>
          <div className="bg-neutral-900 rounded-2xl border border-neutral-700 max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl text-neutral-100 font-light mb-4">Выбери аватар</h2>
            <div className="grid grid-cols-4 gap-3">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  onClick={() => saveAvatar(a)}
                  className={`text-3xl py-3 rounded-xl border transition-all duration-200 ${avatar === a ? 'border-red-500/60 bg-red-500/10' : 'border-neutral-800 hover:border-red-500/40'}`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-light text-neutral-100 tracking-tight mb-4">Анонимные сообщения</h1>
          <div className="flex justify-center gap-2 flex-wrap">
            <button onClick={() => setShowRules(true)} className="px-3 py-1.5 text-xs text-neutral-400 border border-neutral-800 rounded-lg hover:border-red-500/40 hover:text-red-400 transition-all duration-300">Правила</button>
            <button onClick={() => setShowAvatarPicker(true)} className="px-3 py-1.5 text-xs text-neutral-400 border border-neutral-800 rounded-lg hover:border-red-500/40 hover:text-red-400 transition-all duration-300">
              Аватар {avatar}
            </button>
            <button onClick={() => shareTo('telegram')} className="px-3 py-1.5 text-xs text-neutral-400 border border-neutral-800 rounded-lg hover:border-red-500/40 hover:text-red-400 transition-all duration-300">Telegram</button>
            <button onClick={() => shareTo('whatsapp')} className="px-3 py-1.5 text-xs text-neutral-400 border border-neutral-800 rounded-lg hover:border-red-500/40 hover:text-red-400 transition-all duration-300">WhatsApp</button>
            <button onClick={() => shareTo('copy')} className="px-3 py-1.5 text-xs text-neutral-400 border border-neutral-800 rounded-lg hover:border-red-500/40 hover:text-red-400 transition-all duration-300">
              {copied ? 'Скопировано ✓' : 'Ссылка'}
            </button>
          </div>
        </div>

        {restriction && (
          <div className={`mb-6 backdrop-blur-sm rounded-2xl border p-6 text-center ${restriction.type === 'ban' ? 'bg-red-950/40 border-red-500/40' : 'bg-orange-950/30 border-orange-500/40'}`}>
            <div className="text-3xl mb-2">{restriction.type === 'ban' ? '🚫' : '🔇'}</div>
            <div className={`font-medium mb-1 ${restriction.type === 'ban' ? 'text-red-300' : 'text-orange-300'}`}>
              {restriction.type === 'ban' ? 'Вы забанены' : 'Вы в муте'}
            </div>
            <div className={`text-sm mb-3 ${restriction.type === 'ban' ? 'text-red-400/80' : 'text-orange-400/80'}`}>{restriction.reason}</div>
            <div className="text-neutral-400 text-xs">
              Разблокировка: <span className={restriction.type === 'ban' ? 'text-red-400 font-medium' : 'text-orange-400 font-medium'}>{restrictionUntilText}</span>
            </div>
          </div>
        )}

        {!restriction && (
          <>
            {quote && (
              <div className="mb-2 bg-neutral-900/60 backdrop-blur-sm rounded-xl border border-red-500/30 p-3 flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-red-400 uppercase tracking-wider mb-1">Ответ на сообщение</div>
                  <div className="text-neutral-400 text-sm truncate">
                    {quote.avatar} {quote.content}
                  </div>
                </div>
                <button onClick={() => setQuote(null)} className="text-neutral-500 hover:text-neutral-300 text-xl leading-none">×</button>
              </div>
            )}

            <div className={`bg-neutral-900/70 backdrop-blur-sm rounded-2xl border transition-all duration-500 ease-out mb-4 ${focused ? 'border-red-500/40 shadow-lg shadow-red-500/10 scale-[1.01]' : 'border-neutral-800'}`}>
              <textarea
                value={text}
                onChange={(e) => saveDraft(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Что ты хочешь сказать?"
                maxLength={500}
                rows={4}
                disabled={cooldown > 0}
                className="w-full p-5 text-neutral-100 placeholder-neutral-500 resize-none focus:outline-none bg-transparent rounded-t-2xl transition-colors duration-300 disabled:opacity-50"
              />

              <div className="px-5 pb-3 flex gap-2 flex-wrap">
                {TAGS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => saveTag(t.id)}
                    className={`px-3 py-1 text-xs rounded-full border transition-all duration-200 ${tag === t.id ? 'border-red-500/60 bg-red-500/10 text-red-400' : 'border-neutral-800 text-neutral-500 hover:border-red-500/30 hover:text-neutral-300'}`}
                  >
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>

              <div className="flex justify-between items-center px-5 py-3 border-t border-neutral-800">
                <span className={`text-xs font-light transition-colors duration-300 ${text.length > 450 ? 'text-orange-400' : 'text-neutral-500'}`}>
                  {text.length}/500
                </span>
                <button
                  onClick={sendWish}
                  disabled={loading || !text.trim() || cooldown > 0}
                  className="px-5 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 ease-out"
                >
                  {loading ? 'Проверка...' : cooldown > 0 ? 'Заблокировано' : 'Отправить'}
                </button>
              </div>
            </div>
          </>
        )}

        {cooldown > 0 && !restriction && (
          <div className="mb-6 bg-neutral-900/60 backdrop-blur-sm rounded-xl border border-red-500/20 p-4 overflow-hidden" style={{ animation: 'fadeInUp 0.4s ease-out' }}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-neutral-400 font-light">Следующее сообщение через</span>
              <span className="text-sm text-red-400 font-medium tabular-nums">{cooldown} сек</span>
            </div>
            <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full transition-all duration-1000 ease-linear" style={{ width: `${cooldownProgress}%` }} />
            </div>
          </div>
        )}

        {message && cooldown === 0 && !restriction && (
          <div className={`mb-6 text-center text-sm font-light py-3 px-4 rounded-xl border transition-all duration-300 ${message.type === 'success' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' : 'text-red-400 border-red-500/20 bg-red-500/5'}`} style={{ animation: 'fadeInUp 0.4s ease-out' }}>
            {message.text}
          </div>
        )}

        <div className="space-y-3 mt-8">
          {wishes.length === 0 && <p className="text-center text-neutral-600 text-sm py-12 font-light">Пока ничего нет.</p>}
          {wishes.map((wish, index) => {
            const isNew = newIds.has(wish.id);
            const wishReactions = reactions[wish.id] || [];
            const grouped: Record<string, { count: number; mine: boolean }> = {};
            wishReactions.forEach((r) => {
              if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, mine: false };
              grouped[r.emoji].count++;
              if (r.user_id === userId) grouped[r.emoji].mine = true;
            });
            const wishTag = TAGS.find((t) => t.id === wish.tag);

            return (
              <div
                key={wish.id}
                className={`backdrop-blur-sm rounded-xl border p-5 transition-all duration-500 ease-out ${isNew ? 'bg-red-500/5 border-red-500/40 shadow-lg shadow-red-500/10' : 'bg-neutral-900/60 border-neutral-800 hover:border-red-500/30 hover:bg-neutral-900/80'}`}
                style={{ animation: `fadeInUp 0.5s ease-out ${isNew ? 0 : index * 0.05}s both` }}
              >
                {isNew && (
                  <span className="inline-block text-[10px] text-red-400 border border-red-500/30 bg-red-500/10 px-2 py-0.5 rounded-full mb-2 uppercase tracking-wider">Новое</span>
                )}

                {wish.quote_content && (
                  <div className="mb-3 pl-3 border-l-2 border-neutral-600">
                    <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">В ответ на</div>
                    <p className="text-neutral-400 text-sm line-clamp-2">
                      {wish.quote_avatar || '🎭'} {wish.quote_content}
                    </p>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <div className="text-2xl">{wish.avatar || '🎭'}</div>
                  <div className="flex-1">
                    <p className="text-neutral-200 leading-relaxed">{wish.content}</p>

                    {wish.admin_reply && (
                      <div className="mt-3 pl-4 border-l-2 border-red-500/40">
                        <div className="text-[10px] text-red-400 uppercase tracking-wider mb-1">Ответ администрации</div>
                        <p className="text-neutral-300 text-sm leading-relaxed">{wish.admin_reply}</p>
                      </div>
                    )}

                    <div className="flex gap-1.5 mt-3 flex-wrap">
                      {REACTIONS.map((emoji) => {
                        const data = grouped[emoji];
                        return (
                          <button
                            key={emoji}
                            onClick={() => toggleReaction(wish.id, emoji)}
                            className={`px-2 py-1 text-xs rounded-lg border transition-all duration-200 ${data?.mine ? 'border-red-500/60 bg-red-500/10 text-red-400' : 'border-neutral-800 text-neutral-500 hover:border-red-500/30 hover:text-neutral-300'}`}
                          >
                            {emoji} {data?.count || ''}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex justify-between items-center mt-3 text-xs text-neutral-500 font-light flex-wrap gap-2">
                      <div className="flex gap-2 items-center flex-wrap">
                        <span>{new Date(wish.created_at).toLocaleString('ru-RU')}</span>
                        {wishTag && <span className="px-2 py-0.5 border border-neutral-800 rounded-full text-[10px]">{wishTag.emoji} {wishTag.label}</span>}
                      </div>
                      <button onClick={() => setQuote({ id: wish.id, content: wish.content, avatar: wish.avatar })} className="hover:text-red-400 transition-colors">↩ Ответить</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </main>
  );
}