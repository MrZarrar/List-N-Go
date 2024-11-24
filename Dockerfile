# Use a Node.js base image with Puppeteer dependencies
FROM node:18

# Install dependencies needed for Puppeteer
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libcups2 \
    libnss3 \
    libxss1 \
    lsb-release \
    xdg-utils \
    --no-install-recommends && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the entire application code
COPY . .

# Expose the port (replace with your app's port)
EXPOSE 8080

# Start the app
CMD ["node", "server.js"]