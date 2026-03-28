import { functions } from '../../firebase/config'

const DEFAULT_CALLABLE_TIMEOUT_MS = 15000

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

export const subscribeNotifications = (userId, callback) => {
  if (!userId) {
    callback && callback([])
    return () => {}
  }

  let cancelled = false

  const loadNotifications = async () => {
    try {
      const res = await withTimeout(
        functions().httpsCallable('listNotifications')({
          userID: userId,
        }),
      )

      const notifications = res?.data?.notifications ?? []

      if (!cancelled) {
        callback && callback(notifications)
      }
    } catch (error) {
      console.log('subscribeNotifications error:', error)
      if (!cancelled) {
        callback && callback([])
      }
    }
  }

  loadNotifications()

  const intervalId = setInterval(() => {
    loadNotifications()
  }, 10000)

  return () => {
    cancelled = true
    clearInterval(intervalId)
  }
}

export const updateNotification = async notification => {
  try {
    if (!notification?.id) {
      return { success: false }
    }

    const res = await withTimeout(
      functions().httpsCallable('updateNotification')({
        notificationID: notification.id,
      }),
    )

    return res?.data ?? { success: true }
  } catch (error) {
    console.log('updateNotification error:', error)
    return { success: false, error: error?.message || error }
  }
}