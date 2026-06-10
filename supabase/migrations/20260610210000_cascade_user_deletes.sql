-- Auth user deletion was impossible: five tables hold FKs to auth.users with
-- NO ACTION, and a signup trigger inserts a subscriptions row for every new
-- user, so DELETE /auth/v1/admin/users/{id} (and the dashboard delete button)
-- always failed with 23503. Convert them to ON DELETE CASCADE.
-- data_subject_requests stays ON DELETE SET NULL on purpose: GDPR request
-- records must survive the erasure they document.

alter table public.subscriptions
  drop constraint subscriptions_user_id_fkey,
  add constraint subscriptions_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.clients
  drop constraint clients_user_id_fkey,
  add constraint clients_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.activity_logs
  drop constraint activity_logs_user_id_fkey,
  add constraint activity_logs_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.weekly_summaries
  drop constraint weekly_summaries_user_id_fkey,
  add constraint weekly_summaries_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.usage_tracking
  drop constraint usage_tracking_user_id_fkey,
  add constraint usage_tracking_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;
