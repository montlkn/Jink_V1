# Subscriptions and Entitlements

## Summary
Defines Free vs Pro, entitlements, billing integration, and enforcement. XP is orthogonal; subscription only widens feature access and multipliers.

## Tables
- plans: id, name (Free, Pro), price_monthly, trial_days, features_json.
- subscriptions: id, user_id, plan_id, status (active, past_due, canceled), current_period_end, provider (stripe), provider_sub_id.
- entitlements: id, user_id, key (deep_dive_credits, custom_derives, orb_customization), value, updated_at.

## Flow
- On purchase: webhook upserts subscription row; sets status active; grants default entitlements per plan.
- On renewal or cancel: webhook updates status and recalculates entitlements.
- In app: check entitlements cache first; refresh via /entitlements/refresh endpoint daily or on 401.

## Enforcement
- Pro-only actions call an entitlement check edge function. If false, return SUBSCRIPTION_REQUIRED with a message including the benefit mapping.

## Grace
- If subscription lapses, creator unlocks remain visible but disabled; user can still view their past content.



## Webhooks & Entitlements Addendum

### Webhooks
- /webhooks/stripe
  - events: checkout.session.completed, invoice.payment_succeeded, customer.subscription.deleted
  - action: upsert subscriptions row, recompute entitlements

### Entitlement Map (Pro)
- deep_dive_credits: +1 / 1000 XP
- xp_multipliers: { scan:1.2, derive:1.25, quest:1.3, contrib:1.4 }
- create_public_quests: true
- orb_modulation: true
