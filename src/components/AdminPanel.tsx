import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { User, Feedback } from '../types';
import { Users, Shield, BookOpen, ChevronDown, ChevronUp, Search, CheckCircle2, Upload, Database, AlertCircle, Loader2, MessageSquare, Trash2, Clock } from 'lucide-react';

interface AdminPanelProps {
  userId: string;
}

export function AdminPanel({ userId }: AdminPanelProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'feedback'>('users');
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

      const result = await api.importQuestions(userId, questions);
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

    const unsubQuestions = api.subscribeToQuestions(userId, 'admin', [], (questions) => {
      const uniqueTopics = Array.from(new Set(questions.map(q => q.topic))).sort();
      setTopics(uniqueTopics);
    });

    const unsubFeedback = api.subscribeToFeedback((data) => {
      setFeedback(data);
    });

    return () => {
      unsubUsers();
      unsubQuestions();
      unsubFeedback();
    };
  }, [userId]);

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

  const handleDeleteFeedback = async (feedbackId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este feedback?')) {
      try {
        await api.deleteFeedback(feedbackId);
      } catch (error) {
        alert('Error al eliminar el feedback.');
      }
    }
  };

  const handleToggleFeedbackStatus = async (feedbackId: string, currentStatus: 'pending' | 'reviewed') => {
    try {
      await api.updateFeedbackStatus(feedbackId, currentStatus === 'pending' ? 'reviewed' : 'pending');
    } catch (error) {
      alert('Error al actualizar el estado del feedback.');
    }
  };

  const handleExportQuestions = async () => {
    try {
      const allQuestions = await api.getAllQuestions(userId, 'admin');
      const blob = new Blob([JSON.stringify(allQuestions, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_preguntas_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    } catch (error) {
      alert('Error al exportar las preguntas.');
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="text-center py-12 text-slate-500">Cargando panel de administración...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <Shield size={24} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Panel de Administración</h1>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'users' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
          >
            Usuarios
          </button>
          <button
            onClick={() => setActiveTab('feedback')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'feedback' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
          >
            Feedback
          </button>
        </div>
      </div>

      {activeTab === 'users' ? (
        <div className="space-y-6">
          {/* Database Maintenance Section */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
                <Database size={20} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Mantenimiento de Base de Datos</h3>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 dark:text-white">Exportar Preguntas (JSON)</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">Descarga una copia de seguridad de todas las preguntas.</p>
              </div>
              <button 
                onClick={handleExportQuestions}
                className="flex items-center gap-2 px-6 py-2.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
              >
                <Database size={18} />
                Exportar Todo
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 dark:text-white">Importar Preguntas (JSON)</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">Sube un archivo .json para añadir preguntas masivamente.</p>
                <button 
                  onClick={() => {
                    const template = [{
                      text: "Ejemplo de pregunta",
                      options: ["Opción A", "Opción B", "Opción C", "Opción D"],
                      correctOptionIndex: 0,
                      classification: "Legislativo",
                      topic: "Tema 1"
                    }];
                    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'plantilla_preguntas.json';
                    a.click();
                  }}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                >
                  Descargar Plantilla JSON
                </button>
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

          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                <Users size={20} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Gestión de Usuarios</h3>
            </div>

            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar usuarios por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>

            <div className="space-y-4">
              {filteredUsers.map(user => (
                <div key={user.id} className="border border-slate-100 dark:border-slate-700 rounded-xl overflow-hidden">
                  <div 
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                  >
                    <div className="flex items-center gap-3">
                      <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700" referrerPolicy="no-referrer" />
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{user.displayName}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{user.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        user.role === 'admin' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 
                        user.role === 'pending' ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400' :
                        'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                      }`}>
                        {user.role}
                      </div>
                      {expandedUser === user.id ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                    </div>
                  </div>

                  {expandedUser === user.id && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Role Management */}
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Shield size={14} />
                            Rol de Usuario
                          </h4>
                          <div className="flex gap-2">
                            {(['student', 'admin', 'pending'] as const).map(role => (
                              <button
                                key={role}
                                onClick={() => handleRoleChange(user.id, role)}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${user.role === role ? 'bg-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-indigo-500'}`}
                              >
                                {role.toUpperCase()}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* User Info */}
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <AlertCircle size={14} />
                            Información Adicional
                          </h4>
                          <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Género:</span>
                              <span className="font-medium text-slate-900 dark:text-white capitalize">{user.gender || 'No definido'}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Oposición:</span>
                              <span className="font-medium text-slate-900 dark:text-white capitalize">{user.oppositionType || 'No definido'}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Permissions Management */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <BookOpen size={14} />
                          Permisos de Temas
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {topics.map(topic => (
                            <button
                              key={topic}
                              onClick={() => togglePermission(user.id, user.permissions || [], topic)}
                              className={`px-3 py-2 rounded-lg text-[10px] font-medium text-left transition-all border ${
                                (user.permissions || []).includes(topic)
                                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                  : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                              }`}
                            >
                              {topic}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="text-indigo-500" size={20} />
              Feedback de Usuarios
            </h2>
            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-full text-xs font-bold">
              {feedback.length} Mensajes
            </span>
          </div>

          <div className="space-y-4">
            {feedback.length === 0 ? (
              <div className="text-center py-12 text-slate-500">No hay feedback enviado todavía.</div>
            ) : (
              feedback.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(item => (
                <div key={item.id} className={`p-4 border rounded-xl space-y-3 transition-all ${item.status === 'reviewed' ? 'bg-slate-50/50 dark:bg-slate-900/20 border-slate-100 dark:border-slate-800 opacity-75' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        item.type === 'complaint' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                        item.type === 'improvement' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' :
                        'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}>
                        {item.type === 'complaint' ? 'Queja' : item.type === 'improvement' ? 'Mejora' : 'Otro'}
                      </div>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                      {item.status === 'reviewed' && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                          <CheckCircle2 size={10} />
                          Revisado
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleToggleFeedbackStatus(item.id!, item.status || 'pending')}
                        className={`p-1.5 rounded-lg transition-colors ${item.status === 'reviewed' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'}`}
                        title={item.status === 'reviewed' ? "Marcar como pendiente" : "Marcar como revisado"}
                      >
                        <CheckCircle2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteFeedback(item.id!)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                    "{item.message}"
                  </p>
                  
                  <div className="flex items-center gap-2 pt-1">
                    {item.userPhoto ? (
                      <img src={item.userPhoto} alt="" className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                        <Users size={12} className="text-slate-400" />
                      </div>
                    )}
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{item.userName}</span>
                    <span className="text-[10px] text-slate-400">({item.userEmail})</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
