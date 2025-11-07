import 'dotenv/config';
import { Telegraf } from 'telegraf';
import OpenAI from 'openai';
import pino from 'pino';
import prisma from './db/prismaClient.js';
import { handleEmployeeQuery } from './plugins/employees/employees.service.js';
import employeesPlugin from './plugins/employees/index.js';
import config from './config/index.js';
import { getSession, saveSession } from './services/session.service.js';
import { rateLimit } from './middleware/rateLimit.js';
import { getUserFriendlyMessage } from './utils/errors.js';
import { cleanupOldSessions } from './services/session.service.js';

// Логгер
const logger = pino({ level: config.logging.level });

// Основной объект бота
const bot = new Telegraf(config.telegram.token);
const openai = new OpenAI({ apiKey: config.openai.apiKey });

// Middleware для сессий из БД
bot.use(async (ctx, next) => {
  const sid = String(ctx.from?.id || ctx.chat?.id || 'global');
  ctx.session = await getSession(sid);
  await next();
  // Сохраняем сессию после обработки
  await saveSession(sid, ctx.session || {});
});

// Rate limiting middleware
bot.use(rateLimit);

function ensureHistory(ctx) {
  ctx.session = ctx.session || {};
  if (!Array.isArray(ctx.session.history)) ctx.session.history = [];
}

// Подключаем плагины
employeesPlugin(bot, { prisma, logger });

// Команды
bot.start((ctx) => ctx.reply('Привет! Я бот компании "Навикон". Задай вопрос — я помогу.'));
bot.command('clear', async (ctx) => {
  ctx.session = {};
  await saveSession(String(ctx.from?.id || ctx.chat?.id || 'global'), {});
  await ctx.reply('Контекст очищен.');
});

// === Основная логика ===
bot.on('text', async (ctx) => {
  try {
    ensureHistory(ctx);
    const userText = ctx.message.text.trim();
  
    // 1) Сначала обработка по БД (сотрудники)
    const empResult = await handleEmployeeQuery(userText);
    if (empResult && empResult.handled) {
      // если handled=true — отвечаем напрямую и возвращаем
      return ctx.reply(empResult.text);
    }
  
    // 2) Если не обработали — идём в OpenAI
    // салфетка: не добавляем команды в историю
    if (userText && !userText.startsWith('/')) {
      ctx.session.history.push({ role: 'user', content: userText });
    }
  
    // Обрезаем историю
    const maxMessages = config.session.maxHistoryMessages;
    if (ctx.session.history.length > maxMessages * 2) {
      ctx.session.history = ctx.session.history.slice(-maxMessages * 2);
    }
  
    const system = {
      role: 'system',
      content: config.openai.systemPrompt
    };
    const messages = [system, ...ctx.session.history];
    
    await ctx.sendChatAction('typing');
    
    const completion = await openai.chat.completions.create({
      model: config.openai.model,
      messages,
      max_tokens: config.openai.maxTokens,
      temperature: config.openai.temperature
    });
  
    const aiMessage = completion?.choices?.[0]?.message?.content?.trim();
    if (!aiMessage) {
      logger.warn({ completion }, 'Empty response from OpenAI');
      await ctx.reply('Пустой ответ от AI — попробуй ещё раз позже.');
      return;
    }
  
    ctx.session.history.push({ role: 'assistant', content: aiMessage });
    await ctx.reply(aiMessage);
  
  } catch (err) {
    logger.error({ err }, 'Error in bot.on(text)');
    const userMessage = getUserFriendlyMessage(err);
    await ctx.reply(userMessage);
  }
});

// Глобальная обработка ошибок
bot.catch(async (err, ctx) => {
  logger.error({ err, ctx }, 'Bot global error');
  try {
    const userMessage = getUserFriendlyMessage(err);
    await ctx.reply(userMessage);
  } catch (replyErr) {
    logger.error({ err: replyErr }, 'Error sending error message to user');
  }
});

// Запуск
(async () => {
  try {
    // Очистка старых сессий при запуске
    const cleaned = await cleanupOldSessions();
    if (cleaned > 0) {
      logger.info({ cleaned }, 'Cleaned up old sessions');
    }
    
    await bot.launch();
    logger.info('Bot started ✅');
    
    // Периодическая очистка старых сессий (раз в день)
    setInterval(async () => {
      const cleaned = await cleanupOldSessions();
      if (cleaned > 0) {
        logger.info({ cleaned }, 'Cleaned up old sessions');
      }
    }, 24 * 60 * 60 * 1000);
    
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
  } catch (err) {
    logger.error({ err }, 'Failed to launch bot');
    process.exit(1);
  }
})();
