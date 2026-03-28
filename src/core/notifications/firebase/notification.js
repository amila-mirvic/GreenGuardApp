import { db } from '../../firebase/config'

const topLevelNotificationsRef = db.collection('notifications')

const dedupeNotifications = notifications => {
  const safeNotifications = Array.isArray(notifications)
    ? notifications.filter(Boolean)
    : []

  return safeNotifications.reduce((acc, curr) => {
    if (!curr?.id) {
      return acc
    }
    if (!acc.some(item => item?.id === curr.id)) {
      acc.push(curr)
    }
    return acc
  }, [])
}

export const subscribeNotifications = (userId, callback) => {
  if (!userId) {
    callback && callback([])
    return () => {}
  }

  let topLevel = []
  let legacyNested = []

  const emit = () => {
    const merged = dedupeNotifications([...topLevel, ...legacyNested]).sort(
      (a, b) => Number(b?.createdAt || 0) - Number(a?.createdAt || 0),
    )
    callback && callback(merged)
  }

  const unsubscribeTopLevel = topLevelNotificationsRef
    .where('toUserID', '==', userId)
    .onSnapshot(
      querySnapshot => {
        topLevel = querySnapshot?.docs?.map(doc => doc.data()) ?? []
        emit()
      },
      error => {
        console.log('subscribeNotifications top-level error:', error)
        topLevel = []
        emit()
      },
    )

  const unsubscribeLegacy = topLevelNotificationsRef
    .doc(userId)
    .collection('notifications')
    .onSnapshot(
      querySnapshot => {
        legacyNested = querySnapshot?.docs?.map(doc => doc.data()) ?? []
        emit()
      },
      error => {
        console.log('subscribeNotifications legacy error:', error)
        legacyNested = []
        emit()
      },
    )

  return () => {
    unsubscribeTopLevel && unsubscribeTopLevel()
    unsubscribeLegacy && unsubscribeLegacy()
  }
}

export const updateNotification = async notification => {
  try {
    if (!notification?.id) {
      return { success: false }
    }

    let updated = false

    try {
      await topLevelNotificationsRef.doc(notification.id).set(
        {
          seen: true,
        },
        { merge: true },
      )
      updated = true
    } catch (error) {
      console.log('top-level updateNotification error:', error)
    }

    try {
      if (notification?.toUserID) {
        await topLevelNotificationsRef
          .doc(notification.toUserID)
          .collection('notifications')
          .doc(notification.id)
          .set(
            {
              seen: true,
            },
            { merge: true },
          )
        updated = true
      }
    } catch (error) {
      console.log('legacy updateNotification error:', error)
    }

    return { success: updated }
  } catch (error) {
    console.log('updateNotification error:', error)
    return { error, success: false }
  }
}