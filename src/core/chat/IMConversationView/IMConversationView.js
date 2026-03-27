import React, { memo, useMemo } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { useTheme, useTranslations } from '../../dopebase'
import IMConversationIconView from './IMConversationIconView/IMConversationIconView'
import { timeFormat } from '../../helpers/timeFormat'
import dynamicStyles from './styles'
import { formatMessage } from '../helpers/utils'
import { IMRichTextView } from '../../mentions'

const IMConversationView = memo(props => {
  const { onChatItemPress, item, user } = props

  const { localized } = useTranslations()
  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)

  const userID = user?.userID || user?.id
  const markedAsRead = item?.markedAsRead ?? true

  const safeParticipants = useMemo(() => {
    const participants = Array.isArray(item?.participants) ? item.participants : []

    if (item?.admins?.length) {
      return participants
    }

    return participants.filter(value => value?.id !== userID)
  }, [item?.participants, item?.admins, userID])

  const safeTitle = useMemo(() => {
    if (typeof item?.title === 'string' && item.title.trim().length > 0) {
      return item.title
    }

    if (typeof item?.name === 'string' && item.name.trim().length > 0) {
      return item.name
    }

    if (safeParticipants.length > 0) {
      const p = safeParticipants[0]
      const fullName = `${p?.firstName || ''} ${p?.lastName || ''}`.trim()
      return fullName || p?.fullname || p?.username || 'Conversation'
    }

    return 'Conversation'
  }, [item?.title, item?.name, safeParticipants])

  const safePreview = useMemo(() => {
    try {
      return formatMessage(item, localized) || ''
    } catch (e) {
      return ''
    }
  }, [item, localized])

  const safeTimestamp = useMemo(() => {
    try {
      return timeFormat(item?.updatedAt || item?.lastMessageDate || item?.createdAt)
    } catch (e) {
      return ''
    }
  }, [item?.updatedAt, item?.lastMessageDate, item?.createdAt])

  const handlePress = () => {
    if (!item) {
      return
    }
    onChatItemPress && onChatItemPress(item)
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.chatItemContainer}
      activeOpacity={0.8}
    >
      <IMConversationIconView participants={safeParticipants} />

      <View style={styles.chatItemContent}>
        <Text
          numberOfLines={1}
          style={[styles.chatFriendName, !markedAsRead && styles.unReadmessage]}
        >
          {safeTitle}
        </Text>

        <View style={styles.content}>
          <View style={{ flex: 1 }}>
            <IMRichTextView
              defaultTextStyle={[
                styles.message,
                !markedAsRead && styles.unReadmessage,
              ]}
              emailStyle={[
                styles.message,
                !markedAsRead && styles.unReadmessage,
              ]}
              phoneStyle={[
                styles.message,
                !markedAsRead && styles.unReadmessage,
              ]}
              hashTagStyle={[
                styles.message,
                !markedAsRead && styles.unReadmessage,
              ]}
              usernameStyle={[
                styles.message,
                !markedAsRead && styles.unReadmessage,
              ]}
            >
              {safePreview || ' '}
            </IMRichTextView>
          </View>

          {!!safeTimestamp && (
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[styles.message, !markedAsRead && styles.unReadmessage]}
            >
              {'  •  '}
              {safeTimestamp}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )
})

export default IMConversationView