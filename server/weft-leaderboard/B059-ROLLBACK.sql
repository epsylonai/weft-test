-- OWNER ONLY optional rollback; re-pin sealed5213 authority before reopening20.
-- No score or badge is deleted. This restores pre-reset visibility exactly.
begin;
lock table private.scores in share row exclusive mode;
-- Preserve but hide every post-reset row, including unchanged Daily/Warp versions.
update private.scores s set hidden=true where not exists(
 select 1 from private.b059_scores_archive a where a.score_id=s.id);
update private.scores s set hidden=(a.row_data->>'hidden')::boolean
 from private.b059_scores_archive a where s.id=a.score_id;
-- Keep the widened constraint so all retained old/new rows remain valid.
commit;
