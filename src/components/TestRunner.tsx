import React, { useState } from 'react';
import { Question } from '../types';
import { calculateNextReview } from '../lib/spacedRepetition';
import { api } from '../lib/api';
import { Lightbulb, ArrowRight, CheckCircle2, XCircle, Brain, Star, Save, Edit2, Flag, ChevronDown, AlertTriangle, Pause, Play, MessageSquare, Trash2, Plus } from 'lucide-react';
import { QuestionDetailsModal } from './QuestionDetailsModal';

interface TestRunnerProps {
  questions: Question[];
  onComplete: () => void;
  userId: string;
  userRole: 'admin' | 'student';
  permissions: string[];
}

export function TestRunner({ questions, onComplete, userId, userRole, permissions }: TestRunnerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [results, setResults] = useState<{correct: number, incorrect: number, blank: number}>({ correct: 0, incorrect: 0, blank: 0 });
  const [answers, setAnswers] = useState<{question: Question, selectedOption: number, isBlank: boolean, timeTakenSeconds: number}[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [isPaused, setIsPaused] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [pauseStartTime, setPauseStartTime] = useState<number | null>(null);
  const [totalPausedTime, setTotalPausedTime] = useState<number>(0);
  
  const currentQuestion = questions[currentIndex];
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [loadingMnemonic, setLoadingMnemonic] = useState(false);
  const [isFlaggedForTeacher, setIsFlaggedForTeacher] = useState(currentQuestion.flaggedForTeacher || false);
  const [isFlaggedForCorrection, setIsFlaggedForCorrection] = useState(currentQuestion.flaggedForCorrection || false);
  const [activeCommentType, setActiveCommentType] = useState<'teacher' | 'correction' | null>(null);
  const [teacherComment, setTeacherComment] = useState(currentQuestion.teacherComment || '');
  const [correctionComment, setCorrectionComment] = useState(currentQuestion.correctionComment || '');
  const [isFlagMenuOpen, setIsFlagMenuOpen] = useState(false);
  const [isMnemonicSaved, setIsMnemonicSaved] = useState(false);
  const [savingMnemonic, setSavingMnemonic] = useState(false);
  const [selectedQuestionToEdit, setSelectedQuestionToEdit] = useState<Question | null>(null);
  const [showFlaggedQuestions, setShowFlaggedQuestions] = useState(false);
  const [isUpdatingSRS, setIsUpdatingSRS] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  const togglePause = () => {
    if (isPaused) {
      const pausedDuration = Date.now() - (pauseStartTime || Date.now());
      setTotalPausedTime(prev => prev + pausedDuration);
      setIsPaused(false);
      setPauseStartTime(null);
    } else {
      setIsPaused(true);
      setPauseStartTime(Date.now());
    }
  };

  const toggleFlag = async (type: 'teacher' | 'correction') => {
    setIsFlagMenuOpen(false);
    
    if (type === 'teacher') {
      const newFlagStatus = !isFlaggedForTeacher;
      setIsFlaggedForTeacher(newFlagStatus);
      
      // Update local reference so it appears in the finished screen
      currentQuestion.flaggedForTeacher = newFlagStatus;
      if (!newFlagStatus) currentQuestion.teacherComment = '';
      
      if (newFlagStatus) {
        setActiveCommentType('teacher');
      } else {
        if (activeCommentType === 'teacher') setActiveCommentType(null);
      }
      try {
        await api.updateQuestion(currentQuestion.id, { 
          flaggedForTeacher: newFlagStatus,
          teacherComment: newFlagStatus ? teacherComment : '' 
        });
      } catch (e) {
        console.error("Error updating flag", e);
        setIsFlaggedForTeacher(!newFlagStatus); // Rollback on error
        if (!newFlagStatus && activeCommentType === 'teacher') setActiveCommentType(null);
      }
    } else {
      const newFlagStatus = !isFlaggedForCorrection;
      setIsFlaggedForCorrection(newFlagStatus);
      
      // Update local reference so it appears in the finished screen
      currentQuestion.flaggedForCorrection = newFlagStatus;
      if (!newFlagStatus) currentQuestion.correctionComment = '';
      
      if (newFlagStatus) {
        setActiveCommentType('correction');
      } else {
        if (activeCommentType === 'correction') setActiveCommentType(null);
      }
      try {
        await api.updateQuestion(currentQuestion.id, { 
          flaggedForCorrection: newFlagStatus,
          correctionComment: newFlagStatus ? correctionComment : '' 
        });
      } catch (e) {
        console.error("Error updating flag", e);
        setIsFlaggedForCorrection(!newFlagStatus); // Rollback on error
        if (!newFlagStatus && activeCommentType === 'correction') setActiveCommentType(null);
      }
    }
  };

  const handleCommentChange = async (val: string, type: 'teacher' | 'correction') => {
    if (type === 'teacher') {
      setTeacherComment(val);
      currentQuestion.teacherComment = val;
      if (isFlaggedForTeacher) {
        try {
          await api.updateQuestion(currentQuestion.id, { teacherComment: val });
        } catch (e) {
          console.error("Error updating comment", e);
        }
      }
    } else {
      setCorrectionComment(val);
      currentQuestion.correctionComment = val;
      if (isFlaggedForCorrection) {
        try {
          await api.updateQuestion(currentQuestion.id, { correctionComment: val });
        } catch (e) {
          console.error("Error updating comment", e);
        }
      }
    }
  };

  const isCorrect = selectedOption === currentQuestion.correctOptionIndex;

  const handleOptionSelect = (index: number) => {
    if (isAnswered) return;
    setSelectedOption(index);
  };

  const handleConfirm = async (isBlank: boolean = false) => {
    if (!isBlank && selectedOption === null) return;
    setIsAnswered(true);
    
    // Calculate time taken considering pauses
    let currentPauseDuration = 0;
    if (isPaused && pauseStartTime) {
      currentPauseDuration = Date.now() - pauseStartTime;
    }
    const timeTakenSeconds = (Date.now() - questionStartTime - totalPausedTime - currentPauseDuration) / 1000;

    let correct = false;
    if (isBlank) {
      setSelectedOption(-1);
      setResults(prev => ({ ...prev, blank: prev.blank + 1 }));
      setAnswers(prev => [...prev, { question: currentQuestion, selectedOption: -1, isBlank: true, timeTakenSeconds }]);
    } else {
      correct = selectedOption === currentQuestion.correctOptionIndex;
      setResults(prev => ({
        ...prev,
        correct: prev.correct + (correct ? 1 : 0),
        incorrect: prev.incorrect + (correct ? 0 : 1)
      }));
      setAnswers(prev => [...prev, { question: currentQuestion, selectedOption: selectedOption as number, isBlank: false, timeTakenSeconds }]);
    }

    // Record result immediately with default rating 0 (Again)
    // This ensures that even if the user doesn't provide feedback or leaves the app,
    // the hit/miss is recorded.
    try {
      const srsData = calculateNextReview(currentQuestion, 0);
      await api.reviewQuestion(userId, currentQuestion.id, correct, srsData);
      setHasReviewed(true);
    } catch (e) {
      console.error("Error auto-updating SRS on confirm", e);
    }
  };

  const handleRating = async (rating: number) => {
    if (isUpdatingSRS) return;
    setIsUpdatingSRS(true);
    
    try {
      const srsData = calculateNextReview(currentQuestion, rating);
      
      // Use updateSRS instead of reviewQuestion to avoid double-incrementing hits/misses
      await api.updateSRS(userId, currentQuestion.id, srsData);
      setHasReviewed(true);
      
      // Move to next question
      await handleNext();
    } catch (e) {
      console.error("Error updating SRS", e);
    } finally {
      setIsUpdatingSRS(false);
    }
  };

  const finishTest = async () => {
    // If not answered but an option is selected, confirm it first
    if (!isAnswered && selectedOption !== null) {
      await handleConfirm(false);
    } else if (!isAnswered && selectedOption === null) {
      // If not answered and no option selected, confirm as blank
      await handleConfirm(true);
    }

    // Auto-review current question if answered but not reviewed
    if (isAnswered && !hasReviewed) {
      try {
        const isCorrect = selectedOption === currentQuestion.correctOptionIndex;
        const srsData = calculateNextReview(currentQuestion, 0);
        await api.reviewQuestion(userId, currentQuestion.id, isCorrect, srsData);
        setHasReviewed(true);
      } catch (e) {
        console.error("Error auto-updating SRS in finishTest", e);
      }
    }

    const totalAnswered = results.correct + results.incorrect + results.blank;
    if (totalAnswered === 0) {
      onComplete();
      return;
    }
    
    // Score calculation: 10 * (correct - incorrect/3) / totalAnswered
    const rawScore = results.correct - (results.incorrect / 3);
    const score = Math.max(0, (rawScore / totalAnswered) * 10);
    setFinalScore(score);
    
    const answeredQuestions = questions.slice(0, totalAnswered);
    const topics = Array.from(new Set(answeredQuestions.map(q => q.topic)));
    
    // Calculate topic stats
    const topicStats = topics.map(topic => {
      const topicAnswers = answers.filter(a => a.question.topic === topic);
      const totalQ = topicAnswers.length;
      const correctQ = topicAnswers.filter(a => !a.isBlank && a.selectedOption === a.question.correctOptionIndex).length;
      const blankQ = topicAnswers.filter(a => a.isBlank).length;
      const incorrectQ = totalQ - correctQ - blankQ;
      const totalTime = topicAnswers.reduce((sum, a) => sum + a.timeTakenSeconds, 0);
      
      return {
        topic,
        totalQuestions: totalQ,
        correctCount: correctQ,
        incorrectCount: incorrectQ,
        blankCount: blankQ,
        averageTime: totalQ > 0 ? totalTime / totalQ : 0
      };
    });

    await api.saveTestSession(userId, {
      topics,
      totalQuestions: totalAnswered,
      correctCount: results.correct,
      incorrectCount: results.incorrect,
      blankCount: results.blank,
      score,
      topicStats
    });
    
    setIsFinished(true);
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      setHasReviewed(true); // Assume previous was reviewed or we don't want to auto-review it now
      
      const prevAnswer = answers[prevIndex];
      if (prevAnswer) {
        setSelectedOption(prevAnswer.isBlank ? -1 : prevAnswer.selectedOption);
        setIsAnswered(true);
      } else {
        setSelectedOption(null);
        setIsAnswered(false);
      }
      setMnemonic(null);
      setIsMnemonicSaved(false);
      setIsFlaggedForTeacher(questions[prevIndex].flaggedForTeacher || false);
      setIsFlaggedForCorrection(questions[prevIndex].flaggedForCorrection || false);
      setActiveCommentType(null);
      setIsFlagMenuOpen(false);
      setTeacherComment(questions[prevIndex].teacherComment || '');
      setCorrectionComment(questions[prevIndex].correctionComment || '');
      setIsUpdatingSRS(false);
    }
  };

  const handleNext = async () => {
    // If not answered but an option is selected, confirm it first
    if (!isAnswered && selectedOption !== null) {
      await handleConfirm(false);
    } else if (!isAnswered && selectedOption === null) {
      // If not answered and no option selected, confirm as blank
      await handleConfirm(true);
    }

    // If answered but not reviewed (skipped rating), record as a "miss" with default rating
    // Note: handleConfirm now calls reviewQuestion, so hasReviewed will be true if handleConfirm was called above.
    // But we keep this check for safety if hasReviewed was somehow reset.
    if (isAnswered && !hasReviewed) {
      try {
        const isCorrect = selectedOption === currentQuestion.correctOptionIndex;
        const srsData = calculateNextReview(currentQuestion, 0);
        await api.reviewQuestion(userId, currentQuestion.id, isCorrect, srsData);
        setHasReviewed(true);
      } catch (e) {
        console.error("Error auto-updating SRS", e);
      }
    }

    if (currentIndex < questions.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setHasReviewed(false);
      
      const nextAnswer = answers[nextIndex];
      if (nextAnswer) {
        setSelectedOption(nextAnswer.isBlank ? -1 : nextAnswer.selectedOption);
        setIsAnswered(true);
      } else {
        setSelectedOption(null);
        setIsAnswered(false);
      }
      setMnemonic(null);
      setIsMnemonicSaved(false);
      setQuestionStartTime(Date.now());
      setTotalPausedTime(0);
      setIsPaused(false);
      setPauseStartTime(null);
      setIsFlaggedForTeacher(questions[nextIndex].flaggedForTeacher || false);
      setIsFlaggedForCorrection(questions[nextIndex].flaggedForCorrection || false);
      setActiveCommentType(null);
      setIsFlagMenuOpen(false);
      setTeacherComment(questions[nextIndex].teacherComment || '');
      setCorrectionComment(questions[nextIndex].correctionComment || '');
      setIsUpdatingSRS(false);
    } else {
      await finishTest();
    }
  };

  const handleHelpRemember = async () => {
    setLoadingMnemonic(true);
    setIsMnemonicSaved(false);
    try {
      const text = await api.getMnemonic(
        currentQuestion.text, 
        currentQuestion.options[currentQuestion.correctOptionIndex]
      );
      setMnemonic(text);
    } catch (e) {
      alert('Error al generar mnemotecnia.');
    } finally {
      setLoadingMnemonic(false);
    }
  };

  const handleSaveMnemonic = async () => {
    if (!mnemonic) return;
    setSavingMnemonic(true);
    try {
      await api.saveMnemonic(currentQuestion.id, mnemonic);
      setIsMnemonicSaved(true);
    } catch (e) {
      console.error("Error saving mnemonic", e);
      alert('Error al guardar la mnemotecnia.');
    } finally {
      setSavingMnemonic(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || isAddingComment) return;
    
    setIsAddingComment(true);
    try {
      const currentComments = currentQuestion.comments || [];
      const updatedComments = [...currentComments, newComment.trim()];
      await api.updateQuestionComments(currentQuestion.id, updatedComments);
      
      // Update local state
      currentQuestion.comments = updatedComments;
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleRemoveComment = async (commentIndex: number) => {
    try {
      const currentComments = currentQuestion.comments || [];
      const updatedComments = currentComments.filter((_, i) => i !== commentIndex);
      await api.updateQuestionComments(currentQuestion.id, updatedComments);
      
      // Update local state
      currentQuestion.comments = updatedComments;
    } catch (error) {
      console.error('Error removing comment:', error);
    }
  };

  if (isFinished) {
    const failedAnswers = answers.filter(a => !a.isBlank && a.selectedOption !== a.question.correctOptionIndex);
    const blankAnswers = answers.filter(a => a.isBlank);
    const flaggedAnswers = answers.filter(a => a.question.flaggedForTeacher || a.question.flaggedForCorrection);
    
    return (
      <div className="max-w-3xl mx-auto animate-in fade-in duration-500">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">¡Examen Finalizado!</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8">Aquí tienes el resumen de tu rendimiento.</p>
          
          <div className="flex justify-center items-center gap-8 mb-8">
            <div className="text-center">
              <div className="text-4xl font-black text-emerald-500 mb-1">{results.correct}</div>
              <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Aciertos</div>
            </div>
            <div className="w-px h-12 bg-slate-200 dark:bg-slate-700"></div>
            <div className="text-center">
              <div className="text-4xl font-black text-rose-500 mb-1">{results.incorrect}</div>
              <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Fallos</div>
            </div>
            <div className="w-px h-12 bg-slate-200 dark:bg-slate-700"></div>
            <div className="text-center">
              <div className="text-4xl font-black text-slate-400 dark:text-slate-500 mb-1">{results.blank}</div>
              <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Blancos</div>
            </div>
          </div>

          <div className="inline-block bg-slate-50 dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 mb-8">
            <div className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Nota Final</div>
            <div className={`text-6xl font-black ${finalScore >= 5 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-500 dark:text-rose-400'}`}>
              {finalScore.toFixed(2)}<span className="text-2xl text-slate-400 dark:text-slate-500">/10</span>
            </div>
          </div>

          <button
            onClick={onComplete}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            Ir al Historial <ArrowRight size={20} />
          </button>
        </div>

        {flaggedAnswers.length > 0 && (
          <div className="mb-8">
            <button
              onClick={() => setShowFlaggedQuestions(!showFlaggedQuestions)}
              className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Flag className="text-amber-500" size={24} />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Preguntas Marcadas ({flaggedAnswers.length})</h3>
              </div>
              <ChevronDown size={20} className={`text-slate-400 transition-transform ${showFlaggedQuestions ? 'rotate-180' : ''}`} />
            </button>
            
            {showFlaggedQuestions && (
              <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2">
                {flaggedAnswers.map((answer, idx) => (
                  <div 
                    key={`flagged-${idx}`} 
                    className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-amber-100 dark:border-amber-900/30 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-md transition-all group relative"
                    onClick={() => setSelectedQuestionToEdit(answer.question)}
                  >
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50">
                        <Edit2 size={16} />
                      </button>
                    </div>
                    <div className="flex items-start gap-3 mb-4 pr-10">
                      <Flag className="text-amber-500 shrink-0 mt-1" size={20} />
                      <h4 className="font-medium text-slate-900 dark:text-white">{answer.question.text}</h4>
                    </div>
                    <div className="space-y-2 pl-8">
                      {answer.question.flaggedForTeacher && (
                        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-sm">
                          <span className="font-bold mr-2 flex items-center gap-1"><Star size={14} /> Duda Profesor:</span>
                          {answer.question.teacherComment || 'Sin comentario'}
                        </div>
                      )}
                      {answer.question.flaggedForCorrection && (
                        <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-sm">
                          <span className="font-bold mr-2 flex items-center gap-1"><AlertTriangle size={14} /> Error a corregir:</span>
                          {answer.question.correctionComment || 'Sin comentario'}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {failedAnswers.length > 0 && (
          <div className="space-y-4 mb-8">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white px-2">Preguntas Falladas</h3>
            {failedAnswers.map((answer, idx) => (
              <div 
                key={`failed-${idx}`} 
                className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-rose-100 dark:border-rose-900/30 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-md transition-all group relative"
                onClick={() => setSelectedQuestionToEdit(answer.question)}
              >
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50">
                    <Edit2 size={16} />
                  </button>
                </div>
                <div className="flex items-start gap-3 mb-4 pr-10">
                  <XCircle className="text-rose-500 shrink-0 mt-1" size={20} />
                  <h4 className="font-medium text-slate-900 dark:text-white">{answer.question.text}</h4>
                </div>
                <div className="space-y-2 pl-8">
                  <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-sm">
                    <span className="font-bold mr-2">Tu respuesta:</span>
                    {answer.question.options[answer.selectedOption]}
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-sm">
                    <span className="font-bold mr-2">Respuesta correcta:</span>
                    {answer.question.options[answer.question.correctOptionIndex]}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {blankAnswers.length > 0 && (
          <div className="space-y-4 mb-8">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white px-2">Preguntas en Blanco</h3>
            {blankAnswers.map((answer, idx) => (
              <div 
                key={`blank-${idx}`} 
                className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-md transition-all group relative"
                onClick={() => setSelectedQuestionToEdit(answer.question)}
              >
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50">
                    <Edit2 size={16} />
                  </button>
                </div>
                <div className="flex items-start gap-3 mb-4 pr-10">
                  <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600 shrink-0 mt-1" />
                  <h4 className="font-medium text-slate-900 dark:text-white">{answer.question.text}</h4>
                </div>
                <div className="space-y-2 pl-8">
                  <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-sm">
                    <span className="font-bold mr-2">Respuesta correcta:</span>
                    {answer.question.options[answer.question.correctOptionIndex]}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedQuestionToEdit && (
          <QuestionDetailsModal
            question={selectedQuestionToEdit}
            userId={userId}
            userRole={userRole}
            permissions={permissions}
            onClose={() => setSelectedQuestionToEdit(null)}
            onUpdate={(updatedQuestion) => {
              // Update the question in the answers array so the UI reflects changes
              const newAnswers = [...answers];
              const answerIndex = newAnswers.findIndex(a => a.question.id === updatedQuestion.id);
              if (answerIndex !== -1) {
                newAnswers[answerIndex].question = updatedQuestion;
                setAnswers(newAnswers);
              }
              setSelectedQuestionToEdit(updatedQuestion);
            }}
            onDelete={(id) => {
              // Remove the question from the answers array so it disappears from the summary
              setAnswers(prev => prev.filter(a => a.question.id !== id));
              setSelectedQuestionToEdit(null);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
            <span>Pregunta {currentIndex + 1} de {questions.length}</span>
            <span className="ml-4">{Math.round(((currentIndex) / questions.length) * 100)}% Completado</span>
          </div>
          <div className="flex gap-2">
            {currentIndex > 0 && (
              <button 
                onClick={handlePrevious}
                className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors"
              >
                Anterior
              </button>
            )}
            <button
              onClick={togglePause}
              className="text-sm font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              {isPaused ? <Play size={16} /> : <Pause size={16} />}
              {isPaused ? 'Reanudar' : 'Pausar'}
            </button>
            <button 
              onClick={finishTest}
              className="text-sm font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 px-3 py-1.5 rounded-lg transition-colors"
            >
              Finalizar Examen
            </button>
          </div>
        </div>
        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${((currentIndex) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 relative">
        {isPaused ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mb-6">
              <Pause size={40} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Examen Pausado</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md">
              El tiempo se ha detenido. Haz clic en "Reanudar" cuando estés listo para continuar.
            </p>
            <button
              onClick={togglePause}
              className="bg-amber-500 hover:bg-amber-600 text-white px-8 py-3 rounded-xl font-bold transition-colors flex items-center gap-2 shadow-sm"
            >
              <Play size={20} />
              Reanudar Examen
            </button>
          </div>
        ) : (
          <>
            <div className="absolute top-4 left-4 text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest">
              ID: {currentQuestion.displayId}
            </div>
            
            <div className="absolute top-4 right-4 flex flex-col items-end gap-2 z-20">
          <div className="flex items-center gap-2">
            {isFlaggedForTeacher && activeCommentType !== 'teacher' && (
              <button
                onClick={() => setActiveCommentType('teacher')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 shadow-sm"
                title="Ver comentario profesor"
              >
                <Star size={14} />
                <span className="hidden sm:inline">Ver Comentario</span>
              </button>
            )}
            {isFlaggedForCorrection && activeCommentType !== 'correction' && (
              <button
                onClick={() => setActiveCommentType('correction')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/40 shadow-sm"
                title="Ver comentario corrección"
              >
                <AlertTriangle size={14} />
                <span className="hidden sm:inline">Ver Comentario</span>
              </button>
            )}
            
            <div className="relative">
              <button 
                onClick={() => setIsFlagMenuOpen(!isFlagMenuOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isFlaggedForTeacher || isFlaggedForCorrection
                    ? 'bg-slate-800 dark:bg-slate-700 text-white border border-slate-700 dark:border-slate-600 shadow-sm' 
                    : 'bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 border border-slate-100 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                <Flag size={14} />
                <span className="hidden sm:inline">Marcar</span>
                <ChevronDown size={14} className={`transition-transform ${isFlagMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isFlagMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <button
                    onClick={() => toggleFlag('correction')}
                    className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                      <AlertTriangle size={16} />
                      Corregir fallo
                    </span>
                    {isFlaggedForCorrection && <CheckCircle2 size={16} className="text-rose-500" />}
                  </button>
                  <div className="h-px bg-slate-100 dark:bg-slate-700"></div>
                  <button
                    onClick={() => toggleFlag('teacher')}
                    className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                      <Star size={16} />
                      Preguntar al profesor
                    </span>
                    {isFlaggedForTeacher && <CheckCircle2 size={16} className="text-amber-500" />}
                  </button>
                </div>
              )}
            </div>
          </div>

          {activeCommentType === 'teacher' && isFlaggedForTeacher && (
            <div className="w-64 sm:w-80 animate-in slide-in-from-top-2 duration-200">
              <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl shadow-lg p-3">
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                    Comentario para el profesor:
                  </label>
                </div>
                <textarea
                  value={teacherComment}
                  onChange={(e) => handleCommentChange(e.target.value, 'teacher')}
                  placeholder="¿Qué no entiendes o qué quieres preguntar?"
                  className="w-full p-2 text-sm bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none min-h-[80px] text-amber-900 dark:text-amber-100 placeholder:text-amber-300 dark:placeholder:text-amber-700 mb-2"
                  autoFocus
                />
                <div className="flex justify-end">
                  <button
                    onClick={() => setActiveCommentType(null)}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1"
                  >
                    <Save size={12} /> Guardar y Minimizar
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeCommentType === 'correction' && isFlaggedForCorrection && (
            <div className="w-64 sm:w-80 animate-in slide-in-from-top-2 duration-200">
              <div className="bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-xl shadow-lg p-3">
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                    Comentario de corrección:
                  </label>
                </div>
                <textarea
                  value={correctionComment}
                  onChange={(e) => handleCommentChange(e.target.value, 'correction')}
                  placeholder="¿Qué fallo tiene la pregunta?"
                  className="w-full p-2 text-sm bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none min-h-[80px] text-rose-900 dark:text-rose-100 placeholder:text-rose-300 dark:placeholder:text-rose-700 mb-2"
                  autoFocus
                />
                <div className="flex justify-end">
                  <button
                    onClick={() => setActiveCommentType(null)}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1"
                  >
                    <Save size={12} /> Guardar y Minimizar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4 mt-2">
          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider rounded">
            {currentQuestion.classification}
          </span>
          <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-[10px] md:text-xs font-bold uppercase tracking-wider rounded">
            {currentQuestion.topic}
          </span>
        </div>

        <h2 className="text-lg md:text-2xl font-medium text-slate-900 dark:text-white mb-6 md:mb-8 leading-relaxed">
          {currentQuestion.text}
        </h2>

        <div className="space-y-3 mb-8">
          {currentQuestion.options.map((opt, idx) => {
            let btnClass = "w-full text-left p-4 md:p-5 rounded-xl md:rounded-2xl border-2 transition-all flex items-center gap-3 ";
            
            if (!isAnswered) {
              btnClass += selectedOption === idx 
                ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-300 shadow-sm" 
                : "border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300";
            } else {
              if (idx === currentQuestion.correctOptionIndex) {
                btnClass += "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-900 dark:text-emerald-300";
              } else if (selectedOption === idx) {
                btnClass += "border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-900 dark:text-rose-300";
              } else {
                btnClass += "border-slate-200 dark:border-slate-700 opacity-50 text-slate-500 dark:text-slate-500";
              }
            }

            return (
              <button
                key={idx}
                onClick={() => handleOptionSelect(idx)}
                disabled={isAnswered}
                className={btnClass}
              >
                <span className={`w-7 h-7 md:w-8 md:h-8 shrink-0 flex items-center justify-center rounded-lg text-xs md:text-sm font-bold transition-colors ${
                  selectedOption === idx ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                } ${isAnswered && idx === currentQuestion.correctOptionIndex ? 'bg-emerald-500 text-white' : ''} ${isAnswered && selectedOption === idx && idx !== currentQuestion.correctOptionIndex ? 'bg-rose-500 text-white' : ''}`}>
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="text-sm md:text-lg font-medium">{opt}</span>
                {isAnswered && idx === currentQuestion.correctOptionIndex && <CheckCircle2 className="ml-auto text-emerald-500 shrink-0" size={20} />}
                {isAnswered && selectedOption === idx && idx !== currentQuestion.correctOptionIndex && <XCircle className="ml-auto text-rose-500 shrink-0" size={20} />}
              </button>
            );
          })}
        </div>

        {!isAnswered ? (
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
            <button
              onClick={() => handleConfirm(true)}
              className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold py-3 md:py-4 rounded-xl transition-colors text-sm md:text-base"
            >
              Responder en blanco
            </button>
            <button
              onClick={() => handleConfirm(false)}
              disabled={selectedOption === null}
              className="flex-1 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 md:py-4 rounded-xl transition-colors text-sm md:text-base shadow-lg shadow-slate-200 dark:shadow-none"
            >
              Confirmar Respuesta
            </button>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <p className="text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 text-center">
                ¿Qué tan difícil fue recordar la respuesta?
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3">
                {[
                  { label: 'Again', value: 0, color: 'rose', sub: '1 día', 
                    classes: 'border-rose-100 dark:border-rose-900/30 bg-rose-50/30 dark:bg-rose-900/10 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:border-rose-200 dark:hover:border-rose-800' },
                  { label: 'Hard', value: 1, color: 'amber', sub: 'x1.2',
                    classes: 'border-amber-100 dark:border-amber-900/30 bg-amber-50/30 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-200 dark:hover:border-amber-800' },
                  { label: 'Good', value: 2, color: 'emerald', sub: 'xEF',
                    classes: 'border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/30 dark:bg-emerald-900/10 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-200 dark:hover:border-emerald-800' },
                  { label: 'Easy', value: 3, color: 'indigo', sub: 'xEFx1.3',
                    classes: 'border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/30 dark:bg-indigo-900/10 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-200 dark:hover:border-indigo-800' }
                ].map((rating) => (
                  <button
                    key={rating.value}
                    onClick={() => handleRating(rating.value)}
                    disabled={isUpdatingSRS}
                    className={`flex flex-col items-center justify-center p-3 md:p-4 rounded-xl border-2 transition-all active:scale-95 ${rating.classes}`}
                  >
                    <span className={`text-xs md:text-sm font-black uppercase ${
                      rating.color === 'rose' ? 'text-rose-700 dark:text-rose-400' :
                      rating.color === 'amber' ? 'text-amber-700 dark:text-amber-400' :
                      rating.color === 'emerald' ? 'text-emerald-700 dark:text-emerald-400' :
                      'text-indigo-700 dark:text-indigo-400'
                    }`}>{rating.label}</span>
                    <span className={`text-[9px] md:text-[10px] font-medium ${
                      rating.color === 'rose' ? 'text-rose-600/70 dark:text-rose-500/70' :
                      rating.color === 'amber' ? 'text-amber-600/70 dark:text-amber-500/70' :
                      rating.color === 'emerald' ? 'text-emerald-600/70 dark:text-emerald-500/70' :
                      'text-indigo-600/70 dark:text-indigo-500/70'
                    }`}>{rating.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
              {!isCorrect && (
                <button
                  onClick={handleHelpRemember}
                  disabled={loadingMnemonic || mnemonic !== null}
                  className="flex-1 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-300 font-semibold py-3 md:py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm md:text-base border border-amber-200 dark:border-amber-800"
                >
                  {loadingMnemonic ? 'Generando...' : <><Brain size={20} /> ¡Ayúdame a recordar!</>}
                </button>
              )}
              
              <button
                onClick={() => setShowComments(!showComments)}
                className={`flex-1 font-semibold py-3 md:py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm md:text-base border ${
                  showComments 
                    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' 
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                <MessageSquare size={20} /> Comentarios ({currentQuestion.comments?.length || 0})
              </button>

              <button
                onClick={handleNext}
                className="flex-1 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white font-semibold py-3 md:py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm md:text-base"
              >
                Saltar / Siguiente <ArrowRight size={20} />
              </button>
            </div>

            {showComments && (
              <div className="mt-6 p-6 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold mb-4">
                  <MessageSquare size={20} />
                  <span>Comentarios de la Pregunta</span>
                </div>
                
                <div className="space-y-3 mb-4">
                  {currentQuestion.comments && currentQuestion.comments.length > 0 ? (
                    currentQuestion.comments.map((comment, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 group">
                        <div className="flex-1 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                          {comment}
                        </div>
                        <button
                          onClick={() => handleRemoveComment(idx)}
                          className="p-1 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                          title="Eliminar comentario"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400 italic">No hay comentarios aún.</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                    placeholder="Añadir un comentario..."
                    className="flex-1 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || isAddingComment}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white p-2 rounded-lg transition-colors"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            )}

            {mnemonic && (
              <div className="mt-6 p-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold">
                    <Lightbulb size={20} />
                    <span>Regla Mnemotécnica (Generada por IA)</span>
                  </div>
                  <button
                    onClick={handleSaveMnemonic}
                    disabled={isMnemonicSaved || savingMnemonic}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      isMnemonicSaved
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                    }`}
                  >
                    {isMnemonicSaved ? (
                      <><CheckCircle2 size={14} /> Guardada</>
                    ) : (
                      <><Save size={14} /> {savingMnemonic ? 'Guardando...' : 'Guardar'}</>
                    )}
                  </button>
                </div>
                <p className="text-amber-900 dark:text-amber-100 leading-relaxed whitespace-pre-wrap">
                  {mnemonic}
                </p>
              </div>
            )}
          </div>
        )}
        </>
        )}
      </div>
    </div>
  );
}
