set local statement_timeout = '15s';

-- Existing active scratch activations must issue the percentage promised by
-- each choice label instead of copying the form-wide default to every choice.
with normalized_choices as (
  select
    a.id,
    jsonb_agg(
      case
        when upper(coalesce(choice->>'reward_type', choice->>'benefit_type', '')) = 'PERCENT_DISCOUNT'
          and substring(coalesce(choice->>'reward_label', choice->>'label', '') from '(\d+(?:[.,]\d+)?)\s*%') is not null
          and replace(substring(coalesce(choice->>'reward_label', choice->>'label', '') from '(\d+(?:[.,]\d+)?)\s*%'), ',', '.')::numeric > 0
          and replace(substring(coalesce(choice->>'reward_label', choice->>'label', '') from '(\d+(?:[.,]\d+)?)\s*%'), ',', '.')::numeric <= 100
        then jsonb_set(
          choice,
          '{reward_value,percent}',
          to_jsonb(replace(substring(coalesce(choice->>'reward_label', choice->>'label', '') from '(\d+(?:[.,]\d+)?)\s*%'), ',', '.')::numeric),
          true
        )
        else choice
      end
      order by ordinal
    ) as choices
  from interactive_activations a
  cross join lateral jsonb_array_elements(a.reward_config->'choices') with ordinality as expanded(choice, ordinal)
  where a.activation_type = 'SCRATCH_WIN'
    and a.status = 'active'
    and jsonb_typeof(a.reward_config->'choices') = 'array'
  group by a.id
)
update interactive_activations a
set reward_config = jsonb_set(a.reward_config, '{choices}', normalized_choices.choices, false)
from normalized_choices
where a.id = normalized_choices.id
  and a.reward_config->'choices' is distinct from normalized_choices.choices;

-- Correct only unredeemed rewards and QRs. Redeemed history remains immutable.
with active_candidates as (
  select
    ar.id as reward_id,
    q.id as qr_code_id,
    replace(substring(ar.reward_label from '(\d+(?:[.,]\d+)?)\s*%'), ',', '.')::numeric as promised_percent
  from interactive_activation_rewards ar
  join interactive_activations a on a.id = ar.activation_id
  join qr_codes q on q.id = ar.qr_code_id
  where a.activation_type = 'SCRATCH_WIN'
    and ar.reward_type = 'PERCENT_DISCOUNT'
    and ar.status = 'active'
    and q.status = 'ACTIVE'
    and jsonb_typeof(ar.reward_value) = 'object'
    and substring(ar.reward_label from '(\d+(?:[.,]\d+)?)\s*%') is not null
    and replace(substring(ar.reward_label from '(\d+(?:[.,]\d+)?)\s*%'), ',', '.')::numeric > 0
    and replace(substring(ar.reward_label from '(\d+(?:[.,]\d+)?)\s*%'), ',', '.')::numeric <= 100
), updated_rewards as (
  update interactive_activation_rewards ar
  set reward_value = jsonb_set(ar.reward_value, '{percent}', to_jsonb(active_candidates.promised_percent), true)
  from active_candidates
  where ar.id = active_candidates.reward_id
    and ar.reward_value->>'percent' is distinct from active_candidates.promised_percent::text
  returning ar.id
)
update qr_codes q
set benefit_value = jsonb_set(q.benefit_value, '{value,percent}', to_jsonb(active_candidates.promised_percent), true)
from active_candidates
where q.id = active_candidates.qr_code_id
  and q.status = 'ACTIVE'
  and jsonb_typeof(q.benefit_value->'value') = 'object'
  and q.benefit_value->'value'->>'percent' is distinct from active_candidates.promised_percent::text;
