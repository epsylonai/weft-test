-- PREPARED ONLY. Use only with the previous756acac0 handler/bundle and old client.
-- Preserve any new-season rows before restoring the old season.
begin;
create table if not exists private.scores_clear_v2_rollback_archive (like private.scores including all);
insert into private.scores_clear_v2_rollback_archive select * from private.scores where version='6.23'
on conflict(id) do nothing;
do $$ begin
 if exists(select 1 from private.scores s where s.version='6.23' and not exists(
  select 1 from private.scores_clear_v2_rollback_archive a where to_jsonb(a)=to_jsonb(s)))
 then raise exception 'Rollback archive is incomplete'; end if;
end $$;
alter table private.scores drop constraint if exists scores_current_clear_v2;
delete from private.scores where version='6.23';
insert into private.scores select * from private.scores_before_clear_v2 on conflict(id) do nothing;
revoke all on private.scores_clear_v2_rollback_archive from public,anon,authenticated;
commit;
