import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { User, Feedback, SavedPrompt } from '../types';
import { Users, Shield, BookOpen, ChevronDown, ChevronUp, Search, CheckCircle2, Upload, Database, AlertCircle, Loader2, MessageSquare, Trash2, Clock, RefreshCw, AlertTriangle, Sparkles, PenTool, Save, X, FileText, Zap } from 'lucide-react';

interface AdminPanelProps {
  userId: string;
}

export function AdminPanel({ userId }: AdminPanelProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [surveyResponses, setSurveyResponses] = useState<any[]>([]);
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'feedback' | 'survey' | 'prompts'>('users');
  const [userFilter, setUserFilter] = useState<'all' | 'active' | 'pending' | 'blocked'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{id: string, email: string} | null>(null);
  
  // Prompt management state
  const [editingPrompt, setEditingPrompt] = useState<{ id?: string, title: string, content: string, topic?: string } | null>(null);
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);

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

    const unsubSurvey = api.subscribeToSurveyResponses((data) => {
      setSurveyResponses(data);
    });

    const loadPrompts = async () => {
      const data = await api.getSavedPrompts(userId, 'admin', []);
      setSavedPrompts(data);
    };
    loadPrompts();

    return () => {
      unsubUsers();
      unsubQuestions();
      unsubFeedback();
      unsubSurvey();
    };
  }, [userId]);

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'student' | 'pending' | 'blocked') => {
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

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    setUserToDelete({ id: userId, email: userEmail });
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await api.deleteUser(userToDelete.id);
      setUserToDelete(null);
    } catch (error) {
      alert('Error al eliminar el usuario.');
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

  const handleResetOnboarding = async () => {
    setShowResetConfirm(false);
    setImporting(true);
    setImportStatus(null);
    try {
      const result = await api.resetAllUsersOnboarding(userId);
      if (result.success) {
        setImportStatus({
          success: true,
          message: `Se ha reiniciado el onboarding de ${result.count} usuarios correctamente.`
        });
      } else {
        setImportStatus({
          success: false,
          message: "Hubo un error al reiniciar el onboarding."
        });
      }
    } catch (error) {
      console.error("Error resetting onboarding:", error);
      setImportStatus({
        success: false,
        message: "Error de conexión al intentar reiniciar el onboarding."
      });
    } finally {
      setImporting(false);
      setTimeout(() => setImportStatus(null), 5000);
    }
  };

  const handleSavePrompt = async () => {
    if (!editingPrompt || !editingPrompt.title || !editingPrompt.content) return;
    setIsSavingPrompt(true);
    try {
      if (editingPrompt.id) {
        await api.updatePrompt(editingPrompt.id, editingPrompt.title, editingPrompt.content, editingPrompt.topic);
      } else {
        await api.savePrompt(userId, editingPrompt.title, editingPrompt.content, true, editingPrompt.topic);
      }
      const data = await api.getSavedPrompts(userId, 'admin', []);
      setSavedPrompts(data);
      setEditingPrompt(null);
    } catch (error) {
      alert('Error al guardar el prompt.');
    } finally {
      setIsSavingPrompt(false);
    }
  };

  const handleDeletePrompt = async (promptId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este prompt?')) {
      try {
        await api.deletePrompt(promptId);
        const data = await api.getSavedPrompts(userId, 'admin', []);
        setSavedPrompts(data);
      } catch (error) {
        alert('Error al eliminar el prompt.');
      }
    }
  };

  const handleEditPrompt = async (prompt: SavedPrompt) => {
    const content = await api.getPromptContent(prompt.id);
    setEditingPrompt({
      id: prompt.id,
      title: prompt.title,
      content,
      topic: prompt.topic
    });
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.displayName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (userFilter === 'active') return u.role === 'admin' || u.role === 'student';
    if (userFilter === 'pending') return u.role === 'pending';
    if (userFilter === 'blocked') return u.role === 'blocked';
    // By default 'all' excludes blocked users to make it a separate space
    return u.role !== 'blocked';
  });

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
          <button
            onClick={() => setActiveTab('survey')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'survey' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
          >
            Encuesta
          </button>
          <button
            onClick={() => setActiveTab('prompts')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'prompts' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
          >
            Prompts
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
                <h4 className="font-bold text-slate-900 dark:text-white">Reiniciar Onboarding (Global)</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">Fuerza a todos los usuarios (excepto admins) a repetir el proceso de configuración y los devuelve a estado 'Pendiente'.</p>
              </div>
              <div className="flex items-center gap-2">
                {showResetConfirm ? (
                  <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-200">
                    <button 
                      onClick={() => setShowResetConfirm(false)}
                      className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={handleResetOnboarding}
                      className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 transition-all shadow-sm"
                    >
                      Confirmar Reinicio
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setShowResetConfirm(true)}
                    disabled={importing}
                    className="flex items-center gap-2 px-6 py-2.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800 rounded-xl font-bold hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all shadow-sm disabled:opacity-50"
                  >
                    <RefreshCw size={18} className={importing ? 'animate-spin' : ''} />
                    Reiniciar Todo
                  </button>
                )}
              </div>
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
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  <Users size={20} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Gestión de Usuarios</h3>
              </div>
              <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl text-[10px] font-bold uppercase tracking-wider">
                {(['all', 'active', 'pending', 'blocked'] as const).map(filter => (
                  <button
                    key={filter}
                    onClick={() => setUserFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg transition-all ${userFilter === filter ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {filter === 'all' ? 'Todos' : filter === 'active' ? 'Activos' : filter === 'pending' ? 'Pendientes' : 'Papelera'}
                  </button>
                ))}
              </div>
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
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          {user.displayName}
                          {user.sessionId && (
                            <span className="flex h-2 w-2 rounded-full bg-emerald-500" title="Sesión Activa" />
                          )}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{user.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        user.role === 'admin' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 
                        user.role === 'pending' ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400' :
                        user.role === 'blocked' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400' :
                        'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                      }`}>
                        {user.role === 'blocked' ? 'Bloqueado' : user.role}
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
                            {(['student', 'admin', 'pending', 'blocked'] as const).map(role => (
                              <button
                                key={role}
                                onClick={() => handleRoleChange(user.id, role)}
                                className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${
                                  user.role === role 
                                    ? (role === 'blocked' ? 'bg-rose-600 text-white shadow-md' : 'bg-indigo-600 text-white shadow-md') 
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-indigo-500'
                                }`}
                              >
                                {role === 'blocked' ? 'PAPELERA' : role.toUpperCase()}
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

                      {/* Danger Zone */}
                      <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                        <button
                          onClick={async () => {
                            if (window.confirm(`¿Estás seguro de que quieres cerrar la sesión de ${user.displayName}? El usuario tendrá que volver a iniciar sesión.`)) {
                              await api.resetUserSession(user.id);
                              alert('Sesión reseteada correctamente.');
                            }
                          }}
                          className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-all"
                        >
                          <Zap size={14} />
                          Resetear Sesión (Cerrar sesión remota)
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.email)}
                          className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
                        >
                          <Trash2 size={14} />
                          Eliminar Usuario Permanentemente
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : activeTab === 'feedback' ? (
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
      ) : activeTab === 'prompts' ? (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PenTool className="text-indigo-500" size={20} />
              Gestión de Prompts Globales
            </h2>
            <button 
              onClick={() => setEditingPrompt({ title: '', content: '' })}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-sm flex items-center gap-2"
            >
              <PenTool size={14} />
              Nuevo Prompt
            </button>
          </div>

          <div className="space-y-4">
            {savedPrompts.filter(p => p.isAdminPrompt).length === 0 ? (
              <div className="text-center py-12 text-slate-500">No hay prompts globales creados.</div>
            ) : (
              savedPrompts.filter(p => p.isAdminPrompt).map(prompt => (
                <div key={prompt.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between bg-white dark:bg-slate-800/50 hover:border-indigo-300 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-lg">
                      <FileText size={18} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-sm">{prompt.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        {prompt.topic && (
                          <span className="text-[10px] bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            {prompt.topic}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock size={10} />
                          {new Date(prompt.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleEditPrompt(prompt)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <PenTool size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeletePrompt(prompt.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Prompt Editor Modal */}
          {editingPrompt && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {editingPrompt.id ? 'Editar Prompt' : 'Nuevo Prompt Global'}
                  </h3>
                  <button onClick={() => setEditingPrompt(null)} className="text-slate-400 hover:text-slate-600">
                    <X size={20} />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Título del Prompt</label>
                    <input 
                      type="text"
                      value={editingPrompt.title}
                      onChange={(e) => setEditingPrompt({ ...editingPrompt, title: e.target.value })}
                      placeholder="Ej: Generador de preguntas de plazos"
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Tema Asociado (Opcional)</label>
                    <select 
                      value={editingPrompt.topic || ''}
                      onChange={(e) => setEditingPrompt({ ...editingPrompt, topic: e.target.value || undefined })}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
                    >
                      <option value="">Sin tema específico (Global)</option>
                      {topics.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <p className="text-[10px] text-slate-500 mt-1">Si seleccionas un tema, solo los alumnos con permiso en ese tema podrán usar este prompt.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Contenido del Prompt</label>
                    <textarea 
                      value={editingPrompt.content}
                      onChange={(e) => setEditingPrompt({ ...editingPrompt, content: e.target.value })}
                      placeholder="Escribe aquí las instrucciones para la IA..."
                      rows={8}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono text-slate-900 dark:text-white"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Los alumnos podrán aplicar este prompt pero nunca verán este contenido.</p>
                  </div>
                </div>
                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                  <button 
                    onClick={() => setEditingPrompt(null)}
                    className="px-6 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSavePrompt}
                    disabled={isSavingPrompt || !editingPrompt.title || !editingPrompt.content}
                    className="px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSavingPrompt ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Guardar Prompt
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="text-indigo-500" size={20} />
              Resultados de la Encuesta: Generador de Imágenes
            </h2>
            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-full text-xs font-bold">
              {surveyResponses.length} Votos
            </span>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {["Sí, me encantaría tenerlo", "Sí, pero depende del precio", "No me interesa", "Prefiero otras funcionalidades antes"].map(option => {
              const count = surveyResponses.filter(r => r.answer === option).length;
              const percentage = surveyResponses.length > 0 ? Math.round((count / surveyResponses.length) * 100) : 0;
              return (
                <div key={option} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{option}</span>
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{count} ({percentage}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 transition-all duration-500" 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Detalle de Votaciones</h3>
            {surveyResponses.length === 0 ? (
              <div className="text-center py-12 text-slate-500">Nadie ha votado todavía.</div>
            ) : (
              surveyResponses.map(response => (
                <div key={response.id} className="p-4 border border-slate-100 dark:border-slate-700 rounded-xl flex items-center justify-between bg-white dark:bg-slate-800/50">
                  <div className="flex items-center gap-3">
                    {response.userPhoto ? (
                      <img src={response.userPhoto} alt="" className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                        <Users size={18} className="text-slate-400" />
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-sm">{response.userName}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{response.userEmail}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 rounded-full text-[10px] font-bold border border-indigo-100 dark:border-indigo-800 mb-1">
                      {response.answer}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center justify-end gap-1">
                      <Clock size={10} />
                      {new Date(response.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      {/* User Deletion Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-4">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-bold">¿Eliminar usuario?</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              ¿Estás seguro de que quieres eliminar permanentemente a <span className="font-semibold text-slate-900 dark:text-white">{userToDelete.email}</span>? 
              Esta acción eliminará todos sus datos de progreso, historial y feedback. <span className="font-bold text-rose-600 dark:text-rose-400">Esta acción no se puede deshacer.</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setUserToDelete(null)}
                className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteUser}
                className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700 transition-colors shadow-lg shadow-rose-600/20"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
