const admin = require('firebase-admin')
const { v4: uuidv4 } = require('uuid')

const db = admin.firestore()
const socialFeedsRef = db.collection('social_feeds')
const chatChannelsRef = db.collection('channels')

const userClient = require('../core/user')
const { fetchUser } = userClient

const collectionsUtils = require('../core/collections')
const { sendPushNotification } = require('../notifications/utils')
const { add } = collectionsUtils

const normalizeParticipant = participant => {
  if (!participant) {
    return null
  }

  const participantID = participant.id || participant.userID
  if (!participantID) {
    return null
  }

  return participant.id ? participant : { ...participant, id: participantID }
}

const isValidParticipant = participant => {
  return Boolean(normalizeParticipant(participant))
}

const ensureChannelDocumentExists = async (channelID, channelPayload, message) => {
  const channelRef = chatChannelsRef.doc(channelID)
  const channelSnapshot = await channelRef.get()

  if (channelSnapshot.exists) {
    return channelSnapshot.data()
  }

  const participants = Array.isArray(channelPayload?.participants)
    ? channelPayload.participants.map(normalizeParticipant).filter(Boolean)
    : []

  if (!participants.length) {
    return null
  }

  const creatorID =
    channelPayload?.creatorID || message?.senderID || participants?.[0]?.id

  const payload = {
    id: channelID,
    creatorID,
    participants,
  }

  if (Array.isArray(channelPayload?.admins) && channelPayload.admins.length > 0) {
    payload.admins = channelPayload.admins
  }

  if (typeof channelPayload?.name === 'string') {
    payload.name = channelPayload.name
  }

  await channelRef.set(payload, { merge: true })
  return payload
}

exports.createChannel = async data => {
  console.log('Creating channel: ')
  console.log(JSON.stringify(data))

  const { id, creatorID } = data

  const channel = await chatChannelsRef.doc(id).get()
  if (channel?.exists) {
    console.log(`invalid op, channel already exists`)
    return channel.data()
  }

  const normalizedParticipants = Array.isArray(data?.participants)
    ? data.participants.map(normalizeParticipant).filter(Boolean)
    : []

  const normalizedChannelData = {
    ...data,
    participants: normalizedParticipants,
  }

  await chatChannelsRef.doc(id).set(normalizedChannelData)

  await hydrateChatFeedsForAllParticipants(
    id,
    {
      createdAt: Math.floor(new Date().getTime() / 1000),
      senderID: creatorID,
      content: 'New channel created.',
    },
    true,
  )

  return normalizedChannelData
}

exports.insertMessage = async data => {
  const { message, channelID, channel: channelPayload } = data

  if (!channelID || !message?.id || !message?.senderID) {
    console.log('invalid insertMessage payload')
    return {
      success: false,
      error: 'Missing channel or message payload.',
    }
  }

  const ensuredChannel = await ensureChannelDocumentExists(
    channelID,
    channelPayload,
    message,
  )

  if (!ensuredChannel) {
    console.log(`invalid op, there no such channel and it could not be restored`)
    return {
      success: false,
      error: 'Channel does not exist.',
    }
  }

  const messageData = {
    ...message,
    createdAt: Math.floor(new Date().getTime() / 1000),
  }

  await add(chatChannelsRef.doc(channelID), 'messages', messageData, true)

  const updatedMetadata = {
    lastMessage:
      messageData?.content?.length > 0 ? messageData?.content : messageData?.media,
    lastMessageDate: messageData.createdAt,
    lastMessageSenderId: messageData.senderID,
    lastThreadMessageId: messageData.id,
    readUserIDs: [messageData.senderID],
    typingUsers: {},
  }
  await chatChannelsRef.doc(channelID).set(updatedMetadata, { merge: true })

  await hydrateChatFeedsForAllParticipants(channelID, messageData)
  await broadcastNotificationToAllParticipants(channelID, messageData)

  return { success: true, channelID, messageID: messageData.id }
}

const hydrateChatFeedsForAllParticipants = async (
  channelID,
  message,
  isNewChannel = false,
  isLeaveGroup = false,
) => {
  const channelSnap = await chatChannelsRef.doc(channelID).get()
  const channel = channelSnap?.data()
  const sender = await fetchUser(message.senderID)

  if (!channel || !sender) {
    return
  }

  console.log('channel:')
  console.log(JSON.stringify(channel))
  console.log('sender:')
  console.log(JSON.stringify(sender))

  const participants = Array.isArray(channel?.participants)
    ? channel.participants.map(normalizeParticipant).filter(Boolean)
    : []

  if (!participants.length) {
    return
  }

  var feedItemTitleForSender = channel?.name

  const otherParticipants = participants.filter(
    participant => participant && participant.id !== sender.id,
  )

  if (!channel?.admins && otherParticipants.length > 0) {
    feedItemTitleForSender = `${otherParticipants[0].firstName} ${otherParticipants[0].lastName}`
  }

  const data = {
    id: channelID,
    title: feedItemTitleForSender ?? '',
    content: message?.content ?? '',
    media: message?.media ?? {},
    markedAsRead: true,
    createdAt: message?.createdAt,
    participants: participants,
    creatorID: channel.creatorID,
    admins: channel?.admins ?? [],
    lastMessage: message?.content ?? '',
    lastMessageDate: message?.createdAt,
    lastThreadMessageId: message?.id ?? '',
    readUserIDs: message?.readUserIDs ?? [],
  }

  console.log(JSON.stringify(data))

  await add(socialFeedsRef.doc(sender.id), 'chat_feed', data, true)

  var feedItemTitleForRecipients = channel?.name

  if (!channel?.admins) {
    feedItemTitleForRecipients = `${sender?.firstName} ${sender.lastName}`
  }

  const promises = otherParticipants.map(async participant => {
    const participantID = participant?.id
    const data2 = {
      id: channelID,
      title: feedItemTitleForRecipients,
      content: message?.content ?? '',
      media: message?.media ?? {},
      markedAsRead: false,
      createdAt: message?.createdAt,
      participants: participants,
      creatorID: channel.creatorID,
      admins: channel?.admins ?? [],
      lastMessage: message?.content ?? '',
      lastMessageDate: message?.createdAt,
      lastThreadMessageId: message?.id ?? '',
      readUserIDs: message?.readUserIDs ?? [],
    }
    console.log(JSON.stringify(data2))
    await add(socialFeedsRef.doc(participantID), 'chat_feed', data2, true)

    return true
  })
  await Promise.all(promises)
}

const broadcastNotificationToAllParticipants = async (channelID, message) => {
  const channelSnap = await chatChannelsRef.doc(channelID).get()
  const channel = channelSnap?.data()
  const sender = await fetchUser(message.senderID)

  if (!channel || !sender) {
    return null
  }

  const participants = Array.isArray(channel?.participants)
    ? channel.participants.map(normalizeParticipant).filter(Boolean)
    : []

  const otherParticipants = participants.filter(
    participant => participant && participant.id != sender.id,
  )

  const isGroupChat = channel.name && channel.name.length > 0
  const fromTitle = isGroupChat
    ? channel.name
    : sender.firstName + ' ' + sender.lastName
  const downloadObject = message.media

  var content = sender.firstName

  if (downloadObject) {
    if (downloadObject?.type?.includes('video')) {
      content = content + ' ' + 'sent a video.'
    }
    if (downloadObject?.type?.includes('image')) {
      content = content + ' ' + 'sent a photo.'
    }
    if (downloadObject?.type?.includes('audio')) {
      content = content + ' ' + 'sent an audio.'
    }
    if (downloadObject?.type?.includes('file')) {
      content = content + ' ' + 'sent a file.'
    }
  } else {
    if (isGroupChat) {
      content = content + ': ' + message.content
    } else {
      content = message.content
    }
  }

  const promises = otherParticipants.map(async participant => {
    await sendPushNotification(
      participant.id,
      fromTitle,
      content,
      'chat_message',
      { channleID: channelID },
    )
    return true
  })

  await Promise.all(promises)
  return null
}

exports.hydrateChatFeedsForAllParticipants = hydrateChatFeedsForAllParticipants
