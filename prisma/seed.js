import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function extractPositionFromDepartment(department) {
  if (!department) return null;
  const parts = department.split(',').map(p => p.trim()).filter(Boolean);
  // Обычно "Навикон, Главный Бухгалтер" — берём всё после первого запятого
  if (parts.length > 1) {
    return parts.slice(1).join(', ').trim();
  }
  return null;
}

function splitLastNameIfContainsPosition(lastName) {
  if (!lastName) return { lastName, position: null };
  const parts = lastName.trim().split(/\s+/);
  if (parts.length > 1) {
    // Второй и последующие токены могут быть должностью (пример: "Баранов Менеджер")
    const maybePosition = parts.slice(1).join(' ');
    // Простая эвристика: если в maybePosition есть буквы (и не похоже на инициалы),
    // считаем это должностью
    if (maybePosition.length > 1) {
      return { lastName: parts[0], position: maybePosition };
    }
  }
  return { lastName, position: null };
}

function derivePosition(emp) {
  // 1) Попробуем из department
  const posFromDept = extractPositionFromDepartment(emp.department);
  if (posFromDept) return posFromDept;

  // 2) Если в lastName вшита должность (например "Баранов Менеджер")
  const { lastName: cleanLastName, position: posFromLastName } = splitLastNameIfContainsPosition(emp.lastName);
  if (posFromLastName) return posFromLastName;

  // 3) fallback: null
  return null;
}

const initialData = [
  { firstName: "Сергей", lastName: "Беляев", department: "Навикон, Директор", email: "frozen-Tambov@mail.ru", phone: "" },
  { firstName: "Елена", lastName: "Орлова", department: "Навикон, Бухгалтер", email: "orlova.navicon@bk.ru", phone: "" },
  { firstName: "Вадим", lastName: "Василенко", department: "Навикон, Отдел продаж", email: "vvvadim1978@gmail.com", phone: "" },
  { firstName: "Людмила", lastName: "Потапова", department: "Навикон, Нач. Склада", email: "navicon.potapova@bk.ru", phone: "" },
  { firstName: "Михаил", lastName: "Зорин", department: "Навикон, Руководитель Тех. отдел", email: "navicon_zorin@bk.ru", phone: "" },
  { firstName: "Елена", lastName: "Ермакова", department: "Навикон, Бухгалтерия", email: "navicon.ermakova@bk.ru", phone: "" },
  { firstName: "Анастасия", lastName: "Андросова", department: "Навикон, Главный Бухгалтер", email: "navicon.androsova@bk.ru", phone: "" },
  { firstName: "Алексей", lastName: "Чиркин", department: "Навикон, Монтажники", email: "navicon.chirkin@bk.ru", phone: "" },
  { firstName: "Сергей", lastName: "Каширов", department: "Навикон, Монтажники", email: "navicon.kashirov@bk.ru", phone: "" },
  { firstName: "Сергей", lastName: "Зуев", department: "Навикон, Монтажники", email: "navicon.zuev@bk.ru", phone: "" },
  { firstName: "Кирилл", lastName: "Кузин", department: "Навикон, Монтажники", email: "navicon.kuzin@mail.ru", phone: "" },
  { firstName: "Сергей", lastName: "Сысоев", department: "Навикон, Монтажники", email: "navicon.sysoev@bk.ru", phone: "" },
  { firstName: "Екатерина", lastName: "Котельникова", department: "Навикон, Бухгалтерия", email: "navicon_kotelnokova@bk.ru", phone: "" },
  { firstName: "Антон", lastName: "Брусникин", department: "Навикон, Тех. отдел", email: "antonnavikon@gmail.com", phone: "" },
  { firstName: "Николай", lastName: "Прохоров", department: "Навикон, Проджект менеджер", email: "navicon-prohorov@bk.ru", phone: "" },
  { firstName: "Иван", lastName: "Ушаков", department: "Навикон, Тех. отдел", email: "ushakov.navicon@bk.ru", phone: "" },
  { firstName: "Илья", lastName: "Демидов", department: "Навикон, помощник нач. склада", email: "navicon.demidov@bk.ru", phone: "" },
  { firstName: "Алина", lastName: "Панченко", department: "Навикон, Бухгалтерия", email: "panchenko.navicon@bk.ru", phone: "" },
  { firstName: "Анастасия", lastName: "Горбунова", department: "Навикон, Отдел продаж", email: "navicon.anastasiya@mail.ru", phone: "" },
  { firstName: "Влад", lastName: "Евдокимов", department: "Навикон, Монтажники", email: "navicon.vlad@gmail.com", phone: "" },
  { firstName: "Олег", lastName: "Баранов Менеджер", department: "Навикон, Отдел продаж", email: "navicon.osina@bk.ru", phone: "" },
  { firstName: "Валерий", lastName: "Водяной", department: "Навикон, Монтажники", email: "valera.navicon@gmail.com", phone: "" },
  { firstName: "Александр", lastName: "Новичков", department: "Навикон, Монтажники", email: "Novichkov6891@gmail.com", phone: "" },
  { firstName: "Олеся", lastName: "Талова", department: "Навикон, Отдел продаж", email: "Olesyatalova@gmail.com", phone: "" },
  { firstName: "Настя", lastName: "Проскурякова", department: "Навикон, Отдел продаж", email: "proskyryakova.navicon@bk.ru", phone: "" },
  { firstName: "Вадим", lastName: "Стариков", department: "Навикон, Руководитель Отдела продаж", email: "navicon_starikov@mail.ru", phone: "" },
  { firstName: "Ольга", lastName: "Кречетова", department: "Навикон, Отдел продаж", email: "navicon_krechetova@bk.ru", phone: "" },
  { firstName: "Евгений", lastName: "Лобанов", department: "Навикон, Руководитель Монтажного отдела", email: "mc_shoorup@mail.ru", phone: "" },
  { firstName: "Алексей", lastName: "Старцев", department: "Навикон, Тех. отдел", email: "navicon.startsev@gmail.com", phone: "" },
  { firstName: "Владислав", lastName: "Кириллов", department: "Навикон, Отдел продаж", email: "kirillovnavicon@gmail.com", phone: "" }
];

async function main() {
  const count = await prisma.employee.count();
  if (count === 0) {
    // Вставляем начальные записи, выделяя position
    const prepared = initialData.map(emp => {
      // поправим lastName если там есть вшитая должность
      const { lastName, position: posFromLast } = (function splitLastNameIfContainsPosition(lastName) {
        if (!lastName) return { lastName, position: null };
        const parts = lastName.trim().split(/\s+/);
        if (parts.length > 1) {
          const maybePos = parts.slice(1).join(' ');
          return { lastName: parts[0], position: maybePos };
        }
        return { lastName, position: null };
      })(emp.lastName);

      const posFromDept = extractPositionFromDepartment(emp.department);
      const position = posFromDept || posFromLast || null;

      return {
        firstName: emp.firstName,
        lastName: lastName,
        department: emp.department,
        position,
        email: emp.email,
        phone: emp.phone || null,
        birthdayDay: null,
        birthdayMonth: null
      };
    });

    await prisma.employee.createMany({ data: prepared });
    console.log('Initial employees inserted:', prepared.length);
    return;
  }

  // Если записи уже есть — пройдём по всем и обновим поле position при необходимости
  const all = await prisma.employee.findMany();
  let updated = 0;

  for (const emp of all) {
    const posFromDept = extractPositionFromDepartment(emp.department);
    const { lastName: cleanLastName, position: posFromLast } = (function splitLastNameIfContainsPosition(lastName) {
      if (!lastName) return { lastName, position: null };
      const parts = lastName.trim().split(/\s+/);
      if (parts.length > 1) {
        const maybePos = parts.slice(1).join(' ');
        return { lastName: parts[0], position: maybePos };
      }
      return { lastName, position: null };
    })(emp.lastName);

    const desiredPosition = posFromDept || posFromLast || emp.position || null;
    const dataToUpdate = {};
    if (desiredPosition && desiredPosition !== emp.position) dataToUpdate.position = desiredPosition;
    if (cleanLastName !== emp.lastName) dataToUpdate.lastName = cleanLastName;

    if (Object.keys(dataToUpdate).length > 0) {
      await prisma.employee.update({
        where: { id: emp.id },
        data: dataToUpdate
      });
      updated++;
    }
  }

  console.log(`Employees updated: ${updated}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
