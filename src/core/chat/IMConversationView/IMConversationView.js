import React, { memo, useMemo } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { useTheme, useTranslations } from '../../dopebase'
import IMConversationIconView from './IMConversationIconView/IMConversationIconView'
import { timeFormat } from '../../helpers/timeFormat'
import dynamicStyles from './styles'

const IMConversationView = memo(props => {
  const { onChatItemPress, item, user } = props

  const { theme, appearance } = useTheme()
  const { localized } = useTranslations()
  const styles = dynamicStyles(theme, appearance)

  const userID = user?.userID || user?.id
  const markedAsRead = item?.markedAsRead ?? true

  const safeParticipants = useMemo(() => {
    const participants = Array.isArray(item?.participants) ? item.participants : []

    if (Array.isArray(item?.admins) && item.admins.length > 0) {
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

  const basePreview = useMemo(() => {
    if (typeof item?.lastMessage === 'string' && item.lastMessage.trim().length > 0) {
      return item.lastMessage.trim()
    }

    if (typeof item?.content === 'string' && item.content.trim().length > 0) {
      return item.content.trim()
    }

    const mediaType = item?.media?.type
    if (typeof mediaType === 'string') {
      if (mediaType.includes('image')) {
        return localized('Photo')
      }
      if (mediaType.includes('video')) {
        return localized('Video')
      }
      if (mediaType.includes('audio')) {
        return localized('Audio')
      }
      if (mediaType.includes('file')) {
        return localized('File')
      }
    }

    return ''
  }, [item?.lastMessage, item?.content, item?.media, localized])

  const safePreview = useMemo(() => {
    if (!basePreview) {
      return ''
    }

    const lastMessageSenderId = item?.lastMessageSenderId || item?.senderID
    if (lastMessageSenderId && lastMessageSenderId === userID) {
      return `You: ${basePreview}`
    }

    return basePreview
  }, [basePreview, item?.lastMessageSenderId, item?.senderID, userID])

  const safeTimestamp = useMemo(() => {
    try {
      return timeFormat(item?.updatedAt || item?.lastMessageDate || item?.createdAt)
    } catch (e) {
      return ''
    }
  }, [item?.updatedAt, item?.lastMessageDate, item?.createdAt])

  const handlePress = () => {
    if (!item?.id && !item?.channelID) {
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
          <Text
            numberOfLines={1}
            style={[styles.message, !markedAsRead && styles.unReadmessage, { flex: 1 }]}
          >
            {safePreview || ' '}
          </Text>

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