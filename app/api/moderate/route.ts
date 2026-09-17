import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ ok: true });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.warn('OPENAI_API_KEY не настроен — пропускаем проверку');
      return NextResponse.json({ ok: true });
    }

    const res = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'omni-moderation-latest',
        input: text,
      }),
    });

    if (!res.ok) {
      console.error('OpenAI Moderation ошибка:', res.status);
      return NextResponse.json({ ok: true }); // не блокируем при сбое API
    }

    const data = await res.json();
    const result = data.results?.[0];

    if (!result) return NextResponse.json({ ok: true });

    const categories = result.categories || {};
    const scores = result.category_scores || {};

    // Порог для срабатывания (0.7 — достаточно строго)
    const THRESHOLD = 0.7;

    if (categories['hate'] && scores['hate'] > THRESHOLD) {
      return NextResponse.json({ ok: false, reason: 'Ненависть запрещена 🚫' });
    }
    if (categories['harassment'] && scores['harassment'] > THRESHOLD) {
      return NextResponse.json({ ok: false, reason: 'Оскорбления запрещены 🚫' });
    }
    if (categories['violence'] && scores['violence'] > THRESHOLD) {
      return NextResponse.json({ ok: false, reason: 'Угрозы запрещены 🚫' });
    }
    if (categories['sexual'] && scores['sexual'] > THRESHOLD) {
      return NextResponse.json({ ok: false, reason: 'Сексуальный контент запрещён 🚫' });
    }
    if (categories['self-harm'] && scores['self-harm'] > THRESHOLD) {
      return NextResponse.json({ ok: false, reason: 'Сообщение заблокировано 🛑' });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Ошибка проверки:', e);
    return NextResponse.json({ ok: true });
  }
}