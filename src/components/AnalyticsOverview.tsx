import React, { useEffect, useState } from 'react';
import { TestSession } from '../types';
import { analyzeTopics, TopicAnalytics } from '../lib/analytics';
import { api } from '../lib/api';
import { TrendingUp, TrendingDown, Minus, Clock, Target, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AnalyticsOverviewProps {
  userId: string;
}

export function AnalyticsOverview({ userId }: AnalyticsOverviewProps) {
  const [analytics, setAnalytics] = useState<TopicAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = api.subscribeToTestSessions(userId, (sessions) => {
      const results = analyzeTopics(sessions);
      setAnalytics(results);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userId]);

  if (loading) {
    return <div className="animate-pulse flex space-x-4">Cargando analíticas...</div>;
  }

  if (analytics.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 text-center text-gray-500 dark:text-slate-400">
        No hay suficientes datos. Completa algunos tests para ver tus analíticas por tema.
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'mastered': return 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'critical': return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800';
      default: return 'bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'mastered': return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'critical': return <AlertCircle className="w-5 h-5 text-red-600" />;
      default: return <Target className="w-5 h-5 text-amber-600" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-emerald-600" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-600" />;
      default: return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <Target className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        Rendimiento por Tema
      </h2>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {analytics.map((topic) => (
          <div 
            key={topic.topic} 
            className={`rounded-xl border p-5 transition-all hover:shadow-md ${getStatusColor(topic.status)} bg-opacity-50`}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2" title={topic.topic}>
                {topic.topic}
              </h3>
              {getStatusIcon(topic.status)}
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-slate-400 font-medium">Precisión</span>
                  <span className="font-bold">{topic.accuracy.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-white/50 dark:bg-slate-900/50 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      topic.status === 'mastered' ? 'bg-emerald-500' : 
                      topic.status === 'critical' ? 'bg-red-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${topic.accuracy}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-slate-400">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{topic.averageTime.toFixed(1)}s / preg</span>
                </div>
                <div className="flex items-center gap-1" title={`Tendencia: ${topic.trend}`}>
                  {getTrendIcon(topic.trend)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
