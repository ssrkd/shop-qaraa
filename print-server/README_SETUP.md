# 🖨️ Print Server + Cloudflare Tunnel - Инструкция по запуску

## 📋 Требования

- ✅ macOS с установленным Homebrew
- ✅ Node.js (уже установлен)
- ✅ Xprinter XP-365B, подключенный через USB
- ✅ Cloudflared (уже установлен)

---

## 🚀 Автоматический запуск (рекомендуется)

### Создайте файл `start.sh`:

```bash
#!/bin/bash

# Остановка старых процессов
pkill -f "node server.js"
pkill cloudflared

# Запуск Print Server
cd /Users/serik08/Documents/GitHub/shop-qaraa/print-server
npm start &

# Ожидание запуска Print Server
sleep 3

# Запуск Cloudflare Tunnel
cloudflared tunnel --url http://localhost:3001 > /tmp/cloudflared.log 2>&1 &

# Ожидание запуска туннеля
sleep 5

# Получение публичного URL
echo "🖨️  Print Server запущен на http://localhost:3001"
echo "🌐 Cloudflare Tunnel URL:"
grep -i "https://" /tmp/cloudflared.log | tail -1

echo ""
echo "✅ Все сервисы запущены!"
echo ""
echo "📝 Важно: URL Cloudflare может измениться при перезапуске."
echo "   Обновите PRINT_SERVER_URL в файлах React при необходимости."
```

### Сделайте файл исполняемым:

```bash
chmod +x start.sh
```

### Запустите:

```bash
./start.sh
```

---

## 🛠️ Ручной запуск

### 1. Запустите Print Server:

```bash
cd /Users/serik08/Documents/GitHub/shop-qaraa/print-server
npm start
```

### 2. В новом терминале запустите Cloudflare Tunnel:

```bash
cloudflared tunnel --url http://localhost:3001
```

### 3. Скопируйте URL из вывода:

```
https://recommended-heavy-vegetation-candle.trycloudflare.com
```

### 4. Обновите URL в файлах React (если изменился):

- `src/pages/NewSale.jsx`
- `src/pages/SalesHistory.jsx`
- `src/pages/AnalitikaHistory.jsx`
- `src/pages/AdminPanel.js`

Замените:
```javascript
const PRINT_SERVER_URL = 'https://recommended-heavy-vegetation-candle.trycloudflare.com/api/print';
```

---

## 🔄 Перезапуск

Если туннель или сервер остановились:

```bash
pkill -f "node server.js"
pkill cloudflared
./start.sh
```

---

## 📱 Использование

### Из React приложения:

1. **NewSale** → Автоматическая печать чека после продажи
2. **SalesHistory** → Кнопка "Распечатать чек"
3. **AnalitikaHistory** → Кнопка "Распечатать отчет"
4. **AdminPanel** → Кнопка "Распечатка этикеток"

### Из любого устройства (iPhone, Android, другой компьютер):

```bash
curl -X POST https://recommended-heavy-vegetation-candle.trycloudflare.com/api/print \
  -H "Content-Type: application/json" \
  -d '{
    "type": "receipt",
    "seller": "Test",
    "items": [
      {
        "productName": "Nike Air Max",
        "size": "42",
        "quantity": 1,
        "price": 5990
      }
    ],
    "total": 5990,
    "change": 10,
    "paymentMethod": "Kaspi QR"
  }'
```

---

## ⚠️ Важные замечания

1. **URL Cloudflare изменяется** при каждом перезапуске туннеля. Если вы перезапустили туннель, обновите `PRINT_SERVER_URL` в файлах React.

2. **Mac должен быть включен** для работы печати.

3. **Принтер должен быть подключен** и виден в системе как `Xprinter_XP_365B`.

4. **Проверка принтера:**
   ```bash
   lpstat -p Xprinter_XP_365B
   ```

5. **Бесплатный Cloudflare Tunnel** работает без регистрации, но имеет ограничения по времени работы.

---

## 🐛 Troubleshooting

### Принтер не печатает:

```bash
# Проверьте принтер
lpstat -p Xprinter_XP_365B

# Перезагрузите CUPS
sudo launchctl stop org.cups.cupsd
sudo launchctl start org.cups.cupsd
```

### Cloudflare Tunnel не работает:

```bash
# Проверьте логи
tail -f /tmp/cloudflared.log

# Перезапустите
pkill cloudflared
cloudflared tunnel --url http://localhost:3001
```

### Print Server не запускается:

```bash
# Проверьте порт 3001
lsof -i :3001

# Убейте процесс
kill -9 $(lsof -t -i:3001)

# Перезапустите
cd /Users/serik08/Documents/GitHub/shop-qaraa/print-server
npm start
```

---

## 📞 Контакты

Если возникли проблемы, проверьте:
1. Принтер подключен и включен
2. Print Server запущен (`http://localhost:3001/api/health`)
3. Cloudflare Tunnel активен (проверьте `/tmp/cloudflared.log`)
4. URL в React файлах актуален

---

**Автор:** Serik  
**Дата:** 13.10.2025  
**Версия:** 1.0

