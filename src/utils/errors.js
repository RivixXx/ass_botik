/**
 * Кастомные классы ошибок
 */

/**
 * Базовый класс ошибки приложения
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'APP_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Ошибка валидации
 */
export class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

/**
 * Ошибка авторизации
 */
export class AuthorizationError extends AppError {
  constructor(message = 'Недостаточно прав доступа') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

/**
 * Ошибка rate limiting
 */
export class RateLimitError extends AppError {
  constructor(message = 'Превышен лимит запросов', retryAfter = 60) {
    super(message, 429, 'RATE_LIMIT_ERROR');
    this.retryAfter = retryAfter;
  }
}

/**
 * Ошибка базы данных
 */
export class DatabaseError extends AppError {
  constructor(message, originalError = null) {
    super(message, 500, 'DATABASE_ERROR');
    this.originalError = originalError;
  }
}

/**
 * Ошибка внешнего API
 */
export class ExternalAPIError extends AppError {
  constructor(message, service = 'unknown') {
    super(message, 502, 'EXTERNAL_API_ERROR');
    this.service = service;
  }
}

/**
 * Получить пользовательское сообщение об ошибке
 * @param {Error} error - Ошибка
 * @returns {string}
 */
export function getUserFriendlyMessage(error) {
  if (error instanceof ValidationError) {
    return `Ошибка валидации: ${error.message}`;
  }
  
  if (error instanceof AuthorizationError) {
    return '❌ У вас нет прав для выполнения этой операции.';
  }
  
  if (error instanceof RateLimitError) {
    return `⚠️ Слишком много запросов. Попробуйте через ${error.retryAfter} секунд.`;
  }
  
  if (error instanceof DatabaseError) {
    return '❌ Ошибка базы данных. Попробуйте позже.';
  }
  
  if (error instanceof ExternalAPIError) {
    return `❌ Ошибка сервиса ${error.service}. Попробуйте позже.`;
  }
  
  // Для неизвестных ошибок возвращаем общее сообщение
  return '❌ Произошла ошибка. Попробуйте позже.';
}

