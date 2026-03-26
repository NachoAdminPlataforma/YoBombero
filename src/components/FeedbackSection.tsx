import React, { useState } from 'react';
import { User, Feedback } from '../types';
import { api } from '../lib/api';
import { MessageSquare, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FeedbackSectionProps {
  user: User;
}

export function FeedbackSection({ user }: FeedbackSectionProps) {
  const [message, setMessage] = useState('');
  const [type, setType] = useState<Feedback['type']>('improvement');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    try {
      await api.submitFeedback({
        userId: user.id,
        userEmail: user.email,
        userName: user.displayName,
        userPhoto: user.photoURL,
        message,
        type
      });
      setSubmitted(true);
      setMessage('');
      setTimeout(() => setSubmitted(false), 5000);
    } catch (error) {
      console.error("Error submitting feedback:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center">
              <MessageSquare size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Buzón de Sugerencias</h2>
              <p className="text-slate-600 dark:text-slate-400">Ayúdanos a mejorar tu plataforma de estudio.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Tipo de mensaje</label>
              <div className="grid grid-cols-3 gap-3">
                {(['improvement', 'complaint', 'other'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all ${
                      type === t
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                        : 'border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {t === 'improvement' ? 'Mejora' : t === 'complaint' ? 'Queja' : 'Otro'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Tu mensaje</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Escribe aquí lo que te gustaría que implementemos, mejoras, quejas..."
                className="w-full h-40 p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-0 transition-all resize-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !message.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <Send size={20} />
                  Enviar Mensaje
                </>
              )}
            </button>
          </form>

          <AnimatePresence>
            {submitted && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-3 text-emerald-700 dark:text-emerald-400"
              >
                <CheckCircle2 size={20} />
                <span className="font-bold">¡Mensaje enviado correctamente! Gracias por tu feedback.</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
