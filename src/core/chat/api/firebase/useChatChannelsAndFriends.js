import { useMemo } from 'react'
import { useChatChannels } from './useChatChannels'
import { useSocialGraphFriends } from '../../../socialgraph/friendships'
import { useCurrentUser } from '../../../onboarding'

const buildDirectChannelID = (id1, id2) => {
  if (!id1 || !id2) return ''
  return id1 < id2 ? `${id1}${id2}` : `${id2}${id1}`
}

const getItemID = item => item?.id || item?.channelID

const getItemTimestamp = item =>
  Number(item?.lastMessageDate || item?.updatedAt || item?.createdAt || 0)

const normalizeConversation = item => {
  if (!item) {
    return null
  }

  const id = getItemID(item)
  if (!id) {
    return null
  }

  return {
    ...item,
    id,
    channelID: id,
    participants: Array.isArray(item?.participants)
      ? item.participants.filter(Boolean)
      : [],
  }
}

const getNonEmptyString = (...values) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim()
    }
  }
  return ''
}

const mergeTwoItems = (existingItem, incomingItem) => {
  const existing = normalizeConversation(existingItem)
  const incoming = normalizeConversation(incomingItem)

  if (!existing) return incoming
  if (!incoming) return existing

  const existingTs = getItemTimestamp(existing)
  const incomingTs = getItemTimestamp(incoming)

  const newer = incomingTs >= existingTs ? incoming : existing
  const older = incomingTs >= existingTs ? existing : incoming

  return {
    ...older,
    ...newer,
    id: newer.id || older.id,
    channelID: newer.channelID || older.channelID,
    participants:
      Array.isArray(newer?.participants) && newer.participants.length > 0
        ? newer.participants
        : Array.isArray(older?.participants)
        ? older.participants
        : [],
    title: getNonEmptyString(newer?.title, older?.title),
    name: getNonEmptyString(newer?.name, older?.name),
    lastMessage: getNonEmptyString(
      newer?.lastMessage,
      newer?.content,
      older?.lastMessage,
      older?.content,
    ),
    content: getNonEmptyString(
      newer?.content,
      newer?.lastMessage,
      older?.content,
      older?.lastMessage,
    ),
    lastMessageDate:
      newer?.lastMessageDate ?? older?.lastMessageDate ?? older?.createdAt ?? '',
    lastMessageSenderId:
      newer?.lastMessageSenderId ?? older?.lastMessageSenderId ?? '',
    markedAsRead:
      typeof newer?.markedAsRead === 'boolean'
        ? newer.markedAsRead
        : typeof older?.markedAsRead === 'boolean'
        ? older.markedAsRead
        : true,
  }
}

export const useChatChannelsAndFriends = () => {
  const currentUser = useCurrentUser()
  const {
    channels,
    refreshing,
    loadingBottom,
    subscribeToChannels,
    loadMoreChannels,
    pullToRefresh,
    createChannel,
    markChannelMessageAsRead,
    markUserAsTypingInChannel,
    updateGroup,
    leaveGroup,
    deleteGroup,
  } = useChatChannels()

  const { friends } = useSocialGraphFriends(currentUser?.id)

  const hydratedListWithChannelsAndFriends = useMemo(() => {
    const safeChannels = Array.isArray(channels) ? channels.filter(Boolean) : []
    const safeFriends = Array.isArray(friends) ? friends.filter(Boolean) : []

    const byID = new Map()

    safeChannels.forEach(channel => {
      const normalized = normalizeConversation(channel)
      const id = getItemID(normalized)
      if (!id) return
      byID.set(id, normalized)
    })

    safeFriends.forEach(friend => {
      const friendID = friend?.id || friend?.userID
      const currentUserID = currentUser?.id || currentUser?.userID

      if (!friendID || !currentUserID || friendID === currentUserID) {
        return
      }

      const channelID = buildDirectChannelID(currentUserID, friendID)

      const placeholder = {
        id: channelID,
        channelID,
        participants: [currentUser, friend].filter(Boolean),
        title:
          `${friend?.firstName || ''} ${friend?.lastName || ''}`.trim() ||
          friend?.username ||
          'Conversation',
        lastMessage: '',
        content: '',
        markedAsRead: true,
      }

      const existing = byID.get(channelID)
      byID.set(channelID, mergeTwoItems(existing, placeholder))
    })

    return Array.from(byID.values()).sort(
      (a, b) => getItemTimestamp(b) - getItemTimestamp(a),
    )
  }, [channels, friends, currentUser])

  return {
    hydratedListWithChannelsAndFriends,
    channels,
    refreshing,
    loadingBottom,
    subscribeToChannels,
    loadMoreChannels,
    pullToRefresh,
    createChannel,
    markChannelMessageAsRead,
    markUserAsTypingInChannel,
    updateGroup,
    leaveGroup,
    deleteGroup,
  }
}