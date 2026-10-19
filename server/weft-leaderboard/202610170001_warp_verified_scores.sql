-- Add two mode-separated score categories. Existing rows, identities, proofs,
-- hidden flags, rate policy and unique(device_id,kind,proof_id) stay intact.
alter table private.scores drop constraint if exists scores_kind_check;
alter table private.scores add constraint scores_kind_check
  check (kind in ('daily','run','board','chain','warp-run','warp-board'));

create or replace view public.leaderboard_top20
with (security_barrier=true,security_invoker=true) as
with player_best as (
  select s.*,row_number() over(partition by device_id,kind,case when kind='daily' then daily_date end
    order by case when kind in ('run','warp-run') then level_reached when kind='chain' then longest_chain else 0 end desc,
    score desc,created_at asc,id asc) as player_position from private.scores s where not s.hidden
), ranked as (
  select *,row_number() over(partition by kind,case when kind='daily' then daily_date end
    order by case when kind in ('run','warp-run') then level_reached when kind='chain' then longest_chain else 0 end desc,
    score desc,created_at asc,id asc) as rank from player_best where player_position=1
)
select id,name,kind,score,level_reached,longest_chain,seed,version,daily_date,created_at,rank from ranked where rank<=20;
revoke all on public.leaderboard_top20 from public,anon,authenticated;

create or replace function public.weft_leaderboard_page(p_kind text,p_day date,p_device uuid) returns jsonb
language sql security definer set search_path='' as $$
with best as (
  select s.*,row_number() over(partition by device_id order by
    case when p_kind in ('run','warp-run') then level_reached when p_kind='chain' then longest_chain else 0 end desc,score desc,created_at asc,id asc) as own
  from private.scores s where not s.hidden and kind=p_kind and (p_kind<>'daily' or daily_date=p_day)
), ranked as (
  select *,row_number() over(order by case when p_kind in ('run','warp-run') then level_reached when p_kind='chain' then longest_chain else 0 end desc,score desc,created_at asc,id asc) as position
  from best where own=1
), projected as (
  select position,device_id,jsonb_build_object('id',id,'name',name,'isYou',device_id=p_device,'rank',position,'score',score,
    'levelReached',level_reached,'longestChain',longest_chain,'date',created_at,'version',version,'seed',seed) as row from ranked
)
select jsonb_build_object('kind',p_kind,'scope','global','date',p_day,'verifiedCount',(select count(*) from best where own=1),
  'rows',coalesce((select jsonb_agg(row order by position) from projected where position<=20),'[]'::jsonb),
  'you',(select row from projected where device_id=p_device));
$$;
revoke all on function public.weft_leaderboard_page(text,date,uuid) from public,anon,authenticated;
grant execute on function public.weft_leaderboard_page(text,date,uuid) to service_role;
