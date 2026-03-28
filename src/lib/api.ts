import { Question, SavedPrompt, ReviewHistory, TestSession, User, Feedback, SurveyResponse } from '../types';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, writeBatch, getDoc, runTransaction, increment, onSnapshot, setDoc, deleteField } from 'firebase/firestore';
import { db, auth } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function getNextDisplayId(count: number = 1): Promise<number> {
  const counterRef = doc(db, 'metadata', 'counters');
  try {
    return await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let currentId = 0;
      if (!counterDoc.exists()) {
        transaction.set(counterRef, { questionDisplayId: count });
      } else {
        currentId = counterDoc.data().questionDisplayId || 0;
        transaction.update(counterRef, { questionDisplayId: currentId + count });
      }
      return currentId + 1; // Return the first ID of the reserved batch
    });
  } catch (e) {
    console.error("Transaction failed: ", e);
    return Math.floor(Math.random() * 1000000); // Fallback
  }
}

export const api = {
  subscribeToQuestions(userId: string, userRole: 'admin' | 'student', permissions: string[], callback: (questions: Question[]) => void): () => void {
    const q = query(collection(db, 'questions'));
    return onSnapshot(q, (snapshot) => {
      const questions = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Question))
        .filter(q => userRole === 'admin' || q.userId === userId || permissions.includes(q.topic));
      callback(questions);
    });
  },

  subscribeToTestSessions(userId: string, callback: (sessions: TestSession[]) => void): () => void {
    const q = query(collection(db, 'test_sessions'), where('userId', '==', userId), orderBy('completedAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TestSession));
      callback(sessions);
    });
  },

  subscribeToUserProgress(userId: string, callback: (progress: Record<string, any>) => void): () => void {
    const q = query(collection(db, 'user_progress'), where('userId', '==', userId));
    return onSnapshot(q, (snapshot) => {
      const progress: Record<string, any> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        progress[data.questionId] = data;
      });
      callback(progress);
    });
  },

  subscribeToTopics(userId: string, userRole: 'admin' | 'student', permissions: string[], callback: (topics: {topic: string, folder: string}[]) => void): () => void {
    const q1 = query(collection(db, 'questions'));
    const q2 = query(collection(db, 'topics'));
    const q3 = query(collection(db, 'folders'));
    
    let questionsData: any[] = [];
    let topicsData: any[] = [];
    let foldersData: any[] = [];

    const updateCallback = () => {
      const topicsMap = new Map<string, string>();
      
      // Add from questions
      questionsData.forEach(data => {
        if (data.topic && data.folder) {
          if (userRole === 'admin' || data.userId === userId || permissions.includes(data.topic)) {
            topicsMap.set(`${data.folder}::${data.topic}`, data.folder);
          }
        }
      });

      // Add from topics
      topicsData.forEach(data => {
        if (data.name && data.folder) {
          if (userRole === 'admin' || data.userId === userId || permissions.includes(data.name)) {
            topicsMap.set(`${data.folder}::${data.name}`, data.folder);
          }
        }
      });

      // Add empty folders
      foldersData.forEach(data => {
        if (data.name) {
          if (userRole === 'admin' || data.userId === userId) {
            // Only add if not already present in topicsMap
            let hasFolder = false;
            for (const key of topicsMap.keys()) {
              if (key.startsWith(`${data.name}::`)) {
                hasFolder = true;
                break;
              }
            }
            if (!hasFolder) {
              topicsMap.set(`${data.name}::`, data.name); // Empty topic string
            }
          }
        }
      });

      const topics = Array.from(topicsMap.entries()).map(([key, folder]) => ({
        topic: key.split('::')[1],
        folder
      })).sort((a, b) => {
        const classCompare = a.folder.localeCompare(b.folder);
        if (classCompare !== 0) return classCompare;
        return a.topic.localeCompare(b.topic, undefined, { numeric: true, sensitivity: 'base' });
      });
      
      callback(topics);
    };

    const unsub1 = onSnapshot(q1, (snapshot) => {
      questionsData = snapshot.docs.map(doc => doc.data());
      updateCallback();
    });

    const unsub2 = onSnapshot(q2, (snapshot) => {
      topicsData = snapshot.docs.map(doc => doc.data());
      updateCallback();
    });

    const unsub3 = onSnapshot(q3, (snapshot) => {
      foldersData = snapshot.docs.map(doc => doc.data());
      updateCallback();
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  },

  async getAllQuestions(userId: string, userRole: 'admin' | 'student' = 'admin'): Promise<Question[]> {
    try {
      const snapshot = await getDocs(collection(db, 'questions'));
      return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Question))
        .filter(q => userRole === 'admin' || q.userId === userId);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'questions');
      return [];
    }
  },

  async getUrgentQuestions(userId: string, userRole: 'admin' | 'student' = 'admin', permissions: string[] = []): Promise<Question[]> {
    const questions = await this.getAllQuestions(userId, userRole);
    const progress = await this.getUserProgress(userId);
    
    const questionsWithProgress = questions
      .filter(q => userRole === 'admin' || q.userId === userId || permissions.includes(q.topic))
      .map(q => ({
        ...q,
        ...(progress[q.id] || { hits: 0, misses: 0, reps: 0, easeFactor: 2.5, interval: 0, nextReviewDate: new Date().toISOString() })
      }));

    const now = new Date().toISOString();
    
    const reviewQuestions = questionsWithProgress.filter(q => 
      (q.hits > 0 || q.misses > 0) && 
      (q.nextReview || q.nextReviewDate) <= now
    );
    
    reviewQuestions.sort((a, b) => {
      const intA = a.interval ?? 0;
      const intB = b.interval ?? 0;
      if (intA !== intB) return intA - intB;
      
      const easeA = a.easeFactor ?? 2.5;
      const easeB = b.easeFactor ?? 2.5;
      if (easeA !== easeB) return easeA - easeB;
      
      const missesA = a.misses ?? 0;
      const missesB = b.misses ?? 0;
      if (missesA !== missesB) return missesB - missesA;
      
      const dateA = a.nextReview || a.nextReviewDate || '';
      const dateB = b.nextReview || b.nextReviewDate || '';
      return dateA.localeCompare(dateB);
    });

    const newQuestions = questionsWithProgress.filter(q => q.hits === 0 && q.misses === 0);
    return [...newQuestions, ...reviewQuestions];
  },

  async getUserProgress(userId: string): Promise<Record<string, any>> {
    try {
      const q = query(collection(db, 'user_progress'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      const progress: Record<string, any> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        progress[data.questionId] = data;
      });
      return progress;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'user_progress');
      return {};
    }
  },

  async getTopics(userId: string, userRole: 'admin' | 'student' = 'admin', permissions: string[] = []): Promise<{topic: string, folder: string}[]> {
    const questions = await this.getAllQuestions(userId, userRole);
    const topicsMap = new Map<string, string>();
    questions.forEach(q => {
      if (userRole === 'admin' || q.userId === userId || permissions.includes(q.topic)) {
        topicsMap.set(`${q.folder}::${q.topic}`, q.folder);
      }
    });
    
    try {
      const q = query(collection(db, 'topics'));
      const snapshot = await getDocs(q);
      snapshot.forEach(doc => {
        const data = doc.data();
        if (userRole === 'admin' || data.userId === userId || permissions.includes(data.name)) {
          topicsMap.set(`${data.folder}::${data.name}`, data.folder);
        }
      });
    } catch (e) {
      // Ignore if collection doesn't exist or permission denied
    }

    return Array.from(topicsMap.entries()).map(([key, folder]) => ({
      topic: key.split('::')[1],
      folder
    })).sort((a, b) => {
      const classCompare = a.folder.localeCompare(b.folder);
      if (classCompare !== 0) return classCompare;
      return a.topic.localeCompare(b.topic, undefined, { numeric: true, sensitivity: 'base' });
    });
  },

  async getFolders(userId: string, userRole: 'admin' | 'student' = 'admin'): Promise<string[]> {
    const topics = await this.getTopics(userId, userRole);
    const foldersSet = new Set<string>(topics.map(t => t.folder));
    
    try {
      const q = query(collection(db, 'folders'));
      const snapshot = await getDocs(q);
      snapshot.forEach(doc => {
        const data = doc.data();
        if (userRole === 'admin' || data.userId === userId) {
          foldersSet.add(data.name);
        }
      });
    } catch (e) {
      // Ignore if collection doesn't exist or permission denied
    }
    
    return Array.from(foldersSet).sort((a, b) => a.localeCompare(b));
  },

  async createFolder(name: string, userId: string): Promise<void> {
    try {
      await addDoc(collection(db, 'folders'), {
        name,
        userId,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'folders');
    }
  },

  async createTopic(name: string, folder: string, userId: string): Promise<void> {
    try {
      await addDoc(collection(db, 'topics'), {
        name,
        folder,
        userId,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'topics');
    }
  },

  async getQuestionsByTopic(userId: string, topic: string, folder: string, userRole: 'admin' | 'student' = 'admin'): Promise<Question[]> {
    try {
      const q = query(collection(db, 'questions'), where('topic', '==', topic), where('folder', '==', folder));
      const snapshot = await getDocs(q);
      return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Question))
        .filter(q => userRole === 'admin' || q.userId === userId);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'questions');
      return [];
    }
  },

  async updateTopic(userId: string, oldTopic: string, oldFolder: string, newTopicName: string, newFolder: string, userRole: 'admin' | 'student' = 'admin'): Promise<void> {
    const q = query(collection(db, 'questions'), 
      where('topic', '==', oldTopic), 
      where('folder', '==', oldFolder)
    );
    const snapshot = await getDocs(q);
    
    const batch = writeBatch(db);
    snapshot.docs.forEach(document => {
      const data = document.data();
      if (userRole === 'admin' || data.userId === userId) {
        batch.update(document.ref, { 
          topic: newTopicName, 
          folder: newFolder 
        });
      }
    });
    await batch.commit();
  },

  async getCustomTest(
    userId: string,
    userRole: 'admin' | 'student',
    permissions: string[],
    topics: { topic: string, folder: string, count: number }[], 
    mode: 'srs' | 'balanced',
    totalNum: number
  ): Promise<Question[]> {
    const allQuestions = await this.getAllQuestions(userId, userRole);
    const progress = await this.getUserProgress(userId);

    const questionsWithProgress = allQuestions
      .filter(q => userRole === 'admin' || q.userId === userId || permissions.includes(q.topic))
      .map(q => ({
        ...q,
        ...(progress[q.id] || { hits: 0, misses: 0, reps: 0, easeFactor: 2.5, interval: 0, nextReviewDate: new Date().toISOString() })
      }));
    
    // Filter questions that belong to any of the selected topics
    const filteredQuestions = questionsWithProgress.filter(q => 
      topics.some(t => t.topic === q.topic && t.folder === q.folder)
    );

    const now = new Date().toISOString();

    // Helper to sort questions by SRS urgency
    const sortByUrgency = (qs: Question[]) => {
      return [...qs].sort((a, b) => {
        // 1. New questions (never answered) have high priority
        const isNewA = a.hits === 0 && a.misses === 0;
        const isNewB = b.hits === 0 && b.misses === 0;
        if (isNewA && !isNewB) return -1;
        if (!isNewA && isNewB) return 1;

        // 2. Due questions
        const isDueA = (a.nextReview || a.nextReviewDate || '') <= now;
        const isDueB = (b.nextReview || b.nextReviewDate || '') <= now;
        if (isDueA && !isDueB) return -1;
        if (!isDueA && isDueB) return 1;

        // 3. Interval (shorter is more urgent)
        const intA = a.interval ?? 0;
        const intB = b.interval ?? 0;
        if (intA !== intB) return intA - intB;
        
        // 4. Ease Factor (lower is harder)
        const easeA = a.easeFactor ?? 2.5;
        const easeB = b.easeFactor ?? 2.5;
        if (easeA !== easeB) return easeA - easeB;
        
        // 5. Misses (more misses is more urgent)
        const missesA = a.misses ?? 0;
        const missesB = b.misses ?? 0;
        if (missesA !== missesB) return missesB - missesA;

        return 0;
      });
    };

    let selectedQuestions: Question[] = [];

    // Separate topics into manual and auto
    const manualTopics = topics.filter(t => t.count > 0);
    const autoTopics = topics.filter(t => t.count === 0);

    // 1. Handle Manual Topics first
    for (const t of manualTopics) {
      const topicQs = filteredQuestions.filter(q => q.topic === t.topic && q.folder === t.folder);
      const sorted = sortByUrgency(topicQs);
      selectedQuestions.push(...sorted.slice(0, t.count));
    }

    // 2. Handle Auto Topics
    if (autoTopics.length > 0) {
      const remainingTotal = Math.max(0, totalNum - manualTopics.reduce((acc, t) => acc + t.count, 0));
      
      if (mode === 'balanced') {
        const quotaPerTopic = Math.floor(remainingTotal / autoTopics.length);
        let extra = remainingTotal % autoTopics.length;

        for (const t of autoTopics) {
          const currentQuota = quotaPerTopic + (extra > 0 ? 1 : 0);
          extra--;
          
          const topicQs = filteredQuestions.filter(q => q.topic === t.topic && q.folder === t.folder);
          const sorted = sortByUrgency(topicQs);
          selectedQuestions.push(...sorted.slice(0, currentQuota));
        }
      } else {
        // SRS Mode: Pool all questions from auto topics and pick the most urgent ones
        const autoQs = filteredQuestions.filter(q => 
          autoTopics.some(at => at.topic === q.topic && at.folder === q.folder)
        );
        const sorted = sortByUrgency(autoQs);
        selectedQuestions.push(...sorted.slice(0, remainingTotal));
      }
    }

    // Final shuffle to not have them strictly grouped by topic if they were added that way
    return selectedQuestions.sort(() => 0.5 - Math.random());
  },

  async createManualQuestion(userId: string, data: Partial<Question>): Promise<{ success: boolean, id: string }> {
    const displayId = await getNextDisplayId(1);
    const docRef = await addDoc(collection(db, 'questions'), {
      ...data,
      userId,
      displayId,
      hits: 0,
      misses: 0,
      masteryLevel: 0,
      nextReviewDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      reps: 0,
      easeFactor: 2.5,
      interval: 0
    });
    return { success: true, id: docRef.id };
  },

  async importQuestions(userId: string, questions: any[]): Promise<{ success: boolean, count: number }> {
    try {
      const questionsCol = collection(db, 'questions');
      const startId = await getNextDisplayId(questions.length);
      let currentId = startId;
      const now = new Date().toISOString();

      // Firestore batches have a limit of 500 operations
      const BATCH_SIZE = 500;
      for (let i = 0; i < questions.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = questions.slice(i, i + BATCH_SIZE);
        
        for (const qData of chunk) {
          const newDocRef = doc(questionsCol);
          batch.set(newDocRef, {
            text: qData.text,
            options: qData.options,
            correctOptionIndex: qData.correctOptionIndex,
            folder: qData.folder,
            topic: qData.topic,
            userId,
            displayId: currentId++,
            hits: 0,
            misses: 0,
            masteryLevel: 0,
            nextReviewDate: now,
            createdAt: now,
            reps: 0,
            easeFactor: 2.5,
            interval: 0
          });
        }
        await batch.commit();
      }
      
      return { success: true, count: questions.length };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'questions');
      return { success: false, count: 0 };
    }
  },

  async generateAIQuestions(data: any): Promise<Question[]> {
    const response = await fetch('/api/generate-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al generar preguntas');
    }
    
    return response.json();
  },

  async saveBulkQuestions(userId: string, questions: any[], folder: string, topic: string, sourcePdf?: string): Promise<{ questions: Question[] }> {
    const startDisplayId = await getNextDisplayId(questions.length);
    const batch = writeBatch(db);
    const savedQuestions: Question[] = [];

    questions.forEach((q, index) => {
      const docRef = doc(collection(db, 'questions'));
      const questionData: any = {
        text: q.text,
        options: q.options,
        correctOptionIndex: q.correctOptionIndex,
        folder,
        topic,
        userId,
        displayId: startDisplayId + index,
        hits: 0,
        misses: 0,
        masteryLevel: 0,
        nextReviewDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        reps: 0,
        easeFactor: 2.5,
        interval: 0
      };
      
      if (sourcePdf) {
        questionData.sourcePdf = sourcePdf;
      }
      
      batch.set(docRef, questionData);
      savedQuestions.push({ id: docRef.id, ...questionData } as Question);
    });

    await batch.commit();
    return { questions: savedQuestions };
  },

  async reviewQuestion(userId: string, id: string, isCorrect: boolean, srsData: any): Promise<void> {
    const progressId = `${userId}_${id}`;
    const progressRef = doc(db, 'user_progress', progressId);
    
    const progressSnap = await getDoc(progressRef);
    if (progressSnap.exists()) {
      await updateDoc(progressRef, {
        hits: isCorrect ? increment(1) : increment(0),
        misses: !isCorrect ? increment(1) : increment(0),
        nextReviewDate: srsData.nextReview,
        lastSeen: new Date().toISOString(),
        ...srsData
      });
    } else {
      await setDoc(progressRef, {
        userId,
        questionId: id,
        hits: isCorrect ? 1 : 0,
        misses: !isCorrect ? 1 : 0,
        masteryLevel: srsData.masteryLevel || 0,
        nextReviewDate: srsData.nextReview,
        reps: srsData.reps || 0,
        easeFactor: srsData.easeFactor || 2.5,
        interval: srsData.interval || 0,
        lastSeen: new Date().toISOString()
      });
    }

    // Add review history
    await addDoc(collection(db, 'review_history'), {
      userId,
      questionId: id,
      isCorrect,
      reviewedAt: new Date().toISOString()
    });
  },

  async updateSRS(userId: string, id: string, srsData: any): Promise<void> {
    const progressId = `${userId}_${id}`;
    const progressRef = doc(db, 'user_progress', progressId);
    await updateDoc(progressRef, {
      nextReviewDate: srsData.nextReview,
      ...srsData
    });
  },

  async updateQuestion(id: string, data: Partial<Question>): Promise<void> {
    const questionRef = doc(db, 'questions', id);
    await updateDoc(questionRef, data);
  },

  async updateQuestionComments(id: string, comments: string[]): Promise<void> {
    const questionRef = doc(db, 'questions', id);
    await updateDoc(questionRef, { comments });
  },

  async checkDuplicateQuestion(text: string, topic: string, folder: string): Promise<Question | null> {
    try {
      const q = query(
        collection(db, 'questions'), 
        where('topic', '==', topic), 
        where('folder', '==', folder),
        where('text', '==', text)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Question;
      }
      return null;
    } catch (error) {
      console.error("Error checking duplicate:", error);
      return null;
    }
  },

  async moveQuestions(ids: string[], destination: { folder: string, topic?: string }): Promise<void> {
    const batch = writeBatch(db);
    ids.forEach(id => {
      const questionRef = doc(db, 'questions', id);
      batch.update(questionRef, destination);
    });
    await batch.commit();
  },

  async deleteQuestion(id: string): Promise<void> {
    await deleteDoc(doc(db, 'questions', id));
  },

  async getQuestionHistory(userId: string, id: string): Promise<ReviewHistory[]> {
    try {
      const q = query(collection(db, 'review_history'), where('userId', '==', userId), where('questionId', '==', id));
      const snapshot = await getDocs(q);
      const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReviewHistory));
      return history.sort((a, b) => new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime());
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'review_history');
      return [];
    }
  },

  async getMnemonic(question: string, correctAnswer: string): Promise<string> {
    try {
      const response = await fetch('/api/generate-mnemonic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, correctAnswer })
      });
      if (!response.ok) return 'Error al generar la regla mnemotécnica.';
      const data = await response.json();
      return data.mnemonic;
    } catch (error) {
      console.error("Error generating mnemonic:", error);
      return 'Error al generar la regla mnemotécnica.';
    }
  },

  async saveMnemonic(questionId: string, mnemonic: string): Promise<void> {
    await addDoc(collection(db, 'mnemonics'), {
      questionId,
      mnemonic,
      createdAt: new Date().toISOString()
    });

    const questionRef = doc(db, 'questions', questionId);
    const questionSnap = await getDoc(questionRef);
    if (questionSnap.exists()) {
      const data = questionSnap.data();
      const mnemonics = data.mnemonics || [];
      if (!mnemonics.includes(mnemonic)) {
        await updateDoc(questionRef, {
          mnemonics: [...mnemonics, mnemonic]
        });
      }
    }
  },

  async getSavedPrompts(): Promise<SavedPrompt[]> {
    try {
      const snapshot = await getDocs(collection(db, 'saved_prompts'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavedPrompt));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'saved_prompts');
      return [];
    }
  },

  async savePrompt(title: string, prompt: string): Promise<void> {
    await addDoc(collection(db, 'saved_prompts'), { title, prompt });
  },

  async getTestSessions(userId: string): Promise<TestSession[]> {
    try {
      const q = query(collection(db, 'test_sessions'), where('userId', '==', userId), orderBy('completedAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TestSession));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'test_sessions');
      return [];
    }
  },

  async saveTestSession(userId: string, data: Omit<TestSession, 'id' | 'completedAt' | 'userId'>): Promise<void> {
    await addDoc(collection(db, 'test_sessions'), {
      ...data,
      userId,
      completedAt: new Date().toISOString()
    });
  },

  async generatePhoneticWords(numberStr: string, letters: string): Promise<string[]> {
    try {
      const response = await fetch('/api/generate-phonetic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numberStr, letters })
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.words || [];
    } catch (error) {
      console.error("Error generating phonetic words:", error);
      return [];
    }
  },

  async generateAIContent(prompt: string): Promise<string> {
    try {
      const response = await fetch('/api/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      if (!response.ok) throw new Error("Error en el servidor");
      const data = await response.json();
      return data.text || "";
    } catch (error) {
      console.error("Error generating AI content:", error);
      throw error;
    }
  },

  // Topic Resources (PDFs)
  async getTopicResource(topic: string, folder: string): Promise<any | null> {
    const q = query(
      collection(db, 'topic_resources'), 
      where('topic', '==', topic), 
      where('folder', '==', folder)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  },

  async saveTopicResource(data: any): Promise<void> {
    const existing = await this.getTopicResource(data.topic, data.folder);
    if (existing) {
      await updateDoc(doc(db, 'topic_resources', existing.id), {
        ...data,
        updatedAt: new Date().toISOString()
      });
    } else {
      await addDoc(collection(db, 'topic_resources'), {
        ...data,
        createdAt: new Date().toISOString()
      });
    }
  },

  async deleteTopicResource(id: string): Promise<void> {
    await deleteDoc(doc(db, 'topic_resources', id));
  },

  // User Management
  async getAllUsers(): Promise<User[]> {
    try {
      const q = query(collection(db, 'users'), orderBy('email'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
      return [];
    }
  },

  async updateUserRole(userId: string, role: 'admin' | 'student' | 'pending' | 'blocked'): Promise<void> {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { role });
  },

  async blockUser(userId: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { 
        role: 'blocked',
        sessionId: deleteField()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  },

  async resetUserSession(userId: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { sessionId: deleteField() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  },

  async deleteUser(userId: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { 
        role: 'blocked',
        sessionId: deleteField()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  },

  async updateUserPermissions(userId: string, permissions: string[]): Promise<void> {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { permissions });
  },

  async resetAllUsersOnboarding(adminId: string): Promise<{ success: boolean; count: number }> {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const batch = writeBatch(db);
      let count = 0;

      snapshot.docs.forEach((userDoc) => {
        const userData = userDoc.data();
        // Don't reset the admin who is performing the action, 
        // and don't reset the default admin email just in case
        if (userDoc.id !== adminId && userData.role !== 'admin' && userData.email !== 'nachotestprueba@gmail.com') {
          batch.update(userDoc.ref, { 
            onboardingCompleted: false,
            role: 'pending',
            gender: deleteField(),
            oppositionType: deleteField(),
            displayName: deleteField()
          });
          count++;
        }
      });

      await batch.commit();
      return { success: true, count };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users');
      return { success: false, count: 0 };
    }
  },

  subscribeToUsers(callback: (users: User[]) => void) {
    const q = query(collection(db, 'users'), orderBy('email'));
    return onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      callback(users);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
  },

  async updateUserTutorials(userId: string, tutorials: Record<string, boolean>): Promise<void> {
    const userRef = doc(db, 'users', userId);
    try {
      const updates: Record<string, boolean> = {};
      for (const [key, value] of Object.entries(tutorials)) {
        updates[`tutorialsCompleted.${key}`] = value;
      }
      await updateDoc(userRef, updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  },

  async updateUserProfile(userId: string, data: Partial<User>): Promise<void> {
    const userRef = doc(db, 'users', userId);
    try {
      await updateDoc(userRef, data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  },

  async submitFeedback(feedback: Omit<Feedback, 'id' | 'createdAt' | 'status'>): Promise<void> {
    try {
      await addDoc(collection(db, 'feedback'), {
        ...feedback,
        createdAt: new Date().toISOString(),
        status: 'pending'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'feedback');
    }
  },

  subscribeToFeedback(callback: (feedback: Feedback[]) => void): () => void {
    const q = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const feedback = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Feedback));
      callback(feedback);
    });
  },

  async deleteFeedback(feedbackId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'feedback', feedbackId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `feedback/${feedbackId}`);
    }
  },

  async updateFeedbackStatus(feedbackId: string, status: 'pending' | 'reviewed'): Promise<void> {
    try {
      await updateDoc(doc(db, 'feedback', feedbackId), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `feedback/${feedbackId}`);
    }
  },

  async saveSurveyResponse(userId: string, user: User, answer: string): Promise<void> {
    try {
      await setDoc(doc(db, 'survey_responses', userId), {
        userId,
        userEmail: user.email,
        userName: user.displayName,
        userPhoto: user.photoURL,
        answer,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `survey_responses/${userId}`);
    }
  },

  async getSurveyResponse(userId: string): Promise<SurveyResponse | null> {
    try {
      const docSnap = await getDoc(doc(db, 'survey_responses', userId));
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as SurveyResponse;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `survey_responses/${userId}`);
      return null;
    }
  },

  subscribeToSurveyResponses(callback: (responses: SurveyResponse[]) => void): () => void {
    const q = query(collection(db, 'survey_responses'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const responses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SurveyResponse));
      callback(responses);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'survey_responses');
    });
  },
};

function fixEncodingArtifacts(text: string): string {
  if (!text) return text;
  let fixed = text
    .replace(/Ã¡/g, 'á')
    .replace(/Ã©/g, 'é')
    .replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã±/g, 'ñ')
    .replace(/Ã‘/g, 'Ñ')
    .replace(/Ã /g, 'Á')
    .replace(/Ã‰/g, 'É')
    .replace(/Ã /g, 'Í')
    .replace(/Ã“/g, 'Ó')
    .replace(/Ãš/g, 'Ú')
    .replace(/Â¿/g, '¿')
    .replace(/Â¡/g, '¡');
    
  // Fix common PDF extraction artifacts for Spanish
  // 'ó' often becomes '³'
  fixed = fixed.replace(/([a-zA-Z])³([a-zA-Z])/g, '$1ó$2');
  fixed = fixed.replace(/([a-zA-Z])³(?=[\s.,;:)\]}?!]|$)/g, '$1ó');
  fixed = fixed.replace(/(^|[\s(>\[{])³([a-zA-Z])/g, '$1ó$2');
  
  // Revert common volume units that might have been mangled by the above rule
  fixed = fixed.replace(/\b(m|cm|km|mm)ó(?=[\s.,;:)\]}?!]|$)/g, '$1³');
  
  // 'í' often becomes '¡' (only inside words to avoid replacing valid opening exclamation marks)
  fixed = fixed.replace(/([a-zA-Z])¡([a-zA-Z])/g, '$1í$2');
  
  // 'ñ' often becomes '±'
  fixed = fixed.replace(/([a-zA-Z])±([a-zA-Z])/g, '$1ñ$2');
  
  return fixed;
}

function cleanParsedData(data: any): any {
  if (typeof data === 'string') {
    return fixEncodingArtifacts(data);
  }
  if (Array.isArray(data)) {
    return data.map(cleanParsedData);
  }
  if (data !== null && typeof data === 'object') {
    const cleaned: any = {};
    for (const key in data) {
      cleaned[key] = cleanParsedData(data[key]);
    }
    return cleaned;
  }
  return data;
}

function parseAIResponse(textResponse: string) {
  let parsed;
  try {
    parsed = JSON.parse(textResponse);
  } catch (e) {
    console.error("Failed to parse JSON:", textResponse);
    const match = textResponse.match(/```json\n([\s\S]*?)\n```/);
    if (match) {
      parsed = JSON.parse(match[1]);
    } else {
      throw new Error("Invalid JSON response from AI");
    }
  }
  return cleanParsedData(parsed);
}

