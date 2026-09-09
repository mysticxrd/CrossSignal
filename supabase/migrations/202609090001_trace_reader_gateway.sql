begin;

create table cfr_app.runtime_tokens (
  name text primary key,
  token_sha256 text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  constraint chk_runtime_tokens_sha256 check (token_sha256 ~ '^[0-9a-f]{64}$')
);

revoke all on cfr_app.runtime_tokens from public, anon, authenticated, service_role, cfr_trace_reader;

commit;
