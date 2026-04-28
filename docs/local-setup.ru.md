# Запуск StudentHub локально

Эта инструкция помогает запустить проект на твоём компьютере без Replit.
Все шаги — на русском.

---

## Что должно быть установлено

1. **Node.js 24** или новее. Скачать: <https://nodejs.org/>.
   Проверка: `node -v` должно показать версию `v24.x` или выше.
2. **pnpm 10** или новее. Установка одной командой:

   ```bash
   npm install -g pnpm
   ```

   Проверка: `pnpm -v` показывает версию.
3. **PostgreSQL 16** или новее. Самый простой способ — поставить
   <https://www.postgresql.org/download/> или запустить через Docker:

   ```bash
   docker run --name studenthub-pg -e POSTGRES_PASSWORD=postgres \
     -p 5432:5432 -d postgres:16
   ```

4. **Git** (любая версия), чтобы скачать репозиторий.

---

## Шаг 1. Скачиваем проект

```bash
git clone <адрес-репозитория> studenthub
cd studenthub
```

Если у тебя репозиторий в Replit — нажми «…» → «Git» → «Clone URL» и
скопируй ссылку.

---

## Шаг 2. Устанавливаем зависимости

В корне проекта:

```bash
pnpm install
```

Команда скачает все нужные пакеты для фронтенда, бэкенда и общих библиотек.

---

## Шаг 3. Создаём базу данных

Если ты ставил Postgres локально, создай отдельную базу:

```bash
createdb studenthub
```

Если запускал через Docker (см. выше), база уже есть — называется
`postgres`.

---

## Шаг 4. Настраиваем `.env`

В корне проекта создай файл `.env`. Минимальный набор переменных:

```env
# === База данных ===
DATABASE_URL=postgres://postgres:postgres@localhost:5432/studenthub

# === Бэкенд (Express + Drizzle) ===
PORT=8080

# === Фронтенд (Vite) ===
# Это переменные, которые читает vite.config.ts
# При локальном запуске фронтенд должен проксировать /api на бэкенд.
API_PROXY_TARGET=http://localhost:8080
BASE_PATH=/

# === Google OAuth ===
# Получить значения по инструкции docs/google-cloud-setup.ru.md
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:8080/api/google/callback
```

> Если у тебя другой пользователь/пароль/порт Postgres — поправь
> `DATABASE_URL` под себя.

Файл `.env` уже включён в `.gitignore`, его никогда не нужно
коммитить.

---

## Шаг 5. Применяем схему базы данных

Drizzle создаст все таблицы (предметы, занятия, задачи, оценки,
google_accounts и т.д.) одной командой:

```bash
pnpm --filter @workspace/db run push
```

Если спросит, точно ли применить изменения — отвечай «да».

---

## Шаг 6. Запуск приложения

Открой **два терминала** в корне проекта.

### Терминал 1 — бэкенд (API)

```bash
# Загружаем .env в окружение и стартуем сервер
set -a; . ./.env; set +a
pnpm --filter @workspace/api-server run dev
```

В выводе должно быть:

```
[INFO] Server listening { port: 8080 }
```

### Терминал 2 — фронтенд

```bash
set -a; . ./.env; set +a
pnpm --filter @workspace/studenthub run dev
```

В выводе должно появиться:

```
VITE v7.x ready in ... ms
➜  Local:   http://localhost:21995/
```

> Если ты на Windows и команда `set -a; . ./.env; set +a` не работает,
> используй `cross-env` или просто пропиши значения в системные
> переменные среды. Самый простой способ — поставить пакет
> `dotenv-cli` (`npm i -g dotenv-cli`) и запускать так:
>
> ```bash
> dotenv -e .env -- pnpm --filter @workspace/api-server run dev
> dotenv -e .env -- pnpm --filter @workspace/studenthub run dev
> ```

---

## Шаг 7. Открываем приложение

Открой в браузере <http://localhost:21995>.

- Главный экран — «Сегодня».
- В левом меню найди **Настройки**.
- В блоке **Google аккаунт** нажми **Войти через Google**, чтобы
  подключить свои календарь и таблицы (предварительно настрой Google
  Cloud по инструкции `docs/google-cloud-setup.ru.md`).

---

## Полезные команды

| Что | Команда |
| --- | --- |
| Установить зависимости | `pnpm install` |
| Применить изменения схемы БД | `pnpm --filter @workspace/db run push` |
| Перегенерировать API-клиент после правок `openapi.yaml` | `pnpm --filter @workspace/api-spec run codegen` |
| Проверить типы во всём проекте | `pnpm -w run typecheck` |
| Собрать бэкенд | `pnpm --filter @workspace/api-server run build` |
| Собрать фронтенд | `pnpm --filter @workspace/studenthub run build` |

---

## Если что-то не работает

| Симптом | Решение |
| --- | --- |
| `DATABASE_URL must be set` | `.env` не загрузился. Проверь, что выполнил `set -a; . ./.env; set +a` в том же терминале, где запускаешь сервер. |
| `PORT environment variable is required` | То же самое — переменные не загружены. |
| Кнопка «Войти через Google» открывает ошибку «redirect_uri_mismatch» | Адрес `GOOGLE_REDIRECT_URI` должен дословно совпадать с тем, что ты добавил в Google Cloud Console. |
| После входа в Google пишет «Access blocked» | Аккаунт не добавлен в Test users. См. шаг 3 в `docs/google-cloud-setup.ru.md`. |
| Фронтенд показывает «Не удалось получить статус Google» | Не запущен бэкенд или Vite не проксирует `/api`. Проверь, что `API_PROXY_TARGET` задан и бэкенд запущен на этом адресе. |
| `pnpm: command not found` | Установи pnpm: `npm install -g pnpm`. |

---

После первой настройки тебе достаточно запускать оба `pnpm … run dev` в
двух терминалах — всё остальное уже настроено.
