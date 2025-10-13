# 🚀 АВТОЗАПУСК PRINT SERVER + CLOUDFLARE TUNNEL

## ⚡ Быстрый запуск

### Запустить одной командой:
```bash
cd /Users/serik08/Documents/GitHub/shop-qaraa/print-server
bash start-tunnel.sh
```

---

## 🔧 Что делает скрипт?

1. ✅ Останавливает старые процессы
2. ✅ Запускает Print Server на порту 3001
3. ✅ Запускает Cloudflare Tunnel
4. ✅ Автоматически получает публичный URL
5. ✅ Обновляет URL в `README_SETUP.md`

---

## 🍎 Автозапуск при включении Mac

### Вариант 1: Через Automator (РЕКОМЕНДУЕТСЯ)

1. Открой **Automator** (через Spotlight: `Cmd + Space` → `Automator`)
2. Выбери **"Application"** (Программа)
3. Найди **"Run Shell Script"** (Запустить shell-скрипт)
4. Вставь команду:
   ```bash
   cd /Users/serik08/Documents/GitHub/shop-qaraa/print-server
   bash start-tunnel.sh
   ```
5. Сохрани как **"PrintServer.app"** в папку **Applications**
6. Открой **System Settings** → **General** → **Login Items**
7. Нажми **"+"** и добавь **PrintServer.app**

✅ Теперь при каждом включении Mac автоматически запустится печать!

---

### Вариант 2: Через Terminal (ручной запуск)

1. Открой Terminal
2. Выполни:
   ```bash
   cd /Users/serik08/Documents/GitHub/shop-qaraa/print-server
   bash start-tunnel.sh
   ```
3. Оставь терминал открытым (не закрывай!)

---

## 📊 Логи и диагностика

### Проверить статус:
```bash
# Print Server
cat /tmp/print-server.log

# Cloudflare Tunnel
cat /tmp/cloudflared.log

# Текущий URL
grep -o 'https://[a-zA-Z0-9.-]*\.trycloudflare\.com' /tmp/cloudflared.log | head -1
```

### Остановить:
```bash
pkill -f "node server.js"
pkill -f "cloudflared tunnel"
```

---

## ⚠️ ВАЖНО!

### URL меняется при каждом перезапуске!
- Временный URL действителен до перезагрузки Mac
- После перезагрузки нужно **заново запустить скрипт**
- Новый URL автоматически обновится в `README_SETUP.md`

### Как получить текущий URL?
```bash
cat /Users/serik08/Documents/GitHub/shop-qaraa/print-server/README_SETUP.md | grep -o 'https://[a-zA-Z0-9.-]*\.trycloudflare\.com' | head -1
```

---

## 🛠️ Устранение проблем

### Проблема: "Port 3001 already in use"
```bash
# Убей процесс на порту 3001
lsof -ti:3001 | xargs kill -9
```

### Проблема: "cloudflared: command not found"
```bash
# Переустанови cloudflared
brew install cloudflare/cloudflare/cloudflared
```

### Проблема: "Принтер не найден"
1. Открой **System Settings** → **Printers & Scanners**
2. Проверь, что **Xprinter XP-365B** подключен
3. Проверь имя принтера:
   ```bash
   lpstat -p
   ```
4. Если имя отличается, обнови в `server.js`:
   ```javascript
   const PRINTER_NAME = 'YOUR_PRINTER_NAME';
   ```

---

## 🎯 Следующий шаг

После запуска скрипта:
1. ✅ Print Server работает на `http://localhost:3001`
2. ✅ Cloudflare Tunnel работает на `https://xxx.trycloudflare.com`
3. ✅ Теперь можно печатать с iPhone!

### Тестирование с iPhone:
Открой Safari и перейди по URL из `README_SETUP.md` (раздел "Тестирование").

---

## 💡 Совет

Для **постоянного URL** (не меняется при перезагрузке):
- Нужен собственный домен (например, `print.qaraa.kz`)
- Стоимость: ~$10-15 в год
- Настройка: 5-10 минут через Cloudflare Dashboard

