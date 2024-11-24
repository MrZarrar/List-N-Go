# Use a Node.js base image
FROM node:20-slim

# Install necessary dependencies for Puppeteer
RUN apt-get update && apt-get install -y \
    dumb-init \
    ca-certificates \
    fonts-liberation \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxrandr2 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    xdg-utils \
    libpangocairo-1.0-0 \
    libnss3 \
    libglib2.0-0 \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies (including Puppeteer)
RUN npm install

# Copy the rest of your application code
COPY . .

# Expose the app on port 8080
EXPOSE 8080

# Start the app
CMD ["dumb-init", "node", "server.js"]