# 🤖 akaAI Telegram Bot

Telegram бот для интеграции с Qaraa CRM системой. Позволяет продавцам отправлять сообщения владельцу через Telegram, а владельцу - отвечать прямо из Telegram.

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
cd akaai-bot
npm install
```

### 2. Создание таблицы в Supabase

Выполните SQL из файла `setup.sql` в SQL Editor вашего Supabase проекта.

### 3. Настройка переменных окружения

Создайте файл `.env` (или добавьте в Vercel Dashboard):

```env
TELEGRAM_TOKEN=8363449094:AAHpdTNzz4mdtG49_2ldhx_uT3WTzeoz7xA
OWNER_CHAT_ID=996317285
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key
```

### 4. Деплой на Vercel

```bash
vercel --prod
```

При деплое:
- **Root Directory**: выберите `akaai-bot`
- Добавьте Environment Variables в Vercel Dashboard

### 5. Установка Webhook

После деплоя выполните:

```bash
curl -X POST "https://api.telegram.org/bot8363449094:AAHpdTNzz4mdtG49_2ldhx_uT3WTzeoz7xA/setWebhook?url=https://your-bot.vercel.app/api/webhook"
```

## 📋 Функционал

### Для продавцов:

1. Продавец пишет боту `/start`
2. Бот показывает его `chat_id`
3. Владелец добавляет `chat_id` в таблицу `login`
4. Продавец может отправлять сообщения владельцу

### Для владельца:

1. Получает уведомления от продавцов
2. Отвечает через "Reply" на сообщение
3. Ответ автоматически отправляется продавцу

### В CRM (akaai.jsx):

1. Режим "💬 Сообщения" показывает все диалоги
2. Можно отвечать прямо из интерфейса
3. Счетчик непрочитанных сообщений

## 🔧 Структура проекта

```
akaai-bot/
├── api/
│   └── webhook.js          # Обработчик Telegram webhook
├── package.json            # Зависимости
├── vercel.json            # Конфигурация Vercel
├── setup.sql              # SQL скрипт
└── README.md              # Документация
```

## 📊 База данных

### Таблица `telegram_messages`

| Поле | Тип | Описание |
|------|-----|----------|
| id | SERIAL | ID сообщения |
| from_user_id | TEXT | Telegram chat_id отправителя |
| from_username | TEXT | Username отправителя |
| to_user_id | TEXT | Telegram chat_id получателя |
| message | TEXT | Текст сообщения |
| timestamp | TIMESTAMP | Время отправки |
| read | BOOLEAN | Прочитано ли |

## 🛠️ Техническая информация

- **Платформа**: Vercel Serverless Functions
- **Runtime**: Node.js 14+
- **База данных**: Supabase (PostgreSQL)
- **API**: Telegram Bot API

## 📝 Лицензия

MIT

