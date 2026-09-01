# Telco CRM

Multi-tenant telecom CRM for business owners. Built as a separate SaaS product from NTC CRM.

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS + shadcn-style components
- PostgreSQL + Prisma 7
- Better Auth (organizations = tenants)

## Setup

1. Copy environment file:
   ```bash
   cp .env.example .env
   ```

2. Start PostgreSQL and update `DATABASE_URL` in `.env`.

3. Install dependencies and set up database:
   ```bash
   npm install
   npm run db:push
   npm run db:seed
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

5. Login at http://localhost:3000/login
   - Email: `owner@demo.telco`
   - Password: `password123`

## Features (v1)

- **Multi-tenant**: Each organization is an isolated telecom business
- **Customers**: Standalone customer records with order/lead history
- **Orders & Applications**: Order wizard with multiple product line items
- **Offers**: Prepaid, PostPaid, Fixed telephony catalog
- **Sources**: Channel attribution (Facebook, file import, website, etc.)
- **Leads**: Inbound pipeline with manual entry, CSV import, API ingest
- **App Statuses**: Tenant-configurable statuses with drag-and-drop ordering
- **Users**: Organization members with sales codes and role-based access
- **Reporting**: Basic dashboard metrics and CSV export

## API Ingest

Each organization has its own API key (`X-Api-Key`). The key is printed when running `npm run db:seed`.

```bash
# Incoming leads
curl -X POST http://localhost:3000/api/v1/ingest/leads \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: YOUR_API_KEY" \
  -d '{"phone":"6901234567","sourceId":"SOURCE_ID","firstName":"John"}'

# Incoming call — shows a popup in the CRM
curl -X POST http://localhost:3000/api/v1/ingest/calls/incoming \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: YOUR_API_KEY" \
  -d '{"phone":"6901234567","callId":"CALL-1"}'

# Outgoing call ended — shows a popup in the CRM
curl -X POST http://localhost:3000/api/v1/ingest/calls/ended \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: YOUR_API_KEY" \
  -d '{"phone":"6901234567","callId":"CALL-1","durationSeconds":95}'
```

Optional fields: `salesCode` (target a specific agent), `callId` (idempotency).

## Project Structure

```
src/
  app/(dashboard)/     # Authenticated CRM pages
  app/api/             # REST API + Better Auth
  components/          # UI components
  config/              # Domain constants
  lib/                 # Auth, DB, services
prisma/
  schema.prisma        # Database schema
  seed.ts              # Demo org + owner
```
