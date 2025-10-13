-- 🖨️ ТАБЛИЦА ОЧЕРЕДИ ПЕЧАТИ

-- 1. Создаем таблицу
CREATE TABLE IF NOT EXISTS print_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Тип документа
  type TEXT NOT NULL CHECK (type IN ('receipt', 'report', 'label')),
  
  -- Данные для печати (JSON)
  data JSONB NOT NULL,
  
  -- Статус
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'printing', 'completed', 'failed')),
  
  -- Кто создал
  created_by TEXT,
  
  -- Временные метки
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  printed_at TIMESTAMP WITH TIME ZONE,
  
  -- Ошибка (если есть)
  error TEXT,
  
  -- Приоритет (чем меньше, тем выше)
  priority INTEGER DEFAULT 0
);

-- 2. Создаем индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_print_queue_status ON print_queue(status);
CREATE INDEX IF NOT EXISTS idx_print_queue_created_at ON print_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_print_queue_priority ON print_queue(priority, created_at);

-- 3. Включаем Row Level Security (RLS)
ALTER TABLE print_queue ENABLE ROW LEVEL SECURITY;

-- 4. Политики доступа
-- Все авторизованные пользователи могут создавать задания
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON print_queue;
CREATE POLICY "Enable insert for authenticated users" 
ON print_queue 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Все авторизованные пользователи могут читать задания
DROP POLICY IF EXISTS "Enable read for authenticated users" ON print_queue;
CREATE POLICY "Enable read for authenticated users" 
ON print_queue 
FOR SELECT 
TO authenticated 
USING (true);

-- Все авторизованные пользователи могут обновлять задания
DROP POLICY IF EXISTS "Enable update for authenticated users" ON print_queue;
CREATE POLICY "Enable update for authenticated users" 
ON print_queue 
FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

-- 5. Комментарии
COMMENT ON TABLE print_queue IS 'Очередь заданий на печать для принтера Xprinter XP-365B';
COMMENT ON COLUMN print_queue.type IS 'Тип документа: receipt (чек), report (отчет), label (этикетка)';
COMMENT ON COLUMN print_queue.data IS 'JSON с данными для печати';
COMMENT ON COLUMN print_queue.status IS 'Статус: pending (ожидает), printing (печатается), completed (готово), failed (ошибка)';
COMMENT ON COLUMN print_queue.priority IS 'Приоритет (0 = высший)';

-- 6. Пример использования
-- INSERT INTO print_queue (type, data, created_by) VALUES (
--   'receipt',
--   '{"seller": "Serik", "items": [{"productName": "Test", "price": 1000}], "total": 1000}',
--   'admin@qaraa.kz'
-- );

