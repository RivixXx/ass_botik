import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.employee.createMany({
    data: [
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
    ]
  });

  console.log("Employees inserted successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
