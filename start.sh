#!/bin/sh

# Her iki servisi de arka planda başlat
echo "🚀 Web sunucusu başlatılıyor..."
node server.js &

echo "📱 Telegram bot başlatılıyor..."
node telegram-bot.js &

# Tüm process'leri bekle
wait
