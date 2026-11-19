import "dotenv/config";
import express from "express";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "12mb" }));
app.use("/api/chat", rateLimit({
  windowMs: 60 * 1000,
  limit: 15,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Trop de demandes en peu de temps. Réessayez dans une minute." }
}));
app.use(express.static(__dirname));

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, configured: Boolean(apiKey), provider: "Google Gemini", model: apiKey ? model : null });
});

app.post("/api/chat", async (req, res) => {
  try {
    if (!apiKey) return res.status(503).json({ error: "Clé GEMINI_API_KEY absente. Ajoutez-la dans le fichier .env du serveur." });
    const { message = "", vehicle = "Non renseigné", history = [], image = null, systemPrompt = "" } = req.body || {};
    if (!String(message).trim() && !image) return res.status(400).json({ error: "Écrivez une question ou joignez une photo." });
    if (image && (typeof image !== "string" || !/^data:image\/(png|jpe?g|webp);base64,/i.test(image))) {
      return res.status(400).json({ error: "Format de photo non pris en charge. Utilisez PNG, JPG ou WebP." });
    }
    if (image && image.length > 10_500_000) return res.status(413).json({ error: "Photo trop volumineuse. Réduisez sa taille puis réessayez." });

    const contents = [];
    const safeHistory = Array.isArray(history) ? history.slice(-12).filter(x =>
      x && ["user", "assistant"].includes(x.role) && typeof x.content === "string"
    ) : [];
    for (const item of safeHistory.slice(0, -1)) {
      const text = item.content.slice(0, 5000);
      if (text.trim()) contents.push({ role: item.role === "assistant" ? "model" : "user", parts: [{ text }] });
    }

    const currentParts = [{ text: `Véhicule : ${String(vehicle).slice(0, 700)}\nQuestion : ${String(message).slice(0, 6000) || "Analyse la photo jointe et décris uniquement ce que tu peux réellement observer."}` }];
    if (image) {
      const match = image.match(/^data:(image\/(?:png|jpe?g|webp));base64,([\s\S]+)$/i);
      if (!match) return res.status(400).json({ error: "Image invalide." });
      currentParts.push({ inlineData: { mimeType: match[1], data: match[2] } });
    }
    contents.push({ role: "user", parts: currentParts });

    const system = `${String(systemPrompt).slice(0, 26000)}\n\nRÈGLES DE FIABILITÉ ET DE SÉCURITÉ :\n- Réponds en français, comme un technicien expert en diagnostic électrique et électronique automobile.\n- Ne fabrique jamais de valeurs constructeur, brochages, schémas, couples de serrage ou procédures spécifiques. Si une donnée dépend du véhicule, demande marque, modèle, année, motorisation et code moteur ou VIN (sans demander de données personnelles inutiles).\n- Distingue clairement les faits observés, les hypothèses et les tests à effectuer.\n- Pour chaque test, indique l'outil, les points de mesure, la condition de test et le résultat attendu seulement si tu connais une valeur fiable. Sinon indique de consulter la documentation constructeur.\n- Signale les risques liés aux airbags, haute tension des hybrides/électriques, carburant et courts-circuits. Ne conseille jamais de neutraliser un dispositif de sécurité.\n- Une photo seule ne permet pas toujours d'identifier avec certitude une pièce ou un brochage.`;

    const response = await fetch(`${apiUrl}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { maxOutputTokens: 1800, temperature: 0.25 }
      }),
      signal: AbortSignal.timeout(60000)
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const upstreamStatus = response.status;
      console.error("Gemini API error:", upstreamStatus, payload?.error?.message || "Unknown error");
      const status = upstreamStatus === 400 ? 400 : upstreamStatus === 401 || upstreamStatus === 403 ? 502 : upstreamStatus === 429 ? 429 : 502;
      return res.status(status).json({ error:
        upstreamStatus === 400 ? "La demande ou l'image n'a pas été acceptée par Gemini. Vérifiez le format et réessayez." :
        upstreamStatus === 401 || upstreamStatus === 403 ? "Clé Gemini invalide ou accès au modèle refusé. Vérifiez votre clé dans Google AI Studio." :
        upstreamStatus === 429 ? "Quota gratuit Gemini atteint ou limite temporaire. Réessayez plus tard." :
        "Gemini n'a pas pu répondre pour le moment. Réessayez dans quelques instants."
      });
    }

    const answer = (payload.candidates?.[0]?.content?.parts || []).map(part => part.text || "").join("\n").trim();
    if (!answer) return res.status(502).json({ error: "Gemini n'a pas retourné de réponse textuelle. Réessayez avec une question plus précise." });
    res.json({ answer });
  } catch (err) {
    console.error("Erreur /api/chat:", err?.message || err);
    res.status(err?.name === "TimeoutError" ? 504 : 500).json({ error:
      err?.name === "TimeoutError" ? "Le diagnostic prend trop de temps. Réessayez." :
      "Le moteur IA n'a pas pu répondre. Vérifiez la connexion du serveur."
    });
  }
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`Électro Auto Pro (Gemini) prêt sur http://localhost:${port}`));
