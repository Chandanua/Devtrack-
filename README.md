# DevTrack

Task tracker for software development teams.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL (Prisma ORM)
- **Auth:** JWT & OAuth 2.0 (Google, GitHub)
- **Real-Time:** Socket.io
- **Styling:** Tailwind CSS + shadcn/ui
- **Icons:** Lucide React

---

## Local Development

### 1. Standard Setup

```bash
npm install
cp .env.example .env
# Configure your DATABASE_URL, JWT_SECRET, and ENCRYPTION_KEY in .env
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Containerized Development (Docker Compose)

DevTrack includes containerization infrastructure for local development using Docker Compose.

### Running with Docker Compose

1. Copy `.env.example` to `.env` if you haven't already:
   ```bash
   cp .env.example .env
   ```

2. Start the application and PostgreSQL containers:
   ```bash
   docker compose up --build
   ```

3. **First-Time Migration:**
   On first startup, run Prisma migrations against the containerized PostgreSQL database:
   ```bash
   npx prisma migrate deploy
   ```
   *(Optional) To seed initial data:*
   ```bash
   npx prisma db seed
   ```

4. Access DevTrack at [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

Copy `.env.example` to `.env` and fill in required values:
- `DATABASE_URL`: PostgreSQL connection URL
- `JWT_SECRET`: Secret key for JWT signing
- `ENCRYPTION_KEY`: 32-byte base64 key for encrypting OAuth tokens at rest
