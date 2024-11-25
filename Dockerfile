# Use the official Node.js 18 slim image
FROM node:18-slim

# Install Playwright dependencies
RUN apt-get update && apt-get install -y \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libxcomposite1 \
    libxrandr2 \
    libxdamage1 \
    libgbm1 \
    libpango-1.0-0 \
    libasound2 \
    libx11-xcb1 \
    libxcb-dri3-0 \
    libxshmfence1 \
    libegl1 \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --production && npx playwright install chromium

# Copy the rest of the application code
COPY . .

# Expose the port for the app
EXPOSE 8080

# Command to run the application
CMD ["node", "server.js"]