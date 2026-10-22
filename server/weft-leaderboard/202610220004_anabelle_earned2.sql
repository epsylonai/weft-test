-- B-056 Anabelle badge/projection. PREPARED ONLY; Claude applies server-first.
-- Apply B055 archive+hide once before this migration. No new season/reset here.
-- All three permanent badges coexist; verified run results are the only award source.
begin;
alter table private.badges drop constraint if exists badges_badge_check;
alter table private.badges add constraint badges_badge_check
 check (badge in ('hugo-secret','window-secret','anabelle-secret'));
comment on table private.badges is 'Permanent Weft badges from server-verified Classic run results. Hugo, Window and Anabelle survive score-season resets.';
alter table private.scores drop constraint if exists scores_current_clear_v2;
alter table private.scores add constraint scores_current_clear_v2
 check(version in ('6.23','6.24.14','6.24.16','6.24.17','6.24.18'));
create or replace function private.weft_award_badges() returns trigger
language plpgsql security definer set search_path = '' as $fn$
begin
 begin
  if new.kind='run' and new.device_id is not null and new.moves#>'{hugo,result,cleared}'='true'::jsonb then
   insert into private.badges(device_id,badge,score_id,proof_id,earned_at)
   values(new.device_id,'hugo-secret',new.id,new.proof_id,coalesce(new.created_at,now()))
   on conflict(device_id,badge) do nothing;
  end if;
 exception when others then null; end;
 begin
  if new.kind='run' and new.device_id is not null and new.moves#>'{window,result,cleared}'='true'::jsonb then
   insert into private.badges(device_id,badge,score_id,proof_id,earned_at)
   values(new.device_id,'window-secret',new.id,new.proof_id,coalesce(new.created_at,now()))
   on conflict(device_id,badge) do nothing;
  end if;
 exception when others then null; end;
 begin
  if new.kind='run' and new.device_id is not null and new.moves#>'{anabelle,result,cleared}'='true'::jsonb then
   insert into private.badges(device_id,badge,score_id,proof_id,earned_at)
   values(new.device_id,'anabelle-secret',new.id,new.proof_id,coalesce(new.created_at,now()))
   on conflict(device_id,badge) do nothing;
  end if;
 exception when others then null; end;
 return null;
end
$fn$;
revoke all on function private.weft_award_badges() from public,anon,authenticated;
drop trigger if exists scores_award_badges on private.scores;
create trigger scores_award_badges after insert on private.scores
 for each row execute function private.weft_award_badges();


-- No pre-B056 record has this witness. Backfill is safe and idempotent.
insert into private.badges(device_id,badge,score_id,proof_id,earned_at)
select distinct on(device_id) device_id,'anabelle-secret',id,proof_id,created_at
from private.scores where kind='run' and device_id is not null
 and moves#>'{anabelle,result,cleared}'='true'::jsonb
order by device_id,created_at,id on conflict(device_id,badge) do nothing;
CREATE OR REPLACE FUNCTION public.weft_leaderboard_page(p_kind text, p_day date, p_device uuid)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
with params as (
  select case when p_kind='run-score' then 'run' when p_kind='warp-run-score' then 'warp-run' else p_kind end as row_kind,
         p_kind in ('run','warp-run') as by_level,
         p_kind in ('run-score','warp-run-score') as by_score_then_level,
         p_kind='chain' as by_chain
), best as (
  select s.*,row_number() over(partition by device_id order by
    case when (select by_level from params) then level_reached when (select by_chain from params) then longest_chain else 0 end desc,
    score desc,
    case when (select by_score_then_level from params) then level_reached else 0 end desc,
    created_at asc,id asc) as own
  from private.scores s where not s.hidden and kind=(select row_kind from params) and (p_kind<>'daily' or daily_date=p_day)
), ranked as (
  select *,row_number() over(order by
    case when (select by_level from params) then level_reached when (select by_chain from params) then longest_chain else 0 end desc,
    score desc,
    case when (select by_score_then_level from params) then level_reached else 0 end desc,
    created_at asc,id asc) as position
  from best where own=1
), projected as (
  select position,device_id,jsonb_build_object('id',id,'name',name,'isYou',device_id=p_device,'rank',position,'score',score,
    'levelReached',level_reached,'longestChain',longest_chain,'date',created_at,'version',version,'seed',seed,
    'secretBadge',exists(select 1 from private.badges b where b.device_id=ranked.device_id and b.badge='hugo-secret'),
    'windowBadge',exists(select 1 from private.badges b where b.device_id=ranked.device_id and b.badge='window-secret'),
    'anabelleBadge',exists(select 1 from private.badges b where b.device_id=ranked.device_id and b.badge='anabelle-secret')) as row from ranked
)
select jsonb_build_object('kind',p_kind,'scope','global','date',p_day,'verifiedCount',(select count(*) from best where own=1),
  'rows',coalesce((select jsonb_agg(row order by position) from projected where position<=20),'[]'::jsonb),
  'you',(select row from projected where device_id=p_device));
$function$;

revoke all on function public.weft_leaderboard_page(text,date,uuid) from public,anon,authenticated;
grant execute on function public.weft_leaderboard_page(text,date,uuid) to service_role;

commit;
