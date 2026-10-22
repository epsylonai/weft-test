-- B-058 v6.24.20. Additive public-version admission only.
-- Live002/004/005 already applied. No reset, hide, archive or badge changes.
begin;
alter table private.scores drop constraint if exists scores_current_clear_v2;
alter table private.scores add constraint scores_current_clear_v2
 check(version in ('6.23','6.24.14','6.24.16','6.24.17','6.24.18','6.24.19','6.24.20'));
commit;
