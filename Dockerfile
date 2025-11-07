FROM node:18-alpine

WORKDIR /app

# Копируем package files
COPY package*.json ./
COPY prisma ./prisma/

# Устанавливаем зависимости
RUN npm ci --only=production

# Генерируем Prisma Client
RUN npx prisma generate

# Копируем исходный код
COPY . .

# Создаем пользователя для запуска приложения
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Меняем владельца файлов
RUN chown -R nodejs:nodejs /app

USER nodejs

# Применяем миграции при запуске
RUN npx prisma migrate deploy || true

EXPOSE 3000

CMD ["npm", "start"]

