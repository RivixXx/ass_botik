/**
 * Middleware для rate limiting
 */

import { config } from '../config/index.js';
import { RateLimitError } from '../utils/errors.js';

// Хранилище запросов (в памяти, можно перенести в Redis)
const requests = new Map();

/**
 * Очистка старых запросов
 */
function cleanup() {
  const now = Date.now();
  const windowMs = config.security.rateLimit.windowMs;
  
  for (const [key, timestamps] of requests.entries()) {
    const validTimestamps = timestamps.filter(ts => now - ts < windowMs);
    if (validTimestamps.length === 0) {
      requests.delete(key);
    } else {
      requests.set(key, validTimestamps);
    }
  }
}

// Очистка каждые 5 минут
setInterval(cleanup, 5 * 60 * 1000);

/**
 * Middleware для rate limiting
 * @param {Object} ctx - Контекст Telegraf
 * @param {Function} next - Следующий middleware
 * @returns {Promise}
 */
export async function rateLimit(ctx, next) {
  if (!config.security.rateLimit.enabled) {
    return next();
  }

  const userId = ctx.from?.id || ctx.chat?.id || 'anonymous';
  const key = `rate_limit:${userId}`;
  const now = Date.now();
  const windowMs = config.security.rateLimit.windowMs;
  const maxRequests = config.security.rateLimit.maxRequests;

  // Получаем список запросов пользователя
  let userRequests = requests.get(key) || [];
  
  // Удаляем запросы старше окна
  userRequests = userRequests.filter(ts => now - ts < windowMs);
  
  // Проверяем лимит
  if (userRequests.length >= maxRequests) {
    const retryAfter = Math.ceil((userRequests[0] + windowMs - now) / 1000);
    throw new RateLimitError(`Превышен лимит запросов`, retryAfter);
  }
  
  // Добавляем текущий запрос
  userRequests.push(now);
  requests.set(key, userRequests);
  
  return next();
}

