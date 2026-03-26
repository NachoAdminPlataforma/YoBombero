import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { api } from '../lib/api';
import { playNotificationSound } from '../lib/audio';
import { FileText, Upload, Loader2, File as FileIcon, X, Folder } from 'lucide-react';
import Markdown from 'react-markdown';

import { Question, User as AppUser, Feedback } from '../types';

interface LegislationAnalyzerProps {
  userId: string;
  userRole: 'admin' | 'student';
  permissions: string[];
  appUser: AppUser | null;
}

export function LegislationAnalyzer({ userId, userRole, permissions, appUser }: LegislationAnalyzerProps) {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileContext, setFileContext] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [topics, setTopics] = useState<{topic: string, classification: string}[]>([]);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedClassification, setSelectedClassification] = useState('Legislativo');
  const [attachedPdf, setAttachedPdf] = useState<any | null>(null);
  const [useAttachedPdf, setUseAttachedPdf] = useState(false);

  useEffect(() => {
    const unsubscribe = api.subscribeToTopics(userId, userRole, permissions, setTopics);
    return () => unsubscribe();
  }, [userId, userRole, permissions]);

  useEffect(() => {
    if (selectedTopic) {
      api.getTopicResource(selectedTopic, selectedClassification).then(setAttachedPdf);
    } else {
      setAttachedPdf(null);
      setUseAttachedPdf(false);
    }
  }, [selectedTopic, selectedClassification]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'application/pdf' || selectedFile.type === 'text/plain') {
        setFile(selectedFile);
        setError(null);
        setUseAttachedPdf(false);
      } else {
        setError("Por favor, selecciona un archivo PDF o de texto válido.");
      }
    }
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // Extraer solo la parte base64
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error("Error al leer el archivo"));
        }
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleAnalyze = async () => {
    if (!text.trim() && !file && !useAttachedPdf) {
      setError("Por favor, introduce texto, adjunta un archivo o usa el PDF del tema.");
      return;
    }
    
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) throw new Error("API Key de Gemini no configurada");
      const ai = new GoogleGenAI({ apiKey: apiKey as string });
      
      const opposition = appUser?.oppositionType || 'opositor';
      const gender = appUser?.gender || 'Opositor';
      const name = appUser?.displayName?.split(' ')[0] || 'estudiante';
      const platform = appUser?.platformName || 'la plataforma';

      const systemInstruction = `Actúa como un/a experto/a en comprensión, análisis y didáctica de textos. Eres un experto en legislación española. Genera siempre el texto en español correcto, utilizando tildes (á, é, í, ó, ú) y la letra ñ correctamente. Asegúrate de que la codificación de caracteres sea UTF-8 y no utilices códigos numéricos para representar caracteres especiales.

Sobre el artículo ${fileContext.trim() ? `"${fileContext.trim()}"` : 'proporcionado'}

Debes realizar todas las tareas que se indican a continuación sin omitir información relevante del texto original pero todo de manera simple y entendible, sin relleno:

1. Reescritura con lenguaje mucho más entendible

- Reescribe el contenido del artículo utilizando un lenguaje claro, sencillo y accesible.
- Mantén el significado original, pero elimina tecnicismos innecesarios o explícalos de forma simple.

2. Analogía del contenido del artículo (CONTEXTO: ${gender.toUpperCase()} A ${opposition.toUpperCase().replace('_', ' ')})

- Explica las ideas principales del artículo mediante una analogía fácil de comprender.
- IMPORTANTE: La analogía DEBE estar ambientada en el entorno de un/a ${gender} a ${opposition.replace('_', ' ')}. Utiliza ejemplos relacionados con tus profesores de legislación, tu profesor de ${opposition.replace('_', ' ')}, situaciones en el lugar donde trabajarás (${opposition.replace('_', ' ')}), o la vida cotidiana de un opositor.
- Dirígete al usuario como ${name}.
- La analogía debe ser coherente y ayudar a entender el mensaje central del texto.

3. Caso de aplicación práctica (PUESTO QUE OCUPARÁS: ${opposition.toUpperCase().replace('_', ' ')})

- Describe uno o más ejemplos prácticos de cómo se aplica lo explicado en el artículo en situaciones reales relacionadas con el puesto de ${opposition.replace('_', ' ')} que vas a ocupar.
- Los ejemplos deben ser concretos, realistas y directamente relacionados con el ámbito de tu futura profesión o la administración local/estatal donde trabajarás.

4. Conversión del artículo en afirmaciones tipo test

- Transforma el artículo en una serie de afirmaciones claras, precisas y organizadas.
- Las afirmaciones deben estar optimizadas para responder preguntas tipo test.
- El resultado debe ser completo, estructurado y sin omitir información, de modo que se pueda responder correctamente cualquier pregunta tipo test basada en el documento original.

Formato de salida obligatorio:

- Usa títulos numerados para cada apartado (ej. "## 1. Reescritura con lenguaje mucho más entendible").
- Usa formato Markdown para estructurar bien el texto (negritas, listas, saltos de línea).
- No mezcles información entre secciones.
- No inventes datos que no estén en el artículo.`;

      const parts: any[] = [];
      
      if (text.trim()) {
        parts.push({ text: text });
      }

      if (useAttachedPdf && attachedPdf) {
        parts.push({ text: `CONTENIDO DEL PDF ADJUNTO AL TEMA (${attachedPdf.fileName}):\n${attachedPdf.extractedText}` });
      } else if (file) {
        const base64Data = await fileToBase64(file);
        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: file.type
          }
        });
      }

      if (fileContext.trim()) {
        parts.push({ text: `Por favor, centra tu análisis específicamente en la siguiente parte, artículo o sección del documento o texto proporcionado: ${fileContext.trim()}` });
      }

      const modelToTry = 'gemini-3.1-pro-preview';
      const fallbackModel = 'gemini-3-flash-preview';

      let response;
      try {
        response = await ai.models.generateContent({
          model: modelToTry,
          contents: {
            parts: parts,
          },
          config: {
            systemInstruction: systemInstruction,
          },
        });
      } catch (error: any) {
        console.warn(`Error with ${modelToTry}, trying fallback ${fallbackModel}:`, error);
        if (error.message?.includes('Rpc failed') || error.message?.includes('xhr error') || error.status === 'UNKNOWN' || error.message?.toLowerCase().includes('quota') || error.message?.toLowerCase().includes('limit') || error.message?.includes('429')) {
          response = await ai.models.generateContent({
            model: fallbackModel,
            contents: {
              parts: parts,
            },
            config: {
              systemInstruction: systemInstruction,
            },
          });
        } else {
          throw error;
        }
      }

      setResult(response.text || "No se pudo generar el análisis.");
      playNotificationSound();
    } catch (err: any) {
      console.error("Error analyzing text:", err);
      setError(err.message || "Error al conectar con la IA.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
          <FileText size={24} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Profesor de Legislación</h2>
      </div>

      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Clasificación</label>
            <select 
              value={selectedClassification} 
              onChange={(e) => setSelectedClassification(e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
            >
              <option value="Legislativo">Legislativo</option>
              <option value="Específico">Específico</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tema</label>
            <select 
              value={selectedTopic} 
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
            >
              <option value="">Selecciona un tema...</option>
              {topics.filter(t => t.classification === selectedClassification).map(t => (
                <option key={t.topic} value={t.topic}>{t.topic}</option>
              ))}
            </select>
          </div>
        </div>

        {attachedPdf && (
          <div className="mb-4">
            <label className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
              useAttachedPdf 
                ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 shadow-sm' 
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  useAttachedPdf ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400'
                }`}>
                  <FileIcon size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Usar PDF adjunto del tema</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-tighter">{attachedPdf.fileName}</p>
                </div>
              </div>
              <input 
                type="checkbox" 
                checked={useAttachedPdf} 
                onChange={(e) => {
                  setUseAttachedPdf(e.target.checked);
                  if (e.target.checked) removeFile();
                }}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
              />
            </label>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Pega el texto del artículo o legislación
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Pega aquí el texto a analizar..."
            className="w-full h-40 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-base transition-all resize-none text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            O adjunta un archivo (PDF o TXT)
          </label>
          <div className="flex items-center gap-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.txt"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Upload size={18} />
              Seleccionar Archivo
            </button>
            
            {file && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm font-medium">
                <FileIcon size={16} />
                <span className="truncate max-w-[200px]">{file.name}</span>
                <button onClick={removeFile} className="hover:text-indigo-900 dark:hover:text-indigo-100 ml-1">
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
          
          {(file || useAttachedPdf) && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                ¿Qué parte o artículo del documento quieres analizar? (Opcional)
              </label>
              <input
                type="text"
                value={fileContext}
                onChange={(e) => setFileContext(e.target.value)}
                placeholder="Ej: Artículo 14, Título II, o 'la parte sobre sanciones'"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all text-slate-900 dark:text-white"
              />
            </div>
          )}
        </div>

        {error && <p className="text-rose-500 dark:text-rose-400 text-sm">{error}</p>}

        <button
          onClick={handleAnalyze}
          disabled={loading || (!text.trim() && !file && !useAttachedPdf)}
          className="w-full px-8 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <FileText size={20} />}
          {loading ? 'Analizando...' : 'Analizar Texto'}
        </button>
      </div>

      {result && (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
            Resultado del Análisis
          </h3>
          <div className="markdown-body dark:text-slate-300">
            <Markdown>{result}</Markdown>
          </div>
        </div>
      )}
    </div>
  );
}
