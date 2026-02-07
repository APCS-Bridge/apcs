# Prisma and Docker Postgres

## How the container DB is updated

- **On backend container startup** we run `prisma db push`. That applies the current `prisma/schema.prisma` to the Postgres container, so the Docker DB stays in sync with the schema **without** using migration files or the `_prisma_migrations` table.
- So: change the schema → rebuild/restart the backend container → Docker DB is updated. No P3009 or “no migrations” issues.

## If you use migrations and want to apply them to the Docker DB

1. **Point Prisma at the Docker DB** (from your host, with compose running and port exposed):
   ```bash
   export DATABASE_URL="postgresql://apcs_user:apcs_password@localhost:5432/apcs_db"
   ```
   Use the host port that maps to Postgres (e.g. `5432` if you have `5432:5432` in compose).

2. **Fix P3009 (failed migration) once** so `migrate deploy` can run:
   ```bash
   npm run migrate:resolve-docker
   ```
   This marks the failed migration `20260206165554_add_document_management_system` as rolled back. Run with the same `DATABASE_URL` as above.

3. **Apply migrations to the Docker DB**:
   ```bash
   npm run migrate:docker
   ```
   Again with `DATABASE_URL` pointing at the Docker Postgres.

## If you only use `db push` (no migrations folder)

- Local: `npx prisma db push` updates your local Postgres.
- Docker: backend startup runs `npx prisma db push` and updates the container Postgres. No extra steps.

## Summary

| Goal                         | Action |
|-----------------------------|--------|
| Update Docker DB from schema | Restart backend container (it runs `db push`). |
| Run migrations on Docker DB  | Set `DATABASE_URL` → run `migrate:resolve-docker` once if P3009 → run `migrate:docker`. |
| Update local DB              | `npx prisma db push` or `npx prisma migrate dev` as usual. |
