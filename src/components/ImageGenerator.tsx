import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { playNotificationSound } from '../lib/audio';
import { Image as ImageIcon, Loader2, Download, Key } from 'lucide-react';

export function ImageGenerator() {
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      // @ts-ignore
      if (window.aistudio && window.aistudio.hasSelectedApiKey) {
        // @ts-ignore
        const has = await window.aistudio.hasSelectedApiKey();
        setHasKey(has);
      } else {
        // Fallback if not in AI Studio environment
        setHasKey(true);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    // @ts-ignore
    if (window.aistudio && window.aistudio.openSelectKey) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      // Assume success to mitigate race conditions
      setHasKey(true);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setLoading(true);
    setError(null);
    setImageUrl(null);

    try {
      // Create a new instance right before making an API call
      // Use process.env.API_KEY which contains the key selected by the user via window.aistudio.openSelectKey()
      const apiKey = process.env.API_KEY || import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey: apiKey as string });
      const fullPrompt = `Crea una imagen sencilla, con fondo blanco y estilo comic de ${prompt}`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              text: fullPrompt,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1"
          }
        },
      });

      let foundImage = false;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64EncodeString: string = part.inlineData.data;
          setImageUrl(`data:image/png;base64,${base64EncodeString}`);
          foundImage = true;
          playNotificationSound();
          break;
        }
      }

      if (!foundImage) {
        setError("No se pudo generar la imagen. Inténtalo de nuevo.");
      }
    } catch (err: any) {
      console.error("Error generating image:", err);
      if (err.message && err.message.includes("Requested entity was not found")) {
        setHasKey(false);
        setError("La clave API no es válida o no tiene acceso. Por favor, selecciona una clave de un proyecto con facturación habilitada.");
      } else {
        setError(err.message || "Error al conectar con la IA.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!hasKey) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <ImageIcon size={24} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Generador de Imágenes</h2>
        </div>
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 mb-2">
            <Key size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Se requiere Clave API</h3>
          <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            Para utilizar el modelo avanzado de generación de imágenes (Nanobanana), necesitas seleccionar tu propia clave API de Google Cloud con facturación habilitada.
          </p>
          <button
            onClick={handleSelectKey}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors mt-4"
          >
            Seleccionar Clave API
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
          <ImageIcon size={24} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Generador de Imágenes</h2>
      </div>

      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            ¿Qué quieres dibujar? (Estilo cómic, fondo blanco)
          </label>
          <div className="flex gap-4">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              placeholder="Ej: un perro bombero apagando un fuego"
              className="flex-1 px-4 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg transition-all text-slate-900 dark:text-white"
            />
            <button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors flex items-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <ImageIcon size={20} />}
              Generar
            </button>
          </div>
          {error && <p className="text-rose-500 dark:text-rose-400 text-sm mt-2">{error}</p>}
        </div>

        {imageUrl && (
          <div className="mt-8 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-900/50 p-4 flex flex-col items-center">
            <img src={imageUrl} alt={prompt} className="max-w-full h-auto rounded-xl shadow-sm" />
            <a
              href={imageUrl}
              download={`imagen-${prompt.replace(/\s+/g, '-').toLowerCase()}.png`}
              className="mt-4 px-6 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Download size={18} />
              Descargar Imagen
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
