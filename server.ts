import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) throw new Error("API Key de Gemini no configurada en el servidor");
  return new GoogleGenAI({ apiKey });
};

function fixEncodingArtifacts(text: string): string {
  if (!text) return text;
  let fixed = text
    .replace(/Ã¡/g, 'á')
    .replace(/Ã©/g, 'é')
    .replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã±/g, 'ñ')
    .replace(/Ã‘/g, 'Ñ')
    .replace(/Ã /g, 'Á')
    .replace(/Ã‰/g, 'É')
    .replace(/Ã /g, 'Í')
    .replace(/Ã“/g, 'Ó')
    .replace(/Ãš/g, 'Ú')
    .replace(/Â¿/g, '¿')
    .replace(/Â¡/g, '¡');
    
  fixed = fixed.replace(/([a-zA-Z])³([a-zA-Z])/g, '$1ó$2');
  fixed = fixed.replace(/([a-zA-Z])³(?=[\s.,;:)\]}?!]|$)/g, '$1ó');
  fixed = fixed.replace(/(^|[\s(>\[{])³([a-zA-Z])/g, '$1ó$2');
  fixed = fixed.replace(/\b(m|cm|km|mm)ó(?=[\s.,;:)\]}?!]|$)/g, '$1³');
  fixed = fixed.replace(/([a-zA-Z])¡([a-zA-Z])/g, '$1í$2');
  fixed = fixed.replace(/([a-zA-Z])±([a-zA-Z])/g, '$1ñ$2');
  
  return fixed;
}

function cleanParsedData(data: any): any {
  if (typeof data === 'string') {
    return fixEncodingArtifacts(data);
  }
  if (Array.isArray(data)) {
    return data.map(cleanParsedData);
  }
  if (data !== null && typeof data === 'object') {
    const cleaned: any = {};
    for (const key in data) {
      cleaned[key] = cleanParsedData(data[key]);
    }
    return cleaned;
  }
  return data;
}

function parseAIResponse(textResponse: string) {
  let parsed;
  try {
    parsed = JSON.parse(textResponse);
  } catch (e) {
    console.error("Failed to parse JSON:", textResponse);
    const match = textResponse.match(/```json\n([\s\S]*?)\n```/);
    if (match) {
      parsed = JSON.parse(match[1]);
    } else {
      throw new Error("Invalid JSON response from AI");
    }
  }
  return cleanParsedData(parsed);
}

app.post('/api/generate-questions', async (req, res) => {
  try {
    const ai = getAI();
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
      ? `\nPREGUNTAS YA EXISTENTES EN ESTE TEMA (PROHIBIDO REPETIR ESTOS CONCEPTOS O DATOS):\n${data.existingQuestions.map((q: any, i: number) => `${i+1}. Pregunta: ${q.text} | Respuesta Correcta: ${q.options[q.correctOptionIndex]}`).join('\n')}\n`
      : '';

    const promptText = `
      Actúa como un experto creador y extractor de preguntas tipo test de alta dificultad.
      
      INSTRUCCIONES PRINCIPALES:
      0. CORRECCIÓN DE ERRORES DE LECTURA (MUY IMPORTANTE): El texto fuente (especialmente si es un PDF) contiene errores de codificación donde las letras con tilde o la 'ñ' han sido reemplazadas por números (por ejemplo: '3' en lugar de 'ó', 'ú', 'í', 'é'; o '1' en lugar de 'á', 'ñ'). Ejemplos que encontrarás: "Funci3n p3blica" -> "Función pública", "Andaluc3a" -> "Andalucía", "tambi3n" -> "también", "car1cter" -> "carácter", "Se1ale" -> "Señale", "3rgano" -> "órgano", "opci3n" -> "opción", "tendr1n" -> "tendrán", "autom1tico" -> "automático". TU OBLIGACIÓN es corregir todos estos errores y devolver las preguntas y respuestas escritas en PERFECTO ESPAÑOL, con la ortografía correcta. NUNCA devuelvas palabras con números intercalados si se trata de un error ortográfico.

      1. Si el contenido proporcionado (URL, HTML, texto o PDF) contiene un test, cuestionario o examen ya existente:
         - TU TAREA ES EXTRAER TODAS esas preguntas exactamente como aparecen, PERO CORRIGIENDO LOS ERRORES DE CODIFICACIÓN MENCIONADOS EN EL PUNTO 0.
         - Identifica la respuesta correcta. A menudo en el código HTML la respuesta correcta tiene una clase específica (como 'correct', 'right', 'verde', 'correcto'), un atributo de datos (como 'data-correct="true"'), o un script asociado. Si no puedes encontrar la marca técnica de la respuesta correcta, dedúcela usando tus conocimientos sobre el tema.
         - Extrae TODAS las preguntas que encuentres en el contenido, sin importar el número. Ignora cualquier límite de cantidad. Es crucial que no te dejes ninguna pregunta del test original.
      
      2. Si el contenido es material de estudio (leyes, temarios, artículos) y NO contiene un test:
         - Genera ${data.numQuestions} preguntas de opción múltiple nuevas basadas en el contenido.
         - HAZ PREGUNTAS COMPLEJAS Y DIFÍCILES. Analiza el documento COMPLETO para buscar posibles datos confundibles, excepciones, plazos similares, o conceptos que se presten a confusión entre diferentes partes del texto.
         - Formula preguntas que requieran relacionar conceptos de diferentes partes del documento, no solo copiar y pegar una frase.
         - Las opciones incorrectas (distractores) deben ser muy plausibles y estar basadas en otros datos reales del documento para que el usuario tenga que pensar bien la respuesta.
         - Asegúrate de que las preguntas sean claras y tengan una única respuesta correcta indiscutible.
         
         REGLA DE NO DUPLICIDAD:
         - Revisa la lista de "PREGUNTAS YA EXISTENTES" proporcionada abajo.
         - ESTÁ ESTRICTAMENTE PROHIBIDO generar preguntas que evalúen el mismo dato, artículo, plazo o concepto que ya esté cubierto por las preguntas existentes.
         - Busca "huecos" en el temario: partes del texto que aún no han sido preguntadas.
         - Si una pregunta existente ya pregunta por el plazo de un recurso, tú debes preguntar por otra cosa (quién lo resuelve, dónde se presenta, etc.), pero NO por el mismo plazo.
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
    
    let contents: any = promptText;
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
    
    const config: any = {
      responseMimeType: "application/json",
      systemInstruction: "Eres un experto en legislación española. Genera siempre el texto en español correcto, utilizando tildes (á, é, í, ó, ú) y la letra ñ correctamente. Corrige automáticamente cualquier error de codificación del texto original donde las tildes o la 'ñ' aparezcan como números (ej. 'Funci3n' -> 'Función', 'car1cter' -> 'carácter', 'tambi3n' -> 'también'). Asegúrate de que la codificación de caracteres sea UTF-8 y no utilices códigos numéricos para representar caracteres especiales.",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING, description: "Texto de la pregunta" },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Lista de 4 opciones de respuesta"
            },
            correctOptionIndex: { type: Type.INTEGER, description: "Índice (0-3) de la opción correcta" }
          },
          required: ["text", "options", "correctOptionIndex"]
        }
      }
    };

    if (data.url && !urlContent) {
      config.tools = [{ urlContext: {} }];
    }
    
    const modelToTry = 'gemini-3.1-pro-preview';
    const fallbackModel = 'gemini-3-flash-preview';
    
    try {
      const response = await ai.models.generateContent({
        model: modelToTry,
        contents: contents,
        config: config
      });
      
      const textResponse = response.text || '[]';
      res.json(parseAIResponse(textResponse));
    } catch (error: any) {
      console.warn(`Error with ${modelToTry}, trying fallback ${fallbackModel}:`, error);
      try {
        const response = await ai.models.generateContent({
          model: fallbackModel,
          contents: contents,
          config: config
        });
        const textResponse = response.text || '[]';
        res.json(parseAIResponse(textResponse));
      } catch (fallbackError: any) {
        console.error("Fallback AI Error:", fallbackError);
        res.status(500).json({ error: `Error de la IA: ${fallbackError.message || 'Desconocido'}` });
      }
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/generate-mnemonic', async (req, res) => {
  try {
    const ai = getAI();
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

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
      });
      res.json({ mnemonic: response.text || '' });
    } catch (error: any) {
      console.warn("Mnemonic AI Error, trying fallback:", error);
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
        });
        res.json({ mnemonic: response.text || '' });
      } catch (fallbackError: any) {
        console.error("Fallback Mnemonic AI Error:", fallbackError);
        res.status(500).json({ error: 'Error al generar la regla mnemotécnica.' });
      }
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/generate-phonetic', async (req, res) => {
  try {
    const ai = getAI();
    const { numberStr, letters } = req.body;
    
    const prompt = `Actúa como un experto en mnemotecnia. Para el número "${numberStr}", las opciones de consonantes por cada dígito en orden son: ${letters}. 
Genera todas las palabras posibles en español (o una lista exhaustiva de hasta 30 palabras) que cumplan con este código.
REGLA ESTRICTA: La palabra debe contener EXACTAMENTE las consonantes correspondientes a los dígitos en el orden exacto. Las vocales (a,e,i,o,u) y las letras H e Y no tienen valor y se usan para rellenar.
Ejemplo: Para "10" (1=T/D, 0=R/RR) -> "Toro", "Torre", "Ateo", "Duro".
Devuelve SOLO las palabras, sin explicaciones ni las letras entre paréntesis.`;

    const config: any = {
      systemInstruction: "Eres un experto en mnemotecnia y lenguaje español. Genera siempre el texto en español correcto, utilizando tildes (á, é, í, ó, ú) y la letra ñ correctamente. Asegúrate de que la codificación de caracteres sea UTF-8.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING
        }
      }
    };

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: config
      });
      const text = response.text || '[]';
      const words = JSON.parse(text);
      res.json({ words: Array.isArray(words) ? words : [] });
    } catch (error: any) {
      console.warn("Phonetic AI Error, trying fallback:", error);
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt,
          config: config
        });
        const text = response.text || '[]';
        const words = JSON.parse(text);
        res.json({ words: Array.isArray(words) ? words : [] });
      } catch (e) {
        res.json({ words: [] });
      }
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/generate-content', async (req, res) => {
  try {
    const ai = getAI();
    const { prompt } = req.body;
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "Eres un asistente experto en oposiciones y legislación. Genera siempre el texto en español correcto.",
      }
    });
    res.json({ text: response.text || "" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
export default app;
