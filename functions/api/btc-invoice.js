// Cloudflare Pages Function: POST /api/btc-invoice
// Cria invoice BTCPay Server e retorna URL do checkout.
// Recebe { worksId: "obra-24", size: "s1", price_brl: 600, work_title: "Diálogo" }
// Retorna { checkout_url: "https://pay.willgomes.art/i/abc..." }

const ALLOWED_ORIGINS = [
  "https://willgomes.art",
  "https://www.willgomes.art",
  "http://localhost:8788",
  "http://localhost:3000"
];

const BTCPAY_HOST = "https://pay.willgomes.art";

const SIZE_LABELS = {
  s1: "21x30 cm",
  s2: "30x42 cm",
  s3: "42x60 cm",
  s4: "60x84 cm",
  s5: "84x118 cm"
};

const SIZE_PRICES = {
  s1: 600,
  s2: 1200,
  s3: 2400,
  s4: 4500,
  s5: 9000
};

function cors(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };
}

export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: cors(context.request.headers.get("Origin")) });
}

export async function onRequestPost(context) {
  const headers = cors(context.request.headers.get("Origin"));

  const STORE_ID = context.env.BTCPAY_STORE_ID;
  const API_KEY = context.env.BTCPAY_API_KEY;

  if (!STORE_ID || !API_KEY) {
    return new Response(JSON.stringify({ error: "btcpay_not_configured", message: "Pagamento Bitcoin temporariamente indisponivel. Use cartao ou Pix." }), { status: 503, headers });
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400, headers });
  }

  const worksId = (body.worksId || "").trim();
  const size = body.size;
  const workTitle = (body.work_title || "").trim();

  if (!/^obra-\d+$/.test(worksId)) {
    return new Response(JSON.stringify({ error: "invalid_works_id" }), { status: 400, headers });
  }
  if (!SIZE_PRICES[size]) {
    return new Response(JSON.stringify({ error: "invalid_size" }), { status: 400, headers });
  }

  const amount = SIZE_PRICES[size];
  const sizeLabel = SIZE_LABELS[size];

  const invoicePayload = {
    amount: amount.toString(),
    currency: "BRL",
    metadata: {
      orderId: `${worksId}_${size}_${Date.now()}`,
      itemDesc: `Print fine art ${sizeLabel} · ${workTitle || worksId}`,
      worksId,
      size,
      workTitle
    },
    checkout: {
      speedPolicy: "MediumSpeed",
      defaultPaymentMethod: "BTC",
      expirationMinutes: 60,
      monitoringMinutes: 60,
      redirectURL: "https://willgomes.art/?btc_status=success",
      redirectAutomatically: true
    }
  };

  const resp = await fetch(`${BTCPAY_HOST}/api/v1/stores/${STORE_ID}/invoices`, {
    method: "POST",
    headers: {
      "Authorization": `token ${API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(invoicePayload)
  });

  if (!resp.ok) {
    const err = await resp.text();
    return new Response(JSON.stringify({ error: "btcpay_invoice_failed", status: resp.status, detail: err.slice(0, 300) }), { status: 502, headers });
  }

  const invoice = await resp.json();
  return new Response(JSON.stringify({
    checkout_url: invoice.checkoutLink,
    invoice_id: invoice.id,
    amount_brl: amount,
    expires_at: invoice.expirationTime
  }), { status: 200, headers });
}
