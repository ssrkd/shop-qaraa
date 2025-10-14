-- Проверка существования таблицы print_queue
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'print_queue'
);

-- Если таблица существует, покажи её структуру
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'print_queue'
ORDER BY ordinal_position;

-- Покажи количество заданий в очереди
SELECT status, COUNT(*) 
FROM print_queue 
GROUP BY status;

