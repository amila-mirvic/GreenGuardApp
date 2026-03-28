const admin = require('firebase-admin')
const db = admin.firestore()
const functions = require('firebase-functions')

const notificationsRef = db.collection('notifications')

exports.listNotifications = functions.https.onCall(async (data, context) => {
  try {
    const { userID } = data || {}

    if (!userID) {
      return { notifications: [], success: true }
    }

    const snapshot = await notificationsRef
      .where('toUserID', '==', userID)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get()

    const notifications =
      snapshot?.docs?.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) ?? []

    return { notifications, success: true }
  } catch (error) {
    console.log('listNotifications error:', error)
    return { notifications: [], success: false }
  }
})

exports.updateNotification = functions.https.onCall(async (data, context) => {
  try {
    const { notificationID } = data || {}

    if (!notificationID) {
      return { success: false }
    }

    await notificationsRef.doc(notificationID).set(
      {
        seen: true,
      },
      { merge: true },
    )

    return { success: true }
  } catch (error) {
    console.log('updateNotification error:', error)
    return { success: false }
  }
})