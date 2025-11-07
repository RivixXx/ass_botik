import { PrismaClient } from "@prisma/client";
import { Context } from "telegraf";

const prisma = new PrismaClient();

export async function listEmployees(ctx: Context) {
  const employees = await prisma.employee.findMany({ orderBy: { lastName: "asc" } });
  if (!employees.length) return ctx.reply("Список сотрудников пока пуст.");

  const inlineKeyboard = employees.map(emp => [{
    text: `${emp.firstName} ${emp.lastName}`,
    callback_data: `employee_${emp.id}`,
  }]);

  await ctx.reply("📋 Список сотрудников:", { reply_markup: { inline_keyboard: inlineKeyboard } });
}

export async function employeeDetails(ctx: Context, id: number) {
  const emp = await prisma.employee.findUnique({ where: { id } });
  if (!emp) return ctx.reply("❌ Сотрудник не найден.");

  const message = `👤 ${emp.firstName} ${emp.lastName}\n` +
                  `📂 Подразделение: ${emp.department}\n` +
                  `✉ E-Mail: ${emp.email}\n` +
                  `📱 Моб. телефон: ${emp.phone || "не указан"}`;

  await ctx.reply(message);
}
