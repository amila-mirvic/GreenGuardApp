import { db } from '../../firebase/config'

const notificationsRef = db.collection('notifications')

export const subscribeNotifications = (userId, callback) => {
  if (!userId) {
    callback && callback([])
    return () => {}
  }

  return notificationsRef
    .where('toUserID', '==', userId)
    .orderBy('createdAt', 'desc')
    .onSnapshot(
      querySnapshot => {
        const notifications = querySnapshot?.docs?.map(doc => doc.data()) ?? []
        callback && callback(notifications)
      },
      error => {
        console.log('subscribeNotifications error:', error)
        callback && callback([])
      },
    )
}

export const updateNotification = async notification => {
  try {
    if (!notification?.id) {
      return { success: false }
    }

    await notificationsRef.doc(notification.id).set(
      {
        seen: true,
      },
      { merge: true },
    )

    return { success: true }
  } catch (error) {
    console.log('updateNotification error:', error)
    return { error, success: false }
  }
}