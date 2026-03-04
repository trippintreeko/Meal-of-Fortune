export type FoodItem = {
  id: string;
  name: string;
  category: 'base' | 'protein' | 'vegetable' | 'seasoning' | 'garnish';
  cooking_method?: string;
  meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'any';
  texture?: 'bite_sized' | 'soup' | 'full_course' | 'handheld';
  mood?: string[];
  image_url?: string;
  created_at: string;
};

export type GameSession = {
  id: string;
  user_id: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner';
  round_1_base?: string;
  round_2_protein?: string;
  round_2_vegetable?: string;
  round_3_cooking_method?: string;
  collected_seasonings?: string[];
  collected_garnishes?: string[];
  mood_filter?: string;
  completed_at?: string;
  created_at: string;
};

export type GeneratedMeal = {
  id: string;
  session_id: string;
  base_id?: string;
  protein_id?: string;
  vegetable_id?: string;
  cooking_method?: string;
  seasonings?: string[];
  garnishes?: string[];
  swiped_direction?: 'left' | 'right' | null;
  created_at: string;
};

export type MealCalendar = {
  id: string;
  user_id: string;
  meal_id: string;
  scheduled_date: string;
  meal_time: 'breakfast' | 'lunch' | 'dinner';
  is_eaten: boolean;
  created_at: string;
};

export type Profile = {
  id: string;
  username: string;
  avatar_url?: string;
  created_at: string;
};

export type UserPreference = {
  id: string;
  user_id: string;
  food_item_id: string;
  preference_type: 'favorite' | 'dislike' | 'never_today';
  created_at: string;
};

export type VotingSession = {
  id: string;
  creator_id: string;
  title: string;
  meal_options?: string[];
  votes: Record<string, string>;
  expires_at?: string;
  created_at: string;
};
