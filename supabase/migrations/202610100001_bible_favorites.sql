begin;

create table if not exists public.bible_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  favorite_key text not null,
  entry jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, favorite_key)
);

-- Receipts make retries idempotent, including an old save retried after a delete.
create table if not exists public.bible_favorite_operations (
  user_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null,
  fingerprint text not null,
  sequence bigint generated always as identity,
  primary key (user_id, operation_id)
);
create index if not exists bible_favorite_revision_idx on public.bible_favorite_operations(user_id, sequence desc);
alter table public.bible_favorites enable row level security;
alter table public.bible_favorite_operations enable row level security;
revoke all on public.bible_favorites, public.bible_favorite_operations from public, anon, authenticated;
grant select on public.bible_favorites to authenticated;
drop policy if exists bible_favorites_owner_read on public.bible_favorites;
create policy bible_favorites_owner_read on public.bible_favorites for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.sync_bible_favorites(p_operations jsonb default '[]'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_op jsonb;
  v_entry jsonb;
  v_id uuid;
  v_key text;
  v_fingerprint text;
  v_previous text;
  v_atom text;
  v_number integer;
  v_last integer;
begin
  if v_user is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_operations is null or jsonb_typeof(p_operations) <> 'array' then
    raise exception 'Invalid operations' using errcode = '22023';
  end if;
  if jsonb_array_length(p_operations) > 50 or octet_length(p_operations::text) > 6000000 then
    raise exception 'Batch too large' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text, 0));
  for v_op in select value from jsonb_array_elements(p_operations) loop
    if jsonb_typeof(v_op) <> 'object' or not (v_op ?& array['id','key','entry'])
      or (v_op - array['id','key','entry']) <> '{}'::jsonb
      or jsonb_typeof(v_op->'id') <> 'string' or jsonb_typeof(v_op->'key') <> 'string' then
      raise exception 'Invalid operation' using errcode = '22023';
    end if;
    v_id := (v_op->>'id')::uuid;
    v_key := v_op->>'key';
    if length(v_key) > 8210 or v_key !~ '^(RVR1960|NVI|NTV|TLA):[A-Z0-9]{3}\.[1-9][0-9]{0,2}\.[1-9][0-9]{0,2}(\+[A-Z0-9]{3}\.[1-9][0-9]{0,2}\.[1-9][0-9]{0,2})*$' then
      raise exception 'Invalid favorite key' using errcode = '22023';
    end if;
    v_fingerprint := pg_catalog.md5(v_op::text);
    select fingerprint into v_previous from public.bible_favorite_operations where user_id = v_user and operation_id = v_id;
    if found then
      if v_previous <> v_fingerprint then raise exception 'Operation ID reused' using errcode = '22023'; end if;
      continue;
    end if;
    v_entry := v_op->'entry';
    if v_entry = 'null'::jsonb then
      delete from public.bible_favorites where user_id = v_user and favorite_key = v_key;
    else
      if jsonb_typeof(v_entry) <> 'object' or not (v_entry ?& array['version','book','chapter','reference','label','title','text'])
        or (v_entry - array['version','book','chapter','reference','label','title','text']) <> '{}'::jsonb
        or jsonb_typeof(v_entry->'version') <> 'string' or (v_entry->>'version') not in ('RVR1960','NVI','NTV','TLA')
        or jsonb_typeof(v_entry->'book') <> 'string' or (v_entry->>'book') !~ '^[A-Z0-9]{3}$'
        or jsonb_typeof(v_entry->'chapter') <> 'number' or (v_entry->>'chapter') !~ '^[1-9][0-9]{0,2}$'
        or jsonb_typeof(v_entry->'reference') <> 'string' or length(v_entry->>'reference') > 8192
        or v_key <> (v_entry->>'version') || ':' || (v_entry->>'reference')
        or jsonb_typeof(v_entry->'label') <> 'string' or length(v_entry->>'label') not between 1 and 4096
        or jsonb_typeof(v_entry->'title') <> 'string' or length(btrim(v_entry->>'title')) not between 1 and 120
        or jsonb_typeof(v_entry->'text') <> 'string' or length(btrim(v_entry->>'text')) not between 1 and 100000 then
        raise exception 'Invalid favorite' using errcode = '22023';
      end if;
      if (v_entry->>'chapter')::integer > 150 then raise exception 'Invalid chapter' using errcode = '22023'; end if;
      v_last := 0;
      foreach v_atom in array string_to_array(v_entry->>'reference', '+') loop
        if split_part(v_atom, '.', 1) <> v_entry->>'book' or split_part(v_atom, '.', 2) <> v_entry->>'chapter' then
          raise exception 'Mixed chapters' using errcode = '22023';
        end if;
        v_number := split_part(v_atom, '.', 3)::integer;
        if v_number <= v_last then raise exception 'Unordered reference' using errcode = '22023'; end if;
        v_last := v_number;
      end loop;
      insert into public.bible_favorites(user_id, favorite_key, entry) values (v_user, v_key, v_entry)
        on conflict (user_id, favorite_key) do update set entry = excluded.entry, updated_at = clock_timestamp();
    end if;
    insert into public.bible_favorite_operations(user_id, operation_id, fingerprint) values (v_user, v_id, v_fingerprint);
  end loop;
  if (select count(*) from public.bible_favorites where user_id = v_user) > 500 then
    raise exception 'Maximum 500 favorites' using errcode = '22023';
  end if;
  return jsonb_build_object(
    'favorites', coalesce((select jsonb_agg(entry order by updated_at, favorite_key) from public.bible_favorites where user_id = v_user), '[]'::jsonb),
    'revision', coalesce((select max(sequence) from public.bible_favorite_operations where user_id = v_user), 0),
    'applied', coalesce((select jsonb_agg(value->>'id') from jsonb_array_elements(p_operations)), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.sync_bible_favorites(jsonb) from public, anon;
grant execute on function public.sync_bible_favorites(jsonb) to authenticated;

commit;
