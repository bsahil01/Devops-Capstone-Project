require('dotenv').config();
const app = require('./app');
const { initDb } = require('./config/db');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await initDb();
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`===============================================`);
      console.log(`🚀 Employee Management System is running`);
      console.log(`🌐 Server listening on http://0.0.0.0:${PORT}`);
      console.log(`🩺 Health check at http://0.0.0.0:${PORT}/api/health`);
      console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`===============================================`);
    });

    // Graceful shutdown handling
    const gracefulShutdown = (signal) => {
      console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
      server.close(() => {
        console.log('[Server] Closed remaining connections.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (err) {
    console.error('[Server] Failed to initialize application:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
