import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { TestSession } from '../types';
import { History, Calendar, Target, CheckCircle2, XCircle, ChevronRight, BookOpen, Clock } from 'lucide-react';

interface TestHistoryProps {
  userId: string;
}

export function TestHistory({ userId }: TestHistoryProps) {
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = api.subscribeToTestSessions(userId, (data) => {
      setSessions(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userId]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedSession(expandedSession === id ? null : id);
  };

  if (loading) return <div className="text-center py-12 text-slate-500">Cargando historial...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
          <History size={24} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Historial de Tests</h2>
      </div>
 
      {sessions.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 p-12 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-center">
          <History className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={48} />
          <p className="text-slate-500 dark:text-slate-400">Aún no has completado ningún test.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session) => (
            <div 
              key={session.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all overflow-hidden"
            >
              <div 
                className="p-6 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                onClick={() => toggleExpand(session.id)}
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
                    <Calendar size={14} />
                    {formatDate(session.completedAt)}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {session.topics.map((topic, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-full flex items-center gap-1">
                        <BookOpen size={10} />
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
 
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                        <CheckCircle2 size={16} />
                        {session.correctCount}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">Aciertos</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold">
                        <XCircle size={16} />
                        {session.incorrectCount}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">Fallos</div>
                    </div>
                    {session.blankCount !== undefined && (
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-slate-400 dark:text-slate-500 font-bold">
                          <div className="w-3 h-3 rounded-full border-2 border-slate-300 dark:border-slate-600" />
                          {session.blankCount}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">Blancos</div>
                      </div>
                    )}
                  </div>
 
                  <div className="h-12 w-px bg-slate-100 dark:bg-slate-700 hidden md:block" />
 
                  <div className="text-center px-4 flex items-center gap-4">
                    <div>
                      <div className={`text-2xl font-black ${session.score >= 5 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-500 dark:text-rose-400'}`}>
                        {session.score.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">Nota Final</div>
                    </div>
                    <ChevronRight className={`text-slate-400 dark:text-slate-500 transition-transform ${expandedSession === session.id ? 'rotate-90' : ''}`} />
                  </div>
                </div>
              </div>
 
              {expandedSession === session.id && session.topicStats && (
                <div className="px-6 pb-6 pt-2 border-t border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                    <Target size={16} className="text-indigo-500 dark:text-indigo-400" />
                    Desglose por Tema
                  </h4>
                  <div className="grid gap-3 md:grid-cols-2">
                    {session.topicStats.map((stat, idx) => (
                      <div key={idx} className="bg-white dark:bg-slate-700 p-3 rounded-xl border border-slate-100 dark:border-slate-600 shadow-sm text-sm">
                        <div className="font-medium text-slate-800 dark:text-slate-200 mb-2 truncate" title={stat.topic}>
                          {stat.topic}
                        </div>
                        <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                          <div className="flex gap-3">
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1" title="Aciertos">
                              <CheckCircle2 size={14} /> {stat.correctCount}
                            </span>
                            <span className="text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1" title="Fallos">
                              <XCircle size={14} /> {stat.incorrectCount}
                            </span>
                            <span className="text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1" title="Blancos">
                              <div className="w-2.5 h-2.5 rounded-full border-2 border-slate-300 dark:border-slate-600" /> {stat.blankCount}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400" title="Tiempo medio por pregunta">
                            <Clock size={14} />
                            {stat.averageTime.toFixed(1)}s
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
