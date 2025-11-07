// /src/plugins/employees/employees.service.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function listEmployees(ctx) {
  try {
    const employees = await prisma.employee.findMany({ orderBy: { lastName: 'asc' } });

    if (!employees.length) return ctx.reply('Список сотрудников пока пуст.');

    // Формируем inline клавиатуру
    const inlineKeyboard = employees.map(emp => [
      {
        text: `${emp.firstName} ${emp.lastName}`,
        callback_data: `employee_${emp.id}`,
      }
    ]);

    await ctx.reply('📋 Список сотрудников:', {
      reply_markup: {
        inline_keyboard: inlineKeyboard
      }
    });
  } catch (err) {
    console.error(err);
    await ctx.reply('❌ Произошла ошибка при получении сотрудников.');
  }
}

export async function employeeDetails(ctx, id) {
  try {
    const emp = await prisma.employee.findUnique({ where: { id } });
    if (!emp) return ctx.reply('❌ Сотрудник не найден.');

    const message =
      `👤 ${emp.firstName} ${emp.lastName}\n` +
      `📂 Подразделение: ${emp.department || '-' }\n` +
      `✉ E-Mail: ${emp.email || '-' }\n` +
      `📱 Моб. телефон: ${emp.phone || 'не указан'}`;

    await ctx.reply(message);
  } catch (err) {
    console.error(err);
    await ctx.reply('❌ Произошла ошибка при получении информации о сотруднике.');
  }
}
