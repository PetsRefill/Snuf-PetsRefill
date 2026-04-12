// api/request.js — Sla productaanvraag op in Supabase
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return res.status(500).json({ error: "Supabase niet geconfigureerd" });

  const { request_text, pet_name, customer_id, pet_id } = req.body;
  if (!request_text) return res.status(400).json({ error: "request_text vereist" });

  try {
    await fetch(`${url}/rest/v1/product_requests`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ request_text, pet_name, customer_id: customer_id || null, pet_id: pet_id || null }),
    });
    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
