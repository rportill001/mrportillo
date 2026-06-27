// Exportar la lista de correos capturados — Péptidos Sin Caos
// Protegido por token: GET /api/export?token=<EXPORT_TOKEN>  ->  descarga un CSV.
// Lee del binding KV `SUBSCRIBERS` (las claves `sub:<email>` que escribe subscribe.js).
// Sin EXPORT_TOKEN o sin KV configurados, niega el acceso (no expone correos).

function csvCell(value) {
  const s = String(value == null ? '' : value);
  // Escapar comillas y envolver si hay coma/comilla/salto de línea.
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || request.headers.get('X-Export-Token') || '';

  // Sin token configurado en el entorno => endpoint cerrado.
  if (!env.EXPORT_TOKEN || !timingSafeEqual(token, env.EXPORT_TOKEN)) {
    return new Response('No autorizado', { status: 401, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }

  if (!env.SUBSCRIBERS || typeof env.SUBSCRIBERS.list !== 'function') {
    return new Response('KV (SUBSCRIBERS) no está configurado.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }

  const rows = [['email', 'source', 'page', 'submittedAt', 'ip']];
  let cursor;
  do {
    const list = await env.SUBSCRIBERS.list({ prefix: 'sub:', cursor });
    for (const key of list.keys) {
      const raw = await env.SUBSCRIBERS.get(key.name);
      if (!raw) continue;
      let rec;
      try { rec = JSON.parse(raw); } catch (e) { rec = { email: key.name.replace(/^sub:/, '') }; }
      rows.push([rec.email, rec.source, rec.page, rec.submittedAt, rec.ip]);
    }
    cursor = list.list_complete ? null : list.cursor;
  } while (cursor);

  const csv = rows.map(r => r.map(csvCell).join(',')).join('\r\n');
  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="correos-mrportillo.csv"',
      'Cache-Control': 'no-store'
    }
  });
}
