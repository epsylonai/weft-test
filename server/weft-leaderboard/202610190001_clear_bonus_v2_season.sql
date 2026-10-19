-- PREPARED ONLY: Claude applies during the server-first v6.23 publish window.
-- The archive is private, byte-preserving and idempotent. No client permission.
begin;
create table if not exists private.scores_before_clear_v2 (like private.scores including all);
insert into private.scores_before_clear_v2 select * from private.scores where version <> '6.23'
on conflict (id) do nothing;
-- Abort instead of deleting an unarchived score if a prior partial manual change
-- reused an id with different content. A matching archive must cover every row.
do $$ begin
 if exists(select 1 from private.scores s where s.version <> '6.23' and not exists(
  select 1 from private.scores_before_clear_v2 a where to_jsonb(a)=to_jsonb(s)))
 then raise exception 'Clear-v2 archive is incomplete; no reset performed'; end if;
end $$;
delete from private.scores where version <> '6.23';
-- The server replay verifies every field; this DB boundary also prevents an old
-- deployed handler from inserting incomparable scores after the reset.
alter table private.scores drop constraint if exists scores_current_clear_v2;
alter table private.scores add constraint scores_current_clear_v2 check(version='6.23');
revoke all on private.scores_before_clear_v2 from public,anon,authenticated;
commit;
