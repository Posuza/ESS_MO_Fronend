# ESS MO Frontend new update to ahead of stable version

This is the frontend for the ESS MO (Employee Self Service - Ministry of Organization) system. It is a modern web application built with React, TypeScript, and Vite, providing a user interface for employee attendance, reporting, and management features.

## Features
- Employee check-in/check-out and attendance module
- Daily Onsite Report MO & Dashboard with charts and reports
- Secure authentication and role-based access
- Responsive UI  mobile

## Development Guide

### Prerequisites
- Node.js (v22 or newer recommended)
- npm (comes with Node.js)

### Clone and Run

```bash
# Clone the repository
 git clone https://github.com/Posuza/ESS_MO_Fronend.git
 cd ESS_MO_Fronend

# Install dependencies
 npm install

# Start the development server
 npm run dev
```

The app will be available at `http://localhost:5173` by default.

### Build for Production

```bash
npm run build
```

The production-ready files will be in the `dist/` folder.

### Environment Variables

Copy `.env.example` to `.env` for local development and set your endpoints:

```
VITE_API_URL=/api/v1
VITE_ESS_PUBLIC_KEY=ZjO4FYk9acszpjuo
VITE_ESS_SDK_ORIGIN=http://183.90.173.206:9091
```

The tracked `.env.production` supplies the default SDK origin for production
builds. The frontend appends `/sdk/v1/index.js`. A deployment can override the
origin with `VITE_ESS_SDK_ORIGIN` at build time; changing it requires rebuilding
the frontend.

ESS initializes once in `src/App.tsx` through the shared
`src/services/ess-auth.ts` service. The browser-verified employee ID is used
to bootstrap a local profile from `/api/v1/auth/ess/profile`; it must not be
used by itself as authorization for sensitive backend operations. Those
operations still require a backend-verifiable session or ESS token.

---

For deployment instructions, see the `/deployment` folder in the main project.
