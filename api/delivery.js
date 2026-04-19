// api/delivery.js — v2
// Unified endpoint voor het abonnements-mechanisme:
//   POST { action: "create",  customer_id, pet_id, recommendation } → eerste levering plannen
//   POST { action: "confirm", reminder_id }  → volgende levering aanmaken, reminder afsluiten
//   POST { action: "skip",    reminder_id, weeks? } → levering overslaan
//   POST { action: "cancel",  reminder_id } → abonnement op dit item stoppen
//
// v2: accepteert zowel het lowercase format van App.jsx parseData (p1h, p1n, p1d, ...)
//     als het uppercase format (P1_HANDLE, P1_NAME, P1_DOSIS, ...).

const SB = () => process.env.SUPABASE_URL;
const KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const headers = () => ({
  apikey: KEY(),
  Authorization: `Bearer ${KEY()}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
});

function nextSaturday(fromDate = new Date()) {
  const d = new Date(fromDate);
  const day = d.getDay();
  const addDays = day === 6 ? 0 : (6 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + addDays);
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function pickBagSize(product, dailyDoseG) {
  if (!product.bag_sizes_g || !product.bag_sizes_g.length) return null;
  if (!dailyDoseG) return product.bag_sizes_g[0];
  const target = dailyDoseG * 30;
  return product.bag_sizes_g
    .map(g => ({ g, score: Math.abs(g - target) }))
    .sort((a, b) => a.score - b.score)[0].g;
}

async function sb(path, opts = {}) {
  const res = await fetch(`${SB()}/rest/v1/${path}`, { ...opts, headers: headers() });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

// Normaliseer beide recommendation-formats naar één interne structuur
function normalizeRecommendation(r) {
  if (!r) return null;
  return {
    petName: r.name || r.NAAM || null,
    sessionId: r.session_id || r.SESSION_ID || null,
    items: [
      {
        handle: r.p1h || r.P1_HANDLE,
        name: r.p1n || r.P1_NAME,
        dose: Number(r.p1d || r.P1_DOSIS) || 0,
        role: "primary",
      },
      {
        handle: r.p2h || r.P2_HANDLE,
        name: r.p2n || r.P2_NAME,
        dose: Number(r.p2d || r.P2_DOSIS) || 0,
        role: "alternative",
      },
      {
        handle: r.exh || r.EX_HANDLE,
        name: r.exn || r.EX_NAME,
        dose: 0,
        role: "extra",
      },
    ].filter(it => it.handle && it.handle !== "GEEN" && it.name && it.name !== "GEEN"),
  };
}

// ─── ACTION: CREATE ──────────────────────────────────────────────────────────
async function createDelivery({ customer_id, pet_id, recommendation }) {
  if (!customer_id || !recommendation) throw new Error("customer_id + recommendation vereist");

  const norm = normalizeRecommendation(recommendation);
  if (!norm || !norm.items.length) throw new Error("Geen producten in recommendation");

  const handles = norm.items.map(it => it.handle);
  const products = await sb(
    `products?shopify_handle=in.(${handles.map(encodeURIComponent).join(",")})&select=*`
  );
  if (!products.length) throw new Error(`Geen producten gevonden voor handles: ${handles.join(", ")}`);

  const scheduledFor = nextSaturday();

  const [delivery] = await sb("deliveries", {
    method: "POST",
    body: JSON.stringify({
      customer_id,
      scheduled_for: scheduledFor,
      status: "scheduled",
      notes: `Auto-gegenereerd uit Snuf-advies voor ${norm.petName || "dier"}`,
    }),
  });

  const items = [];
  const reminders = [];

  for (const it of norm.items) {
    const product = products.find(p => p.shopify_handle === it.handle);
    if (!product) continue;

    const dailyDoseG = it.dose;
    const isSnack  = product.category === "snack";
    const isLitter = product.category === "kattenbak" || product.unit === "L";
    const bagSizeG = pickBagSize(product, dailyDoseG) || 0;

    let daysSupply;
    if (isLitter) {
      daysSupply = product.litter_days || 30;
    } else if (isSnack || !dailyDoseG || !bagSizeG) {
      daysSupply = 30;
    } else {
      daysSupply = Math.floor(bagSizeG / dailyDoseG);
    }

    const [item] = await sb("delivery_items", {
      method: "POST",
      body: JSON.stringify({
        delivery_id: delivery.id,
        pet_id: pet_id || null,
        product_id: product.id,
        bag_size_g: bagSizeG,
        daily_dose_g: dailyDoseG || null,
        days_supply: daysSupply,
        quantity: 1,
      }),
    });
    items.push(item);

    const runsOutAt = addDays(scheduledFor, daysSupply);
    const remindAt = addDays(runsOutAt, -3);

    const [reminder] = await sb("reminders", {
      method: "POST",
      body: JSON.stringify({
        customer_id,
        pet_id: pet_id || null,
        delivery_item_id: item.id,
        remind_at: remindAt,
        runs_out_at: runsOutAt,
        product_name: it.name,
        channel: "email",
        status: "pending",
        subject: `${it.name} is bijna op — bevestig volgende levering`,
      }),
    });
    reminders.push(reminder);
  }

  if (norm.sessionId) {
    await sb(`snuf_sessions?id=eq.${norm.sessionId}`, {
      method: "PATCH",
      body: JSON.stringify({ processed: true, processed_delivery_id: delivery.id }),
    });
  }

  return { delivery, items, reminders };
}

// ─── ACTION: CONFIRM ─────────────────────────────────────────────────────────
async function confirmReminder({ reminder_id }) {
  if (!reminder_id) throw new Error("reminder_id vereist");

  const [reminder] = await sb(`reminders?id=eq.${reminder_id}&select=*,delivery_items(*)`);
  if (!reminder) throw new Error("Reminder niet gevonden");
  if (reminder.status !== "pending") {
    return { alreadyProcessed: true, reminder };
  }

  const item = reminder.delivery_items;
  const scheduledFor = nextSaturday(new Date(reminder.runs_out_at));

  const [newDelivery] = await sb("deliveries", {
    method: "POST",
    body: JSON.stringify({
      customer_id: reminder.customer_id,
      scheduled_for: scheduledFor,
      status: "scheduled",
      notes: `Abonnement-herlevering — bevestigd via reminder ${reminder_id}`,
    }),
  });

  const [newItem] = await sb("delivery_items", {
    method: "POST",
    body: JSON.stringify({
      delivery_id: newDelivery.id,
      pet_id: reminder.pet_id,
      product_id: item.product_id,
      bag_size_g: item.bag_size_g,
      daily_dose_g: item.daily_dose_g,
      days_supply: item.days_supply,
      quantity: item.quantity || 1,
    }),
  });

  const runsOutAt = addDays(scheduledFor, item.days_supply || 30);
  const remindAt = addDays(runsOutAt, -3);

  const [newReminder] = await sb("reminders", {
    method: "POST",
    body: JSON.stringify({
      customer_id: reminder.customer_id,
      pet_id: reminder.pet_id,
      delivery_item_id: newItem.id,
      remind_at: remindAt,
      runs_out_at: runsOutAt,
      product_name: reminder.product_name,
      channel: reminder.channel || "email",
      status: "pending",
      subject: `${reminder.product_name} is bijna op — bevestig volgende levering`,
    }),
  });

  await sb(`reminders?id=eq.${reminder_id}`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
      next_delivery_id: newDelivery.id,
    }),
  });

  return { delivery: newDelivery, item: newItem, reminder: newReminder };
}

// ─── ACTION: SKIP ────────────────────────────────────────────────────────────
async function skipReminder({ reminder_id, weeks = 2 }) {
  if (!reminder_id) throw new Error("reminder_id vereist");
  const [reminder] = await sb(`reminders?id=eq.${reminder_id}`);
  if (!reminder) throw new Error("Reminder niet gevonden");

  const newRemindAt = addDays(reminder.remind_at, weeks * 7);
  const newRunsOut = addDays(reminder.runs_out_at, weeks * 7);

  const [updated] = await sb(`reminders?id=eq.${reminder_id}`, {
    method: "PATCH",
    body: JSON.stringify({ remind_at: newRemindAt, runs_out_at: newRunsOut, status: "pending" }),
  });
  return { reminder: updated };
}

// ─── ACTION: CANCEL ──────────────────────────────────────────────────────────
async function cancelReminder({ reminder_id }) {
  if (!reminder_id) throw new Error("reminder_id vereist");
  await sb(`reminders?id=eq.${reminder_id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "cancelled", confirmed_at: new Date().toISOString() }),
  });
  return { cancelled: true };
}

// ─── HANDLER ─────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  if (!SB() || !KEY()) return res.status(500).json({ error: "Supabase niet geconfigureerd" });

  try {
    const { action, ...payload } = req.body || {};
    let result;
    switch (action) {
      case "create":  result = await createDelivery(payload); break;
      case "confirm": result = await confirmReminder(payload); break;
      case "skip":    result = await skipReminder(payload); break;
      case "cancel":  result = await cancelReminder(payload); break;
      default: return res.status(400).json({ error: "Onbekende action. Gebruik create/confirm/skip/cancel." });
    }
    return res.status(200).json({ success: true, ...result });
  } catch (e) {
    console.error("delivery error:", e);
    return res.status(500).json({ error: e.message });
  }
}
