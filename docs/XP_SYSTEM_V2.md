# XP & Rewards System V2 - Deep Integration Design

## Core Philosophy
XP is the **universal currency of architectural mastery**, not just a side feature. Every interaction earns XP, and XP unlocks everything.

---

## 1. QUEST-EXCLUSIVE REWARDS (Unique Collectibles)

### Quest Stamps vs Regular Stamps
Every building has **two stamp variants**:

#### Regular Stamp (Building Scan)
- **How to Get**: Scan any building once
- **Icon**: Simple building silhouette
- **Example**: "Flatiron Building" stamp - black & white outline
- **Rarity**: Common (anyone can get by scanning)

#### Quest Stamp (Quest Completion)
- **How to Get**: Complete specific quest about that building/area
- **Icon**: Gold-bordered, animated, with quest emblem
- **Example**: "Flatiron Quest Master" stamp - full color, gold foil effect, shows Flatiron + magnifying glass icon
- **Rarity**: Rare (only available during quest period)
- **Special Feature**: Shows completion date & "#347 of all time" badge

### Quest-Exclusive Achievements
These are **permanently missable** if you don't complete the quest:

| Quest Achievement | How It's Special | Can Get Again? |
|-------------------|------------------|----------------|
| "Dawn Scanner" | Daily quest completed before 8 AM | No - time-limited variant |
| "Speed Walker" | Weekly quest done in <2 hours | No - performance-based |
| "Perfect Week" | 7 daily quests in a row | No - consistency challenge |
| "First Explorer" | Be in top 100 to complete weekly quest | No - competitive |

**Visual Difference**: Quest achievements have:
- Animated shimmer effect
- "Limited Edition" badge
- Quest season number (e.g., "Season 1 - Week 42")
- Holographic appearance (vs flat regular achievements)

---

## 2. DEEP XP INTEGRATION - Making It Essential

### For FREE Users: XP = Access to the Full App

Instead of "unlock one feature at a time", FREE tier is **XP-gated progression**:

#### The Ladder System
```
Level 1 (0 XP)     → Can scan 3 buildings/day, basic info only
Level 2 (500 XP)   → Unlock: Full building descriptions
Level 3 (1000 XP)  → Unlock: Architectural style analysis
Level 4 (1500 XP)  → Unlock: Historical context & architect bio
Level 5 (2500 XP)  → Unlock: Nearby similar buildings suggestions
Level 6 (4000 XP)  → Unlock: 5 scans/day + derive routes (basic)
Level 8 (7000 XP)  → Unlock: Expert commentary on buildings
Level 10 (12000 XP)→ Unlock: 10 scans/day + advanced derives
```

**Key Insight**: Free users **progress through the app via XP**. Each level unlocks more depth, not just "spend 100 XP to see one thing."

#### XP-Based Scan Limits
- **Free Tier**: Daily scan limit = `(Level / 2) + 2`
  - Level 1: 3 scans/day
  - Level 10: 7 scans/day
  - Level 20: 12 scans/day
- **Pro Tier**: Unlimited scans, BUT XP boosts scan quality
  - Every 1000 XP: +1 "Deep Dive Credit" (AI-generated detailed report about any building)
  - Every 5000 XP: Unlock ability to request custom walking route

#### Feature Decay System (Free Tier)
- Unlocked features **stay unlocked** as long as you maintain XP level
- If you spend XP below a level threshold, you **lose access** to that level's features
- Creates tension: "Do I spend 500 XP to unlock this building, or save it to maintain Level 5 access?"

**Example**:
```
Sarah (Free) has 2600 XP (Level 5)
She can see historical context on all buildings
She spends 600 XP on premium features
Now she has 2000 XP (Level 4)
She LOSES access to historical context until she re-earns XP
```

This makes XP **precious** and creates **grinding incentive** or **conversion to Pro**.

---

### For PRO Users: XP = Power & Prestige

Pro tier gets **unlimited access to features**, but XP unlocks:

#### 1. **Contributor Tier System** (Community Status)
```
Apprentice (0-5K XP)     → Your reviews visible to friends only
Journeyman (5K-15K XP)   → Reviews shown to local users
Expert (15K-40K XP)      → Reviews featured in building info
Master (40K-100K XP)     → Curate quest content, vote on new buildings
Legend (100K+ XP)        → Name displayed on app homepage, create official derives
```

**Impact**: XP determines your **influence** in the community. High XP = your opinions matter.

#### 2. **Creator Unlocks** (Content Creation)
| XP Threshold | Unlock |
|--------------|--------|
| 3,000 XP | Create custom derives (private) |
| 7,500 XP | Publish derives publicly |
| 12,000 XP | Submit new buildings to database |
| 20,000 XP | Create quests for your neighborhood |
| 50,000 XP | Design custom stamps (approved by team) |

**Why It Works**: Pro users with high XP become **content creators**, expanding the app for everyone.

#### 3. **Deep Dive Credits** (Premium AI Features)
- Pro users get **1 Deep Dive Credit per 1000 XP earned**
- Deep Dive = AI generates 2000-word report on a building (architecture, history, cultural impact, similar buildings worldwide)
- Credits never expire
- Can gift credits to Free users

**Example Flow**:
```
Alex (Pro, 15K XP) completes weekly quest → +1000 XP
Earns 1 Deep Dive Credit
Uses credit on Chrysler Building → Gets full AI report
Shares report with friend (Free tier) → Friend sees value, converts to Pro
```

#### 4. **Leaderboard = Real Stakes**
Top 10 XP earners each month get:
- Featured on app homepage
- Exclusive "Top 10" stamp (only 10 people have it each month)
- 10 free Deep Dive Credits
- Early access to beta features

**Impact**: XP becomes **competitive**, driving daily engagement.

---

## 3. XP EARNING - Everything Rewards You

### Core Activities
| Activity | Base XP | Bonus XP |
|----------|---------|----------|
| Scan new building | 50 XP | +25 XP if first in your friend group |
| Complete basic derive | 100 XP | +50 XP if <2 hours |
| Complete advanced derive | 300 XP | +100 XP if all buildings scanned |
| Daily quest | 250 XP | +50 XP if done before noon |
| Weekly quest | 1000 XP | +200 XP if perfect week (all 7 dailies) |
| Write building review | 75 XP | +25 XP per upvote (max 200 XP) |
| Share derive with friend | 30 XP | +50 XP if friend completes it |
| Check in at landmark | 20 XP | +10 XP for 3-day streak |

### Streaks Multiply XP
- **3-day streak**: 1.5x XP multiplier
- **7-day streak**: 2x XP multiplier
- **30-day streak**: 3x XP multiplier + "Dedicated Explorer" achievement

### Social XP
- **Refer a friend**: 500 XP when they complete onboarding
- **Friend scans building you added**: 50 XP
- **Your derive gets 100 completions**: 1000 XP

---

## 4. QUEST EXCLUSIVITY - FOMO Design

### Limited-Time Quest Stamps
- Each quest offers a **variant stamp** only available during quest window
- Miss the quest = permanently miss that variant
- Example:
  - Regular: "Flatiron Building" (always available)
  - Quest Exclusive: "Flatiron Master - Winter 2025" (only Feb 1-7, 2025)

### Seasonal Quests
- **Spring/Summer/Fall/Winter**: Different quest sets
- Seasonal stamps have visual themes:
  - Spring: Cherry blossom borders
  - Summer: Golden sun rays
  - Fall: Autumn leaf accents
  - Winter: Snowflake patterns

### Quest Chains (Weekly Only)
Week 1: "Flatiron Foundations" → Stamp: Part 1/4
Week 2: "Midtown Modernism" → Stamp: Part 2/4
Week 3: "SoHo Structures" → Stamp: Part 3/4
Week 4: "Brooklyn Bridges" → Stamp: Part 4/4

**Complete all 4** → Special "Manhattan Master" achievement (can't get any other way)

---

## 5. PASSPORT INTEGRATION - The Collection Game

### Stamp Types
1. **Building Stamps** (Common): Scan any building
2. **Quest Stamps** (Rare): Complete quests
3. **Achievement Stamps** (Epic): Milestone achievements (e.g., 100 buildings scanned)
4. **Legendary Stamps** (Legendary): Top 10 monthly, perfect month, etc.

### Passport Pages
- **Page 1**: New York City stamps
- **Page 2**: International stamps (if user travels)
- **Page 3**: Quest-exclusive stamps
- **Page 4**: Legendary/limited edition stamps

### Collection Bonuses
- **Complete NYC page** (scan all major landmarks): 5000 XP + "NYC Expert" title
- **Collect all Season 1 quest stamps**: 10,000 XP + exclusive "Season 1 Champion" badge
- **Own 10 legendary stamps**: Permanent 1.5x XP multiplier

---

## 6. THE CONVERSION FUNNEL - Free to Pro

### Free User Frustrations (by design)
1. **Scan limit hits**: "You've scanned 3/3 buildings today. Upgrade to Pro for unlimited scans!"
   - Offer: "Or earn 500 XP to increase limit to 4/day"
2. **XP drops below level threshold**: "You lost Level 5 access! Upgrade to Pro to keep all features unlocked."
3. **Quest FOMO**: "This quest stamp expires in 4 hours! Pro users get 2x XP to complete faster."
4. **Leaderboard**: "You're #47! Upgrade to Pro for 2x XP and climb to Top 10."

### Pro User Value Props
1. **Unlimited scans**: Never hit daily limit
2. **XP never decays features**: All features unlocked, XP is pure bonus
3. **2x XP multiplier**: Climb leaderboards faster
4. **Deep Dive Credits**: Earn premium AI reports
5. **Creator tools**: Build content for community

---

## 7. IMPLEMENTATION CHECKLIST

### Phase 1: Core XP (Week 1-2)
- [ ] XP earning on all actions
- [ ] Level calculation system
- [ ] Feature gating by XP level (Free tier)
- [ ] XP transaction history

### Phase 2: Quests & Rewards (Week 3-4)
- [ ] Daily/weekly quest generation
- [ ] Quest progress tracking
- [ ] Quest-exclusive stamp variants
- [ ] Quest completion rewards

### Phase 3: Social & Leaderboards (Week 5-6)
- [ ] Monthly leaderboards
- [ ] Friend XP comparison
- [ ] Social XP rewards (referrals, shares)
- [ ] Top 10 exclusive rewards

### Phase 4: Advanced Features (Week 7-8)
- [ ] Deep Dive Credits system
- [ ] Creator tools (custom derives, quests)
- [ ] Contributor tier system
- [ ] Seasonal quest chains

---

## Why This Works

### Psychology
1. **Progress**: Free users see clear path to unlock features
2. **Loss Aversion**: Spending XP = losing progress (creates tension)
3. **FOMO**: Quest-exclusive stamps create urgency
4. **Status**: Leaderboards & contributor tiers = social proof
5. **Completion**: Collecting all stamps = endgame goal

### Business
1. **Free users grind** → High engagement
2. **XP limits frustrate** → Conversion funnel
3. **Pro users compete** → Retention through leaderboards
4. **Quest exclusivity** → Daily/weekly check-ins
5. **Social features** → Viral growth (referrals)

### Product
1. **XP ties everything together** → Unified experience
2. **Free tier is playable** → Not a trial, actual game
3. **Pro tier has depth** → Not just "remove limits"
4. **Community contribution** → UGC scales the app
5. **Collection mechanic** → Passport becomes core feature

---

## TL;DR - What Changed

### Quest Rewards
- ✅ **Two stamp types**: Regular (scan) vs Quest-exclusive (quest completion)
- ✅ **Quest stamps are special**: Gold borders, animated, limited edition, show rarity (#347 of all time)
- ✅ **Quest achievements are missable**: Permanent FOMO

### XP Integration
- ✅ **Free tier**: XP = progression system (unlock features by leveling)
- ✅ **Pro tier**: XP = power (contributor status, creator tools, leaderboard)
- ✅ **Every action earns XP**: Scans, derives, reviews, social
- ✅ **XP decay** (Free tier): Spend below threshold = lose features
- ✅ **Deep Dive Credits**: Pro users earn AI-generated detailed reports

### Pro Users Get
1. Unlimited scans (vs 3-12/day based on level for Free)
2. 2x XP multiplier (climb leaderboards)
3. Deep Dive Credits (1 per 1000 XP)
4. Creator tools (unlocked at XP thresholds)
5. Contributor status (influence in community)
6. No feature decay (all features unlocked forever)

**Result**: XP is now the **core mechanic**, not a side feature. Free users play a progression game. Pro users play a prestige/creator game.
