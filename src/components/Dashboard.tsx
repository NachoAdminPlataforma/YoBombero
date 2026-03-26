import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Question } from '../types';
import { BrainCircuit, Play, Settings2, Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import { KnowledgeHeatmap } from './KnowledgeHeatmap';
import { InfoTooltip } from './InfoTooltip';
import { User as AppUser } from '../types';

interface DashboardProps {
  onStartTest: (questions: Question[]) => void;
  userId: string;
  userRole: 'admin' | 'student';
  permissions: string[];
  appUser: AppUser | null;
}

export function Dashboard({ onStartTest, userId, userRole, permissions, appUser }: DashboardProps) {
  const [urgentCount, setUrgentCount] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [topicsData, setTopicsData] = useState<{topic: string, classification: string}[]>([]);
  
  const [selectedTopics, setSelectedTopics] = useState<{topic: string, classification: string, count: number}[]>([]);
  const [testMode, setTestMode] = useState<'srs' | 'balanced'>('srs');
  const [numQuestions, setNumQuestions] = useState<number>(10);
  const [loading, setLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const getOppositionEmoji = (type?: string) => {
    switch (type) {
      case 'bombero': return '🚒';
      case 'policia': return '👮';
      case 'guardia_civil': return '🚔';
      case 'justicia': return '⚖️';
      case 'administrativo': return '📂';
      case 'sanitario': return '🏥';
      default: return '📚';
    }
  };

  const getWelcomeMessage = () => {
    if (!appUser) return "¡Hola!";
    const name = appUser.displayName.split(' ')[0] || '';
    const emoji = getOppositionEmoji(appUser.oppositionType);
    
    let specificMsg = "";
    if (appUser.oppositionType === 'bombero') specificMsg = "¡A por el fuego! 🔥";
    else if (appUser.oppositionType === 'policia') specificMsg = "¡Servir y proteger! 👮";
    else if (appUser.oppositionType === 'justicia') specificMsg = "¡Hágase justicia! ⚖️";
    
    const messages = [
      `¡Vamos con todo, ${name}! ${emoji}`,
      `Cada pregunta cuenta, ${name}. ¡A por la plaza! 🎯`,
      `Hoy es un gran día para avanzar, ${name}. 🚀`,
      `Tu esfuerzo de hoy es tu éxito de mañana. 🌟`,
      specificMsg
    ].filter(m => m !== "");
    
    return messages[Math.floor(Math.random() * messages.length)];
  };

  useEffect(() => {
    const unsubscribe = api.subscribeToTopics(userId, userRole, permissions, (t) => {
      setTopicsData(t);
    });
    
    const unsubQuestions = api.subscribeToQuestions(userId, userRole, permissions, (questions) => {
      const now = new Date().toISOString();
      
      api.getUserProgress(userId).then(progress => {
        const questionsWithProgress = questions
          .map(q => ({
            ...q,
            ...(progress[q.id] || { hits: 0, misses: 0, reps: 0, easeFactor: 2.5, interval: 0, nextReviewDate: new Date().toISOString() })
          }));

        const reviewQuestions = questionsWithProgress.filter(q => 
          (q.hits > 0 || q.misses > 0) && 
          (q.nextReview || q.nextReviewDate) <= now
        );
        const newQuestions = questionsWithProgress.filter(q => q.hits === 0 && q.misses === 0);
        
        setUrgentCount(reviewQuestions.length + newQuestions.length);
        setNewCount(newQuestions.length);
        setReviewCount(reviewQuestions.length);
      });
    });

    return () => {
      unsubscribe();
      unsubQuestions();
    };
  }, [userId, userRole, permissions]);

  const handleUrgentReview = async () => {
    setLoading(true);
    const urgent = await api.getUrgentQuestions(userId, userRole, permissions);
    setLoading(false);
    if (urgent.length > 0) {
      onStartTest(urgent);
    } else {
      alert('¡No hay preguntas urgentes para repasar hoy!');
    }
  };

  const handleCustomTest = async () => {
    if (selectedTopics.length === 0) {
      alert('Selecciona al menos un tema.');
      return;
    }
    setLoading(true);
    try {
      const questions = await api.getCustomTest(userId, userRole, permissions, selectedTopics, testMode, numQuestions);
      setLoading(false);
      if (questions.length > 0) {
        onStartTest(questions);
      } else {
        alert('No se encontraron preguntas para los temas seleccionados.');
      }
    } catch (error) {
      setLoading(false);
      console.error(error);
      alert('Error al generar el test.');
    }
  };

  const toggleTopic = (topic: string, classification: string) => {
    setSelectedTopics(prev => {
      const exists = prev.find(t => t.topic === topic && t.classification === classification);
      if (exists) {
        const newTopics = prev.filter(t => !(t.topic === topic && t.classification === classification));
        return newTopics;
      } else {
        // Default count is 0, meaning it will use the distributed total if not manually set
        return [...prev, { topic, classification, count: 0 }];
      }
    });
  };

  const updateTopicCount = (topic: string, classification: string, count: number) => {
    setSelectedTopics(prev => prev.map(t => 
      (t.topic === topic && t.classification === classification) ? { ...t, count } : t
    ));
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  const totalManualQuestions = selectedTopics.reduce((acc, t) => acc + (t.count || 0), 0);
  const effectiveTotal = totalManualQuestions > 0 ? totalManualQuestions : numQuestions;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            {getWelcomeMessage()}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Tu camino hacia la plaza continúa aquí.</p>
        </div>
      </div>

      {/* Knowledge Heatmap */}
      <KnowledgeHeatmap userId={userId} userRole={userRole} permissions={permissions} />

      {/* Urgent Review Section */}
      <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 mb-4">
          <BrainCircuit size={24} className="md:w-8 md:h-8" />
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-2">Repaso Espaciado</h2>
        <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mb-4">
          Tienes <strong className="text-indigo-600 dark:text-indigo-400 text-lg">{urgentCount}</strong> preguntas pendientes de repaso hoy.
        </p>
        <div className="flex flex-wrap justify-center gap-3 md:gap-6 mb-6 text-xs md:text-sm">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-medium border border-emerald-100 dark:border-emerald-800">
            <span className="font-bold text-emerald-800 dark:text-emerald-300">{newCount}</span> Nuevas
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-medium border border-amber-100 dark:border-amber-800">
            <span className="font-bold text-amber-800 dark:text-amber-300">{reviewCount}</span> Para Repasar
          </div>
        </div>
        <button
          onClick={handleUrgentReview}
          disabled={loading || urgentCount === 0}
          className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 px-8 rounded-xl transition-colors inline-flex items-center justify-center gap-2"
        >
          <Play size={20} />
          Iniciar Repaso Urgente
        </button>
      </div>

      {/* Custom Test Section */}
      <div className="mt-12 bg-white dark:bg-slate-800 p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Settings2 className="text-slate-400 dark:text-slate-500" />
            <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">Generador a la Carta</h2>
            <InfoTooltip 
              title="Modos de Test" 
              content={
                <>
                  <p><strong>Modo Anki:</strong> Utiliza un algoritmo de repaso espaciado. Te mostrará más a menudo las preguntas que sueles fallar y menos las que ya dominas.</p>
                  <p><strong>Modo Equilibrado:</strong> También usa el algoritmo inteligente, pero garantiza que verás un número específico de preguntas de cada tema que selecciones, ideal para repasos generales.</p>
                </>
              }
            />
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 tour-test-modes">
            <button
              onClick={() => setTestMode('srs')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                testMode === 'srs' 
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              Modo Anki
            </button>
            <button
              onClick={() => setTestMode('balanced')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                testMode === 'balanced' 
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              Modo Equilibrado
            </button>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                Número total de preguntas
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="500"
                  disabled={totalManualQuestions > 0}
                  value={totalManualQuestions > 0 ? totalManualQuestions : numQuestions}
                  onChange={(e) => setNumQuestions(parseInt(e.target.value) || 0)}
                  className={`w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white ${totalManualQuestions > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
                {totalManualQuestions > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">Manual</span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-1 italic">
                {testMode === 'srs' 
                  ? 'El modo Anki prioriza las preguntas más urgentes según el algoritmo.' 
                  : 'En el modo equilibrado también se aplica el algoritmo pero asegurando el número de preguntas que quieras hacer de cada tema.'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {['Legislativo', 'Específico'].map(classification => {
              const classTopics = topicsData.filter(t => t.classification === classification);
              if (classTopics.length === 0) return null;

              const isExpanded = expandedSections.includes(classification);
              const selectedInClass = selectedTopics.filter(st => st.classification === classification).length;

              return (
                <div key={classification} className="border border-slate-100 dark:border-slate-700 rounded-2xl overflow-hidden">
                  <button 
                    onClick={() => toggleSection(classification)}
                    className="w-full flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-black text-slate-600 dark:text-slate-400 uppercase tracking-[0.2em]">
                        {classification}
                      </h3>
                      {selectedInClass > 0 && (
                        <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {selectedInClass} seleccionados
                        </span>
                      )}
                    </div>
                    {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                  </button>

                  {isExpanded && (
                    <div className="p-4 bg-white dark:bg-slate-800 animate-in slide-in-from-top-2 duration-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {classTopics.map(t => {
                          const isSelected = selectedTopics.some(st => st.topic === t.topic && st.classification === t.classification);
                          const selectedData = selectedTopics.find(st => st.topic === t.topic && st.classification === t.classification);
                          
                          return (
                            <div 
                              key={`${t.classification}-${t.topic}`}
                              className={`flex flex-col p-3 border rounded-xl transition-all ${
                                isSelected 
                                  ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800' 
                                  : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600'
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                                <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleTopic(t.topic, t.classification)}
                                    className="w-5 h-5 text-indigo-600 rounded-lg border-slate-300 focus:ring-indigo-500 shrink-0"
                                  />
                                  <span className={`text-sm font-bold truncate ${isSelected ? 'text-indigo-900 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                    {t.topic}
                                  </span>
                                </label>
                              </div>
                              
                              {isSelected && (
                                <div className="flex flex-wrap items-center gap-3 pl-8 animate-in fade-in slide-in-from-left-2">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap">Preguntas:</span>
                                  <div className="flex items-center gap-2">
                                    <input 
                                      type="number"
                                      min="0"
                                      placeholder="Auto"
                                      value={selectedData?.count || ''}
                                      onChange={(e) => updateTopicCount(t.topic, t.classification, parseInt(e.target.value) || 0)}
                                      className="w-20 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                    <span className="text-[10px] text-slate-400 italic whitespace-nowrap">Auto</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={handleCustomTest}
            disabled={loading || selectedTopics.length === 0}
            className="w-full bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-xl shadow-slate-200 dark:shadow-none active:scale-95 flex items-center justify-center gap-3 tour-start-test"
          >
            {loading ? (
              <>Generando...</>
            ) : (
              <>
                <Play size={20} />
                Generar Test Personalizado ({effectiveTotal} preguntas)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
