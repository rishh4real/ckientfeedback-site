# ckientfeedback-site

Client feedback site for Shaurya Sharma.

## Vercel Email Setup

Add these environment variables in Vercel before using the live form:

- `SMTP_USER`: Gmail address or SMTP username, for example `rishh4work@gmail.com`
- `SMTP_PASS`: Gmail app password or SMTP password
- `FEEDBACK_TO`: destination inbox, for example `rishh4work@gmail.com`
- `SUPABASE_URL`: `https://ewqnsurygoymbfyqolty.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY`: your Supabase secret/service role key

Optional:

- `SMTP_HOST`: defaults to `smtp.gmail.com`
- `SMTP_PORT`: defaults to `465`
- `FEEDBACK_FROM_NAME`: defaults to `Shaurya Feedback Form`

For Gmail, create an app password from Google Account security settings and use that as `SMTP_PASS`.

## Supabase Table

Create this table in Supabase SQL Editor:

```sql
create table if not exists feedback_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text,
  email text,
  phone text,
  company text,
  service_type text,
  ratings jsonb,
  again text,
  refer text,
  liked text,
  improve text,
  other text
);
```

Submitted data appears in `Supabase Dashboard -> Table Editor -> feedback_responses`.
