# Quiz Implementation Testing Guide

## Pre-Testing Setup

### 1. Install Dependencies
```bash
npm install react-native-svg
```

### 2. Run Schema Updates
Execute the SQL in `supabase_schema_additions.sql` in your Supabase SQL Editor.

### 3. Verify Data Population
Check that your `quiz_questions` and `question_options` tables are populated with the 18-question data.

## Testing Flow

### 1. App Launch
- **Expected**: App should check user's onboarding status
- **If user hasn't taken quiz**: Automatically navigates to OnboardingQuizScreen
- **If user completed quiz**: Shows main app with aesthetic profile

### 2. Quiz Experience
- **Navigation**: Clean question-by-question flow with progress bar
- **Images**: Questions should display architectural images properly
- **Options**: Each question shows 4 options (A, B, C, D)
- **Response Tracking**: Quiz should track response times for confidence scoring
- **No Back-Navigation Issues**: Going back should work smoothly

### 3. Quiz Completion
- **Calculation**: After final question, should calculate aesthetic profile
- **Navigation**: Automatically redirect to main app
- **Profile Storage**: Results stored in Supabase

### 4. Home Screen Display
- **Donut Chart**: Shows user's aesthetic profile as colorful donut chart
- **Primary Archetype**: Displays name and percentage
- **Loading States**: Proper loading/error states

### 5. Subtype Resolution
Test these specific scenarios:
- **Infrastructuralist**: If user scores high on Industrialist AND Infrastructure questions
- **Naturalist**: If user scores high on Vernacularist AND Naturalist questions

## Expected Results by Archetype

Based on your framework, here are the expected archetypes:

1. **The Classicist** - Formal, symmetrical, grand
2. **The Romantic** - Expressive, story-driven, whimsical  
3. **The Stylist** - Glamorous, polished, sophisticated
4. **The Modernist** - Clean, minimal, functional
5. **The Industrialist** - Raw, utilitarian, authentic
6. **The Visionary** - Sculptural, experimental, innovative
7. **The Pop Culturalist** - Commercial, theatrical, accessible
8. **The Vernacularist** - Rooted, communal, sustainable
9. **The Austerist** - Efficient, practical, systematic

## Debugging Tips

### Common Issues:
1. **SVG not rendering**: Make sure react-native-svg is properly installed
2. **Quiz questions not loading**: Check Supabase connection and RLS policies
3. **Profile calculation failing**: Verify the `calculate_aesthetic_profile` function exists
4. **Images not displaying**: Check image URLs in your quiz data

### Debug Functions:
```javascript
// Check user's current profile
const profile = await getUserAestheticProfile(userId);
console.log('User Profile:', profile);

// Check if onboarding is needed
const needsOnboarding = await userNeedsOnboarding(userId);
console.log('Needs Onboarding:', needsOnboarding);
```

## Test Cases

### Test Case 1: New User Flow
1. Clear app data / use new account
2. Launch app
3. Should see quiz immediately
4. Complete all 18 questions
5. Should see profile results on home screen

### Test Case 2: Existing User Flow  
1. Use account that completed quiz
2. Launch app
3. Should skip quiz and show home screen with profile

### Test Case 3: Subtype Resolution
1. Deliberately answer to favor Industrial + Infrastructure questions
2. Should result in "Infrastructuralist" as primary archetype
3. Same test for Vernacular + Naturalist → "Naturalist"

### Test Case 4: Mixed Results
1. Answer questions to create mixed profile
2. Should show primary + secondary archetypes
3. Confidence score should reflect response consistency

## Performance Expectations

- **Quiz Loading**: < 2 seconds
- **Question Navigation**: Instant
- **Profile Calculation**: < 3 seconds  
- **Chart Rendering**: < 1 second

## Next Steps After Testing

If everything works correctly:
1. The quiz flow is complete and functional
2. Users get personalized architectural aesthetic profiles
3. Home screen displays their results beautifully
4. Ready for production use!

## Troubleshooting

If you encounter issues, check:
1. Supabase connection settings
2. RLS policies are correctly set
3. All required npm packages installed
4. Schema updates applied correctly
5. Quiz data properly populated