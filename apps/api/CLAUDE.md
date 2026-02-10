# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a NestJS-based backend service for a dashboard application with multi-tenant organization support, lead management, referral tracking, and Stripe subscription integration. The application uses PostgreSQL with Prisma ORM (multi-schema architecture), Redis for secondary storage, and Better Auth for authentication.

## Common Commands

### Development

```bash
# Install dependencies
pnpm install

# Start development server (with hot reload)
pnpm run dev

# Start in debug mode
pnpm run start:debug

# Build for production
pnpm run build

# Start production server
pnpm run start:prod
```

### Database (Prisma)

```bash
# Generate Prisma client (run after schema changes)
pnpm run prisma:generate

# Create and apply migrations
pnpm run prisma:migrate

# Push schema changes without migration (dev only)
pnpm run prisma:push

# Pull schema from database
pnpm run prisma:pull

# Open Prisma Studio (database GUI)
pnpm run prisma:studio

# Seed database
pnpm run prisma:seed

# Reset database (drops all data)
pnpm run prisma:reset
```

### Authentication

```bash
# Generate Better Auth types and schema
pnpm run auth:generate
```

### Code Quality

```bash
# Lint and fix code
pnpm run lint

# Format code with Prettier
pnpm run format
```

### Docker

```bash
# Build Docker image
pnpm run docker:build
```

## Architecture

### Multi-Schema Database Design

The application uses Prisma with PostgreSQL multi-schema architecture. Schemas are organized by domain:

- `auth_schema`: User authentication, organizations, members, invitations
- `lead_schema`: Lead management, custom fields, lead values, notifications
- `stripe_schema`: Subscription management
- `referral_schema`: Referral tracking and analytics
- `liason_schema`: Liaison management
- `public_schema`: Default schema

**Important**: Prisma schema is split across multiple files in `prisma/models/`. The main `prisma/schema.prisma` file only contains datasource and generator configuration. Always check the relevant model file when working with a specific domain.

### Authentication & Authorization

The app uses **Better Auth** (via `@thallesp/nestjs-better-auth`) with custom field mappings. Key concepts:

- Custom table/field names (e.g., `user_table`, `user_email` instead of defaults)
- Organization-based multi-tenancy with role-based access (`owner`, `member`, etc.)
- Session includes `activeOrganizationId`, `memberId`, and `memberRole` for context
- Database hooks in `src/lib/auth/auth.ts` automatically set organization context on session creation/update
- Stripe integration for subscription management
- Google OAuth provider configured
- Email verification with custom React Email templates

**Configuration**: Auth config is in `src/lib/auth/auth.ts`. When modifying auth schema, always run `pnpm run auth:generate` to regenerate types.

### Module Structure

The application follows NestJS modular architecture:

- `src/app.module.ts`: Root module importing AuthModule and ApiModule
- `src/api/api.module.ts`: Aggregates all feature modules (Lead, Referral, User, etc.)
- Each feature has its own module, controller, and service (e.g., `src/api/lead/`)

### Global Configuration

- Configuration schema is defined in `src/config/app-config.ts` using Zod
- Environment variables are validated at startup
- Config is accessed via `appConfig` export (not through NestJS ConfigService)
- Global prefix: `/api`
- Swagger docs available at `/api/docs`

### Shared Libraries

Located in `src/lib/`:

- `auth/`: Better Auth configuration and onboarding logic
- `prisma/`: Prisma client singleton
- `redis/`: Redis client for secondary storage
- `resend/`: Email sending via Resend
- `stripe/`: Stripe client
- `gemini/`: Google Gemini AI integration
- `helper.ts`: Shared utility functions

### Email Templates

React Email templates in `src/react-email/`:

- `confirmation-email.tsx`: Email verification
- `reset-password-email.tsx`: Password reset
- `invitation-email.tsx`: Organization invitations
- `otp-email.tsx`: OTP authentication

These are rendered server-side and sent via Resend.

### Lead Management System

Leads use an Entity-Attribute-Value (EAV) pattern:

- `LeadField`: Defines custom fields per organization (field_name, field_type, field_order)
- `LeadValue`: Stores actual values for each lead-field combination
- `LeadFlatView`: Materialized view providing denormalized lead data as JSON for efficient querying
- `LeadHistory`: Audit trail for all lead changes
- `LeadNotificationState`: Per-user notification tracking

Field types include: TEXT, NUMBER, STATUS, EMAIL, PHONE, DATE, CHECKBOX, DROPDOWN, LOCATION, TIMELINE, MULTISELECT, ASSIGNED_TO.

## Important Patterns

### Prisma Client Usage

Always use the singleton Prisma client from `src/lib/prisma/prisma.ts`:

```typescript
import { prisma } from "../../lib/prisma/prisma";
```

### Session Context

When working with authenticated endpoints, access organization context from session:

```typescript
const session = await auth.api.getSession({ headers: request.headers });
const organizationId = session?.session.activeOrganizationId;
const memberId = session?.session.memberId;
const memberRole = session?.session.memberRole;
```

### Custom Field Names

When working with Better Auth models, always use custom field mappings defined in `src/lib/auth/auth.ts`. For example:

- User fields: `user_id`, `user_name`, `user_email`, etc.
- Organization fields: `organization_id`, `organization_name`, etc.

### Error Handling

- Global exception filter: `src/filter/filter.ts`
- Logger middleware: `src/filter/logger.ts`

### CORS Configuration

CORS is configured to accept requests from `WEBSITE_URL` environment variable with credentials enabled.

## Development Notes

### Before Making Schema Changes

1. Modify the appropriate file in `prisma/models/`
2. Run `pnpm run prisma:generate` to regenerate client
3. Run `pnpm run prisma:migrate` to create and apply migration
4. If auth schema changes, also run `pnpm run auth:generate`

### Testing Endpoints

- Use Swagger UI at `http://localhost:8080/api/docs` for API documentation and testing
- Default port: 8080 (configurable via `PORT` env var)

### Environment Setup

Copy `.env.example` to `.env` and fill in required values. Critical variables include:

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`, `BETTER_AUTH_SECRET`: Auth secrets
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: OAuth credentials
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`: Stripe integration
- `RESEND_API_KEY`: Email sending
- `CLOUDINARY_*`: Image upload configuration
- `WEBSITE_URL`: Frontend URL for CORS and redirects

### Package Manager

This project uses **pnpm** (not npm or yarn). Always use `pnpm` commands.
