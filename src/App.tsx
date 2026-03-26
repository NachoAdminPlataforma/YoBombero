import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { QuestionCreator } from './components/QuestionCreator';
import { TestRunner } from './components/TestRunner';
import { QuestionDatabase } from './components/QuestionDatabase';
import { TestHistory } from './components/TestHistory';
import { ShortcutsView } from './components/ShortcutsView';
import { GlobalSearch } from './components/GlobalSearch';
import { AdminPanel } from './components/AdminPanel';
import { OnboardingModal } from './components/OnboardingModal';
import { FeedbackSection } from './components/FeedbackSection';
import { Question, User as AppUser, Feedback } from './types';
import { BookOpen, PlusCircle, LayoutDashboard, Database, History, Zap, Menu, X, Moon, Sun, Search, MessageSquare, LogOut, LogIn, ShieldCheck, GraduationCap, Clock, Heart, Shield } from 'lucide-react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'dashboard' | 'create' | 'test' | 'database' | 'history' | 'shortcuts' | 'admin' | 'feedback'>('dashboard');
  const [testQuestions, setTestQuestions] = useState<Question[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [localSessionId] = useState(() => Math.random().toString(36).substring(2, 15));
  const [sessionConflict, setSessionConflict] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data() as AppUser;
            
            // Only enforce single session for non-admins
            if (userData.role !== 'admin') {
              try {
                await updateDoc(userRef, { sessionId: localSessionId });
                userData.sessionId = localSessionId;
              } catch (error) {
                console.error("Error updating session ID:", error);
              }
            }
            
            setAppUser(userData);
          } else {
            // New user
            const isDefaultAdmin = firebaseUser.email === 'nachotestprueba@gmail.com';
            const newUser: AppUser = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              role: isDefaultAdmin ? 'admin' : 'pending',
              displayName: firebaseUser.displayName || '',
              photoURL: firebaseUser.photoURL || '',
              permissions: [],
            };
            
            if (!isDefaultAdmin) {
              newUser.sessionId = localSessionId;
            }
            
            await setDoc(userRef, newUser);
            setAppUser(newUser);
          }
        } catch (error) {
          console.error("Error initializing user profile:", error);
        }
      } else {
        setAppUser(null);
        // Do not reset sessionConflict here so the user can see the conflict screen
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [localSessionId]);

  // Listen for session conflicts
  useEffect(() => {
    if (!user || !appUser || appUser.role === 'admin') return;

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as AppUser;
        if (data.sessionId && data.sessionId !== localSessionId) {
          setSessionConflict(true);
          handleLogout();
        }
      }
    });

    return () => unsubscribe();
  }, [user, appUser, localSessionId]);

  useEffect(() => {
    console.log('Dark mode changed:', isDarkMode);
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const handleStartTest = (questions: Question[]) => {
    setTestQuestions(questions);
    setCurrentView('test');
  };

  const handleTestComplete = () => {
    setTestQuestions([]);
    setCurrentView('history');
  };

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
        console.log("Login cancelled by user.");
      } else {
        console.error("Login error:", error);
      }
    }
  };

  const handleLogout = async () => {
    try {
      if (user && appUser && appUser.role !== 'admin') {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data() as AppUser;
          // Only clear the session ID if it belongs to this device
          if (data.sessionId === localSessionId) {
            await updateDoc(userRef, { sessionId: null });
          }
        }
      }
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const getOppositionEmoji = (type?: string) => {
    switch (type) {
      case 'bombero': return '🚒';
      case 'policia': return '👮';
      case 'guardia_civil': return '🚔';
      case 'justicia': return '⚖️';
      case 'administrativo': return '📂';
      case 'sanitario': return '🏥';
      default: return '📚';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (sessionConflict) {
    return (
      <div className={`min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6 ${isDarkMode ? 'dark' : ''}`}>
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 text-center border border-slate-200 dark:border-slate-700">
          <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Shield size={40} className="text-rose-600 dark:text-rose-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Sesión Cerrada</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-8">
            Se ha iniciado sesión en otro dispositivo o pestaña. Por seguridad, solo puedes tener una sesión activa a la vez.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all"
          >
            <LogIn size={18} />
            Volver a Iniciar Sesión
          </button>
        </div>
      </div>
    );
  }

  if (!user || !appUser) {
    return (
      <div className={`min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6 ${isDarkMode ? 'dark' : ''}`}>
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 text-center border border-slate-200 dark:border-slate-700 relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-indigo-50 to-transparent dark:from-indigo-900/20 dark:to-transparent -z-10"></div>
          
          <div className="absolute top-4 right-4">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-full transition-colors shadow-sm"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>

          <div className="w-24 h-24 bg-gradient-to-tr from-indigo-600 to-purple-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-indigo-200 dark:shadow-none transform -rotate-3">
            <BookOpen size={48} className="transform rotate-3" />
          </div>
          
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-3 tracking-tight">Mi Plataforma Test</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-10 text-sm px-4">
            Tu espacio personal para preparar oposiciones. Inicia sesión para continuar tu progreso.
          </p>
          
          <button 
            onClick={handleLogin}
            className="w-full bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-white font-semibold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all transform hover:-translate-y-1 shadow-lg border border-slate-200 dark:border-slate-600"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 15.02 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continuar con Google
          </button>

          <div className="mt-8 text-xs text-slate-400 dark:text-slate-500">
            Al iniciar sesión, aceptas nuestras <br/>
            <a href="#" className="text-indigo-600 dark:text-indigo-400 hover:underline">Condiciones de Uso</a> y <a href="#" className="text-indigo-600 dark:text-indigo-400 hover:underline">Política de Privacidad</a>
          </div>
        </div>
      </div>
    );
  }

  if (appUser && !appUser.onboardingCompleted) {
    return <OnboardingModal user={appUser} onComplete={(updated) => setAppUser(updated)} />;
  }

  if (appUser?.role === 'blocked') {
    return (
      <div className={`min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6 ${isDarkMode ? 'dark' : ''}`}>
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 text-center border border-slate-200 dark:border-slate-700">
          <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Shield size={40} className="text-rose-600 dark:text-rose-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Acceso Restringido</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-8">
            Tu cuenta ha sido bloqueada por el administrador. Si crees que esto es un error, por favor contacta con soporte.
          </p>
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-400">
              Email: <span className="font-bold text-slate-900 dark:text-white">{appUser.email}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              <LogIn size={18} className="rotate-180" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (appUser?.role === 'pending') {
    const firstName = appUser.displayName.split(' ')[0] || 'Opositor/a';
    const emoji = getOppositionEmoji(appUser.oppositionType);
    
    return (
      <div className={`min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6 ${isDarkMode ? 'dark' : ''}`}>
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 text-center border border-slate-200 dark:border-slate-700">
          <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Clock size={40} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            ¡Hola, {firstName}! {emoji}
          </h1>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">Acceso Pendiente</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8">
            Tu perfil ha sido configurado correctamente. El administrador te dará acceso dentro de poco para que puedas empezar a estudiar.
          </p>
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-400">
              <div className="flex justify-between mb-1">
                <span>Nombre:</span>
                <span className="font-bold text-slate-900 dark:text-white">{appUser.displayName}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span>Email:</span>
                <span className="font-bold text-slate-900 dark:text-white">{appUser.email}</span>
              </div>
              <div className="flex justify-between">
                <span>Oposición:</span>
                <span className="font-bold text-slate-900 dark:text-white capitalize">{appUser.oppositionType?.replace('_', ' ') || 'No definida'}</span>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              <LogIn size={18} className="rotate-180" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300 ${isDarkMode ? 'dark' : ''}`}>
      {/* Header */}
      {currentView !== 'test' && (
        <>
          <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-30">
            <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xl tracking-tight cursor-pointer" onClick={() => setCurrentView('dashboard')}>
                <BookOpen size={24} />
                <span className="truncate">
                  Mi Plataforma Test {appUser?.oppositionType === 'bombero' ? '🚒' : 
                                    appUser?.oppositionType === 'policia' ? '👮' : 
                                    appUser?.oppositionType === 'guardia_civil' ? '🚔' : 
                                    appUser?.oppositionType === 'justicia' ? '⚖️' : 
                                    appUser?.oppositionType === 'administrativo' ? '📂' : 
                                    appUser?.oppositionType === 'sanitario' ? '🏥' : '📚'}
                </span>
              </div>
              
              {/* Desktop Navigation */}
              <nav className="hidden lg:flex gap-1 items-center">
                <button 
                  onClick={() => setCurrentView('dashboard')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${currentView === 'dashboard' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                >
                  <LayoutDashboard size={18} />
                  Hacer Test
                </button>
                <button 
                  onClick={() => setCurrentView('shortcuts')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${currentView === 'shortcuts' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                >
                  <Zap size={18} />
                  Atajos
                </button>
                <button 
                  onClick={() => setCurrentView('create')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${currentView === 'create' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                >
                  <PlusCircle size={18} />
                  Crear Preguntas
                </button>
                <button 
                  onClick={() => setCurrentView('database')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${currentView === 'database' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                >
                  <Database size={18} />
                  Base de Datos
                </button>
                {appUser?.role === 'admin' && (
                  <button 
                    onClick={() => setCurrentView('admin')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${currentView === 'admin' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                  >
                    <ShieldCheck size={18} />
                    Panel Admin
                  </button>
                )}
                <button 
                  onClick={() => setCurrentView('history')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${currentView === 'history' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                >
                  <History size={18} />
                  Historial
                </button>
                {appUser?.role !== 'admin' && (
                  <button 
                    onClick={() => setCurrentView('feedback')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${currentView === 'feedback' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                  >
                    <MessageSquare size={18} />
                    Sugerencias
                  </button>
                )}

                <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2" />

                <div className="flex items-center gap-3 ml-2 border-l border-slate-200 dark:border-slate-700 pl-4">
                  <div className="flex flex-col items-end hidden xl:flex">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{appUser?.displayName}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      {appUser?.role === 'admin' ? <ShieldCheck size={10} className="text-amber-500" /> : <GraduationCap size={10} className="text-indigo-500" />}
                      {appUser?.role === 'admin' ? 'Administrador' : (appUser?.gender || 'Opositor/a')}
                    </span>
                  </div>
                  <img src={appUser?.photoURL} alt="" className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 flex-shrink-0" referrerPolicy="no-referrer" />
                  
                  <div className="flex items-center gap-2 ml-2">
                    <button 
                      onClick={() => setIsSearchOpen(true)}
                      className="p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                      title="Buscador Global"
                    >
                      <Search size={20} />
                    </button>
                    <button 
                      onClick={() => setIsDarkMode(!isDarkMode)}
                      className="p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                      title={isDarkMode ? "Modo Claro" : "Modo Oscuro"}
                    >
                      {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                    <button 
                      onClick={handleLogout}
                      className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Cerrar Sesión"
                    >
                      <LogOut size={20} />
                    </button>
                  </div>
                </div>
              </nav>

              {/* Mobile/Tablet Menu Button */}
              <div className="lg:hidden flex items-center gap-2">
                <button 
                  onClick={() => setIsSearchOpen(true)}
                  className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <Search size={24} />
                </button>
                <button 
                  className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                  {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
              </div>
            </div>
          </header>

          {/* Mobile/Tablet Navigation Overlay */}
          {isMenuOpen && (
            <div className="fixed inset-0 z-20 lg:hidden">
              {/* Backdrop */}
              <div 
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                onClick={() => setIsMenuOpen(false)}
              />
              
              {/* Menu Content */}
              <nav className="absolute top-16 left-0 right-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 space-y-2 shadow-xl animate-in slide-in-from-top duration-200">
                <button 
                  onClick={() => { setCurrentView('dashboard'); setIsMenuOpen(false); }}
                  className={`w-full px-4 py-3 rounded-xl text-base font-medium flex items-center gap-3 transition-colors ${currentView === 'dashboard' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                >
                  <LayoutDashboard size={20} />
                  Hacer Test
                </button>
                <button 
                  onClick={() => { setCurrentView('shortcuts'); setIsMenuOpen(false); }}
                  className={`w-full px-4 py-3 rounded-xl text-base font-medium flex items-center gap-3 transition-colors ${currentView === 'shortcuts' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                >
                  <Zap size={20} />
                  Atajos
                </button>
                <button 
                  onClick={() => { setCurrentView('create'); setIsMenuOpen(false); }}
                  className={`w-full px-4 py-3 rounded-xl text-base font-medium flex items-center gap-3 transition-colors ${currentView === 'create' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                >
                  <PlusCircle size={20} />
                  Crear Preguntas
                </button>
                <button 
                  onClick={() => { setCurrentView('database'); setIsMenuOpen(false); }}
                  className={`w-full px-4 py-3 rounded-xl text-base font-medium flex items-center gap-3 transition-colors ${currentView === 'database' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                >
                  <Database size={20} />
                  Base de Datos
                </button>
                {appUser?.role === 'admin' && (
                  <button 
                    onClick={() => { setCurrentView('admin'); setIsMenuOpen(false); }}
                    className={`w-full px-4 py-3 rounded-xl text-base font-medium flex items-center gap-3 transition-colors ${currentView === 'admin' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                  >
                    <ShieldCheck size={20} />
                    Panel Admin
                  </button>
                )}
                <button 
                  onClick={() => { setCurrentView('history'); setIsMenuOpen(false); }}
                  className={`w-full px-4 py-3 rounded-xl text-base font-medium flex items-center gap-3 transition-colors ${currentView === 'history' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                >
                  <History size={20} />
                  Historial
                </button>
                {appUser?.role !== 'admin' && (
                  <button 
                    onClick={() => { setCurrentView('feedback'); setIsMenuOpen(false); }}
                    className={`w-full px-4 py-3 rounded-xl text-base font-medium flex items-center gap-3 transition-colors ${currentView === 'feedback' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                  >
                    <MessageSquare size={20} />
                    Sugerencias
                  </button>
                )}
                
                <div className="h-px bg-slate-200 dark:bg-slate-700 my-2" />
                
                <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl">
                  <img src={appUser?.photoURL} alt="" className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700" referrerPolicy="no-referrer" />
                  <div className="flex-1">
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{appUser?.displayName}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      {appUser?.role === 'admin' ? <ShieldCheck size={10} className="text-amber-500" /> : <GraduationCap size={10} className="text-indigo-500" />}
                      {appUser?.role === 'admin' ? 'Administrador' : (appUser?.gender || 'Opositor/a')}
                    </div>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  >
                    <LogOut size={20} />
                  </button>
                </div>

                <button 
                  onClick={() => { setIsDarkMode(!isDarkMode); setIsMenuOpen(false); }}
                  className="w-full px-4 py-3 rounded-xl text-base font-medium flex items-center gap-3 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                  {isDarkMode ? "Modo Claro" : "Modo Oscuro"}
                </button>
              </nav>
            </div>
          )}
        </>
      )}

      {/* Main Content */}
      <main className={`max-w-6xl mx-auto px-6 ${currentView === 'test' ? 'py-4' : 'py-12 pb-32 sm:pb-24'}`}>
        <div className={currentView === 'dashboard' ? 'block' : 'hidden'}>
          <Dashboard 
            onStartTest={handleStartTest} 
            userId={user.uid} 
            userRole={appUser?.role || 'student'} 
            permissions={appUser?.permissions || []} 
            appUser={appUser}
          />
        </div>
        <div className={currentView === 'shortcuts' ? 'block' : 'hidden'}>
          <ShortcutsView 
            userId={user.uid}
            userRole={appUser?.role || 'student'} 
            permissions={appUser?.permissions || []} 
            appUser={appUser}
          />
        </div>
        <div className={currentView === 'create' ? 'block' : 'hidden'}>
          <QuestionCreator 
            userId={user.uid}
            userRole={appUser?.role || 'student'} 
            permissions={appUser?.permissions || []} 
          />
        </div>
        <div className={currentView === 'database' ? 'block' : 'hidden'}>
          <QuestionDatabase 
            userId={user.uid} 
            userRole={appUser?.role || 'student'} 
            permissions={appUser?.permissions || []} 
          />
        </div>
        <div className={currentView === 'history' ? 'block' : 'hidden'}>
          <TestHistory userId={user.uid} />
        </div>
        <div className={currentView === 'admin' ? 'block' : 'hidden'}>
          {appUser?.role === 'admin' ? <AdminPanel userId={user.uid} /> : <div className="text-center py-20">No tienes permiso para acceder a esta sección.</div>}
        </div>
        <div className={currentView === 'feedback' ? 'block' : 'hidden'}>
          {appUser && appUser.role !== 'admin' ? (
            <FeedbackSection user={appUser} />
          ) : (
            <div className="max-w-4xl mx-auto px-4 py-20 text-center">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Sección no disponible</h2>
              <p className="text-slate-600 dark:text-slate-400">Los administradores no pueden enviar sugerencias desde aquí. Utiliza el Panel de Administración para gestionar el feedback de los opositores.</p>
              <button 
                onClick={() => setCurrentView('dashboard')}
                className="mt-8 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
              >
                Volver al Inicio
              </button>
            </div>
          )}
        </div>
        {currentView === 'test' && (
          <TestRunner 
            questions={testQuestions} 
            onComplete={handleTestComplete} 
            userId={user.uid} 
            userRole={appUser?.role || 'student'}
            permissions={appUser?.permissions || []}
          />
        )}
      </main>

      {/* Modals */}
      <GlobalSearch 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
        userId={user.uid}
        userRole={appUser?.role || 'student'} 
        permissions={appUser?.permissions || []} 
      />
    </div>
  );
}
