FROM node:22-bookworm-slim

WORKDIR /app

# Install system dependencies needed for Prisma, bcrypt, and database healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install npm dependencies
COPY package*.json ./
RUN npm install

# Copy Prisma schema and configuration, then generate the client
COPY prisma ./prisma
COPY prisma.config.ts ./
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN npx prisma generate

# Copy the rest of the application code
COPY . .

# Ensure entrypoint has Linux LF line endings and executable permissions
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["./docker-entrypoint.sh"]
