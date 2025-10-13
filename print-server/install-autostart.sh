#!/bin/bash

# 🚀 Скрипт установки автозапуска Print-Server + Cloudflare Tunnel

echo "📦 Установка автозапуска Print-Server..."

# Путь к plist файлу
PLIST_PATH="$HOME/Library/LaunchAgents/com.qaraa.printserver.plist"

# Создаем plist файл
cat > "$PLIST_PATH" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.qaraa.printserver</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>/Users/serik08/Documents/GitHub/shop-qaraa/print-server/start-tunnel.sh</string>
    </array>
    
    <key>RunAtLoad</key>
    <true/>
    
    <key>KeepAlive</key>
    <true/>
    
    <key>StandardOutPath</key>
    <string>/tmp/print-server-startup.log</string>
    
    <key>StandardErrorPath</key>
    <string>/tmp/print-server-startup-error.log</string>
    
    <key>WorkingDirectory</key>
    <string>/Users/serik08/Documents/GitHub/shop-qaraa/print-server</string>
</dict>
</plist>
EOF

# Даем права на исполнение
chmod +x /Users/serik08/Documents/GitHub/shop-qaraa/print-server/start-tunnel.sh

# Загружаем службу
launchctl unload "$PLIST_PATH" 2>/dev/null
launchctl load "$PLIST_PATH"

echo "✅ Автозапуск установлен!"
echo "📝 Print-Server будет автоматически запускаться при старте Mac"
echo ""
echo "Команды управления:"
echo "  Остановить: launchctl unload ~/Library/LaunchAgents/com.qaraa.printserver.plist"
echo "  Запустить:  launchctl load ~/Library/LaunchAgents/com.qaraa.printserver.plist"
echo "  Статус:     launchctl list | grep qaraa"
echo ""
echo "Логи:"
echo "  Вывод:  tail -f /tmp/print-server-startup.log"
echo "  Ошибки: tail -f /tmp/print-server-startup-error.log"

