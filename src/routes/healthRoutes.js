const express = require('express');
const router = express.Router();
const os = require('os');
const db = require('../config/db');

router.get('/health', async (req, res) => {
  let dbStatus = 'healthy';
  try {
    await db.query('SELECT 1');
  } catch (err) {
    dbStatus = 'unhealthy';
  }

  const status = dbStatus === 'healthy' ? 200 : 503;
  res.status(status).json({
    status: dbStatus === 'healthy' ? 'UP' : 'DOWN',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    database: {
      type: db.getDbType(),
      status: dbStatus,
    },
    system: {
      memoryUsage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      nodeVersion: process.version,
      platform: process.platform,
      cpus: os.cpus().length,
    },
  });
});

module.exports = router;
