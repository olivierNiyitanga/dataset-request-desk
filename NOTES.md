# Engineering Notes

## Design and data model

The backend is a FastAPI application backed by PostgreSQL and SQLAlchemy. The main relational entities are:

- `users`: identity, Argon2 password hash, organisation, role, and active state.
- `requests`: a client-owned dataset request with task, quantity, deadline, notes, and current workflow status.
- `request_status_history`: append-only audit records containing the previous status, new status, actor, and timestamp.
- `episodes`: imported recording metadata, including robot, task, recording time, duration, operator, and quality.
- `assignments`: the many-to-one allocation from an episode to a request, with a uniqueness constraint preventing an episode from being assigned twice.

Request state is persisted in `requests.status`; history is persisted separately so the current state is cheap to read while every transition remains auditable. The server owns authorization and transition rules. The frontend uses NextAuth only as the session/token boundary and RTK Query slices for backend data.

The hardest decisions were:

1. **Transition ownership:** clients can accept/reject only their own delivered requests, while operators and admins perform operational transitions. The service layer validates both the transition graph and role before committing history and state together.
2. **Delivery readiness:** moving to `delivered` checks the assignment count inside the same service operation, so the UI cannot bypass the minimum episode requirement.
3. **Messy imports:** episode identity is normalized and protected by a database uniqueness constraint. Re-running a file is therefore safe, and each skipped or invalid row is included in the import report.

For the provided seed CSV, episode IDs are trimmed and uppercased, task, quality, and robot values are normalized to lowercase, only the five documented robot IDs are accepted, durations must be positive and no greater than one hour, and future recording timestamps are rejected. ISO timestamps, `Z` timestamps, and the provided day-first timestamp format are supported. Duplicate IDs, blank required values, malformed dates, invalid qualities, invalid durations, and unknown robots are reported as skipped rows. A quoted task containing a comma and decimal durations are supported; decimal durations are rounded half up to whole seconds.

## Deliberate omissions and simplifications

I did not complete the deployment stretch because hosting the frontend, API, and PostgreSQL database on a free tier was too restrictive for a secure production deployment. Real-time updates, background export jobs, and a public deployment were intentionally left out because the required request, assignment, import, authorization, and audit workflows provide more evaluation value within the time limit.

The deployment approach I would use in production is a paid Azure setup: the Next.js frontend and FastAPI backend would run as separate containerized services, while PostgreSQL would be managed as a dedicated database service with backups, networking controls, and secrets managed via Azure Key Vault. The notes in this document describe that architecture and the operational trade-offs I would use if the app were moved beyond local Docker-based development.

The frontend is intentionally operational rather than a full design system. Pagination controls currently request a bounded working page for the main role screens, while the backend exposes real pagination parameters. Notifications, password reset, profile editing, and file delivery storage are not part of the brief. With two more days I would add browser-level tests, server-driven dashboard aggregates, a request detail route, and the deployment pipeline with managed secrets.

## Something that went wrong

During integration, the frontend still referenced a removed legacy message slice, which caused the Next.js build to fail before type checking. After removing that unrelated route implementation, the build exposed two optional-filter typing errors where `void` was passed as RTK Query params. Normalizing optional filters to `{}` fixed the root issue. A later contract check also found that the frontend episode quality union used `unusable` while the backend correctly uses `usable`; the shared slice type was corrected and the build was rerun.

## Security

Passwords are hashed with Argon2 and are never returned by the API. Login issues a short-lived JWT. The frontend stores the backend token in the authenticated NextAuth JWT session and sends it as a bearer token to Redux API requests. Every protected backend route resolves the user from the token and checks active state and role server-side. Pydantic validation, parameterized SQLAlchemy queries, CSV validation, CORS configuration, and database constraints protect the main input boundaries.

The two risks I would monitor most closely are:

1. **Token/session compromise:** production should use long random secrets, HTTPS, secure cookie settings, secret rotation, short access-token lifetimes, and refresh-token controls.
2. **CSV and authorization abuse:** imports should remain resource-limited and isolated, while every new endpoint must preserve ownership checks so a client cannot read or mutate another client's requests.

## Analytics and scale

`GET /api/analytics` treats `from_date` and `to_date` as inclusive calendar dates and internally uses the half-open interval `[from_date 00:00, to_date + 1 day 00:00)`. Episodes per day/robot, request status counts, median submitted-to-delivered time, and top good tasks are computed by database queries. PostgreSQL uses `percentile_cont` for the median; SQLite tests use a SQL window-function fallback without loading lifecycle rows into Python.

The existing indexes cover episode recording time, robot, task, quality, request creation time, and status-history lifecycle lookups. At 5 million episodes I would inspect `EXPLAIN (ANALYZE, BUFFERS)`, then consider date partitioning, pre-aggregated daily/robot summaries, materialized views, and a read replica. At 10x users, connection pooling and rate limiting would become important; at 100x episode volume, import batching and aggregate tables would be the first operational improvements.

## AI tooling

GitHub Copilot was used for codebase exploration, implementation assistance, and identifying integration/type issues. Every change was checked against the backend contracts, followed by the backend test suite and frontend production build. The final implementation should be explainable from the service rules, schemas, tests, and notes rather than relying on generated code without verification.
