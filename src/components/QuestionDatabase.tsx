import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { Question, User as AppUser, ReviewHistory, Folder as FolderType, Topic as TopicType } from '../types';
import { Folder, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Edit2, Trash2, Clock, CheckCircle2, XCircle, ArrowLeft, Save, X, Search, Database, FileText, Star, MessageSquare, AlertTriangle, ListFilter, LayoutGrid, Move, Upload, File as FileIcon, Loader2, Plus } from 'lucide-react';
import { QuestionDetailsModal } from './QuestionDetailsModal';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

const QuestionRow = React.memo(({ 
  q, 
  isSelected, 
  isSelectionMode,
  onDetails, 
  onDelete, 
  onToggleFlag, 
  onToggleSelection, 
  onDragStart 
}: { 
  q: Question, 
  isSelected: boolean, 
  isSelectionMode: boolean,
  onDetails: (q: Question) => void,
  onDelete: (id: string, e: React.MouseEvent) => void,
  onToggleFlag: (q: Question, e: React.MouseEvent, type: 'teacher' | 'correction') => void,
  onToggleSelection: (id: string, e?: React.MouseEvent | React.TouchEvent) => void,
  onDragStart: (e: React.TouchEvent, id: string) => void
}) => {
  const isNew = (q.hits || 0) === 0 && (q.misses || 0) === 0;
  
  return (
    <>
      {/* Desktop Row */}
      <tr 
        key={`desktop-${q.id}`} 
        data-question-id={q.id}
        className={`hidden md:table-row hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''}`} 
        onClick={() => isSelectionMode ? onToggleSelection(q.id) : onDetails(q)}
        onTouchStart={(e) => onDragStart(e, q.id)}
      >
        <td 
          className={`px-6 py-4 text-center border-l-4 ${isNew ? 'border-blue-500' : 'border-transparent'}`} 
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => {
            e.stopPropagation();
            onDragStart(e, q.id);
          }}
        >
          {isSelectionMode && (
            <input 
              type="checkbox" 
              checked={isSelected}
              onChange={(e) => onToggleSelection(q.id, e as any)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-600 focus:ring-indigo-500 pointer-events-none"
            />
          )}
        </td>
        <td className="px-6 py-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-start gap-2">
              {q.flaggedForTeacher && <span title="Preguntar al profesor"><Star size={16} className="text-amber-500 shrink-0 mt-0.5" /></span>}
              {q.flaggedForCorrection && <span title="Corregir fallo"><AlertTriangle size={16} className="text-rose-500 shrink-0 mt-0.5" /></span>}
              <div className="line-clamp-2 text-slate-900 dark:text-slate-100">{q.text}</div>
            </div>
            {q.createdAt && (
              <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                <Clock size={10} />
                Añadida el {new Date(q.createdAt).toLocaleDateString()} {new Date(q.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
            {q.teacherComment && (
              <div className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-900/20 w-fit px-1.5 py-0.5 rounded border border-amber-100 dark:border-amber-800">
                <MessageSquare size={10} />
                <span className="truncate max-w-[200px]">{q.teacherComment}</span>
              </div>
            )}
            {q.correctionComment && (
              <div className="flex items-center gap-1.5 text-[10px] text-rose-600 dark:text-rose-400 font-medium bg-rose-50 dark:bg-rose-900/20 w-fit px-1.5 py-0.5 rounded border border-rose-100 dark:border-rose-800">
                <MessageSquare size={10} />
                <span className="truncate max-w-[200px]">{q.correctionComment}</span>
              </div>
            )}
          </div>
        </td>
        <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-center gap-1">
            <button 
              onClick={(e) => onToggleFlag(q, e, 'teacher')}
              className={`p-2 rounded-lg transition-colors ${q.flaggedForTeacher ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50' : 'text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              title={q.flaggedForTeacher ? "Quitar marca de profesor" : "Marcar para el profesor"}
            >
              <Star size={18} />
            </button>
            <button 
              onClick={(e) => onToggleFlag(q, e, 'correction')}
              className={`p-2 rounded-lg transition-colors ${q.flaggedForCorrection ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/50' : 'text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              title={q.flaggedForCorrection ? "Quitar marca de corrección" : "Marcar para corregir fallo"}
            >
              <AlertTriangle size={18} />
            </button>
          </div>
        </td>
        <td className="px-6 py-4 text-center">
          <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium text-xs">
            {q.hits}
          </span>
        </td>
        <td className="px-6 py-4 text-center">
          <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 font-medium text-xs">
            {q.misses}
          </span>
        </td>
        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
          {new Date(q.nextReviewDate).toLocaleDateString()}
        </td>
        <td className="px-6 py-4 text-right">
          <div className="flex items-center justify-end gap-2">
            <button 
              onClick={(e) => { e.stopPropagation(); onDetails(q); }}
              className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
              title="Ver detalles e historial"
            >
              <Edit2 size={16} />
            </button>
            <button 
              onClick={(e) => onDelete(q.id, e)}
              className="p-2 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
              title="Eliminar"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </td>
      </tr>

      {/* Mobile Card */}
      <tr 
        key={`mobile-${q.id}`}
        data-question-id={q.id}
        className={`md:hidden border-b border-slate-100 dark:border-slate-700 transition-colors active:bg-slate-50 dark:active:bg-slate-700/50 ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : 'bg-white dark:bg-slate-800'} relative overflow-hidden`}
        onClick={() => isSelectionMode ? onToggleSelection(q.id) : onDetails(q)}
        onTouchStart={(e) => onDragStart(e, q.id)}
      >
        <td colSpan={7} className="p-0">
          <div className="p-4 relative">
            {isNew && <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />}
            
            <div className="flex items-start gap-3">
              {isSelectionMode && (
                <div 
                  className="mt-1 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    onDragStart(e, q.id);
                  }}
                >
                  <input 
                    type="checkbox" 
                    checked={isSelected}
                    onChange={(e) => onToggleSelection(q.id, e as any)}
                    className="w-5 h-5 text-indigo-600 rounded border-slate-300 dark:border-slate-600 focus:ring-indigo-500 pointer-events-none"
                  />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 mb-1">
                  {q.flaggedForTeacher && <Star size={14} className="text-amber-500 shrink-0 mt-0.5" />}
                  {q.flaggedForCorrection && <AlertTriangle size={14} className="text-rose-500 shrink-0 mt-0.5" />}
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-3 leading-snug">{q.text}</div>
                </div>
                
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <Clock size={10} />
                    {new Date(q.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded border border-emerald-100 dark:border-emerald-800">
                      {q.hits}✓
                    </span>
                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-1.5 py-0.5 rounded border border-rose-100 dark:border-rose-800">
                      {q.misses}✗
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    Próximo: {new Date(q.nextReviewDate).toLocaleDateString()}
                  </div>
                </div>

                {(q.teacherComment || q.correctionComment) && (
                  <div className="mt-2 space-y-1">
                    {q.teacherComment && (
                      <div className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-900/20 w-fit px-1.5 py-0.5 rounded border border-amber-100 dark:border-amber-800">
                        <MessageSquare size={10} />
                        <span className="truncate max-w-[200px]">{q.teacherComment}</span>
                      </div>
                    )}
                    {q.correctionComment && (
                      <div className="flex items-center gap-1.5 text-[10px] text-rose-600 dark:text-rose-400 font-medium bg-rose-50 dark:bg-rose-900/20 w-fit px-1.5 py-0.5 rounded border border-rose-100 dark:border-rose-800">
                        <MessageSquare size={10} />
                        <span className="truncate max-w-[200px]">{q.correctionComment}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                <button 
                  onClick={(e) => onToggleFlag(q, e, 'teacher')}
                  className={`p-2 rounded-lg transition-colors ${q.flaggedForTeacher ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30' : 'text-slate-300 dark:text-slate-600'}`}
                >
                  <Star size={20} />
                </button>
                <button 
                  onClick={(e) => onToggleFlag(q, e, 'correction')}
                  className={`p-2 rounded-lg transition-colors ${q.flaggedForCorrection ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30' : 'text-slate-300 dark:text-slate-600'}`}
                >
                  <AlertTriangle size={20} />
                </button>
              </div>
            </div>
          </div>
        </td>
      </tr>
    </>
  );
});

interface QuestionDatabaseProps {
  userId: string;
  userRole: 'admin' | 'student';
  permissions: string[];
  appUser: AppUser | null;
}

export function QuestionDatabase({ userId, userRole, permissions, appUser }: QuestionDatabaseProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [topics, setTopics] = useState<TopicType[]>([]);
  const [currentPath, setCurrentPath] = useState<string[]>([]); // [] -> ['Legislativo'] -> ['Legislativo', 'Tema 1']
  const [loading, setLoading] = useState(true);
  const [searchId, setSearchId] = useState('');
  const [searchText, setSearchText] = useState('');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [topicSort, setTopicSort] = useState<'default' | 'newest' | 'oldest'>('default');
  const [isRecentExpanded, setIsRecentExpanded] = useState(true);

  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [isCreateTopicModalOpen, setIsCreateTopicModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');

  useEffect(() => {
  }, [currentPath, searchId, searchText, topicSort]);

  const selectionDragRef = useRef<{ 
    active: boolean, 
    initialState: boolean, 
    lastToggledId: string | null,
    lastX: number | null,
    lastY: number | null
  }>({ 
    active: false, 
    initialState: false, 
    lastToggledId: null,
    lastX: null,
    lastY: null
  });
  const dragStartPosRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 });
  const isSelectionDragActive = useRef(false);
  const scrollIntervalRef = useRef<any>(null);

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);

  // Edit/History Modal state
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [editingTopic, setEditingTopic] = useState<{oldTopic: string, oldClassification: string, newTopic: string, newClassification: string} | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{isOpen: boolean, isBulk: boolean, questionId?: string}>({ isOpen: false, isBulk: false });

  const [topicResource, setTopicResource] = useState<any | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  useEffect(() => {
    if (currentPath.length === 2) {
      const [classification, topic] = currentPath;
      api.getTopicResource(topic, classification).then(setTopicResource);
    } else {
      setTopicResource(null);
    }
  }, [currentPath]);

  const extractTextFromPDF = async (file: File): Promise<string> => {
    // Dynamically import pdfjs-dist to prevent Vite build/load errors
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
      
      // Stop extracting if we've reached the Firestore limit safety threshold
      if (fullText.length >= 800000) {
        break;
      }
    }
    
    return fullText;
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || currentPath.length !== 2) return;

    setUploadingPdf(true);
    try {
      const [classification, topic] = currentPath;
      const extractedText = await extractTextFromPDF(file);
      
      await api.saveTopicResource({
        topic,
        classification,
        fileName: file.name,
        extractedText: extractedText.substring(0, 800000) // Firestore limit safety
      });
      const resource = await api.getTopicResource(topic, classification);
      setTopicResource(resource);
      setUploadingPdf(false);
    } catch (error) {
      console.error("Error uploading PDF:", error);
      alert("Error al procesar el PDF. Asegúrate de que no esté protegido.");
      setUploadingPdf(false);
    }
  };

  const handleDeleteResource = async () => {
    if (!topicResource) return;
    if (confirm('¿Estás seguro de que quieres eliminar el PDF adjunto a este tema?')) {
      await api.deleteTopicResource(topicResource.id);
      setTopicResource(null);
    }
  };

  useEffect(() => {
    setLoading(true);
    const unsubQuestions = api.subscribeToQuestions(userId, userRole, permissions, (data) => {
      setQuestions(data);
      setLoading(false);
    });

    const unsubFolders = api.subscribeToFolders(userId, (data) => {
      setFolders(data);
    });

    return () => {
      unsubQuestions();
      unsubFolders();
    };
  }, [userId, userRole, permissions]);

  useEffect(() => {
    if (currentPath.length === 1) {
      const folder = folders.find(f => f.name === currentPath[0]);
      if (folder) {
        const unsubTopics = api.subscribeToTopicsByFolder(userId, folder.id, (data) => {
          setTopics(data);
        });
        return () => unsubTopics();
      }
    }
  }, [currentPath, folders, userId]);

  useEffect(() => {
    setSelectedQuestionIds(new Set());
    setIsSelectionMode(false);
  }, [currentPath]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmation({ isOpen: true, isBulk: false, questionId: id });
  };

  const handleBulkDelete = async () => {
    if (selectedQuestionIds.size === 0) return;
    setDeleteConfirmation({ isOpen: true, isBulk: true });
  };

  // Touch Handlers for Drag-to-Select
  const handleTouchStart = (e: React.TouchEvent, questionId: string) => {
    const touch = e.touches[0];
    dragStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    
    if (isSelectionMode) {
      // Start selection drag immediately
      isSelectionDragActive.current = true;
      const isCurrentlySelected = selectedQuestionIds.has(questionId);
      selectionDragRef.current = { 
        active: true, 
        initialState: !isCurrentlySelected,
        lastToggledId: questionId,
        lastX: touch.clientX,
        lastY: touch.clientY
      };
      setQuestionSelection(questionId, !isCurrentlySelected);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const x = touch.clientX;
    const y = touch.clientY;

    if (isSelectionDragActive.current) {
      // Auto-scroll logic
      const scrollThreshold = 100;
      
      if (y < scrollThreshold || y > window.innerHeight - scrollThreshold) {
        if (!scrollIntervalRef.current) {
          scrollIntervalRef.current = setInterval(() => {
            const currentX = selectionDragRef.current.lastX ?? x;
            const currentY = selectionDragRef.current.lastY ?? y;
            
            let speed = 0;
            if (currentY < scrollThreshold) {
              speed = -Math.max(5, (scrollThreshold - currentY) / 3);
            } else if (currentY > window.innerHeight - scrollThreshold) {
              speed = Math.max(5, (currentY - (window.innerHeight - scrollThreshold)) / 3);
            }
            
            if (speed !== 0) {
              window.scrollBy(0, speed);
              // Re-check element under finger after scroll
              const element = document.elementFromPoint(currentX, currentY);
              const row = element?.closest('[data-question-id]');
              if (row) {
                const qId = row.getAttribute('data-question-id');
                if (qId && qId !== selectionDragRef.current.lastToggledId) {
                  selectionDragRef.current.lastToggledId = qId;
                  setQuestionSelection(qId, selectionDragRef.current.initialState);
                }
              }
            }
          }, 16); // ~60fps for smooth scrolling
        }
      } else {
        if (scrollIntervalRef.current) {
          clearInterval(scrollIntervalRef.current);
          scrollIntervalRef.current = null;
        }
      }

      // Update last position for interval
      selectionDragRef.current.lastX = x;
      selectionDragRef.current.lastY = y;

      const element = document.elementFromPoint(x, y);
      const row = element?.closest('[data-question-id]');
      if (row) {
        const qId = row.getAttribute('data-question-id');
        if (qId && qId !== selectionDragRef.current.lastToggledId) {
          selectionDragRef.current.lastToggledId = qId;
          setQuestionSelection(qId, selectionDragRef.current.initialState);
        }
      }
      // Prevent scrolling while selection dragging
      if (e.cancelable) e.preventDefault();
    }
  };

  const handleTouchEnd = async () => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
    
    isSelectionDragActive.current = false;
    selectionDragRef.current.active = false;
    selectionDragRef.current.lastX = null;
    selectionDragRef.current.lastY = null;
  };

  const executeDelete = async () => {
    setLoading(true);
    try {
      if (deleteConfirmation.isBulk) {
        for (const id of selectedQuestionIds) {
          await api.deleteQuestion(id);
        }
        setSelectedQuestionIds(new Set());
      } else if (deleteConfirmation.questionId) {
        await api.deleteQuestion(deleteConfirmation.questionId);
        setSelectedQuestionIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(deleteConfirmation.questionId!);
          return newSet;
        });
      }
    } catch (error) {
      console.error("Error deleting question(s):", error);
      alert("Hubo un error al eliminar.");
    } finally {
      setLoading(false);
      setDeleteConfirmation({ isOpen: false, isBulk: false });
    }
  };

  const toggleQuestionSelection = (id: string, e?: React.MouseEvent | React.TouchEvent) => {
    if (e) e.stopPropagation();
    setSelectedQuestionIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const setQuestionSelection = (id: string, selected: boolean) => {
    setSelectedQuestionIds(prev => {
      if (selected && prev.has(id)) return prev;
      if (!selected && !prev.has(id)) return prev;
      
      // Vibrate on selection change during drag
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
      
      const newSet = new Set(prev);
      if (selected) newSet.add(id);
      else newSet.delete(id);
      return newSet;
    });
  };

  const toggleAllQuestionsSelection = (questionsToToggle: Question[]) => {
    if (selectedQuestionIds.size === questionsToToggle.length) {
      setSelectedQuestionIds(new Set());
    } else {
      setSelectedQuestionIds(new Set(questionsToToggle.map(q => q.id)));
    }
  };

  const openQuestionDetails = async (q: Question) => {
    setSelectedQuestion(q);
  };

  const handleSaveTopicEdit = async () => {
    if (editingTopic) {
      await api.updateTopic(
        userId,
        editingTopic.oldTopic, 
        editingTopic.oldClassification, 
        editingTopic.newTopic, 
        editingTopic.newClassification,
        userRole
      );
      setEditingTopic(null);
      // If we moved the topic out of the current classification, go back to root
      if (editingTopic.oldClassification !== editingTopic.newClassification) {
        setCurrentPath([]);
      } else if (editingTopic.oldTopic !== editingTopic.newTopic) {
        // If we just renamed it, update path
        setCurrentPath([editingTopic.newClassification, editingTopic.newTopic]);
      }
    }
  };

  // Navigation logic
  const navigateTo = (path: string[]) => setCurrentPath(path);
  
  const getBreadcrumbs = () => {
    return (
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
          <button 
            onClick={() => { navigateTo([]); setSearchId(''); setSearchText(''); }} 
            className={`hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 p-1 rounded-lg transition-colors`}
          >
            <Folder size={16} /> Base de Datos
          </button>
          {currentPath.map((segment, idx) => {
            const path = currentPath.slice(0, idx + 1);
            const folderPath = path.length === 1 ? path[0] : `${path[0]}::${path[1]}`;
            
            return (
              <React.Fragment key={idx}>
                <ChevronRight size={16} />
                <button 
                  onClick={() => navigateTo(path)}
                  data-folder-path={folderPath}
                  className={`hover:text-indigo-600 dark:hover:text-indigo-400 p-1 rounded-lg transition-colors`}
                >
                  {segment}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        <div className="flex items-center gap-2 tour-db-filters">
          {isSelectionMode ? (
            <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-800">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                {selectedQuestionIds.size} seleccionados
              </span>
              <div className="w-px h-4 bg-indigo-200 dark:bg-indigo-800 mx-1" />
              <button 
                onClick={() => setIsMoveModalOpen(true)}
                disabled={selectedQuestionIds.size === 0}
                className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Move size={16} />
                <span className="text-xs font-bold">Mover</span>
              </button>
              <button 
                onClick={() => {
                  setIsSelectionMode(false);
                  setSelectedQuestionIds(new Set());
                }}
                className="ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsSelectionMode(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm active:scale-95"
            >
              <CheckCircle2 size={16} className="text-indigo-500" />
              Seleccionar
            </button>
          )}
          <div className="relative">
            <input 
              type="text"
              placeholder="Buscar por texto..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full md:w-64 transition-all text-slate-900 dark:text-white"
            />
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          </div>
          <div className="relative">
            <input 
              type="text"
              placeholder="Buscar por ID..."
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full md:w-40 transition-all text-slate-900 dark:text-white"
            />
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          </div>
        </div>
      </div>
    );
  };

  const handleCreateFolder = async () => {
    if (!newItemName.trim()) return;
    await api.createFolder(userId, newItemName.trim());
    setNewItemName('');
    setIsCreateFolderModalOpen(false);
  };

  const handleCreateTopic = async () => {
    if (!newItemName.trim() || currentPath.length === 0) return;
    const folder = folders.find(f => f.name === currentPath[0]);
    if (folder) {
      await api.createTopic(userId, folder.id, newItemName.trim());
      setNewItemName('');
      setIsCreateTopicModalOpen(false);
    }
  };

  const handleDeleteFolder = async (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Estás seguro de que quieres eliminar esta carpeta?')) {
      await api.deleteFolder(folderId);
    }
  };

  const handleDeleteTopic = async (topicId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Estás seguro de que quieres eliminar este tema?')) {
      await api.deleteTopic(topicId);
    }
  };

  // View rendering logic
  const renderContent = () => {
    if (loading) return <div className="text-center py-12 text-slate-500">Cargando...</div>;

    if (searchId.trim() || searchText.trim()) {
      let filtered = questions;
      if (searchId.trim()) {
        filtered = filtered.filter(q => q.displayId.toString().includes(searchId.trim()));
      }
      if (searchText.trim()) {
        const lowerSearch = searchText.toLowerCase();
        filtered = filtered.filter(q => q.text.toLowerCase().includes(lowerSearch));
      }
      
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Resultados de búsqueda</h3>
            <button onClick={() => { setSearchId(''); setSearchText(''); }} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">Limpiar búsqueda</button>
          </div>
          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {filtered.map(q => (
                <div 
                  key={q.id} 
                  onClick={() => openQuestionDetails(q)}
                  className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:shadow-sm transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/50 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-800 uppercase tracking-tighter">ID: {q.displayId}</span>
                      <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">{q.classification} / {q.topic}</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-200 line-clamp-1 text-sm font-medium">{q.text}</p>
                  </div>
                  <ChevronRight className="text-slate-300 dark:text-slate-600 group-hover:text-indigo-400 transition-colors" size={20} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              <Database className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={48} />
              <p className="text-slate-500 dark:text-slate-400">No se encontraron preguntas para tu búsqueda.</p>
            </div>
          )}
        </div>
      );
    }

    // Level 0: Folders and Recent
    if (currentPath.length === 0) {
      const recentQuestions = [...questions].sort((a, b) => {
        const dateA = a.createdAt || '2000-01-01T00:00:00.000Z';
        const dateB = b.createdAt || '2000-01-01T00:00:00.000Z';
        const dateCmp = dateB.localeCompare(dateA);
        if (dateCmp !== 0) return dateCmp;
        return (b.displayId || 0) - (a.displayId || 0);
      }).slice(0, 10);

      return (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {folders.map(f => {
              const count = questions.filter(q => q.classification === f.name).length;
              return (
                <div key={f.id} className="relative group">
                  <button 
                    onClick={() => navigateTo([f.name])}
                    data-folder-path={f.name}
                    className={`w-full bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border transition-all flex items-center justify-between group text-left border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:shadow-md`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <Folder size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{f.name}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{count} preguntas</p>
                      </div>
                    </div>
                    <ChevronRight className="text-slate-300 dark:text-slate-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                  </button>
                  <button 
                    onClick={(e) => handleDeleteFolder(f.id, e)}
                    className="absolute top-2 right-2 p-2 text-slate-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
            
            <button 
              onClick={() => setIsCreateFolderModalOpen(true)}
              className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center gap-3 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition-all group"
            >
              <Plus size={24} className="group-hover:scale-110 transition-transform" />
              <span className="font-bold">Nueva Carpeta</span>
            </button>
          </div>

          {recentQuestions.length > 0 && (
            <div className="space-y-4">
              <button 
                onClick={() => setIsRecentExpanded(!isRecentExpanded)}
                className="flex items-center justify-between w-full group"
              >
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="text-indigo-600 dark:text-indigo-400" size={20} />
                  Últimas preguntas añadidas
                </h3>
                <div className="flex items-center gap-2 text-slate-400 group-hover:text-indigo-500 transition-colors">
                  <span className="text-xs font-medium">{isRecentExpanded ? 'Ocultar' : 'Mostrar'}</span>
                  {isRecentExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </button>
              
              {isRecentExpanded && (
                <div className="grid grid-cols-1 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  {recentQuestions.map(q => (
                    <div 
                      key={q.id} 
                      onClick={() => openQuestionDetails(q)}
                      onTouchStart={(e) => handleTouchStart(e, q.id)}
                      className={`p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:shadow-sm transition-all cursor-pointer flex items-center justify-between group`}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/50 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-800 uppercase tracking-tighter">ID: {q.displayId}</span>
                          <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">{q.classification} / {q.topic}</span>
                          {q.createdAt && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                              {new Date(q.createdAt).toLocaleDateString()} {new Date(q.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-700 dark:text-slate-200 line-clamp-1 text-sm font-medium">{q.text}</p>
                      </div>
                      <ChevronRight className="text-slate-300 dark:text-slate-600 group-hover:text-indigo-400 transition-colors" size={20} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    // Level 1: Topics
    if (currentPath.length === 1) {
      const classification = currentPath[0];
      const filteredQs = questions.filter(q => q.classification === classification);
      
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {topics.map(t => {
            const topicQs = filteredQs.filter(q => q.topic === t.name);
            const count = topicQs.length;
            const newCount = topicQs.filter(q => (q.hits || 0) === 0 && (q.misses || 0) === 0).length;
            
            return (
              <div 
                key={t.id} 
                data-folder-path={`${classification}::${t.name}`}
                className={`bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border transition-all group relative border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:shadow-md`}
              >
                <button 
                  onClick={() => navigateTo([classification, t.name])}
                  className="w-full flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3">
                    <Folder size={20} className="text-indigo-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                    <div>
                      <h4 className="font-semibold text-slate-800 dark:text-slate-200">{t.name}</h4>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-slate-500 dark:text-slate-400">{count} preguntas</p>
                        {newCount > 0 && (
                          <>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter">
                              {newCount} nuevas
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 dark:text-slate-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                </button>
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingTopic({
                        oldTopic: t.name,
                        oldClassification: classification,
                        newTopic: t.name,
                        newClassification: classification
                      });
                    }}
                    className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg"
                    title="Editar tema"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={(e) => handleDeleteTopic(t.id, e)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                    title="Eliminar tema"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
          
          <button 
            onClick={() => setIsCreateTopicModalOpen(true)}
            className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center gap-3 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition-all group min-h-[80px]"
          >
            <Plus size={20} className="group-hover:scale-110 transition-transform" />
            <span className="font-bold">Nuevo Tema</span>
          </button>
        </div>
      );
    }

    // Level 2: Questions Table
    if (currentPath.length === 2) {
      const [classification, topic] = currentPath;
      const topicQs = questions.filter(q => q.classification === classification && q.topic === topic);
      const newQuestionsCount = topicQs.filter(q => (q.hits || 0) === 0 && (q.misses || 0) === 0).length;

      const filteredQs = [...topicQs]
        .sort((a, b) => {
          const dateA = a.createdAt || '2000-01-01T00:00:00.000Z';
          const dateB = b.createdAt || '2000-01-01T00:00:00.000Z';

          if (topicSort === 'newest') {
            const dateCmp = dateB.localeCompare(dateA);
            if (dateCmp !== 0) return dateCmp;
            return (b.displayId || 0) - (a.displayId || 0);
          }
          if (topicSort === 'oldest') {
            const dateCmp = dateA.localeCompare(dateB);
            if (dateCmp !== 0) return dateCmp;
            return (a.displayId || 0) - (b.displayId || 0);
          }

          // Default complex sorting (SRS based)
          const aFlagged = a.flaggedForTeacher || a.flaggedForCorrection;
          const bFlagged = b.flaggedForTeacher || b.flaggedForCorrection;
          if (aFlagged && !bFlagged) return -1;
          if (!aFlagged && bFlagged) return 1;
          
          const aAnswered = (a.hits || 0) > 0 || (a.misses || 0) > 0;
          const bAnswered = (b.hits || 0) > 0 || (b.misses || 0) > 0;

          // 1. Prioritize Answered questions over NEW questions (not yet answered)
          if (!aAnswered && bAnswered) return 1;
          if (aAnswered && !bAnswered) return -1;

          // 2. If both are Answered, sort by Retrievability Index (descending)
          if (aAnswered && bAnswered) {
            const retA = a.retrievability ?? 0;
            const retB = b.retrievability ?? 0;
            
            if (retA !== retB) return retB - retA; // Higher retrievability first
            
            // Fallback to next review date
            const nextA = a.nextReview || a.nextReviewDate || '9999-12-31';
            const nextB = b.nextReview || b.nextReviewDate || '9999-12-31';
            return nextA.localeCompare(nextB);
          }

          // 3. If both are New, sort by newest first
          const dateCmp = dateB.localeCompare(dateA);
          if (dateCmp !== 0) return dateCmp;
          return (b.displayId || 0) - (a.displayId || 0);
        });

      if (filteredQs.length === 0) return <div className="text-center py-12 text-slate-500 dark:text-slate-400">No hay preguntas en este tema.</div>;

      const allSelected = filteredQs.length > 0 && filteredQs.every(q => selectedQuestionIds.has(q.id));

      const toggleFlag = async (q: Question, e: React.MouseEvent, type: 'teacher' | 'correction') => {
        e.stopPropagation();
        if (type === 'teacher') {
          const newStatus = !q.flaggedForTeacher;
          try {
            await api.updateQuestion(q.id, { 
              flaggedForTeacher: newStatus,
              teacherComment: newStatus ? (q.teacherComment || '') : ''
            });
          } catch (error) {
            console.error("Error toggling flag", error);
          }
        } else {
          const newStatus = !q.flaggedForCorrection;
          try {
            await api.updateQuestion(q.id, { 
              flaggedForCorrection: newStatus,
              correctionComment: newStatus ? (q.correctionComment || '') : ''
            });
          } catch (error) {
            console.error("Error toggling flag", error);
          }
        }
      };

      return (
        <div className="space-y-4">
          {/* Topic Resources Section */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm mb-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <FileIcon size={16} className="text-indigo-600 dark:text-indigo-400" />
                Recursos del Tema
              </h4>
              {!topicResource && !uploadingPdf && (
                <label className="cursor-pointer bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-2">
                  <Upload size={14} />
                  Adjuntar PDF
                  <input type="file" accept="application/pdf" className="hidden" onChange={handlePdfUpload} />
                </label>
              )}
            </div>

            {uploadingPdf ? (
              <div className="flex items-center justify-center py-4 gap-3 text-slate-500 dark:text-slate-400">
                <Loader2 size={20} className="animate-spin text-indigo-600 dark:text-indigo-400" />
                <span className="text-sm font-medium">Procesando y extrayendo texto del PDF...</span>
              </div>
            ) : topicResource ? (
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg flex items-center justify-center">
                    <FileText size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1">{topicResource.fileName}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-tighter">PDF Adjunto • {new Date(topicResource.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <button 
                  onClick={handleDeleteResource}
                  className="p-2 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  title="Eliminar PDF"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ) : (
              <div className="text-center py-4 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium italic">No hay ningún PDF adjunto a este tema.</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="text-indigo-600 dark:text-indigo-400" size={20} />
                Preguntas de {topic}
              </h3>
              {newQuestionsCount > 0 && (
                <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800 animate-in zoom-in duration-300">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  {newQuestionsCount} Preguntas Nuevas
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ordenar por:</span>
              <select 
                value={topicSort}
                onChange={(e) => setTopicSort(e.target.value as any)}
                className="text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 dark:text-slate-300"
              >
                <option value="default">Repaso</option>
                <option value="newest">Más Recientes</option>
                <option value="oldest">Más Antiguas</option>
              </select>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            {selectedQuestionIds.size > 0 && (
              <div className="bg-indigo-50 dark:bg-indigo-900/20 px-6 py-3 border-b border-indigo-100 dark:border-indigo-800 flex items-center justify-between">
                <span className="text-sm font-medium text-indigo-800 dark:text-indigo-300">
                  {selectedQuestionIds.size} pregunta(s) seleccionada(s)
                </span>
                <button 
                  onClick={() => setIsMoveModalOpen(true)}
                  className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Move size={16} /> Mover Seleccionadas
                </button>
                <button 
                  onClick={handleBulkDelete}
                  className="text-sm bg-rose-600 hover:bg-rose-700 text-white px-4 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Trash2 size={16} /> Eliminar Seleccionadas
                </button>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="hidden md:table-header-group bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                  <tr>
                    <th className="px-6 py-4 font-semibold w-12 text-center">
                      {isSelectionMode && (
                        <input 
                          type="checkbox" 
                          checked={allSelected}
                          onChange={() => toggleAllQuestionsSelection(filteredQs)}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-600 focus:ring-indigo-500"
                        />
                      )}
                    </th>
                    <th className="px-6 py-4 font-semibold">Pregunta</th>
                    <th className="px-6 py-4 font-semibold text-center">Marcas</th>
                    <th className="px-6 py-4 font-semibold text-center">Aciertos</th>
                    <th className="px-6 py-4 font-semibold text-center">Fallos</th>
                    <th className="px-6 py-4 font-semibold">Próximo Repaso</th>
                    <th className="px-6 py-4 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredQs.map(q => (
                    <QuestionRow
                      key={q.id}
                      q={q}
                      isSelected={selectedQuestionIds.has(q.id)}
                      isSelectionMode={isSelectionMode}
                      onDetails={openQuestionDetails}
                      onDelete={handleDelete}
                      onToggleFlag={toggleFlag}
                      onToggleSelection={toggleQuestionSelection}
                      onDragStart={handleTouchStart}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div 
      className="max-w-5xl mx-auto select-none bg-white dark:bg-slate-900 min-h-screen"
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Base de Datos
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Gestiona y organiza tus preguntas
            </p>
          </div>
        </div>

        {getBreadcrumbs()}
        {renderContent()}
      </div>

      {/* Move Questions Modal */}
      {isMoveModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh] border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Mover {selectedQuestionIds.size} preguntas</h2>
              <button 
                onClick={() => setIsMoveModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 px-2">Selecciona la carpeta de destino:</p>
              <div className="space-y-1">
                {['Legislativo', 'Específico'].map(classification => {
                  const topics = Array.from(new Set(questions.filter(q => q.classification === classification).map(q => q.topic)))
                    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
                  
                  return (
                    <div key={classification} className="space-y-1">
                      <button
                        onClick={async () => {
                          setLoading(true);
                          try {
                            await api.moveQuestions(Array.from(selectedQuestionIds), { classification });
                            setSelectedQuestionIds(new Set());
                            setIsMoveModalOpen(false);
                            setIsSelectionMode(false);
                          } catch (error) {
                            console.error("Error moving questions:", error);
                          } finally {
                            setLoading(false);
                          }
                        }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors text-left group"
                      >
                        <Folder className="text-indigo-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" size={20} />
                        <span className="font-bold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{classification}</span>
                      </button>
                      <div className="ml-6 space-y-1 border-l-2 border-slate-100 dark:border-slate-800 pl-2">
                        {topics.map(topic => (
                          <button
                            key={topic}
                            onClick={async () => {
                              setLoading(true);
                              try {
                                await api.moveQuestions(Array.from(selectedQuestionIds), { classification, topic });
                                setSelectedQuestionIds(new Set());
                                setIsMoveModalOpen(false);
                                setIsSelectionMode(false);
                              } catch (error) {
                                console.error("Error moving questions:", error);
                              } finally {
                                setLoading(false);
                              }
                            }}
                            className="w-full flex items-center gap-3 p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors text-left group"
                          >
                            <Folder className="text-slate-300 dark:text-slate-600 group-hover:text-indigo-400" size={16} />
                            <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{topic}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details/Edit Modal */}
      {selectedQuestion && (
        <QuestionDetailsModal
          question={selectedQuestion}
          userId={userId}
          userRole={userRole}
          permissions={permissions}
          appUser={appUser}
          onClose={() => setSelectedQuestion(null)}
          onUpdate={(updatedQuestion) => {
            setSelectedQuestion(updatedQuestion);
          }}
          onDelete={() => {
            setSelectedQuestion(null);
          }}
        />
      )}
      {/* Create Folder Modal */}
      {isCreateFolderModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Nueva Carpeta</h2>
              <button 
                onClick={() => setIsCreateFolderModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre de la Carpeta</label>
                <input 
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="Ej: Legislativo, Específico..."
                  className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  autoFocus
                />
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <button 
                  onClick={() => setIsCreateFolderModalOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleCreateFolder}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                >
                  Crear Carpeta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Topic Modal */}
      {isCreateTopicModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Nuevo Tema</h2>
              <button 
                onClick={() => setIsCreateTopicModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre del Tema</label>
                <input 
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="Ej: Tema 1, Constitución..."
                  className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  autoFocus
                />
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <button 
                  onClick={() => setIsCreateTopicModalOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleCreateTopic}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                >
                  Crear Tema
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Topic Modal */}
      {editingTopic && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Editar Tema</h2>
              <button 
                onClick={() => setEditingTopic(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Carpeta</label>
                <select 
                  value={editingTopic.newClassification}
                  onChange={(e) => setEditingTopic({...editingTopic, newClassification: e.target.value})}
                  className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {folders.map(f => (
                    <option key={f.id} value={f.name}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre del Tema</label>
                <input 
                  type="text"
                  value={editingTopic.newTopic}
                  onChange={(e) => setEditingTopic({...editingTopic, newTopic: e.target.value})}
                  className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <button 
                  onClick={() => setEditingTopic(null)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveTopicEdit}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">¿Eliminar {deleteConfirmation.isBulk ? 'preguntas' : 'pregunta'}?</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                {deleteConfirmation.isBulk 
                  ? `Estás a punto de eliminar ${selectedQuestionIds.size} preguntas seleccionadas. Esta acción no se puede deshacer y borrará también su historial.`
                  : 'Estás a punto de eliminar esta pregunta. Esta acción no se puede deshacer y borrará también su historial.'}
              </p>
              <div className="flex justify-center gap-3">
                <button 
                  onClick={() => setDeleteConfirmation({ isOpen: false, isBulk: false })}
                  className="px-6 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={executeDelete}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium transition-colors"
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
