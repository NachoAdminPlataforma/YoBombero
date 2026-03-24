import React, { useState } from 'react';
import { api } from '../lib/api';
import { playNotificationSound } from '../lib/audio';
import { Brain, ArrowRightLeft, Search, RefreshCw } from 'lucide-react';

const phoneticMap: Record<string, number> = {
  'r': 0, 'rr': 0,
  't': 1, 'd': 1,
  'n': 2, 'ñ': 2,
  'm': 3, 'w': 3,
  'c': 4, 'k': 4, 'q': 4,
  'l': 5, 'v': 5, 'll': 5,
  's': 6, 'z': 6,
  'f': 7, 'j': 7,
  'g': 8, 'x': 8, 'ch': 8,
  'p': 9, 'b': 9
};

const numberMap: Record<number, string[]> = {
  0: ['R', 'RR'],
  1: ['T', 'D'],
  2: ['N', 'Ñ'],
  3: ['M', 'W'],
  4: ['C', 'K', 'Q'],
  5: ['L', 'V', 'LL'],
  6: ['S', 'Z'],
  7: ['F', 'J'],
  8: ['G', 'X', 'CH'],
  9: ['P', 'B']
};

function wordToNumber(word: string): string {
  let result = '';
  let i = 0;
  const lowerWord = word.toLowerCase();
  while (i < lowerWord.length) {
    const char2 = lowerWord.substring(i, i + 2);
    if (phoneticMap[char2] !== undefined) {
      result += phoneticMap[char2];
      i += 2;
      continue;
    }
    const char1 = lowerWord.substring(i, i + 1);
    if (phoneticMap[char1] !== undefined) {
      result += phoneticMap[char1];
    }
    i += 1;
  }
  return result;
}

function numberToLetters(numStr: string): string[][] {
  return numStr.split('').map(digit => numberMap[parseInt(digit, 10)] || []);
}

export function PhoneticTool() {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const isNumber = /^\d+$/.test(inputValue.trim());
  const convertedValue = isNumber 
    ? numberToLetters(inputValue.trim()).map(arr => `(${arr.join('/')})`).join(' - ')
    : wordToNumber(inputValue.trim());

  const handleSuggest = async () => {
    if (!isNumber || !inputValue.trim()) return;
    setLoadingSuggestions(true);
    const lettersDesc = numberToLetters(inputValue.trim()).map(arr => arr.join(' o ')).join(', seguido de ');
    const words = await api.generatePhoneticWords(inputValue.trim(), lettersDesc);
    setSuggestions(words);
    setLoadingSuggestions(false);
    playNotificationSound();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
          <Brain size={24} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Calculadora Fonética</h2>
      </div>

      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Introduce un número o una palabra
          </label>
          <div className="relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setSuggestions([]);
              }}
              placeholder="Ej: 54 o Loro"
              className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg transition-all text-slate-900 dark:text-white"
            />
            <ArrowRightLeft className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={24} />
          </div>
        </div>

        {inputValue.trim() && (
          <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800 text-center">
            <div className="text-sm text-indigo-600 dark:text-indigo-400 font-medium mb-1 uppercase tracking-wider">
              Resultado
            </div>
            <div className="text-4xl font-black text-indigo-900 dark:text-indigo-300">
              {convertedValue || '-'}
            </div>
          </div>
        )}

        {isNumber && inputValue.trim() && (
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Search size={18} className="text-indigo-500 dark:text-indigo-400" />
                Palabras Posibles
              </h3>
              <button
                onClick={handleSuggest}
                disabled={loadingSuggestions}
                className="px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loadingSuggestions ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                Generar Palabras
              </button>
            </div>

            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {suggestions.map((word, idx) => (
                  <span key={idx} className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium shadow-sm">
                    {word}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
