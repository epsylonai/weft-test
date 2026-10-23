-- PREPARED ONLY. Add private player-code backup; no score, badge or rank mutation.
begin;
create table if not exists private.player_transfers (
 device_id uuid primary key,
 revision bigint not null check(revision between 1 and 9007199254740991),
 snapshot jsonb not null check(jsonb_typeof(snapshot)='object'),
 updated_at timestamptz not null default now()
);
alter table private.player_transfers enable row level security;
revoke all on private.player_transfers from public,anon,authenticated;
create table if not exists private.player_transfer_rate (
 bucket text not null, action text not null check(action in ('read','write')),
 window_start timestamptz not null, attempts integer not null,
 primary key(bucket,action)
);
alter table private.player_transfer_rate enable row level security;
revoke all on private.player_transfer_rate from public,anon,authenticated;

create or replace function public.weft_take_player_token(p_device uuid,p_action text) returns boolean
language plpgsql security definer set search_path='' as $$
declare permitted boolean; device_limit integer; global_limit integer;
begin
 if p_device is null or p_device::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' or p_action is null or p_action not in ('read','write') then return false; end if;
 device_limit:=case when p_action='read' then 60 else 12 end;
 global_limit:=case when p_action='read' then 600 else 120 end;
 insert into private.player_transfer_rate as r values('all',p_action,now(),1)
 on conflict(bucket,action) do update set
  attempts=case when r.window_start<now()-interval '1 minute' then 1 else least(r.attempts+1,1000000) end,
  window_start=case when r.window_start<now()-interval '1 minute' then now() else r.window_start end
 returning attempts<=global_limit into permitted;
 if not permitted then return false; end if;
 insert into private.player_transfer_rate as r values(p_device::text,p_action,now(),1)
 on conflict(bucket,action) do update set
  attempts=case when r.window_start<now()-interval '1 minute' then 1 else least(r.attempts+1,1000000) end,
  window_start=case when r.window_start<now()-interval '1 minute' then now() else r.window_start end
 returning attempts<=device_limit into permitted;
 return permitted;
end $$;
revoke all on function public.weft_take_player_token(uuid,text) from public,anon,authenticated;
grant execute on function public.weft_take_player_token(uuid,text) to service_role;

create or replace function public.weft_player_write(p_device uuid,p_expected_revision bigint,p_snapshot jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare current_revision bigint; changed bigint;
begin
 if coalesce((p_device is null or p_expected_revision is null or p_snapshot is null or p_device::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  or p_expected_revision<0 or p_expected_revision>=9007199254740991
  or jsonb_typeof(p_snapshot)<>'object' or p_snapshot->>'schemaVersion'<>'1'
  or jsonb_typeof(p_snapshot->'schemaVersion')<>'number'
  or (p_snapshot->>'deviceId')::uuid<>p_device
  or jsonb_typeof(p_snapshot->'savedAt')<>'number'
  or (p_snapshot->>'savedAt')::numeric<0 or (p_snapshot->>'savedAt')::numeric>9007199254740991
  or floor((p_snapshot->>'savedAt')::numeric)<>(p_snapshot->>'savedAt')::numeric
  or jsonb_typeof(p_snapshot->'values')<>'object'
  or (p_snapshot ? 'mirrors' and jsonb_typeof(p_snapshot->'mirrors')<>'object')
  or exists(select 1 from jsonb_object_keys(p_snapshot) k where k not in ('schemaVersion','deviceId','savedAt','values','mirrors'))
  -- Edge cap is8MiB compactJSON; allow only JSONB separator whitespace overhead.
  or octet_length(convert_to(p_snapshot::text,'UTF8'))>8396800
),true) then raise exception 'Invalid player snapshot'; end if;
 if (select count(*) from jsonb_each(p_snapshot->'values'))>128
  or (select count(*) from jsonb_each(coalesce(p_snapshot->'mirrors','{}'::jsonb)))>32
  or exists(select 1 from jsonb_each(p_snapshot->'values') e where jsonb_typeof(e.value)<>'string' or length(e.key) not between 1 and 256 or e.key in ('__proto__','constructor','prototype'))
  or exists(select 1 from jsonb_each(coalesce(p_snapshot->'mirrors','{}'::jsonb)) e where jsonb_typeof(e.value)<>'string' or length(e.key) not between 1 and 256 or e.key in ('__proto__','constructor','prototype'))
 then raise exception 'Invalid player snapshot maps'; end if;
 -- Conditional UPDATE is atomic: a stale writer cannot overwrite a new revision.
 update private.player_transfers set revision=revision+1,snapshot=p_snapshot,updated_at=now()
 where device_id=p_device and revision=p_expected_revision returning revision into changed;
 if found then return jsonb_build_object('accepted',true,'deviceId',p_device,'revision',changed); end if;
 if p_expected_revision=0 then
  insert into private.player_transfers(device_id,revision,snapshot) values(p_device,1,p_snapshot)
  on conflict(device_id) do nothing returning revision into changed;
  if found then return jsonb_build_object('accepted',true,'deviceId',p_device,'revision',changed); end if;
 end if;
 select revision into current_revision from private.player_transfers where device_id=p_device;
 return jsonb_build_object('conflict',true,'revision',coalesce(current_revision,0));
end $$;
revoke all on function public.weft_player_write(uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.weft_player_write(uuid,bigint,jsonb) to service_role;

create or replace function public.weft_player_read(p_device uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare backup private.player_transfers%rowtype; own_name text; highest integer; badges jsonb; rows jsonb;
begin
 if p_device is null or p_device::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then raise exception 'Invalid player key'; end if;
 select * into backup from private.player_transfers where device_id=p_device;
 select s.name into own_name from private.scores s where s.device_id=p_device order by s.created_at desc,s.id desc limit 1;
 -- Exact saved unlocks take precedence. This is only a legacy numbered-Classic
 -- reach fallback, never Daily/Warp or proof/ranking authority for a custom route.
 select least(10,greatest(1,coalesce(
  (select max(s.level_reached) from private.scores s where s.device_id=p_device and s.kind='run'),
  (select max(s.level_reached) from private.scores s where s.device_id=p_device and s.kind in ('board','chain') and s.daily_date is null and s.moves->>'runVersion' in ('6.7','6.9','6.14','6.24.14')),
  1))) into highest;
 select coalesce(jsonb_agg(b.badge order by b.badge),'[]'::jsonb) into badges from private.badges b where b.device_id=p_device;
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',s.id,'proofId',s.proof_id,'kind',s.kind,'name',s.name,'score',s.score,
  'levelReached',s.level_reached,'longestChain',s.longest_chain,'seed',s.seed,
  'version',s.version,'date',s.created_at,'dailyDate',s.daily_date,
  'hidden',coalesce(s.hidden,false),'archived',coalesce(s.hidden,false)
 ) order by s.created_at desc,s.id desc),'[]'::jsonb) into rows
 from private.scores s where s.device_id=p_device;
 return jsonb_build_object('schemaVersion',1,'deviceId',p_device,'revision',coalesce(backup.revision,0),
  'snapshot',backup.snapshot,'legacy',jsonb_build_object('name',own_name,'highestWorld',highest,'badges',badges,'rows',rows));
end $$;
revoke all on function public.weft_player_read(uuid) from public,anon,authenticated;
grant execute on function public.weft_player_read(uuid) to service_role;
commit;
