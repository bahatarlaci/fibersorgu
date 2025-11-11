# Node.js resmi imajını kullan
FROM node:20-alpine

# Çalışma dizinini oluştur
WORKDIR /app

# Package dosyalarını kopyala
COPY package*.json ./

# Bağımlılıkları yükle
RUN npm install --production

# Uygulama dosyalarını kopyala
COPY . .

# Port'u expose et
EXPOSE 3000

# Sağlık kontrolü
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Uygulamayı başlat
CMD ["npm", "start"]
