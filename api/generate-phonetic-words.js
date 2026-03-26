// api/generate-phonetic-words.js
import { Type } from '@google/genai';
import { getGeminiClient } from './gemini-client.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const ai = getGeminiClient();
    const { numberStr, letters } = req.body;

    const prompt = `Actúa como un experto en mnemotecnia. Para el número "${numberStr}", las opciones de consonantes por cada dígito en orden son: ${letters}.
Genera todas las palabras posibles en español (o una lista exhaustiva de hasta 30 palabras) que cumplan con este código.
REGLA ESTRICTA: La palabra debe contener EXACTAMENTE las consonantes correspondientes a los dígitos en el orden exacto. Las vocales (a,e,i,o,u) y las letras H e Y no tienen valor y se usan para rellenar.
Ejemplo: Para "10" (1=T/D, 0=R/RR) -> "Toro", "Torre", "Ateo", "Duro".
Devuelve SOLO las palabras, sin explicaciones ni las letras entre paréntesis.`;

    const config = {
      systemInstruction: "Eres un experto en mnemotecnia y lenguaje español. Genera siempre el texto en español correcto, utilizando tildes (á, é, í, ó, ú) y la letra ñ correctamente. Asegúrate de que la codificación de caracteres sea UTF-8.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    };

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config
    });

    const text = response.text || '[]';
    const words = JSON.parse(text);
    return res.status(200).json({ words: Array.isArray(words) ? words : [] });
  } catch (error) {
    console.error('Error en servidor (generate-phonetic-words):', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    
    if (errorMessage.includes('API key not valid')) {
      return res.status(401).json({ 
        error: 'La clave de API de Gemini no es válida o no tiene habilitada la "Generative Language API". Por favor, verifica tu configuración en Google Cloud Console.' 
      });
    }
    
    return res.status(500).json({ error: `Error interno en la generación de palabras fonéticas: ${errorMessage}` });
  }
}