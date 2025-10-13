#!/bin/bash

# 🚀 Автозапуск Print Server + Cloudflare Tunnel
# Этот скрипт запускает print server и cloudflare tunnel автоматически

echo "🖨️  Запуск Print Server + Cloudflare Tunnel..."

# 1️⃣ Останавливаем существующие процессы
echo "🔄 Останавливаем старые процессы..."
pkill -f "node server.js"
pkill -f "cloudflared tunnel"
sleep 2

# 2️⃣ Переходим в директорию print-server
cd /Users/serik08/Documents/GitHub/shop-qaraa/print-server || exit 1

# 3️⃣ Запускаем Print Server в фоне
echo "🖨️  Запуск Print Server..."
npm start > /tmp/print-server.log 2>&1 &
PRINT_SERVER_PID=$!
sleep 3

# 4️⃣ Запускаем Cloudflare Tunnel в фоне
echo "☁️  Запуск Cloudflare Tunnel..."
cloudflared tunnel --url http://localhost:3001 > /tmp/cloudflared.log 2>&1 &
TUNNEL_PID=$!
sleep 5

# 5️⃣ Извлекаем URL из лога
echo "🔍 Получаем URL туннеля..."
for i in {1..10}; do
  TUNNEL_URL=$(grep -o 'https://[a-zA-Z0-9.-]*\.trycloudflare\.com' /tmp/cloudflared.log | head -1)
  if [ -n "$TUNNEL_URL" ]; then
    break
  fi
  echo "⏳ Ждём URL туннеля... попытка $i/10"
  sleep 2
done

if [ -z "$TUNNEL_URL" ]; then
  echo "❌ Не удалось получить URL туннеля!"
  echo "📋 Лог cloudflared:"
  cat /tmp/cloudflared.log
  exit 1
fi

echo "✅ URL туннеля: $TUNNEL_URL"

# 6️⃣ Обновляем README_SETUP.md
echo "📝 Обновляем README_SETUP.md..."
README_FILE="/Users/serik08/Documents/GitHub/shop-qaraa/print-server/README_SETUP.md"

# Создаём временный файл с новым URL
sed "s|https://[a-zA-Z0-9.-]*\.trycloudflare\.com|$TUNNEL_URL|g" "$README_FILE" > "${README_FILE}.tmp"
mv "${README_FILE}.tmp" "$README_FILE"

# 7️⃣ Обновляем React файлы
echo "📝 Обновляем React файлы..."
PROJECT_DIR="/Users/serik08/Documents/GitHub/shop-qaraa"

# Файлы для обновления
REACT_FILES=(
  "$PROJECT_DIR/src/pages/NewSale.jsx"
  "$PROJECT_DIR/src/pages/SalesHistory.jsx"
  "$PROJECT_DIR/src/pages/AnalitikaHistory.jsx"
  "$PROJECT_DIR/src/pages/AdminPanel.js"
)

# Обновляем URL в каждом файле
for FILE in "${REACT_FILES[@]}"; do
  if [ -f "$FILE" ]; then
    sed -i '' "s|https://[a-z0-9-]*\.trycloudflare\.com|$TUNNEL_URL|g" "$FILE"
    echo "✅ Обновлен: $(basename $FILE)"
  fi
done

echo ""
echo "======================================"
echo "✅ PRINT SERVER + TUNNEL ЗАПУЩЕНЫ!"
echo "======================================"
echo "🖨️  Print Server:  http://localhost:3001"
echo "☁️  Cloudflare URL: $TUNNEL_URL"
echo ""
echo "📄 Логи:"
echo "   Print Server: /tmp/print-server.log"
echo "   Cloudflared:  /tmp/cloudflared.log"
echo ""
echo "🔗 URL автоматически обновлён в README и React файлах"
echo ""
echo "⚠️  ВАЖНО: Этот терминал должен оставаться открытым!"
echo "          Для остановки нажмите Ctrl+C"
echo "======================================"
echo ""

# Ждём завершения процессов
wait $PRINT_SERVER_PID $TUNNEL_PID

