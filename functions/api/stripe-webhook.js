// Cloudflare Pages Function: POST /api/stripe-webhook
// Recebe eventos Stripe (checkout.session.completed), valida assinatura,
// notifica Willians via Telegram, salva buyer no Brevo lista 15 (compradores).

const SIZE_LABELS = {
  s1: "21x30 cm",
  s2: "30x42 cm",
  s3: "42x60 cm",
  s4: "60x84 cm",
  s5: "84x118 cm"
};

// Mapeia price_id Stripe -> size key (LIVE, migrado 2026-05-18)
const PRICE_TO_SIZE = {
  "price_1TYbzqBlpIGHYVZ682HlEHDj": "s1",
  "price_1TYbzsBlpIGHYVZ6JNBvSfSg": "s2",
  "price_1TYbzuBlpIGHYVZ6pgIcVjHq": "s3",
  "price_1TYbzwBlpIGHYVZ6fGbat2Fd": "s4",
  "price_1TYbzyBlpIGHYVZ6eHp9ko8h": "s5"
};

// Stripe webhook signature verification (HMAC SHA-256)
async function verifyStripeSignature(payload, sigHeader, secret) {
  if (!sigHeader || !secret) return false;
  const parts = sigHeader.split(",").reduce((acc, p) => {
    const [k, v] = p.split("=");
    acc[k] = v;
    return acc;
  }, {});
  if (!parts.t || !parts.v1) return false;

  // Reject events older than 5 min (replay protection)
  const age = Math.floor(Date.now() / 1000) - parseInt(parts.t, 10);
  if (age > 300) return false;

  const signedPayload = `${parts.t}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  // Constant-time comparison
  if (hex.length !== parts.v1.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ parts.v1.charCodeAt(i);
  return diff === 0;
}

async function notifyTelegram(token, chatId, text) {
  if (!token || !chatId) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true
    })
  }).catch(() => {});
}

async function saveBuyerToBrevo(brevoKey, email, attributes) {
  if (!brevoKey || !email) return;
  await fetch("https://api.brevo.com/v3/contacts", {
    method: "POST",
    headers: { "accept": "application/json", "content-type": "application/json", "api-key": brevoKey },
    body: JSON.stringify({
      email,
      attributes,
      listIds: [15], // willgomes-compradores
      updateEnabled: true
    })
  }).catch(() => {});
}


async function sendBrevoTransactional(brevoKey, templateId, email, name, params) {
  if (!brevoKey || !templateId || !email) return;
  await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "accept": "application/json", "content-type": "application/json", "api-key": brevoKey },
    body: JSON.stringify({
      templateId,
      to: [{ email, name: name || undefined }],
      params: params || {}
    })
  }).catch(() => {});
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const payload = await request.text();
  const sig = request.headers.get("stripe-signature");
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;

  // Skip signature check if no secret configured (test mode até user setar)
  if (webhookSecret) {
    const valid = await verifyStripeSignature(payload, sig, webhookSecret);
    if (!valid) {
      return new Response(JSON.stringify({ error: "invalid_signature" }), { status: 400 });
    }
  }

  let event;
  try {
    event = JSON.parse(payload);
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400 });
  }

  // So processa checkout.session.completed
  if (event.type !== "checkout.session.completed") {
    return new Response(JSON.stringify({ ok: true, ignored: event.type }), { status: 200 });
  }

  const session = event.data.object;
  const email = session.customer_details?.email || session.customer_email || "buyer@unknown";
  const name = session.customer_details?.name || "";
  const phone = session.customer_details?.phone || "";
  const amount = (session.amount_total || 0) / 100; // BRL
  const currency = (session.currency || "brl").toUpperCase();
  const clientRef = session.client_reference_id || ""; // formato "obra-N_Title"
  const isTest = session.livemode === false;

  // Lookup tamanho via line_items (precisa expandir, Stripe nao envia por default)
  // Pra simplicidade no webhook: passo a partir do amount
  const amountToSize = { 600: "s1", 1200: "s2", 2400: "s3", 4500: "s4", 9000: "s5" };
  const sizeKey = amountToSize[amount] || "?";
  const sizeLabel = SIZE_LABELS[sizeKey] || `R$ ${amount}`;

  // Parse obra do client_reference_id
  const obraMatch = clientRef.match(/^obra-(\d+)_(.+)$/);
  const obraNum = obraMatch ? obraMatch[1] : "?";
  const obraTitle = obraMatch ? decodeURIComponent(obraMatch[2]) : clientRef;

  // 1. Notifica Telegram
  const tgText = [
    isTest ? "🧪 <b>TEST: Pagamento simulado</b>" : "🎉 <b>NOVA VENDA willgomes.art</b>",
    "",
    `📷 Obra: <b>${obraTitle}</b> (№ ${obraNum})`,
    `📐 Tamanho: <b>${sizeLabel}</b>`,
    `💰 Valor: <b>R$ ${amount.toLocaleString("pt-BR")}</b>`,
    "",
    `👤 ${name || "(sem nome)"}`,
    `📧 ${email}`,
    phone ? `📱 ${phone}` : "",
    "",
    `🔗 <a href="https://dashboard.stripe.com/${isTest ? "test/" : ""}payments/${session.payment_intent || ""}">Stripe dashboard</a>`
  ].filter(Boolean).join("\n");

  await notifyTelegram(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID, tgText);

  // 2. Salva buyer no Brevo
  if (!isTest || env.SAVE_TEST_BUYERS === "true") {
    await saveBuyerToBrevo(env.BREVO_API_KEY, email, {
      NOME: name,
      TELEFONE: phone,
      OBRA_NUMERO: obraNum,
      OBRA_TITULO: obraTitle,
      TAMANHO: sizeLabel,
      VALOR_BRL: amount,
      MOEDA: currency,
      ORIGEM: "willgomes.art",
      COMPRADO_EM: new Date().toISOString(),
      MODO: isTest ? "test" : "live"
    });

    // 3. Envia email de confirmação (template 31)
    if (!isTest || env.SEND_TEST_EMAILS === "true") {
      await sendBrevoTransactional(env.BREVO_API_KEY, 31, email, name, {
        NOME: name,
        OBRA_TITULO: obraTitle,
        OBRA_NUMERO: obraNum,
        TAMANHO: sizeLabel,
        VALOR_BRL: amount.toLocaleString("pt-BR")
      });
    }
  }

  return new Response(JSON.stringify({ ok: true, processed: event.type, obra: obraNum, size: sizeKey }), { status: 200 });
}
