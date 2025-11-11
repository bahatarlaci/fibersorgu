# 🤖 Fiber Altyapı Sorgulama Telegram Botu

TPC fiber altyapı bilgilerini otomatik sorgulayan ve Telegram üzerinden bildirim gönderen akıllı bot.

## ✨ Özellikler

- � Telegram komutları ile kolay kullanım
- 🔄 Otomatik saatlik sorgulama
- 🎯 İstediğiniz BBK kodunu dinamik olarak sorgulama
- ⏰ Özelleştirilebilir kontrol aralığı
- 📊 Detaylı fiber altyapı bilgileri
- � Coolify ile kolay deployment

## 🎮 Komutlar

| Komut | Açıklama |
|-------|----------|
| `/start` | Yardım menüsünü göster |
| `/check <bbk_kodu>` | Tek seferlik sorgulama yap |
| `/watch <bbk_kodu>` | Otomatik saatlik sorgulama başlat |
| `/stop` | Otomatik sorgulamayı durdur |
| `/status` | Bot durumunu göster |

### Kullanım Örnekleri

```
/check 19293439
/watch 19293439
/stop
/status
```

## � Hızlı Başlangıç

### 1. Telegram Bot Oluşturma

1. [@BotFather](https://t.me/BotFather) ile konuşun
2. `/newbot` komutu ile yeni bot oluşturun
3. Bot token'ınızı kaydedin

### 2. Chat ID Alma

1. [@userinfobot](https://t.me/userinfobot) ile konuşun
2. Size verilen ID'yi kaydedin

### 3. Coolify'da Deployment

1. Coolify'da **New Resource** → **Docker Compose**
2. Git repository: `https://github.com/bahatarlaci/fibersorgu.git`
3. Environment Variables:
   ```env
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   TELEGRAM_CHAT_ID=your_chat_id_here
   FLAT_ID=19293439
   CHECK_INTERVAL=3600000
   ```
4. **Deploy** butonuna tıklayın!

### 4. Botu Başlatın

Telegram'da botunuza `/start` gönderin ve kullanmaya başlayın!

## ⚙️ Environment Variables

| Değişken | Açıklama | Varsayılan |
|----------|----------|------------|
| `TELEGRAM_BOT_TOKEN` | BotFather'dan alınan token | - |
| `TELEGRAM_CHAT_ID` | Telegram kullanıcı ID'si | - |
| `FLAT_ID` | Başlangıç BBK kodu (opsiyonel) | `19293439` |
| `CHECK_INTERVAL` | Kontrol aralığı (milisaniye) | `3600000` (1 saat) |

### Kontrol Aralığı Örnekleri

| Süre | Milisaniye Değeri |
|------|-------------------|
| 15 dakika | `900000` |
| 30 dakika | `1800000` |
| 1 saat | `3600000` |
| 2 saat | `7200000` |
| 6 saat | `21600000` |

## 📊 Bildirim İçeriği

Bot her sorgulama sonrası size şu bilgileri gönderir:

- 📅 Sorgulama tarihi ve saati
- 📡 Boş port durumu (VAR/YOK)
- 🚀 Port maksimum hızı
- 🏢 BBK kodu
- 📍 Müdürlük ve santral adı
- 🔌 FTTX türü (FTTH/FTTC)
- 📋 İş emri durumu

## 🏃 Local'de Çalıştırma

```bash
# Repoyu klonla
git clone https://github.com/bahatarlaci/fibersorgu.git
cd fibersorgu

# Bağımlılıkları yükle
npm install

# .env dosyası oluştur
cp .env.example .env
# .env dosyasını düzenle

# Botu başlat
npm start
```

## 🐳 Docker ile Çalıştırma

```bash
# Docker Compose ile
docker-compose up -d

# Logları görüntüle
docker-compose logs -f

# Durdur
docker-compose down
```

## � İpuçları

- İlk kurulumda `/watch` komutu ile otomatik sorgulamayı başlatın
- Farklı BBK kodlarını `/check` ile test edin
- `/status` ile bot durumunu kontrol edin
- Sorgulamayı durdurmak için `/stop` kullanın

## 🔒 Güvenlik

- `.env` dosyasını asla Git'e commit etmeyin
- Bot token'ınızı kimseyle paylaşmayın
- Sadece kendi Telegram hesabınızla bot'u kullanın

## 📝 Lisans

MIT