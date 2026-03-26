import React, { useState } from 'react';
import { PhoneticTool } from './PhoneticTool';
import { ImageGenerator } from './ImageGenerator';
import { LegislationAnalyzer } from './LegislationAnalyzer';
import { Brain, Image as ImageIcon, FileText } from 'lucide-react';

import { User as AppUser } from '../types';

interface ShortcutsViewProps {
  userId: string;
  userRole: 'admin' | 'student';
  permissions: string[];
  appUser: AppUser | null;
}

export function ShortcutsView({ userId, userRole, permissions, appUser }: ShortcutsViewProps) {
  const [activeTab, setActiveTab] = useState<'phonetic' | 'images' | 'legislation'>('phonetic');

  const tabs = [
    { id: 'phonetic', label: 'Calculadora Fonética', icon: Brain },
    { id: 'images', label: 'Generador de Imágenes', icon: ImageIcon },
    { id: 'legislation', label: 'Profesor de Legislación', icon: FileText },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Responsive Tab Bar */}
      <div className="bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col lg:flex-row gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-3 transition-all duration-200 ${
                isActive 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none scale-[1.02]' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'} />
              <span className="whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="pt-2">
        <div className={activeTab === 'phonetic' ? 'animate-in fade-in slide-in-from-bottom-2 duration-300' : 'hidden'}>
          <PhoneticTool />
        </div>
        <div className={activeTab === 'images' ? 'animate-in fade-in slide-in-from-bottom-2 duration-300' : 'hidden'}>
          <ImageGenerator appUser={appUser} />
        </div>
        <div className={activeTab === 'legislation' ? 'animate-in fade-in slide-in-from-bottom-2 duration-300' : 'hidden'}>
          <LegislationAnalyzer userId={userId} userRole={userRole} permissions={permissions} />
        </div>
      </div>
    </div>
  );
}
