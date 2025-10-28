# AR Overlay Confirmation

## Summary
When user reaches a stop, show a subtle AR frame that snaps when the correct facade aligns.

## Behavior
- Edge detection + horizon check; tolerance ±8°
- When match plausible, outline highlights and capture prompt shows
- If mismatch persists: show “Step back 2m” hint with arrow

## Performance
- Run at 15 Hz; throttle to 8 Hz on low battery
- Disable on older devices; fall back to 2D overlay
