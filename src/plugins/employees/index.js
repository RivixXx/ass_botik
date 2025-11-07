import { validateEmployeeData } from './employee.validator.js';
import { findEmployeeCaseInsensitive } from './employee-search-helper.js';

export default function register(bot, { prisma, logger }) {
  // Получаем logger или создаем заглушку
  const log = logger || {
    error: (...args) => console.error(...args),
    warn: (...args) => console.warn(...args),
    info: (...args) => console.log(...args),
    debug: (...args) => console.log(...args)
  };

  // Команда просмотра сотрудников
  bot.command('employees', async (ctx) => {
    try {
      const employees = await prisma.employee.findMany({
        orderBy: { lastName: 'asc' },
      });

      if (!employees.length) {
        return ctx.reply('Список сотрудников пуст.');
      }

      const message = employees.map(emp => {
        let s = `${emp.firstName} ${emp.lastName}`;
        if (emp.position) s += ` (${emp.position})`;
        if (emp.department) s += ` — ${emp.department}`;
        if (emp.birthdayDay && emp.birthdayMonth) s += ` 🎂 ${emp.birthdayDay}.${emp.birthdayMonth}`;
        return s;
      }).join('\n');

      await ctx.reply(message);
    } catch (err) {
      log.error({ err, userId: ctx.from?.id }, 'Error fetching employees list');
      await ctx.reply('Ошибка при получении списка сотрудников. Попробуйте позже.');
    }
  });

  // Команда добавления сотрудника
  bot.command('addemployee', async (ctx) => {
    try {
      const args = ctx.message.text.split(' ').slice(1);
      
      if (!args.length || args.length < 2) {
        return ctx.reply(
          'Использование: /addemployee Имя Фамилия [Email] [Телефон] [Должность] [Подразделение]\n\n' +
          'Примеры:\n' +
          '/addemployee Иван Петров\n' +
          '/addemployee Иван Петров ivan@example.com\n' +
          '/addemployee Иван Петров ivan@example.com +79001234567 Бухгалтер Бухгалтерия'
        );
      }

      const firstName = args[0].trim();
      const lastName = args[1].trim();
      
      // Остальные аргументы могут быть email, телефон, должность, подразделение
      // Пытаемся определить, что есть что
      let email = null;
      let phone = null;
      let position = null;
      let department = null;
      
      const remainingArgs = args.slice(2);
      
      // Email обычно содержит @
      const emailIndex = remainingArgs.findIndex(arg => arg.includes('@'));
      if (emailIndex !== -1) {
        email = remainingArgs[emailIndex];
        remainingArgs.splice(emailIndex, 1);
      }
      
      // Телефон обычно содержит цифры и начинается с + или 8
      const phoneIndex = remainingArgs.findIndex(arg => /^[\d+][\d\s()-]{6,}$/.test(arg));
      if (phoneIndex !== -1) {
        phone = remainingArgs[phoneIndex];
        remainingArgs.splice(phoneIndex, 1);
      }
      
      // Остальное: должность и подразделение
      if (remainingArgs.length > 0) {
        position = remainingArgs[0] || null;
        if (remainingArgs.length > 1) {
          department = remainingArgs.slice(1).join(' ') || null;
        }
      }

      // Валидация данных
      const validation = validateEmployeeData({
        firstName,
        lastName,
        email: email || null,
        phone: phone || null,
        birthdayDay: null,
        birthdayMonth: null
      });

      if (!validation.valid) {
        const errorMessage = 'Ошибка валидации данных:\n' + validation.errors.join('\n');
        log.warn({ validation, userId: ctx.from?.id }, 'Employee data validation failed');
        return ctx.reply(errorMessage);
      }

      // Проверка на существование сотрудника с таким email (если email указан)
      if (email) {
        const existing = await findEmployeeCaseInsensitive({ email });
        if (existing) {
          log.warn({ email, userId: ctx.from?.id }, 'Attempt to add employee with existing email');
          return ctx.reply(`Сотрудник с email ${email} уже существует.`);
        }
      }

      // Создание сотрудника
      const employee = await prisma.employee.create({
        data: {
          firstName,
          lastName,
          email: email || null,
          phone: phone || null,
          position: position || null,
          department: department || null
        },
      });

      log.info({ employeeId: employee.id, userId: ctx.from?.id }, 'Employee created successfully');
      await ctx.reply(`✅ Сотрудник "${firstName} ${lastName}" успешно добавлен.`);
      
    } catch (err) {
      // Обработка специфичных ошибок Prisma
      if (err.code === 'P2002') {
        // Уникальное ограничение нарушено
        const field = err.meta?.target?.[0] || 'данные';
        log.warn({ err, userId: ctx.from?.id }, `Duplicate employee data: ${field}`);
        await ctx.reply(`❌ Сотрудник с такими ${field === 'email' ? 'email' : 'данными'} уже существует.`);
      } else {
        log.error({ err, userId: ctx.from?.id }, 'Error adding employee');
        await ctx.reply('❌ Ошибка при добавлении сотрудника. Проверьте данные и попробуйте снова.');
      }
    }
  });

  log.info('Employees plugin loaded');
}
