-- Включить Realtime для таблицы telegram_messages
ALTER TABLE telegram_messages REPLICA IDENTITY FULL;

-- Включить публикацию изменений
ALTER PUBLICATION supabase_realtime ADD TABLE telegram_messages;

-- Проверить статус
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'telegram_messages';

