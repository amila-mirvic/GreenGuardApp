import firestore from '@react-native-firebase/firestore'
import { FriendshipFunctions, DocRef } from './friendshipRef'

const DEFAULT_CALLABLE_TIMEOUT_MS = 8000
const usersRef = firestore().collection('users')
const socialGraphRef = firestore().collection('social_graph')

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

const normalizeSearchText = user => {
  const firstName = user?.firstName || ''
  const lastName = user?.lastName || ''
  const fullName = `${firstName} ${lastName}`.trim()
  const username = user?.username || ''
  const email = user?.email || ''

  return `${fullName} ${username} ${email}`.trim().toLowerCase()
}

const getExistingFriendshipIDs = async userID => {
  try {
    const snapshot = await socialGraphRef.doc(userID).collection('friendships').get()
    const ids = snapshot?.docs?.map(doc => doc.id) ?? []
    return new Set(ids)
  } catch (error) {
    console.log('getExistingFriendshipIDs error:', error)
    return new Set()
  }
}

const fallbackSearchUsers = async (userID, keyword, size = 1000) => {
  try {
    const snapshot = await usersRef.get()
    const users = snapshot?.docs?.map(doc => doc.data()) ?? []
    const friendshipIDs = await getExistingFriendshipIDs(userID)
    const normalizedKeyword = (keyword || '').trim().toLowerCase()

    const results = users.filter(user => {
      if (!user?.id || user.id === userID) {
        return false
      }

      if (friendshipIDs.has(user.id)) {
        return false
      }

      if (!normalizedKeyword.length) {
        return true
      }

      const haystack = normalizeSearchText(user)
      return haystack.includes(normalizedKeyword)
    })

    return results.slice(0, size)
  } catch (error) {
    console.log('fallbackSearchUsers error:', error)
    return []
  }
}

export const subscribeToFriendships = (userID, callback) => {
  return DocRef(userID).friendshipsLive.onSnapshot(querySnapshot => {
    if (!querySnapshot || !querySnapshot.docs) {
      callback && callback([])
    } else {
      callback && callback(querySnapshot?.docs?.map(doc => doc.data()))
    }
  })
}

export const subscribeToFriends = (userID, callback) => {
  return DocRef(userID).mutualUsersLive.onSnapshot(querySnapshot => {
    if (!querySnapshot || !querySnapshot.docs) {
      callback && callback([])
    } else {
      callback && callback(querySnapshot?.docs?.map(doc => doc.data()))
    }
  })
}

export const add = async (sourceUserID, destUserID) => {
  const instance = FriendshipFunctions().add
  try {
    const res = await withTimeout(
      instance({
        sourceUserID,
        destUserID,
      }),
    )

    return res?.data
  } catch (error) {
    console.log(error)
    return null
  }
}

export const unfollow = async (sourceUserID, destUserID) => {
  const instance = FriendshipFunctions().unfollow
  try {
    const res = await withTimeout(
      instance({
        sourceUserID,
        destUserID,
      }),
    )

    return res?.data
  } catch (error) {
    console.log(error)
    return null
  }
}

export const unfriend = async (sourceUserID, destUserID) => {
  const instance = FriendshipFunctions().unfriend
  try {
    const res = await withTimeout(
      instance({
        sourceUserID,
        destUserID,
      }),
    )

    return res?.data
  } catch (error) {
    console.log(error)
    return null
  }
}

export const fetchFriends = async (userID, page = 0, size = 1000) => {
  const instance = FriendshipFunctions().fetchFriends
  try {
    const res = await withTimeout(
      instance({
        userID,
        page,
        size,
      }),
    )

    return res?.data?.friends ?? []
  } catch (error) {
    console.log(error)
    return []
  }
}

export const fetchFriendships = async (userID, page = 0, size = 1000) => {
  const instance = FriendshipFunctions().fetchFriendships
  try {
    const res = await withTimeout(
      instance({
        userID,
        page,
        size,
      }),
    )

    return res?.data?.friendships ?? []
  } catch (error) {
    console.log(error)
    return []
  }
}

export const fetchOtherUserFriendships = async (
  userID,
  viewerID,
  type,
  page = 0,
  size = 1000,
) => {
  const instance = FriendshipFunctions().fetchOtherUserFriendships
  try {
    const res = await withTimeout(
      instance({
        userID,
        viewerID,
        type,
        page,
        size,
      }),
    )

    return res?.data?.friendships ?? []
  } catch (error) {
    console.log(error)
    return []
  }
}

export const searchUsers = async (userID, keyword, page = 0, size = 1000) => {
  const normalizedKeyword = typeof keyword === 'string' ? keyword : ''

  const instance = FriendshipFunctions().searchUsers

  try {
    const res = await withTimeout(
      instance({
        userID,
        keyword: normalizedKeyword,
        page,
        size,
      }),
    )

    const users = res?.data?.users

    if (Array.isArray(users)) {
      if (normalizedKeyword.trim().length === 0) {
        if (users.length > 0) {
          return users
        }
        return await fallbackSearchUsers(userID, '', size)
      }

      if (users.length > 0) {
        return users
      }
    }

    return await fallbackSearchUsers(userID, normalizedKeyword, size)
  } catch (error) {
    console.log(error)
    return await fallbackSearchUsers(userID, normalizedKeyword, size)
  }
}