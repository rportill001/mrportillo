// Captura de correos — Péptidos Sin Caos (mrportillo.com)
// Patrón probado de Raíces 503 (/api/leads): recibe el correo, avisa por Telegram.
// Extra: si existe un binding KV llamado SUBSCRIBERS, persiste email+fecha+fuente
// (semilla de la tabla `users` de Fase 2). Sin el binding, igual funciona vía Telegram.

const ALLOWED_ORIGINS = new Set([
  'https://www.mrportillo.com',
  'https://mrportillo.com',
  'http://localhost:8799',
  'http://127.0.0.1:8799',
  'http://localhost:8788',
  'http://127.0.0.1:8788'
]);

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : 'https://mrportillo.com',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8'
  };
}

function clean(value, max = 300) {
  return String(value || '').replace(/[<>]/g, '').trim().slice(0, max);
}

function validEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) && value.length <= 254;
}

function formatMessage(sub, request) {
  const ip = request.headers.get('CF-Connecting-IP') || 'n/a';
  return [
    '📩 Nuevo correo — Péptidos Sin Caos',
    '',
    `Correo: ${clean(sub.email, 254)}`,
    `Fuente: ${clean(sub.source, 80) || '—'}`,
    `Página: ${clean(sub.page, 300) || '—'}`,
    `Referrer: ${clean(sub.referrer, 300) || '—'}`,
    `Fecha: ${clean(sub.submittedAt, 80) || '—'}`,
    `IP: ${ip}`
  ].join('\n');
}

async function sendTelegram(env, text) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    return { ok: false, skipped: true, reason: 'telegram_not_configured' };
  }
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, disable_web_page_preview: true })
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok && data.ok !== false, status: response.status, data };
}

async function persist(env, sub, request) {
  // Opcional: guarda el correo si hay un binding KV `SUBSCRIBERS`. Sin el binding, no hace nada.
  if (!env.SUBSCRIBERS || typeof env.SUBSCRIBERS.put !== 'function') return { skipped: true };
  try {
    const email = clean(sub.email, 254).toLowerCase();
    const record = {
      email,
      source: clean(sub.source, 80),
      page: clean(sub.page, 300),
      submittedAt: clean(sub.submittedAt, 80),
      ip: request.headers.get('CF-Connecting-IP') || 'n/a'
    };
    // Clave por correo => idempotente (un correo repetido no duplica).
    await env.SUBSCRIBERS.put(`sub:${email}`, JSON.stringify(record));
    return { ok: true };
  } catch (error) {
    console.warn('KV persist issue', error);
    return { ok: false };
  }
}

export async function onRequestOptions({ request }) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export async function onRequestPost({ request, env }) {
  const headers = corsHeaders(request);
  try {
    const contentType = request.headers.get('Content-Type') || '';
    if (!contentType.includes('application/json')) {
      return new Response(JSON.stringify({ ok: false, error: 'content_type_invalid' }), { status: 415, headers });
    }

    const sub = await request.json();
    if (!validEmail(sub.email)) {
      return new Response(JSON.stringify({ ok: false, error: 'invalid_email' }), { status: 400, headers });
    }

    // Intentar las dos vías de entrega: persistir en KV (si hay binding) y avisar por Telegram.
    const persisted = await persist(env, sub, request);
    const telegram = await sendTelegram(env, formatMessage(sub, request));

    // Si Telegram está configurado pero falló de verdad, es un error de entrega.
    if (!telegram.ok && telegram.reason !== 'telegram_not_configured') {
      console.warn('Telegram delivery issue', telegram);
      return new Response(JSON.stringify({ ok: false, error: 'delivery_failed' }), { status: 503, headers });
    }

    // Guardrail anti-pérdida: el correo solo se da por capturado si AL MENOS una vía lo recibió.
    // Si no hay ni Telegram ni KV configurados, devolvemos error en vez de fingir éxito.
    const delivered = telegram.ok || persisted.ok === true;
    if (!delivered) {
      console.error('Subscribe not delivered: ni Telegram ni KV configurados');
      return new Response(JSON.stringify({ ok: false, error: 'not_configured' }), { status: 503, headers });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  } catch (error) {
    console.error('Subscribe function error', error);
    return new Response(JSON.stringify({ ok: false, error: 'server_error' }), { status: 500, headers });
  }
}
