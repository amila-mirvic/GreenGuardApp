const admin = require('firebase-admin')
const db = admin.firestore()
const functions = require('firebase-functions')

const notificationsRef = db.collection('notifications')

const normalizeCreatedAt = value => {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const n = Number(value)
    return Number.isNaN(n) ? 0 : n
  }
  if (value && typeof value.seconds === 'number') return value.seconds
  return 0
}

exports.listNotifications = functions
  .runWith({
    minInstances: 1,
  })
  .https.onCall(async data => {
    try {
      const { userID } = data || {}

      if (!userID) {
        return { notifications: [], success: true }
      }

      // Bez orderBy u Firestore query-ju da izbjegnemo index / query fail,
      // sortiramo ručno nakon fetch-a.
      const snapshot = await notificationsRef.where('toUserID', '==', userID).get()

      const notifications =
        snapshot?.docs
          ?.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }))
          ?.sort(
            (a, b) =>
              normalizeCreatedAt(b?.createdAt) - normalizeCreatedAt(a?.createdAt),
          )
          ?.slice(0, 100) ?? []

      return { notifications, success: true }
    } catch (error) {
      console.log('listNotifications error:', error)
      return { notifications: [], success: false, error: error?.message || String(error) }
    }
  })

exports.updateNotification = functions
  .runWith({
    minInstances: 1,
  })
  .https.onCall(async data => {
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
      return { success: false, error: error?.message || String(error) }
    }
  })