import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, NativeSyntheticEvent, NativeScrollEvent } from 'react-native'
import { dateKey, parseDateKey } from '@/types/calendar'

const ROW_HEIGHT = 44
const WHEEL_VISIBLE_ROWS = 5
const WHEEL_HEIGHT = ROW_HEIGHT * WHEEL_VISIBLE_ROWS
const PAD = ROW_HEIGHT * 2

function getDaysInMonth (month: number, year: number): number {
  return new Date(year, month, 0).getDate()
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

type DateWheelPickerProps = {
  value: string // YYYY-MM-DD
  onChange: (dateKey: string) => void
  minYear?: number
  maxYear?: number
  textColor?: string
  /** Selected row highlight (e.g. primary + alpha); defaults to light green tint */
  centerHighlightBackground?: string
}

export default function DateWheelPicker ({
  value,
  onChange,
  minYear: minYearProp,
  maxYear: maxYearProp,
  textColor,
  centerHighlightBackground
}: DateWheelPickerProps) {
  const rowTextStyle = textColor ? [styles.rowText, { color: textColor }] : styles.rowText
  const d = parseDateKey(value)
  const currentYear = new Date().getFullYear()
  const minYear = minYearProp ?? currentYear
  const maxYear = maxYearProp ?? currentYear + 1

  const [day, setDay] = useState(d.getDate())
  const [month, setMonth] = useState(d.getMonth() + 1)
  const [year, setYear] = useState(d.getFullYear())

  const dayRef = useRef<ScrollView>(null)
  const monthRef = useRef<ScrollView>(null)
  const yearRef = useRef<ScrollView>(null)

  const daysInCurrentMonth = getDaysInMonth(month, year)
  const days = Array.from({ length: daysInCurrentMonth }, (_, i) => i + 1)
  const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: MONTH_NAMES[i] }))
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i)

  const dayIndex = Math.min(day - 1, days.length - 1)
  const monthIndex = month - 1
  const yearIndex = year - minYear

  useEffect(() => {
    const parsed = parseDateKey(value)
    setDay(parsed.getDate())
    setMonth(parsed.getMonth() + 1)
    setYear(parsed.getFullYear())
  }, [value])

  const clampDay = useCallback((m: number, y: number, d: number) => {
    const max = getDaysInMonth(m, y)
    return Math.min(Math.max(1, d), max)
  }, [])

  const notify = useCallback((dVal: number, mVal: number, yVal: number) => {
    const clamped = clampDay(mVal, yVal, dVal)
    const date = new Date(yVal, mVal - 1, clamped)
    onChange(dateKey(date))
  }, [onChange, clampDay])

  const handleDayScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y
    const index = Math.round(y / ROW_HEIGHT)
    const clampedIndex = Math.max(0, Math.min(index, days.length - 1))
    const newDay = days[clampedIndex]
    setDay(newDay)
    notify(newDay, month, year)
  }, [month, year, days])

  const handleMonthScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y
    const index = Math.round(y / ROW_HEIGHT)
    const clampedIndex = Math.max(0, Math.min(index, 11))
    const newMonth = clampedIndex + 1
    setMonth(newMonth)
    const newDay = clampDay(newMonth, year, day)
    setDay(newDay)
    notify(newDay, newMonth, year)
  }, [day, year, clampDay])

  const handleYearScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y
    const index = Math.round(y / ROW_HEIGHT)
    const clampedIndex = Math.max(0, Math.min(index, years.length - 1))
    const newYear = years[clampedIndex]
    setYear(newYear)
    const newDay = clampDay(month, newYear, day)
    setDay(newDay)
    notify(newDay, month, newYear)
  }, [day, month, years, clampDay])

  useEffect(() => {
    dayRef.current?.scrollTo({ y: dayIndex * ROW_HEIGHT, animated: false })
  }, [dayIndex])
  useEffect(() => {
    monthRef.current?.scrollTo({ y: monthIndex * ROW_HEIGHT, animated: false })
  }, [monthIndex])
  useEffect(() => {
    yearRef.current?.scrollTo({ y: yearIndex * ROW_HEIGHT, animated: false })
  }, [yearIndex])

  return (
    <View style={styles.container}>
      <View style={styles.wheelContainer}>
        <View
          style={[
            styles.centerHighlight,
            centerHighlightBackground != null && { backgroundColor: centerHighlightBackground }
          ]}
          pointerEvents="none"
        />
        <View style={styles.wheelWrap}>
          <ScrollView
          ref={dayRef}
          style={styles.wheel}
          contentContainerStyle={[styles.wheelContent, { paddingVertical: PAD }]}
          showsVerticalScrollIndicator={false}
          snapToInterval={ROW_HEIGHT}
          snapToAlignment="start"
          decelerationRate="fast"
          onMomentumScrollEnd={handleDayScroll}
          onScrollEndDrag={handleDayScroll}
        >
          {days.map((dayNum) => (
            <View key={dayNum} style={styles.row}>
              <Text style={rowTextStyle}>{dayNum}</Text>
            </View>
          ))}
        </ScrollView>
        </View>
        <View style={styles.wheelWrap}>
          <ScrollView
            ref={monthRef}
            style={styles.wheel}
          contentContainerStyle={[styles.wheelContent, { paddingVertical: PAD }]}
          showsVerticalScrollIndicator={false}
          snapToInterval={ROW_HEIGHT}
          snapToAlignment="start"
          decelerationRate="fast"
          onMomentumScrollEnd={handleMonthScroll}
          onScrollEndDrag={handleMonthScroll}
        >
          {months.map((m) => (
            <View key={m.value} style={styles.row}>
              <Text style={rowTextStyle}>{m.label}</Text>
            </View>
          ))}
        </ScrollView>
        </View>
        <View style={styles.wheelWrap}>
          <ScrollView
            ref={yearRef}
            style={styles.wheel}
            contentContainerStyle={[styles.wheelContent, { paddingVertical: PAD }]}
            showsVerticalScrollIndicator={false}
            snapToInterval={ROW_HEIGHT}
            snapToAlignment="start"
            decelerationRate="fast"
            onMomentumScrollEnd={handleYearScroll}
            onScrollEndDrag={handleYearScroll}
          >
            {years.map((y) => (
              <View key={y} style={styles.row}>
                <Text style={rowTextStyle}>{y}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    minHeight: WHEEL_HEIGHT
  },
  wheelContainer: {
    flexDirection: 'row',
    height: WHEEL_HEIGHT,
    minWidth: 260,
    position: 'relative'
  },
  centerHighlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ROW_HEIGHT * 2,
    height: ROW_HEIGHT,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderRadius: 10,
    zIndex: 0
  },
  wheelWrap: {
    flex: 1,
    height: WHEEL_HEIGHT,
    minWidth: 72,
    maxWidth: 100,
    zIndex: 1
  },
  wheel: {
    height: WHEEL_HEIGHT
  },
  wheelContent: {
    paddingHorizontal: 4
  },
  row: {
    height: ROW_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center'
  },
  rowText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1e293b'
  }
})
