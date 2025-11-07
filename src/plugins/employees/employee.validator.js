/**
 * Модуль валидации данных сотрудников
 */

/**
 * Валидация email
 * @param {string} email - Email для проверки
 * @returns {boolean} - true если email валиден
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
  return emailRegex.test(email.trim());
}

/**
 * Валидация имени или фамилии
 * @param {string} name - Имя или фамилия
 * @returns {boolean} - true если имя валидно
 */
export function isValidName(name) {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  // Имя должно содержать только буквы (русские и латинские), пробелы, дефисы, апострофы
  // Минимум 2 символа, максимум 50
  const nameRegex = /^[А-ЯЁа-яёA-Za-z\s'-]{2,50}$/;
  return nameRegex.test(trimmed);
}

/**
 * Валидация телефона
 * @param {string} phone - Номер телефона
 * @returns {boolean} - true если телефон валиден
 */
export function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const trimmed = phone.trim();
  if (trimmed === '') return true; // Телефон опционален
  
  // Разрешаем формат: +7 (xxx) xxx-xx-xx, 8xxx, и другие варианты
  const phoneRegex = /^[\d\s()+-]{7,20}$/;
  return phoneRegex.test(trimmed);
}

/**
 * Валидация дня рождения (день)
 * @param {number} day - День месяца
 * @returns {boolean} - true если день валиден
 */
export function isValidBirthdayDay(day) {
  if (day === null || day === undefined) return true; // Опционально
  if (typeof day !== 'number') return false;
  return day >= 1 && day <= 31;
}

/**
 * Валидация дня рождения (месяц)
 * @param {number} month - Месяц
 * @returns {boolean} - true если месяц валиден
 */
export function isValidBirthdayMonth(month) {
  if (month === null || month === undefined) return true; // Опционально
  if (typeof month !== 'number') return false;
  return month >= 1 && month <= 12;
}

/**
 * Валидация данных сотрудника при создании
 * @param {Object} data - Данные сотрудника
 * @param {string} data.firstName - Имя
 * @param {string} data.lastName - Фамилия
 * @param {string} [data.email] - Email (опционально)
 * @param {string} [data.phone] - Телефон (опционально)
 * @param {number} [data.birthdayDay] - День рождения (опционально)
 * @param {number} [data.birthdayMonth] - Месяц рождения (опционально)
 * @returns {{valid: boolean, errors: string[]}} - Результат валидации
 */
export function validateEmployeeData(data) {
  const errors = [];

  // Обязательные поля
  if (!data.firstName || !isValidName(data.firstName)) {
    errors.push('Имя обязательно и должно содержать 2-50 символов (только буквы, пробелы, дефисы)');
  }

  if (!data.lastName || !isValidName(data.lastName)) {
    errors.push('Фамилия обязательна и должна содержать 2-50 символов (только буквы, пробелы, дефисы)');
  }

  // Опциональные поля
  if (data.email !== null && data.email !== undefined && data.email !== '') {
    if (!isValidEmail(data.email)) {
      errors.push('Некорректный формат email');
    }
  }

  if (data.phone !== null && data.phone !== undefined && data.phone !== '') {
    if (!isValidPhone(data.phone)) {
      errors.push('Некорректный формат телефона');
    }
  }

  if (data.birthdayDay !== null && data.birthdayDay !== undefined) {
    if (!isValidBirthdayDay(data.birthdayDay)) {
      errors.push('День рождения должен быть от 1 до 31');
    }
  }

  if (data.birthdayMonth !== null && data.birthdayMonth !== undefined) {
    if (!isValidBirthdayMonth(data.birthdayMonth)) {
      errors.push('Месяц рождения должен быть от 1 до 12');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

