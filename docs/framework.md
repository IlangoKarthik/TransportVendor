
Project Framework (short & simple)
---------------------------------

- **Frontend:** React app located in `client/`. Built into static files and served by the Node server in production. The UI calls the Node API and (via Node) the Flask services.
- **Backend (API):** Node.js/Express server in `server/`. Serves the React build, exposes `api/*` routes, and proxies Flask services at `/flask/db-search` and `/flask/doc-search` using `http-proxy-middleware`.
- **Search Services:** Two Flask apps — `db_search/` (vendor DB search) and `document_search/` (document upload + semantic search). They run on internal ports (`DB_SEARCH_PORT`=5002, `DOC_SEARCH_PORT`=5001) and are started by the top-level `start-services.sh` script in the container.
- **Data & Auth:** MongoDB (Atlas) is used for persistent data; connection via `MONGODB_URI`. Auth uses JWTs (signed with `JWT_SECRET`).
- **AI / Embeddings:** OpenAI (or compatible API) used for embeddings and summarization — configured with `OPENAI_API_KEY` (and optional `OPENAI_API_BASE`).
- **Email / OTP:** SMTP credentials (prefer `SMTP_*`) are used for email-based OTP; a demo OTP fallback exists for environments where SMTP is blocked.
- **Deployment:** Project is containerized with a multi-stage `Dockerfile`. On platforms like Render, do NOT hardcode `PORT` (Render provides a dynamic `PORT` env var). Required runtime env vars (OpenAI key, MongoDB URI, JWT secret, SMTP if needed) must be configured in the host.
- **How requests flow (summary):**
	- Browser → React UI → Node API (same origin in production)
	- Node → internal Flask proxies → `db_search` / `document_search`
	- Flask services use DB + OpenAI to process and return results back through the proxy to the UI.

This is a simple, service-oriented setup: React (UI) + Node (API & proxy) + Flask (search microservices) + MongoDB + OpenAI, wired together via internal ports and environment variables.
