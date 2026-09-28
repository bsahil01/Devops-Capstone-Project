const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

describe('Unit Tests: Validation Logic', () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  test('valid email should pass regex', () => {
    assert.strictEqual(emailRegex.test('engineer@techcorp.io'), true);
    assert.strictEqual(emailRegex.test('john.doe@company.org'), true);
  });

  test('invalid email should fail regex', () => {
    assert.strictEqual(emailRegex.test('plainaddress'), false);
    assert.strictEqual(emailRegex.test('@missinguser.com'), false);
    assert.strictEqual(emailRegex.test('user@domain'), false);
  });

  test('salary validation rules', () => {
    const isValidSalary = (sal) => {
      const num = parseFloat(sal);
      return !isNaN(num) && num >= 0;
    };

    assert.strictEqual(isValidSalary('85000'), true);
    assert.strictEqual(isValidSalary(120000), true);
    assert.strictEqual(isValidSalary('-500'), false);
    assert.strictEqual(isValidSalary('abc'), false);
  });

  test('password length check', () => {
    const isValidPassword = (pwd) => typeof pwd === 'string' && pwd.length >= 6;

    assert.strictEqual(isValidPassword('short'), false);
    assert.strictEqual(isValidPassword('validPass123'), true);
  });
});
