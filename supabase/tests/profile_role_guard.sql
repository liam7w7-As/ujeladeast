-- Run as the database owner. Every data mutation below is rolled back, including
-- successful admin/service operations. No auth users, studies or streaks are edited.
do $tests$
declare
  v_member uuid;
  v_admin uuid;
  v_count integer;
  v_message text;
begin
  begin
    select id into v_member from public.profiles where role = 'user' order by id limit 1;
    select id into v_admin from public.profiles where role = 'admin' order by id limit 1;
    if v_member is null or v_admin is null then
      raise exception 'Tests require one existing member and one administrator.';
    end if;

    perform set_config('request.jwt.claims', json_build_object('sub', v_member, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';

    begin
      update public.profiles set role = 'admin' where id = v_member;
      raise exception 'FAIL: a member promoted their own profile.';
    exception when insufficient_privilege then
      get stacked diagnostics v_message = message_text;
      if v_message <> 'Solo un administrador puede asignar o cambiar roles.' then raise; end if;
    end;

    begin
      update public.profiles set role = null where id = v_member;
      raise exception 'FAIL: a member changed their authorization role to NULL.';
    exception when insufficient_privilege then null;
    end;

    begin
      insert into public.profiles(id, role) values(v_member, 'admin') on conflict(id) do nothing;
      raise exception 'FAIL: INSERT accepted an elevated role from a member.';
    exception when insufficient_privilege then null;
    end;

    begin
      insert into public.profiles(id, role) values(v_member, null) on conflict(id) do nothing;
      raise exception 'FAIL: INSERT accepted a NULL role from a member.';
    exception when insufficient_privilege then null;
    end;

    begin
      insert into public.profiles(id, role) values(v_member, 'admin')
        on conflict(id) do update set role = excluded.role;
      raise exception 'FAIL: UPSERT promoted a member.';
    exception when insufficient_privilege then null;
    end;

    perform set_config('request.jwt.claims', json_build_object('sub', v_member, 'role', 'authenticated',
      'user_metadata', json_build_object('role', 'admin'))::text, true);
    begin
      update public.profiles set role = 'admin' where id = v_member;
      raise exception 'FAIL: editable metadata granted administrator rights.';
    exception when insufficient_privilege then null;
    end;

    execute 'reset role';
    begin
      update public.profiles set role = 'admin' where id = v_member;
      raise exception 'FAIL: elevated SQL execution bypassed a normal user JWT.';
    exception when insufficient_privilege then null;
    end;
    execute 'set local role authenticated';

    begin
      update public.profiles set id = gen_random_uuid() where id = v_member;
      raise exception 'FAIL: member reassigned profile ownership.';
    exception when insufficient_privilege then null;
    end;

    update public.profiles set full_name = full_name, church_name = church_name, avatar_url = avatar_url where id = v_member;
    get diagnostics v_count = row_count;
    if v_count <> 1 then raise exception 'FAIL: normal profile editing was blocked.'; end if;

    insert into public.profiles(id) values(v_member) on conflict(id) do nothing;
    insert into public.profiles(id) values(v_member)
      on conflict(id) do update set avatar_url = public.profiles.avatar_url;
    get diagnostics v_count = row_count;
    if v_count <> 1 then raise exception 'FAIL: legacy profile upsert was blocked.'; end if;

    update public.profiles set full_name = full_name where id = v_admin;
    get diagnostics v_count = row_count;
    if v_count <> 0 then raise exception 'FAIL: member edited another profile.'; end if;

    execute 'reset role';
    perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';

    update public.profiles set role = 'admin' where id = v_member;
    get diagnostics v_count = row_count;
    if v_count <> 1 or not exists(select 1 from public.profiles where id = v_member and role = 'admin') then
      raise exception 'FAIL: administrator could not promote another member.';
    end if;
    update public.profiles set role = 'user' where id = v_member;
    get diagnostics v_count = row_count;
    if v_count <> 1 then raise exception 'FAIL: administrator could not revoke an administrator role.'; end if;

    insert into public.profiles(id) values(v_admin)
      on conflict(id) do update set avatar_url = public.profiles.avatar_url;
    if not exists(select 1 from public.profiles where id = v_admin and role = 'admin') then
      raise exception 'FAIL: legacy admin upsert replaced the existing role.';
    end if;

    begin
      update public.profiles set id = gen_random_uuid() where id = v_member;
      raise exception 'FAIL: client reassigned a profile owner, even as admin.';
    exception when insufficient_privilege then null;
    end;

    execute 'reset role';
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    execute 'set local role anon';
    update public.profiles set role = 'admin' where id = v_member;
    get diagnostics v_count = row_count;
    if v_count <> 0 then raise exception 'FAIL: anonymous user changed a role.'; end if;

    execute 'reset role';
    perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
    execute 'set local role service_role';
    update public.profiles set role = 'admin' where id = v_member;
    get diagnostics v_count = row_count;
    if v_count <> 1 then raise exception 'FAIL: trusted backend maintenance was blocked.'; end if;
    update public.profiles set role = 'user' where id = v_member;

    execute 'reset role';
    perform set_config('request.jwt.claims', '{}', true);
    update public.profiles set role = 'admin' where id = v_member;
    get diagnostics v_count = row_count;
    if v_count <> 1 then raise exception 'FAIL: database owner maintenance was blocked.'; end if;

    raise exception using errcode = 'Z0001', message = 'Rollback successful role guard tests';
  exception when sqlstate 'Z0001' then
    get stacked diagnostics v_message = message_text;
    if v_message <> 'Rollback successful role guard tests' then raise; end if;
  end;
end;
$tests$;

select 'PASS: member escalation, INSERT/UPSERT/NULL/metadata bypasses, ownership, profile editing, admin management, anonymous denial and trusted maintenance; every mutation rolled back.' as result;
