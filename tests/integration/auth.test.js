const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const app = require('../../src/app');
const db = require('../../src/config/db');

describe('Integration Tests: Authentication & Authorization Flow', () => {
  let server;
  let baseUrl;
  const testUser = {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'Password123!',
    role: 'manager',
  };
  let authToken;

  before(async () => {
    await db.initDb();
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  test('POST /api/auth/register creates user and returns JWT token', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.status, 'success');
    assert.ok(body.token);
    assert.strictEqual(body.user.username, testUser.username);
    assert.strictEqual(body.user.role, 'manager');
  });

  test('POST /api/auth/register fails on duplicate username/email', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });

    assert.strictEqual(res.status, 409);
  });

  test('POST /api/auth/login succeeds with valid credentials', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usernameOrEmail: testUser.username,
        password: testUser.password,
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, 'success');
    assert.ok(body.token);
    authToken = body.token;
  });

  test('POST /api/auth/login fails with invalid credentials', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usernameOrEmail: testUser.username,
        password: 'wrong_password_123',
      }),
    });

    assert.strictEqual(res.status, 401);
  });

  test('GET /api/auth/me returns current user profile with valid token', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, 'success');
    assert.strictEqual(body.data.username, testUser.username);
  });

  test('GET /api/auth/me returns 401 without token', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`);
    assert.strictEqual(res.status, 401);
  });
});
