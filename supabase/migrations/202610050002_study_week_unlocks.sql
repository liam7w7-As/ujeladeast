begin;

-- Enforce week order without rewriting existing completions, dates or XP.
create or replace function public.enforce_study_week_order()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.completed is not true then return new; end if;
  if tg_op = 'UPDATE' and old.completed is true and old.lesson_id = new.lesson_id and old.user_id = new.user_id then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));
  if exists (
    select 1 from public.study_lessons target
    join public.study_weeks target_week on target_week.id = target.week_id
    join public.study_weeks previous on previous.plan_id = target_week.plan_id and previous.week_number < target_week.week_number
    join public.study_lessons earlier on earlier.week_id = previous.id
    where target.id = new.lesson_id and not exists (
      select 1 from public.user_progress p where p.user_id = new.user_id and p.lesson_id = earlier.id and p.completed is true
    )
  ) then
    raise exception 'Completa las semanas anteriores antes de continuar' using errcode = 'P0003';
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_study_week_order() from public, anon, authenticated;
drop trigger if exists enforce_study_week_order on public.user_progress;
create trigger enforce_study_week_order before insert or update of completed, lesson_id, user_id on public.user_progress
for each row execute function public.enforce_study_week_order();

commit;
