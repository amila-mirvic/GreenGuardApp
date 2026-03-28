import { ChatFunctions, DocRef, channelsRef, socialFeedsRef } from './chatRef'

const DEFAULT_CALLABLE_TIMEOUT_MS = 30000

const withTimeout = async (promise, timeoutMs = DEFAULT_CALLABLE_TIMEOUT_MS) => {
  let timeoutId

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Request timed out after ${timeoutMs}ms`))
    }, timeoutMs)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}

const normalizeCreatedAt = value => {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const n = Number(value)
    return Number.isNaN(n) ? 0 : n
  }
  if (value?.seconds) return value.seconds
  if (typeof value?.toDate === 'function') {
    return Math.floor(value.toDate().getTime() / 1000)
  }
  return 0
}

const normalizeItem = (docOrData, fallbackID = null) => {
  if (!docOrData) return null

  if (typeof docOrData.data === 'function') {
    const data = docOrData.data()
    return {
      id: data?.id || docOrData.id || fallbackID,
      ...data,
    }
  }

  return {
    id: docOrData?.id || docOrData?.channelID || fallbackID,
    ...docOrData,
  }
}

const dedupeById = items => {
  const safeItems = Array.isArray(items) ? items.filter(Boolean) : []
  return safeItems.reduce((acc, curr) => {
    const id = curr?.id || curr?.channelID
    if (!id) return acc
    if (!acc.some(item => (item?.id || item?.channelID) === id)) {
      acc.push({
        ...curr,
        id,
      })
    }
    return acc
  }, [])
}

const sortByCreatedAtDesc = items => {
  return [...items].sort(
    (a, b) => normalizeCreatedAt(b?.createdAt) - normalizeCreatedAt(a?.createdAt),
  )
}

const parseCallableArray = (data, primaryKey) => {
  if (Array.isArray(data?.[primaryKey])) {
    return data[primaryKey]
  }

  if (Array.isArray(data)) {
    return data
  }

  if (Array.isArray(data?.items)) {
    return data.items
  }

  return []
}

const getCanonicalMessages = async (channelID, page = 0, size = 1000) => {
  try {
    const liveSnap = await channelsRef
      .doc(channelID)
      .collection('messages_live')
      .orderBy('createdAt', 'desc')
      .get()

    let historicalDocs = []

    try {
      const historicalSnap = await channelsRef
        .doc(channelID)
        .collection('messages_historical')
        .orderBy('createdAt', 'desc')
        .get()
      historicalDocs = historicalSnap?.docs ?? []
    } catch (historicalError) {
      console.log('getCanonicalMessages historical fallback:', historicalError)
    }

    const live = liveSnap?.docs?.map(doc => normalizeItem(doc)) ?? []
    const historical = historicalDocs?.map(doc => normalizeItem(doc)) ?? []

    const merged = sortByCreatedAtDesc(dedupeById([...live, ...historical]))
    const start = page * size

    return merged.slice(start, start + size)
  } catch (error) {
    console.log('getCanonicalMessages error:', error)
    return []
  }
}

const getCanonicalChannels = async (userID, page = 0, size = 1000) => {
  try {
    const liveSnap = await socialFeedsRef
      .doc(userID)
      .collection('chat_feed_live')
      .orderBy('createdAt', 'desc')
      .get()

    let historicalDocs = []

    try {
      const historicalSnap = await socialFeedsRef
        .doc(userID)
        .collection('chat_feed_historical')
        .orderBy('createdAt', 'desc')
        .get()
      historicalDocs = historicalSnap?.docs ?? []
    } catch (historicalError) {
      console.log('getCanonicalChannels historical fallback:', historicalError)
    }

    const live = liveSnap?.docs?.map(doc => normalizeItem(doc)) ?? []
    const historical = historicalDocs?.map(doc => normalizeItem(doc)) ?? []

    const merged = sortByCreatedAtDesc(dedupeById([...live, ...historical]))
    const start = page * size

    return merged.slice(start, start + size)
  } catch (error) {
    console.log('getCanonicalChannels error:', error)
    return []
  }
}

const dedupeParticipants = participants => {
  const safeParticipants = Array.isArray(participants)
    ? participants.filter(Boolean)
    : []

  return safeParticipants.reduce((acc, participant) => {
    if (!participant?.id) {
      return acc
    }
    if (!acc.some(item => item?.id === participant.id)) {
      acc.push(participant)
    }
    return acc
  }, [])
}

const buildChannelPayload = (creator, otherParticipants, name, isAdmin = false) => {
  const participants = dedupeParticipants([creator, ...(otherParticipants || [])])
  const isGroupChat = Boolean(
    isAdmin || (name && name.trim().length > 0) || participants.length > 2,
  )

  let channelID = ''

  if (!isGroupChat && participants.length === 2) {
    const sortedIDs = participants.map(item => item.id).sort()
    channelID = `${sortedIDs[0]}${sortedIDs[1]}`
  } else {
    channelID = `${creator?.id}_${Date.now()}`
  }

  const payload = {
    id: channelID,
    channelID,
    creatorID: creator?.id,
    participants,
  }

  if (isGroupChat) {
    payload.name = (name || '').trim()
    payload.admins = [creator?.id]
  }

  return payload
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

const findMessageByID = async (channelID, messageID) => {
  if (!channelID || !messageID) {
    return null
  }

  try {
    const liveDoc = await channelsRef
      .doc(channelID)
      .collection('messages_live')
      .doc(messageID)
      .get()

    if (liveDoc?.exists) {
      return normalizeItem(liveDoc, messageID)
    }

    try {
      const historicalDoc = await channelsRef
        .doc(channelID)
        .collection('messages_historical')
        .doc(messageID)
        .get()

      if (historicalDoc?.exists) {
        return normalizeItem(historicalDoc, messageID)
      }
    } catch (historicalError) {
      console.log('findMessageByID historical fallback:', historicalError)
    }

    return null
  } catch (error) {
    console.log('findMessageByID error:', error)
    return null
  }
}

export const subscribeChannels = (userID, callback) => {
  if (!userID) {
    callback && callback([])
    return () => {}
  }

  return DocRef(userID)
    .chatFeedLive
    .orderBy('createdAt', 'desc')
    .onSnapshot(
      { includeMetadataChanges: true },
      snapshot => {
        const items = snapshot?.docs?.map(doc => normalizeItem(doc)) ?? []
        callback && callback(items)
      },
      error => {
        console.log('subscribeChannels error:', error)
        callback && callback([])
      },
    )
}

export const subscribeToSingleChannel = (channelID, callback) => {
  if (!channelID) {
    callback && callback(null)
    return () => {}
  }

  return channelsRef.doc(channelID).onSnapshot(
    { includeMetadataChanges: true },
    doc => {
      callback && callback(doc?.exists ? normalizeItem(doc, channelID) : null)
    },
    error => {
      console.log('subscribeToSingleChannel error:', error)
      callback && callback(null)
    },
  )
}

export const listChannels = async (userID, page = 0, size = 1000) => {
  try {
    const res = await withTimeout(
      ChatFunctions().listChannels({
        userID,
        page,
        size,
      }),
    )

    const channels = parseCallableArray(res?.data, 'channels')

    if (channels.length > 0) {
      return channels.map(item => normalizeItem(item))
    }

    return await getCanonicalChannels(userID, page, size)
  } catch (error) {
    console.log('listChannels error:', error)
    return await getCanonicalChannels(userID, page, size)
  }
}

export const createChannel = async (
  creator,
  otherParticipants,
  name,
  isAdmin = false,
) => {
  try {
    const payload = buildChannelPayload(
      creator,
      otherParticipants,
      name,
      isAdmin,
    )

    const res = await withTimeout(ChatFunctions().createChannel(payload))
    const responseData = res?.data

    if (responseData?.id || responseData?.channelID) {
      return normalizeItem(responseData, payload.id)
    }

    return payload
  } catch (error) {
    console.log('createChannel error:', error)
    return null
  }
}

export const markChannelMessageAsRead = async (
  channelID,
  userID,
  messageID,
  readUserIDs,
) => {
  try {
    const res = await withTimeout(
      ChatFunctions().markAsRead({
        channelID,
        userID,
        messageID,
        readUserIDs,
      }),
    )
    return res?.data ?? { success: true }
  } catch (error) {
    console.log('markChannelMessageAsRead error:', error)
    return { success: false, error: error?.message || error }
  }
}

export const markUserAsTypingInChannel = async (channelID, userID) => {
  try {
    const res = await withTimeout(
      ChatFunctions().markUserAsTypingInChannel({
        channelID,
        userID,
      }),
    )
    return res?.data ?? { success: true }
  } catch (error) {
    console.log('markUserAsTypingInChannel error:', error)
    return { success: false, error: error?.message || error }
  }
}


export const sendMessage = async (channel, newMessage) => {
  try {
    const channelID = channel?.id || channel?.channelID

    if (!channelID) {
      throw new Error('Missing channelID')
    }

    // 🔥 KRITIČNO: garantujemo da message ima ID i createdAt
    const safeMessage = {
      ...newMessage,
      id: newMessage?.id || `${Date.now()}_${Math.random()}`,
      createdAt:
        typeof newMessage?.createdAt === 'number'
          ? newMessage.createdAt
          : Math.floor(Date.now() / 1000),
    }

    // 👉 prvo pokušavamo callable (backend)
    try {
      const res = await withTimeout(
        ChatFunctions().insertMessage({
          channelID,
          channel,
          message: safeMessage,
        }),
      )

      // provjera da li je stvarno upisano
      const messageDoc = await findMessageByID(channelID, safeMessage.id)
      if (messageDoc) {
        return res?.data ?? { success: true }
      }

      // retry nakon delay
      await wait(1200)
      const delayedMessageDoc = await findMessageByID(channelID, safeMessage.id)
      if (delayedMessageDoc) {
        return res?.data ?? { success: true }
      }
    } catch (callableError) {
      console.log('sendMessage callable error:', callableError)
    }

    // 🔥 FALLBACK: direktno upisujemo u Firestore
    await channelsRef
      .doc(channelID)
      .collection('messages_live')
      .doc(safeMessage.id)
      .set(safeMessage, { merge: true })

    // update channel metadata
    await channelsRef.doc(channelID).set(
      {
        id: channelID,
        channelID,
        participants: Array.isArray(channel?.participants)
          ? channel.participants
          : [],
        name: channel?.name || channel?.title || '',
        admins: Array.isArray(channel?.admins) ? channel.admins : null,
        lastMessage:
          safeMessage?.content?.length > 0
            ? safeMessage.content
            : safeMessage?.media?.url || safeMessage?.media || '',
        lastMessageDate: safeMessage.createdAt,
        createdAt: channel?.createdAt || safeMessage.createdAt,
        creatorID: channel?.creatorID || safeMessage.senderID,
        lastMessageSenderId: safeMessage.senderID,
        lastThreadMessageId: safeMessage.id,
        readUserIDs: [safeMessage.senderID],
        typingUsers: {},
      },
      { merge: true },
    )

    return { success: true, fallback: true }
  } catch (error) {
    console.log('sendMessage error:', error)
    return { success: false, error: error?.message || error }
  }
}



export const deleteMessage = async (channel, messageID) => {
  try {
    const channelID = channel?.id || channel?.channelID
    const res = await withTimeout(
      ChatFunctions().deleteMessage({
        channelID,
        messageID,
      }),
    )
    return res?.data ?? { success: true }
  } catch (error) {
    console.log('deleteMessage error:', error)
    return { success: false, error: error?.message || error }
  }
}

export const subscribeToMessages = (channelID, callback) => {
  if (!channelID) {
    callback && callback([])
    return () => {}
  }

  let live = []
  let historical = []

  const emit = () => {
    const merged = sortByCreatedAtDesc(dedupeById([...live, ...historical]))
    callback && callback(merged)
  }

  const unsubscribeLive = channelsRef
    .doc(channelID)
    .collection('messages_live')
    .orderBy('createdAt', 'desc')
    .onSnapshot(
      { includeMetadataChanges: true },
      snapshot => {
        live = snapshot?.docs?.map(doc => normalizeItem(doc)) ?? []
        emit()
      },
      error => {
        console.log('subscribeToMessages live error:', error)
        live = []
        emit()
      },
    )

  let unsubscribeHistorical = null

  try {
    unsubscribeHistorical = channelsRef
      .doc(channelID)
      .collection('messages_historical')
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        { includeMetadataChanges: true },
        snapshot => {
          historical = snapshot?.docs?.map(doc => normalizeItem(doc)) ?? []
          emit()
        },
        error => {
          console.log('subscribeToMessages historical error:', error)
          historical = []
          emit()
        },
      )
  } catch (historicalError) {
    console.log('subscribeToMessages historical setup error:', historicalError)
  }

  return () => {
    unsubscribeLive && unsubscribeLive()
    unsubscribeHistorical && unsubscribeHistorical()
  }
}

export const listMessages = async (channelID, page = 0, size = 1000) => {
  try {
    const res = await withTimeout(
      ChatFunctions().listMessages({
        channelID,
        page,
        size,
      }),
    )

    const messages = parseCallableArray(res?.data, 'messages')

    if (messages.length > 0) {
      return messages.map(item => normalizeItem(item))
    }
  } catch (error) {
    console.log('listMessages error:', error)
  }

  return await getCanonicalMessages(channelID, page, size)
}

export const leaveGroup = async (channelID, userID, content) => {
  try {
    const res = await withTimeout(
      ChatFunctions().leaveGroup({
        channelID,
        userID,
        content,
      }),
    )
    return res?.data ?? { success: true }
  } catch (error) {
    console.log('leaveGroup error:', error)
    return { success: false, error: error?.message || error }
  }
}

export const updateGroup = async (channelID, userID, channelData) => {
  try {
    const res = await withTimeout(
      ChatFunctions().updateGroup({
        channelID,
        userID,
        channelData,
      }),
    )
    return res?.data ?? { success: true }
  } catch (error) {
    console.log('updateGroup error:', error)
    return { success: false, error: error?.message || error }
  }
}

export const deleteGroup = async channelID => {
  try {
    const res = await withTimeout(
      ChatFunctions().deleteGroup({
        channelID,
      }),
    )
    return res?.data ?? { success: true }
  } catch (error) {
    console.log('deleteGroup error:', error)
    return { success: false, error: error?.message || error }
  }
}

export const addReaction = async (messageID, authorID, reaction, channelID) => {
  try {
    const res = await withTimeout(
      ChatFunctions().addMessageReaction({
        messageID,
        authorID,
        reaction,
        channelID,
      }),
    )
    return res?.data ?? { success: true }
  } catch (error) {
    console.log('addReaction error:', error)
    return { success: false, error: error?.message || error }
  }
}