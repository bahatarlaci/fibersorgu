require('dotenv').config();
const https = require('https');
const url = require('url');

// Telegram Bot Ayarları (environment variables'dan okunacak)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
let FLAT_ID = process.env.FLAT_ID || '19293439'; // Varsayılan
const CHECK_INTERVAL = parseInt(process.env.CHECK_INTERVAL) || 3600000; // 1 saat (ms)

// Aktif sorgulamalar için Map
const activeChecks = new Map();
let lastUpdateId = 0;

// Doğrulama
if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN === 'your_bot_token_here') {
    console.error('❌ TELEGRAM_BOT_TOKEN tanımlanmamış! .env dosyasını kontrol edin.');
    process.exit(1);
}

if (!TELEGRAM_CHAT_ID || TELEGRAM_CHAT_ID === 'your_chat_id_here') {
    console.error('❌ TELEGRAM_CHAT_ID tanımlanmamış! .env dosyasını kontrol edin.');
    process.exit(1);
}

// HTML yanıtını JSON'a dönüştüren fonksiyon
function parseHtmlToJson(html) {
    const result = {
        internetBaglantiSilgileri: {},
        genelBilgiler: {}
    };
    
    // Boş Port
    const bosPortMatch = html.match(/<td>Boş Port<\/td>\s*<td>(.*?)<\/td>/i);
    if (bosPortMatch) result.internetBaglantiSilgileri.bosPort = bosPortMatch[1];
    
    // Port Max Hızı
    const portHizMatch = html.match(/<td>Port Max Hızı<\/td>\s*<td>(.*?)<\/td>/i);
    if (portHizMatch) result.internetBaglantiSilgileri.portMaxHizi = portHizMatch[1];
    
    // BBK Kodu
    const bbkMatch = html.match(/<td>BBK Kodu<\/td>\s*<td[^>]*>(.*?)<\/td>/i);
    if (bbkMatch) result.genelBilgiler.bbkKodu = bbkMatch[1];
    
    // Müdürlük Adı
    const mudurlukMatch = html.match(/<td>Müdürlük Adı<\/td><td>(.*?)<\/td>/i);
    if (mudurlukMatch) result.genelBilgiler.mudurlukAdi = mudurlukMatch[1];
    
    // Santral Adı
    const santralMatch = html.match(/<td>Santral Adı<\/td><td>(.*?)<\/td>/i);
    if (santralMatch) result.genelBilgiler.santralAdi = santralMatch[1];
    
    // FTTX Türü
    const fttxMatch = html.match(/<td>FTTX Türü<\/td><td>(.*?)<\/td>/i);
    if (fttxMatch) result.genelBilgiler.fttxTuru = fttxMatch[1];
    
    // İş Emri
    const isEmriMatch = html.match(/<td>İş Emri<\/td><td>(.*?)<\/td>/i);
    if (isEmriMatch) result.genelBilgiler.isEmri = isEmriMatch[1];
    
    console.log('✅ Parse sonucu:', JSON.stringify(result, null, 2));
    
    return result;
}

// Fiber detay sorgulama
function getFiberDetail(flatId) {
    return new Promise((resolve, reject) => {
        const requestUrl = `https://tpc.net.tr/altyapi-sorgulama/checkDetail.php?flat=${flatId}`;
        const parsedUrl = new url.URL(requestUrl);
        
        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                'Referer': 'https://tpc.net.tr/'
            }
        };
        
        https.get(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode === 200) {
                    const jsonData = parseHtmlToJson(data);
                    resolve(jsonData);
                } else {
                    reject(new Error(`HTTP Error: ${res.statusCode}`));
                }
            });
        }).on('error', (error) => {
            reject(error);
        });
    });
}

// Telegram'a mesaj gönder
function sendTelegramMessage(message) {
    return new Promise((resolve, reject) => {
        // Mesajı temizle ve kontrol et
        const cleanMessage = message.trim();
        
        if (!cleanMessage) {
            reject(new Error('Mesaj boş!'));
            return;
        }
        
        console.log('📤 Gönderilen mesaj uzunluğu:', cleanMessage.length);
        
        const data = JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: cleanMessage,
            parse_mode: 'Markdown'
        });
        
        const options = {
            hostname: 'api.telegram.org',
            path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };
        
        const req = https.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(responseData));
                } else {
                    reject(new Error(`Telegram API Error: ${res.statusCode} - ${responseData}`));
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.write(data);
        req.end();
    });
}

// Telegram mesajlarını al (polling)
function getUpdates(offset = 0) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.telegram.org',
            path: `/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${offset}&timeout=30`,
            method: 'GET'
        };
        
        https.get(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

// Komutları işle
async function handleCommand(message) {
    const text = message.text;
    const chatId = message.chat.id;
    
    if (chatId.toString() !== TELEGRAM_CHAT_ID.toString()) {
        return; // Sadece kayıtlı chat ID'den komut kabul et
    }
    
    // /start komutu
    if (text === '/start') {
        await sendTelegramMessage(
            `👋 *Fiber Altyapı Sorgulama Botu*\n\n` +
            `Komutlar:\n` +
            `• /start - Bu mesajı göster\n` +
            `• /check <bbk_kodu> - Tek seferlik sorgulama\n` +
            `• /watch <bbk_kodu> - Otomatik saat başı sorgulama başlat\n` +
            `• /stop - Otomatik sorgulamayı durdur\n` +
            `• /status - Mevcut durumu göster\n\n` +
            `Örnek: /check 19293439`
        );
    }
    
    // /check <bbk_kodu> - Tek seferlik sorgulama
    else if (text.startsWith('/check ')) {
        const flatId = text.split(' ')[1];
        if (!flatId || !/^\d+$/.test(flatId)) {
            await sendTelegramMessage('❌ Geçersiz BBK kodu! Sadece rakam kullanın.\nÖrnek: /check 19293439');
            return;
        }
        await sendTelegramMessage(`🔍 BBK Kodu ${flatId} sorgulanıyor...`);
        await checkAndNotify(flatId);
    }
    
    // /watch <bbk_kodu> - Otomatik sorgulama başlat
    else if (text.startsWith('/watch ')) {
        const flatId = text.split(' ')[1];
        if (!flatId || !/^\d+$/.test(flatId)) {
            await sendTelegramMessage('❌ Geçersiz BBK kodu! Sadece rakam kullanın.\nÖrnek: /watch 19293439');
            return;
        }
        
        // Eski sorgulamayı durdur
        if (activeChecks.has('default')) {
            clearInterval(activeChecks.get('default'));
        }
        
        FLAT_ID = flatId;
        await sendTelegramMessage(
            `✅ Otomatik sorgulama başlatıldı!\n\n` +
            `📊 BBK Kodu: ${flatId}\n` +
            `⏰ Aralık: ${CHECK_INTERVAL / 60000} dakika\n\n` +
            `İlk sorgulama yapılıyor...`
        );
        
        // İlk sorgulamayı yap
        await checkAndNotify(flatId);
        
        // Periyodik sorgulama başlat
        const intervalId = setInterval(() => checkAndNotify(flatId), CHECK_INTERVAL);
        activeChecks.set('default', intervalId);
    }
    
    // /stop - Otomatik sorgulamayı durdur
    else if (text === '/stop') {
        if (activeChecks.has('default')) {
            clearInterval(activeChecks.get('default'));
            activeChecks.delete('default');
            await sendTelegramMessage('⏸️ Otomatik sorgulama durduruldu.');
        } else {
            await sendTelegramMessage('⚠️ Zaten çalışan bir sorgulama yok.');
        }
    }
    
    // /status - Durum kontrolü
    else if (text === '/status') {
        const isActive = activeChecks.has('default');
        await sendTelegramMessage(
            `📊 *Bot Durumu*\n\n` +
            `Durum: ${isActive ? '✅ Aktif' : '⏸️ Pasif'}\n` +
            `BBK Kodu: ${FLAT_ID}\n` +
            `Aralık: ${CHECK_INTERVAL / 60000} dakika\n` +
            `Chat ID: ${TELEGRAM_CHAT_ID}`
        );
    }
}

// Mesajları sürekli dinle
async function pollMessages() {
    console.log('👂 Mesajlar dinleniyor...');
    
    while (true) {
        try {
            const response = await getUpdates(lastUpdateId + 1);
            
            if (response.ok && response.result.length > 0) {
                for (const update of response.result) {
                    lastUpdateId = update.update_id;
                    
                    if (update.message && update.message.text) {
                        console.log(`📥 Komut alındı: ${update.message.text}`);
                        await handleCommand(update.message);
                    }
                }
            }
        } catch (error) {
            console.error('Polling hatası:', error.message);
            await new Promise(resolve => setTimeout(resolve, 5000)); // 5 saniye bekle
        }
    }
}

// Sonuçları formatla ve Telegram'a gönder
async function checkAndNotify(flatId = FLAT_ID) {
    const now = new Date().toLocaleString('tr-TR', { 
        timeZone: 'Europe/Istanbul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    console.log(`[${now}] Fiber sorgulama başlatıldı...`);
    
    try {
        const result = await getFiberDetail(FLAT_ID);
        
        // Telegram mesajını formatla (Markdown)
        const message = `
🌐 *Fiber Altyapı Sorgulama*
📅 Tarih: ${now}

📡 *İnternet Bağlantı Bilgileri*
• Boş Port: *${result.internetBaglantiSilgileri.bosPort || '-'}*
• Port Max Hızı: *${result.internetBaglantiSilgileri.portMaxHizi || '-'}*

📋 *Genel Bilgiler*
• BBK Kodu: \`${result.genelBilgiler.bbkKodu || '-'}\`
• Müdürlük: ${result.genelBilgiler.mudurlukAdi || '-'}
• Santral: ${result.genelBilgiler.santralAdi || '-'}
• FTTX Türü: ${result.genelBilgiler.fttxTuru || '-'}
• İş Emri: ${result.genelBilgiler.isEmri || '-'}

${result.internetBaglantiSilgileri.bosPort === 'VAR' ? '✅ Boş port mevcut!' : '⚠️ Boş port yok'}
        `.trim();
        
        await sendTelegramMessage(message);
        console.log(`[${now}] ✅ Telegram bildirimi gönderildi`);
        
    } catch (error) {
        console.error(`[${now}] ❌ Hata:`, error.message);
        
        // Hata durumunda da bildir
        try {
            await sendTelegramMessage(`❌ Fiber sorgulama hatası!\n\nTarih: ${now}\nHata: ${error.message}`);
        } catch (telegramError) {
            console.error('Telegram bildirimi gönderilemedi:', telegramError.message);
        }
    }
}

// Bot başlat
console.log('🚀 Telegram Bot başlatıldı');
console.log(`� Chat ID: ${TELEGRAM_CHAT_ID}`);
console.log(`⏰ Kontrol aralığı: ${CHECK_INTERVAL / 60000} dakika`);
console.log('� Komutlar için /start gönderin');
console.log('---');

// Hoş geldin mesajı gönder
sendTelegramMessage(
    `🤖 *Bot başlatıldı!*\n\n` +
    `Komutlar için /start gönderin.\n` +
    `Hızlı başlangıç: /watch ${FLAT_ID}`
).catch(e => console.error('Başlangıç mesajı gönderilemedi:', e.message));

// Mesaj dinlemeyi başlat
pollMessages();

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM alındı, kapatılıyor...');
    activeChecks.forEach(intervalId => clearInterval(intervalId));
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT alındı, kapatılıyor...');
    activeChecks.forEach(intervalId => clearInterval(intervalId));
    process.exit(0);
});
