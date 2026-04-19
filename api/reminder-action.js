// api/reminder-action.js
// Opent als klant op een link in de reminder-email klikt.
//   GET /api/reminder-action?id=<reminder_id>&action=confirm|skip|cancel
// Toont een vriendelijke bevestigingspagina (HTML).

const SITE = () => process.env.SITE_URL || "https://petsrefillwestland.nl";

function page({ title, body, cta = "Terug naar petsrefillwestland.nl" }) {
  return `<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} · PetsRefill Westland</title>
<style>
  body{margin:0;background:#F8F4EE;font-family:Georgia,serif;color:#1B3A2E;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;}
  .card{background:#fff;max-width:440px;width:100%;border-radius:16px;padding:36px 28px;box-shadow:0 8px 24px rgba(0,0,0,.08);text-align:center;}
  .icon{width:64px;height:64px;border-radius:50%;background:#B7E4C7;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;font-size:32px;}
  h1{margin:0 0 12px;font-size:22px;}
  p{font-size:15px;line-height:1.55;color:#4a544a;margin:0 0 20px;}
  a{display:inline-block;padding:12px 22px;background:#2D6A4F;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;}
</style></head><body>
<div class="card">${body}<div style="margin-top:24px;"><a href="${SITE()}">${cta}</a></div></div>
</body></html>`;
}

export default async function handler(req, res) {
  const { id, action } = req.query || {};
  if (!id || !action) {
    return res.status(400).send(page({ title: "Ongeldige link", body: `<div class="icon">⚠️</div><h1>Ongeldige link</h1><p>Deze bevestigingslink is niet compleet.</p>` }));
  }

  try {
    // Roep de delivery API aan met de juiste actie
    const r = await fetch(`${SITE()}/api/delivery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reminder_id: id }),
    });
    const data = await r.json();

    res.setHeader("Content-Type", "text/html; charset=utf-8");

    if (!r.ok) {
      return res.status(r.status).send(page({
        title: "Er ging iets mis",
        body: `<div class="icon">⚠️</div><h1>Hmm, dat werkte niet</h1><p>${data.error || "Onbekende fout. Probeer vanaf de website of neem contact op."}</p>`,
      }));
    }

    if (action === "confirm") {
      return res.status(200).send(page({
        title: "Bevestigd",
        body: `<div class="icon">✓</div><h1>Top, geregeld!</h1><p>We leveren aanstaande zaterdag een nieuwe zak. Je ontvangt nog een bevestiging per email zodra we het klaarzetten.</p>`,
      }));
    }
    if (action === "skip") {
      return res.status(200).send(page({
        title: "Overgeslagen",
        body: `<div class="icon">⏭</div><h1>Overgeslagen</h1><p>We vragen het je over 2 weken opnieuw. Geen levering deze keer.</p>`,
      }));
    }
    if (action === "cancel") {
      return res.status(200).send(page({
        title: "Gestopt",
        body: `<div class="icon">🛑</div><h1>Abonnement gestopt</h1><p>We sturen geen herinneringen meer voor dit product. Je kunt altijd opnieuw beginnen via Snuf op onze website.</p>`,
      }));
    }

    return res.status(400).send(page({ title: "Ongeldige actie", body: `<h1>Onbekende actie</h1>` }));
  } catch (e) {
    return res.status(500).send(page({ title: "Fout", body: `<h1>Er ging iets mis</h1><p>${e.message}</p>` }));
  }
}
