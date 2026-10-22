-- OWNER ONLY, optional rollback. No deletion/recalculation; badges untouched.
-- Re-pin the prior40ea4cf1 Edge bundle before reopening old Classic submissions.
begin;
lock table private.scores in share row exclusive mode;
-- Keep every post-reset row (Classic, Daily and Warp) for a later re-enable,
-- but remove them from visible ranks. Daily/Warp keep their6.23 version marker.
update private.scores s set hidden=true where not exists(
 select 1 from private.b055_scores_archive a where a.score_id=s.id); 
-- Restore exactly the visibility each archived pre-B055 row had before reset.
update private.scores s set hidden=(a.row_data->>'hidden')::boolean
 from private.b055_scores_archive a where s.id=a.score_id;
-- The widened version constraint is intentionally retained: both old and new
-- archived rows are preserved and must remain valid. No public table grants.
commit;
