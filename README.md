# Кафедра КН та ІТ

Повнофункціональний веб-сайт кафедри комп'ютерних наук та інформаційних технологій з особистими кабінетами для студентів, співробітників та адміністратора, двомовним інтерфейсом (UA/EN) та підтримкою світлої і темної теми.

---

## Технологічний стек

| Частина | Технології |
|---|---|
| **Фронтенд** | React 19, React Router v7, Tailwind CSS v3, shadcn/ui (Radix UI), lucide-react, Craco, Axios, Framer Motion, Recharts |
| **Бекенд** | FastAPI (Python), Motor (async MongoDB driver), GridFS (зберігання файлів) |
| **База даних** | MongoDB |
| **Аутентифікація** | Токенова (UUID), bcrypt для хешування паролів |
| **Email** | Gmail SMTP (підтвердження реєстрації, надсилання паролів) |
| **Шрифти** | Space Grotesk (заголовки), IBM Plex Sans (текст) |

---

## Структура проєкту

```
project/
├── backend/
│   ├── .env                  # Змінні середовища бекенду
│   ├── requirements.txt      # Python залежності
│   └── server.py             # FastAPI сервер (єдиний файл)
└── frontend/
    ├── public/
    │   ├── favicon.png
    │   └── index.html
    ├── src/
    │   ├── components/       # Перевикористовувані компоненти
    │   │   ├── ui/           # shadcn/ui компоненти
    │   │   ├── AppHeader.jsx
    │   │   ├── AppFooter.jsx
    │   │   ├── NewsCard.jsx
    │   │   ├── StaffCard.jsx
    │   │   ├── PhoneInput.jsx
    │   │   └── ScrollToTop.jsx
    │   ├── contexts/
    │   │   ├── LanguageContext.js  # UA/EN перемикання
    │   │   └── ThemeContext.js     # light/dark тема
    │   ├── pages/            # Сторінки додатку
    │   │   ├── MainHomePage.js
    │   │   ├── LoginPage.js
    │   │   ├── RegistrationPage.js
    │   │   ├── NewsListPage.js
    │   │   ├── NewsDetailPage.js
    │   │   ├── StaffDirectoryPage.js
    │   │   ├── StaffProfilePublicPage.js
    │   │   ├── EducationalProcessPage.js
    │   │   ├── SpecialtyDetailPage.js
    │   │   ├── ScientificWorkPage.js
    │   │   ├── ScientificLaboratoryPage.js
    │   │   ├── LabProjectDetailsPage.js
    │   │   ├── StudentDashboardPage.js
    │   │   ├── StaffDashboardPage.js
    │   │   └── AdminDashboardPage.js
    │   ├── utils/
    │   │   ├── api.js         # Axios клієнт + всі API функції
    │   │   ├── translations.js# UA/EN переклади
    │   │   └── useModals.js   # Модальні вікна (Alert, Confirm)
    │   ├── lib/
    │   │   └── utils.js
    │   ├── App.js             # Роутинг
    │   ├── App.css
    │   ├── index.js
    │   └── index.css          # Tailwind + CSS змінні тем
    ├── .env                   # Змінні середовища фронтенду
    ├── package.json
    ├── tailwind.config.js
    ├── craco.config.js
    ├── jsconfig.json
    └── components.json        # shadcn/ui конфігурація
```

---

## Швидкий старт

> **Для автоматичного встановлення всіх залежностей та створення `.env` файлів** — запустіть `setup.bat` (Windows) або `setup.sh` (Mac/Linux) подвійним кліком. Детальніше — у розділі [Автоматичне встановлення](#автоматичне-встановлення).

### Передумови

- **Python** 3.10+
- **Node.js** 18+ та **Yarn** (`npm install -g yarn`)
- **MongoDB** (локально або MongoDB Atlas)

---

### 1. Бекенд

```bash
cd backend
python -m pip install -r requirements.txt 
```

Створіть файл `backend/.env`:

```dotenv
MONGO_URL=mongodb://localhost:27017
DB_NAME=kafedra_db
CORS_ORIGINS=http://localhost:3000
SMTP_PASSWORD=
```

> **SMTP_PASSWORD** — пароль застосунку Google для надсилання email. Як отримати:
> Gmail → Обліковий запис Google → Безпека → Двоетапна перевірка (увімкнути) → Паролі застосунків → Створити → Скопіювати 16-символьний пароль.
> Без цього поля сервер працює, але email при реєстрації/відхиленні не надсилається. Сторінка адміна покаже пароль у спливаючому вікні замість відправки.

Запуск:

```bash
python -m uvicorn server:app --reload --port 8000
```

Сервер запуститься на `http://localhost:8000`. При першому старті база даних заповниться тестовими даними автоматично.

---

### 2. Фронтенд

```bash
cd frontend
yarn install
yarn start
```

Якщо бекенд запущено не на порту 8000, вкажіть адресу у `frontend/.env`:

```dotenv
REACT_APP_BACKEND_URL=http://localhost:8000
```

Фронтенд запуститься на `http://localhost:3000`.

---

## Автоматичне встановлення

У корені проєкту є скрипт `setup.bat` / `setup.sh`, який при запуску:

1. Встановлює всі Python-залежності (`pip install -r requirements.txt`)
2. Встановлює всі Node.js-залежності (`yarn install`)
3. Створює `backend/.env` з базовими значеннями (якщо файл відсутній)
4. Створює `frontend/.env` з базовими значеннями (якщо файл відсутній)

> Після роботи скрипту залишається вручну заповнити `SMTP_PASSWORD` у `backend/.env` (якщо потрібне надсилання email) та перевірити `MONGO_URL`.

---

## Тестові акаунти

| Роль | Email | Пароль |
|---|---|---|
| Студент | `student@gmail.com` | `student123` |
| Співробітник | `petenko.i@gmail.com` | `staff123` |
| Адміністратор | `admin@gmail.com` | `admin123` |

База заповнюється автоматично при першому запуску сервера.

---

## Маршрути додатку

### Публічні сторінки (з хедером та футером)

| Маршрут | Сторінка |
|---|---|
| `/` | Головна сторінка |
| `/staff` | Каталог співробітників (фільтрація за категорією, пагінація) |
| `/staff/:id` | Публічний профіль співробітника |
| `/news` | Список новин (категорії, пагінація) |
| `/news/:id` | Детальна сторінка новини (галерея, схожі новини) |
| `/education` | Освітній процес (спеціальності, технології) |
| `/education/:id` | Деталі спеціальності (компетентності, PDF програми) |
| `/research` | Наукова робота (напрями, лабораторії) |
| `/labs/:id` | Сторінка лабораторії (команда, проєкти) |
| `/lab-projects/:id` | Деталі наукового проєкту |

### Авторизація (без хедера/футера)

| Маршрут | Сторінка |
|---|---|
| `/login` | Вхід в систему |
| `/register` | Реєстрація (студент або співробітник) |

### Особисті кабінети (без хедера/футера)

| Маршрут | Сторінка |
|---|---|
| `/student` | Кабінет студента |
| `/staff-cabinet` | Кабінет викладача |
| `/admin` | Кабінет адміністратора |

---

## Функціонал по ролях

### 👨‍🎓 Студент `/student`

- **Розклад консультацій** — перегляд за групою
- **Графік освітнього процесу** — зображення, завантажене адміністратором
- **Залікова відомість / іспити** — розклад екзаменаційної сесії
- **Вибір вибіркових дисциплін** — збереження в БД, адмін бачить вибір
- **Оголошення** — загальні по групі + персональні нагадування
- **Налаштування профілю** — зміна email, пароля, фото

### 👨‍🏫 Викладач `/staff-cabinet`

- **Публікації** — додавання з завантаженням PDF, перемикання статусу публічний/приватний, редагування, видалення
- **Сертифікати** — аналогічно публікаціям
- **Оголошення** від адміністратора
- **Налаштування профілю** — зміна контактних даних, пароля, фото

### 👨‍💼 Адміністратор `/admin`

1. **Вибір дисциплін** — перегляд вибору студентів по курсах/групах, редагування, відправка нагадувань, CSV експорт
2. **Розсилка повідомлень** — надсилання студентам / співробітникам / всім, історія в БД
3. **Управління графіком** — завантаження зображення → публікація для всіх студентів кнопкою «Оновити для всіх»
4. **Підтвердження реєстрації** — прийняти/відхилити заявки, автоматична відправка email з паролем
5. **Публікації співробітників** — перегляд, фільтрація, завантаження файлів, видалення, CSV звіт

---

## Колекції MongoDB

| Колекція | Зміст |
|---|---|
| `users` | Акаунти (student / staff / admin), хешовані паролі |
| `sessions` | UUID-токени авторизації |
| `staff` | Публічні профілі співробітників (публікації, сертифікати всередині) |
| `news` | Новини (категорія, теги, галерея, content_image) |
| `specialties` | Спеціальності (компетентності, результати навчання, PDF) |
| `laboratories` | Лабораторії (команда, напрями досліджень, контакти) |
| `lab_projects` | Наукові проєкти лабораторій (координатори) |
| `study_groups` | Навчальні групи (курс, спеціальність) |
| `group_schedules` | Розклади консультацій по групах |
| `announcements` | Оголошення / персональні нагадування студентам і викладачам |
| `notifications` | Історія масових розсилок адміна |
| `schedule_config` | Графік освітнього процесу (base64 зображення) |
| `department_info` | Інформація про кафедру (контакти, FAQ, features) |
| `exam_schedules` | Розклад екзаменаційних сесій по групах |
| `staff_files` (GridFS) | PDF файли публікацій та сертифікатів викладачів |

---

## API сервера

Сервер підіймається на `http://localhost:8000`. Всі ендпоінти доступні за префіксом `/api`.

Повна інтерактивна документація: `http://localhost:8000/docs` (Swagger UI).

### Основні групи ендпоінтів

| Група | Префікс |
|---|---|
| Інформація про кафедру | `GET /api/department-info` |
| Співробітники | `GET /api/staff`, `GET /api/staff/{id}` |
| Новини | `GET /api/news`, `GET /api/news/{id}`, `GET /api/news/{id}/related` |
| Спеціальності | `GET /api/specialties`, `GET /api/specialties/{id}` |
| Лабораторії | `GET /api/laboratories`, `GET /api/laboratories/{id}` |
| Проєкти лабораторій | `GET /api/lab-projects/{id}` |
| Авторизація | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout` |
| Кабінет студента | `GET /api/student/me`, `GET /api/student/schedule/{group_id}`, `GET /api/student/electives`, `POST /api/student/electives` |
| Кабінет викладача | `GET /api/staff-profile/me`, `POST /api/staff-profile/publications`, `POST /api/staff-profile/certificates` |
| Адмін | `GET /api/admin/pending-users`, `POST /api/admin/approve-user/{id}`, `POST /api/admin/notifications`, `POST /api/admin/schedule` |
| Груп и | `GET /api/groups?course=1` |

Аутентифіковані запити передають токен як query-параметр: `?token=<uuid>`.

---

## Особливості реалізації

- **Локалізація на бекенді** — функція `localize(doc, lang)` автоматично вибирає потрібну мову з мультимовних полів `{ua: "...", en: "..."}` на основі query-параметра `?lang=ua/en`.
- **Файли через GridFS** — PDF публікацій та сертифікатів зберігаються в MongoDB GridFS, завантажуються через `/api/staff-profile/file/{file_id}`.
- **Авто-seed** — при старті сервер перевіряє БД і якщо вона порожня — заповнює тестовими даними автоматично (`/api/seed` також доступний вручну).
- **Токенова авторизація** — UUID токени зберігаються в колекції `sessions`, перевіряються при кожному захищеному запиті.
- **Axios interceptors** — 401 відповідь автоматично очищає localStorage і перенаправляє на головну (якщо сторінка захищена).
- **Двомовність** — перемикання UA/EN зберігається в `localStorage`, передається в усі API-запити.

---

## Поширені проблеми

| Проблема | Причина | Рішення |
|---|---|---|
| Сервер не стартує з помилкою `MONGO_URL` | Відсутній `backend/.env` | Створіть `.env` з `MONGO_URL` |
| 422 Unprocessable Entity на `/api/admin/*` | Перевищення ліміту (параметр `le`) | Перевірте значення `limit` у запиті — має бути ≤ 500 |
| Порожній список публікацій у адміна | Помилка в MongoDB aggregation `$unwind` | Переконайтесь, що поле `preserveNullAndEmptyArrays: true` стоїть правильно |
| Email не надсилається при реєстрації | Не задано `SMTP_PASSWORD` | Додайте пароль застосунку Gmail у `backend/.env`; адмін бачить пароль у alert |
| Графік не відображається у студента | Не натиснуто «Оновити для всіх» | Після завантаження зображення натисніть кнопку публікації в кабінеті адміна |
| `yarn: command not found` | Yarn не встановлено | `npm install -g yarn` |
| `Module not found: @/...` | Не зібраний Craco alias | Перевірте `jsconfig.json` та `craco.config.js` — alias `@` → `src/` |
| Фронтенд не бачить бекенд | Різні порти без CORS | Перевірте `CORS_ORIGINS` у `backend/.env` та `REACT_APP_BACKEND_URL` у `frontend/.env` |
| Помилка `Конекту до БД` або змінено порт | Сервер FastAPI не бачить MongoDB на кастомному порті | Створіть окрему папку на диску (напр. `D:\Mongo\Department-Website`), пропишіть порт в `.env` (`mongodb://localhost:27020`) та запустіть БД командою: `mongod --port 27020 --dbpath "D:\Mongo\Department-Website"` |