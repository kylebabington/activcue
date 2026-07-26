# FamilyFlow

A local family app that helps parents set the current moment and helps kids pick independent activities. The frontend is a React + Vite SPA; the backend is a small Express server that calls OpenAI.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create your server environment file:

```bash
cp server/.env.example server/.env
```

3. Add your OpenAI API key to `server/.env`:

```env
OPENAI_API_KEY=sk-...
```

Optional server flags:

```env
PORT=3001
DEBUG_AI_RESPONSES=true
```

## Run locally

Start both the API and frontend:

```bash
npm run start:all
```

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend: [http://localhost:3001](http://localhost:3001)

In development, Vite proxies `/api` requests to the backend, so the frontend can use relative API URLs.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Vite frontend only |
| `npm run server` | Start Express backend only |
| `npm run start:all` | Start both together |
| `npm run build` | Build frontend for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest unit tests |

## App flow

1. **Parent** — Set what is happening right now: availability, time, space, mess, noise, and supervision.
2. **Kid** — Pick energy level and simple vs imaginative style, or use fast start.
3. **Quest** — Review AI suggestions, start an activity, use timers and hints, and give feedback.
4. **Settings** — Manage inventory, safety rules, child profiles, saved activities, and history.

## Project structure

```text
src/
  App.jsx              Main state and routing shell
  context/             Shared React context for Quest and Settings pages
  pages/               Parent, Kid, Quest, Settings
  components/          Activity panels and results
  utils/               Scoring, formatting, and shared helpers
  api/                 Frontend API client
server/
  index.js             Express entry point
  routes/              API route handlers
  prompts/             OpenAI prompt builders
  schemas/             Structured response schemas
  utils/               Request normalization and prompt formatting
```

## Notes

- App data is stored in browser `localStorage`.
- `server/.env` is gitignored. Never commit API keys.
- If this repo ever exposed a real `.env` file, rotate the OpenAI key.
