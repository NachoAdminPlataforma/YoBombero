import React, { useState, useRef } from 'react';
import { User } from '../types';
import { api } from '../lib/api';
import { UserCircle, X, Save, Upload, Image as ImageIcon } from 'lucide-react';
import { storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface EditProfileModalProps {
  user: User;
  onClose: () => void;
  onComplete: (updatedUser: User) => void;
}

export function EditProfileModal({ user, onClose, onComplete }: EditProfileModalProps) {
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [platformName, setPlatformName] = useState(user.platformName || 'Mi Plataforma Test');
  const [photoURL, setPhotoURL] = useState(user.photoURL || '');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Timeout en compresión")), 3000);
      
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        clearTimeout(timeout);
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(dataUrl);
      };
      img.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecciona un archivo de imagen válido.');
      return;
    }

    setUploading(true);
    
    try {
      // 1. Get immediate base64
      const reader = new FileReader();
      const rawBase64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Error al leer el archivo"));
        reader.readAsDataURL(file);
      });
      
      setPhotoURL(rawBase64); // Instant preview!

      // 2. Try to compress, but don't hang if it fails
      try {
        const compressedBase64 = await compressImage(rawBase64);
        setPhotoURL(compressedBase64);
      } catch (compError) {
        console.warn("Usando imagen original debido a fallo en compresión:", compError);
        // If compression fails, we already have the rawBase64 set as preview
      }
    } catch (error) {
      console.error("Error processing image:", error);
      alert('Error al procesar la imagen.');
      setPhotoURL(user.photoURL || '');
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSave = async () => {
    if (!displayName.trim() || !platformName.trim()) return;
    setLoading(true);
    try {
      // Ensure we have a valid photoURL (either the new one or the existing one)
      const finalPhotoURL = photoURL || user.photoURL || '';
      
      const updates = {
        displayName: displayName.trim(),
        platformName: platformName.trim(),
        photoURL: finalPhotoURL,
      };
      
      await api.updateUserProfile(user.id, updates);
      onComplete({ ...user, ...updates });
      onClose();
    } catch (error) {
      console.error("Error saving profile:", error);
      alert('No se pudieron guardar los cambios. Por favor, comprueba tu conexión e inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 dark:border-slate-700">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserCircle className="text-indigo-500" />
            Editar Perfil
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <img 
                src={photoURL || user.photoURL} 
                alt="Profile" 
                className={`w-24 h-24 rounded-full border-4 border-slate-100 dark:border-slate-700 object-cover transition-opacity ${uploading ? 'opacity-50' : 'group-hover:opacity-75'}`}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || 'User')}&background=random`;
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Upload className="text-white drop-shadow-md" size={28} />
              </div>
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              )}
            </div>
            
            <div className="w-full space-y-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <ImageIcon size={18} />
                {uploading ? 'Subiendo...' : 'Subir nueva foto'}
              </button>
              <p className="text-xs text-center text-slate-500 dark:text-slate-400">
                Formatos soportados: JPG, PNG, GIF (Máx. 5MB)
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Tu nombre (o apodo)</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ej: Juan"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white font-medium"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Nombre de la plataforma</label>
              <input
                type="text"
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                placeholder="Ej: Mi Plataforma"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white font-medium"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={!displayName.trim() || !platformName.trim() || loading || uploading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <Save size={20} /> Guardar Cambios
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
