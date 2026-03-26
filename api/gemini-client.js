import { GoogleGenAI } from '@google/genai';

let aiInstance = null;

export function getGeminiClient() {
  if (!aiInstance) {
    const apiKey = (process.env.GEMINI_API_KEY || process.env.API_KEY || '').trim();
    
    console.log(`--- Buscando API Key en process.env ---`);
    console.log(`GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? 'Presente' : 'Ausente'}`);
    console.log(`API_KEY: ${process.env.API_KEY ? 'Presente' : 'Ausente'}`);

    if (apiKey === 'AIzaSyDlRJ_b202TFhwxQgLIBbdCwbvL35AQWsA') {
      console.warn('--- ADVERTENCIA: Se está utilizando una clave de API de EJEMPLO (placeholder) ---');
      console.warn('--- Por favor, asegúrate de configurar tu clave REAL en los ajustes de AI Studio ---');
    }
    
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY no encontrada en las variables de entorno.');
    }

    // Log de seguridad para verificar la clave cargada (solo extremos)
    console.log(`--- Inicializando Gemini con clave: ${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)} ---`);
    
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}
