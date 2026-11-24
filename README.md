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

**Database**
- Local PostgreSQL: `createdb signalslate`

### 2. Run migrations

```bash
npm run db:migrate
# Generates the Prisma client automatically
```

### 3. Load demo data (optional but recommended for first run)

```bash
npm run db:seed
# Creates: demo@signalslate.com / demo1234
# Creates: Periods 2, 3, 5 (class codes DEMO42, DEMO43, DEMO45), 32 students
# Creates: 11 exit tickets (ELA, Math, Science), 109 submissions, 10 pre-built analyses
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Demo flow

**As the teacher**
1. Log in at `/login` as `demo@signalslate.com` / `demo1234`
2. Open a period (e.g. **Period 2**) to see the class code, the class list with PINs, and the printable sign-in sheet
3. Open an exit ticket to see responses, multiple-choice results, who hasn't submitted, and the analysis. From there you can edit, duplicate, delete, or export it as CSV
4. Open **Students** to see each student's answers and follow-up flags. Mark flags as checked in, or filter to **Needs check-in**
5. Open **Trends** to see recurring misconception themes

**As a student** (use a private window so both sessions stay signed in)
1. Go to `/student/login`, enter class code `DEMO42`
2. Pick **Priya P.** and enter PIN `1111`
3. Answer the open "Adding Unlike Fractions" ticket, then view your submitted answers

**From scratch**
1. Register → create a section → add students by pasting names (one per line)
2. Create an exit ticket (2–4 questions) and assign it to the section
3. Students sign in at `/student/login` with the class code, their name, and their PIN, and answer from their home page (or follow the student link you copy from the ticket)
4. Return to the ticket → Run Analysis (needs 3+ submissions)
5. View class summary, misconceptions, and students to check in with

## Exit tickets

- Questions can be edited until the first student answers; after that only the details and sections can change (duplicate the ticket to change questions)
- Multiple-choice questions with a correct answer show % correct and the most common wrong answer
- **Export CSV** gives one row per student, including students who haven't submitted, with a score for marked multiple-choice questions
- Turn on **Show students the correct answers** to let students see the answer key on their submitted answers once the ticket is closed

## Student accounts

- Teachers create students from a section page; each student gets a UUID and a random 4-digit PIN
- A student can be in several of a teacher's sections; each section has its own class code
- Students only see tickets assigned to their sections and can submit each one once
- PINs are stored in plain text so teachers can print sign-in sheets (MVP only; see the privacy note below)

> **Privacy note:** this is an MVP. Student data handling (FERPA/COPPA, PIN hashing, rate limiting sign-in attempts, keeping names out of AI prompts) still needs to be addressed before real classroom use.

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
