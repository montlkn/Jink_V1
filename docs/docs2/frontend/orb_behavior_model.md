The **Orb** is the emotional core of JINK — your silent UI narrator. It reflects the *state* of the user (their aesthetic profile, XP growth) through light, movement, and responsiveness.
Here’s exactly what it displays and how it does it, without any of the poetic hand-waving:

---

## 1. **At Its Core**

The Orb is a **shader-driven visual component**.
It takes real-time inputs from:

* **XP Engine** (user progression and energy)
* **Affinity Engine** (their aesthetic profile vector)
* **Context events** (scan, derive, idle, fail)

These inputs are turned into parameters for:

* **Hue / color spectrum**
* **Brightness and pulse amplitude**
* **Motion turbulence / particle speed**
* **Orb “breathing” rhythm**

---

## 2. **Aesthetic Profile → Hue + Motion Personality**

Each user’s **Affinity Vector (9-dim)**, which represents their taste archetype (Classicist, Modernist, Vernacularist, etc.), drives the orb’s *baseline appearance*.

| Archetype      | Hue             | Behavior            | Notes                   |
| -------------- | --------------- | ------------------- | ----------------------- |
| Classicist     | Warm amber-gold | Slow, graceful      | Calm, balanced pulse    |
| Romantic       | Deep rose       | Gentle flicker      | Subtle shimmer          |
| Stylist        | Magenta-violet  | Rippley             | Reacts strongly to XP   |
| Modernist      | Cyan-blue       | Steady minimal wave | Low saturation          |
| Industrialist  | Burnt orange    | Angular shimmer     | Slight noise            |
| Visionary      | Indigo          | Flows like ink      | Long pulse period       |
| PopCulturalist | Hot pink        | Lively twitch       | Fast-decay bursts       |
| Vernacularist  | Leaf green      | Textured            | Light refraction effect |
| Austerist      | Pale yellow     | Barely moves        | Minimal saturation      |

**The dominant hue = weighted centroid of their vector** (softmax blend of archetype hues).
**Turbulence amplitude** = measure of how “mixed” their profile is (entropy).
– A uniform profile = smooth, stable orb
– A chaotic, eclectic profile = more texture and particle turbulence

---

## 3. **XP System → Pulse, Glow, and Momentum**

XP isn’t just a number. It animates *energy*.

| State                 | Visual Response                                 | Details                                        |
| --------------------- | ----------------------------------------------- | ---------------------------------------------- |
| Idle                  | Slow sinusoidal “breathing”                     | Frequency based on level                       |
| XP Gain               | Orb swells + emits pulse                        | `uScale = 1 + (xp_delta / 120)` capped at 1.12 |
| Level Up              | Burst ripple outward, hue briefly shifts warmer | triggered once per 1000 XP                     |
| Pro User              | Slight lens-flare core, smoother pulse          | signifies mastery                              |
| XP Decay / Inactivity | Breathing slows, brightness fades 20%           | after 3 days no activity                       |

**Level Bands:**

* Level 1-10 → small, gentle pulses
* Level 10-30 → richer hue, faster recovery
* Level 30+ → faint corona glow (visible on dark background)

---

## 4. **Scan Interaction (Camera Events)**

* **On press:** orb compresses slightly (scale 0.9) + white flash bloom.
* **While processing:** swirling noise shader activates; brightness ramps up with CLIP confidence.
* **On success:** hue snaps to the building’s dominant palette for 1 second, then returns.
* **On fail:** hue desaturates and orb flickers with quick shake (0.25s).

---

## 5. **XP + Aesthetic Fusion (the Secret Sauce)**

The orb’s hue, brightness, and motion are all modulated by:

```python
display_hue = blend(user_profile_hue, event_hue, 0.3)
intensity = base_intensity * (1 + xp_level / 100) * confidence
turbulence = entropy(user_vector) * (1 + xp_level / 40)
```

So as users gain XP, the orb becomes slightly brighter, more stable, and visually confident. New users’ orbs feel “breathier” and exploratory; high-XP orbs are calm and assured.

---

## 6. **Dynamic Context Feedback**

| Event                 | Orb Reaction                      | Emotional Cue  |
| --------------------- | --------------------------------- | -------------- |
| Start Derive          | Slow gradient sweep               | anticipation   |
| Reached Stop          | Flash of current archetype hue    | recognition    |
| Added Memory          | Soft inner glow for 2s            | intimacy       |
| Contribution Verified | Subtle upward drift               | pride          |
| Offline Mode          | Desaturates by 40%                | “muted” energy |
| AR Overlay Active     | Orb outlines with faint white rim | focus mode     |

---

## 7. **Technical Summary**

* Implemented as **GLSL / Unity-shader style fragment** using uniforms:

  * `uHue`, `uSaturation`, `uTurbulence`, `uPulseRate`, `uConfidence`, `uXPScale`
* Shader updates every frame based on XP delta events and profile vector
* GPU-light (<2 ms/frame budget on mid devices)
* Fallback to Lottie-based animation if GPU feature unavailable

---

## 8. **Philosophy**

The orb *isn’t a progress bar*. It’s a living mirror of how the user moves through the city and learns to see.
XP shows growth, but the orb shows *character* — it literally looks more composed and luminous as the user’s knowledge deepens.

---

So:

* The **color** = who you are (aesthetic profile).
* The **motion** = how confident you are (XP).
* The **pulse** = what you’re doing right now (context).

That’s how JINK’s orb quietly tells the story of your evolution, without ever needing a menu.
