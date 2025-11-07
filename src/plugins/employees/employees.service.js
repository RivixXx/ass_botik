import prisma from "../../db/prismaClient.js";

/**
 * Универсальный поиск сотрудников
 * query может содержать: firstName, lastName, position, department
 */
export async function getEmployeeInfo(query) {
  const emp = await prisma.employee.findFirst({ where: query });
  if (!emp) return "Сотрудник не найден.";

  const infoParts = [
    `👤 ${emp.firstName} ${emp.lastName}`,
    emp.position ? `📌 Должность: ${emp.position}` : null,
    emp.department ? `🏢 Подразделение: ${emp.department}` : null,
    emp.email ? `✉ E-mail: ${emp.email}` : null,
    emp.phone ? `📱 Телефон: ${emp.phone}` : null,
    emp.birthdayDay && emp.birthdayMonth
      ? `🎂 День рождения: ${emp.birthdayDay}.${emp.birthdayMonth}`
      : null,
  ].filter(Boolean);

  return infoParts.join("\n");
}

/**
 * Простейший анализ вопроса и формирование запроса к БД
 */
export async function handleEmployeeQuery(text) {
  text = text.toLowerCase();

  // === По должностям ===
  if (text.includes("главный бухгалтер"))
    return await getEmployeeInfo({ position: { contains: "Главный бухгалтер" } });

  if (text.includes("директор"))
    return await getEmployeeInfo({ position: { contains: "Директор" } });

  if (text.includes("нач") && text.includes("склада"))
    return await getEmployeeInfo({ position: { contains: "склад" } });

  if (text.includes("руководитель тех"))
    return await getEmployeeInfo({ position: { contains: "Тех" } });

  // === По имени и фамилии ===
  const nameMatch = text.match(/([А-ЯЁ][а-яё]+)\s+([А-ЯЁ][а-яё]+)/);
  if (nameMatch) {
    const [_, firstName, lastName] = nameMatch;
    return await getEmployeeInfo({ firstName, lastName });
  }

  // === Если ничего не подошло ===
  return "Не смог найти подходящего сотрудника. Уточни запрос, пожалуйста.";
}
