Food Decider App Requirements
Project Overview
This document outlines the requirements for a React Native mobile app built with Expo, designed to help users decide what to eat through gamified mini-games. The app targets indecisive eaters, focusing on addictiveness and replayability. It operates in portrait mode on mobile devices.

Core Concept: Users play three rounds of mini-games to select meal components (base, protein/vegetables, cooking method), with seasonings and garnishes sprinkled in. Selections generate meal combinations via spinning wheels, revealed as loot box rewards. Meals can be added to a calendar and shared for voting.
Themes: Breakfast, lunch, dinner.
Key Goals:
Addictive: Short sessions (3-5 minutes), animations, sounds, haptics, streaks.
Replayable: Randomized options, rerolls with water recommendations.

Target Platform: Mobile (iOS/Android) via Expo, portrait mode only.
MVP Scope: Local-first, with Firebase for social features.

Technical Stack

Framework: React Native with Expo.
Dependencies:
Core: expo, react-native-reanimated, lottie-react-native, @shopify/react-native-skia, expo-av (sounds), expo-haptics (vibrations), expo-calendar (calendar integration), expo-screen-orientation (portrait lock).
Navigation: @react-navigation/native, @react-navigation/stack.
State Management: zustand (lightweight alternative to Redux).
Backend: firebase (auth, realtime DB for sharing/voting).
Other: react-native-wheel-of-fortune or custom Reanimated for wheels; @expo/react-native-calendars for calendar view (optional).

Setup:
Initialize: npx create-expo-app FoodDecider --template blank.
Install: expo install [listed deps].
Portrait Lock: Use expo-screen-orientation in App.js to lock to PORTRAIT_UP.

Data Handling: Hardcoded JSON arrays for food options (expandable). Local storage via AsyncStorage for streaks/calendar.

Features and User Flow

1. Home Screen

Welcome screen with theme selection (buttons for Breakfast, Lunch, Dinner).
Option to view calendar.
State: Set theme in Zustand store.
Navigation: To GameScreen on theme select; to CalendarScreen.

2. Game Screen

Unified screen for 3 rounds of mini-games.
Round 1: Base Selection (e.g., rice, quinoa, beans, bread, tortilla).
Mini-game: Swipe carousel (Tinder-style) – right to pick, left to skip. Time limit for urgency.

Round 2: Protein/Vegetables.
Mini-game: Tap-to-collect falling items (using Reanimated for physics).

Round 3: Cooking Method (e.g., boiled, steamed, baked, fried).
Mini-game: Quick-time event – tap buttons in sequence for "cooking simulation".

Seasonings/Garnishes: Randomly appear as collectibles during games (e.g., garlic, spices). Add 1-2 per round.
Reroll Mechanic: If user rejects/skips all options in a round, display "Drink water and try again!" with retry button.
Enhancements: Sounds on selections (Expo AV), haptics on picks (Expo Haptics).
State: Update selections in Zustand (base, proteinVeg, method, seasonings array).
Navigation: To WheelScreen after Round 3.

3. Wheel Screen

Spin 1-3 wheels to generate meal combinations.
Wheel Implementation: Use react-native-wheel-of-fortune or custom Reanimated animation.
Logic: Generate combinations from selections (e.g., Cartesian product, limited to 5-10 unique meals).
Randomization: Each spin picks a combo; number of wheels random or user-chosen.
Enhancements: Spin sounds, haptics.
State: Call generateMeals() in Zustand to populate meals array.
Navigation: To ResultsScreen.

4. Results Screen

Reveal meals as loot box rewards.
Animation: Lottie for exploding chest/confetti.
Display: List of generated meals (e.g., "Fried Chicken Rice with Garlic and Chili").
Actions: Add selected/all to calendar.
Water Tip: If no meals appeal, suggest "Drink water and try again" with replay button.
Navigation: To CalendarScreen or ShareScreen.

5. Calendar Screen

Monthly view of planned meals.
Integration: Use Expo Calendar API to create events (request permissions, assign meals to dates).
Alternative: @expo/react-native-calendars for visual calendar.
Features: View, edit, delete events.
State: Store events locally or in Zustand.

6. Share Screen

Share results with friends/family.
Implementation: Firebase Auth for user accounts; Realtime DB for polls.
Features: Generate shareable link/code; linked users vote on meals (e.g., "What to eat tonight?").
Voting: Real-time updates.

Data Structures

Themes Data (data.js):JSON{
"breakfast": {
"bases": ["oatmeal", "toast", "yogurt", "cereal", "pancakes"],
"proteinsVegs": ["eggs", "bacon", "avocado", "berries", "nuts"],
"methods": ["scrambled", "poached", "baked", "toasted", "blended"]
},
"lunch": {
"bases": ["rice", "quinoa", "beans", "bread", "tortilla"],
"proteinsVegs": ["chicken", "tofu", "salad greens", "beans", "fish"],
"methods": ["boiled", "steamed", "baked", "fried", "grilled"]
},
"dinner": { /_ Similar, customized _/ }
}
Seasonings: Array like ["garlic", "salt", "pepper", "chili", "herbs", "cheese", "sauce"].
Meal Object: { base: string, proteinVeg: string, method: string, seasonings: string[] }.

State Management (Zustand)

Store: useGameStore with theme, selections, meals, setTheme, addSelection, addSeasoning, generateMeals, reset.

Addictiveness and Replayability

Streaks: Track daily plays with AsyncStorage; rewards for consistency.
Random Bonuses: Extra seasonings, wildcards.
Session Length: Keep short for quick plays.
Themes Variety: Separate data for each meal type.
Rerolls: Encouraged with positive messaging (water tips).

Implementation Notes

Animations: Reanimated for gestures/physics; Lottie for reveals.
Sounds/Haptics: Integrate throughout for engagement.
Testing: Use Expo Go for quick iterations.
Expansion: Add user profiles, more mini-games, backend syncing.
Security: Handle Firebase auth securely; request permissions for calendar.

This requirements file can be used in Cursor.ai to generate initial code scaffolds. Expand sections as needed for development.
