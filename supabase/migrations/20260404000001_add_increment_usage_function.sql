create or replace function increment_usage(
  p_user_id uuid,
  p_feature text,
  p_period_start timestamptz,
  p_period_end timestamptz
) returns void as $$
begin
  insert into usage_tracking (user_id, feature, count, period_start, period_end)
  values (p_user_id, p_feature, 1, p_period_start, p_period_end)
  on conflict (user_id, feature, period_start)
  do update set count = usage_tracking.count + 1;
end;
$$ language plpgsql security definer;
