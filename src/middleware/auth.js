/**
 * Middleware для авторизации и проверки прав доступа
 */

import { config } from '../config/index.js';

/**
 * Проверяет, является ли пользователь администратором
 * @param {number} userId - Telegram user ID
 * @returns {boolean}
 */
export function isAdmin(userId) {
  if (!userId) return false;
  return config.security.adminUserIds.includes(userId);
}

/**
 * Middleware для проверки прав администратора
 * @param {Function} handler - Обработчик команды
 * @returns {Function}
 */
export function requireAdmin(handler) {
  return async (ctx, next) => {
    const userId = ctx.from?.id;
    
    if (!isAdmin(userId)) {
      await ctx.reply('❌ У вас нет прав для выполнения этой команды.');
      return;
    }
    
    return handler(ctx, next);
  };
}

/**
 * Middleware для проверки, что пользователь авторизован (любой пользователь)
 * @param {Function} handler - Обработчик команды
 * @returns {Function}
 */
export function requireAuth(handler) {
  return async (ctx, next) => {
    if (!ctx.from?.id) {
      await ctx.reply('❌ Требуется авторизация.');
      return;
    }
    
    return handler(ctx, next);
  };
}

