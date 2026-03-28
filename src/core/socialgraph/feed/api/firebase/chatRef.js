import firestore from '@react-native-firebase/firestore'

// 🔹 kolekcije
export const channelsRef = firestore().collection('channels')
export const messagesRef = firestore().collection('messages')
export const commentsRef = firestore().collection('comments')

// 🔹 helper za doc ref
export const DocRef = (collection, id) => {
  return firestore().collection(collection).doc(id)
}

// 🔹 chat funkcije (minimalno da app radi)
export const ChatFunctions = {
  // create or get chat channel
  getOrCreateChannel: async (user1Id, user2Id) => {
    const channelId = [user1Id, user2Id].sort().join('_')

    const ref = channelsRef.doc(channelId)
    const doc = await ref.get()

    if (!doc.exists) {
      await ref.set({
        id: channelId,
        users: [user1Id, user2Id],
        createdAt: firestore.FieldValue.serverTimestamp(),
      })
    }

    return ref
  },

  // send message
  sendMessage: async (channelId, message) => {
    return messagesRef.add({
      channelId,
      ...message,
      createdAt: firestore.FieldValue.serverTimestamp(),
    })
  },

  // get messages
  subscribeToMessages: (channelId, callback) => {
    return messagesRef
      .where('channelId', '==', channelId)
      .orderBy('createdAt', 'desc')
      .onSnapshot(callback)
  },

  // comments
  addComment: async (postId, comment) => {
    return commentsRef.add({
      postId,
      ...comment,
      createdAt: firestore.FieldValue.serverTimestamp(),
    })
  },

  subscribeToComments: (postId, callback) => {
    return commentsRef
      .where('postId', '==', postId)
      .orderBy('createdAt', 'desc')
      .onSnapshot(callback)
  },
}