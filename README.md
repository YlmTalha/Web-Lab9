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

## Reasoning questions

**1. Parameters.** The id identifies one specific resource, so it is part of the path (`/api/books/3` *is* book 3). `genre` and `sort` do not identify a resource; they only change how the same list is shown, and they are optional and can be combined, so they belong in the query string. If the id were in the query string (`/api/books?id=3`) the URL would look like a filtered list instead of one resource, and the same path would have to handle both "list" and "one book", which makes 404 vs. an empty list unclear.

**2. Body parsing (experiment).** I moved `app.use(express.json())` below the routes. `req.body` was `undefined` in the POST handler because the JSON had not been parsed yet when the route ran. My validation then answered `400 {"error":"Request body must be a JSON object"}` even though the body was valid JSON. Middleware runs in order, so the parser has to be registered before the routes.

**3. One response (experiment).** I removed the `return` before `res.status(404).json(...)` in `GET /api/books/:id`. The client still received the 404, but the handler kept running and called `res.json(book)` too. The server logged `Error [ERR_HTTP_HEADERS_SENT]: Cannot set headers after they are sent to the client`. A response can be sent only once; without `return` the code falls through to a second send.

**4. PUT and PATCH.** PATCH is better when the user ticks "read" or picks a rating in the list: only `read`/`rating` change and the client does not need to send the whole book (requests 9 and 10 show the difference). PUT is better in the edit form, where the user sees all fields and saves the complete book; the server replaces the book with exactly what was sent, and anything left out goes back to its default.

**5. CORS (experiment).** I started the server with `CLIENT_ORIGIN=http://localhost:9999`. The list did not load and the browser console showed that the request from `http://localhost:5173` was blocked by CORS policy because there was no matching `Access-Control-Allow-Origin` header. The server still logged the `GET /api/books` request and answered it, because CORS is enforced by the browser, not by the server; the browser just refuses to give the response to the page. curl is not a browser and does not apply the same-origin policy, so it still works.

**6. Validation.** Client-side checks only exist for user convenience. Anyone can send a request without our form (curl, Postman, another app, or by editing the JS in DevTools), so the server is the only place where the rules can really be enforced. Also some rules, like duplicate title + author, can only be checked on the server because only it has all the data.

**7. State (experiment).** After I added and deleted books and restarted the server, all changes were gone and the list was back to the 6 seed books. The data lives only in the server process's memory (a variable in `booksStore.js`), so it disappears when the process stops. To keep it we need persistent storage such as a database or at least a file.
