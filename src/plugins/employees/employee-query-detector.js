/**
 * Модуль для определения, относится ли запрос пользователя к сотрудникам компании.
 * Централизованная логика определения типа запроса, исключающая дублирование.
 */

/**
 * Определяет, может ли запрос относиться к сотрудникам компании.
 * @param {string} text - Текст запроса пользователя
 * @returns {boolean} - true, если запрос может относиться к сотрудникам
 */
export function isEmployeeQuery(text) {
  if (!text || typeof text !== 'string') return false;
  
  const low = text.toLowerCase().trim();
  
  // 1. Проверка на явные ключевые слова, связанные с сотрудниками
  const employeeKeywords = [
    'сотрудник', 'сотрудница',
    'директор', 'руководитель',
    'бухгалтер', 'главбух', 'главный бухгалтер',
    'отдел', 'подразделение', 'бухгалтерия',
    'должность', 'должност',
    'почта', 'email', 'e-mail', 'мейл',
    'телефон', 'контакт',
    'день рождения', 'день рождени', 'др'
  ];
  
  const hasEmployeeKeyword = employeeKeywords.some(keyword => low.includes(keyword));
  if (hasEmployeeKeyword) return true;
  
  // 2. Проверка на наличие email в тексте
  const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
  if (emailRegex.test(text)) return true;
  
  // 3. Проверка на паттерн "Имя Фамилия" (русские буквы, заглавная первая)
  // Только если это не команда и текст достаточно короткий (не общий вопрос)
  if (!text.startsWith('/') && text.length < 100) {
    const namePattern = /^[А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+)+$/;
    if (namePattern.test(text.trim())) return true;
  }
  
  // 4. Проверка на вопросы о должности
  const positionQuestionPatterns = [
    /кто\s+(по\s+)?должности/i,
    /какая\s+должность/i,
    /чь[аяё]\s+должность/i,
    /должность\s+\w+/i
  ];
  
  if (positionQuestionPatterns.some(pattern => pattern.test(text))) return true;
  
  return false;
}

/**
 * Извлекает имя и фамилию из текста (если есть).
 * @param {string} text - Текст запроса
 * @returns {{firstName: string, lastName: string} | null} - Объект с именем и фамилией или null
 */
export function extractNameFromText(text) {
  if (!text) return null;
  
  const nameMatch = text.match(/([А-ЯЁ][а-яё]+)\s+([А-ЯЁ][а-яё]+)/);
  if (nameMatch) {
    return {
      firstName: nameMatch[1],
      lastName: nameMatch[2]
    };
  }
  
  return null;
}

/**
 * Извлекает email из текста (если есть).
 * @param {string} text - Текст запроса
 * @returns {string | null} - Email или null
 */
export function extractEmailFromText(text) {
  if (!text) return null;
  
  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return emailMatch ? emailMatch[0] : null;
}

