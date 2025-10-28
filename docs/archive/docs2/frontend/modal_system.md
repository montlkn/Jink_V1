# Modal System (Sheets and Overlays)

## Summary
Defines bottom sheets and full-screen modals for search, contribute, and summaries.

## Rules
- Single stack; no nested sheets.
- Backdrop blur strength reflects context importance.
- Swipe-to-dismiss threshold is 35% height or velocity trigger.

## Components
- BaseSheet: header, content slot, safe area.
- ActionSheet: quick actions with icons.
- ConfirmSheet: two-step confirmation for destructive actions.

