import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Question, TestSession } from '../types';
import { motion } from 'motion/react';
import { Info, TrendingUp, AlertCircle, Clock } from 'lucide-react';
import { analyzeTopics } from '../lib/analytics';

interface KnowledgeHeatmapProps {
  userId: string;
  userRole: 'admin' | 'student';
  permissions: string[];
}

export function KnowledgeHeatmap({ userId, userRole, permissions }: KnowledgeHeatmapProps) {
  const [stats, setStats] = useState<{ topic: string; mastery: number; count: number; averageTime?: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let questionsData: Question[] = [];
    let sessionsData: TestSession[] = [];
    let progressData: Record<string, any> = {};
    let questionsLoaded = false;
    let sessionsLoaded = false;
    let progressLoaded = false;

    const processData = () => {
      if (!questionsLoaded || !sessionsLoaded || !progressLoaded) return;

      const topicStats: Record<string, { totalMastery: number; totalQuestions: number; attemptedQuestions: number }> = {};
      
      questionsData.forEach(q => {
        const topic = q.topic || 'Sin clasificar';
        if (!topicStats[topic]) {
          topicStats[topic] = { totalMastery: 0, totalQuestions: 0, attemptedQuestions: 0 };
        }
        topicStats[topic].totalQuestions++;
        
        const progress = progressData[q.id] || { hits: 0, misses: 0 };
        const totalAttempts = (progress.hits || 0) + (progress.misses || 0);
        
        if (totalAttempts > 0) {
          topicStats[topic].attemptedQuestions++;
        }
        
        const masteryLevel = totalAttempts > 0 ? (progress.hits || 0) / totalAttempts : 0;
        
        topicStats[topic].totalMastery += masteryLevel;
      });

      const analytics = analyzeTopics(sessionsData);
      const timeMap = new Map(analytics.map(a => [a.topic, a.averageTime]));

      const processedStats = Object.entries(topicStats)
        .filter(([_, data]) => data.attemptedQuestions > 0)
        .map(([topic, data]) => ({
        topic,
        mastery: (data.totalMastery / data.totalQuestions) * 100,
        count: data.totalQuestions,
        averageTime: timeMap.get(topic)
      })).sort((a, b) => b.mastery - a.mastery);

      setStats(processedStats);
      setLoading(false);
    };

    api.getUserProgress(userId).then(progress => {
      progressData = progress;
      progressLoaded = true;
      processData();
    });

    const unsubQuestions = api.subscribeToQuestions(userId, userRole, permissions, (questions) => {
      questionsData = questions;
      questionsLoaded = true;
      processData();
    });

    const unsubSessions = api.subscribeToTestSessions(userId, (sessions) => {
      sessionsData = sessions;
      sessionsLoaded = true;
      processData();
    });

    return () => {
      unsubQuestions();
      unsubSessions();
    };
  }, [userId]);

  const getIntensityClass = (mastery: number) => {
    if (mastery === 0) return 'bg-slate-100 dark:bg-slate-800';
    if (mastery < 20) return 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400';
    if (mastery < 40) return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400';
    if (mastery < 60) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
    if (mastery < 80) return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400';
    return 'bg-emerald-500 text-white';
  };

  if (loading) return <div className="h-48 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Mapa de Calor de Conocimiento
            <span title="Nivel de dominio basado en tus aciertos y repetición espaciada">
              <Info size={16} className="text-slate-400 cursor-help" />
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Visualiza tus áreas fuertes y las que necesitan refuerzo</p>
        </div>
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg">
          <TrendingUp size={16} />
          <span className="text-sm font-bold">Progreso Real</span>
        </div>
      </div>

      {stats.length === 0 ? (
        <div className="py-12 text-center">
          <AlertCircle size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 dark:text-slate-400">No hay suficientes datos para generar el mapa de calor.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {stats.map((s, idx) => (
            <motion.div 
              key={s.topic}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              className={`p-4 rounded-xl flex flex-col justify-between h-32 transition-all hover:scale-105 cursor-default ${getIntensityClass(s.mastery)}`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-70 truncate">{s.topic}</span>
              <div>
                <div className="text-2xl font-black">{Math.round(s.mastery)}%</div>
                <div className="flex items-center justify-between mt-1">
                  <div className="text-[10px] opacity-70 font-medium">{s.count} preguntas</div>
                  {s.averageTime !== undefined && s.averageTime > 0 && (
                    <div className="text-[10px] opacity-70 font-medium flex items-center gap-0.5" title="Tiempo medio por pregunta">
                      <Clock size={10} />
                      {s.averageTime.toFixed(1)}s
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-4 pt-6 border-t border-slate-100 dark:border-slate-700">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Leyenda:</span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-rose-100 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800" />
            <span className="text-[10px] text-slate-500">Crítico</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800" />
            <span className="text-[10px] text-slate-500">En proceso</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800" />
            <span className="text-[10px] text-slate-500">Dominado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-emerald-500" />
            <span className="text-[10px] text-slate-500">Experto</span>
          </div>
        </div>
      </div>
    </div>
  );
}
