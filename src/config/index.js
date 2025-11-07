/**
 * Централизованная конфигурация приложения
 */

export const config = {
  // Telegram
  telegram: {
    token: process.env.TELEGRAM_TOKEN,
  },

  // OpenAI
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '800', 10),
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.2'),
    systemPrompt: process.env.SYSTEM_PROMPT || 'Ты — полезный корпоративный ассистент компании Навикон. Отвечай кратко, вежливо, на русском языке.',
  },

  // Сессии
  session: {
    maxHistoryMessages: parseInt(process.env.MAX_HISTORY_MESSAGES || '10', 10),
    cleanupInterval: parseInt(process.env.SESSION_CLEANUP_INTERVAL || '3600000', 10), // 1 час
  },

  // Безопасность
  security: {
    // Whitelist пользователей для административных команд (Telegram user IDs через запятую)
    adminUserIds: (process.env.ADMIN_USER_IDS || '').split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id)),
    // Rate limiting
    rateLimit: {
      enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10', 10),
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 минута
    },
  },

  // Логирование
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  // Кэширование
  cache: {
    enabled: process.env.CACHE_ENABLED !== 'false',
    ttl: parseInt(process.env.CACHE_TTL || '300000', 10), // 5 минут
    maxSize: parseInt(process.env.CACHE_MAX_SIZE || '100', 10),
  },

  // База данных
  database: {
    url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
  },
};

// Валидация обязательных параметров
if (!config.telegram.token) {
  throw new Error('TELEGRAM_TOKEN is required');
}

if (!config.openai.apiKey) {
  throw new Error('OPENAI_API_KEY is required');
}

export default config;

