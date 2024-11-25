FROM mcr.microsoft.com/playwright:focals

WORKDIR /app

# Install required dependenciess
RUN apt-get update && apt-get install -y \
    libxfixes3 \
    libxkbcommon0 \
    && rm -rf /var/lib/apt/lists/*

# Install node dependencies
COPY package*.json ./
RUN npm install --production

# Copy the rest of the application code
COPY . .

CMD ["node", "server.js"]

#retry
#nothing