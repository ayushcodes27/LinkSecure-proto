# LinkSecure

LinkSecure is a secure file sharing platform with password-protected links, short links, analytics, and role-based access control.

## Features

- Secure upload and download workflows
- Public and protected sharing links
- Link expiry and revocation
- Optional short-link flow
- File activity history and analytics dashboard
- Local or Azure Blob storage support
- Email integration for auth and notifications

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- Backend: Node.js, Express, TypeScript, Mongoose
- Database: MongoDB
- Storage: Local filesystem or Azure Blob Storage

## Repository Structure

```text
.
|-- client/   # Frontend app
|-- server/   # Backend API and services
|-- README.md
```

## Prerequisites

- Node.js 18+
- npm 9+
- MongoDB instance

## Local Development

1. Install client dependencies:

```bash
cd client
npm install
```

2. Install server dependencies:

```bash
cd ../server
npm install
```

3. Create server environment file at `server/.env`.

4. Start backend:

```bash
cd server
npm run dev
```

5. Start frontend in a second terminal:

```bash
cd client
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:8080`
- Backend API: `http://localhost:5000`

## Environment Variables

Set these in `server/.env`.

### Required (core)

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/linksecure
JWT_SECRET=replace_with_a_strong_secret

# local | azure
STORAGE_TYPE=local
```

### URL / CORS settings

```env
BASE_URL=http://localhost:5000
CLIENT_URL=http://localhost:8080
FRONTEND_URL=http://localhost:8080
PUBLIC_BASE_URL=http://localhost:5000
CLIENT_BASE_URL=http://localhost:8080
```

### Azure storage (required if STORAGE_TYPE=azure)

```env
AZURE_STORAGE_ACCOUNT_NAME=your_account_name
AZURE_STORAGE_ACCOUNT_KEY=your_account_key
AZURE_STORAGE_CONTAINER_NAME=your_container
```

### OAuth (optional)

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
OAUTH_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
AUTH_GOOGLE_ONLY=false
```

### Email providers (optional)

Use one provider setup. SMTP example:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_app_password
EMAIL_FROM="LinkSecure <noreply@example.com>"
EMAIL_SERVICE=smtp
```

Alternative provider keys used by the codebase:

```env
SENDGRID_API_KEY=...
RESEND_API_KEY=...
MAILGUN_API_KEY=...
MAILGUN_DOMAIN=...
```

### SAS link behavior (optional)

```env
SAS_DEFAULT_EXPIRY_HOURS=24
SAS_MIN_EXPIRY_HOURS=1
SAS_MAX_EXPIRY_HOURS=168
SAS_PERMISSIONS=r
```

### Frontend env

Set this in `client/.env` when not using local defaults:

```env
VITE_API_URL=http://localhost:5000
```

## Scripts

### Client (`client/package.json`)

- `npm run dev` - start Vite dev server
- `npm run build` - production build
- `npm run preview` - preview built app
- `npm run lint` - run ESLint

### Server (`server/package.json`)

- `npm run dev` - start API in watch mode
- `npm run build` - compile TypeScript
- `npm run start` - run compiled API
- `npm run cleanup:trash` - cleanup script
- `npm run test:email` - email service test script

## Build for Production

Client:

```bash
cd client
npm run build
```

Server:

```bash
cd server
npm run build
npm run start
```

## Deployment Notes

- Keep all secrets in platform environment variables.
- Do not commit `.env` files.
- Ensure frontend URL variables and backend base URL variables are aligned.
- If using Azure storage, verify account, container, and key permissions.

## License

This project is provided as-is by the repository owner.