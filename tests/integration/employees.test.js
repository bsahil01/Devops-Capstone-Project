const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const app = require('../../src/app');
const db = require('../../src/config/db');

describe('Integration Tests: Employee CRUD REST APIs', () => {
  let server;
  let baseUrl;
  let createdEmployeeId;

  const sampleEmployee = {
    first_name: 'Marcus',
    last_name: 'Aurelius',
    email: `marcus_${Date.now()}@philosophy.org`,
    department: 'Engineering',
    role: 'Staff Systems Architect',
    salary: 125000,
    status: 'Active',
    hire_date: '2023-05-15',
  };

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

  test('GET /api/employees returns a list of employees', async () => {
    const res = await fetch(`${baseUrl}/api/employees`);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.status, 'success');
    assert.ok(Array.isArray(body.data));
  });

  test('POST /api/employees creates a new employee (C in CRUD)', async () => {
    const res = await fetch(`${baseUrl}/api/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleEmployee),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.status, 'success');
    assert.strictEqual(body.data.email, sampleEmployee.email);
    assert.strictEqual(body.data.first_name, sampleEmployee.first_name);

    createdEmployeeId = body.data.id;
    assert.ok(createdEmployeeId);
  });

  test('POST /api/employees fails when required fields are missing', async () => {
    const res = await fetch(`${baseUrl}/api/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name: 'Incomplete' }),
    });

    assert.strictEqual(res.status, 400);
  });

  test('GET /api/employees/:id fetches employee by ID (R in CRUD)', async () => {
    const res = await fetch(`${baseUrl}/api/employees/${createdEmployeeId}`);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.status, 'success');
    assert.strictEqual(body.data.id, createdEmployeeId);
    assert.strictEqual(body.data.first_name, sampleEmployee.first_name);
  });

  test('PUT /api/employees/:id updates employee details (U in CRUD)', async () => {
    const res = await fetch(`${baseUrl}/api/employees/${createdEmployeeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'Principal DevOps Architect',
        salary: 140000,
        status: 'Active',
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, 'success');
    assert.strictEqual(body.data.role, 'Principal DevOps Architect');
    assert.strictEqual(Number(body.data.salary), 140000);
  });

  test('GET /api/employees/stats returns valid summary metrics', async () => {
    const res = await fetch(`${baseUrl}/api/employees/stats`);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.status, 'success');
    assert.ok(body.data.totalEmployees >= 1);
    assert.ok(body.data.activeEmployees >= 1);
  });

  test('DELETE /api/employees/:id deletes employee (D in CRUD)', async () => {
    const res = await fetch(`${baseUrl}/api/employees/${createdEmployeeId}`, {
      method: 'DELETE',
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, 'success');

    // Confirm deletion
    const verifyRes = await fetch(`${baseUrl}/api/employees/${createdEmployeeId}`);
    assert.strictEqual(verifyRes.status, 404);
  });

  test('DELETE non-existent employee returns 404', async () => {
    const res = await fetch(`${baseUrl}/api/employees/999999`, {
      method: 'DELETE',
    });
    assert.strictEqual(res.status, 404);
  });
});
