import React, { useState, useEffect, useRef } from 'react';
import { Search, X, FileText, Database, ChevronRight, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import { Question, TopicResource } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userRole: 'admin' | 'student';
  permissions: string[];
}

export function GlobalSearch({ isOpen, onClose, userId, userRole, permissions }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    questions: Question[];
    resources: TopicResource[];
  }>({ questions: [], resources: [] });
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResults({ questions: [], resources: [] });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // This would need to be handled in App.tsx or via a global event
        }
      }
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query.trim() || query.length < 3) {
      setResults({ questions: [], resources: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        // In a real app, we'd have a backend search. 
        // Here we'll fetch all and filter client-side for the demo.
        const [allQuestions, allResources] = await Promise.all([
          new Promise<Question[]>((resolve) => api.subscribeToQuestions(userId, userRole, permissions, resolve)),
          // We don't have a subscribeToAllResources, so we'll just search questions for now 
          // and maybe add resource search if we implement a list method in api.ts
          Promise.resolve([]) 
        ]);

        const filteredQuestions = allQuestions.filter(q => 
          q.text.toLowerCase().includes(query.toLowerCase()) ||
          q.topic.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 10);

        setResults({ questions: filteredQuestions, resources: [] });
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4 sm:px-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700"
      >
        <div className="flex items-center px-4 py-4 border-b border-slate-200 dark:border-slate-700">
          <Search className="text-slate-400 mr-3" size={20} />
          <input 
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar preguntas, temas o contenido..."
            className="flex-1 bg-transparent border-none outline-none text-slate-900 dark:text-white placeholder-slate-400 text-lg"
          />
          {isSearching ? (
            <Loader2 className="animate-spin text-indigo-600" size={20} />
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-slate-400 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-900">ESC</span>
            </div>
          )}
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {query.length > 0 && query.length < 3 && (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
              Escribe al menos 3 caracteres para buscar...
            </div>
          )}

          {query.length >= 3 && results.questions.length === 0 && !isSearching && (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
              No se encontraron resultados para "{query}"
            </div>
          )}

          {results.questions.length > 0 && (
            <div className="mb-4">
              <h3 className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Preguntas</h3>
              <div className="space-y-1">
                {results.questions.map((q) => (
                  <button 
                    key={q.id}
                    className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left group"
                    onClick={() => {
                      // In a real app, we'd navigate to the question or open a modal
                      alert(`Pregunta seleccionada: ${q.text.substring(0, 50)}...`);
                      onClose();
                    }}
                  >
                    <div className="mt-1 p-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                      <Database size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-1">{q.text}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{q.topic} • {q.classification}</p>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-400 mt-2" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Placeholder for Resources results */}
          {results.resources.length > 0 && (
            <div>
              <h3 className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Documentos PDF</h3>
              {/* ... similar mapping for resources ... */}
            </div>
          )}
        </div>

        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <div className="flex gap-4">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <span className="border border-slate-200 dark:border-slate-700 px-1 rounded bg-white dark:bg-slate-800">↑↓</span>
              Navegar
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <span className="border border-slate-200 dark:border-slate-700 px-1 rounded bg-white dark:bg-slate-800">ENTER</span>
              Seleccionar
            </div>
          </div>
          <div className="text-[10px] text-slate-400">
            Buscador Inteligente v1.0
          </div>
        </div>
      </motion.div>
    </div>
  );
}
