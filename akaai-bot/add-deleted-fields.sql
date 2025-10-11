-- Добавить поля для отслеживания удаления у каждого пользователя
ALTER TABLE telegram_messages 
ADD COLUMN IF NOT EXISTS deleted_by_owner BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_by_seller BOOLEAN DEFAULT FALSE;

-- Обновить существующие записи
UPDATE telegram_messages 
SET deleted_by_owner = FALSE, deleted_by_seller = FALSE 
WHERE deleted_by_owner IS NULL OR deleted_by_seller IS NULL;

