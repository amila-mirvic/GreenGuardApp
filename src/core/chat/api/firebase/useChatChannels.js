import { useRef, useState } from 'react'
import {
  subscribeChannels as subscribeChannelsAPI,
  listChannels as listChannelsAPI,
  createChannel as createChannelAPI,
  markChannelMessageAsRead as markChannelMessageAsReadAPI,
  updateGroup as updateGroupAPI,
  leaveGroup as leaveGroupAPI,
  deleteGroup as deleteGroupAPI,
  markUserAsTypingInChannel as markUserAsTypingInChannelAPI,
} from './firebaseChatClient'

const getChannelID = item => item?.id || item?.channelID

const getChannelTimestamp = item =>
  Number(item?.lastMessageDate || item?.updatedAt || item?.createdAt || 0)

const normalizeChannel = item => {
  if (!item) {
    return null
  }

  const id = getChannelID(item)
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

const mergeTwoChannels = (existingItem, incomingItem) => {
  const existing = normalizeChannel(existingItem)
  const incoming = normalizeChannel(incomingItem)

  if (!existing) return incoming
  if (!incoming) return existing

  const existingTs = getChannelTimestamp(existing)
  const incomingTs = getChannelTimestamp(incoming)

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
    content: getNonEmptyString(
      newer?.content,
      newer?.lastMessage,
      older?.content,
      older?.lastMessage,
    ),
    lastMessage: getNonEmptyString(
      newer?.lastMessage,
      newer?.content,
      older?.lastMessage,
      older?.content,
    ),
    media: newer?.media ?? older?.media ?? null,
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
    createdAt: newer?.createdAt ?? older?.createdAt ?? '',
  }
}

const mergeChannelLists = (oldChannels, newChannels, appendToBottom = false) => {
  const oldList = Array.isArray(oldChannels) ? oldChannels.filter(Boolean) : []
  const newList = Array.isArray(newChannels) ? newChannels.filter(Boolean) : []

  const ordered = appendToBottom
    ? [...oldList, ...newList]
    : [...newList, ...oldList]

  const byID = new Map()

  ordered.forEach(item => {
    const normalized = normalizeChannel(item)
    const id = getChannelID(normalized)
    if (!id) {
      return
    }

    const existing = byID.get(id)
    byID.set(id, mergeTwoChannels(existing, normalized))
  })

  return Array.from(byID.values()).sort(
    (a, b) => getChannelTimestamp(b) - getChannelTimestamp(a),
  )
}

export const useChatChannels = () => {
  const [channels, setChannels] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingBottom, setLoadingBottom] = useState(false)

  const pagination = useRef({ page: 0, size: 25, exhausted: false })
  const realtimeChannelsRef = useRef([])
  const semaphores = useRef({ isMarkingAsTyping: false })

  const loadMoreChannels = async userID => {
    if (!userID || pagination.current.exhausted || loadingBottom) {
      return
    }

    try {
      setLoadingBottom(true)

      const newChannels = await listChannelsAPI(
        userID,
        pagination.current.page,
        pagination.current.size,
      )

      const safeChannels = Array.isArray(newChannels) ? newChannels : []

      if (safeChannels.length < pagination.current.size) {
        pagination.current.exhausted = true
      } else {
        pagination.current.page += 1
      }

      if (safeChannels.length > 0) {
        setChannels(oldChannels =>
          mergeChannelLists(oldChannels, safeChannels, true),
        )
      }
    } catch (error) {
      console.log('loadMoreChannels error:', error)
    } finally {
      setLoadingBottom(false)
    }
  }

  const subscribeToChannels = userID => {
    return subscribeChannelsAPI(userID, newChannels => {
      const safeChannels = Array.isArray(newChannels) ? newChannels : []
      realtimeChannelsRef.current = safeChannels
        .map(normalizeChannel)
        .filter(Boolean)

      setChannels(oldChannels =>
        mergeChannelLists(oldChannels, safeChannels, false),
      )
    })
  }

  const pullToRefresh = async userID => {
    if (!userID) return

    try {
      setRefreshing(true)
      pagination.current = { page: 0, size: 25, exhausted: false }

      const newChannels = await listChannelsAPI(
        userID,
        pagination.current.page,
        pagination.current.size,
      )

      const safeChannels = Array.isArray(newChannels) ? newChannels : []

      if (safeChannels.length < pagination.current.size) {
        pagination.current.exhausted = true
      } else {
        pagination.current.page += 1
      }

      setChannels(oldChannels =>
        mergeChannelLists(
          mergeChannelLists(oldChannels, realtimeChannelsRef.current, false),
          safeChannels,
          false,
        ),
      )
    } catch (error) {
      console.log('pullToRefresh channels error:', error)
      setChannels(oldChannels =>
        mergeChannelLists(oldChannels, realtimeChannelsRef.current, false),
      )
    } finally {
      setRefreshing(false)
    }
  }

  const createChannel = async (creator, otherParticipants, name, isAdmin) => {
    return await createChannelAPI(creator, otherParticipants, name, isAdmin)
  }

  const markUserAsTypingInChannel = async (channelID, userID) => {
    if (semaphores.current.isMarkingAsTyping === true) {
      return
    }
    semaphores.current.isMarkingAsTyping = true
    const res = await markUserAsTypingInChannelAPI(channelID, userID)
    semaphores.current.isMarkingAsTyping = false
    return res
  }

  const markChannelMessageAsRead = async (
    channelID,
    userID,
    threadMessageID,
    readUserIDs,
  ) => {
    return await markChannelMessageAsReadAPI(
      channelID,
      userID,
      threadMessageID,
      readUserIDs,
    )
  }

  const updateGroup = async (channelID, userID, data) => {
    return await updateGroupAPI(channelID, userID, data)
  }

  const leaveGroup = async (channelID, userID, content) => {
    return await leaveGroupAPI(channelID, userID, content)
  }

  const deleteGroup = async channelID => {
    return await deleteGroupAPI(channelID)
  }

  return {
    channels,
    refreshing,
    loadingBottom,
    subscribeToChannels,
    loadMoreChannels,
    pullToRefresh,
    markChannelMessageAsRead,
    markUserAsTypingInChannel,
    createChannel,
    updateGroup,
    leaveGroup,
    deleteGroup,
  }
}