#!/bin/bash

# 🗑️ Скрипт удаления автозапуска Print-Server

echo "🗑️  Удаление автозапуска Print-Server..."

PLIST_PATH="$HOME/Library/LaunchAgents/com.qaraa.printserver.plist"

if [ -f "$PLIST_PATH" ]; then
    launchctl unload "$PLIST_PATH" 2>/dev/null
    rm "$PLIST_PATH"
    echo "✅ Автозапуск удален!"
else
    echo "⚠️  Автозапуск не был установлен"
fi

