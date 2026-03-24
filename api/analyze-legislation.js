// api/analyze-legislation.js
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

    const data = req.body;

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `Actúa como un/a experto/a en comprensión, análisis y didáctica de textos. Eres un experto en legislación española. Genera siempre el texto en español correcto, utilizando tildes (á, é, í, ó, ú) y la letra ñ correctamente. Asegúrate de que la codificación de caracteres sea UTF-8 y no utilices códigos numéricos para representar caracteres especiales.

Sobre el artículo ${data.fileContext?.trim() ? `"${data.fileContext.trim()}"` : 'proporcionado'}

Debes realizar todas las tareas que se indican a continuación sin omitir información relevante del texto original pero todo de manera simple y entendible, sin relleno:

1. Reescritura con lenguaje mucho más entendible

- Reescribe el contenido del artículo utilizando un lenguaje claro, sencillo y accesible.
- Mantén el significado original, pero elimina tecnicismos innecesarios o explícalos de forma simple.

2. Analogía del contenido del artículo (CONTEXTO OPOSICIÓN BOMBERO)

- Explica las ideas principales del artículo mediante una analogía fácil de comprender.
- IMPORTANTE: La analogía DEBE estar ambientada en el entorno de una opositora a BOMBERO. Utiliza ejemplos relacionados con tus profesores de legislación, tu profesor de bombero, situaciones en el parque de bomberos, o la vida cotidiana de un opositor.
- La analogía debe ser coherente y ayudar a entender el mensaje central del texto.

3. Caso de aplicación práctica (AYUNTAMIENTO DE SEVILLA / BOMBEROS)

- Describe uno o más ejemplos prácticos de cómo se aplica lo explicado en el artículo en situaciones reales relacionadas con el AYUNTAMIENTO DE SEVILLA (donde vas a trabajar) o con la profesión de BOMBERO.
- Los ejemplos deben ser concretos, realistas y directamente relacionados con el ámbito de los bomberos o la administración local de Sevilla.

4. Conversión del artículo en afirmaciones tipo test

- Transforma el artículo en una serie de afirmaciones claras, precisas y organizadas.
- Las afirmaciones deben estar optimizadas para responder preguntas tipo test.
- El resultado debe ser completo, estructurado y sin omitir información, de modo que se pueda responder correctamente cualquier pregunta tipo test basada en el documento original.

Formato de salida obligatorio:

- Usa títulos numerados para cada apartado (ej. "## 1. Reescritura con lenguaje mucho más entendible").
- Usa formato Markdown para estructurar bien el texto (negritas, listas, saltos de línea).
- No mezcles información entre secciones.
- No inventes datos que no estén en el artículo.`;

    const parts = [];

    if (data.text?.trim()) {
      parts.push({ text: data.text });
    }

    if (data.useAttachedPdf && data.attachedPdf) {
      parts.push({ text: `CONTENIDO DEL PDF ADJUNTO AL TEMA (${data.attachedPdf.fileName}):\n${data.attachedPdf.extractedText}` });
    } else if (data.fileData) {
      parts.push({
        inlineData: {
          data: data.fileData.data,
          mimeType: data.fileData.mimeType
        }
      });
    }

    if (data.fileContext?.trim()) {
      parts.push({ text: `Por favor, centra tu análisis específicamente en la siguiente parte, artículo o sección del documento o texto proporcionado: ${data.fileContext.trim()}` });
    }

    const modelToTry = 'gemini-1.5-flash';

    const response = await ai.models.generateContent({
      model: modelToTry,
      contents: { parts },
      config: { systemInstruction }
    });

    return res.status(200).json({ result: response.text || "No se pudo generar el análisis." });
  } catch (error) {
    console.error('Error en servidor:', error);
    return res.status(500).json({ error: 'Error interno en el análisis' });
  }
}