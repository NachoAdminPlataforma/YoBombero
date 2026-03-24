// api/generate-questions.js
import { GoogleGenAI, Type } from '@google/genai';

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
      0. CORRECCIÓN DE ERRORES DE LECTURA (MUY IMPORTANTE): El texto fuente (especialmente si es un PDF) contiene errores de codificación donde las letras con tilde o la 'ñ' han sido reemplazadas por números ...

      1. Si el contenido proporcionado (URL, HTML, texto o PDF) contiene un test, cuestionario o examen ya existente:
         - TU TAREA ES EXTRAER TODAS esas preguntas exactamente como aparecen, PERO CORRIGIENDO LOS ERRORES DE CODIFICACIÓN MENCIONADOS EN EL PUNTO 0.
         - Identifica la respuesta correcta. ...

      2. Si el contenido es material de estudio ...
         - Genera ${data.numQuestions} preguntas de opción múltiple nuevas basadas en el contenido.
         - HAZ PREGUNTAS COMPLEJAS Y DIFÍCILES...

         REGLA DE NO DUPLICIDAD: ...
         ${existingQuestionsContext}

      Sección específica a evaluar/extraer: ${data.section || 'Todo el documento'}
      Instrucciones adicionales: ${data.customPrompt || 'Ninguna'}
      URL proporcionada:
      ${data.url || 'Ninguna'}

      Contenido HTML de la URL (si aplica):
      ${urlContent ? urlContent.substring(0, 500000) : 'Ninguno'}

      Texto adicional proporcionado:
      ${data.text || 'Ninguno'}
    `;

    let contents = promptText;
    if (data.fileData) {
      contents = [
        {
          parts: [
            { inlineData: { mimeType: data.fileData.mimeType, data: data.fileData.data } },
            { text: promptText }
          ]
        }
      ];
    }

    const config = {
      responseMimeType: 'application/json',
      systemInstruction: 'Eres un experto en legislación española. Genera siempre el texto en español correcto, utilizando tildes (á, é, í, ó, ú) y la letra ñ correctamente. Corrige automáticamente cualquier error de codificación del texto original...',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING, description: 'Texto de la pregunta' },
            options: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Lista de 4 opciones de respuesta' },
            correctOptionIndex: { type: Type.INTEGER, description: 'Índice (0-3) de la opción correcta' }
          },
          required: ['text', 'options', 'correctOptionIndex']
        }
      }
    };

    if (data.url && !urlContent) {
      config.tools = [{ urlContext: {} }];
    }

    const modelToTry = 'gemini-1.5-flash';

    const response = await ai.models.generateContent({ model: modelToTry, contents, config });
    const textResponse = response.text || '[]';
    return res.status(200).json(JSON.parse(textResponse));
  } catch (error) {
    console.error('Error en servidor:', error);
    return res.status(500).json({ error: 'Error interno en la generación' });
  }
}
