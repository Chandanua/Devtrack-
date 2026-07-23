# DevTrack

A production-ready task tracker for software development teams. Built with Next.js 13, Supabase, TypeScript, Tailwind CSS, and shadcn/ui.

## Features

- **Role-based access control** — 6 roles (Super Admin, Project Manager, Team Lead, Developer, QA Tester, UI/UX Designer) with a permission system
- **Project management** — Create, edit, delete projects with progress tracking, client info, and team assignment
- **Kanban board** — 7-column drag-and-drop board with real-time status updates, filtering by project/priority/assignee, and search
- **Task management** — Full task lifecycle with subtasks, dependencies, tags, priorities, due dates, and time estimation
- **Task detail** — Comments with emoji reactions, activity log, file attachments, inline status/priority editing, and subtask management
- **Time tracking** — Start/stop timer persisted in the database, session history with charts, and period-based filtering
- **Dashboard** — Role-aware stats, task status and priority distribution charts, upcoming deadlines, and recent projects
- **Calendar** — Monthly view with task deadlines, click-to-filter by day
- **Reports & Analytics** — Status pie chart, team workload bar chart, project progress chart with project filtering
- **Notifications** — Assignment notifications, status change alerts, polling-based with visibility-aware fetching
- **Team management** — Member cards with workload stats, availability indicators, and role badges
- **Command palette** — Global search (Cmd+K) across projects, tasks, and people
- **Dark/light mode** — Full theme support with CSS variables
- **Responsive design** — Works across desktop, tablet, and mobile

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 13.5 (App Router) |
| Language | TypeScript |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password) |
| Storage | Supabase Storage (task attachments) |
| UI | Tailwind CSS, shadcn/ui, Radix UI |
| Charts | Recharts |
| Animations | Framer Motion |
| Icons | Lucide React |
| Forms | React Hook Form, Zod |

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project (URL and anon key)

### Installation

```bash
npm install
```

### Environment Variables

The following are pre-configured in `.env`:

```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

### Development

```bash
npm run dev
```

The app runs on `http://localhost:3000`.

### Production Build

```bash
npm run build
npm start
```

## Architecture

### Folder Structure

```
app/
  (app)/              # Authenticated route group
    board/            # Kanban board
    calendar/         # Monthly calendar
    dashboard/        # Role-aware dashboard
    notifications/    # Notification list
    projects/         # Projects list + detail
    reports/          # Analytics
    settings/         # Profile settings
    tasks/            # My tasks + task detail
    team/             # Team management
    timesheet/        # Time tracking
  login/              # Sign in page
  signup/             # Sign up page
  layout.tsx          # Root layout
  page.tsx            # Server redirect to /dashboard or /login

components/
  layout/             # Sidebar, topbar, route guard, notifications bell, command palette
  projects/           # Project form dialog
  providers/          # Auth provider, theme provider, app providers
  shared/             # Badges, avatar stack, progress, empty state, stat card, page header
  tasks/              # Task form dialog, kanban card
  ui/                 # shadcn/ui components

lib/
  auth/               # Role-based permission system
  supabase/           # Browser and server Supabase clients
  types/              # TypeScript interfaces for all database entities
  utils/              # Date formatting, duration, file size utilities
  constants.ts        # Roles, statuses, priorities, tag colors, helper functions
```

### Database Schema

16 tables with Row Level Security (RLS) enabled on every table:

- **profiles** — User profiles (1:1 with `auth.users`), auto-created via trigger on signup
- **teams** / **team_members** — Team organization
- **projects** — Project entities with progress, client info, dates
- **tasks** — Tasks with status, priority, due dates, parent/child subtasks
- **task_assignees** — Many-to-many task ↔ user
- **task_dependencies** — Task blocking relationships
- **task_tags** — Many-to-many task ↔ tags
- **task_attachments** — File metadata (stored in Supabase Storage)
- **tags** — Pre-seeded colored tags
- **sprints** — Sprint planning
- **comments** / **comment_reactions** — Collaboration
- **time_logs** — Time tracking entries
- **notifications** — User-scoped notifications
- **activity_log** — Append-only audit trail

### Security

- **RLS on all 16 tables** — Every table has separate SELECT/INSERT/UPDATE/DELETE policies scoped to `authenticated`
- **Owner columns** default to `auth.uid()` for automatic ownership on insert
- **Signup role restriction** — Users can only self-assign non-admin roles (developer, QA, designer, team lead, project manager). Super Admin must be set via database.
- **Server-side redirect** — Root page checks session server-side, no client flash
- **Route guard** — Checks both session and profile existence
- **Security headers** — X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- **Input validation** — URL format validation, minimum password length, empty-name prevention
- **File upload limits** — 10MB max, stored in dedicated Supabase Storage bucket

### Performance

- **Singleton Supabase client** — Single browser instance reused across the app
- **RPC for batch queries** — `get_project_task_counts()` eliminates N+1 queries on projects page
- **Visibility-aware polling** — Notification polling pauses when tab is hidden
- **Database indexes** — Composite indexes on common query patterns (task status+project, notification user+unread, time logs user+end, comments task+date)
- **Optimistic updates with rollback** — Board and task detail pages roll back on DB error
- **Animation delay caps** — Staggered animations capped at 0.3s to prevent invisible items on large lists
- **ESLint enabled in builds** — Code quality enforced at build time

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build (includes ESLint + type checking) |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript compiler |

## Deployment

The app is configured for deployment on Netlify with `@netlify/plugin-nextjs`. The `netlify.toml` is pre-configured.

### Pre-deployment Checklist

- Environment variables set in hosting platform
- Supabase migrations applied (4 migrations: core schema, task management, collaboration, optimizations)
- Storage bucket `task-attachments` created (handled by migration 0004)

## License

Built for demonstration purposes.
