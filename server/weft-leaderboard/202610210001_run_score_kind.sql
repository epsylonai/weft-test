-- B-050 · "Best score" leaderboard kind. Owner 2026-10-21 08:56: the default high-score board ranks run totals purely by points.
-- Adds two READ-ONLY projection kinds to public.weft_leaderboard_page: 'run-score' (Classic run rows ranked by score, level as tiebreaker)
-- and 'warp-run-score' (Warp run rows likewise). Existing kinds keep their exact ordering. No table change, no data change,
-- no new write path, no wipe. Idempotent (CREATE OR REPLACE).
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
    'windowBadge',exists(select 1 from private.badges b where b.device_id=ranked.device_id and b.badge='window-secret')) as row from ranked
)
select jsonb_build_object('kind',p_kind,'scope','global','date',p_day,'verifiedCount',(select count(*) from best where own=1),
  'rows',coalesce((select jsonb_agg(row order by position) from projected where position<=20),'[]'::jsonb),
  'you',(select row from projected where device_id=p_device));
$function$;

revoke all on function public.weft_leaderboard_page(text,date,uuid) from public,anon,authenticated;
grant execute on function public.weft_leaderboard_page(text,date,uuid) to service_role;
