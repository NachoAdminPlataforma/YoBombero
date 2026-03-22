import express from 'express';
import Database from 'better-sqlite3';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
app.use(express.json());

// Health check for debugging
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    env: process.env.NODE_ENV,
    cwd: process.cwd(),
    time: new Date().toISOString()
  });
});

const db = new Database('database.sqlite');

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    displayId INTEGER,
    text TEXT NOT NULL,
    options TEXT NOT NULL,
    correctOptionIndex INTEGER NOT NULL,
    classification TEXT NOT NULL,
    topic TEXT NOT NULL,
    hits INTEGER DEFAULT 0,
    misses INTEGER DEFAULT 0,
    masteryLevel INTEGER DEFAULT 0,
    nextReviewDate TEXT NOT NULL
  );

  -- Ensure displayId exists for existing tables
  PRAGMA table_info(questions);

  CREATE TABLE IF NOT EXISTS saved_prompts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    prompt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS review_history (
    id TEXT PRIMARY KEY,
    questionId TEXT NOT NULL,
    isCorrect INTEGER NOT NULL,
    reviewedAt TEXT NOT NULL,
    FOREIGN KEY(questionId) REFERENCES questions(id)
  );

  CREATE TABLE IF NOT EXISTS test_sessions (
    id TEXT PRIMARY KEY,
    completedAt TEXT NOT NULL,
    topics TEXT NOT NULL,
    totalQuestions INTEGER NOT NULL,
    correctCount INTEGER NOT NULL,
    incorrectCount INTEGER NOT NULL,
    score REAL NOT NULL
  );
`);

// Add displayId column if it doesn't exist
try {
  db.prepare('ALTER TABLE questions ADD COLUMN displayId INTEGER').run();
} catch (e) {
  // Column already exists
}

// Backfill displayId for existing questions
const backfillStmt = db.prepare('SELECT id FROM questions WHERE displayId IS NULL ORDER BY nextReviewDate ASC');
const questionsToBackfill = backfillStmt.all();
if (questionsToBackfill.length > 0) {
  const maxIdStmt = db.prepare('SELECT MAX(displayId) as maxId FROM questions');
  let currentMax = (maxIdStmt.get() as any).maxId || 0;
  
  const updateStmt = db.prepare('UPDATE questions SET displayId = ? WHERE id = ?');
  db.transaction(() => {
    for (const q of questionsToBackfill as any[]) {
      currentMax++;
      updateStmt.run(currentMax, q.id);
    }
  })();
}

// --- API Routes ---

// Proxy to fetch URL content
app.post('/api/fetch-url', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.8,en-US;q=0.5,en;q=0.3'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }
    
    const buffer = await response.arrayBuffer();
    
    // Try to detect charset from headers
    const contentType = response.headers.get('content-type') || '';
    let charset = 'utf-8';
    
    if (contentType.toLowerCase().includes('charset=')) {
      charset = contentType.split('charset=')[1].toLowerCase();
    } else {
      // If no charset in headers, try to peek at the first few KB for a meta tag
      const peekDecoder = new TextDecoder('utf-8', { fatal: false });
      const peekHtml = peekDecoder.decode(buffer.slice(0, 8192));
      const metaCharsetMatch = peekHtml.match(/<meta[^>]*charset=["']?([^"'>\s]+)["']?/i) || 
                               peekHtml.match(/<meta[^>]*content=["'][^"']*charset=([^"'>\s]+)["']/i);
      
      if (metaCharsetMatch) {
        charset = metaCharsetMatch[1].toLowerCase();
      } else {
        // Default to utf-8 for modern web, fallback to iso-8859-1 only if we see common Spanish indicators
        // but actually utf-8 is much safer as a default today.
        charset = 'utf-8';
      }
    }
    
    // Clean up charset string
    charset = charset.replace(/[^a-z0-9-]/g, '');
    if (charset === 'utf8') charset = 'utf-8';
    if (charset.includes('iso88591')) charset = 'iso-8859-1';
    if (charset.includes('windows1252')) charset = 'windows-1252';
    
    // If the charset was detected as something like utf-8_spanish_ci, it's just utf-8
    if (charset.includes('utf-8') || charset.includes('utf8')) charset = 'utf-8';
    
    let html = '';
    try {
      const decoder = new TextDecoder(charset);
      html = decoder.decode(buffer);
    } catch (e) {
      // Fallback to utf-8 if the detected charset is invalid
      const decoder = new TextDecoder('utf-8', { fatal: false });
      html = decoder.decode(buffer);
    }
    
    res.json({ html });
  } catch (error: any) {
    console.error('Error fetching URL:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all questions
app.get('/api/questions', (req, res) => {
  const stmt = db.prepare('SELECT * FROM questions');
  const questions = stmt.all().map((q: any) => ({
    ...q,
    options: JSON.parse(q.options)
  }));
  res.json(questions);
});

// Get topics
app.get('/api/topics', (req, res) => {
  const stmt = db.prepare('SELECT DISTINCT topic, classification FROM questions');
  res.json(stmt.all());
});

// Update topic (move folder or rename)
app.put('/api/topics/:topic', (req, res) => {
  const { topic } = req.params;
  const { oldClassification, newClassification, newTopicName } = req.body;
  const stmt = db.prepare(`
    UPDATE questions 
    SET classification = ?, topic = ?
    WHERE topic = ? AND classification = ?
  `);
  stmt.run(newClassification, newTopicName || topic, topic, oldClassification);
  res.json({ success: true });
});

// Get questions for urgent review
app.get('/api/questions/urgent', (req, res) => {
  const now = new Date().toISOString();
  const stmt = db.prepare('SELECT * FROM questions WHERE nextReviewDate <= ?');
  const questions = stmt.all(now).map((q: any) => ({
    ...q,
    options: JSON.parse(q.options)
  }));
  res.json(questions);
});

// Get custom test questions
app.post('/api/questions/custom-test', (req, res) => {
  const { numQuestions, topics } = req.body;
  if (!topics || topics.length === 0) {
    return res.json([]);
  }
  
  const placeholders = topics.map(() => '?').join(',');
  // Prioritize questions that are due for review
  const stmt = db.prepare(`
    SELECT * FROM questions 
    WHERE topic IN (${placeholders}) 
    ORDER BY nextReviewDate ASC 
    LIMIT ?
  `);
  
  const questions = stmt.all(...topics, numQuestions).map((q: any) => ({
    ...q,
    options: JSON.parse(q.options)
  }));
  res.json(questions);
});

// Add a manual question
app.post('/api/questions', (req, res) => {
  const { text, options, correctOptionIndex, classification, topic } = req.body;
  const id = crypto.randomUUID();
  const nextReviewDate = new Date().toISOString(); // Review immediately
  
  const maxIdStmt = db.prepare('SELECT MAX(displayId) as maxId FROM questions');
  const displayId = ((maxIdStmt.get() as any).maxId || 0) + 1;

  const stmt = db.prepare(`
    INSERT INTO questions (id, displayId, text, options, correctOptionIndex, classification, topic, nextReviewDate)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(id, displayId, text, JSON.stringify(options), correctOptionIndex, classification, topic, nextReviewDate);
  res.json({ success: true, id, displayId });
});

// Update question stats (Spaced Repetition)
app.post('/api/questions/:id/review', (req, res) => {
  const { id } = req.params;
  const { isCorrect, newMasteryLevel, nextReviewDate } = req.body;
  
  db.transaction(() => {
    const stmt = db.prepare(`
      UPDATE questions 
      SET 
        hits = hits + ?, 
        misses = misses + ?, 
        masteryLevel = ?, 
        nextReviewDate = ?
      WHERE id = ?
    `);
    
    stmt.run(
      isCorrect ? 1 : 0, 
      isCorrect ? 0 : 1, 
      newMasteryLevel, 
      nextReviewDate, 
      id
    );

    const historyStmt = db.prepare(`
      INSERT INTO review_history (id, questionId, isCorrect, reviewedAt)
      VALUES (?, ?, ?, ?)
    `);
    historyStmt.run(crypto.randomUUID(), id, isCorrect ? 1 : 0, new Date().toISOString());
  })();
  
  res.json({ success: true });
});

// Update a question manually
app.put('/api/questions/:id', (req, res) => {
  const { id } = req.params;
  const { text, options, correctOptionIndex, classification, topic } = req.body;
  const stmt = db.prepare(`
    UPDATE questions 
    SET text = ?, options = ?, correctOptionIndex = ?, classification = ?, topic = ?
    WHERE id = ?
  `);
  stmt.run(text, JSON.stringify(options), correctOptionIndex, classification, topic, id);
  res.json({ success: true });
});

// Delete a question
app.delete('/api/questions/:id', (req, res) => {
  const { id } = req.params;
  db.transaction(() => {
    db.prepare('DELETE FROM review_history WHERE questionId = ?').run(id);
    db.prepare('DELETE FROM questions WHERE id = ?').run(id);
  })();
  res.json({ success: true });
});

// Get question history
app.get('/api/questions/:id/history', (req, res) => {
  const { id } = req.params;
  const stmt = db.prepare('SELECT * FROM review_history WHERE questionId = ? ORDER BY reviewedAt DESC');
  res.json(stmt.all());
});

// Bulk add questions
app.post('/api/questions/bulk', (req, res) => {
  const { questions, classification, topic } = req.body;
  
  const maxIdStmt = db.prepare('SELECT MAX(displayId) as maxId FROM questions');
  let currentMax = (maxIdStmt.get() as any).maxId || 0;

  const insertStmt = db.prepare(`
    INSERT INTO questions (id, displayId, text, options, correctOptionIndex, classification, topic, nextReviewDate)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const now = new Date().toISOString();
  const savedQuestions: any[] = [];
  
  db.transaction(() => {
    for (const q of questions) {
      const id = crypto.randomUUID();
      currentMax++;
      insertStmt.run(id, currentMax, q.text, JSON.stringify(q.options), q.correctOptionIndex, classification, topic, now);
      savedQuestions.push({ ...q, id, displayId: currentMax, classification, topic, nextReviewDate: now });
    }
  })();
  
  res.json({ questions: savedQuestions });
});

// Saved Prompts
app.get('/api/prompts', (req, res) => {
  const stmt = db.prepare('SELECT * FROM saved_prompts');
  res.json(stmt.all());
});

app.post('/api/prompts', (req, res) => {
  const { title, prompt } = req.body;
  const id = crypto.randomUUID();
  const stmt = db.prepare('INSERT INTO saved_prompts (id, title, prompt) VALUES (?, ?, ?)');
  stmt.run(id, title, prompt);
  res.json({ success: true, id });
});

// Test Sessions
app.get('/api/test-sessions', (req, res) => {
  const stmt = db.prepare('SELECT * FROM test_sessions ORDER BY completedAt DESC');
  const sessions = stmt.all().map((s: any) => ({
    ...s,
    topics: JSON.parse(s.topics)
  }));
  res.json(sessions);
});

app.post('/api/test-sessions', (req, res) => {
  const { topics, totalQuestions, correctCount, incorrectCount, score } = req.body;
  const id = crypto.randomUUID();
  const completedAt = new Date().toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO test_sessions (id, completedAt, topics, totalQuestions, correctCount, incorrectCount, score)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(id, completedAt, JSON.stringify(topics), totalQuestions, correctCount, incorrectCount, score);
  res.json({ success: true, id });
});

// --- Vite Middleware ---
async function startServer() {
  const isDev = process.env.NODE_ENV === 'development' || process.env.VITE_DEV === 'true';
  const PORT = 3000;

  console.log(`[Server] Starting in ${isDev ? 'DEVELOPMENT' : 'PRODUCTION'} mode`);
  console.log(`[Server] Current directory: ${process.cwd()}`);

  if (isDev) {
    console.log('[Server] Initializing Vite middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    console.log(`[Server] Serving static files from: ${distPath}`);
    
    // Serve static files
    app.use(express.static(distPath));
    
    // SPA Fallback - MUST be last
    app.get('*', (req, res) => {
      console.log(`[Server] SPA Fallback for: ${req.url}`);
      res.sendFile(path.join(distPath, 'index.html'), (err) => {
        if (err) {
          console.error('[Server] Error sending index.html:', err);
          res.status(500).send('Error loading application');
        }
      });
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
