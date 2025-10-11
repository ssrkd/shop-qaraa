# ⚡ Быстрая настройка за 5 минут

## Шаг 1: SQL в Supabase

1. Открой Supabase → SQL Editor
2. Скопируй и выполни SQL из `setup.sql`
3. Добавь поле `telegram_chat_id` в таблицу `login`:

```sql
ALTER TABLE login ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;
```

## Шаг 2: Деплой на Vercel

1. Зайди на [vercel.com](https://vercel.com)
2. New Project → Import Git Repository
3. Выбери репозиторий `shop-qaraa`
4. **ВАЖНО**: Root Directory → `akaai-bot`
5. Добавь Environment Variables:
   - `TELEGRAM_TOKEN` = `8363449094:AAHpdTNzz4mdtG49_2ldhx_uT3WTzeoz7xA`
   - `OWNER_CHAT_ID` = `996317285`
   - `SUPABASE_URL` = твой URL Supabase
   - `SUPABASE_KEY` = твой anon key Supabase
6. Deploy

## Шаг 3: Установка Webhook

После успешного деплоя, скопируй URL (например: `https://akaai-bot.vercel.app`)

Выполни эту команду (замени URL на свой):

```bash
curl -X POST "https://api.telegram.org/bot8363449094:AAHpdTNzz4mdtG49_2ldhx_uT3WTzeoz7xA/setWebhook?url=https://akaai-bot.vercel.app/api/webhook"
```

Должно вернуться: `{"ok":true,"result":true,"description":"Webhook was set"}`

## Шаг 4: Проверка

1. Напиши боту `/start` (в Telegram найди своего бота)
2. Бот покажет твой `chat_id`
3. Добавь `chat_id` продавца в Supabase:

```sql
UPDATE login 
SET telegram_chat_id = '996317285' 
WHERE username = 'sen';
```

4. Продавец пишет боту → ты получишь уведомление!

## 🎉 Готово!

Теперь:
- Продавцы могут писать тебе через бота
- Ты можешь отвечать через "Reply" в Telegram
- Все сообщения сохраняются в базу
- В akaAI будет вкладка "💬 Сообщения"

---

**Проблемы?**

Проверь:
1. Vercel Logs → Functions → webhook
2. Telegram Bot Token правильный
3. Supabase URL и Key правильные
4. Webhook установлен (выполни команду еще раз)

