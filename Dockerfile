# Menggunakan image Node.js versi terbaru sebagai base image
FROM node:18-slim

# Set working directory di dalam container
WORKDIR /app

# Menyalin package.json dan package-lock.json ke dalam container
COPY package*.json ./

# Instal dependensi aplikasi
RUN npm install

# Menyalin seluruh aplikasi ke dalam container
COPY . .

# Membuka port 8080 yang digunakan oleh aplikasi
EXPOSE 8080

# Menjalankan aplikasi saat container dimulai
CMD ["npm", "start"]
