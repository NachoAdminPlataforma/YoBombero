import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { QuestionCreator } from './components/QuestionCreator';
import { TestRunner } from './components/TestRunner';
import { QuestionDatabase } from './components/QuestionDatabase';
import { TestHistory } from './components/TestHistory';
import { ShortcutsView } from './components/ShortcutsView';
import { GlobalSearch } from './components/GlobalSearch';
import { TutorChat } from './components/TutorChat';
import { AdminPanel } from './components/AdminPanel';
import { Question, User as AppUser } from './types';
import { BookOpen, PlusCircle, LayoutDashboard, Database, History, Zap, Menu, X, Moon, Sun, Search, MessageSquare, LogOut, LogIn, ShieldCheck, GraduationCap, Clock } from 'lucide-react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'dashboard' | 'create' | 'test' | 'database' | 'history' | 'shortcuts' | 'admin'>('dashboard');
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
  const [isTutorOpen, setIsTutorOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            setAppUser(userSnap.data() as AppUser);
          } else {
            // New user
            const isDefaultAdmin = firebaseUser.email === 'nachotestprueba@gmail.com';
            const newUser: AppUser = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              role: isDefaultAdmin ? 'admin' : 'pending',
              displayName: firebaseUser.displayName || '',
              photoURL: firebaseUser.photoURL || '',
              permissions: []
            };
            await setDoc(userRef, newUser);
            setAppUser(newUser);
          }
        } catch (error) {
          console.error("Error initializing user profile:", error);
          // If it's a permission error, it might be because the rules are still propagating
          // or there's a mismatch in the isAdmin logic.
        }
      } else {
        setAppUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6 ${isDarkMode ? 'dark' : ''}`}>
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 text-center border border-slate-200 dark:border-slate-700">
          <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <BookOpen size={40} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Academia Test 🚒</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-8">Inicia sesión para acceder a tus tests y seguir tu progreso.</p>
          <button 
            onClick={handleLogin}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-indigo-200 dark:shadow-none"
          >
            <LogIn size={20} />
            Entrar con Google
          </button>
          <div className="mt-8 flex items-center justify-center gap-4">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (appUser?.role === 'pending') {
    return (
      <div className={`min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6 ${isDarkMode ? 'dark' : ''}`}>
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 text-center border border-slate-200 dark:border-slate-700">
          <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Clock size={40} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Acceso Pendiente</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-8">
            Tu cuenta ha sido registrada correctamente, pero aún no tienes acceso a la plataforma. 
            Por favor, contacta con el administrador para que active tu cuenta.
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

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300 ${isDarkMode ? 'dark' : ''}`}>
      {/* Header */}
      {currentView !== 'test' && (
        <>
          <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-30">
            <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xl tracking-tight cursor-pointer" onClick={() => setCurrentView('dashboard')}>
                <BookOpen size={24} />
                <span className="truncate">Plataforma Test 🚒</span>
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
                {appUser?.role === 'admin' && (
                  <button 
                    onClick={() => setCurrentView('create')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${currentView === 'create' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                  >
                    <PlusCircle size={18} />
                    Crear Preguntas
                  </button>
                )}
                {appUser?.role === 'admin' && (
                  <button 
                    onClick={() => setCurrentView('database')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${currentView === 'database' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                  >
                    <Database size={18} />
                    Base de Datos
                  </button>
                )}
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

                <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2" />

                <div className="flex items-center gap-3 ml-2">
                  <div className="flex flex-col items-end hidden sm:flex">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{appUser?.displayName}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      {appUser?.role === 'admin' ? <ShieldCheck size={10} className="text-amber-500" /> : <GraduationCap size={10} className="text-indigo-500" />}
                      {appUser?.role === 'admin' ? 'Administrador' : 'Estudiante'}
                    </span>
                  </div>
                  <img src={appUser?.photoURL} alt="" className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700" referrerPolicy="no-referrer" />
                  <button 
                    onClick={handleLogout}
                    className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Cerrar Sesión"
                  >
                    <LogOut size={20} />
                  </button>
                </div>

                <button 
                  onClick={() => setIsSearchOpen(true)}
                  className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  title="Buscador Global"
                >
                  <Search size={20} />
                </button>

                <button 
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2"
                  title={isDarkMode ? "Modo Claro" : "Modo Oscuro"}
                >
                  {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                  <span className="text-[10px] font-bold uppercase lg:hidden">{isDarkMode ? 'Oscuro' : 'Claro'}</span>
                </button>
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
                {appUser?.role === 'admin' && (
                  <button 
                    onClick={() => { setCurrentView('create'); setIsMenuOpen(false); }}
                    className={`w-full px-4 py-3 rounded-xl text-base font-medium flex items-center gap-3 transition-colors ${currentView === 'create' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                  >
                    <PlusCircle size={20} />
                    Crear Preguntas
                  </button>
                )}
                {appUser?.role === 'admin' && (
                  <button 
                    onClick={() => { setCurrentView('database'); setIsMenuOpen(false); }}
                    className={`w-full px-4 py-3 rounded-xl text-base font-medium flex items-center gap-3 transition-colors ${currentView === 'database' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                  >
                    <Database size={20} />
                    Base de Datos
                  </button>
                )}
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
                
                <div className="h-px bg-slate-200 dark:bg-slate-700 my-2" />
                
                <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl">
                  <img src={appUser?.photoURL} alt="" className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700" referrerPolicy="no-referrer" />
                  <div className="flex-1">
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{appUser?.displayName}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      {appUser?.role === 'admin' ? <ShieldCheck size={10} className="text-amber-500" /> : <GraduationCap size={10} className="text-indigo-500" />}
                      {appUser?.role === 'admin' ? 'Administrador' : 'Estudiante'}
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
          />
        </div>
        <div className={currentView === 'shortcuts' ? 'block' : 'hidden'}>
          <ShortcutsView 
            userId={user.uid}
            userRole={appUser?.role || 'student'} 
            permissions={appUser?.permissions || []} 
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

      {/* Floating AI Tutor Button */}
      {currentView !== 'test' && (
        <button 
          onClick={() => setIsTutorOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-40"
          title="Tutor IA 24/7"
        >
          <MessageSquare size={28} />
        </button>
      )}

      {/* Modals */}
      <GlobalSearch 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
        userId={user.uid}
        userRole={appUser?.role || 'student'} 
        permissions={appUser?.permissions || []} 
      />
      <TutorChat isOpen={isTutorOpen} onClose={() => setIsTutorOpen(false)} />
    </div>
  );
}
