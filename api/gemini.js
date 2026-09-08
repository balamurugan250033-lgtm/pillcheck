export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return response.status(503).json({ error: 'Gemini is not configured.' });
  }

  const prompt = typeof request.body?.prompt === 'string' ? request.body.prompt.trim() : '';
  if (!prompt) {
    return response.status(400).json({ error: 'A prompt is required.' });
  }

  try {
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are PillCheck's medication adherence advisor. Give concise, non-diagnostic guidance. Never invent a dosage or tell a user to change medication. If asked about urgent symptoms, recommend a healthcare professional. User question: ${prompt}`,
            }],
          }],
        }),
      },
    );
    const result = await geminiResponse.json();
    if (!geminiResponse.ok) {
      return response.status(geminiResponse.status).json({ error: result.error?.message || 'Gemini request failed.' });
    }
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return response.status(502).json({ error: 'Gemini returned no text.' });
    }
    return response.status(200).json({ text });
  } catch {
    return response.status(502).json({ error: 'Gemini request failed.' });
  }
}
