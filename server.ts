import express from 'express';
import path from 'path';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));

// Export the app for Vercel
export default app;

// Start server locally if not in Vercel
async function startServer() {
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    try {
      // Use dynamic import so Vercel's bundler doesn't crash on Rollup binaries
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.error('Failed to start Vite middleware:', e);
    }
  } else if (!process.env.VERCEL) {
    // Serve static files in production if not on Vercel
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Only listen on a port if we are not running as a Vercel serverless function
  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();
