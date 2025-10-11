-- Создание таблицы для хранения сообщений из Telegram
CREATE TABLE IF NOT EXISTS telegram_messages (
  id SERIAL PRIMARY KEY,
  from_user_id TEXT NOT NULL,
  from_username TEXT,
  to_user_id TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read BOOLEAN DEFAULT FALSE
);

-- Создание индексов для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_telegram_messages_to_user ON telegram_messages(to_user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_messages_from_user ON telegram_messages(from_user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_messages_timestamp ON telegram_messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_telegram_messages_read ON telegram_messages(read);

-- Комментарии
COMMENT ON TABLE telegram_messages IS 'Сообщения между владельцем и продавцами через Telegram';
COMMENT ON COLUMN telegram_messages.from_user_id IS 'Telegram chat_id отправителя';
COMMENT ON COLUMN telegram_messages.from_username IS 'Username отправителя';
COMMENT ON COLUMN telegram_messages.to_user_id IS 'Telegram chat_id получателя';
COMMENT ON COLUMN telegram_messages.message IS 'Текст сообщения';
COMMENT ON COLUMN telegram_messages.timestamp IS 'Время отправки сообщения';
COMMENT ON COLUMN telegram_messages.read IS 'Прочитано ли сообщение';

