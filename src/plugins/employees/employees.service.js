// src/plugins/employees/employees.service.js
import prisma from "../../db/prismaClient.js";

/**
 * Возвращает объект сотрудника по условию или строку "Сотрудник не найден."
 */
export async function getEmployeeInfoRaw(query) {
  const emp = await prisma.employee.findFirst({ where: query });
  return emp || null;
}

/**
 * Формирует читаемый ответ по объекту сотрудника
 */
export function formatEmployeeInfo(emp) {
  if (!emp) return "Сотрудник не найден.";
  const parts = [
    `👤 ${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
    emp.position ? `📌 Должность: ${emp.position}` : null,
    emp.department ? `🏢 Подразделение: ${emp.department}` : null,
    emp.email ? `✉ E-mail: ${emp.email}` : null,
    emp.phone ? `📱 Телефон: ${emp.phone}` : null,
    (emp.birthdayDay && emp.birthdayMonth) ? `🎂 День рождения: ${emp.birthdayDay}.${emp.birthdayMonth}` : null
  ].filter(Boolean);
  return parts.join("\n");
}

/**
 * Главная функция: принимает текст вопроса, анализирует и возвращает ответ (строку).
 */
export async function handleEmployeeQuery(text) {
  text = String(text || "").trim();

  if (!text) return "Пустой запрос.";

  const low = text.toLowerCase();

  // 1) Простейшие запросы по должности (ключевые фразы)
  if (low.includes("главный бухгалтер") || low.includes("главбух")) {
    const emp = await getEmployeeInfoRaw({ position: { contains: "Главный Бухгалтер", mode: "insensitive" } });
    return formatEmployeeInfo(emp);
  }
  if (low.includes("директор")) {
    const emp = await getEmployeeInfoRaw({ position: { contains: "директор", mode: "insensitive" } });
    return formatEmployeeInfo(emp);
  }
  if (low.includes("руководитель") && low.includes("тех")) {
    const emp = await getEmployeeInfoRaw({ position: { contains: "руководитель", mode: "insensitive" }, department: { contains: "тех", mode: "insensitive" } });
    return formatEmployeeInfo(emp);
  }

  // 2) Если в запросе есть слово "должность" — пытаемся извлечь имя/фамилию и вернуть только должность
  if (low.includes("должност") || low.includes("должность") || low.includes("кто по должности") || low.includes("должен")) {
    // Пытаемся найти "Имя Фамилия" в тексте
    let nameMatch = text.match(/([А-ЯЁA-ЯЁ][а-яёa-яё]+)\s+([А-ЯЁA-ЯЁ][а-яёa-яё]+)/i);
    if (nameMatch) {
      const firstName = nameMatch[1];
      const lastName = nameMatch[2];
      const emp = await getEmployeeInfoRaw({ firstName: { equals: firstName }, lastName: { equals: lastName } });
      if (emp && emp.position) return `Должность: ${emp.position}`;
      if (emp) return formatEmployeeInfo(emp);
      // попробуем частичный поиск
      const emp2 = await prisma.employee.findFirst({
        where: {
          OR: [
            { firstName: { contains: firstName, mode: "insensitive" } },
            { lastName: { contains: lastName, mode: "insensitive" } }
          ]
        }
      });
      return emp2 ? (emp2.position ? `Должность: ${emp2.position}` : formatEmployeeInfo(emp2)) : "Сотрудник не найден.";
    }

    // Если найдено только одно слово (вероятно фамилия) — "Зорин должность?"
    const singleNameMatch = text.match(/([А-ЯЁA-ЯЁ][а-яёa-яё]+)/i);
    if (singleNameMatch) {
      const token = singleNameMatch[1];
      // Поиск по фамилии или имени (contains, case-insensitive)
      const emp = await prisma.employee.findFirst({
        where: {
          OR: [
            { lastName: { contains: token, mode: "insensitive" } },
            { firstName: { contains: token, mode: "insensitive" } },
            { email: { contains: token, mode: "insensitive" } }
          ]
        }
      });
      if (!emp) return "Сотрудник не найден.";
      if (emp.position) return `Должность: ${emp.position}`;
      return formatEmployeeInfo(emp);
    }

    // если не удалось распарсить имя
    return "Уточните, пожалуйста, о ком именно вы спрашиваете (например: «Зорин Михаил должность?»).";
  }

  // 3) Прямой запрос по имени/фамилии: "Михаил Зорин", "Зорин Михаил" и т.д.
  // ищем шаблоны "Имя Фамилия" или "Фамилия Имя"
  let nameMatch2 = text.match(/([А-ЯЁA-ЯЁ][а-яёa-яё]+)\s+([А-ЯЁA-ЯЁ][а-яёa-яё]+)/i);
  if (nameMatch2) {
    const a = nameMatch2[1];
    const b = nameMatch2[2];
    // попробуем оба варианта (Имя Фамилия и Фамилия Имя)
    let emp = await prisma.employee.findFirst({ where: { AND: [{ firstName: { equals: a } }, { lastName: { equals: b } }] } });
    if (!emp) {
      emp = await prisma.employee.findFirst({ where: { AND: [{ firstName: { equals: b } }, { lastName: { equals: a } }] } });
    }
    if (emp) return formatEmployeeInfo(emp);
    // падение в частичный поиск
    const partial = await prisma.employee.findFirst({
      where: {
        OR: [
          { firstName: { contains: a, mode: "insensitive" } },
          { lastName: { contains: a, mode: "insensitive" } },
          { firstName: { contains: b, mode: "insensitive" } },
          { lastName: { contains: b, mode: "insensitive" } }
        ]
      }
    });
    return partial ? formatEmployeeInfo(partial) : "Сотрудник не найден.";
  }

  // 4) По e-mail в запросе
  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (emailMatch) {
    const emp = await prisma.employee.findFirst({ where: { email: { equals: emailMatch[0], mode: "insensitive" } } });
    return formatEmployeeInfo(emp);
  }

  // 5) По подразделению (если запрос содержит "отдел" или "подраздел")
  if (low.includes("отдел") || low.includes("подраздел")) {
    const emp = await prisma.employee.findFirst({ where: { department: { contains: low.replace(/в|в\s|на\s/g, ""), mode: "insensitive" } } });
    return formatEmployeeInfo(emp);
  }

  // 6) Фолбек — не нашли сигнатуры для DB, даём подсказку
  return "Не уверен, что правильно понял запрос. Сформулируйте, пожалуйста: «Имя Фамилия должность?» или «Должность Зорина?»";
}
