// api/get-mnemonic.js
import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API Key de Gemini no configurada' });
    }

    const { question, correctAnswer } = req.body;
    if (!question || !correctAnswer) {
      return res.status(400).json({ error: 'Pregunta y respuesta correcta requeridas' });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Crea una regla mnemotécnica o una historia corta, absurda y muy memorable para recordar este dato.
      Pregunta: ${question}
      Respuesta correcta: ${correctAnswer}

      IMPORTANTE: Si la respuesta contiene números (fechas, artículos, plazos, etc.), utiliza el SISTEMA NINJA de código fonético para crear la mnemotecnia:
      0: R / RR
      1: T, D
      2: N, Ñ
      3: M / W
      4: C / K / Q
      5: L / V / LL
      6: S, Z
      7: F / J
      8: G / X / CH
      9: P, B
      (Las vocales, H e Y no tienen valor).

      Si usas el código fonético, explica brevemente la palabra elegida (ej: "Para el 10 usamos TORO (T=1, R=0)").
      No des explicaciones adicionales innecesarias, solo la mnemotecnia o historia.`;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
    });

    return res.status(200).json({ mnemonic: response.text || '' });
  } catch (error) {
    console.error('Error en servidor:', error);
    return res.status(500).json({ error: 'Error interno en la generación de mnemotécnica' });
  }
}