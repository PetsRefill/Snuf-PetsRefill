// api/products.js — Haalt alle actieve producten op uit Supabase
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") return res.status(405).end();

  const url  = process.env.SUPABASE_URL;
  const key  = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return res.status(500).json({ error: "Supabase niet geconfigureerd" });

  try {
    const r = await fetch(
      `${url}/rest/v1/products?active=eq.true&order=category,name`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    const data = await r.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
