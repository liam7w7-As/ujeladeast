begin;

create table if not exists public.admin_notification_batches (
  id uuid primary key,
  sender_id uuid not null references auth.users(id),
  title text not null,
  message text not null,
  target_user_id uuid,
  target_church text,
  audience_label text not null default '',
  action_url text,
  recipient_count integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.admin_notification_batches enable row level security;
revoke all on public.admin_notification_batches from anon, authenticated;

create or replace function public.admin_send_notification(
  p_request_id uuid, p_title text, p_message text,
  p_user_id uuid default null, p_church_name text default null, p_action_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_batch public.admin_notification_batches%rowtype;
  v_count integer;
  v_label text;
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin') then
    raise exception 'Solo administradores pueden enviar avisos' using errcode = '42501';
  end if;
  if p_request_id is null or p_title is null or length(btrim(p_title)) not between 1 and 120
    or p_message is null or length(btrim(p_message)) not between 1 and 2000 then
    raise exception 'Titulo o mensaje invalido' using errcode = '22023';
  end if;
  if (p_user_id is not null and p_church_name is not null) or p_church_name = '' then
    raise exception 'Destinatarios invalidos' using errcode = '22023';
  end if;
  if p_action_url is not null and p_action_url not in ('/', '/feed', '/estudios', '/himnario', '/sociedades', '/recursos', '/chat') then
    raise exception 'Destino invalido' using errcode = '22023';
  end if;

  -- The request key makes a retry after a lost response safe and transactional.
  insert into public.admin_notification_batches(id, sender_id, title, message, target_user_id, target_church, action_url)
  values (p_request_id, auth.uid(), btrim(p_title), btrim(p_message), p_user_id, p_church_name, p_action_url)
  on conflict (id) do nothing;
  if not found then
    select * into v_batch from public.admin_notification_batches b where b.id = p_request_id;
    if v_batch.sender_id is distinct from auth.uid() or v_batch.title is distinct from btrim(p_title)
      or v_batch.message is distinct from btrim(p_message) or v_batch.target_user_id is distinct from p_user_id
      or v_batch.target_church is distinct from p_church_name or v_batch.action_url is distinct from p_action_url then
      raise exception 'La solicitud ya pertenece a otro envio' using errcode = '22023';
    end if;
    return to_jsonb(v_batch);
  end if;

  if p_user_id is not null then
    select coalesce(p.full_name, 'Usuario') into v_label from public.profiles p where p.id = p_user_id;
  else
    v_label := coalesce(p_church_name, 'Todos los usuarios');
  end if;
  insert into public.notifications(user_id, title, message, type, action_url, read)
  select p.id, btrim(p_title), btrim(p_message), 'anuncio', p_action_url, false
  from public.profiles p
  where (p_user_id is null or p.id = p_user_id) and (p_church_name is null or p.church_name = p_church_name);
  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'No hay destinatarios para este aviso' using errcode = '22023';
  end if;
  update public.admin_notification_batches set recipient_count = v_count, audience_label = v_label
  where id = p_request_id returning * into v_batch;
  return to_jsonb(v_batch);
end;
$$;

create or replace function public.admin_notification_history()
returns setof public.admin_notification_batches
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin') then
    raise exception 'Solo administradores pueden consultar los envios' using errcode = '42501';
  end if;
  return query select b.* from public.admin_notification_batches b order by b.created_at desc, b.id;
end;
$$;

revoke all on function public.admin_send_notification(uuid,text,text,uuid,text,text) from public, anon;
revoke all on function public.admin_notification_history() from public, anon;
grant execute on function public.admin_send_notification(uuid,text,text,uuid,text,text) to authenticated;
grant execute on function public.admin_notification_history() to authenticated;

commit;
