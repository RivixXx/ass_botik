/**
 * Вспомогательные функции для поиска сотрудников
 * Обеспечивают совместимость с SQLite (который не поддерживает mode: "insensitive")
 */

import prisma from "../../db/prismaClient.js";

/**
 * Case-insensitive поиск сотрудника по имени/фамилии/email
 * @param {Object} options - Параметры поиска
 * @param {string} [options.firstName] - Имя для поиска
 * @param {string} [options.lastName] - Фамилия для поиска
 * @param {string} [options.email] - Email для поиска
 * @param {string} [options.position] - Должность для поиска
 * @param {string} [options.department] - Отдел для поиска
 * @returns {Promise<Object|null>} - Найденный сотрудник или null
 */
export async function findEmployeeCaseInsensitive(options = {}) {
  const { firstName, lastName, email, position, department } = options;

  // Если не передано ни одного параметра, возвращаем null
  if (!firstName && !lastName && !email && !position && !department) {
    return null;
  }

  // Получаем всех сотрудников (или ограниченный набор, если возможно)
  // Для SQLite это приемлемо, так как обычно не очень много сотрудников
  const allEmployees = await prisma.employee.findMany();

  // Применяем фильтрацию с учетом регистра
  const lowerFirstName = firstName?.toLowerCase();
  const lowerLastName = lastName?.toLowerCase();
  const lowerEmail = email?.toLowerCase();
  const lowerPosition = position?.toLowerCase();
  const lowerDepartment = department?.toLowerCase();

  const found = allEmployees.find(emp => {
    // Проверяем все переданные параметры (AND логика)
    if (firstName) {
      const empFirstName = emp.firstName?.toLowerCase() || '';
      if (!empFirstName.includes(lowerFirstName)) {
        return false;
      }
    }
    if (lastName) {
      const empLastName = emp.lastName?.toLowerCase() || '';
      if (!empLastName.includes(lowerLastName)) {
        return false;
      }
    }
    if (email) {
      const empEmail = emp.email?.toLowerCase() || '';
      // Для email используем точное совпадение (без учета регистра)
      if (empEmail !== lowerEmail) {
        return false;
      }
    }
    if (position) {
      const empPosition = emp.position?.toLowerCase() || '';
      if (!empPosition.includes(lowerPosition)) {
        return false;
      }
    }
    if (department) {
      const empDepartment = emp.department?.toLowerCase() || '';
      if (!empDepartment.includes(lowerDepartment)) {
        return false;
      }
    }
    return true;
  });

  return found || null;
}

/**
 * Case-insensitive поиск сотрудников по одному из полей (OR)
 * @param {Array<Object>} conditions - Массив условий поиска
 * @param {string} [conditions[].firstName] - Имя
 * @param {string} [conditions[].lastName] - Фамилия
 * @param {string} [conditions[].email] - Email
 * @returns {Promise<Object|null>} - Найденный сотрудник или null
 */
export async function findEmployeeByAnyField(conditions = []) {
  if (!conditions.length) return null;

  const allEmployees = await prisma.employee.findMany();

  // Применяем фильтрацию: ищем сотрудника, который соответствует хотя бы одному условию
  const found = allEmployees.find(emp => {
    return conditions.some(cond => {
      if (cond.firstName && emp.firstName?.toLowerCase().includes(cond.firstName.toLowerCase())) {
        return true;
      }
      if (cond.lastName && emp.lastName?.toLowerCase().includes(cond.lastName.toLowerCase())) {
        return true;
      }
      if (cond.email) {
        // Для email используем точное совпадение (без учета регистра)
        if (emp.email?.toLowerCase() === cond.email.toLowerCase()) {
          return true;
        }
        // Или частичное совпадение, если это поиск по части email
        if (emp.email?.toLowerCase().includes(cond.email.toLowerCase())) {
          return true;
        }
      }
      return false;
    });
  });

  return found || null;
}

/**
 * Case-insensitive поиск по токену (имя, фамилия или email)
 * @param {string} token - Токен для поиска
 * @returns {Promise<Object|null>} - Найденный сотрудник или null
 */
export async function findByNameTokenCaseInsensitive(token) {
  if (!token) return null;

  return await findEmployeeByAnyField([
    { lastName: token },
    { firstName: token },
    { email: token }
  ]);
}

