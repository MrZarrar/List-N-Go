# Use a Node.js image as the base
FROM node:16

# Install necessary dependencies for Puppeteer (to run Chromium)
RUN apt-get update && apt-get install -y \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libgdk-pixbuf2.0-0 \
  libnspr4 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  wget

# Set the working directory to /app
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Install the app dependencies
RUN npm install

# Copy the rest of the app files into the container
COPY . .

# Expose the port the app will run on
EXPOSE 10000

# Start the application
CMD ["npm", "start"]