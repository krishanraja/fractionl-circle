-- Cache the ranked living inner circle on the_read, keyed by the fork it was
-- ranked for. Re-ranked when the lit fork changes (direction change); read cheaply
-- on every Path paint. Additive, idempotent.
alter table the_read add column if not exists inner_circle jsonb;
alter table the_read add column if not exists inner_circle_fork text;
