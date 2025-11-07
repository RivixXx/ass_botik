import 'dotenv/config';
import { Telegraf } from 'telegraf';
import OpenAI from 'openai';
import pino from 'pino';
import prisma from './db/prismaClient.js';
import { handleEmployeeQuery } from './plugins/employees/employees.service.js';
import employeesPlugin from './plugins/employees/index.js';

// Логгер
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// Проверка env
if (!process.env.TELEGRAM_TOKEN) {
  logger.error('TELEGRAM_TOKEN missing.');
  process.exit(1);
}
if (!process.env.OPENAI_API_KEY) {
  logger.error('OPENAI_API_KEY missing.');
  process.exit(1);
}

// Основной объект бота
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Простая in-memory сессия
const sessions = new Map();
bot.use((ctx, next) => {
  const sid = String(ctx.from?.id || ctx.chat?.id || 'global');
  if (!sessions.has(sid)) sessions.set(sid, {});
  ctx.session = sessions.get(sid);
  return next();
});

function ensureHistory(ctx) {
  ctx.session = ctx.session || {};
  if (!Array.isArray(ctx.session.history)) ctx.session.history = [];
}

// Подключаем плагины
employeesPlugin(bot, { prisma, logger });

// Команды
bot.start((ctx) => ctx.reply('Привет! Я бот компании "Навикон". Задай вопрос — я помогу.'));
bot.command('clear', (ctx) => { ctx.session = {}; ctx.reply('Контекст очищен.'); });

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
  
    // Обрезаем историю...
    const maxMessages = 10;
    if (ctx.session.history.length > maxMessages * 2) {
      ctx.session.history = ctx.session.history.slice(-maxMessages * 2);
    }
  
    const system = {
      role: 'system',
      content: process.env.SYSTEM_PROMPT || 'Ты — полезный ассистент. Отвечай по делу, на русском.'
    };
    const messages = [system, ...ctx.session.history];
  
    await ctx.sendChatAction('typing');
  
    const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    const completion = await openai.chat.completions.create({
      model,
      messages,
      max_tokens: 800,
      temperature: 0.2
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
    await ctx.reply('Ошибка при обработке сообщения.');
  }
});

// Глобальная обработка ошибок
bot.catch((err, ctx) => logger.error({ err, ctx }, 'Bot global error'));

// Запуск
(async () => {
  try {
    await bot.launch();
    logger.info('Bot started ✅');
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
  } catch (err) {
    logger.error({ err }, 'Failed to launch bot');
    process.exit(1);
  }
})();
