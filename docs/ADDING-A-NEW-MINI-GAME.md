# Adding a New Mini-Game (DLC-style)

Each session randomly picks **3 games** from the registry. To add a new game so it enters the rotation:

## 1. Create the game component

Create a new file under `components/games/`, e.g. `components/games/YourGameRound.tsx`.

Implement the **RoundGameProps** interface from `@/lib/game-registry`:

- `roundPurpose`: `'base'` | `'protein_vegetable'` | `'cooking_method'` – what this round is selecting
- `mealType`: `'breakfast'` | `'lunch'` | `'dinner'`
- `onComplete(result)`: call with the correct **RoundResult** shape for the current purpose:
  - **base:** `{ purpose: 'base', baseIds: string[] }`
  - **protein_vegetable:** `{ purpose: 'protein_vegetable', proteinId: string, vegetableId: string }`
  - **cooking_method:** `{ purpose: 'cooking_method', method: string }`
- `onReroll?`: optional; call to offer “drink water and try again” without completing

Example skeleton:

```tsx
import { View, Text, TouchableOpacity } from 'react-native'
import type { RoundGameProps } from '@/lib/game-registry'
import type { RoundResult } from '@/types/game-session'

export default function YourGameRound ({ roundPurpose, mealType, onComplete }: RoundGameProps) {
  const handleDone = () => {
    if (roundPurpose === 'base') {
      onComplete({ purpose: 'base', baseIds: ['some-uuid'] })
    } else if (roundPurpose === 'protein_vegetable') {
      onComplete({
        purpose: 'protein_vegetable',
        proteinId: 'uuid',
        vegetableId: 'uuid'
      })
    } else {
      onComplete({ purpose: 'cooking_method', method: 'grilled' })
    }
  }

  return (
    <View>
      {/* your game UI */}
      <TouchableOpacity onPress={handleDone}>
        <Text>Done</Text>
      </TouchableOpacity>
    </View>
  )
}
```

## 2. Register the game

In **`lib/game-registry.tsx`**:

1. Import your component:
   ```ts
   import YourGameRound from '@/components/games/YourGameRound'
   ```

2. Add an entry to **`GAME_REGISTRY`**:
   ```ts
   {
     id: 'your-game',
     name: 'Your Game',
     description: 'Short description',
     component: YourGameRound
   }
   ```

That’s it. The new game is now in the pool; each session will randomly choose 3 games from the full list (including yours).

## Summary

| Step | File | Action |
|------|------|--------|
| 1 | `components/games/YourGameRound.tsx` | Create component with `RoundGameProps` and call `onComplete` with the right `RoundResult` |
| 2 | `lib/game-registry.tsx` | Import component and add one object to `GAME_REGISTRY` |

No changes are needed in the round screen, routing, or session store.
