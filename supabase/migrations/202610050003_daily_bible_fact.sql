begin;

create table if not exists public.daily_bible_facts (
  day date primary key,
  question text check (char_length(question) between 15 and 240),
  status text not null default 'pending' check (status in ('pending', 'ready', 'failed')),
  created_at timestamptz not null default now()
);
alter table public.daily_bible_facts enable row level security;
revoke all on public.daily_bible_facts from public, anon, authenticated;
grant select, insert, update on public.daily_bible_facts to service_role;

-- Only the server claims a generation. A unique day prevents concurrent AI calls.
-- Failed/interrupted generations keep the editorial fallback until the next day.
create or replace function public.claim_daily_bible_fact()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_day date := (clock_timestamp() at time zone 'America/La_Paz')::date;
  v_count integer; v_row public.daily_bible_facts%rowtype;
begin
  insert into public.daily_bible_facts(day) values(v_day) on conflict(day) do nothing;
  get diagnostics v_count = row_count;
  select * into v_row from public.daily_bible_facts where day = v_day;
  return jsonb_build_object('claimed', v_count = 1, 'day', v_day, 'question', v_row.question, 'status', v_row.status);
end;
$$;
revoke all on function public.claim_daily_bible_fact() from public, anon, authenticated;
grant execute on function public.claim_daily_bible_fact() to service_role;

commit;
