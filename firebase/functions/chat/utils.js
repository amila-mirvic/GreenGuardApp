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

exports.createChannel = async data => {
  console.log('Creating channel: ')
  console.log(JSON.stringify(data))

  const { id, creatorID } = data

  const channel = await chatChannelsRef.doc(id).get()
  if (channel?.exists) {
    console.log(`invalid op, channel already exists`)
    return channel.data()
  }

  await chatChannelsRef.doc(id).set(data)

  await hydrateChatFeedsForAllParticipants(
    id,
    {
      createdAt: Math.floor(new Date().getTime() / 1000),
      senderID: creatorID,
      content: 'New channel created.',
    },
    true,
  )

  return data
}

exports.insertMessage = async data => {
  const { message, channelID } = data

  if (!channelID || !message?.id || !message?.senderID) {
    console.log('invalid insertMessage payload')
    console.log(JSON.stringify(data))
    return { success: false, error: 'Invalid message payload.' }
  }

  const channel = await chatChannelsRef.doc(channelID).get()
  if (!channel.exists) {
    console.log(`invalid op, there no such channel`)
    return { success: false, error: 'Channel does not exist.' }
  }

  const messageData = {
    ...message,
    createdAt: Math.floor(new Date().getTime() / 1000),
  }

  try {
    await add(chatChannelsRef.doc(channelID), 'messages', messageData, true)

    const updatedMetadata = {
      lastMessage:
        messageData?.content?.length > 0 ? messageData.content : messageData.media,
      lastMessageDate: messageData.createdAt,
      lastMessageSenderId: messageData.senderID,
      lastThreadMessageId: messageData.id,
      readUserIDs: [messageData.senderID],
      typingUsers: {},
    }

    await chatChannelsRef.doc(channelID).set(updatedMetadata, { merge: true })
    await hydrateChatFeedsForAllParticipants(channelID, messageData)

    broadcastNotificationToAllParticipants(channelID, messageData).catch(error => {
      console.log('broadcastNotificationToAllParticipants error:', error)
    })

    return { success: true, message: messageData }
  } catch (error) {
    console.log('insertMessage error:', error)
    return { success: false, error: error?.message || 'Failed to insert message.' }
  }
}

const hydrateChatFeedsForAllParticipants = async (
  channelID,
  message,
  isNewChannel = false,
  isLeaveGroup = false,
) => {
  const channelSnap = await chatChannelsRef.doc(channelID).get()
  const channel = channelSnap?.data()

  if (!channel) {
    return null
  }

  const sender = await fetchUser(message.senderID)

  if (!sender?.id) {
    return null
  }

  const participants = Array.isArray(channel?.participants)
    ? channel.participants.filter(participant => participant?.id)
    : []

  const otherParticipants = participants.filter(
    participant => participant.id !== sender.id,
  )

  let feedItemTitleForSender = channel?.name || ''

  if (!channel?.admins) {
    const firstOtherParticipant = otherParticipants?.[0]
    feedItemTitleForSender =
      `${firstOtherParticipant?.firstName || ''} ${
        firstOtherParticipant?.lastName || ''
      }`.trim() || channel?.name || sender?.firstName || 'Conversation'
  }

  const data = {
    id: channelID,
    title: feedItemTitleForSender,
    content: message?.content ?? '',
    media: message?.media ?? {},
    markedAsRead: true,
    createdAt: message?.createdAt,
    participants,
    creatorID: channel.creatorID,
    admins: channel?.admins ?? [],
  }

  await add(socialFeedsRef.doc(sender.id), 'chat_feed', data, true)

  let feedItemTitleForRecipients = channel?.name || ''

  if (!channel?.admins) {
    feedItemTitleForRecipients =
      `${sender?.firstName || ''} ${sender?.lastName || ''}`.trim() ||
      sender?.username ||
      'Conversation'
  }

  const promises = otherParticipants.map(async participant => {
    const participantID = participant?.id

    if (!participantID) {
      return true
    }

    const data2 = {
      id: channelID,
      title: feedItemTitleForRecipients,
      content: message?.content ?? '',
      media: message?.media ?? {},
      markedAsRead: false,
      createdAt: message?.createdAt,
      participants,
      creatorID: channel.creatorID,
      admins: channel?.admins ?? [],
    }

    await add(socialFeedsRef.doc(participantID), 'chat_feed', data2, true)
    return true
  })

  await Promise.all(promises)
  return true
}

const broadcastNotificationToAllParticipants = async (channelID, message) => {
  const channelSnap = await chatChannelsRef.doc(channelID).get()
  const channel = channelSnap?.data()
  const sender = await fetchUser(message.senderID)

  if (!channel || !sender?.id) {
    return null
  }

  const participants = Array.isArray(channel?.participants)
    ? channel.participants.filter(participant => participant?.id)
    : []

  const otherParticipants = participants?.filter(
    participant => participant && participant.id != sender.id,
  )

  const isGroupChat = channel.name && channel.name.length > 0
  const fromTitle = isGroupChat
    ? channel.name
    : `${sender.firstName || ''} ${sender.lastName || ''}`.trim()
  const downloadObject = message.media

  let content = sender.firstName || 'Someone'

  if (downloadObject) {
    if (downloadObject?.type?.includes('video')) {
      content = content + ' sent a video.'
    }
    if (downloadObject?.type?.includes('image')) {
      content = content + ' sent a photo.'
    }
    if (downloadObject?.type?.includes('audio')) {
      content = content + ' sent an audio.'
    }
    if (downloadObject?.type?.includes('file')) {
      content = content + ' sent a file.'
    }
  } else {
    if (isGroupChat) {
      content = content + ': ' + (message.content || '')
    } else {
      content = message.content || ''
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