# 🌐 Fiber Altyapı Sorgulama

TPC fiber altyapı bilgilerini sorgulayan web uygulaması ve otomatik Telegram bildirimleri.

## 🚀 Özellikler

- 📊 Web arayüzü ile anlık sorgulama
- 📱 Telegram bot ile otomatik saatlik bildirimler
- 🐳 Docker ile kolay deployment
- ✅ Coolify uyumlu

## 📦 Kurulum

### Coolify'da Deploy (Önerilen)

1. Coolify'da **New Resource** → **Docker Compose**
2. Git repository: `https://github.com/bahatarlaci/fibersorgu.git`
3. Environment Variables ekleyin:
   ```env
   TELEGRAM_BOT_TOKEN=your_bot_token
   TELEGRAM_CHAT_ID=your_chat_id
   FLAT_ID=19293439
   CHECK_INTERVAL=3600000
   ```
4. Deploy!

### Telegram Bot Token Alma

1. [@BotFather](https://t.me/BotFather) ile konuşun
2. `/newbot` komutuyla bot oluşturun
3. Token'ı kopyalayın

### Chat ID Alma

1. [@userinfobot](https://t.me/userinfobot) ile konuşun
2. Size verilen ID'yi kopyalayın

## 🔧 Environment Variables

| Variable | Açıklama | Örnek |
|----------|----------|-------|
| `TELEGRAM_BOT_TOKEN` | Telegram bot token | `123456:ABC-DEF...` |
| `TELEGRAM_CHAT_ID` | Telegram chat ID | `123456789` |
| `FLAT_ID` | Sorgulanacak flat ID | `19293439` |
| `CHECK_INTERVAL` | Kontrol aralığı (ms) | `3600000` (1 saat) |

## 🏃 Local'de Çalıştırma

```bash
# Bağımlılıkları yükle
npm install

# .env dosyası oluştur
cp .env.example .env
# .env dosyasını düzenle

# Web sunucusu
npm start

# Telegram bot
node telegram-bot.js
```

## 📊 Servisler

- **Web UI**: Port 3000 - Anlık sorgulama arayüzü
- **Telegram Bot**: Arka planda çalışır, saatlik bildirim gönderir

## 📝 Lisans

MIT
