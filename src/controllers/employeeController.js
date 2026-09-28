const db = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

/**
 * Get all employees with optional search, filtering, and pagination
 */
const getEmployees = async (req, res, next) => {
  try {
    const { search, department, status, sort = 'id', order = 'asc', page = 1, limit = 50 } = req.query;

    let queryStr = 'SELECT * FROM employees WHERE 1=1';
    const params = [];

    if (search) {
      queryStr += ' AND (LOWER(first_name) LIKE ? OR LOWER(last_name) LIKE ? OR LOWER(email) LIKE ?)';
      const searchPattern = `%${search.toLowerCase()}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (department && department !== 'All') {
      queryStr += ' AND department = ?';
      params.push(department);
    }

    if (status && status !== 'All') {
      queryStr += ' AND status = ?';
      params.push(status);
    }

    // Sanitize sort and order to prevent SQL injection
    const allowedSortFields = ['id', 'first_name', 'last_name', 'email', 'department', 'role', 'salary', 'status', 'hire_date'];
    const safeSort = allowedSortFields.includes(sort) ? sort : 'id';
    const safeOrder = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    queryStr += ` ORDER BY ${safeSort} ${safeOrder}`;

    const numLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 50));
    const numPage = Math.max(1, parseInt(page, 10) || 1);
    const offset = (numPage - 1) * numLimit;

    queryStr += ` LIMIT ${numLimit} OFFSET ${offset}`;

    const result = await db.query(queryStr, params);

    // Get total count for pagination metadata
    let countSql = 'SELECT COUNT(*) as total FROM employees WHERE 1=1';
    const countParams = [];
    if (search) {
      countSql += ' AND (LOWER(first_name) LIKE ? OR LOWER(last_name) LIKE ? OR LOWER(email) LIKE ?)';
      const searchPattern = `%${search.toLowerCase()}%`;
      countParams.push(searchPattern, searchPattern, searchPattern);
    }
    if (department && department !== 'All') {
      countSql += ' AND department = ?';
      countParams.push(department);
    }
    if (status && status !== 'All') {
      countSql += ' AND status = ?';
      countParams.push(status);
    }

    const countResult = await db.query(countSql, countParams);
    const totalCount = parseInt(countResult.rows[0]?.total || 0, 10);

    res.status(200).json({
      status: 'success',
      results: result.rows.length,
      pagination: {
        total: totalCount,
        page: numPage,
        limit: numLimit,
        totalPages: Math.ceil(totalCount / numLimit) || 1,
      },
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get single employee by ID
 */
const getEmployeeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM employees WHERE id = ?', [id]);

    if (!result.rows || result.rows.length === 0) {
      return next(new AppError(`Employee with ID ${id} not found`, 404));
    }

    res.status(200).json({
      status: 'success',
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Create new employee
 */
const createEmployee = async (req, res, next) => {
  try {
    const { first_name, last_name, email, department, role, salary, status = 'Active', hire_date } = req.body;

    if (!first_name || !last_name || !email || !department || !role || salary === undefined || !hire_date) {
      return next(new AppError('Please provide all required fields: first_name, last_name, email, department, role, salary, hire_date', 400));
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return next(new AppError('Please provide a valid email address', 400));
    }

    const numericSalary = parseFloat(salary);
    if (isNaN(numericSalary) || numericSalary < 0) {
      return next(new AppError('Salary must be a positive number', 400));
    }

    // Check if email already exists
    const existing = await db.query('SELECT id FROM employees WHERE email = ?', [email]);
    if (existing.rows && existing.rows.length > 0) {
      return next(new AppError(`Employee with email ${email} already exists`, 409));
    }

    const insertSql = `
      INSERT INTO employees (first_name, last_name, email, department, role, salary, status, hire_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const insertResult = await db.query(insertSql, [
      first_name.trim(),
      last_name.trim(),
      email.trim().toLowerCase(),
      department.trim(),
      role.trim(),
      numericSalary,
      status,
      hire_date,
    ]);

    const createdId = insertResult.insertId;
    let createdRecord;
    if (createdId) {
      const fetchNew = await db.query('SELECT * FROM employees WHERE id = ?', [createdId]);
      createdRecord = fetchNew.rows[0];
    } else {
      const fetchNew = await db.query('SELECT * FROM employees WHERE email = ?', [email.trim().toLowerCase()]);
      createdRecord = fetchNew.rows[0];
    }

    res.status(201).json({
      status: 'success',
      message: 'Employee created successfully',
      data: createdRecord,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update an employee
 */
const updateEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, department, role, salary, status, hire_date } = req.body;

    const existing = await db.query('SELECT * FROM employees WHERE id = ?', [id]);
    if (!existing.rows || existing.rows.length === 0) {
      return next(new AppError(`Employee with ID ${id} not found`, 404));
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return next(new AppError('Please provide a valid email address', 400));
      }
      const duplicate = await db.query('SELECT id FROM employees WHERE email = ? AND id != ?', [email.toLowerCase(), id]);
      if (duplicate.rows && duplicate.rows.length > 0) {
        return next(new AppError(`Email ${email} is already used by another employee`, 409));
      }
    }

    const current = existing.rows[0];
    const updatedFirstName = first_name !== undefined ? first_name.trim() : current.first_name;
    const updatedLastName = last_name !== undefined ? last_name.trim() : current.last_name;
    const updatedEmail = email !== undefined ? email.trim().toLowerCase() : current.email;
    const updatedDept = department !== undefined ? department.trim() : current.department;
    const updatedRole = role !== undefined ? role.trim() : current.role;
    const updatedSalary = salary !== undefined ? parseFloat(salary) : current.salary;
    const updatedStatus = status !== undefined ? status : current.status;
    const updatedHireDate = hire_date !== undefined ? hire_date : current.hire_date;

    const updateSql = `
      UPDATE employees
      SET first_name = ?, last_name = ?, email = ?, department = ?, role = ?, salary = ?, status = ?, hire_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await db.query(updateSql, [
      updatedFirstName,
      updatedLastName,
      updatedEmail,
      updatedDept,
      updatedRole,
      updatedSalary,
      updatedStatus,
      updatedHireDate,
      id,
    ]);

    const updated = await db.query('SELECT * FROM employees WHERE id = ?', [id]);

    res.status(200).json({
      status: 'success',
      message: 'Employee updated successfully',
      data: updated.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete an employee
 */
const deleteEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await db.query('SELECT id FROM employees WHERE id = ?', [id]);
    if (!existing.rows || existing.rows.length === 0) {
      return next(new AppError(`Employee with ID ${id} not found`, 404));
    }

    await db.query('DELETE FROM employees WHERE id = ?', [id]);

    res.status(200).json({
      status: 'success',
      message: `Employee #${id} deleted successfully`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get summary stats for dashboard
 */
const getSummaryStats = async (req, res, next) => {
  try {
    const totalRes = await db.query('SELECT COUNT(*) as total FROM employees');
    const activeRes = await db.query("SELECT COUNT(*) as active FROM employees WHERE status = 'Active'");
    const deptsRes = await db.query('SELECT department, COUNT(*) as count FROM employees GROUP BY department');
    const salaryRes = await db.query('SELECT AVG(salary) as avg_salary, SUM(salary) as total_payroll FROM employees');

    const totalEmployees = parseInt(totalRes.rows[0]?.total || 0, 10);
    const activeEmployees = parseInt(activeRes.rows[0]?.active || 0, 10);
    const avgSalary = Math.round(parseFloat(salaryRes.rows[0]?.avg_salary || 0));
    const totalPayroll = Math.round(parseFloat(salaryRes.rows[0]?.total_payroll || 0));

    res.status(200).json({
      status: 'success',
      data: {
        totalEmployees,
        activeEmployees,
        departmentBreakdown: deptsRes.rows,
        averageSalary: avgSalary,
        totalPayroll,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getSummaryStats,
};
