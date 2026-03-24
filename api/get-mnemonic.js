// api/get-mnemonic.js
import { getGeminiClient } from './gemini-client.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const ai = getGeminiClient();
    const { question, correctAnswer } = req.body;

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
    console.error('Error en servidor (get-mnemonic):', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    
    if (errorMessage.includes('API key not valid')) {
      return res.status(401).json({ 
        error: 'La clave de API de Gemini no es válida o no tiene habilitada la "Generative Language API". Por favor, verifica tu configuración en Google Cloud Console.' 
      });
    }
    
    return res.status(500).json({ error: `Error interno en la generación de mnemotécnica: ${errorMessage}` });
  }
}