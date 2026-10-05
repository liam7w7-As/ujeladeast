begin;

-- Refuse ambiguous timestamp conversions rather than rewriting historical dates.
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public'
    and table_name = 'user_progress' and column_name = 'completed_at' and data_type = 'timestamp with time zone') then
    raise exception 'Verificar user_progress.completed_at: se requiere timestamptz antes de aplicar esta migracion';
  end if;
end;
$$;

create index if not exists study_completed_days_idx on public.user_progress(user_id, completed_at) where completed is true;

-- Internal projection. Never accepts a user/date chosen by an API caller.
create or replace function public.study_streak_summary(p_user uuid, p_now timestamptz)
returns jsonb language sql stable security definer set search_path = '' as $$
  with days as (
    select distinct (completed_at at time zone 'America/La_Paz')::date as day
    from public.user_progress where user_id = p_user and completed is true
      and completed_at is not null and completed_at <= p_now
  ), numbered as (
    select day, day - row_number() over(order by day)::integer as island from days
  ), runs as (
    select max(day) as last_day, count(*)::integer as length from numbered group by island
  ), latest as (select * from runs order by last_day desc limit 1)
  select jsonb_build_object(
    'current_streak', coalesce((select case when last_day >= (p_now at time zone 'America/La_Paz')::date - 1 then length else 0 end from latest), 0),
    'max_streak', coalesce((select max(length) from runs), 0),
    'last_study_date', (select max(day) from days),
    'today_completed', exists(select 1 from days where day = (p_now at time zone 'America/La_Paz')::date),
    'recent_days', (select jsonb_agg(jsonb_build_object('date', d.day, 'completed', exists(select 1 from days where day = d.day)) order by d.day)
      from (select (p_now at time zone 'America/La_Paz')::date - i as day from generate_series(0, 6) i) d)
  );
$$;
revoke all on function public.study_streak_summary(uuid, timestamptz) from public, anon, authenticated;

create or replace function public.get_study_status()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_now timestamptz := clock_timestamp();
begin
  if v_user is null then raise exception 'Se requiere iniciar sesion' using errcode = '42501'; end if;
  return public.study_streak_summary(v_user, v_now) || jsonb_build_object(
    'user_id', v_user, 'atomic', true, 'server_now', v_now,
    'total_xp', coalesce((select total_xp from public.user_streaks where user_id = v_user), 0));
end;
$$;
revoke all on function public.get_study_status() from public, anon;
grant execute on function public.get_study_status() to authenticated;

create or replace function public.complete_study_lesson(p_lesson_id uuid, p_answers jsonb, p_content jsonb)
returns jsonb language plpgsql security definer set search_path = '' set timezone = 'America/La_Paz' as $$
declare
  v_user uuid := auth.uid(); v_now timestamptz; v_lesson public.study_lessons%rowtype;
  v_before jsonb; v_after jsonb; v_xp integer := 10; v_question jsonb; v_index integer;
begin
  if v_user is null then raise exception 'Se requiere iniciar sesion' using errcode = '42501'; end if;
  -- Serialize different lessons and retries for the same user, not all students.
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 0));
  v_now := clock_timestamp();
  select * into v_lesson from public.study_lessons where id = p_lesson_id for share;
  if not found then raise exception 'La leccion no existe' using errcode = '22023'; end if;
  if exists(select 1 from public.user_progress where user_id = v_user and lesson_id = p_lesson_id and completed is true) then
    return jsonb_build_object('completed', true, 'already_completed', true, 'added_xp', 0, 'status', public.get_study_status());
  end if;
  if p_content is distinct from jsonb_build_array(v_lesson.scripture_ref, v_lesson.scripture_text, v_lesson.teaching, v_lesson.questions) then
    raise exception 'La leccion cambio; vuelve a abrirla. Tu borrador se conserva.' using errcode = 'P0002';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' or octet_length(p_answers::text) > 200000 then
    raise exception 'Respuestas invalidas' using errcode = '22023';
  end if;
  if jsonb_typeof(v_lesson.questions::jsonb) = 'array' then
    for v_question, v_index in select value, (ordinality - 1)::integer from jsonb_array_elements(v_lesson.questions::jsonb) with ordinality loop
      if nullif(btrim(case when jsonb_typeof(v_question) = 'string' then v_question #>> '{}' else v_question ->> 'text' end), '') is not null
        and (v_question -> 'required') is distinct from 'false'::jsonb then
        if jsonb_typeof(p_answers -> v_index::text) is distinct from 'string'
          or nullif(regexp_replace(p_answers ->> v_index::text, '[[:space:]]', '', 'g'), '') is null then
          raise exception 'Responde las preguntas pendientes antes de guardar' using errcode = '22023';
        end if;
      end if;
    end loop;
  end if;
  v_before := public.study_streak_summary(v_user, v_now);
  insert into public.user_progress(user_id, lesson_id, completed, answers, completed_at)
    values(v_user, p_lesson_id, true, p_answers, v_now)
    on conflict(user_id, lesson_id) do update set completed = true, answers = excluded.answers, completed_at = excluded.completed_at
      where public.user_progress.completed is not true;
  v_after := public.study_streak_summary(v_user, v_now);
  if (v_after ->> 'current_streak')::integer = 7 and (v_before ->> 'current_streak')::integer < 7 then v_xp := v_xp + 20;
  elsif (v_after ->> 'current_streak')::integer = 30 and (v_before ->> 'current_streak')::integer < 30 then v_xp := v_xp + 100;
  end if;
  insert into public.user_streaks(user_id, current_streak, max_streak, total_xp, last_study_date)
    values(v_user, (v_after ->> 'current_streak')::integer, (v_after ->> 'max_streak')::integer, v_xp, v_now)
    on conflict(user_id) do update set current_streak = excluded.current_streak, max_streak = excluded.max_streak,
      total_xp = coalesce(public.user_streaks.total_xp, 0) + v_xp, last_study_date = excluded.last_study_date;
  if v_xp > 10 then
    insert into public.notifications(user_id, title, message, type, action_url)
      values(v_user, 'Racha de ' || (v_after ->> 'current_streak') || ' dias',
        'Completaste dias consecutivos de estudio. +' || (v_xp - 10)::text || ' XP', 'logro', '/estudios');
  end if;
  return jsonb_build_object('completed', true, 'already_completed', false, 'added_xp', v_xp, 'status', public.get_study_status());
end;
$$;
revoke all on function public.complete_study_lesson(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.complete_study_lesson(uuid, jsonb, jsonb) to authenticated;

-- Older clients must reload: direct writes can forge timestamps, streaks and XP.
revoke insert, update, delete, truncate, references, trigger on public.user_progress, public.user_streaks from public, anon, authenticated;
-- Remove column-level write grants too, if an older schema granted them explicitly.
do $$
declare v_table text; v_columns text;
begin
  foreach v_table in array array['user_progress', 'user_streaks'] loop
    select string_agg(quote_ident(column_name), ', ') into v_columns from information_schema.columns
      where table_schema = 'public' and table_name = v_table;
    execute format('revoke insert (%s), update (%s) on public.%I from public, anon, authenticated', v_columns, v_columns, v_table);
  end loop;
end;
$$;

-- Admin sees the same history-derived active streak; no private answers are exposed.
create or replace function public.admin_study_tracking(p_plan_id uuid)
returns table(id uuid, full_name text, church_name text, avatar_url text, current_streak integer, max_streak integer, last_study_date text, progress jsonb)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin') then
    raise exception 'Solo administradores pueden consultar el seguimiento' using errcode = '42501';
  end if;
  return query select p.id, p.full_name::text, p.church_name::text, p.avatar_url::text,
    (s.data ->> 'current_streak')::integer, (s.data ->> 'max_streak')::integer, s.data ->> 'last_study_date',
    coalesce((select jsonb_agg(jsonb_build_object('lesson_id', up.lesson_id, 'completed_at', up.completed_at) order by up.lesson_id)
      from public.user_progress up join public.study_lessons l on l.id = up.lesson_id join public.study_weeks w on w.id = l.week_id
      where up.user_id = p.id and up.completed is true and w.plan_id = p_plan_id), '[]'::jsonb)
    from public.profiles p cross join lateral (select public.study_streak_summary(p.id, now()) as data) s order by p.id;
end;
$$;
revoke all on function public.admin_study_tracking(uuid) from public, anon;
grant execute on function public.admin_study_tracking(uuid) to authenticated;

commit;
