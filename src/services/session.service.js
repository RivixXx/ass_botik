/**
 * Сервис для работы с сессиями Telegram-бота в БД
 */

import prisma from '../db/prismaClient.js';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

/**
 * Получить сессию пользователя
 * @param {string} sessionId - ID сессии (Telegram user ID или chat ID)
 * @returns {Promise<Object>}
 */
export async function getSession(sessionId) {
  try {
    const session = await prisma.telegramSession.findUnique({
      where: { id: sessionId },
    });
    
    if (!session) {
      return {};
    }
    
    return JSON.parse(session.data || '{}');
  } catch (err) {
    logger.error({ err, sessionId }, 'Error getting session');
    return {};
  }
}

/**
 * Сохранить сессию пользователя
 * @param {string} sessionId - ID сессии
 * @param {Object} data - Данные сессии
 * @returns {Promise<void>}
 */
export async function saveSession(sessionId, data) {
  try {
    await prisma.telegramSession.upsert({
      where: { id: sessionId },
      update: {
        data: JSON.stringify(data),
        updatedAt: new Date(),
      },
      create: {
        id: sessionId,
        data: JSON.stringify(data),
      },
    });
  } catch (err) {
    logger.error({ err, sessionId }, 'Error saving session');
  }
}

/**
 * Удалить сессию пользователя
 * @param {string} sessionId - ID сессии
 * @returns {Promise<void>}
 */
export async function deleteSession(sessionId) {
  try {
    await prisma.telegramSession.delete({
      where: { id: sessionId },
    }).catch(() => {
      // Игнорируем ошибку, если сессии не существует
    });
  } catch (err) {
    logger.error({ err, sessionId }, 'Error deleting session');
  }
}

/**
 * Очистить старые сессии (старше указанного времени)
 * @param {number} olderThanMs - Удалить сессии старше указанного времени в миллисекундах
 * @returns {Promise<number>} - Количество удаленных сессий
 */
export async function cleanupOldSessions(olderThanMs = 7 * 24 * 60 * 60 * 1000) {
  try {
    const cutoffDate = new Date(Date.now() - olderThanMs);
    
    const result = await prisma.telegramSession.deleteMany({
      where: {
        updatedAt: {
          lt: cutoffDate,
        },
      },
    });
    
    return result.count;
  } catch (err) {
    logger.error({ err }, 'Error cleaning up old sessions');
    return 0;
  }
}

