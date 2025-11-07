// src/bot.js
import 'dotenv/config';
import { Telegraf } from 'telegraf';
import OpenAI from 'openai';
import pino from 'pino';
import prisma from './db/prismaClient.js';

import employeesPlugin from './plugins/employees/index.js';

// Логгер
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// Проверка переменных окружения
if (!process.env.TELEGRAM_TOKEN) {
  logger.error('TELEGRAM_TOKEN is missing. Set TELEGRAM_TOKEN in env.');
  process.exit(1);
}
if (!process.env.OPENAI_API_KEY) {
  logger.error('OPENAI_API_KEY is missing. Set OPENAI_API_KEY in env.');
  // не выходим — можно запустить бот только для тестов локально; но обычно exit(1)
  process.exit(1);
}

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --------- Простейшая гарантированная in-memory сессия ---------
// Работает в одном процессе. Для продакшна (множественные инстансы) — Redis/Postgres.
const sessions = new Map();
bot.use((ctx, next) => {
  const sid = String(ctx.from?.id || ctx.chat?.id || 'global');
  if (!sessions.has(sid)) sessions.set(sid, {});
  ctx.session = sessions.get(sid);
  return next();
});
// ---------------------------------------------------------------

// Защищённая инициализация истории
function ensureHistory(ctx) {
  ctx.session = ctx.session || {};
  if (!Array.isArray(ctx.session.history)) ctx.session.history = [];
}

// Подключаем плагины
employeesPlugin(bot, { prisma });

// Команды
bot.start((ctx) => {
  ensureHistory(ctx);
  return ctx.reply('Привет! Я бот с OpenAI. Напиши мне сообщение — отвечу.');
});

bot.command('clear', (ctx) => {
  ctx.session = {};
  return ctx.reply('Контекст очищен.');
});

// Основная обработка сообщений
bot.on('text', async (ctx) => {
  try {
    ensureHistory(ctx);

    const userText = ctx.message.text;
    // салфетка: не добавляем команды в историю
    if (userText && !userText.startsWith('/')) {
      ctx.session.history.push({ role: 'user', content: userText });
    }

    // Обрезаем историю: сохраняем последние N сообщений (по ролям)
    const maxMessages = 10;
    if (ctx.session.history.length > maxMessages * 2) {
      ctx.session.history = ctx.session.history.slice(-maxMessages * 2);
    }

    // Подготовим сообщения для OpenAI
    const system = {
      role: 'system',
      content: process.env.SYSTEM_PROMPT || 'Ты — полезный ассистент. Отвечай по делу, на русском.'
    };
    const messages = [system, ...ctx.session.history];

    await ctx.sendChatAction('typing');

    // Вызов OpenAI (адаптируй модель если нужно)
    const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    // Используем стандартный call (согласно openai npm)
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

    // Сохраняем ответ в истории
    ctx.session.history.push({ role: 'assistant', content: aiMessage });

    // Отправляем ответ (если длинный — Telegram сам разобьёт)
    await ctx.reply(aiMessage);
  } catch (err) {
    // Логируем всю ошибку
    logger.error({ err }, 'Error in message handler');

    // Опознаём 403 unsupported_country_region_territory
    const isUnsupportedRegion =
      err?.status === 403 ||
      err?.code === 'unsupported_country_region_territory' ||
      err?.error?.code === 'unsupported_country_region_territory';

    if (isUnsupportedRegion) {
      await ctx.reply('Не могу обратиться к OpenAI из этого региона (403 — регион не поддерживается).');
      return;
    }

    // Общая обработка ошибок
    await ctx.reply('Извини, произошла ошибка при обращении к AI. Попробуй позже.');
  }
});

// Global error handler
bot.catch((err, ctx) => {
  logger.error({ err, ctx }, 'Bot global error');
});

// Запуск
(async () => {
  try {
    await bot.launch();
    logger.info('Bot launched (long polling)');
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
  } catch (err) {
    logger.error({ err }, 'Failed to launch bot');
    process.exit(1);
  }
})();
