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
    .homeFeedLive.orderBy('createdAt', 'desc')
    .onSnapshot(
      { includeMetadataChanges: true },
      querySnapshot => {
        if (querySnapshot?.metadata?.fromCache === true) {
          return
        }
        callback && callback(querySnapshot?.docs?.map(doc => doc.data()))
      },
      error => {
        console.log(error)
        callback([])
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

    return res?.data?.posts
  } catch (error) {
    console.log(error)
    return null
  }
}

export const subscribeToStories = (userID, callback) => {
  return DocRef(userID)
    .storiesFeedLive.orderBy('createdAt', 'desc')
    .onSnapshot(
      { includeMetadataChanges: true },
      querySnapshot => {
        if (querySnapshot?.metadata?.fromCache === true) {
          return
        }
        callback && callback(querySnapshot?.docs?.map(doc => doc.data()))
      },
      error => {
        console.log(error)
        callback([])
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

    return res?.data?.stories
  } catch (error) {
    console.log(error)
    return null
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
    .commentsLive.orderBy('createdAt', 'desc')
    .onSnapshot(
      { includeMetadataChanges: true },
      querySnapshot => {
        if (querySnapshot?.metadata?.fromCache === true) {
          return
        }
        callback && callback(querySnapshot?.docs?.map(doc => doc.data()))
      },
      error => {
        console.log(error)
        callback([])
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

    return res?.data?.comments
  } catch (error) {
    console.log(error)
    return null
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

    return res?.data?.posts
  } catch (error) {
    console.log(error)
    return null
  }
}

export const subscribeToHashtagFeedPosts = (hashtag, callback) => {
  return DocRef(hashtag)
    .hashtag.orderBy('createdAt', 'desc')
    .onSnapshot(
      { includeMetadataChanges: true },
      querySnapshot => {
        if (querySnapshot?.metadata?.fromCache === true) {
          return
        }
        callback && callback(querySnapshot?.docs?.map(doc => doc.data()))
      },
      error => {
        console.log(error)
        callback([])
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

    return res?.data?.posts
  } catch (error) {
    console.log(error)
    return null
  }
}

export const subscribeToProfileFeedPosts = (userID, callback) => {
  return DocRef(userID)
    .profileFeedLive.orderBy('createdAt', 'desc')
    .onSnapshot(
      { includeMetadataChanges: true },
      querySnapshot => {
        if (querySnapshot?.metadata?.fromCache === true) {
          return
        }
        callback && callback(querySnapshot?.docs?.map(doc => doc.data()))
      },
      error => {
        console.log(error)
        callback([])
      },
    )
}

export const listProfileFeed = async (userID, page = 0, size = 1000) => {
  const instance = FeedFunctions().listProfileFeedPosts
  try {
    const res = await instance({
      userID,
      page,
      size,
    })

    return res?.data?.posts
  } catch (error) {
    console.log(error)
    return null
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
  // we take all posts & stories from sourceUserID and populate the feed & stories of destUserID
  const mainFeedDestRef = DocRef(destUserID).mainFeed
  const unsubscribeToSourcePosts = postsRef
    .where('authorID', '==', sourceUserID)
    .onSnapshot(
      querySnapshot => {
        querySnapshot?.forEach(doc => {
          const post = doc.data()
          if (post.id) {
            mainFeedDestRef.doc(post.id).set(post)
          }
        })
        unsubscribeToSourcePosts()
      },
      error => {
        console.log(error)
      },
    )
}

export const removeFeedForOldFriendship = async (destUserID, oldFriendID) => {
  // We remove all posts authored by oldFriendID from destUserID's feed
  const mainFeedDestRef = DocRef(destUserID).mainFeed

  const unsubscribeToSourcePosts = postsRef
    .where('authorID', '==', oldFriendID)
    .onSnapshot(
      querySnapshot => {
        querySnapshot?.forEach(doc => {
          const post = doc.data()
          if (post.id) {
            mainFeedDestRef.doc(post.id).delete()
          }
        })
        unsubscribeToSourcePosts()
      },
      error => {
        console.log(error)
      },
    )
}

export const getPost = async postId => {
  try {
    const post = await postsRef.doc(postId).get()
    if (!post.exists) {
      return { error: 'Post not found', success: false }
    }
    return { data: { ...post.data(), id: post.id }, success: true }
  } catch (error) {
    console.log(error)
    return {
      error: 'Oops! an error occurred. Please try again',
      success: false,
    }
  }
}
