FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

# Add health check endpoint
RUN echo 'app.get("/api/health", (req, res) => res.json({ status: "ok" }));' >> server/routes.ts

# Expose port
EXPOSE 8080

# Start the application
CMD ["npm", "start"]