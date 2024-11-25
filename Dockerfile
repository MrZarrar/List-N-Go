# Use an official Node.js image as the base image
FROM node:18-slim

# Install dependencies including Chromium, fonts, and other necessary libraries
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libnspr4 \
    libnss3 \
    lsb-release \
    xdg-utils \
    wget \
    ca-certificates \
    curl \
    unzip \
    git \
    vim \
    libx11-dev \
    libxcomposite1 \
    libxrandr2 \
    libgtk-3-0 \
    libgbm1 \
    libnotify4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libx11-xcb1 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libpango-1.0-0 \
    libepoxy0 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables for Puppeteer
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV CHROME_BIN=/usr/bin/chromium

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install app dependencies (including Puppeteer and others)
RUN npm install

# Copy the rest of the app's code into the container
COPY . .

# Expose the port that the app will run on
EXPOSE 8080

# Set the entrypoint to start the server
CMD ["npm", "start"]