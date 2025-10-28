# Animation States and Constants

## Summary
Shared constants to keep motion coherent and debuggable.

## Constants
- DUR_SHORT 120 ms, DUR_MED 180 ms, DUR_LONG 260 ms.
- EASE_IN_OUT cubic with gentle overshoot for success states.
- HAPTIC_TAP light on press; HAPTIC_SUCCESS medium on scan success.

## State Map
- ORB_IDLE, ORB_PRESS, ORB_PROCESSING, ORB_SUCCESS, ORB_FAIL.
- Use a simple finite state machine; transitions guarded by debounce windows.

