# Classly

An academic full-stack classroom Learning Management System.

<p>
  <img src="https://img.shields.io/badge/TanStack-FF4154?style=for-the-badge&logo=react-query&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-646cff?style=for-the-badge&logo=vite&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/Groq_API-1C2321?style=for-the-badge&logo=groq&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
</p>

## Features

- **Roles** - student, instructor, and admin accounts
- **Classrooms & materials** - subjects, topics, and uploaded materials with comments
- **Quizzes** - auto-graded, with an exam lock that blocks AI chat during a session
- **Messaging** - direct messages and group conversations
- **Calendar** - shared class events, importable from a file
- **Announcements & notifications**
- **AI assistant** - Scoped server-side to academic help, rate-limited per user
- **Admin console** - approve/reject/create/edit users, system stats

## Getting Started

### Prerequisites

- **[Node.js 22](https://nodejs.org/en/download)**
- **[pnpm](https://pnpm.io)**

### Installation

```bash
git clone https://github.com/nathanielseth/classly.git
cd classly
pnpm install
```

### Environment

```bash
cp .env.example .env
```

```bash
SUPABASE_URL=
SUPABASE_ANON_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
GROQ_API_KEY=
```


### Development

```bash
pnpm dev
```

### Build

```bash
pnpm build
```

### Preview production build

```bash
pnpm preview
```

## Project Structure

```
src/
├── routes/                # File-based routes (TanStack Router)
│   └── _authenticated/    # Dashboard, classroom, calendar, messages, AI, admin
├── components/             # UI, grouped by feature
├── lib/
│   ├── server/functions/   # Server functions (auth, materials, quizzes, messages, admin...)
│   └── database.types.ts   # Generated Supabase types
└── hooks/
```

## Contributing

1. Fork the repo and create a branch from `main`
2. Make your changes (`pnpm lint` and `pnpm typecheck` before committing)
3. Open a pull request with a clear description