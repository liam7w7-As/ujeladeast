begin;

do $$
begin
  if to_regprocedure('public.study_streak_summary(uuid,timestamp with time zone)') is null then
    raise exception 'Instala primero 202610050001_atomic_study.sql';
  end if;
end;
$$;

create table if not exists public.study_streak_recoveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid references public.study_lessons(id) on delete set null,
  missed_day date not null,
  status text not null default 'draft' check (status in ('draft', 'pending', 'approved', 'rejected')),
  snapshot jsonb not null,
  answers jsonb,
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  decision_note text,
  unique(user_id, missed_day)
);
create index if not exists study_recovery_queue_idx on public.study_streak_recoveries(status, submitted_at, id);
alter table public.study_streak_recoveries enable row level security;
revoke all on public.study_streak_recoveries from public, anon, authenticated;
grant select on public.study_streak_recoveries to authenticated;
drop policy if exists study_recovery_read_own on public.study_streak_recoveries;
create policy study_recovery_read_own on public.study_streak_recoveries for select to authenticated using (user_id = (select auth.uid()));

-- Personal continuity only. The existing study_streak_summary and XP stay untouched.
create or replace function public.study_recovery_days(p_user uuid, p_now timestamptz)
returns table(day date) language sql stable security definer set search_path = '' as $$
  select distinct (completed_at at time zone 'America/La_Paz')::date
    from public.user_progress where user_id = p_user and completed is true and completed_at <= p_now
  union
  select missed_day from public.study_streak_recoveries
    where user_id = p_user and status = 'approved' and reviewed_at <= p_now;
$$;
revoke all on function public.study_recovery_days(uuid, timestamptz) from public, anon, authenticated;

create or replace function public.study_recovery_offer(p_user uuid, p_now timestamptz)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_today date := (p_now at time zone 'America/La_Paz')::date;
  v_days date[]; v_day date; v_lesson uuid; v_plan uuid; v_expires timestamptz;
begin
  if exists(select 1 from public.study_streak_recoveries where user_id = p_user and status = 'pending') then
    return jsonb_build_object('eligible', false, 'reason', 'pending');
  end if;
  select array_agg(day) into v_days from public.study_recovery_days(p_user, p_now);
  v_days := coalesce(v_days, '{}'::date[]);
  for v_day in select v_today - i from generate_series(1, 2) i loop
    v_expires := (v_day + 3)::timestamp at time zone 'America/La_Paz';
    if v_day = any(v_days) or not (v_day - 1 = any(v_days)) or p_now >= v_expires
      or exists(select 1 from generate_series(1, v_today - v_day - 1) i where not (v_day + i = any(v_days))) then
      continue;
    end if;
    if exists(select 1 from public.study_streak_recoveries where user_id = p_user and status = 'approved' and abs(missed_day - v_day) < 30) then
      return jsonb_build_object('eligible', false, 'reason', 'cooldown');
    end if;
    if exists(select 1 from public.study_streak_recoveries where user_id = p_user and missed_day = v_day and status <> 'draft') then
      return jsonb_build_object('eligible', false, 'reason', 'already_requested');
    end if;
    -- Use the student's actual plan and its first pending lesson at the missed day.
    select l.id, w.plan_id into v_lesson, v_plan from public.user_progress up
      join public.study_lessons l on l.id = up.lesson_id join public.study_weeks w on w.id = l.week_id
      where up.user_id = p_user and up.completed is true and up.completed_at < (v_day::timestamp at time zone 'America/La_Paz')
      order by up.completed_at desc, l.id limit 1;
    if v_lesson is null then return jsonb_build_object('eligible', false, 'reason', 'no_lesson'); end if;
    select coalesce((select l.id from public.study_lessons l join public.study_weeks w on w.id = l.week_id
      where w.plan_id = v_plan and not exists(select 1 from public.user_progress up where up.user_id = p_user
        and up.lesson_id = l.id and up.completed is true and up.completed_at < (v_day::timestamp at time zone 'America/La_Paz'))
      order by w.week_number, l.day_number, l.id limit 1), v_lesson) into v_lesson;
    return jsonb_build_object('eligible', true, 'missed_day', v_day, 'expires_at', v_expires, 'lesson_id', v_lesson);
  end loop;
  return jsonb_build_object('eligible', false, 'reason', 'no_gap');
end;
$$;
revoke all on function public.study_recovery_offer(uuid, timestamptz) from public, anon, authenticated;

create or replace function public.get_study_status()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_now timestamptz := clock_timestamp(); v_personal jsonb; v_request jsonb;
begin
  if v_user is null then raise exception 'Se requiere iniciar sesion' using errcode = '42501'; end if;
  with numbered as (
    select day, day - row_number() over(order by day)::integer as island from public.study_recovery_days(v_user, v_now)
  ), runs as (select max(day) as last_day, count(*)::integer as length from numbered group by island),
  latest as (select * from runs order by last_day desc limit 1)
  select jsonb_build_object('current_streak', coalesce((select case when last_day >= (v_now at time zone 'America/La_Paz')::date - 1 then length else 0 end from latest), 0),
    'max_streak', coalesce((select max(length) from runs), 0)) into v_personal;
  select jsonb_build_object('id', id, 'status', status, 'missed_day', missed_day, 'expires_at', expires_at, 'decision_note', decision_note)
    into v_request from public.study_streak_recoveries where user_id = v_user
    order by (status = 'pending') desc, missed_day desc limit 1;
  return public.study_streak_summary(v_user, v_now) || jsonb_build_object(
    'user_id', v_user, 'atomic', true, 'server_now', v_now,
    'total_xp', coalesce((select total_xp from public.user_streaks where user_id = v_user), 0),
    'recovery', v_personal || public.study_recovery_offer(v_user, v_now) || jsonb_build_object('version', 1, 'request', v_request,
      'recovered_days', coalesce((select jsonb_agg(missed_day order by missed_day) from public.study_streak_recoveries
        where user_id = v_user and status = 'approved' and reviewed_at <= v_now
          and missed_day >= (v_now at time zone 'America/La_Paz')::date - 6), '[]'::jsonb)));
end;
$$;
revoke all on function public.get_study_status() from public, anon;
grant execute on function public.get_study_status() to authenticated;

create or replace function public.begin_study_recovery()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_now timestamptz; v_offer jsonb; v_lesson public.study_lessons%rowtype; v_row public.study_streak_recoveries%rowtype;
begin
  if v_user is null then raise exception 'Se requiere iniciar sesion' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 0));
  v_now := clock_timestamp(); v_offer := public.study_recovery_offer(v_user, v_now);
  if (v_offer ->> 'eligible')::boolean is not true then
    raise exception 'La recuperacion ya no esta disponible. Actualiza tu racha.' using errcode = 'P0004';
  end if;
  select * into v_row from public.study_streak_recoveries where user_id = v_user and missed_day = (v_offer ->> 'missed_day')::date;
  if found then return to_jsonb(v_row); end if;
  select * into v_lesson from public.study_lessons where id = (v_offer ->> 'lesson_id')::uuid for share;
  if not found then raise exception 'La leccion ya no esta disponible' using errcode = 'P0004'; end if;
  insert into public.study_streak_recoveries(user_id, lesson_id, missed_day, expires_at, snapshot)
    values(v_user, v_lesson.id, (v_offer ->> 'missed_day')::date, (v_offer ->> 'expires_at')::timestamptz,
      jsonb_build_object('title', v_lesson.title, 'scripture_ref', v_lesson.scripture_ref,
        'scripture_text', v_lesson.scripture_text, 'teaching', v_lesson.teaching,
        'questions', jsonb_build_array('Explica con tus palabras la idea central de este pasaje.',
          '¿Qué parte del pasaje sostiene esa idea y por qué?', '¿Cómo aplicarías esta enseñanza a una situación concreta de tu vida?')))
    returning * into v_row;
  return to_jsonb(v_row);
end;
$$;
revoke all on function public.begin_study_recovery() from public, anon;
grant execute on function public.begin_study_recovery() to authenticated;

create or replace function public.submit_study_recovery(p_request_id uuid, p_answers jsonb, p_read boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_now timestamptz; v_row public.study_streak_recoveries%rowtype; v_offer jsonb; i integer;
begin
  if v_user is null then raise exception 'Se requiere iniciar sesion' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 0));
  v_now := clock_timestamp();
  select * into v_row from public.study_streak_recoveries where id = p_request_id and user_id = v_user for update;
  if not found then raise exception 'Solicitud no disponible' using errcode = '42501'; end if;
  -- Lost responses and duplicate taps return the confirmed state without replacing answers.
  if v_row.status <> 'draft' then return jsonb_build_object('request', to_jsonb(v_row), 'status', public.get_study_status()); end if;
  v_offer := public.study_recovery_offer(v_user, v_now);
  if v_now >= v_row.expires_at or (v_offer ->> 'eligible')::boolean is not true
    or (v_offer ->> 'missed_day')::date is distinct from v_row.missed_day then
    raise exception 'El plazo termino o la recuperacion ya no esta disponible. Tu borrador se conserva.' using errcode = 'P0004';
  end if;
  if p_read is not true or jsonb_typeof(p_answers) is distinct from 'array' then
    raise exception 'Lee el pasaje y completa las tres respuestas' using errcode = '22023';
  end if;
  if jsonb_array_length(p_answers) <> 3 or octet_length(p_answers::text) > 30000 then
    raise exception 'Se requieren tres respuestas' using errcode = '22023';
  end if;
  for i in 0..2 loop
    if jsonb_typeof(p_answers -> i) is distinct from 'string'
      or length(regexp_replace(p_answers ->> i, '[[:space:]]', '', 'g')) < 40 or length(p_answers ->> i) > 2000 then
      raise exception 'Cada respuesta necesita entre 40 caracteres sin espacios y 2000 caracteres en total' using errcode = '22023';
    end if;
  end loop;
  update public.study_streak_recoveries set status = 'pending', answers = p_answers, submitted_at = v_now
    where id = v_row.id returning * into v_row;
  return jsonb_build_object('request', to_jsonb(v_row), 'status', public.get_study_status());
end;
$$;
revoke all on function public.submit_study_recovery(uuid, jsonb, boolean) from public, anon;
grant execute on function public.submit_study_recovery(uuid, jsonb, boolean) to authenticated;

create or replace function public.admin_study_recoveries(p_status text default 'pending', p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Solo administradores' using errcode = '42501';
  end if;
  if p_status is null or p_status not in ('pending', 'approved', 'rejected') or p_offset is null or p_offset < 0 then
    raise exception 'Filtro invalido' using errcode = '22023';
  end if;
  return jsonb_build_object('total', (select count(*) from public.study_streak_recoveries where status = p_status),
    'items', coalesce((select jsonb_agg(item order by submitted_at, id) from (
      select r.id, r.submitted_at, to_jsonb(r) || jsonb_build_object('full_name', p.full_name, 'church_name', p.church_name) as item
      from public.study_streak_recoveries r join public.profiles p on p.id = r.user_id where r.status = p_status
      order by r.submitted_at, r.id limit 20 offset p_offset) page), '[]'::jsonb));
end;
$$;
revoke all on function public.admin_study_recoveries(text, integer) from public, anon;
grant execute on function public.admin_study_recoveries(text, integer) to authenticated;

create or replace function public.review_study_recovery(p_request_id uuid, p_approve boolean, p_note text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_admin uuid := auth.uid(); v_user uuid; v_row public.study_streak_recoveries%rowtype; v_now timestamptz;
begin
  if not exists(select 1 from public.profiles where id = v_admin and role = 'admin') then
    raise exception 'Solo administradores' using errcode = '42501';
  end if;
  select user_id into v_user from public.study_streak_recoveries where id = p_request_id;
  if v_user is null or v_user = v_admin then raise exception 'No puedes revisar esta solicitud' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 0));
  select * into v_row from public.study_streak_recoveries where id = p_request_id for update;
  if v_row.status in ('approved', 'rejected') then
    if (v_row.status = 'approved') is distinct from p_approve then
      raise exception 'Otro administrador ya resolvio esta solicitud. Actualiza el listado.' using errcode = 'P0004';
    end if;
    return to_jsonb(v_row);
  end if;
  if v_row.status <> 'pending' or p_approve is null or p_note is null or length(btrim(p_note)) < 10 or length(p_note) > 1000 then
    raise exception 'Revisa las respuestas y deja una observacion de 10 a 1000 caracteres' using errcode = '22023';
  end if;
  if p_approve and exists(select 1 from public.study_streak_recoveries where user_id = v_user and status = 'approved' and abs(missed_day - v_row.missed_day) < 30) then
    raise exception 'Ya existe una recuperacion aprobada dentro de los 30 dias' using errcode = 'P0004';
  end if;
  v_now := clock_timestamp();
  update public.study_streak_recoveries set status = case when p_approve then 'approved' else 'rejected' end,
    reviewed_at = v_now, reviewed_by = v_admin, decision_note = btrim(p_note) where id = p_request_id returning * into v_row;
  insert into public.notifications(user_id, title, message, type, action_url)
    values(v_user, case when p_approve then 'Recuperacion aprobada' else 'Repaso revisado' end,
      case when p_approve then 'Tu racha personal incluye el dia recuperado. La racha real del campamento no cambia.'
        else 'Tu repaso no fue aprobado. Puedes leer la observacion en Mi estudio.' end, 'anuncio', '/estudios');
  return to_jsonb(v_row);
end;
$$;
revoke all on function public.review_study_recovery(uuid, boolean, text) from public, anon;
grant execute on function public.review_study_recovery(uuid, boolean, text) to authenticated;

commit;
