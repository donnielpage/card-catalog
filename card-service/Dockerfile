FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Create data directory for SQLite
RUN mkdir -p data

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S cardservice -u 1001
RUN chown -R cardservice:nodejs /app
USER cardservice

EXPOSE 3006

CMD ["npm", "start"]