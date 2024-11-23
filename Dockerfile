# Use a Node.js image as the base
FROM node:16

# Install necessary dependencies for Puppeteer (to run Chromium)
RUN apt-get update && apt-get install -y \
  wget \
  gnupg \
  ca-certificates \
  libgconf-2-4 \
  libgtk2.0-0 \
  libnss3 \
  libxss1 \
  --no-install-recommends && \
  rm -rf /var/lib/apt/lists/*


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
EXPOSE 3000

# Start the application
CMD ["npm", "start"]