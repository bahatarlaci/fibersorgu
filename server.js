const express = require('express');
const https = require('https');
const url = require('url');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// HTML yanıtını JSON'a dönüştüren fonksiyon
function parseHtmlToJson(html) {
    const result = {
        internetBaglantiSilgileri: {},
        genelBilgiler: {}
    };
    
    // Boş Port
    const bosPortMatch = html.match(/<td>Boş Port<\/td>\s*<td>(.*?)<\/td>/);
    if (bosPortMatch) result.internetBaglantiSilgileri.bosPort = bosPortMatch[1];
    
    // Port Max Hızı
    const portHizMatch = html.match(/<td>Port Max Hızı<\/td>\s*<td>(.*?)<\/td>/);
    if (portHizMatch) result.internetBaglantiSilgileri.portMaxHizi = portHizMatch[1];
    
    // BBK Kodu
    const bbkMatch = html.match(/<td>BBK Kodu<\/td>\s*<td[^>]*>(.*?)<\/td>/);
    if (bbkMatch) result.genelBilgiler.bbkKodu = bbkMatch[1];
    
    // Müdürlük Adı
    const mudurlukMatch = html.match(/<td>Müdürlük Adı<\/td><td>(.*?)<\/td>/);
    if (mudurlukMatch) result.genelBilgiler.mudurlukAdi = mudurlukMatch[1];
    
    // Santral Adı
    const santralMatch = html.match(/<td>Santral Adı<\/td><td>(.*?)<\/td>/);
    if (santralMatch) result.genelBilgiler.santralAdi = santralMatch[1];
    
    // FTTX Türü
    const fttxMatch = html.match(/<td>FTTX Türü<\/td><td>(.*?)<\/td>/);
    if (fttxMatch) result.genelBilgiler.fttxTuru = fttxMatch[1];
    
    // İş Emri
    const isEmriMatch = html.match(/<td>İş Emri<\/td><td>(.*?)<\/td>/);
    if (isEmriMatch) result.genelBilgiler.isEmri = isEmriMatch[1];
    
    return result;
}

// Fiber detay sorgulama fonksiyonu
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

// API endpoint
app.get('/api/check/:flatId', async (req, res) => {
    try {
        const flatId = req.params.flatId;
        
        if (!flatId || !/^\d+$/.test(flatId)) {
            return res.status(400).json({ 
                error: 'Geçerli bir flat ID giriniz (sadece rakam)' 
            });
        }
        
        const result = await getFiberDetail(flatId);
        res.json({
            success: true,
            data: result,
            flatId: flatId,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Ana sayfa
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Server başlat
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server çalışıyor: http://localhost:${PORT}`);
    console.log(`📊 API endpoint: http://localhost:${PORT}/api/check/:flatId`);
});
