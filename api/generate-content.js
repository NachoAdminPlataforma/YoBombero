// api/generate-content.js
import { getGeminiClient } from './gemini-client.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const ai = getGeminiClient();
    const { prompt } = req.body;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "Eres un asistente experto en oposiciones y legislación. Genera siempre el texto en español correcto.",
      }
    });

    return res.status(200).json({ content: response.text || "" });
  } catch (error) {
    console.error('Error en servidor (generate-content):', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    
    if (errorMessage.includes('API key not valid')) {
      return res.status(401).json({ 
        error: 'La clave de API de Gemini no es válida o no tiene habilitada la "Generative Language API". Por favor, verifica tu configuración en Google Cloud Console.' 
      });
    }
    
    return res.status(500).json({ error: `Error interno en la generación de contenido: ${errorMessage}` });
  }
}