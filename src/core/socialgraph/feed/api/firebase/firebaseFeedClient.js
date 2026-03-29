import firestore from '@react-native-firebase/firestore'
import { DocRef, FeedFunctions, postsRef } from './feedRef'

const DEFAULT_CALLABLE_TIMEOUT_MS = 30000
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
    .onSnapshot(querySnapshot => {
      if (!querySnapshot || !querySnapshot.docs) {
        callback && callback([])
      } else {
        callback && callback(querySnapshot?.docs?.map(doc => doc.data()))
      }
    })
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
    .onSnapshot(querySnapshot => {
      if (!querySnapshot || !querySnapshot.docs) {
        callback && callback([])
      } else {
        callback && callback(querySnapshot?.docs?.map(doc => doc.data()))
      }
    })
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
    const res = await withTimeout(
      instance({
        authorID,
        commentText,
        postID,
      }),
    )
    return res?.data
  } catch (error) {
    console.log(error)
    return null
  }
}

export const subscribeToComments = () => {
  return () => {}
}

export const listComments = async (postID, page = 0, size = 1000) => {
  const instance = FeedFunctions().listComments
  try {
    const res = await withTimeout(
      instance({
        postID,
        page,
        size,
      }),
    )
    return res?.data?.comments ?? []
  } catch (error) {
    console.log('listComments error:', error)
    return []
  }
}

export const subscribeToSinglePost = (postID, callback) => {
  return DocRef(postID).post.onSnapshot(doc => {
    if (doc?.exists) {
      callback && callback(doc.data())
    }
  })
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
    .onSnapshot(querySnapshot => {
      if (!querySnapshot || !querySnapshot.docs) {
        callback && callback([])
      } else {
        callback && callback(querySnapshot?.docs?.map(doc => doc.data()))
      }
    })
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
    .onSnapshot(querySnapshot => {
      if (!querySnapshot || !querySnapshot.docs) {
        callback && callback([])
      } else {
        callback && callback(querySnapshot?.docs?.map(doc => doc.data()))
      }
    })
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

    return res?.data?.posts ?? []
  } catch (error) {
    console.log(error)
    return []
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