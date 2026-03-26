import React, { useState } from 'react';
import { User } from '../types';
import { api } from '../lib/api';
import { User as UserIcon, GraduationCap, ArrowRight, CheckCircle2 } from 'lucide-react';

interface OnboardingModalProps {
  user: User;
  onComplete: (updatedUser: User) => void;
}

const OPPOSITION_OPTIONS = [
  { id: 'bombero', name: 'Bombero', emoji: '🚒' },
  { id: 'policia', name: 'Policía Nacional', emoji: '👮' },
  { id: 'guardia_civil', name: 'Guardia Civil', emoji: '🚔' },
  { id: 'justicia', name: 'Justicia', emoji: '⚖️' },
  { id: 'administrativo', name: 'Administrativo', emoji: '📂' },
  { id: 'sanitario', name: 'Sanitario', emoji: '🏥' },
  { id: 'otro', name: 'Otro', emoji: '📚' },
];

export function OnboardingModal({ user, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState(user.displayName?.split(' ')[0] || '');
  const [gender, setGender] = useState<'Opositor' | 'Opositora' | null>(user.gender || null);
  const [oppositionType, setOppositionType] = useState<string | null>(user.oppositionType || null);
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    if (!gender || !oppositionType || !displayName.trim()) return;
    setLoading(true);
    try {
      const updates = {
        displayName: displayName.trim(),
        gender,
        oppositionType,
        onboardingCompleted: true,
      } as Partial<User>;
      
      await api.updateUserProfile(user.id, updates);
      onComplete({ ...user, ...updates });
    } catch (error) {
      console.error("Error saving onboarding data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 dark:border-slate-700">
        <div className="p-8">
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="text-center">
                <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <UserIcon size={32} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">¿Cómo te llamas?</h2>
                <p className="text-slate-600 dark:text-slate-400">Queremos saber cómo dirigirte a ti en la plataforma.</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Tu nombre (sin apellidos)</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ej: Juan, María..."
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:border-indigo-500 outline-none text-slate-900 dark:text-white font-medium transition-all"
                  autoFocus
                />
              </div>

              <button
                disabled={!displayName.trim()}
                onClick={() => setStep(2)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all"
              >
                Siguiente <ArrowRight size={20} />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center">
                <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <UserIcon size={32} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">¡Hola, {displayName.split(' ')[0]}!</h2>
                <p className="text-slate-600 dark:text-slate-400">¿Cómo prefieres que nos refiramos a ti?</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setGender('Opositor')}
                  className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${
                    gender === 'Opositor'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                      : 'border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className="text-4xl">👨‍🎓</span>
                  <span className="font-bold">Opositor</span>
                </button>
                <button
                  onClick={() => setGender('Opositora')}
                  className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${
                    gender === 'Opositora'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                      : 'border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className="text-4xl">👩‍🎓</span>
                  <span className="font-bold">Opositora</span>
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold py-4 rounded-2xl transition-all"
                >
                  Atrás
                </button>
                <button
                  disabled={!gender}
                  onClick={() => setStep(3)}
                  className="flex-[2] bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all"
                >
                  Siguiente <ArrowRight size={20} />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center">
                <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <GraduationCap size={32} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">¿Qué estás estudiando?</h2>
                <p className="text-slate-600 dark:text-slate-400">Adaptaremos los iconos y mensajes a tu oposición.</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto p-1">
                {OPPOSITION_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setOppositionType(opt.id)}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      oppositionType === opt.id
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                        : 'border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span className="text-3xl">{opt.emoji}</span>
                    <span className="text-xs font-bold text-center">{opt.name}</span>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold py-4 rounded-2xl transition-all"
                >
                  Atrás
                </button>
                <button
                  disabled={!oppositionType || loading}
                  onClick={handleComplete}
                  className="flex-[2] bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all"
                >
                  {loading ? 'Guardando...' : '¡Empezar!'} <CheckCircle2 size={20} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
