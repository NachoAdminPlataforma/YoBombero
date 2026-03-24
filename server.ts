console.log('--- SERVER.TS CARGANDO ---');
import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

// Import API handlers
import analyzeLegislationHandler from './api/analyze-legislation.js';
import generateContentHandler from './api/generate-content.js';
import generatePhoneticWordsHandler from './api/generate-phonetic-words.js';
import generateQuestionsHandler from './api/generate-questions.js';
import getMnemonicHandler from './api/get-mnemonic.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  console.log('--- Iniciando función startServer ---');
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  
  // Diagnóstico de API Keys (solo presencia, no valores)
  console.log('--- Diagnóstico de API Keys ---');
  console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? `Configurada (longitud: ${process.env.GEMINI_API_KEY.length})` : 'No configurada');
  console.log('API_KEY:', process.env.API_KEY ? `Configurada (longitud: ${process.env.API_KEY.length})` : 'No configurada');
  console.log('-------------------------------');

  // API routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.post('/api/analyze-legislation', analyzeLegislationHandler);
  app.post('/api/generate-content', generateContentHandler);
  app.post('/api/generate-phonetic-words', generatePhoneticWordsHandler);
  app.post('/api/generate-questions', generateQuestionsHandler);
  app.post('/api/get-mnemonic', getMnemonicHandler);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    console.log('--- Iniciando creación de servidor Vite ---');
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      console.log('--- Servidor Vite creado correctamente ---');
      app.use(vite.middlewares);
    } catch (viteError) {
      console.error('--- Error al crear servidor Vite ---', viteError);
      throw viteError;
    }
  } else {
    console.log('Configurando servidor en modo producción...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`--- Servidor escuchando en puerto ${PORT} ---`);
    console.log(`Modo: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer();
