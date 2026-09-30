begin;

-- Read-only projection: no answers, journals, chat content or email addresses.
create or replace function public.admin_study_tracking(p_plan_id uuid)
returns table (
  id uuid,
  full_name text,
  church_name text,
  avatar_url text,
  current_streak integer,
  max_streak integer,
  last_study_date text,
  progress jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ) then
    raise exception 'Solo administradores pueden consultar el seguimiento'
      using errcode = '42501';
  end if;

  return query
  select p.id, p.full_name::text, p.church_name::text, p.avatar_url::text,
    coalesce(s.current_streak, 0)::integer,
    coalesce(s.max_streak, 0)::integer,
    s.last_study_date::text,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'lesson_id', up.lesson_id, 'completed_at', up.completed_at
      ) order by up.lesson_id)
      from public.user_progress up
      join public.study_lessons l on l.id = up.lesson_id
      join public.study_weeks w on w.id = l.week_id
      where up.user_id = p.id and up.completed is true and w.plan_id = p_plan_id
    ), '[]'::jsonb)
  from public.profiles p
  left join public.user_streaks s on s.user_id = p.id
  order by p.id;
end;
$$;

revoke all on function public.admin_study_tracking(uuid) from public, anon;
grant execute on function public.admin_study_tracking(uuid) to authenticated;

commit;
