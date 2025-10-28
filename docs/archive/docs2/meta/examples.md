# Example Data and Scenarios

## Summary
Example payloads and flows for developers testing JINK features.

### Example Scan Event
```
POST /scan/identify
{
  "user_id": "123e",
  "image": "base64",
  "gps": {"lat": 48.8566, "lng": 2.3522}
}
```
→ Returns building match and XP delta.

### Example Derive Start
```
POST /route/derive
{
  "user_id": "123e",
  "start_geo": {"lat": 48.85, "lng": 2.35},
  "duration_minutes": 45
}
```
→ Returns ordered stops.

### Example XP Update
```
POST /xp/update
{
  "user_id": "123e", "xp_delta": 25, "reason": "scan"
}
```
→ Returns new total XP and orb pulse info.

> *Examples turn abstraction into muscle memory.*
