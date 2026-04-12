// api/customer.js
// GET  ?phone=316...        → klantprofiel ophalen
// POST { customer, pet, session } → opslaan

const SB_HEADERS = () => ({
  apikey: process.env.SUPABASE_ANON_KEY,
  Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
});

const SB = () => process.env.SUPABASE_URL;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (!SB()) return res.status(500).json({ error: "Supabase niet geconfigureerd" });

  // ── GET: klant ophalen op telefoonnummer ──────────────────────────────────
  if (req.method === "GET") {
    const phone = req.query.phone?.replace(/\D/g,"");
    if (!phone) return res.status(400).json({ error: "phone vereist" });

    const cr = await fetch(
      `${SB()}/rest/v1/customers?phone=eq.${phone}&select=*,pets(*)`,
      { headers: SB_HEADERS() }
    );
    const customers = await cr.json();
    if (!customers.length) return res.status(404).json({ found: false });

    const customer = customers[0];

    // Haal laatste Snuf-sessie op per huisdier
    const petIds = customer.pets.map(p => p.id);
    let lastSessions = [];
    if (petIds.length) {
      const sr = await fetch(
        `${SB()}/rest/v1/snuf_sessions?pet_id=in.(${petIds.join(",")})&completed=eq.true&order=created_at.desc&limit=5`,
        { headers: SB_HEADERS() }
      );
      lastSessions = await sr.json();
    }

    return res.status(200).json({ found: true, customer, lastSessions });
  }

  // ── POST: klant + huisdier + sessie opslaan ───────────────────────────────
  if (req.method === "POST") {
    const { customerData, petData, sessionData } = req.body;

    // 1. Klant ophalen of aanmaken
    let customer;
    const phone = customerData.phone?.replace(/\D/g,"");
    const existing = await fetch(
      `${SB()}/rest/v1/customers?phone=eq.${phone}`,
      { headers: SB_HEADERS() }
    );
    const existingArr = await existing.json();

    if (existingArr.length) {
      customer = existingArr[0];
    } else {
      const cr = await fetch(`${SB()}/rest/v1/customers`, {
        method: "POST",
        headers: SB_HEADERS(),
        body: JSON.stringify({ ...customerData, phone }),
      });
      const arr = await cr.json();
      customer = arr[0];
    }

    // 2. Huisdier ophalen of aanmaken
    let pet = null;
    if (petData && customer) {
      const existingPet = await fetch(
        `${SB()}/rest/v1/pets?customer_id=eq.${customer.id}&name=ilike.${encodeURIComponent(petData.name)}`,
        { headers: SB_HEADERS() }
      );
      const existingPets = await existingPet.json();

      if (existingPets.length) {
        // Update bestaand huisdier
        const pr = await fetch(
          `${SB()}/rest/v1/pets?id=eq.${existingPets[0].id}`,
          { method: "PATCH", headers: SB_HEADERS(), body: JSON.stringify(petData) }
        );
        const arr = await pr.json();
        pet = arr[0] || existingPets[0];
      } else {
        const pr = await fetch(`${SB()}/rest/v1/pets`, {
          method: "POST",
          headers: SB_HEADERS(),
          body: JSON.stringify({ ...petData, customer_id: customer.id }),
        });
        const arr = await pr.json();
        pet = arr[0];
      }
    }

    // 3. Sessie opslaan
    if (sessionData && customer) {
      await fetch(`${SB()}/rest/v1/snuf_sessions`, {
        method: "POST",
        headers: SB_HEADERS(),
        body: JSON.stringify({
          ...sessionData,
          customer_id: customer.id,
          pet_id: pet?.id || null,
          completed: true,
        }),
      });
    }

    return res.status(200).json({ success: true, customer, pet });
  }

  return res.status(405).end();
}
