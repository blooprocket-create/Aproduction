export const ok = (data) => new Response(JSON.stringify({ ok: true, data }), { status: 200, headers: { 'content-type': 'application/json' } });
export const bad = (msg, code=400) => new Response(JSON.stringify({ ok: false, error: msg }), { status: code, headers: { 'content-type': 'application/json' } });
