# Production Readiness Checklist

Before deploying the Thai Energy Planner to a production environment, ensure the following checklist is completed:

## 1. Security
- [x] **Admin Authentication Guard:** `/admin` routes are locked unless `ADMIN_ACCESS_TOKEN` is configured and the request provides the matching token. Replace this token guard with SSO/NextAuth/Clerk if multi-user admin roles are needed.
- [ ] **Environment Variables:** Ensure `.env` is never committed. Production secrets should be injected via the hosting provider (e.g., Vercel environment variables).
- [ ] **File Upload Limits:** File upload sizes for CSV/XLSX imports are restricted to 50MB. Verify infrastructure timeouts allow for processing up to this limit.
- [ ] **CSV Injection:** Ensure `csv-exporter.ts` sanitization remains intact (prefixing `=, +, -, @` with `'`).

## 2. Performance
- [ ] **Database Connection Pooling:** Use PgBouncer or Prisma Accelerate if deploying in a serverless environment (e.g., Vercel) to prevent connection exhaustion.
- [ ] **Database Indexes:** Verify `LoadInterval` indexes (`loadProfileId`, `timestamp`) are applied in the production database.
- [ ] **Data Aggregation:** Ensure frontend charts continue to use aggregated summary data rather than fetching millions of raw `LoadInterval` rows.

## 3. Operations
- [x] **Report Persistence:** Local analysis reports can be mirrored into PostgreSQL as `AnalysisRun` + `GeneratedReport` records when `DATABASE_URL` is available.
- [ ] **Audit Logging:** Verify that admin actions (e.g., publishing tariffs) are successfully writing to the `AuditLog` table.
- [ ] **Error Monitoring:** Integrate a tool like Sentry to catch unhandled exceptions in the calculation engines.
- [ ] **Backups:** Configure automated daily backups for the PostgreSQL database, especially for the immutable `TariffSnapshot` records.
