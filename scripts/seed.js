require('dotenv').config();
const db = require('../src/config/db');

const initialEmployees = [
  {
    first_name: 'Alex',
    last_name: 'Johnson',
    email: 'alex.johnson@techcorp.io',
    department: 'Engineering',
    role: 'Lead DevOps Engineer',
    salary: 115000,
    status: 'Active',
    hire_date: '2022-03-15',
  },
  {
    first_name: 'Sophia',
    last_name: 'Martinez',
    email: 'sophia.martinez@techcorp.io',
    department: 'Engineering',
    role: 'Senior Cloud Architect',
    salary: 130000,
    status: 'Active',
    hire_date: '2021-08-01',
  },
  {
    first_name: 'David',
    last_name: 'Kim',
    email: 'david.kim@techcorp.io',
    department: 'Product',
    role: 'Product Manager',
    salary: 105000,
    status: 'Active',
    hire_date: '2023-01-10',
  },
  {
    first_name: 'Emily',
    last_name: 'Chen',
    email: 'emily.chen@techcorp.io',
    department: 'Human Resources',
    role: 'HR Director',
    salary: 92000,
    status: 'Active',
    hire_date: '2020-05-20',
  },
  {
    first_name: 'Michael',
    last_name: 'Brown',
    email: 'michael.brown@techcorp.io',
    department: 'Finance',
    role: 'Financial Analyst',
    salary: 88000,
    status: 'On Leave',
    hire_date: '2022-11-05',
  },
  {
    first_name: 'Rachel',
    last_name: 'Green',
    email: 'rachel.green@techcorp.io',
    department: 'Marketing',
    role: 'Marketing Lead',
    salary: 95000,
    status: 'Active',
    hire_date: '2023-04-18',
  },
];

async function seed() {
  try {
    await db.initDb();
    console.log('[Seed] Database initialized.');

    // Seed default admin and employee accounts
    const bcrypt = require('bcryptjs');
    const defaultUsers = [
      { username: 'admin', email: 'admin@techcorp.io', password: 'AdminPassword123!', role: 'admin' },
      { username: 'manager', email: 'manager@techcorp.io', password: 'ManagerPassword123!', role: 'manager' },
      { username: 'developer', email: 'dev@techcorp.io', password: 'DevPassword123!', role: 'employee' }
    ];

    for (const u of defaultUsers) {
      const existingUser = await db.query('SELECT id FROM users WHERE username = ? OR email = ?', [u.username, u.email]);
      if (!existingUser.rows || existingUser.rows.length === 0) {
        const hashed = await bcrypt.hash(u.password, 10);
        await db.query(
          'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
          [u.username, u.email, hashed, u.role]
        );
        console.log(`[Seed] Created default user: ${u.username} (${u.role})`);
      }
    }

    for (const emp of initialEmployees) {
      const existing = await db.query('SELECT id FROM employees WHERE email = ?', [emp.email]);
      if (!existing.rows || existing.rows.length === 0) {
        await db.query(
          `INSERT INTO employees (first_name, last_name, email, department, role, salary, status, hire_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            emp.first_name,
            emp.last_name,
            emp.email,
            emp.department,
            emp.role,
            emp.salary,
            emp.status,
            emp.hire_date,
          ]
        );
        console.log(`[Seed] Inserted employee: ${emp.first_name} ${emp.last_name} (${emp.email})`);
      } else {
        console.log(`[Seed] Skipping existing: ${emp.email}`);
      }
    }

    console.log('[Seed] Seeding completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('[Seed] Error during seeding:', err);
    process.exit(1);
  }
}

seed();
