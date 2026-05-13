// Cloudflare Pages Function: POST /api/subscribe
// Captura email e adiciona à lista Brevo correspondente.
// CORS: aceita só a origem willgomes.art (e localhost pra teste).
// Listas: 13 = livro-waitlist, 14 = newsletter.

const ALLOWED_ORIGINS = [
  "https://willgomes.art",
  "https://www.willgomes.art",
  "http://localhost:8788",
  "http://localhost:3000"
];

const LIST_IDS = {
  livro: 13,
  newsletter: 14
};

function cors(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json"
  };
}

export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: cors(context.request.headers.get("Origin")) });
}

export async function onRequestPost(context) {
  const headers = cors(context.request.headers.get("Origin"));

  let body;
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400, headers });
  }

  const email = (body.email || "").trim().toLowerCase();
  const list = body.list;

  // Validações
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: "invalid_email" }), { status: 400, headers });
  }
  if (!LIST_IDS[list]) {
    return new Response(JSON.stringify({ error: "invalid_list" }), { status: 400, headers });
  }

  // Honeypot anti-bot (campo escondido "website" que humanos não preenchem)
  if (body.website && body.website.length > 0) {
    // Finge sucesso pro bot
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  }

  const BREVO_KEY = context.env.BREVO_API_KEY;
  if (!BREVO_KEY) {
    return new Response(JSON.stringify({ error: "server_misconfigured" }), { status: 500, headers });
  }

  // Atributos opcionais (origem, idioma, etc)
  const attributes = {
    SOURCE: "willgomes.art",
    SOURCE_LIST: list,
    SUBSCRIBED_AT: new Date().toISOString()
  };
  if (body.lang) attributes.LANG = body.lang;

  const brevoResp = await fetch("https://api.brevo.com/v3/contacts", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "content-type": "application/json",
      "api-key": BREVO_KEY
    },
    body: JSON.stringify({
      email,
      attributes,
      listIds: [LIST_IDS[list]],
      updateEnabled: true
    })
  });

  if (brevoResp.status === 201 || brevoResp.status === 204) {
    return new Response(JSON.stringify({ ok: true, status: "created" }), { status: 200, headers });
  }
  if (brevoResp.status === 200) {
    return new Response(JSON.stringify({ ok: true, status: "updated" }), { status: 200, headers });
  }

  const errBody = await brevoResp.text();
  return new Response(JSON.stringify({ error: "brevo_failed", status: brevoResp.status, detail: errBody.slice(0, 200) }), { status: 502, headers });
}
