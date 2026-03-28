import { ChatFunctions, DocRef, channelsRef } from './chatRef'

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
        const items = snapshot?.docs?.map(doc => doc.data()) ?? []
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
      callback && callback(doc?.exists ? doc.data() : null)
    },
    error => {
      console.log('subscribeToSingleChannel error:', error)
      callback && callback(null)
    },
  )
}

export const listChannels = async (userID, page = 0, size = 1000) => {
  try {
    const res = await ChatFunctions().listChannels({
      userID,
      page,
      size,
    })
    return res?.data?.channels ?? []
  } catch (error) {
    console.log('listChannels error:', error)
    return []
  }
}

export const createChannel = async (
  creator,
  otherParticipants,
  name,
  isAdmin = false,
) => {
  try {
    const res = await ChatFunctions().createChannel({
      creator,
      otherParticipants,
      name,
      isAdmin,
    })
    return res?.data ?? null
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
    const res = await ChatFunctions().markAsRead({
      channelID,
      userID,
      messageID,
      readUserIDs,
    })
    return res?.data ?? { success: true }
  } catch (error) {
    console.log('markChannelMessageAsRead error:', error)
    return { success: false, error }
  }
}

export const markUserAsTypingInChannel = async (channelID, userID) => {
  try {
    const res = await ChatFunctions().markUserAsTypingInChannel({
      channelID,
      userID,
    })
    return res?.data ?? { success: true }
  } catch (error) {
    console.log('markUserAsTypingInChannel error:', error)
    return { success: false, error }
  }
}

export const sendMessage = async (channel, newMessage) => {
  try {
    const channelID = channel?.id || channel?.channelID
    const res = await ChatFunctions().insertMessage({
      channelID,
      channel,
      message: newMessage,
    })
    return res?.data ?? { success: true }
  } catch (error) {
    console.log('sendMessage error:', error)
    return { success: false, error }
  }
}

export const deleteMessage = async (channel, messageID) => {
  try {
    const channelID = channel?.id || channel?.channelID
    const res = await ChatFunctions().deleteMessage({
      channelID,
      messageID,
    })
    return res?.data ?? { success: true }
  } catch (error) {
    console.log('deleteMessage error:', error)
    return { success: false, error }
  }
}

export const subscribeToMessages = (channelID, callback) => {
  if (!channelID) {
    callback && callback([])
    return () => {}
  }

  return DocRef(channelID)
    .messagesLive
    .orderBy('createdAt', 'desc')
    .onSnapshot(
      { includeMetadataChanges: true },
      snapshot => {
        const items = snapshot?.docs?.map(doc => doc.data()) ?? []
        callback && callback(items)
      },
      error => {
        console.log('subscribeToMessages error:', error)
        callback && callback([])
      },
    )
}

export const listMessages = async (channelID, page = 0, size = 1000) => {
  try {
    const res = await ChatFunctions().listMessages({
      channelID,
      page,
      size,
    })
    return res?.data?.messages ?? []
  } catch (error) {
    console.log('listMessages error:', error)
    return []
  }
}

export const leaveGroup = async (channelID, userID, content) => {
  try {
    const res = await ChatFunctions().leaveGroup({
      channelID,
      userID,
      content,
    })
    return res?.data ?? { success: true }
  } catch (error) {
    console.log('leaveGroup error:', error)
    return { success: false, error }
  }
}

export const updateGroup = async (channelID, userID, channelData) => {
  try {
    const res = await ChatFunctions().updateGroup({
      channelID,
      userID,
      channelData,
    })
    return res?.data ?? { success: true }
  } catch (error) {
    console.log('updateGroup error:', error)
    return { success: false, error }
  }
}

export const deleteGroup = async channelID => {
  try {
    const res = await ChatFunctions().deleteGroup({
      channelID,
    })
    return res?.data ?? { success: true }
  } catch (error) {
    console.log('deleteGroup error:', error)
    return { success: false, error }
  }
}

export const addReaction = async (messageID, authorID, reaction, channelID) => {
  try {
    const res = await ChatFunctions().addMessageReaction({
      messageID,
      authorID,
      reaction,
      channelID,
    })
    return res?.data ?? { success: true }
  } catch (error) {
    console.log('addReaction error:', error)
    return { success: false, error }
  }
}