import React, { useState, useEffect } from 'react';
import { Question, User as AppUser, ReviewHistory } from '../types';
import { api } from '../lib/api';
import { Edit2, Save, X, Star, FileText, CheckCircle2, Clock, XCircle, AlertTriangle, Sparkles, Plus, Trash2, Loader2, Folder, ChevronRight, MessageSquare } from 'lucide-react';

interface QuestionDetailsModalProps {
  question: Question;
  userId: string;
  userRole: 'admin' | 'student';
  permissions: string[];
  appUser: AppUser | null;
  onClose: () => void;
  onUpdate: (updatedQuestion: Question) => void;
  onDelete?: (id: string) => void;
}

export function QuestionDetailsModal({ question, userId, userRole, permissions, appUser, onClose, onUpdate, onDelete }: QuestionDetailsModalProps) {
  const [history, setHistory] = useState<ReviewHistory[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Question>>(question);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const [mnemonics, setMnemonics] = useState<string[]>(question.mnemonics || []);
  const [newMnemonic, setNewMnemonic] = useState('');
  const [isGeneratingMnemonic, setIsGeneratingMnemonic] = useState(false);
  const [attachedPdf, setAttachedPdf] = useState<any | null>(null);
  const [topics, setTopics] = useState<{topic: string, folder: string}[]>([]);
  const [isMoving, setIsMoving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [duplicateFound, setDuplicateFound] = useState<Question | null>(null);
  const [comments, setComments] = useState<string[]>(question.comments || []);
  const [newComment, setNewComment] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<{
    folder: string;
    topic: string;
  }>({ 
    folder: question.folder, 
    topic: question.topic 
  });

  useEffect(() => {
    // Prevent background scrolling on all platforms
    const originalStyle = window.getComputedStyle(document.body).overflow;
    const originalPaddingRight = window.getComputedStyle(document.body).paddingRight;
    
    // Calculate scrollbar width to prevent layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    
    // For iOS Safari and some other mobile browsers, overflow: hidden on body might not be enough
    // We can also prevent touchmove on the document if needed
    const preventDefault = (e: TouchEvent) => {
      // Only prevent if we're touching the overlay or if we're at the scroll limits of the modal
      if ((e.target as HTMLElement).closest('.touch-auto')) return;
      e.preventDefault();
    };
    
    document.addEventListener('touchmove', preventDefault, { passive: false });
    
    return () => {
      document.body.style.overflow = originalStyle;
      document.body.style.paddingRight = originalPaddingRight;
      document.removeEventListener('touchmove', preventDefault);
    };
  }, []);

  useEffect(() => {
    loadHistory();
    api.getTopicResource(question.topic, question.folder).then(setAttachedPdf);
    api.getTopics(userId, userRole, permissions).then(setTopics);
  }, [question.id, userId, userRole, permissions]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const h = await api.getQuestionHistory(userId, question.id);
      setHistory(h);
    } catch (e) {
      console.error("Error loading history", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSaveEdit = async () => {
    if (editForm) {
      try {
        await api.updateQuestion(question.id, editForm);
        onUpdate({ ...question, ...editForm } as Question);
        setIsEditing(false);
      } catch (e) {
        console.error("Error updating question", e);
        alert("Error al actualizar la pregunta.");
      }
    }
  };

  const handleToggleFlag = async (type: 'teacher' | 'correction') => {
    if (type === 'teacher') {
      const newStatus = !question.flaggedForTeacher;
      const newComment = newStatus ? (question.teacherComment || '') : '';
      try {
        await api.updateQuestion(question.id, { 
          flaggedForTeacher: newStatus,
          teacherComment: newComment
        });
        onUpdate({
          ...question,
          flaggedForTeacher: newStatus,
          teacherComment: newComment
        });
        setEditForm(prev => ({
          ...prev,
          flaggedForTeacher: newStatus,
          teacherComment: newComment
        }));
      } catch (e) {
        console.error("Error toggling flag", e);
      }
    } else {
      const newStatus = !question.flaggedForCorrection;
      const newComment = newStatus ? (question.correctionComment || '') : '';
      try {
        await api.updateQuestion(question.id, { 
          flaggedForCorrection: newStatus,
          correctionComment: newComment
        });
        onUpdate({
          ...question,
          flaggedForCorrection: newStatus,
          correctionComment: newComment
        });
        setEditForm(prev => ({
          ...prev,
          flaggedForCorrection: newStatus,
          correctionComment: newComment
        }));
      } catch (e) {
        console.error("Error toggling flag", e);
      }
    }
  };

  const handleAddMnemonic = async () => {
    if (!newMnemonic.trim()) return;
    const updatedMnemonics = [...mnemonics, newMnemonic.trim()];
    try {
      await api.updateQuestion(question.id, { mnemonics: updatedMnemonics });
      setMnemonics(updatedMnemonics);
      setNewMnemonic('');
      onUpdate({ ...question, mnemonics: updatedMnemonics });
    } catch (e) {
      console.error("Error adding mnemonic", e);
    }
  };

  const handleRemoveMnemonic = async (index: number) => {
    const updatedMnemonics = mnemonics.filter((_, i) => i !== index);
    try {
      await api.updateQuestion(question.id, { mnemonics: updatedMnemonics });
      setMnemonics(updatedMnemonics);
      onUpdate({ ...question, mnemonics: updatedMnemonics });
    } catch (e) {
      console.error("Error removing mnemonic", e);
    }
  };

  const handleGenerateMnemonic = async () => {
    setIsGeneratingMnemonic(true);
    try {
      const opposition = appUser?.oppositionType || 'opositor';
      const gender = appUser?.gender || 'Opositor';
      const name = appUser?.displayName?.split(' ')[0] || 'estudiante';

      const context = attachedPdf ? `CONTENIDO DEL PDF ADJUNTO:\n${attachedPdf.extractedText}\n\n` : '';
      const prompt = `${context}Pregunta: ${question.text}\nOpciones: ${question.options.join(', ')}\nRespuesta correcta: ${question.options[question.correctOptionIndex]}\n\nActúa como un profesor de legislación experto para un/a ${gender} a ${opposition.replace('_', ' ')}. Genera una regla mnemotécnica creativa y fácil de recordar para esta pregunta. Dirígete al usuario como ${name}. Utiliza ejemplos relacionados con la profesión de ${opposition.replace('_', ' ')} o situaciones de estudio de un opositor. Si hay un PDF adjunto, asegúrate de que la mnemotécnica sea coherente con la terminología del tema. Devuelve SOLO el texto de la mnemotécnica.`;
      
      const mnemonic = await api.generateAIContent(prompt);
      if (mnemonic) {
        const updatedMnemonics = [...mnemonics, mnemonic];
        await api.updateQuestion(question.id, { mnemonics: updatedMnemonics });
        setMnemonics(updatedMnemonics);
        onUpdate({ ...question, mnemonics: updatedMnemonics });
      }
    } catch (e) {
      console.error("Error generating mnemonic", e);
      alert("Error al generar la mnemotécnica.");
    } finally {
      setIsGeneratingMnemonic(false);
    }
  };

  const handleMoveQuestion = async () => {
    try {
      // Check for duplicate in destination
      const duplicate = await api.checkDuplicateQuestion(question.text, selectedFolder.topic, selectedFolder.folder);
      if (duplicate && duplicate.id !== question.id) {
        setDuplicateFound(duplicate);
        return;
      }

      await api.moveQuestions([question.id], selectedFolder);
      onUpdate({ ...question, ...selectedFolder } as Question);
      setIsMoving(false);
      onClose();
    } catch (e) {
      console.error("Error moving question", e);
      alert("Error al mover la pregunta.");
    }
  };

  const handleConfirmMoveAndDeleteDuplicate = async () => {
    if (!duplicateFound) return;
    try {
      // Delete the duplicate first
      await api.deleteQuestion(duplicateFound.id);
      // Then move the current one
      await api.moveQuestions([question.id], selectedFolder);
      onUpdate({ ...question, ...selectedFolder } as Question);
      setDuplicateFound(null);
      setIsMoving(false);
      onClose();
    } catch (e) {
      console.error("Error moving question and deleting duplicate", e);
      alert("Error al procesar el movimiento.");
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    const updatedComments = [...comments, newComment.trim()];
    try {
      await api.updateQuestionComments(question.id, updatedComments);
      setComments(updatedComments);
      setNewComment('');
      onUpdate({ ...question, comments: updatedComments });
    } catch (e) {
      console.error("Error adding comment", e);
    }
  };

  const handleRemoveComment = async (index: number) => {
    const updatedComments = comments.filter((_, i) => i !== index);
    try {
      await api.updateQuestionComments(question.id, updatedComments);
      setComments(updatedComments);
      onUpdate({ ...question, comments: updatedComments });
    } catch (e) {
      console.error("Error removing comment", e);
    }
  };

  const handleDeleteQuestion = async () => {
    try {
      await api.deleteQuestion(question.id);
      if (onDelete) onDelete(question.id);
      onClose();
    } catch (e) {
      console.error("Error deleting question", e);
      alert("Error al eliminar la pregunta.");
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 touch-none"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 touch-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Detalles de la Pregunta</h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleToggleFlag('teacher')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  question.flaggedForTeacher 
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shadow-sm' 
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                <Star size={14} />
                {question.flaggedForTeacher ? 'Marcada para Profesor' : 'Marcar para Profesor'}
              </button>
              <button 
                onClick={() => handleToggleFlag('correction')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  question.flaggedForCorrection 
                    ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 shadow-sm' 
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                <AlertTriangle size={14} />
                {question.flaggedForCorrection ? 'Marcada para Corrección' : 'Marcar para Corrección'}
              </button>
              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold rounded border border-slate-200 dark:border-slate-700 uppercase tracking-tighter">ID: {question.displayId}</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 overscroll-contain touch-auto">
          {/* Edit Form */}
          <div className="mb-8">
            {question.sourcePdf && (
              <div className="mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl flex items-start gap-3">
                <FileText className="text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" size={20} />
                <div>
                  <h4 className="text-sm font-semibold text-indigo-900 dark:text-indigo-300">Origen de la pregunta</h4>
                  <p className="text-sm text-indigo-700 dark:text-indigo-400 mt-1">Generada por IA a partir del archivo: <strong>{question.sourcePdf}</strong></p>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Edit2 size={18} className="text-indigo-600 dark:text-indigo-400" /> 
                Contenido
              </h3>
              {!isEditing ? (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
                >
                  Editar
                </button>
              ) : (
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setIsEditing(false); setEditForm(question); }}
                    className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSaveEdit}
                    className="text-sm bg-indigo-600 dark:bg-indigo-500 text-white px-3 py-1 rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 font-medium flex items-center gap-1"
                  >
                    <Save size={14} /> Guardar
                  </button>
                </div>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Carpeta</label>
                    <select 
                      value={editForm.folder || ''}
                      onChange={(e) => setEditForm({...editForm, folder: e.target.value})}
                      className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      {Array.from(new Set(topics.map(t => t.folder))).map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Tema</label>
                    <input 
                      type="text"
                      value={editForm.topic || ''}
                      onChange={(e) => setEditForm({...editForm, topic: e.target.value})}
                      className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Pregunta</label>
                  <textarea 
                    value={editForm.text || ''}
                    onChange={(e) => setEditForm({...editForm, text: e.target.value})}
                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Opciones</label>
                  {editForm.options?.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <input 
                        type="radio" 
                        name="editCorrectOption"
                        checked={editForm.correctOptionIndex === idx}
                        onChange={() => setEditForm({...editForm, correctOptionIndex: idx})}
                        className="w-4 h-4 text-indigo-600 dark:text-indigo-400"
                      />
                      <input 
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...(editForm.options || [])];
                          newOpts[idx] = e.target.value;
                          setEditForm({...editForm, options: newOpts});
                        }}
                        className="flex-1 p-2 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Comentario para el profesor</label>
                  <textarea 
                    value={editForm.teacherComment || ''}
                    onChange={(e) => setEditForm({...editForm, teacherComment: e.target.value})}
                    placeholder="Escribe aquí tu duda o comentario..."
                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Comentario de corrección</label>
                  <textarea 
                    value={editForm.correctionComment || ''}
                    onChange={(e) => setEditForm({...editForm, correctionComment: e.target.value})}
                    placeholder="Escribe aquí el fallo de la pregunta..."
                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    rows={2}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="font-medium text-slate-900 dark:text-slate-100 mb-4">{question.text}</p>
                <div className="space-y-2">
                  {question.options.map((opt, idx) => (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-lg text-sm flex items-center justify-between ${idx === question.correctOptionIndex ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}
                    >
                      <span>{opt}</span>
                      {idx === question.correctOptionIndex && <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {question.teacherComment && !isEditing && (
              <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold mb-2 text-xs uppercase tracking-wider">
                  <Star size={16} />
                  <span>Nota para el profesor</span>
                </div>
                <p className="text-sm text-amber-900 dark:text-amber-400 italic">
                  "{question.teacherComment}"
                </p>
              </div>
            )}
            
            {question.correctionComment && !isEditing && (
              <div className="mt-4 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-xl">
                <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold mb-2 text-xs uppercase tracking-wider">
                  <AlertTriangle size={16} />
                  <span>Nota de corrección</span>
                </div>
                <p className="text-sm text-rose-900 dark:text-rose-400 italic">
                  "{question.correctionComment}"
                </p>
              </div>
            )}
          </div>

          {/* Question Management Section */}
          <div className="mb-8 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Folder size={18} className="text-indigo-600 dark:text-indigo-400" /> 
                Gestión de la pregunta
              </h3>
              <div className="flex gap-3">
                {!isMoving && !isDeleting ? (
                  <>
                    <button 
                      onClick={() => setIsMoving(true)}
                      className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
                    >
                      Mover
                    </button>
                    <button 
                      onClick={() => setIsDeleting(true)}
                      className="text-sm text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 font-medium"
                    >
                      Eliminar
                    </button>
                  </>
                ) : isMoving ? (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setIsMoving(false)}
                      className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={handleMoveQuestion}
                      className="text-sm bg-indigo-600 dark:bg-indigo-500 text-white px-3 py-1 rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 font-medium flex items-center gap-1"
                    >
                      <Save size={14} /> Confirmar
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setIsDeleting(false)}
                      className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={handleDeleteQuestion}
                      className="text-sm bg-rose-600 dark:bg-rose-500 text-white px-4 py-1.5 rounded-lg hover:bg-rose-700 dark:hover:bg-rose-600 font-bold flex items-center gap-2 shadow-sm shadow-rose-200 dark:shadow-none transition-all"
                    >
                      <Trash2 size={14} /> Eliminar definitivamente
                    </button>
                  </div>
                )}
              </div>
            </div>

            {isMoving && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Carpeta</label>
                    <select 
                      value={selectedFolder.folder}
                      onChange={(e) => {
                        const newFolder = e.target.value;
                        const firstTopicInNewFolder = topics.find(t => t.folder === newFolder)?.topic || '';
                        setSelectedFolder({ folder: newFolder, topic: firstTopicInNewFolder });
                      }}
                      className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      {Array.from(new Set(topics.map(t => t.folder))).map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Tema</label>
                    <select 
                      value={selectedFolder.topic}
                      onChange={(e) => setSelectedFolder({ ...selectedFolder, topic: e.target.value })}
                      className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      {topics
                        .filter(t => t.folder === selectedFolder.folder && t.topic !== '')
                        .map(t => (
                          <option key={t.topic} value={t.topic}>{t.topic}</option>
                        ))}
                      {!topics.find(t => t.topic === selectedFolder.topic && t.folder === selectedFolder.folder && t.topic !== '') && (
                        <option value={selectedFolder.topic}>{selectedFolder.topic}</option>
                      )}
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-800">
                  <ChevronRight size={14} className="text-indigo-400" />
                  <span>La pregunta se moverá de <strong>{question.folder} / {question.topic}</strong> a <strong>{selectedFolder.folder} / {selectedFolder.topic}</strong></span>
                </div>
              </div>
            )}
            
            {!isMoving && (
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded text-xs font-medium">{question.folder}</span>
                <ChevronRight size={14} className="text-slate-300" />
                <span className="font-medium">{question.topic}</span>
              </div>
            )}
          </div>

          {/* Mnemonics Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Sparkles size={18} className="text-indigo-600 dark:text-indigo-400" /> 
                Mnemotécnicas
              </h3>
              <button 
                onClick={handleGenerateMnemonic}
                disabled={isGeneratingMnemonic}
                className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {isGeneratingMnemonic ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {attachedPdf ? 'Generar con PDF' : 'Generar con IA'}
              </button>
            </div>

            <div className="space-y-3">
              {mnemonics.map((m, idx) => (
                <div key={idx} className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl relative group">
                  <p className="text-sm text-indigo-900 dark:text-indigo-300 pr-8 italic">"{m}"</p>
                  <button 
                    onClick={() => handleRemoveMnemonic(idx)}
                    className="absolute top-3 right-3 p-1 text-indigo-300 dark:text-indigo-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-full transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={newMnemonic}
                  onChange={(e) => setNewMnemonic(e.target.value)}
                  placeholder="Añade una mnemotécnica manual..."
                  className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-slate-900 dark:text-white"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddMnemonic()}
                />
                <button 
                  onClick={handleAddMnemonic}
                  disabled={!newMnemonic.trim()}
                  className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Comments Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <MessageSquare size={18} className="text-indigo-600 dark:text-indigo-400" /> 
                Comentarios
              </h3>
            </div>

            <div className="space-y-3">
              {comments.map((c, idx) => (
                <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl relative group">
                  <p className="text-sm text-slate-700 dark:text-slate-300 pr-8 italic">"{c}"</p>
                  <button 
                    onClick={() => handleRemoveComment(idx)}
                    className="absolute top-3 right-3 p-1 text-slate-300 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-full transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Añade un comentario personal..."
                  className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-slate-900 dark:text-white"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                />
                <button 
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* History Table */}
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-4">
              <Clock size={18} className="text-indigo-600 dark:text-indigo-400" /> 
              Historial de Respuestas
            </h3>
            
            {loadingHistory ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 italic">Cargando historial...</p>
            ) : history.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 italic">Esta pregunta aún no ha sido respondida en ningún test.</p>
            ) : (
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Fecha y Hora</th>
                      <th className="px-4 py-3 font-semibold">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {history.map(h => (
                      <tr key={h.id} className="bg-white dark:bg-slate-800">
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {new Date(h.reviewedAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          {h.isCorrect ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md text-xs font-medium">
                              <CheckCircle2 size={14} /> Acierto
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded-md text-xs font-medium">
                              <XCircle size={14} /> Fallo
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Duplicate Question Confirmation Modal */}
      {duplicateFound && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400 mb-4">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-bold">Pregunta duplicada detectada</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              Ya existe una pregunta idéntica en el tema de destino (<strong>{selectedFolder.topic}</strong>). 
              ¿Quieres eliminar la pregunta duplicada y mover esta en su lugar?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDuplicateFound(null)}
                className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmMoveAndDeleteDuplicate}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
              >
                Eliminar duplicado y mover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
