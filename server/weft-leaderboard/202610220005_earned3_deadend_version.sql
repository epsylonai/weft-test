-- B-057 v6.24.19. Additive admission only. Live002 reset +004 badge migration
-- have already been applied; do NOT reset/archive/hide any rows again.
begin;
alter table private.scores drop constraint if exists scores_current_clear_v2;
alter table private.scores add constraint scores_current_clear_v2
 check(version in ('6.23','6.24.14','6.24.16','6.24.17','6.24.18','6.24.19'));
commit;
