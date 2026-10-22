-- B-052 PREPARED ONLY. No reset, deletion, rewrite or ranking change.
-- Historical season rows remain exact; endless Classic is explicitly identifiable.
alter table private.scores drop constraint if exists scores_current_clear_v2;
alter table private.scores add constraint scores_current_clear_v2
  check (version in ('6.23','6.24.14'));
