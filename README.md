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

## Testing evidence (curl)

Headers such as `Date`, `Connection` and `X-Powered-By` were removed to keep the output short.

**1. Stats before any change (200)**

```
$ curl --include 'http://localhost:3000/api/stats'
HTTP/1.1 200 OK
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 125

{"total":6,"read":4,"unread":2,"averageRating":4,"byGenre":{"fiction":1,"fantasy":2,"science":1,"history":1,"non-fiction":1}}

```

**2. List with two query parameters (200)**

```
$ curl --include 'http://localhost:3000/api/books?genre=fantasy&sort=year&order=desc'
HTTP/1.1 200 OK
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 235

[{"id":5,"title":"The Name of the Wind","author":"Patrick Rothfuss","year":2007,"genre":"fantasy","read":false,"rating":null},{"id":2,"title":"The Hobbit","author":"J.R.R. Tolkien","year":1937,"genre":"fantasy","read":true,"rating":4}]

```

**3. One book (200)**

```
$ curl --include http://localhost:3000/api/books/1
HTTP/1.1 200 OK
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 101

{"id":1,"title":"Dune","author":"Frank Herbert","year":1965,"genre":"fiction","read":true,"rating":5}

```

**4. Create a book (201 + Location)**

```
$ curl --include -X POST http://localhost:3000/api/books -H 'Content-Type: application/json' -d '{"title":"Neuromancer","author":"William Gibson","year":1984,"genre":"fiction"}'
HTTP/1.1 201 Created
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Location: /api/books/7
Content-Type: application/json; charset=utf-8
Content-Length: 113

{"id":7,"title":"Neuromancer","author":"William Gibson","year":1984,"genre":"fiction","read":false,"rating":null}

```

**5. Invalid body (400)**

```
$ curl --include -X POST http://localhost:3000/api/books -H 'Content-Type: application/json' -d '{"title":"","author":"Someone","year":3000,"genre":"poetry"}'
HTTP/1.1 400 Bad Request
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 57

{"error":"title must be a string of 1 to 100 characters"}

```

**6. Repeated query parameter (400)**

```
$ curl --include 'http://localhost:3000/api/books?genre=fiction&genre=history'
HTTP/1.1 400 Bad Request
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 58

{"error":"query parameter \"genre\" must not be repeated"}

```

**7. Missing book (404)**

```
$ curl --include http://localhost:3000/api/books/99
HTTP/1.1 404 Not Found
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 29

{"error":"Book 99 not found"}

```

**8. Duplicate title + author, different case (409)**

```
$ curl --include -X POST http://localhost:3000/api/books -H 'Content-Type: application/json' -d '{"title":"dune","author":"FRANK HERBERT","year":1965,"genre":"fiction"}'
HTTP/1.1 409 Conflict
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 52

{"error":"\"dune\" by FRANK HERBERT already exists"}

```

**9. PATCH book 7: only read and rating change, other fields are kept (200)**

```
$ curl --include -X PATCH http://localhost:3000/api/books/7 -H 'Content-Type: application/json' -d '{"read":true,"rating":5}'
HTTP/1.1 200 OK
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 109

{"id":7,"title":"Neuromancer","author":"William Gibson","year":1984,"genre":"fiction","read":true,"rating":5}

```

**10. PUT book 7: the whole book is replaced; fields not sent go back to defaults (read false, rating null) (200)**

```
$ curl --include -X PUT http://localhost:3000/api/books/7 -H 'Content-Type: application/json' -d '{"title":"Neuromancer","author":"William Gibson","year":1984,"genre":"science"}'
HTTP/1.1 200 OK
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 113

{"id":7,"title":"Neuromancer","author":"William Gibson","year":1984,"genre":"science","read":false,"rating":null}

```

**11. Stats after the changes (200) – total is now 7**

```
$ curl --include 'http://localhost:3000/api/stats'
HTTP/1.1 200 OK
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 125

{"total":7,"read":4,"unread":3,"averageRating":4,"byGenre":{"fiction":1,"fantasy":2,"science":2,"history":1,"non-fiction":1}}

```

**12. Delete (204, no body)**

```
$ curl --include -X DELETE http://localhost:3000/api/books/7
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin


```

**13. Same delete repeated (404)**

```
$ curl --include -X DELETE http://localhost:3000/api/books/7
HTTP/1.1 404 Not Found
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 28

{"error":"Book 7 not found"}

```

**14. Preflight (OPTIONS) as the browser sends it before a PATCH**

```
$ curl --include -X OPTIONS http://localhost:3000/api/books/1 -H 'Origin: http://localhost:5173' -H 'Access-Control-Request-Method: PATCH' -H 'Access-Control-Request-Headers: content-type'
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin, Access-Control-Request-Headers
Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE
Access-Control-Allow-Headers: content-type
Content-Length: 0


```

### Preflight in the browser (Network tab)

When the client toggles "read" it sends a `PATCH` with `Content-Type: application/json`. This is not a "simple" request, so in the Network tab there is first an **OPTIONS** request to `http://localhost:3000/api/books/:id` with status **204**. Its response headers are `Access-Control-Allow-Origin: http://localhost:5173`, `Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE` and `Access-Control-Allow-Headers: content-type`. Only after that does the real `PATCH` request appear (status 200). Request 14 above shows the same exchange with curl.
