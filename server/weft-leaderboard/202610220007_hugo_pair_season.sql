-- PREPARED ONLY: owner applies once, server first. All badges remain untouched.
begin;
lock table private.scores in share row exclusive mode;
create table if not exists private.b059_scores_archive (
 score_id uuid primary key, row_data jsonb not null, archived_at timestamptz not null default now()
);
create table if not exists private.b059_season_reset (
 singleton boolean primary key default true check(singleton), completed_at timestamptz not null default now()
);
revoke all on private.b059_scores_archive,private.b059_season_reset from public,anon,authenticated;
do $$ begin
 if not exists(select 1 from private.b059_season_reset where singleton) then
  insert into private.b059_scores_archive(score_id,row_data) select id,to_jsonb(s) from private.scores s
   on conflict(score_id) do nothing;
  if exists(select 1 from private.scores s where not exists(
   select 1 from private.b059_scores_archive a where a.score_id=s.id and a.row_data=to_jsonb(s)))
   then raise exception 'B059 archive mismatch: no rows hidden'; end if;
  update private.scores set hidden=true;
  insert into private.b059_season_reset(singleton) values(true);
 end if;
end $$;
-- Actual LIVE constraint. Hidden historical rows stay valid after the new wipe.
alter table private.scores drop constraint if exists scores_current_clear_v2;
alter table private.scores add constraint scores_current_clear_v2 check(version in ('6.23','6.24.14','6.24.16','6.24.17','6.24.18','6.24.19','6.24.20','6.24.21'));
commit;
