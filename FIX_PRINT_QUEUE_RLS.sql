-- 🔧 ИСПРАВЛЕНИЕ ПОЛИТИК БЕЗОПАСНОСТИ ДЛЯ PRINT_QUEUE

-- 1. Удаляем старые политики
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON print_queue;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON print_queue;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON print_queue;

-- 2. Создаем новые политики для ВСЕХ пользователей (включая анонимных)
CREATE POLICY "Allow all to insert" 
ON print_queue 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow all to select" 
ON print_queue 
FOR SELECT 
USING (true);

CREATE POLICY "Allow all to update" 
ON print_queue 
FOR UPDATE 
USING (true)
WITH CHECK (true);

-- 3. Проверяем что RLS включен
ALTER TABLE print_queue ENABLE ROW LEVEL SECURITY;

-- ✅ Готово! Теперь API сможет добавлять задания в очередь

