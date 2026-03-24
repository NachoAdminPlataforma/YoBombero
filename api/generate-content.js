// api/generate-content.js
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

    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt requerido' });
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "Eres un asistente experto en oposiciones y legislación. Genera siempre el texto en español correcto.",
      }
    });

    return res.status(200).json({ content: response.text || "" });
  } catch (error) {
    console.error('Error en servidor:', error);
    return res.status(500).json({ error: 'Error interno en la generación de contenido' });
  }
}