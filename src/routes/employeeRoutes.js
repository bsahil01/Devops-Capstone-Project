const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');

// Routes for /api/employees
router.get('/', employeeController.getEmployees);
router.post('/', employeeController.createEmployee);
router.get('/stats', employeeController.getSummaryStats);
router.get('/:id', employeeController.getEmployeeById);
router.put('/:id', employeeController.updateEmployee);
router.delete('/:id', employeeController.deleteEmployee);

module.exports = router;
