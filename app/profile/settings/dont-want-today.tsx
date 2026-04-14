import { Redirect } from 'expo-router'

/** @deprecated Use `/profile/settings/preference-ingredient-list?kind=never_today` */
export default function DontWantTodaySettingsScreen () {
  return <Redirect href="/profile/settings/preference-ingredient-list?kind=never_today" />
}
