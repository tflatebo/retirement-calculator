# Retirement Calculator

A single-page React app for retirement planning simulations. No backend, no auth — all state persists to `localStorage`.

## Requirements

- **Node.js**: v22+ (tested on v22.22.0)
- **npm**: v10+

## Dev workflow

```bash
cd retirement-calculator
npm install          # install dependencies (already done in devcontainer)
npm run dev          # start dev server at http://localhost:5173 with HMR
npm run build        # production build to dist/
npm run lint         # ESLint
npm run test         # Vitest unit tests (run once)
npm run test:e2e     # Playwright E2E tests
```

## Devcontainer

This repo includes a `.devcontainer/` configuration. Opening in VS Code Dev Containers or GitHub Codespaces will automatically set up the environment with Node 22, install dependencies, and expose port 5173.

No additional setup is needed inside the devcontainer — just run `npm run dev` from `retirement-calculator/`.

## Architecture

See [CLAUDE.md](../CLAUDE.md) for detailed architecture notes on the simulation engine, data flow, and component conventions.
