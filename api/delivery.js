// api/delivery.js
// Unified endpoint voor het abonnements-mechanisme:
//   POST { action: "create",  customer_id, pet_id, recommendation } → eerste levering plannen
//   POST { action: "confirm", reminder_id }  → volgende levering aanmaken, reminder afsluiten
//   POST { action: "skip",    reminder_id, weeks? } → levering overslaan, reminder verplaatsen
//   POST { action: "cancel",  reminder_id } → abonnement op dit item stoppen
//
// Wordt aangeroepen door:
// - Snuf-frontend als advies compleet is (create)
// - De bevestig-links in reminder-emails (confirm/skip/cancel)

const SB = () => process.env.SUPABASE_URL;
const KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const headers = () => ({
  apikey: KEY(),
  Authorization: `Bearer ${KEY()}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
});

// Eerstvolgende zaterdag (inclusief vandaag als het zaterdag is en voor 10:00)
function nextSaturday(fromDate = new Date()) {
  const d = new Date(fromDate);
  const day = d.getDay(); // 0=zo, 6=za
  const addDays = day === 6 ? 0 : (6 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + addDays);
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Kies de zak die het dichtst bij 30 dagen voorraad zit
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

// ─── ACTION: CREATE ──────────────────────────────────────────────────────────
async function createDelivery({ customer_id, pet_id, recommendation }) {
  if (!customer_id || !recommendation) throw new Error("customer_id + recommendation vereist");

  // Verzamel alle producten uit de recommendation (P1 + P2 + EX)
  const handles = [recommendation.P1_HANDLE, recommendation.P2_HANDLE, recommendation.EX_HANDLE]
    .filter(h => h && h !== "GEEN");
  if (!handles.length) throw new Error("Geen producten in recommendation");

  const products = await sb(
    `products?shopify_handle=in.(${handles.map(encodeURIComponent).join(",")})&select=*`
  );
  if (!products.length) throw new Error("Geen producten gevonden voor deze handles");

  const scheduledFor = nextSaturday();

  // 1. Delivery aanmaken
  const [delivery] = await sb("deliveries", {
    method: "POST",
    body: JSON.stringify({
      customer_id,
      scheduled_for: scheduledFor,
      status: "scheduled",
      notes: `Auto-gegenereerd uit Snuf-advies voor ${recommendation.NAAM || "dier"}`,
    }),
  });

  const items = [];
  const reminders = [];

  // 2. Voor elk aanbevolen product een delivery_item + reminder
  const productMap = { P1: recommendation.P1_HANDLE, P2: recommendation.P2_HANDLE, EX: recommendation.EX_HANDLE };
  const doseMap = { P1: recommendation.P1_DOSIS, P2: recommendation.P2_DOSIS, EX: 0 };
  const nameMap = { P1: recommendation.P1_NAME, P2: recommendation.P2_NAME, EX: recommendation.EX_NAME };

  for (const key of ["P1", "P2", "EX"]) {
    const handle = productMap[key];
    if (!handle || handle === "GEEN") continue;
    const product = products.find(p => p.shopify_handle === handle);
    if (!product) continue;

    const dailyDoseG = Number(doseMap[key]) || 0;
    const bagSizeG = pickBagSize(product, dailyDoseG) || 0;
    const daysSupply = dailyDoseG > 0 && bagSizeG > 0 
      ? Math.floor(bagSizeG / dailyDoseG)
      : (product.category === "kattenbak" ? (product.litter_days || 30) : 30);

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

    // Reminder: 3 dagen voor het op is, vraag om bevestiging voor volgende levering
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
        product_name: nameMap[key] || product.name,
        channel: "email",
        status: "pending",
        subject: `${nameMap[key] || product.name} is bijna op — bevestig volgende levering`,
      }),
    });
    reminders.push(reminder);
  }

  // 3. Markeer snuf_session als verwerkt (als die meegegeven is)
  if (recommendation.session_id) {
    await sb(`snuf_sessions?id=eq.${recommendation.session_id}`, {
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

  // Nieuwe levering aanmaken voor dezelfde klant
  const [newDelivery] = await sb("deliveries", {
    method: "POST",
    body: JSON.stringify({
      customer_id: reminder.customer_id,
      scheduled_for: scheduledFor,
      status: "scheduled",
      notes: `Abonnement-herlevering — bevestigd via reminder ${reminder_id}`,
    }),
  });

  // Zelfde product, zelfde zak
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

  // Nieuwe reminder plannen voor het volgende op-moment
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

  // Oude reminder afsluiten
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
