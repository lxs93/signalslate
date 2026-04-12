# SignalSlate

AI-powered exit ticket tool for K–12 teachers. Turn student responses into teaching insight immediately.

## Setup

### 1. Configure environment variables

Copy `.env.local` and fill in your values:

```
DATABASE_URL="postgresql://user:password@localhost:5432/signalslate"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
OPENAI_API_KEY="sk-..."
```

**Need a database?** Options:
- Local PostgreSQL: `createdb signalslate`
- Free cloud: [Neon](https://neon.tech) — grab the connection string and append `?sslmode=require`

### 2. Run migrations

```bash
npm run db:migrate
# Generates the Prisma client automatically
```

### 3. Load demo data (optional but recommended for first run)

```bash
npm run db:seed
# Creates: demo@signalslate.com / demo1234
# Creates: 2 exit tickets, 20 submissions, 2 pre-built analyses
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Demo flow

1. Log in as `demo@signalslate.com` / `demo1234`
2. Browse the pre-seeded exit tickets and their analyses
3. Open Trends to see recurring misconception themes

Or create your own account and build from scratch:
1. Register → Create an exit ticket (2–4 questions)
2. Copy the student link → open in incognito → submit as 3+ students
3. Return to the ticket → Run Analysis
4. View class summary, misconceptions, students to check in with
5. Visit Trends after running analyses on multiple tickets

## Tech stack

- **Framework**: Next.js 16 (App Router, full-stack)
- **Database**: PostgreSQL via Prisma 7 + `@prisma/adapter-pg`
- **Auth**: next-auth v5 (credentials)
- **UI**: Tailwind CSS + shadcn/ui
- **AI**: OpenAI `gpt-4o-mini` with structured outputs

## Scripts

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run db:migrate   # Run Prisma migrations + generate client
npm run db:push      # Push schema without migration history (rapid prototyping)
npm run db:seed      # Load demo data
npm run db:generate  # Regenerate Prisma client only
```

## Deployment (Vercel + Neon)

1. Push to GitHub
2. Import repo in Vercel
3. Set env vars: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (your Vercel URL), `OPENAI_API_KEY`
4. After first deploy: run `npx prisma migrate deploy` against your Neon DB
5. Optionally run seed: `npm run db:seed` pointed at production DB
