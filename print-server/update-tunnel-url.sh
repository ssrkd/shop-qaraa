#!/bin/bash

# 🔄 Скрипт автоматического обновления Cloudflare Tunnel URL во всех React файлах

# Ждем 5 секунд чтобы tunnel запустился
sleep 5

# Получаем новый URL из логов
NEW_URL=$(grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" /tmp/cloudflared.log | tail -1)

if [ -z "$NEW_URL" ]; then
  echo "❌ Не удалось получить URL из логов"
  exit 1
fi

echo "🔗 Новый URL: $NEW_URL"

# Путь к React файлам
PROJECT_DIR="/Users/serik08/Documents/GitHub/shop-qaraa"

# Файлы для обновления
FILES=(
  "$PROJECT_DIR/src/pages/NewSale.jsx"
  "$PROJECT_DIR/src/pages/SalesHistory.jsx"
  "$PROJECT_DIR/src/pages/AnalitikaHistory.jsx"
  "$PROJECT_DIR/src/pages/AdminPanel.js"
)

# Обновляем URL в каждом файле
for FILE in "${FILES[@]}"; do
  if [ -f "$FILE" ]; then
    # Заменяем старый URL на новый
    sed -i '' "s|https://[a-z0-9-]*\.trycloudflare\.com|$NEW_URL|g" "$FILE"
    echo "✅ Обновлен: $(basename $FILE)"
  else
    echo "⚠️  Не найден: $FILE"
  fi
done

echo "🎉 URL обновлен во всех файлах!"
echo "📋 Новый URL: $NEW_URL/api/print"

