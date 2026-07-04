# Deployment Guide

The Thai Energy Planner is a Next.js application that can be deployed via Docker or directly on Node.js.

## Prerequisites
- Node.js >= 20.11.0
- PostgreSQL >= 15

## Option 1: Vercel / Cloudflare Pages (Recommended for Frontend)
1. Link your Git repository to Vercel.
2. Set the build command to: `npm run build`
3. Add the `DATABASE_URL` environment variable.
4. Note: If deploying serverless, ensure your database allows external connections or use connection pooling (e.g., PgBouncer / Prisma Accelerate).

## Option 2: Docker Compose (Self-Hosted)
A `docker-compose.yml` file is provided at the root of the project.

```bash
# 1. Start the database
docker-compose up -d db

# 2. Copy env file and update credentials
cp .env.example .env

# 3. Apply database migrations
npm run prisma:migrate

# 4. Start the application
docker-compose up -d app
```

## Option 3: Node.js (Bare Metal / VM)
```bash
# 1. Install dependencies
npm install

# 2. Apply database migrations
npm run prisma:migrate

# 3. Build the application
npm run build

# 4. Start the production server
npm --workspace @thai-energy-planner/web run start
```
