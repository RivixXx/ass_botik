// src/plugins/employees/employees.service.js
import prisma from "../../db/prismaClient.js";
import { isEmployeeQuery, extractNameFromText, extractEmailFromText } from "./employee-query-detector.js";

/**
 * Формат ответа: { handled: boolean, text: string }
 * handled = true  -> бот должен ответить text и НЕ вызывать OpenAI
 * handled = false -> бот не нашёл сигнатуру запроса по БД, можно отправить OpenAI
 */

function formatEmployeeInfo(emp) {
  if (!emp) return null;
  const parts = [
    `👤 ${emp.firstName || ""} ${emp.lastName || ""}`.trim(),
    emp.position ? `📌 Должность: ${emp.position}` : null,
    emp.department ? `🏢 Подразделение: ${emp.department}` : null,
    emp.email ? `✉ E-mail: ${emp.email}` : null,
    emp.phone ? `📱 Телефон: ${emp.phone}` : null,
    (emp.birthdayDay && emp.birthdayMonth) ? `🎂 День рождения: ${emp.birthdayDay}.${emp.birthdayMonth}` : null
  ].filter(Boolean);
  return parts.join("\n");
}

async function findByNameToken(token) {
  if (!token) return null;
  return await prisma.employee.findFirst({
    where: {
      OR: [
        { lastName: { contains: token, mode: "insensitive" } },
        { firstName: { contains: token, mode: "insensitive" } },
        { email: { contains: token, mode: "insensitive" } }
      ]
    }
  });
}

/**
 * Анализ текста и поиск в БД. Возвращает { handled, text }.
 * Использует централизованный детектор для определения типа запроса.
 */
export async function handleEmployeeQuery(text) {
  text = String(text || "").trim();
  if (!text) return { handled: false, text: "" };

  // Быстрая проверка: если запрос точно не о сотрудниках, сразу возвращаем
  if (!isEmployeeQuery(text)) {
    return { handled: false, text: "" };
  }

  const low = text.toLowerCase();

  // Если явно спрашивают о должности / "должность", "должност", "кто по должности"
  const askPositionKeywords = ["должность", "должност", "кто по должности", "чья должность", "какая должность"];
  const askPosition = askPositionKeywords.some(k => low.includes(k));

  // 1) Прямые запросы по должности: "кто главный бухгалтер", "кто директор"
  if (low.includes("главный бухгалтер") || low.includes("главбух")) {
    const emp = await prisma.employee.findFirst({ where: { position: { contains: "главный бухгалтер", mode: "insensitive" } } });
    return emp ? { handled: true, text: formatEmployeeInfo(emp) } : { handled: true, text: "Сотрудник не найден." };
  }
  if (low.includes("директор")) {
    const emp = await prisma.employee.findFirst({ where: { position: { contains: "директор", mode: "insensitive" } } });
    return emp ? { handled: true, text: formatEmployeeInfo(emp) } : { handled: true, text: "Сотрудник не найден." };
  }
  if (low.includes("руководитель") && low.includes("тех")) {
    const emp = await prisma.employee.findFirst({ where: { position: { contains: "руководитель", mode: "insensitive" }, department: { contains: "тех", mode: "insensitive" } } });
    return emp ? { handled: true, text: formatEmployeeInfo(emp) } : { handled: true, text: "Сотрудник не найден." };
  }

  // 2) Если пользователь явно спрашивает "должность" — попытаемся извлечь имя/фамилию
  if (askPosition) {
    // Используем централизованную функцию для извлечения имени
    const nameData = extractNameFromText(text);
    if (nameData) {
      const { firstName, lastName } = nameData;
      // Сначала точный поиск: Имя Фамилия
      let emp = await prisma.employee.findFirst({ 
        where: { firstName: { equals: firstName }, lastName: { equals: lastName } } 
      });
      // Если не нашли, пробуем обратный порядок: Фамилия Имя
      if (!emp) {
        emp = await prisma.employee.findFirst({ 
          where: { firstName: { equals: lastName }, lastName: { equals: firstName } } 
        });
      }
      if (emp) {
        return emp.position ? { handled: true, text: `Должность: ${emp.position}` } : { handled: true, text: formatEmployeeInfo(emp) };
      }
      // Попробовать частичный поиск по токенам
      const partial = await prisma.employee.findFirst({
        where: {
          OR: [
            { firstName: { contains: firstName, mode: "insensitive" } },
            { lastName: { contains: lastName, mode: "insensitive" } },
            { firstName: { contains: lastName, mode: "insensitive" } },
            { lastName: { contains: firstName, mode: "insensitive" } }
          ]
        }
      });
      return partial ? (partial.position ? { handled: true, text: `Должность: ${partial.position}` } : { handled: true, text: formatEmployeeInfo(partial) }) : { handled: true, text: "Сотрудник не найден." };
    }

    // Если только одно слово (например: "Зорин должность?") — ищем по фамилии/имени
    const singleMatch = text.match(/([А-ЯЁA-ЯЁ][а-яёa-яё]+)/i);
    if (singleMatch) {
      const token = singleMatch[1];
      const emp = await findByNameToken(token);
      if (!emp) return { handled: true, text: "Сотрудник не найден." };
      return emp.position ? { handled: true, text: `Должность: ${emp.position}` } : { handled: true, text: formatEmployeeInfo(emp) };
    }

    // Не распарсили имя — просим уточнить
    return { handled: true, text: "Уточните, пожалуйста, о ком вы спрашиваете (например: «Зорин Михаил должность?»)." };
  }

  // 3) Общие вопросы типа "Михаил Зорин" — показать карточку
  const nameData = extractNameFromText(text);
  if (nameData) {
    const { firstName, lastName } = nameData;
    // Сначала точный поиск: Имя Фамилия
    let emp = await prisma.employee.findFirst({ 
      where: { AND: [{ firstName: { equals: firstName } }, { lastName: { equals: lastName } }] } 
    });
    // Если не нашли, пробуем обратный порядок: Фамилия Имя
    if (!emp) {
      emp = await prisma.employee.findFirst({ 
        where: { AND: [{ firstName: { equals: lastName } }, { lastName: { equals: firstName } }] } 
      });
    }
    if (emp) return { handled: true, text: formatEmployeeInfo(emp) };
    
    // Частичный поиск
    const partial = await prisma.employee.findFirst({
      where: {
        OR: [
          { firstName: { contains: firstName, mode: "insensitive" } },
          { lastName: { contains: firstName, mode: "insensitive" } },
          { firstName: { contains: lastName, mode: "insensitive" } },
          { lastName: { contains: lastName, mode: "insensitive" } }
        ]
      }
    });
    return partial ? { handled: true, text: formatEmployeeInfo(partial) } : { handled: false, text: "" };
  }

  // 4) По email в тексте
  const email = extractEmailFromText(text);
  if (email) {
    const emp = await prisma.employee.findFirst({ 
      where: { email: { equals: email, mode: "insensitive" } } 
    });
    return emp ? { handled: true, text: formatEmployeeInfo(emp) } : { handled: true, text: "Сотрудник не найден." };
  }

  // 5) Поиск по отделу/подразделению (только если есть явное упоминание)
  // Более строгая проверка: ищем только при явном указании отдела
  const departmentKeywords = ["отдел", "подразделение", "бухгалтерия"];
  const hasDepartmentKeyword = departmentKeywords.some(keyword => low.includes(keyword));
  
  if (hasDepartmentKeyword) {
    // Извлекаем название отдела (убираем служебные слова)
    const cleanText = low.replace(/(в|на|по|от|какой|какого|кто)\s+/g, "").trim();
    const emp = await prisma.employee.findFirst({ 
      where: { department: { contains: cleanText, mode: "insensitive" } } 
    });
    if (emp) return { handled: true, text: formatEmployeeInfo(emp) };
  }

  // Если не подошла ни одна сигнатура — не обрабатываем (пусть идёт в OpenAI)
  // Это важно: мы уже проверили через isEmployeeQuery, что запрос может относиться к сотрудникам,
  // но если конкретная информация не найдена, возвращаем handled: false для передачи в AI
  return { handled: false, text: "" };
}
