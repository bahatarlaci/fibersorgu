require('dotenv').config();
const https = require('https');
const url = require('url');

// Telegram Bot Ayarları (environment variables'dan okunacak)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const FLAT_ID = process.env.FLAT_ID || '19293439';
const CHECK_INTERVAL = parseInt(process.env.CHECK_INTERVAL) || 3600000; // 1 saat (ms)

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
    
    const bosPortMatch = html.match(/<td>Boş Port<\/td>\s*<td>(.*?)<\/td>/);
    if (bosPortMatch) result.internetBaglantiSilgileri.bosPort = bosPortMatch[1];
    
    const portHizMatch = html.match(/<td>Port Max Hızı<\/td>\s*<td>(.*?)<\/td>/);
    if (portHizMatch) result.internetBaglantiSilgileri.portMaxHizi = portHizMatch[1];
    
    const bbkMatch = html.match(/<td>BBK Kodu<\/td>\s*<td[^>]*>(.*?)<\/td>/);
    if (bbkMatch) result.genelBilgiler.bbkKodu = bbkMatch[1];
    
    const mudurlukMatch = html.match(/<td>Müdürlük Adı<\/td><td>(.*?)<\/td>/);
    if (mudurlukMatch) result.genelBilgiler.mudurlukAdi = mudurlukMatch[1];
    
    const santralMatch = html.match(/<td>Santral Adı<\/td><td>(.*?)<\/td>/);
    if (santralMatch) result.genelBilgiler.santralAdi = santralMatch[1];
    
    const fttxMatch = html.match(/<td>FTTX Türü<\/td><td>(.*?)<\/td>/);
    if (fttxMatch) result.genelBilgiler.fttxTuru = fttxMatch[1];
    
    const isEmriMatch = html.match(/<td>İş Emri<\/td><td>(.*?)<\/td>/);
    if (isEmriMatch) result.genelBilgiler.isEmri = isEmriMatch[1];
    
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

// Sonuçları formatla ve Telegram'a gönder
async function checkAndNotify() {
    const now = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
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

// İlk çalıştırmayı yap
console.log('🚀 Telegram Bot başlatıldı');
console.log(`📊 Flat ID: ${FLAT_ID}`);
console.log(`⏰ Kontrol aralığı: ${CHECK_INTERVAL / 60000} dakika`);
console.log(`📱 Chat ID: ${TELEGRAM_CHAT_ID}`);
console.log('---');

// Hemen bir sorgulama yap
checkAndNotify();

// Her saat başı sorgulama yap
setInterval(checkAndNotify, CHECK_INTERVAL);

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM alındı, kapatılıyor...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT alındı, kapatılıyor...');
    process.exit(0);
});
