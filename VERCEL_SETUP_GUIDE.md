# 🚀 ИНСТРУКЦИЯ: Настройка онлайн печати через Vercel

## 📋 Что мы делаем:

```
React (Vercel) → API (Vercel) → Supabase (очередь) → Mac Agent → Принтер
```

**Преимущества:**
- ✅ Работает онлайн (из любой точки мира)
- ✅ Mac включаешь только когда нужно печатать
- ✅ Можно печатать пачкой (все чеки за день)
- ✅ Бесплатно

---

## ШАГ 1: Создай таблицу в Supabase ✅

1. Открой **Supabase Dashboard**: https://supabase.com
2. Выбери свой проект `shop-qaraa`
3. Зайди в **SQL Editor** (слева)
4. Скопируй весь код из файла **`CREATE_PRINT_QUEUE_TABLE.sql`**
5. Вставь и нажми **Run** ▶️
6. Должно появиться: ✅ Success. No rows returned

---

## ШАГ 2: Добавь зависимости в проект ✅

```bash
cd /Users/serik08/Documents/GitHub/shop-qaraa

# Установи Supabase для Vercel API
npm install @supabase/supabase-js
```

---

## ШАГ 3: Проверь .env файлы ✅

Убедись что в корне проекта есть файл `.env` с:

```env
NEXT_PUBLIC_SUPABASE_URL=твой_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=твой_supabase_key

# ИЛИ если используешь Vite:
VITE_SUPABASE_URL=твой_supabase_url
VITE_SUPABASE_ANON_KEY=твой_supabase_key
```

**Найти эти значения:**
1. Supabase Dashboard → Settings → API
2. Скопируй **Project URL** → это `SUPABASE_URL`
3. Скопируй **anon public** → это `SUPABASE_ANON_KEY`

---

## ШАГ 4: Загрузи на Vercel ✅

```bash
cd /Users/serik08/Documents/GitHub/shop-qaraa

# Добавь изменения в git
git add .
git commit -m "Add Vercel Print API + Queue System"
git push origin main

# Vercel автоматически задеплоит!
```

**Важно:**
- В Vercel Dashboard → Settings → Environment Variables
- Добавь переменные из `.env`:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## ШАГ 5: Обнови URL в React коде ✅

Найди и замени во всех файлах:

**Было:**
```javascript
const PRINT_SERVER_URL = 'https://acoustic-organizational-fraser-sat.trycloudflare.com/api/print';
```

**Стало:**
```javascript
const PRINT_SERVER_URL = 'https://qaraa.vercel.app/api/print';
//                        ^^^^^^^^^^^^^^^^^^^^
//                        Твой домен Vercel
```

**Файлы для обновления:**
- `src/pages/NewSale.jsx`
- `src/pages/SalesHistory.jsx`
- `src/pages/AnalitikaHistory.jsx`
- `src/pages/AdminPanel.js`

---

## ШАГ 6: Установи Mac Agent ✅

```bash
cd /Users/serik08/Documents/GitHub/shop-qaraa/print-agent

# Установи зависимости
npm install

# Проверь что работает
npm start
```

**Должно появиться:**
```
🖨️  Print Agent запущен
📡 Подключение к Supabase: https://...
🖨️  Принтер: Xprinter_XP_365B
⏱️  Интервал проверки: 5 сек

🚀 Агент готов к работе!
```

**Оставь терминал открытым - агент работает!**

---

## ШАГ 7: Тестируй! ✅

### **Тест 1: Создай задание на печать**

1. Зайди на сайт (Vercel): https://qaraa.vercel.app
2. Сделай продажу
3. Чек **НЕ** напечатается сразу (Mac может быть выключен)

### **Тест 2: Проверь очередь**

1. Открой Supabase → Table Editor → `print_queue`
2. Должна быть запись со статусом **`pending`**

### **Тест 3: Запусти агент и печатай**

```bash
cd /Users/serik08/Documents/GitHub/shop-qaraa/print-agent
npm start
```

**Агент автоматически:**
1. Найдет задание в очереди
2. Напечатает чек
3. Обновит статус на **`completed`**

---

## ШАГ 8: Автозапуск агента (опционально) ✅

Создай скрипт автозапуска для Mac Agent:

```bash
cat > ~/Library/LaunchAgents/com.qaraa.printagent.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.qaraa.printagent</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/Users/serik08/Documents/GitHub/shop-qaraa/print-agent/agent.js</string>
    </array>
    
    <key>RunAtLoad</key>
    <true/>
    
    <key>KeepAlive</key>
    <true/>
    
    <key>WorkingDirectory</key>
    <string>/Users/serik08/Documents/GitHub/shop-qaraa/print-agent</string>
    
    <key>StandardOutPath</key>
    <string>/tmp/print-agent.log</string>
    
    <key>StandardErrorPath</key>
    <string>/tmp/print-agent-error.log</string>
</dict>
</plist>
EOF

# Загрузи службу
launchctl load ~/Library/LaunchAgents/com.qaraa.printagent.plist
```

**Теперь агент запускается автоматически при старте Mac!**

---

## 🔧 Команды управления

### **Запуск агента вручную:**
```bash
cd /Users/serik08/Documents/GitHub/shop-qaraa/print-agent
npm start
```

### **Остановка агента:**
```bash
# Ctrl + C в терминале
# ИЛИ
launchctl unload ~/Library/LaunchAgents/com.qaraa.printagent.plist
```

### **Просмотр логов:**
```bash
tail -f /tmp/print-agent.log
```

### **Просмотр очереди:**
```bash
# Открой Supabase → Table Editor → print_queue
```

---

## 📊 Как это работает

### **Продавец делает продажу:**
```
👤 Продавец → React → Vercel API → Supabase
                                      ↓
                               (задание создано)
```

### **Ты включаешь Mac:**
```
💻 Mac Agent → проверяет Supabase каждые 5 сек
              ↓
         Есть задание?
              ↓
         🖨️ Печатает!
              ↓
         ✅ Обновляет статус
```

---

## ❓ Частые вопросы

### **Q: Можно ли печатать без интернета на Mac?**
A: Нет. Mac Agent должен быть подключен к интернету для доступа к Supabase.

### **Q: Сколько заданий хранится в очереди?**
A: Бесконечно. Можно печатать даже через неделю.

### **Q: Можно ли печатать с телефона?**
A: Да! Заходи на сайт с телефона, делай продажу. Когда включишь Mac - чек напечатается.

### **Q: Что если агент упал?**
A: Автозапуск (launchd) перезапустит его автоматически.

### **Q: Можно ли удалить старые задания?**
A: Да, в Supabase Table Editor → `print_queue` → Delete.

---

## 🎉 ГОТОВО!

Теперь у тебя:
- ✅ Онлайн печать через Vercel
- ✅ Mac включаешь только когда нужно
- ✅ Все бесплатно
- ✅ Работает из любой точки мира

**Если есть вопросы - пиши!** 🚀

