-- Seed the shared-reference moat tables from the corpus. Honest provenance:
-- source_tier reflects whether a number is hard data, survey, or practitioner
-- opinion. comparable_cohort ships with n_count = 0 so the engine renders in
-- "benchmark says" mode until real consented user paths accrue. Idempotent via a
-- delete-then-insert on the corpus-sourced rows.

delete from benchmarks where source_ref like 'corpus:%';
delete from landmines where source_ref like 'corpus:%';
delete from comparable_cohort where source = 'corpus';

-- ---- benchmarks ----
insert into benchmarks (metric, function, niche, stage, value_low, value_mid, value_high, unit, source_tier, source_ref) values
  ('retainer_band', 'marketing', null, 'seasoned', 10000, 14000, 18000, 'usd_per_month', 'survey', 'corpus:retainers'),
  ('retainer_band', 'finance',   null, 'seasoned', 10000, 14000, 18000, 'usd_per_month', 'survey', 'corpus:retainers'),
  ('retainer_band', null,        null, 'seasoned', 10000, 14000, 18000, 'usd_per_month', 'survey', 'corpus:retainers'),
  ('income_curve_y1', null, null, 'new', 50000, 85000, 120000, 'usd_per_year', 'survey', 'corpus:income_y1'),
  ('income_curve_y2', null, null, 'new', 150000, 200000, 250000, 'usd_per_year', 'survey', 'corpus:income_y2'),
  ('referral_share', null, null, null, 0.928, 0.928, 0.928, 'fraction_of_pipeline', 'survey', 'corpus:channels'),
  ('cold_outreach_share', null, null, null, 0.192, 0.192, 0.192, 'fraction_of_pipeline', 'survey', 'corpus:channels'),
  ('time_to_three_clients_niched', null, null, 'new', 4, 5, 6, 'months', 'expert_opinion', 'corpus:niche_speed'),
  ('time_to_three_clients_generalist', null, null, 'new', 9, 11, 14, 'months', 'expert_opinion', 'corpus:niche_speed'),
  ('fixed_scope_close_speedup', null, null, null, 3, 3, 3, 'x_vs_hourly', 'expert_opinion', 'corpus:fixed_scope'),
  ('anchor_concentration_risk', null, null, 'seasoned', 0.50, 0.50, 0.50, 'fraction_of_revenue', 'expert_opinion', 'corpus:concentration'),
  ('three_client_plateau', null, null, 'seasoned', 40000, 50000, 60000, 'usd_per_month', 'survey', 'corpus:plateau'),
  ('generic_positioning_reach', 'marketing', null, 'new', 100000, 100000, 100000, 'people_on_linkedin', 'expert_opinion', 'corpus:generic');

-- ---- landmines ----
insert into landmines (fork_domain, function, niche, trigger_position, name, description, survivor_pattern, source_ref) values
  ('icp_positioning', null, null, 'pre_second_client', 'The month-6 crisis', 'Runway is half gone and the second client has not arrived; the identity questions resurface.', 'Survivors had a second warm conversation already moving by month four.', 'corpus:month6'),
  ('icp_positioning', null, null, 'pre_niche', 'Niche paralysis', 'Trying to serve everyone for 3 to 6 months, getting commoditised, then niching under pressure.', 'Committed to a vertical wedge by month four; reached three clients about twice as fast.', 'corpus:niche_paralysis'),
  ('offer_pricing', null, null, 'first_offer', 'The under-pricing trap', 'Quoting under $8K to win the first client, then unable to raise the rate for a year.', 'Priced a fixed-scope package at the lane median from the start.', 'corpus:underprice'),
  ('scaling_leverage', null, null, 'three_client_plateau', 'The three-client ceiling', 'Stuck at three clients and ~65% capacity with no path to grow without more hours.', 'Productised the highest-repeat engagement before adding a pod.', 'corpus:plateau'),
  ('scaling_leverage', null, null, 'anchor_dependence', 'Anchor concentration', 'One client is more than half of revenue; losing them is existential.', 'De-risked the anchor before taking attention off delivery.', 'corpus:concentration'),
  ('network_strategy', null, null, 'referral_saturation', 'Network saturation', 'The warm referral pool runs dry 12 to 24 months in with no automated replacement.', 'Built a second channel before the well ran dry.', 'corpus:saturation');

-- ---- comparable_cohort (n_count 0 => "benchmark says" framing) ----
insert into comparable_cohort (function, niche, stage_band, tenure_band, revenue_band, motivation_type, fork_domain, decision_sequence, what_they_chose, what_happened, source, source_ref, n_count, confidence) values
  ('marketing', 'b2b_saas_series_b', 'new_pre_second', 'first_year', 'ramping', 'pulled', 'icp_positioning',
    '["exit","niche","first_offer","first_client"]'::jsonb,
    'Narrowed to B2B SaaS Series B with broken demand gen by month four',
    'Reached three clients in about five months, roughly twice the generalist pace',
    'corpus', 'corpus:new_cmo_niche', 0, 0.6),
  ('marketing', 'b2b_saas_series_b', 'new_pre_offer', 'first_year', 'ramping', 'pulled', 'offer_pricing',
    '["niche","first_offer"]'::jsonb,
    'Packaged a fixed-scope 90-day demand-gen reset at the lane median',
    'Closed roughly three times faster than an hourly retainer',
    'corpus', 'corpus:new_cmo_pricing', 0, 0.5),
  ('revenue', null, 'seasoned_plateau', 'year_three_plus', 'forty_to_sixty_k', 'pulled', 'scaling_leverage',
    '["three_clients","productize","pod_or_equity"]'::jsonb,
    'Productised the highest-repeat engagement before building a pod',
    'Broke the three-client ceiling without trading more hours',
    'corpus', 'corpus:seasoned_cro_scale', 0, 0.6),
  ('finance', null, 'new_pre_second', 'first_year', 'ramping', 'pushed', 'network_strategy',
    '["exit","first_client","network_activation"]'::jsonb,
    'Reactivated former colleagues and bankers for warm intros',
    'Second client came from a referral, not cold outreach',
    'corpus', 'corpus:new_cfo_network', 0, 0.5);
