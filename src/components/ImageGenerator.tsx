import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Sparkles, CheckCircle2 } from 'lucide-react';
import { User as AppUser } from '../types';
import { api } from '../lib/api';

interface ImageGeneratorProps {
  appUser: AppUser | null;
}

const SURVEY_OPTIONS = [
  "Sí, me encantaría tenerlo",
  "Sí, pero depende del precio",
  "No me interesa",
  "Prefiero otras funcionalidades antes"
];

export function ImageGenerator({ appUser }: ImageGeneratorProps) {
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (appUser) {
      api.getSurveyResponse(appUser.id).then(response => {
        if (response) {
          setHasVoted(true);
          setSelectedOption(response.answer);
        }
        setLoading(false);
      });
    }
  }, [appUser]);

  const handleVote = async (option: string) => {
    if (!appUser || hasVoted) return;
    setSubmitting(true);
    try {
      await api.saveSurveyResponse(appUser.id, appUser, option);
      setHasVoted(true);
      setSelectedOption(option);
    } catch (error) {
      console.error("Error saving survey response:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
          <ImageIcon size={24} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Generador de Imágenes</h2>
      </div>

      <div className="bg-white dark:bg-slate-800 p-12 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 text-center space-y-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 mb-2">
          <Sparkles size={40} />
        </div>
        
        <div className="space-y-4">
          <h3 className="text-3xl font-bold text-slate-900 dark:text-white">Próximamente...</h3>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Podrás crear fácilmente y sin prompts ni cuotas de usos, imágenes simples con el mismo estilo y sin fondo (PNG) muy potentes para utilizarlas en las mnemotécnias.
          </p>
        </div>

        <div className="pt-4 pb-8">
          <div className="inline-block px-6 py-2 bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 rounded-full text-sm font-medium">
            Estamos trabajando en ello 🛠️
          </div>
        </div>

        <div className="pt-8 border-t border-slate-100 dark:border-slate-700">
          <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
            Encuesta rápida
          </h4>
          
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : hasVoted ? (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-800/50 flex flex-col items-center gap-3">
              <CheckCircle2 className="text-emerald-500" size={32} />
              <p className="text-emerald-800 dark:text-emerald-300 font-medium">
                ¡Gracias por tu voto! Has seleccionado:
              </p>
              <span className="px-4 py-1 bg-white dark:bg-slate-800 rounded-full text-sm font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                {selectedOption}
              </span>
            </div>
          ) : (
            <div className="space-y-4 text-left sm:text-center">
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                ¿Te gustaría tener esta funcionalidad? (teniendo en cuenta que conllevaría un muy pequeño sobre costo en la mensualidad)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SURVEY_OPTIONS.map((option) => (
                  <button
                    key={option}
                    onClick={() => handleVote(option)}
                    disabled={submitting}
                    className="p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-slate-700 dark:text-slate-300 font-medium transition-all text-sm disabled:opacity-50"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
