import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { playNotificationSound } from '../lib/audio';
import { SavedPrompt } from '../types';
import { Sparkles, Save, FileText, PenTool, Upload, X, File as FileIcon } from 'lucide-react';

interface QuestionCreatorProps {
  userId: string;
  userRole: 'admin' | 'student';
  permissions: string[];
}

export function QuestionCreator({ userId, userRole, permissions }: QuestionCreatorProps) {
  const [activeTab, setActiveTab] = useState<'ai' | 'manual'>('ai');
  const [topics, setTopics] = useState<{topic: string, classification: string}[]>([]);

  useEffect(() => {
    const unsubscribe = api.subscribeToTopics(userId, userRole, permissions, (t) => {
      setTopics(t);
    });
    return () => unsubscribe();
  }, [userId, userRole, permissions]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setActiveTab('ai')}
          className={`flex-1 py-4 px-6 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors ${
            activeTab === 'ai' 
              ? 'bg-indigo-600 text-white shadow-md' 
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Sparkles size={20} />
          Generación con IA
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex-1 py-4 px-6 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors ${
            activeTab === 'manual' 
              ? 'bg-indigo-600 text-white shadow-md' 
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <PenTool size={20} />
          Creación Manual
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        {activeTab === 'ai' ? <AIGenerator userId={userId} userRole={userRole} permissions={permissions} existingTopics={topics} /> : <ManualCreator userId={userId} userRole={userRole} existingTopics={topics} />}
      </div>
    </div>
  );
}

function AIGenerator({ userId, userRole, permissions, existingTopics }: { userId: string, userRole: 'admin' | 'student', permissions: string[], existingTopics: {topic: string, classification: string}[] }) {
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [numQuestions, setNumQuestions] = useState<number | ''>(5);
  const [section, setSection] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [classification, setClassification] = useState<'Legislativo' | 'Específico'>('Legislativo');
  const [topic, setTopic] = useState('');
  const [isNewTopic, setIsNewTopic] = useState(false);
  
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [previewQuestions, setPreviewQuestions] = useState<any[]>([]);
  
  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [promptTitle, setPromptTitle] = useState('');

  const [attachedPdf, setAttachedPdf] = useState<any | null>(null);
  const [useAttachedPdf, setUseAttachedPdf] = useState(false);

  const availableTopics = existingTopics.filter(t => t.classification === classification).map(t => t.topic);

  useEffect(() => {
    if (topic && !isNewTopic) {
      api.getTopicResource(topic, classification).then(setAttachedPdf);
    } else {
      setAttachedPdf(null);
      setUseAttachedPdf(false);
    }
  }, [topic, classification, isNewTopic]);

  useEffect(() => {
    const currentAvailableTopics = existingTopics.filter(t => t.classification === classification).map(t => t.topic);
    if (!isNewTopic && currentAvailableTopics.length > 0 && !currentAvailableTopics.includes(topic)) {
      setTopic(currentAvailableTopics[0] || '');
    }
  }, [classification, existingTopics, isNewTopic, topic]);

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    const prompts = await api.getSavedPrompts(userId, userRole, permissions);
    setSavedPrompts(prompts);
  };

  const handleSavePrompt = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!customPrompt) return;
    setPromptModalOpen(true);
  };

  const confirmSavePrompt = async () => {
    if (promptTitle) {
      await api.savePrompt(userId, promptTitle, customPrompt, userRole === 'admin', isNewTopic ? undefined : topic);
      loadPrompts();
      setPromptModalOpen(false);
      setPromptTitle('');
    }
  };

  const handleSelectPrompt = async (p: SavedPrompt) => {
    if (p.isAdminPrompt && userRole !== 'admin') {
      // Student applying admin prompt: don't show content, just set ID
      setSelectedPromptId(p.id);
      setCustomPrompt(`[Prompt de Administrador: ${p.title}]`);
    } else {
      // Admin or user applying their own prompt: show content
      const content = await api.getPromptContent(p.id);
      setCustomPrompt(content);
      setSelectedPromptId(null);
    }
  };

  const handleGenerate = async () => {
    if (!text && !pdfFile && !url && !useAttachedPdf) {
      alert('Debes proporcionar un texto base, subir un archivo PDF, introducir una URL o usar el PDF adjunto del tema.');
      return;
    }
    if (!topic) {
      alert('El tema es obligatorio.');
      return;
    }
    const finalNumQuestions = typeof numQuestions === 'number' && numQuestions > 0 ? numQuestions : 5;
    setLoading(true);
    setSuccessMsg('');
    try {
      let fileData = undefined;
      let extraText = text;

      if (useAttachedPdf && attachedPdf) {
        // Use the extracted text from the attached PDF
        extraText = `CONTENIDO DEL PDF ADJUNTO (${attachedPdf.fileName}):\n${attachedPdf.extractedText}\n\n${text}`;
      } else if (pdfFile) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(pdfFile);
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = error => reject(error);
        });
        fileData = { data: base64, mimeType: pdfFile.type };
      }

      const existingQuestions = await api.getQuestionsByTopic(userId, topic, classification, userRole);

      const questions = await api.generateAIQuestions({
        text: extraText, 
        url, 
        numQuestions: finalNumQuestions, 
        section, 
        customPrompt: selectedPromptId ? undefined : customPrompt, 
        promptId: selectedPromptId || undefined,
        classification, 
        topic, 
        fileData, 
        existingQuestions: existingQuestions
      });
      setPreviewQuestions(questions);
      setSuccessMsg(`¡Se generaron ${questions.length} preguntas! Revísalas abajo antes de guardar.`);
      playNotificationSound();
    } catch (e: any) {
      console.error(e);
      if (e.message?.toLowerCase().includes('quota') || e.message?.toLowerCase().includes('limit')) {
        alert('Has excedido el límite de uso de la IA gratuita. El modelo principal permite 2 peticiones por minuto y el secundario 15. Por favor, espera un minuto e inténtalo de nuevo. Si el problema persiste, es posible que hayas alcanzado el límite diario (50-1500 peticiones).');
      } else {
        alert(`Error al generar preguntas: ${e.message || 'Error desconocido'}. Si usas un PDF, asegúrate de que no sea demasiado grande.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreview = async () => {
    if (previewQuestions.length === 0) return;
    setLoading(true);
    try {
      const existingQuestions = await api.getQuestionsByTopic(userId, topic, classification, userRole);
      
      const uniqueQuestions = previewQuestions.filter(newQ => {
        const cleanNewText = newQ.text.trim().toLowerCase().replace(/[.,;:?¿!¡]/g, '');
        return !existingQuestions.some(existingQ => {
          const cleanExistingText = existingQ.text.trim().toLowerCase().replace(/[.,;:?¿!¡]/g, '');
          const sameText = cleanExistingText === cleanNewText;
          const sameOptions = JSON.stringify([...existingQ.options].sort()) === JSON.stringify([...newQ.options].sort());
          return sameText || (sameText && sameOptions);
        });
      });

      const duplicatesCount = previewQuestions.length - uniqueQuestions.length;

      if (uniqueQuestions.length === 0) {
        alert('Todas las preguntas generadas ya existen en la base de datos para este tema.');
        setLoading(false);
        return;
      }

      const sourcePdfName = pdfFile ? pdfFile.name : undefined;
      await api.saveBulkQuestions(userId, uniqueQuestions, classification, topic, sourcePdfName);
      
      let msg = `¡Se guardaron ${uniqueQuestions.length} preguntas exitosamente!`;
      if (duplicatesCount > 0) {
        msg += ` (${duplicatesCount} preguntas duplicadas fueron omitidas).`;
      }
      
      setSuccessMsg(msg);
      setPreviewQuestions([]);
      setText('');
      setPdfFile(null);
      setNumQuestions(5);
      setSection('');
      setCustomPrompt('');
      // We keep classification and topic as they might want to generate more for the same topic
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) {
      console.error(e);
      alert('Error al guardar las preguntas.');
    } finally {
      setLoading(false);
    }
  };

  const updatePreviewQuestion = (index: number, field: string, value: any) => {
    const updated = [...previewQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setPreviewQuestions(updated);
  };

  const updatePreviewOption = (qIndex: number, oIndex: number, value: string) => {
    const updated = [...previewQuestions];
    const options = [...updated[qIndex].options];
    options[oIndex] = value;
    updated[qIndex] = { ...updated[qIndex], options };
    setPreviewQuestions(updated);
  };

  const removePreviewQuestion = (index: number) => {
    setPreviewQuestions(previewQuestions.filter((_, i) => i !== index));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf') {
        setPdfFile(file);
      } else {
        alert('Por favor, sube un archivo PDF válido.');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Clasificación</label>
          <select 
            value={classification} 
            onChange={(e) => setClassification(e.target.value as any)}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="Legislativo">Legislativo</option>
            <option value="Específico">Específico</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Tema</label>
          {!isNewTopic && availableTopics.length > 0 ? (
            <div className="flex gap-2">
              <select 
                value={topic} 
                onChange={(e) => setTopic(e.target.value)}
                className="flex-1 min-w-0 truncate px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="" disabled>Selecciona un tema...</option>
                {availableTopics.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <button 
                onClick={() => { setIsNewTopic(true); setTopic(''); }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
              >
                Nuevo
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input 
                type="text" 
                value={topic} 
                onChange={(e) => setTopic(e.target.value)}
                className="flex-1 min-w-0 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Nombre del nuevo tema"
              />
              {availableTopics.length > 0 && (
                <button 
                  onClick={() => { setIsNewTopic(false); setTopic(''); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          <FileText size={16} className="inline mr-2" />
          Fuente de información (PDF, Texto o URL)
        </label>
        
        <div className="mb-4">
          <input 
            type="url" 
            value={url} 
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            placeholder="https://ejemplo.com/temario"
          />
          <p className="text-xs text-slate-500 mt-1">Pega una URL para que la IA extraiga el contenido de la página web.</p>
        </div>

        {attachedPdf && (
          <div className="mb-4">
            <label className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
              useAttachedPdf 
                ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-500/50 shadow-sm' 
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-500/50'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  useAttachedPdf ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                }`}>
                  <FileIcon size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Usar PDF adjunto del tema</p>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">{attachedPdf.fileName}</p>
                </div>
              </div>
              <input 
                type="checkbox" 
                checked={useAttachedPdf} 
                onChange={(e) => setUseAttachedPdf(e.target.checked)}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
              />
            </label>
          </div>
        )}

        {pdfFile ? (
          <div className="flex items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-500/50 rounded-lg mb-4">
            <div className="flex items-center gap-3">
              <FileText className="text-indigo-600 dark:text-indigo-400" />
              <span className="font-medium text-indigo-900 dark:text-indigo-100 line-clamp-1">{pdfFile.name}</span>
              <span className="text-xs text-indigo-500 dark:text-indigo-400 whitespace-nowrap">({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)</span>
            </div>
            <button onClick={() => setPdfFile(null)} className="p-1 text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">
              <X size={20} />
            </button>
          </div>
        ) : (
          <div className="mb-4">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 dark:border-slate-600 border-dashed rounded-lg cursor-pointer bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-3 text-slate-400 dark:text-slate-500" />
                <p className="mb-1 text-sm text-slate-500 dark:text-slate-400 font-semibold">Subir PDF Local</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">PDF (Máx. ~10MB)</p>
              </div>
              <input type="file" className="hidden" accept="application/pdf" onChange={handleFileChange} />
            </label>
          </div>
        )}

        <textarea 
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={pdfFile ? 3 : 6}
          className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          placeholder={pdfFile ? "Opcional: Añade texto adicional o contexto aquí..." : "O pega aquí el texto del temario o ley..."}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Número de preguntas</label>
          <input 
            type="number" 
            min="1" max="50"
            value={numQuestions} 
            onChange={(e) => setNumQuestions(e.target.value === '' ? '' : parseInt(e.target.value))}
            className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Sección específica (Opcional)</label>
          <input 
            type="text" 
            value={section} 
            onChange={(e) => setSection(e.target.value)}
            className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            placeholder="Ej: Artículo 14 a 29"
          />
        </div>
      </div>

      <div>
        <div className="flex justify-between items-end mb-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Prompt Personalizado (Opcional)</label>
          <button type="button" onClick={handleSavePrompt} className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1">
            <Save size={14} /> Guardar Prompt
          </button>
        </div>
        <textarea 
          value={customPrompt}
          onChange={(e) => {
            setCustomPrompt(e.target.value);
            setSelectedPromptId(null); // Reset if user types manually
          }}
          rows={3}
          readOnly={!!selectedPromptId && userRole !== 'admin'}
          className={`w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white ${selectedPromptId && userRole !== 'admin' ? 'bg-slate-50 dark:bg-slate-900/50 italic text-slate-500' : ''}`}
          placeholder="Ej: Haz preguntas muy difíciles, con opciones que se parezcan mucho entre sí..."
        />
        {savedPrompts.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-xs text-slate-500 py-1">Prompts guardados:</span>
            {savedPrompts.map(p => (
              <button 
                key={p.id}
                type="button"
                onClick={() => handleSelectPrompt(p)}
                className={`text-xs px-2 py-1 rounded-md transition-colors ${
                  selectedPromptId === p.id 
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                }`}
              >
                {p.title} {p.isAdminPrompt && <span className="text-[10px] opacity-60 ml-1">(Admin)</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-xl transition-colors flex justify-center items-center gap-2"
      >
        {loading ? 'Generando con IA...' : <><Sparkles size={20} /> Generar Preguntas para Revisar</>}
      </button>

      {previewQuestions.length > 0 && (
        <div className="mt-8 space-y-6 border-t border-slate-100 pt-8">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Previsualización y Edición</h3>
            <span className="text-sm text-slate-500">{previewQuestions.length} preguntas generadas</span>
          </div>
          
          <div className="space-y-8">
            {previewQuestions.map((q, qIdx) => (
              <div key={qIdx} className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 relative group">
                <button 
                  onClick={() => removePreviewQuestion(qIdx)}
                  className="absolute top-4 right-4 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-full transition-colors"
                  title="Eliminar pregunta"
                >
                  <X size={18} />
                </button>
                
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Pregunta {qIdx + 1}</label>
                  <textarea 
                    value={q.text}
                    onChange={(e) => updatePreviewQuestion(qIdx, 'text', e.target.value)}
                    className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-slate-900 dark:text-white"
                    rows={2}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Opciones (Marca la correcta)</label>
                  {q.options.map((opt: string, oIdx: number) => (
                    <div key={oIdx} className="flex items-center gap-3">
                      <input 
                        type="radio" 
                        name={`preview-correct-${qIdx}`}
                        checked={q.correctOptionIndex === oIdx}
                        onChange={() => updatePreviewQuestion(qIdx, 'correctOptionIndex', oIdx)}
                        className="w-4 h-4 text-indigo-600"
                      />
                      <input 
                        type="text"
                        value={opt}
                        onChange={(e) => updatePreviewOption(qIdx, oIdx, e.target.value)}
                        className={`flex-1 p-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 ${q.correctOptionIndex === oIdx ? 'border-indigo-300 dark:border-indigo-500/50 bg-indigo-50 dark:bg-indigo-900/30 text-slate-900 dark:text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleSavePreview}
            disabled={loading || previewQuestions.length === 0}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 transform hover:-translate-y-0.5"
          >
            {loading ? 'Guardando...' : <><Save size={20} /> Confirmar y Guardar todas las preguntas</>}
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 text-emerald-700 rounded-lg text-center font-medium">
          {successMsg}
        </div>
      )}

      {/* Prompt Title Modal */}
      {promptModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Guardar Prompt</h3>
              <input 
                type="text"
                value={promptTitle}
                onChange={(e) => setPromptTitle(e.target.value)}
                placeholder="Nombre para este prompt..."
                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none mb-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button 
                  onClick={() => setPromptModalOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmSavePrompt}
                  disabled={!promptTitle}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ManualCreator({ userId, userRole, existingTopics }: { userId: string, userRole: 'admin' | 'student', existingTopics: {topic: string, classification: string}[] }) {
  const [text, setText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [classification, setClassification] = useState<'Legislativo' | 'Específico'>('Legislativo');
  const [topic, setTopic] = useState('');
  const [isNewTopic, setIsNewTopic] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const availableTopics = existingTopics.filter(t => t.classification === classification).map(t => t.topic);

  useEffect(() => {
    const currentAvailableTopics = existingTopics.filter(t => t.classification === classification).map(t => t.topic);
    if (!isNewTopic && currentAvailableTopics.length > 0 && !currentAvailableTopics.includes(topic)) {
      setTopic(currentAvailableTopics[0] || '');
    }
  }, [classification, existingTopics, isNewTopic, topic]);

  const handleSave = async () => {
    if (!text || !topic || options.some(o => !o)) {
      alert('Rellena todos los campos.');
      return;
    }
    
    setLoading(true);
    try {
      const existingQuestions = await api.getQuestionsByTopic(userId, topic, classification, userRole);
      const cleanNewText = text.trim().toLowerCase().replace(/[.,;:?¿!¡]/g, '');
      const isDuplicate = existingQuestions.some(existingQ => {
        const cleanExistingText = existingQ.text.trim().toLowerCase().replace(/[.,;:?¿!¡]/g, '');
        const sameText = cleanExistingText === cleanNewText;
        const sameOptions = JSON.stringify([...existingQ.options].sort()) === JSON.stringify([...options].sort());
        return sameText || (sameText && sameOptions);
      });

      if (isDuplicate) {
        alert('Esta pregunta con estas mismas respuestas ya existe en la base de datos para este tema.');
        setLoading(false);
        return;
      }

      await api.createManualQuestion(userId, {
        text,
        options,
        correctOptionIndex: correctIndex,
        classification,
        topic
      });
      setSuccessMsg('Pregunta guardada exitosamente.');
      setText('');
      setOptions(['', '', '', '']);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) {
      console.error(e);
      alert('Error al guardar la pregunta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Clasificación</label>
          <select 
            value={classification} 
            onChange={(e) => setClassification(e.target.value as any)}
            className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
          >
            <option value="Legislativo">Legislativo</option>
            <option value="Específico">Específico</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tema</label>
          {!isNewTopic && availableTopics.length > 0 ? (
            <div className="flex gap-2">
              <select 
                value={topic} 
                onChange={(e) => setTopic(e.target.value)}
                className="flex-1 min-w-0 truncate px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
              >
                <option value="" disabled>Selecciona un tema...</option>
                {availableTopics.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <button 
                onClick={() => { setIsNewTopic(true); setTopic(''); }}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium rounded-lg transition-colors"
              >
                Nuevo
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input 
                type="text" 
                value={topic} 
                onChange={(e) => setTopic(e.target.value)}
                className="flex-1 min-w-0 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
                placeholder="Nombre del nuevo tema"
              />
              {availableTopics.length > 0 && (
                <button 
                  onClick={() => { setIsNewTopic(false); setTopic(''); }}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Pregunta</label>
        <textarea 
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
        />
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Opciones de Respuesta</label>
        {options.map((opt, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <input 
              type="radio" 
              name="correctOption"
              checked={correctIndex === idx}
              onChange={() => setCorrectIndex(idx)}
              className="w-5 h-5 text-indigo-600 focus:ring-indigo-500"
            />
            <input 
              type="text"
              value={opt}
              onChange={(e) => {
                const newOpts = [...options];
                newOpts[idx] = e.target.value;
                setOptions(newOpts);
              }}
              className={`flex-1 px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 ${correctIndex === idx ? 'border-indigo-300 bg-indigo-50 dark:bg-indigo-900/30' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'} text-slate-900 dark:text-white`}
              placeholder={`Opción ${String.fromCharCode(65 + idx)}`}
            />
          </div>
        ))}
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Selecciona el botón circular para marcar la respuesta correcta.</p>
      </div>

      <button
        onClick={handleSave}
        disabled={loading}
        className="w-full bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-xl transition-colors flex justify-center items-center gap-2"
      >
        {loading ? 'Guardando...' : 'Guardar Pregunta Manual'}
      </button>

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-center font-medium border border-emerald-100 dark:border-emerald-800">
          {successMsg}
        </div>
      )}
    </div>
  );
}
