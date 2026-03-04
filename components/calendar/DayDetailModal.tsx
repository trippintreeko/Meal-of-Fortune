import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native'
import {
  X,
  Copy,
  Trash2,
  Bell,
  MoveRight,
  Plus,
  Coffee,
  Sun,
  Moon,
  Vote
} from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { useThemeColors } from '@/hooks/useTheme'
import type { CalendarEvent, MealSlot } from '@/types/calendar'
import { parseDateKey } from '@/types/calendar'

const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner'
}

const SLOT_ICONS = { breakfast: Coffee, lunch: Sun, dinner: Moon }

type DayDetailModalProps = {
  visible: boolean
  date: string
  events: CalendarEvent[]
  onClose: () => void
  onMove: (eventId: string) => void
  onDelete: (eventId: string) => void
  onCopy: (eventId: string) => void
  onSetReminder: (eventId: string) => void
  onAddMeal: () => void
}

export default function DayDetailModal ({
  visible,
  date,
  events,
  onClose,
  onMove,
  onDelete,
  onCopy,
  onSetReminder,
  onAddMeal
}: DayDetailModalProps) {
  const router = useRouter()
  const colors = useThemeColors()
  const d = parseDateKey(date)
  const dateLabel = d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

  const handleDelete = (eventId: string, title: string) => {
    Alert.alert('Delete meal', `Remove "${title}" from this day?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(eventId) }
    ])
  }

  const sheetStyle = [styles.sheet, { backgroundColor: colors.card }]
  const headerBorderStyle = { borderBottomColor: colors.border }
  const titleStyle = [styles.title, { color: colors.text }]
  const emptyTextStyle = [styles.emptyText, { color: colors.textMuted }]
  const eventCardStyle = [styles.eventCard, { backgroundColor: colors.secondaryBg, borderColor: colors.cardBorder }]
  const slotLabelStyle = [styles.slotLabel, { color: colors.textMuted }]
  const eventTitleStyle = [styles.eventTitle, { color: colors.text }]
  const voteBadgeStyle = [styles.voteBadge, { backgroundColor: colors.primary + '25' }]
  const voteBadgeTextStyle = [styles.voteBadgeText, { color: colors.primary }]
  const actionTextStyle = [styles.actionText, { color: colors.textMuted }]
  const addBtnStyle = [styles.addBtn, { borderColor: colors.primary }]
  const addBtnTextStyle = [styles.addBtnText, { color: colors.primary }]

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={sheetStyle}>
          <View style={[styles.header, headerBorderStyle]}>
            <Text style={titleStyle}>{dateLabel}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            {events.length === 0 ? (
              <Text style={emptyTextStyle}>No meals planned for this day.</Text>
            ) : (
              events.map((ev) => {
                const Icon = SLOT_ICONS[ev.mealSlot]
                return (
                  <View key={ev.id} style={eventCardStyle}>
                    <View style={styles.eventHeader}>
                      <Icon size={20} color={colors.primary} />
                      <Text style={slotLabelStyle}>{SLOT_LABELS[ev.mealSlot]}</Text>
                    </View>
                    <Text style={eventTitleStyle}>{ev.title}</Text>
                    {(ev.votingSessionId ?? ev.isVotedMeal) && (
                      <TouchableOpacity
                        style={voteBadgeStyle}
                        onPress={() =>
                          ev.votingSessionId &&
                          router.push({
                            pathname: '/social/results/[id]',
                            params: { id: ev.votingSessionId }
                          })
                        }>
                        <Vote size={14} color={colors.primary} />
                        <Text style={voteBadgeTextStyle}>
                          {ev.isWinner ? 'Winner · ' : ''}From group vote
                        </Text>
                        {ev.voteCount != null && ev.totalVoters != null ? (
                          <Text style={[styles.voteBadgeSubtext, { color: colors.textMuted }]}>
                            {' '}({ev.voteCount}/{ev.totalVoters})
                          </Text>
                        ) : null}
                      </TouchableOpacity>
                    )}
                    <View style={styles.actions}>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => onMove(ev.id)}>
                        <MoveRight size={18} color={colors.textMuted} />
                        <Text style={actionTextStyle}>Move</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => onCopy(ev.id)}>
                        <Copy size={18} color={colors.textMuted} />
                        <Text style={actionTextStyle}>Copy</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => onSetReminder(ev.id)}>
                        <Bell size={18} color={colors.textMuted} />
                        <Text style={actionTextStyle}>Remind</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleDelete(ev.id, ev.title)}>
                        <Trash2 size={18} color={colors.destructive} />
                        <Text style={[styles.actionText, styles.deleteText, { color: colors.destructive }]}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )
              })
            )}

            <TouchableOpacity style={addBtnStyle} onPress={onAddMeal}>
              <Plus size={22} color={colors.primary} />
              <Text style={addBtnTextStyle}>Add meal to this day</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end'
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1
  },
  closeBtn: {
    padding: 4
  },
  scroll: {
    maxHeight: 400
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    marginVertical: 24
  },
  eventCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4
  },
  slotLabel: {
    fontSize: 12,
    fontWeight: '600'
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8
  },
  voteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
    borderRadius: 8
  },
  voteBadgeText: { fontSize: 12, fontWeight: '600' },
  voteBadgeSubtext: { fontSize: 12 },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600'
  },
  deleteText: {},
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed'
  },
  addBtnText: {
    fontSize: 15,
    fontWeight: '700'
  }
})
