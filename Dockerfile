FROM node:18-alpine

# Install dependencies needed for scripts and healthchecks
RUN apk add --no-cache netcat-openbsd wget

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy the rest of the application code
COPY . .

# Make scripts executable
RUN chmod +x docker-start.sh wait-for-it.sh

# Create upload directories
RUN mkdir -p uploads/audio

# Expose the port the app will run on
EXPOSE 3000

# Command to run the startup script
CMD ["./docker-start.sh"] 