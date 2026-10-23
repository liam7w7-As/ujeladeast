-- Preserve existing profile APIs and RLS while protecting authorization fields.
create schema if not exists private;
revoke create on schema private from public, anon, authenticated;

create or replace function private.protect_profile_authorization()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_claim_role text := auth.jwt() ->> 'role';
begin
  -- Trusted maintenance is allowed; a user JWT cannot inherit a definer's rights.
  if current_user in ('postgres', 'supabase_admin', 'service_role')
    and (v_claim_role = 'service_role' or (v_actor is null and v_claim_role is null)) then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id then
      raise exception using errcode = '42501', message = 'No se puede cambiar el propietario de un perfil.';
    end if;
    if new.role is not distinct from old.role then
      return new;
    end if;
  elsif tg_op = 'INSERT' and new.role = 'user' then
    return new;
  end if;

  if v_actor is null or not exists (
    select 1 from public.profiles p where p.id = v_actor and p.role = 'admin'
  ) then
    raise exception using errcode = '42501', message = 'Solo un administrador puede asignar o cambiar roles.';
  end if;
  return new;
end;
$$;

revoke all on function private.protect_profile_authorization() from public, anon, authenticated;

create or replace trigger protect_profile_authorization
before insert or update on public.profiles
for each row execute function private.protect_profile_authorization();
