import { functions } from '../../firebase/config'

const DEFAULT_CALLABLE_TIMEOUT_MS = 8000

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

const fetchNotifications = async userId => {
  if (!userId) {
    return []
  }

  try {
    const res = await withTimeout(
      functions().httpsCallable('listNotifications')({
        userID: userId,
        page: 0,
        size: 100,
      }),
    )

    return res?.data?.notifications ?? []
  } catch (error) {
    console.log('fetchNotifications error:', error)
    return []
  }
}

export const subscribeNotifications = (userId, callback) => {
  let isMounted = true

  const load = async () => {
    const notifications = await fetchNotifications(userId)
    if (isMounted) {
      callback && callback(notifications)
    }
  }

  load()

  const intervalId = setInterval(load, 15000)

  return () => {
    isMounted = false
    clearInterval(intervalId)
  }
}

export const updateNotification = async notification => {
  try {
    await withTimeout(
      functions().httpsCallable('updateNotification')({
        notificationID: notification?.id,
        userID: notification?.toUserID,
      }),
    )

    return { success: true }
  } catch (error) {
    console.log(error)
    return { error, success: false }
  }
}