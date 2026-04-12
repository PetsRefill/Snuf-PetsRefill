// api/chat.js — Vercel Serverless Function
// De API-sleutel blijft veilig op de server en is nooit zichtbaar voor bezoekers.

export default async function handler(req, res) {
  // Alleen POST-verzoeken accepteren
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key niet geconfigureerd. Voeg ANTHROPIC_API_KEY toe in Vercel." });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: "Verbindingsfout met AI-service." });
  }
}
