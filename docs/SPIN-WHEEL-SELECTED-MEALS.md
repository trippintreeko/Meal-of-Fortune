# Spin to pick from selected meals – code to add

If your project has **`store/calendar-store.ts`** but it doesn’t include the spin-selected feature yet, add the following.

## 1. Calendar store (`store/calendar-store.ts`)

**In the state type** (where you define `events`, `savedMeals`, etc.), add:

```ts
/** When set, spin screen uses only these meal IDs; when null, spin uses all savedMeals */
spinMealIds: string[] | null
setSpinMealIds: (ids: string[] | null) => void
```

**In the initial state** (inside `create(...)`), add:

```ts
spinMealIds: null,
```

**In the same store object**, add this method:

```ts
setSpinMealIds (ids: string[] | null) {
  set({ spinMealIds: ids })
},
```

So the store has:

- `spinMealIds: null` in state
- `setSpinMealIds(ids)` that does `set({ spinMealIds: ids })`

## 2. Home tab (`app/(tabs)/index.tsx`) – already done

- `setSpinMealIds` is included in the `useCalendarStore()` destructuring.
- `handleSpinSelected` sets the selected meal IDs and navigates to `/game/spin`.
- The “Spin to pick” button in the selection action bar calls `handleSpinSelected`.

## 3. Spin screen (`app/game/spin.tsx`) – already added

The file `app/game/spin.tsx` has been added. It:

- Reads `spinMealIds` and `setSpinMealIds` from the calendar store.
- Builds `mealsToSpin`: if `spinMealIds` is set and non-empty, it filters `savedMeals` by those IDs (keeping order); otherwise it uses all `savedMeals`.
- Uses `mealsToSpin` for the wheel labels and the “You got” result.
- Clears `spinMealIds` on unmount so the next time the user opens spin from the main “Spin to pick one” link they get all meals again.
- Shows different subtitle text when spinning from selected meals vs all meals.

## Flow

1. On the home tab, long-press a meal in “Meals I want” to enter selection mode.
2. Tap more meals to select them.
3. Tap **“Spin to pick”** in the action bar.
4. App navigates to the spin screen and the wheel shows only the selected meals.
5. User spins and gets one of those meals.
6. When they leave the spin screen, `spinMealIds` is cleared so the normal “Still can’t decide? Spin to pick one” link uses the full “Meals I want” list again.
