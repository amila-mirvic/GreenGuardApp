import firestore from '@react-native-firebase/firestore'
import { DocRef, FeedFunctions, postsRef } from './feedRef'

const DEFAULT_CALLABLE_TIMEOUT_MS = 15000
const usersRef = firestore().collection('users')

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

const normalizeCreatedAt = value => {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const n = Number(value)
    return Number.isNaN(n) ? 0 : n
  }
  if (value?.seconds) return value.seconds
  if (typeof value?.toDate === 'function') {
    return Math.floor(value.toDate().getTime() / 1000)
  }
  return 0
}

const dedupeById = items => {
  const safeItems = Array.isArray(items) ? items.filter(Boolean) : []
  return safeItems.reduce((acc, curr) => {
    if (!curr?.id) return acc
    if (!acc.some(item => item?.id === curr.id)) {
      acc.push(curr)
    }
    return acc
  }, [])
}

const getCanonicalComments = async (postID, page = 0, size = 1000) => {
  try {
    const liveSnap = await postsRef
      .doc(postID)
      .collection('comments_live')
      .orderBy('createdAt', 'desc')
      .get()

    const historicalSnap = await postsRef
      .doc(postID)
      .collection('comments_historical')
      .orderBy('createdAt', 'desc')
      .get()

    const live = liveSnap?.docs?.map(doc => doc.data()) ?? []
    const historical = historicalSnap?.docs?.map(doc => doc.data()) ?? []

    const combined = dedupeById([...live, ...historical]).sort(
      (a, b) => normalizeCreatedAt(b?.createdAt) - normalizeCreatedAt(a?.createdAt),
    )

    const start = page * size
    return combined.slice(start, start + size)
  } catch (error) {
    console.log('getCanonicalComments error:', error)
    return []
  }
}

export const addPost = async (postData, author) => {
  const instance = FeedFunctions().addPost
  try {
    const res = await instance({
      authorID: author?.id,
      postData: postData,
    })
    return res?.data
  } catch (error) {
    console.log(error)
    return null
  }
}

export const deletePost = async (postID, authorID) => {
  const instance = FeedFunctions().deletePost
  try {
    const res = await instance({
      authorID,
      postID,
    })
    return res?.data
  } catch (error) {
    console.log(error)
    return null
  }
}

export const addStory = async (storyData, author) => {
  const instance = FeedFunctions().addStory
  try {
    const res = await instance({
      authorID: author?.id,
      storyData: storyData,
    })
    return res?.data
  } catch (error) {
    console.log(error)
    return null
  }
}

export const addStoryReaction = async (storyID, userID) => {
  const instance = FeedFunctions().addStoryReaction
  try {
    const res = await instance({
      userID,
      storyID,
    })
    return res?.data
  } catch (error) {
    console.log(error)
    return null
  }
}

export const subscribeToHomeFeedPosts = (userID, callback) => {
  return DocRef(userID)
    .homeFeedLive
    .orderBy('createdAt', 'desc')
    .onSnapshot(
      { includeMetadataChanges: true },
      querySnapshot => {
        callback && callback(querySnapshot?.docs?.map(doc => doc.data()) ?? [])
      },
      error => {
        console.log(error)
        callback && callback([])
      },
    )
}

export const listHomeFeedPosts = async (userID, page = 0, size = 1000) => {
  const instance = FeedFunctions().listHomeFeedPosts
  try {
    const res = await withTimeout(
      instance({
        userID,
        page,
        size,
      }),
    )
    return res?.data?.posts ?? []
  } catch (error) {
    console.log(error)
    return []
  }
}

export const subscribeToStories = (userID, callback) => {
  return DocRef(userID)
    .storiesFeedLive
    .orderBy('createdAt', 'desc')
    .onSnapshot(
      { includeMetadataChanges: true },
      querySnapshot => {
        callback && callback(querySnapshot?.docs?.map(doc => doc.data()) ?? [])
      },
      error => {
        console.log(error)
        callback && callback([])
      },
    )
}

export const listStories = async (userID, page = 0, size = 1000) => {
  const instance = FeedFunctions().listStories
  try {
    const res = await withTimeout(
      instance({
        userID,
        page,
        size,
      }),
    )

    return res?.data?.stories ?? []
  } catch (error) {
    console.log(error)
    return []
  }
}

export const addReaction = async (postID, authorID, reaction) => {
  const instance = FeedFunctions().addReaction
  try {
    const res = await instance({
      authorID,
      postID,
      reaction,
    })
    return res?.data
  } catch (error) {
    console.log(error)
    return null
  }
}

export const addComment = async (commentText, postID, authorID) => {
  const instance = FeedFunctions().addComment
  try {
    const res = await instance({
      authorID,
      commentText,
      postID,
    })
    return res?.data
  } catch (error) {
    console.log(error)
    return null
  }
}

export const subscribeToComments = (postID, callback) => {
  if (!postID) {
    callback && callback([])
    return () => {}
  }

  let live = []
  let historical = []

  const emit = () => {
    const merged = dedupeById([...live, ...historical]).sort(
      (a, b) => normalizeCreatedAt(b?.createdAt) - normalizeCreatedAt(a?.createdAt),
    )
    callback && callback(merged)
  }

  const unsubscribeLive = postsRef
    .doc(postID)
    .collection('comments_live')
    .orderBy('createdAt', 'desc')
    .onSnapshot(
      querySnapshot => {
        live = querySnapshot?.docs?.map(doc => doc.data()) ?? []
        emit()
      },
      error => {
        console.log('subscribeToComments live error:', error)
        live = []
        emit()
      },
    )

  const unsubscribeHistorical = postsRef
    .doc(postID)
    .collection('comments_historical')
    .orderBy('createdAt', 'desc')
    .onSnapshot(
      querySnapshot => {
        historical = querySnapshot?.docs?.map(doc => doc.data()) ?? []
        emit()
      },
      error => {
        console.log('subscribeToComments historical error:', error)
        historical = []
        emit()
      },
    )

  return () => {
    unsubscribeLive && unsubscribeLive()
    unsubscribeHistorical && unsubscribeHistorical()
  }
}

export const listComments = async (postID, page = 0, size = 1000) => {
  return await getCanonicalComments(postID, page, size)
}

export const subscribeToSinglePost = (postID, callback) => {
  return DocRef(postID).post.onSnapshot(
    { includeMetadataChanges: true },
    doc => {
      if (doc?.exists) {
        callback && callback(doc.data())
      }
    },
    error => {
      console.log(error)
    },
  )
}

export const listDiscoverFeedPosts = async (userID, page = 0, size = 1000) => {
  const instance = FeedFunctions().listDiscoverFeedPosts
  try {
    const res = await withTimeout(
      instance({
        userID,
        page,
        size,
      }),
    )

    return res?.data?.posts ?? []
  } catch (error) {
    console.log(error)
    return []
  }
}

export const subscribeToHashtagFeedPosts = (hashtag, callback) => {
  return DocRef(hashtag)
    .hashtag
    .orderBy('createdAt', 'desc')
    .onSnapshot(
      { includeMetadataChanges: true },
      querySnapshot => {
        callback && callback(querySnapshot?.docs?.map(doc => doc.data()) ?? [])
      },
      error => {
        console.log(error)
        callback && callback([])
      },
    )
}

export const listHashtagFeedPosts = async (
  userID,
  hashtag,
  page = 0,
  size = 1000,
) => {
  const instance = FeedFunctions().listHashtagFeedPosts
  try {
    const res = await withTimeout(
      instance({
        userID,
        hashtag,
        page,
        size,
      }),
    )

    return res?.data?.posts ?? []
  } catch (error) {
    console.log(error)
    return []
  }
}

export const subscribeToProfileFeedPosts = (userID, callback) => {
  return DocRef(userID)
    .profileFeedLive
    .orderBy('createdAt', 'desc')
    .onSnapshot(
      { includeMetadataChanges: true },
      querySnapshot => {
        callback && callback(querySnapshot?.docs?.map(doc => doc.data()) ?? [])
      },
      error => {
        console.log(error)
        callback && callback([])
      },
    )
}

export const listCanonicalPostsByAuthor = async (
  userID,
  page = 0,
  size = 25,
) => {
  try {
    const snapshot = await postsRef.where('authorID', '==', userID).get()

    const posts = snapshot?.docs?.map(doc => doc.data()) ?? []

    const sorted = posts.sort(
      (a, b) => normalizeCreatedAt(b?.createdAt) - normalizeCreatedAt(a?.createdAt),
    )

    const start = page * size
    const end = start + size

    return sorted.slice(start, end)
  } catch (error) {
    console.log('listCanonicalPostsByAuthor error:', error)
    return []
  }
}

export const listProfileFeed = async (userID, page = 0, size = 1000) => {
  const instance = FeedFunctions().listProfileFeedPosts
  try {
    const res = await withTimeout(
      instance({
        userID,
        page,
        size,
      }),
    )

    const posts = res?.data?.posts ?? []

    if (posts.length === 0) {
      return await listCanonicalPostsByAuthor(userID, page, size)
    }

    return posts
  } catch (error) {
    console.log(error)
    return await listCanonicalPostsByAuthor(userID, page, size)
  }
}

export const fetchProfile = async (profileID, viewerID) => {
  const instance = FeedFunctions().fetchProfile
  try {
    const res = await withTimeout(
      instance({
        profileID,
        viewerID,
      }),
    )

    return res?.data?.profileData
  } catch (error) {
    console.log(error)

    try {
      const userDoc = await usersRef.doc(profileID).get()
      const userData = userDoc?.data()

      if (!userData) {
        return null
      }

      return {
        user: userData,
        friends: [],
        moreFriendsAvailable: false,
        actionButtonType: profileID === viewerID ? 'settings' : 'add',
      }
    } catch (fallbackError) {
      console.log('fetchProfile fallback error:', fallbackError)
      return null
    }
  }
}

export const hydrateFeedForNewFriendship = async (destUserID, sourceUserID) => {
  const mainFeedDestRef = DocRef(destUserID).mainFeed
  const unsubscribeToSourcePosts = postsRef
    .where('authorID', '==', sourceUserID)
    .onSnapshot(querySnapshot => {
      querySnapshot?.forEach(doc => {
        const post = doc.data()
        if (post.id) {
          mainFeedDestRef.doc(post.id).set(post)
        }
      })
    })

  return unsubscribeToSourcePosts
}