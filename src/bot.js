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
employeesPlugin(bot, { prisma });

// Команды
bot.start((ctx) => ctx.reply('Привет! Я бот компании "Навикон". Задай вопрос — я помогу.'));
bot.command('clear', (ctx) => { ctx.session = {}; ctx.reply('Контекст очищен.'); });

// === Основная логика ===
bot.on('text', async (ctx) => {
  try {
    ensureHistory(ctx);
    const userText = ctx.message.text.trim();

    // 1️⃣ Проверяем, не касается ли вопрос сотрудников
    const employeeKeywords = [
      'сотрудник', 'бухгалтер', 'директор', 'руководитель', 'отдел', 'почта', 'телефон', 'день рождения'
    ];

    if (employeeKeywords.some(k => userText.toLowerCase().includes(k))) {
      const answer = await handleEmployeeQuery(userText);
      return ctx.reply(answer);
    }

    // 2️⃣ Если нет — обычный OpenAI-диалог
    const system = {
      role: 'system',
      content: 'Ты — полезный корпоративный ассистент компании Навикон. Отвечай кратко, вежливо, на русском языке.',
    };
    const messages = [system, ...ctx.session.history, { role: 'user', content: userText }];

    await ctx.sendChatAction('typing');
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages,
      max_tokens: 800,
      temperature: 0.2,
    });

    const aiMessage = completion?.choices?.[0]?.message?.content?.trim();
    if (!aiMessage) return ctx.reply('Не получил ответа от AI.');

    ctx.session.history.push({ role: 'user', content: userText });
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
