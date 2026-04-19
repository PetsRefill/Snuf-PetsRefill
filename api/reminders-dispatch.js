// api/reminders-dispatch.js
// Wordt dagelijks aangeroepen door Vercel Cron (zie vercel.json).
// Pakt alle reminders met remind_at <= vandaag en status=pending, stuurt de email,
// en markeert ze als 'sent'. Als klant auto_confirm=true heeft, wordt meteen confirmed.
//
// Email via Resend (resend.com) — stel RESEND_API_KEY + FROM_EMAIL env vars in.

const SB = () => process.env.SUPABASE_URL;
const KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const FROM = () => process.env.FROM_EMAIL || "snuf@petsrefillwestland.nl";
const SITE = () => process.env.SITE_URL || "https://petsrefillwestland.nl";

const sbHeaders = () => ({
  apikey: KEY(), Authorization: `Bearer ${KEY()}`,
  "Content-Type": "application/json", Prefer: "return=representation",
});

async function sb(path, opts = {}) {
  const r = await fetch(`${SB()}/rest/v1/${path}`, { ...opts, headers: sbHeaders() });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  return r.status === 204 ? null : r.json();
}

// ─── EMAIL TEMPLATE ──────────────────────────────────────────────────────────
function buildEmailHtml({ customer_name, pet_name, product_name, runs_out_at, reminder_id }) {
  const confirmUrl = `${SITE()}/api/reminder-action?id=${reminder_id}&action=confirm`;
  const skipUrl    = `${SITE()}/api/reminder-action?id=${reminder_id}&action=skip`;
  const cancelUrl  = `${SITE()}/api/reminder-action?id=${reminder_id}&action=cancel`;

  const runsOutNL = new Date(runs_out_at).toLocaleDateString("nl-NL", {
    weekday: "long", day: "numeric", month: "long",
  });

  return `<!DOCTYPE html><html><body style="margin:0;background:#F8F4EE;font-family:Georgia,serif;color:#1B3A2E;">
<div style="max-width:560px;margin:0 auto;padding:32px 20px;">
  <div style="background:#2D6A4F;color:#fff;padding:16px 20px;border-radius:12px 12px 0 0;display:flex;align-items:center;gap:10px;">
    <span style="font-size:24px;">🐾</span>
    <div>
      <div style="font-weight:700;font-size:18px;">PetsRefill Westland</div>
      <div style="font-size:12px;color:#B7E4C7;">Bericht van Snuf</div>
    </div>
  </div>
  <div style="background:#fff;padding:28px 22px;border-radius:0 0 12px 12px;">
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;">Hoi ${customer_name || "daar"},</h1>
    <p style="font-size:15px;line-height:1.55;margin:0 0 14px;">
      De <strong>${product_name}</strong> van ${pet_name || "je dier"} is rond 
      <strong>${runsOutNL}</strong> op. Zullen we een nieuwe zak klaarzetten voor 
      de eerstvolgende zaterdagbezorging?
    </p>
    <div style="margin:28px 0;text-align:center;">
      <a href="${confirmUrl}" style="display:inline-block;background:#2D6A4F;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px;">
        ✓ Ja, graag leveren
      </a>
    </div>
    <div style="text-align:center;margin:14px 0;font-size:13px;color:#6b7568;">
      <a href="${skipUrl}" style="color:#6b7568;margin:0 10px;">Sla 2 weken over</a> · 
      <a href="${cancelUrl}" style="color:#6b7568;margin:0 10px;">Stop abonnement</a>
    </div>
    <hr style="border:none;border-top:1px solid #EDE9E2;margin:24px 0;">
    <p style="font-size:13px;color:#6b7568;line-height:1.5;margin:0;">
      Bestel vóór donderdag 12:00 voor zaterdagbezorging in Westland. 
      Vragen? Stel ze aan Snuf op petsrefillwestland.nl.
    </p>
  </div>
</div></body></html>`;
}

// ─── EMAIL VERZENDEN VIA RESEND ──────────────────────────────────────────────
async function sendEmail({ to, subject, html }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("RESEND_API_KEY niet gezet — email niet verzonden (alleen loggen)");
    return { skipped: true };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: `Snuf <${FROM()}>`, to, subject, html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  return res.json();
}

// ─── HANDLER ─────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // Cron security: Vercel voegt een secret toe, controleer die
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const pending = await sb(`upcoming_reminders?select=*`);
    let sent = 0, confirmed = 0, skipped = 0, failed = 0;

    for (const r of pending) {
      try {
        if (r.auto_confirm) {
          // Auto-confirm klanten: direct via confirm-action
          await fetch(`${SITE()}/api/delivery`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "confirm", reminder_id: r.reminder_id }),
          });
          confirmed++;
          continue;
        }

        if (r.channel === "email" && r.customer_email) {
          await sendEmail({
            to: r.customer_email,
            subject: r.subject || `${r.product_name} is bijna op`,
            html: buildEmailHtml({
              customer_name: r.customer_name,
              pet_name: r.pet_name,
              product_name: r.product_name,
              runs_out_at: r.runs_out_at,
              reminder_id: r.reminder_id,
            }),
          });
          await sb(`reminders?id=eq.${r.reminder_id}`, {
            method: "PATCH",
            body: JSON.stringify({ status: "sent", sent_at: new Date().toISOString() }),
          });
          sent++;
        } else {
          // SMS-kanaal is nog niet gewired (CM.com komt later) — skip voor nu
          skipped++;
        }
      } catch (e) {
        console.error(`Reminder ${r.reminder_id} mislukt:`, e.message);
        failed++;
      }
    }

    return res.status(200).json({ 
      success: true, 
      processed: pending.length, 
      sent, confirmed, skipped, failed,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("dispatch error:", e);
    return res.status(500).json({ error: e.message });
  }
}
