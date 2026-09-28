const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DB_TYPE = process.env.DB_TYPE || (process.env.DATABASE_URL ? 'postgres' : 'sqlite');

let query;
let close;
let initPromise;

if (DB_TYPE === 'postgres') {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/employeedb',
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  query = async (sql, params = []) => {
    // Convert ? placeholders to $1, $2, ... for postgres compatibility
    let idx = 1;
    const pgSql = sql.replace(/\?/g, () => `$${idx++}`);
    const res = await pool.query(pgSql, params);
    return {
      rows: res.rows,
      rowCount: res.rowCount,
      insertId: res.rows[0]?.id || null,
    };
  };

  close = async () => {
    await pool.end();
  };

  initPromise = async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'employee',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        department VARCHAR(50) NOT NULL,
        role VARCHAR(50) NOT NULL,
        salary NUMERIC(10,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'Active',
        hire_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[DB] PostgreSQL tables verified/created successfully.');
  };
} else {
  // Use Node built-in node:sqlite
  const { DatabaseSync } = require('node:sqlite');
  const dbFile = process.env.DATABASE_FILE || path.join(__dirname, '../../data/app.db');

  if (dbFile !== ':memory:') {
    const dir = path.dirname(dbFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new DatabaseSync(dbFile);

  query = async (sql, params = []) => {
    const trimmed = sql.trim().toUpperCase();
    if (trimmed.startsWith('SELECT') || trimmed.startsWith('WITH') || trimmed.startsWith('PRAGMA')) {
      const stmt = db.prepare(sql);
      const rows = stmt.all(...params);
      return { rows, rowCount: rows.length };
    } else {
      const stmt = db.prepare(sql);
      const info = stmt.run(...params);
      return {
        rows: [],
        rowCount: info.changes,
        insertId: Number(info.lastInsertRowid),
      };
    }
  };

  close = async () => {
    db.close();
  };

  initPromise = async () => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'employee',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        department TEXT NOT NULL,
        role TEXT NOT NULL,
        salary REAL NOT NULL,
        status TEXT DEFAULT 'Active',
        hire_date TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[DB] SQLite tables verified/created successfully.');
  };
}

module.exports = {
  query,
  close,
  initDb: initPromise,
  getDbType: () => DB_TYPE,
};
