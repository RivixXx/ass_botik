export default function register(bot, { prisma }) {
  // Команда просмотра сотрудников
  bot.command('employees', async (ctx) => {
    try {
      const employees = await prisma.employee.findMany({
        orderBy: { lastName: 'asc' },
      });

      if (!employees.length) return ctx.reply('Список сотрудников пуст.');

      const message = employees.map(emp => {
        let s = `${emp.firstName} ${emp.lastName}`;
        if (emp.position) s += ` (${emp.position})`;
        if (emp.department) s += ` — ${emp.department}`;
        if (emp.birthdayDay && emp.birthdayMonth) s += ` 🎂 ${emp.birthdayDay}.${emp.birthdayMonth}`;
        return s;
      }).join('\n');

      ctx.reply(message);
    } catch (err) {
      console.error(err);
      ctx.reply('Ошибка при получении списка сотрудников.');
    }
  });

  // Команда добавления сотрудника
  bot.command('addemployee', async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);
    if (!args.length) return ctx.reply('Использование: /addemployee Имя Фамилия [Должность] [Подразделение]');

    const firstName = args[0];
    const lastName = args[1] || '';
    const position = args[2] || null;
    const department = args.slice(3).join(' ') || null;

    try {
      await prisma.employee.create({
        data: { firstName, lastName, position, department },
      });
      ctx.reply(`Сотрудник "${firstName} ${lastName}" добавлен.`);
    } catch (err) {
      console.error(err);
      ctx.reply('Ошибка при добавлении сотрудника.');
    }
  });

  console.log('Employees plugin loaded');
}
