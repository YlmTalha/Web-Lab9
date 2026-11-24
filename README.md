# Assignment 9 – Reading List (Express API + React client)

Web Programming – Fall 2026 · Talha Yılmaz (230408032)

A full-stack Reading List app: a REST API written with Node.js + Express 5 (data kept in memory) and a React client built with Vite. The client talks to the server directly; CORS is handled by the server with the `cors` package (no Vite proxy).

## How to install and run

Requirements: Node.js (current LTS) and npm.

**Server** (port 3000 by default)

```bash
cd server
npm install
npm run dev        # node --watch server.js   (or: npm start)
```

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `3000` | Port the API listens on |
| `CLIENT_ORIGIN` | `http://localhost:5173` | The only origin allowed by CORS |

See `server/.env.example`. Example: `PORT=4000 CLIENT_ORIGIN=http://localhost:5173 npm run dev`

**Client** (port 5173, Vite)

```bash
cd client
cp .env.example .env   # VITE_API_URL=http://localhost:3000
npm install
npm run dev
```

| Variable | Default | Meaning |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3000` | Base URL of the API |

Open http://localhost:5173 with the server running.

## File organization

```
assignment9/
├─ server/
│  ├─ server.js        Express app: CORS, express.json(), routes, 404 fallback, error middleware
│  ├─ booksStore.js    In-memory data (6 seed books); async functions, immutable updates
│  ├─ validate.js      Hand-written validation for ids, books and query options
│  └─ package.json     "type": "module", start/dev scripts, express + cors
├─ client/
│  ├─ src/
│  │  ├─ api/books.js  All fetch calls + shared request() helper
│  │  ├─ components/   BookControls, BookList, BookForm, StatsPanel
│  │  ├─ App.jsx       State, AbortController, add/edit/toggle/rate/delete
│  │  └─ main.jsx
│  ├─ .env.example
│  └─ index.html
├─ .gitignore          node_modules, dist, .env
└─ README.md
```

### API summary

| Method and path | Success | Errors |
|---|---|---|
| `GET /api/books` (genre, read, q, sort, order, limit, page) | 200 | 400 |
| `GET /api/books/:id` | 200 | 400, 404 |
| `POST /api/books` | 201 + `Location` | 400, 409 |
| `PUT /api/books/:id` | 200 | 400, 404, 409 |
| `PATCH /api/books/:id` | 200 | 400, 404, 409 |
| `DELETE /api/books/:id` | 204 | 400, 404 |
| `GET /api/stats` | 200 | – |
| `GET /api/crash` | – | 500 (kept on purpose, see below) |

`GET /api/crash` is a test route that throws inside an async handler. I kept it to show that the error middleware catches it and answers `500 {"error":"Something went wrong"}` without a stack trace (the error is only logged on the server).
