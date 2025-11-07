export default function register(bot, { prisma }) {
    // Команда для просмотра сотрудников
    bot.command('employees', async (ctx) => {
      const employees = await prisma.employee.findMany({ orderBy: { firstName: 'asc' } });
      if (!employees.length) return ctx.reply('Список сотрудников пуст.');
      const message = employees.map(emp => {
        let s = emp.name;
        if (emp.position) s += ` (${emp.position})`;
        if (emp.birthdayMonth && emp.birthdayDay) s += ` 🎂 ${emp.birthdayDay}.${emp.birthdayMonth}`;
        return s;
      }).join('\n');
      ctx.reply(message);
    });
  
    // Команда для добавления сотрудника
    bot.command('addemployee', async (ctx) => {
      const args = ctx.message.text.split(' ').slice(1);
      if (!args.length) return ctx.reply('Использование: /addemployee Имя [Должность]');
      const name = args[0];
      const position = args.slice(1).join(' ') || null;
      try {
        await prisma.employee.create({ data: { name, position } });
        ctx.reply(`Сотрудник "${name}" добавлен.`);
      } catch (err) {
        console.error(err);
        ctx.reply('Ошибка при добавлении сотрудника.');
      }
    });
  
    console.log('Employees plugin loaded');
  }
  