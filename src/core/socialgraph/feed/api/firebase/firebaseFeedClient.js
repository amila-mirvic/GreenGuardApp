import { DocRef, FeedFunctions, postsRef } from './feedRef'

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
    const res = await instance({
      userID,
      page,
      size,
    })
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
    const res = await instance({
      userID,
      page,
      size,
    })

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
  return DocRef(postID)
    .commentsLive
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

export const listComments = async (postID, page = 0, size = 1000) => {
  const instance = FeedFunctions().listComments
  try {
    const res = await instance({
      postID,
      page,
      size,
    })

    return res?.data?.comments ?? []
  } catch (error) {
    console.log(error)
    return []
  }
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
    const res = await instance({
      userID,
      page,
      size,
    })

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
    const res = await instance({
      userID,
      hashtag,
      page,
      size,
    })

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

// ✅ fallback helper
export const listCanonicalPostsByAuthor = async (
  userID,
  page = 0,
  size = 25,
) => {
  try {
    const snapshot = await postsRef
      .where('authorID', '==', userID)
      .orderBy('createdAt', 'desc')
      .limit(size)
      .get()

    return snapshot?.docs?.map(doc => doc.data()) ?? []
  } catch (error) {
    console.log('listCanonicalPostsByAuthor error:', error)
    return []
  }
}

export const listProfileFeed = async (userID, page = 0, size = 1000) => {
  const instance = FeedFunctions().listProfileFeedPosts
  try {
    const res = await instance({
      userID,
      page,
      size,
    })

    const posts = res?.data?.posts ?? []

    // ✅ fallback ako profile feed vrati prazno
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
    const res = await instance({
      profileID,
      viewerID,
    })

    return res?.data?.profileData
  } catch (error) {
    console.log(error)
    return null
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