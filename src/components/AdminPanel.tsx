import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { User } from '../types';
import { Users, Shield, BookOpen, ChevronDown, ChevronUp, Search, CheckCircle2, Upload, Database, AlertCircle, Loader2 } from 'lucide-react';

export function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportStatus(null);
    try {
      const text = await file.text();
      const questions = JSON.parse(text);
      
      if (!Array.isArray(questions)) {
        throw new Error('El archivo JSON debe contener un array de preguntas.');
      }

      const result = await api.importQuestions(questions);
      if (result.success) {
        setImportStatus({ success: true, message: `Se han importado ${result.count} preguntas correctamente.` });
      } else {
        setImportStatus({ success: false, message: 'Error al importar las preguntas.' });
      }
    } catch (error) {
      console.error('Error importing JSON:', error);
      setImportStatus({ success: false, message: error instanceof Error ? error.message : 'Error al procesar el archivo JSON.' });
    } finally {
      setImporting(false);
      // Reset input
      e.target.value = '';
    }
  };

  useEffect(() => {
    const unsubUsers = api.subscribeToUsers((data) => {
      setUsers(data);
      setLoading(false);
    });

    const unsubQuestions = api.subscribeToQuestions('admin', [], (questions) => {
      const uniqueTopics = Array.from(new Set(questions.map(q => q.topic))).sort();
      setTopics(uniqueTopics);
    });

    return () => {
      unsubUsers();
      unsubQuestions();
    };
  }, []);

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'student' | 'pending') => {
    try {
      await api.updateUserRole(userId, newRole);
    } catch (error) {
      alert('Error al cambiar el rol del usuario.');
    }
  };

  const togglePermission = async (userId: string, currentPermissions: string[], topic: string) => {
    let newPermissions: string[];
    if (currentPermissions.includes(topic)) {
      newPermissions = currentPermissions.filter(p => p !== topic);
    } else {
      newPermissions = [...currentPermissions, topic];
    }
    try {
      await api.updateUserPermissions(userId, newPermissions);
    } catch (error) {
      alert('Error al actualizar permisos.');
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="text-center py-12 text-slate-500">Cargando panel de administración...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
          <Users size={24} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Gestión de Usuarios</h2>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Buscar por nombre o email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
        />
      </div>

      <div className="grid gap-4">
        {/* Database Maintenance Section */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6 mb-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
              <Database size={20} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Mantenimiento de Base de Datos</h3>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="space-y-1">
              <h4 className="font-bold text-slate-900 dark:text-white">Importar Preguntas (JSON)</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400">Sube un archivo .json para añadir preguntas masivamente.</p>
            </div>
            
            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={handleImportJson}
                className="hidden"
                id="json-import-input"
                disabled={importing}
              />
              <label
                htmlFor="json-import-input"
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all cursor-pointer shadow-sm ${
                  importing 
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
                }`}
              >
                {importing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    Seleccionar Archivo
                  </>
                )}
              </label>
            </div>
          </div>

          {importStatus && (
            <div className={`mt-4 p-4 rounded-xl flex items-start gap-3 border ${
              importStatus.success 
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                : 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800 text-rose-700 dark:text-rose-400'
            }`}>
              {importStatus.success ? <CheckCircle2 size={20} className="shrink-0" /> : <AlertCircle size={20} className="shrink-0" />}
              <p className="text-sm font-medium">{importStatus.message}</p>
            </div>
          )}
        </div>

        {filteredUsers.map((user) => (
          <div 
            key={user.id}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden"
          >
            <div 
              className="p-4 md:p-6 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
              onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
            >
              <div className="flex items-center gap-4">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName} className="w-12 h-12 rounded-full border-2 border-slate-100 dark:border-slate-700" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400">
                    <Users size={24} />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">{user.displayName || 'Usuario'}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                  user.role === 'admin' 
                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' 
                    : user.role === 'student'
                    ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    : 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
                }`}>
                  <Shield size={14} />
                  {user.role === 'admin' ? 'Administrador' : user.role === 'student' ? 'Estudiante' : 'Pendiente'}
                </div>
                <ChevronDown size={20} className={`text-slate-400 transition-transform ${expandedUser === user.id ? 'rotate-180' : ''}`} />
              </div>
            </div>

            {expandedUser === user.id && (
              <div className="px-6 pb-6 pt-2 border-t border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 animate-in slide-in-from-top-2">
                <div className="space-y-6">
                  {/* Role Management */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Gestionar Acceso</h4>
                    <div className="flex flex-wrap gap-2">
                      {user.role === 'pending' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRoleChange(user.id, 'student');
                          }}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-all shadow-sm"
                        >
                          Autorizar como Estudiante
                        </button>
                      )}
                      
                      {user.role !== 'admin' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRoleChange(user.id, 'admin');
                          }}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-all shadow-sm"
                        >
                          Hacer Administrador
                        </button>
                      )}

                      {user.role === 'admin' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRoleChange(user.id, 'student');
                          }}
                          className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg text-sm font-bold transition-all"
                        >
                          Quitar Admin (Hacer Estudiante)
                        </button>
                      )}

                      {user.role !== 'pending' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRoleChange(user.id, 'pending');
                          }}
                          className="px-4 py-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800 hover:bg-rose-100 rounded-lg text-sm font-bold transition-all"
                        >
                          Bloquear Acceso
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Permissions Management */}
                  {user.role === 'student' && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <BookOpen size={14} />
                        Permisos de Temas ({user.permissions?.length || 0})
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {topics.map(topic => {
                          const hasPermission = user.permissions?.includes(topic);
                          return (
                            <button
                              key={topic}
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePermission(user.id, user.permissions || [], topic);
                              }}
                              className={`flex items-center justify-between p-2 rounded-lg text-xs font-medium transition-all border ${
                                hasPermission
                                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                                  : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-200'
                              }`}
                            >
                              <span className="truncate mr-2">{topic}</span>
                              {hasPermission && <CheckCircle2 size={14} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
