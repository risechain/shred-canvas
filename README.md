This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Environment Configuration

Copy the example environment file and configure your settings:

```bash
cp .env.example .env.local
```

The following environment variables are available:

### General Configuration
- `NEXT_PUBLIC_ENVIRONMENT` - Environment mode (`production`, `staging`, `local`, `test`)

### Production Environment
- `NEXT_PUBLIC_CONTRACT_ADDRESS` - Canvas contract address
- `NEXT_PUBLIC_RPC_URL` - RPC endpoint URL
- `NEXT_PUBLIC_RPC_URL_WSS` - WebSocket RPC URL
- `NEXT_PUBLIC_CANVAS_SIZE` - Canvas size (64x64)

### Staging Environment  
- `NEXT_PUBLIC_CONTRACT_ADDRESS_STAGING` - Staging contract address
- `NEXT_PUBLIC_RPC_URL_STAGING` - Staging RPC endpoint URL
- `NEXT_PUBLIC_RPC_URL_WSS_STAGING` - Staging WebSocket RPC URL
- `NEXT_PUBLIC_CANVAS_SIZE_STAGING` - Staging canvas size (32x32)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To easily set this base repo, you may use the following:

```bash
# to setup a complete repo, including wagmi + theme (css tokens) + common components
npx create-rise-fe-app

# to setup a theme-only repo (CSS Tokens)
npx create-rise-fe-app theme

# to setup a basic repo with theme + common components
npx create-rise-fe-app base

# to setup a repo with theme + wagmi + tanstack configuration
npx create-rise-fe-app wagmi

# to setup a complete repo with sample demo
npx create-rise-fe-app demo

```
