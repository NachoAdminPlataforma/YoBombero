// api/generate-questions.js
import { Type } from '@google/genai';
import { getGeminiClient } from './gemini-client.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const ai = getGeminiClient();
    const data = req.body;

    let urlContent = '';
    if (data.url) {
      try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(data.url)}`;
        const response = await fetch(proxyUrl);
        if (response.ok) {
          const result = await response.json();
          urlContent = result.contents;
        }
      } catch (e) {
        console.error('Error fetching URL:', e);
      }
    }

    const existingQuestionsContext = data.existingQuestions && data.existingQuestions.length > 0
      ? `\nPREGUNTAS YA EXISTENTES EN ESTE TEMA (PROHIBIDO REPETIR ESTOS CONCEPTOS O DATOS):\n${data.existingQuestions.map((q, i) => `${i+1}. Pregunta: ${q.text} | Respuesta Correcta: ${q.options[q.correctOptionIndex]}`).join('\n')}\n`
      : '';

    const promptText = `
      Actúa como un experto creador y extractor de preguntas tipo test de alta dificultad.
      
      INSTRUCCIONES PRINCIPALES:
      0. CORRECCIÓN DE ERRORES DE LECTURA (MUY IMPORTANTE): El texto fuente (especialmente si es un PDF) contiene errores de codificación donde las letras con tilde o la 'ñ' han sido reemplazadas por números. Identifica estos patrones y corrígelos (ej. "artÃculo" -> "artículo", "EspaÃ±a" -> "España").

      1. Si el contenido proporcionado (URL, HTML, texto o PDF) contiene un test, cuestionario o examen ya existente:
         - TU TAREA ES EXTRAER TODAS esas preguntas exactamente como aparecen, PERO CORRIGIENDO LOS ERRORES DE CODIFICACIÓN.
         - Identifica la respuesta correcta basándote en el contexto o marcas del documento.

      2. Si el contenido es material de estudio:
         - Genera ${data.numQuestions || 5} preguntas de opción múltiple nuevas basadas en el contenido.
         - HAZ PREGUNTAS COMPLEJAS Y DIFÍCILES.
         - Asegúrate de que las opciones sean plausibles pero solo una sea correcta.

      Sección específica a evaluar/extraer: ${data.section || 'Todo el documento'}
      Instrucciones adicionales: ${data.customPrompt || 'Ninguna'}
      
      CONTENIDO A ANALIZAR:
      ${data.url ? `URL: ${data.url}\nContenido URL: ${urlContent.substring(0, 20000)}` : ''}
      ${data.text ? `Texto: ${data.text}` : ''}
      ${existingQuestionsContext}
    `;

    const modelToTry = 'gemini-1.5-flash';

    const contents = {
      parts: [
        ...(data.fileData ? [{ inlineData: { data: data.fileData.data, mimeType: data.fileData.mimeType } }] : []),
        { text: promptText }
      ]
    };

    const config = {
      responseMimeType: 'application/json',
      systemInstruction: 'Eres un experto en legislación española. Genera siempre el texto en español correcto, utilizando tildes y la letra ñ correctamente. Tu salida debe ser exclusivamente un array JSON de objetos con las propiedades: text (string), options (array de 4 strings), correctOptionIndex (integer 0-3).',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctOptionIndex: { type: Type.INTEGER }
          },
          required: ['text', 'options', 'correctOptionIndex']
        }
      }
    };

    if (data.url && !urlContent) {
      config.tools = [{ urlContext: {} }];
    }

    const response = await ai.models.generateContent({ model: modelToTry, contents, config });
    const textResponse = response.text || '[]';
    return res.status(200).json(JSON.parse(textResponse));
  } catch (error) {
    console.error('Error en servidor (generate-questions):', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    
    if (errorMessage.includes('API key not valid')) {
      return res.status(401).json({ 
        error: 'La clave de API de Gemini no es válida o no tiene habilitada la "Generative Language API". Por favor, verifica tu configuración en Google Cloud Console.' 
      });
    }
    
    return res.status(500).json({ error: `Error interno en la generación: ${errorMessage}` });
  }
}
