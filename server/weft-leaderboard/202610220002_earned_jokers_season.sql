-- PREPARED ONLY. Apply once in the server-first B-055 window, never from client.
-- Every old row is archived byte-for-byte and hidden; no score or badge is deleted.
begin;
-- Block concurrent inserts/updates until the verified snapshot and hide commit.
lock table private.scores in share row exclusive mode;
create table if not exists private.b055_scores_archive (
 score_id uuid primary key, row_data jsonb not null, archived_at timestamptz not null default now()
);
create table if not exists private.b055_season_reset (
 singleton boolean primary key default true check(singleton), completed_at timestamptz not null default now()
);
revoke all on private.b055_scores_archive,private.b055_season_reset from public,anon,authenticated;
do $$ begin
 if not exists(select 1 from private.b055_season_reset where singleton) then
  insert into private.b055_scores_archive(score_id,row_data) select id,to_jsonb(s) from private.scores s
   on conflict(score_id) do nothing;
  if exists(select 1 from private.scores s where not exists(
   select 1 from private.b055_scores_archive a where a.score_id=s.id and a.row_data=to_jsonb(s)))
   then raise exception 'B055 archive mismatch: no rows hidden'; end if;
  update private.scores set hidden=true;
  insert into private.b055_season_reset(singleton) values(true);
 end if;
end $$;
-- Archived rows remain in place, so retain both historical markers. The Edge
-- verifier admits new Classic writes only with the earned-1 replay authority.
alter table private.scores drop constraint if exists scores_current_clear_v2;
alter table private.scores add constraint scores_current_clear_v2 check(version in ('6.23','6.24.14','6.24.16'));
commit;
