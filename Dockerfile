# Use the latest Playwright Docker image with Node.js v22
# Use the latest Playwright Docker image with Node.js v22
FROM mcr.microsoft.com/playwright:v1.49.0

# Set the working directory
WORKDIR /app

# Install required system dependencies for Playwright
RUN apt-get update && apt-get install -y \
    libxfixes3 \
    libxkbcommon0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js v22
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs

# Verify the installed versions
RUN node -v && npm -v

# Copy package.json and package-lock.json for dependency installation
COPY package*.json ./

# Install application dependencies
RUN npm install --production

# Copy the rest of the application files
COPY . .

# Expose application port
EXPOSE 8080

# Start the application
CMD ["node", "server.js"]
# Set the working directory
WORKDIR /app

# Install required system dependencies for Playwright
RUN apt-get update && apt-get install -y \
    libxfixes3 \
    libxkbcommon0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js v22
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs

# Verify the installed versions
RUN node -v && npm -v

# Copy package.json and package-lock.json for dependency installation
COPY package*.json ./

# Install application dependencies
RUN npm install --production

# Copy the rest of the application files
COPY . .

# Expose application port
EXPOSE 8080

# Start the application
CMD ["node", "server.js"]