#!/bin/bash

echo "🚀 Запуск Print Server + Cloudflare Tunnel..."
echo ""

# Остановка старых процессов
echo "🛑 Остановка старых процессов..."
pkill -f "node server.js" 2>/dev/null
pkill cloudflared 2>/dev/null
sleep 2

# Запуск Print Server
echo "🖨️  Запуск Print Server..."
cd /Users/serik08/Documents/GitHub/shop-qaraa/print-server
npm start > /dev/null 2>&1 &

# Ожидание запуска Print Server
sleep 3

# Проверка Print Server
if curl -s http://localhost:3001/api/health > /dev/null; then
  echo "✅ Print Server запущен на http://localhost:3001"
else
  echo "❌ Ошибка запуска Print Server"
  exit 1
fi

# Запуск Cloudflare Tunnel
echo "🌐 Запуск Cloudflare Tunnel..."
cloudflared tunnel --url http://localhost:3001 > /tmp/cloudflared.log 2>&1 &

# Ожидание запуска туннеля
sleep 7

# Получение публичного URL
TUNNEL_URL=$(grep -i "https://" /tmp/cloudflared.log | grep "trycloudflare.com" | tail -1 | sed 's/.*|  //' | sed 's/ .*//' | tr -d '\n\r')

if [ -z "$TUNNEL_URL" ]; then
  echo "❌ Не удалось получить URL туннеля. Проверьте /tmp/cloudflared.log"
  exit 1
fi

echo "✅ Cloudflare Tunnel запущен"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Публичный URL для печати:"
echo "   $TUNNEL_URL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Обновите PRINT_SERVER_URL в файлах React:"
echo "   - src/pages/NewSale.jsx"
echo "   - src/pages/SalesHistory.jsx"
echo "   - src/pages/AnalitikaHistory.jsx"
echo "   - src/pages/AdminPanel.js"
echo ""
echo "Замените на: const PRINT_SERVER_URL = '${TUNNEL_URL}/api/print';"
echo ""
echo "🔄 Для перезапуска: ./start.sh"
echo "🛑 Для остановки: pkill cloudflared && pkill -f 'node server.js'"
echo ""

