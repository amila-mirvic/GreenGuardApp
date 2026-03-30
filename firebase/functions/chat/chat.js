const functions = require('firebase-functions')
const admin = require('firebase-admin')
const { v4: uuidv4 } = require('uuid')

const db = admin.firestore()

const socialFeedsRef = db.collection('social_feeds')
const chatChannelsRef = db.collection('channels')

const HOT_PATH_RUNTIME = {
  minInstances: 1,
}

const userClient = require('../core/user')
const { fetchUser } = userClient

const collectionsUtils = require('../core/collections')
const { add, remove, getList, getDoc, deleteCollection } = collectionsUtils

const { createChannel, insertMessage } = require('./utils')
const { hydrateChatFeedsForAllParticipants } = require('./utils')

exports.createChannel = functions
  .runWith(HOT_PATH_RUNTIME)
  .https.onCall(async (data, context) => {
    return await createChannel(data)
  })

exports.markAsRead = functions
  .runWith(HOT_PATH_RUNTIME)
  .https.onCall(async (data, context) => {
    console.log('Mark as read: ')
    console.log(JSON.stringify(data))

    const { channelID, userID, messageID, readUserIDs } = data

    const dedupedReadUserIDs = [...new Set(readUserIDs)]

    if (messageID) {
      const doc = await getDoc(
        chatChannelsRef.doc(channelID),
        'messages',
        messageID,
      )
      console.log(doc)
      if (doc?.ref) {
        doc.ref.set({ readUserIDs }, { merge: true })
      }
    }

    const channel = await chatChannelsRef.doc(channelID).get()
    if (channel.exists) {
      chatChannelsRef.doc(channelID).set(
        {
          readUserIDs: dedupedReadUserIDs,
        },
        { merge: true },
      )
    }

    await add(socialFeedsRef.doc(userID), 'chat_feed', {
      id: channelID,
      markedAsRead: true,
    })

    return { success: true }
  })

exports.markUserAsTypingInChannel = functions
  .runWith(HOT_PATH_RUNTIME)
  .https.onCall(async (data, context) => {
    console.log('Update user as typing in channel: ')
    console.log(JSON.stringify(data))

    const { channelID, userID } = data
    const channel = await chatChannelsRef.doc(channelID).get()

    if (channel.exists) {
      const channelData = channel.data()
      var typingUsers = (channelData ? channelData.typingUsers : {}) ?? {}
      typingUsers[userID] = {
        lastTypingDate: Math.floor(new Date().getTime() / 1000),
      }
      chatChannelsRef.doc(channelID).set(
        {
          typingUsers: typingUsers,
        },
        { merge: true },
      )
    }

    return { success: true }
  })

exports.listMessages = functions
  .runWith(HOT_PATH_RUNTIME)
  .https.onCall(async (data, context) => {
    const { channelID, page, size } = data
    console.log(`fetching messages `)
    console.log(JSON.stringify(data))

    const messages = await getList(
      chatChannelsRef.doc(channelID),
      'messages',
      page,
      size,
      true,
    )
    if (messages?.length > 0) {
      console.log(`fetched messages: `)
      console.log(messages)
      return { messages, success: true }
    } else {
      return { messages: [], success: true }
    }
  })

exports.insertMessage = functions
  .runWith(HOT_PATH_RUNTIME)
  .https.onCall(async (data, context) => {
    return await insertMessage(data)
  })

exports.deleteMessage = functions
  .runWith(HOT_PATH_RUNTIME)
  .https.onCall(async (data, context) => {
    const { channelID, messageID } = data

    await remove(chatChannelsRef.doc(channelID), 'messages', messageID, true)
    console.log(`Delete message ${messageID}`)

    const liveMessageSnapshot = await chatChannelsRef
      .doc(channelID)
      .collection('messages_live')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get()

    const historicalMessageSnapshot = await chatChannelsRef
      .doc(channelID)
      .collection('messages_historical')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get()

    var lastMessage = null

    if (liveMessageSnapshot?.docs?.length > 0) {
      lastMessage = liveMessageSnapshot.docs[0].data()
    }

    if (historicalMessageSnapshot?.docs?.length > 0) {
      const tempMessage = historicalMessageSnapshot.docs[0].data()
      if (lastMessage) {
        lastMessage =
          tempMessage.createdAt > lastMessage?.createdAt
            ? tempMessage
            : lastMessage
      } else {
        lastMessage = tempMessage
      }
    }

    var updatedMetadata = {
      lastMessage: '',
      lastMessageDate: '',
      lastMessageSenderId: '',
      lastThreadMessageId: '',
      readUserIDs: [],
    }

    if (lastMessage) {
      updatedMetadata = {
        lastMessage:
          lastMessage.content?.length > 0 ? lastMessage.content : lastMessage.media,
        lastMessageDate: lastMessage.createdAt,
        lastMessageSenderId: lastMessage.senderID,
        lastThreadMessageId: lastMessage.id || lastMessage._id || '',
        readUserIDs: [lastMessage.senderID],
      }
    }

    await chatChannelsRef.doc(channelID).set(updatedMetadata, { merge: true })

    if (lastMessage) {
      await hydrateChatFeedsForAllParticipants(channelID, lastMessage)
    }

    return { success: true }
  })

exports.listChannels = functions
  .runWith(HOT_PATH_RUNTIME)
  .https.onCall(async (data, context) => {
    const { userID, page, size } = data
    console.log(`fetching chat channels `)
    console.log(JSON.stringify(data))

    const channels = await getList(
      socialFeedsRef.doc(userID),
      'chat_feed',
      page,
      size,
      true,
    )
    if (channels?.length > 0) {
      console.log(`fetched channels: `)
      console.log(JSON.stringify(channels))
      return { channels, success: true }
    } else {
      return { channels: [], success: true }
    }
  })

exports.addMessageReaction = functions
  .runWith(HOT_PATH_RUNTIME)
  .https.onCall(async (data, context) => {
    console.log(`Reacting to Message: ${JSON.stringify(data)}`)

    const reactionKeys = [
      'like',
      'love',
      'laugh',
      'angry',
      'surprised',
      'cry',
      'sad',
    ]

    const { authorID, messageID, reaction, channelID } = data

    if (messageID) {
      const messageDoc = await getDoc(
        chatChannelsRef.doc(channelID),
        'messages',
        messageID,
      )
      if (messageDoc.exists) {
        const message = messageDoc.data()

        const messageReactionsDict = message?.reactions
          ? message?.reactions
          : reactionKeys.reduce(
              (a, v) => ({
                ...a,
                [v]: [],
              }),
              {},
            )
        var newMessageReactionsDict = {}
        var reactionsCount = message?.reactionsCount ? message?.reactionsCount : 0

        const userReactionKey = reactionKeys?.find(
          key =>
            messageReactionsDict[key] &&
            messageReactionsDict[key]?.includes(authorID),
        )
        if (userReactionKey) {
          if (userReactionKey === reaction) {
            newMessageReactionsDict = {
              ...messageReactionsDict,
              [userReactionKey]: messageReactionsDict[userReactionKey].filter(
                userID => userID !== authorID,
              ),
            }
            reactionsCount -= 1
          } else {
            newMessageReactionsDict = {
              ...messageReactionsDict,
              [userReactionKey]: messageReactionsDict[userReactionKey].filter(
                userID => userID !== authorID,
              ),
              [reaction]: [...(messageReactionsDict[reaction] || []), authorID],
            }
          }
        } else {
          newMessageReactionsDict = {
            ...messageReactionsDict,
            [reaction]: [...(messageReactionsDict[reaction] || []), authorID],
          }
          reactionsCount += 1
        }

        await messageDoc.ref.set(
          {
            reactions: newMessageReactionsDict,
            reactionsCount,
          },
          { merge: true },
        )
      }
    }

    return { success: true }
  })