const functions = require('firebase-functions')
const admin = require('firebase-admin')
const { v4: uuidv4 } = require('uuid')

const db = admin.firestore()

const canonicalPostsRef = db.collection('posts')
const canonicalStoriesRef = db.collection('stories')
const socialFeedsRef = db.collection('social_feeds')
const socialGraphRef = db.collection('social_graph')

const HOT_PATH_RUNTIME = {
  minInstances: 1,
}

const userClient = require('../core/user')
const { fetchUser, updateUser } = userClient

const {
  getAllUsersBlockedByMe,
  getAllUsersBlockingMe,
} = require('../user-reporting/user-reporting')

const collectionsUtils = require('../core/collections')
const { getList, add, get } = collectionsUtils

const { fetchPost, fetchStory } = require('./common')
const { sendPushNotification } = require('../notifications/utils')

const getCollectionDocIDs = async (docRef, collectionName) => {
  try {
    const [liveSnapshot, historicalSnapshot] = await Promise.all([
      docRef.collection(`${collectionName}_live`).get(),
      docRef.collection(`${collectionName}_historical`).get(),
    ])

    const ids = new Set()

    liveSnapshot?.docs?.forEach(doc => {
      if (doc?.id) {
        ids.add(doc.id)
      }
    })

    historicalSnapshot?.docs?.forEach(doc => {
      if (doc?.id) {
        ids.add(doc.id)
      }
    })

    return ids
  } catch (error) {
    console.log(`getCollectionDocIDs error for ${collectionName}:`, error)
    return new Set()
  }
}

exports.addStory = functions
  .runWith({
    minInstances: 1,
  })
  .https.onCall(async (data, context) => {
    console.log(`Adding new story: ${JSON.stringify(data)}`)

    const { authorID, storyData } = data
    const author = await fetchUser(authorID)
    const storyID = uuidv4()
    const story = {
      id: storyID,
      ...storyData,
      authorID,
      author,
      createdAt: new Date().getTime(),
      viewsCount: 0,
      reactionsCount: 0,
    }

    await canonicalStoriesRef.doc(storyID).set(story, { merge: true })
  })

exports.addPost = functions
  .runWith({
    minInstances: 1,
  })
  .https.onCall(async (data, context) => {
    console.log(`Adding new post: ${JSON.stringify(data)}`)

    const { authorID, postData } = data
    const { postText } = postData
    const author = await fetchUser(authorID)
    const postID = uuidv4()
    const hashtags = extractHashtags(postText)
    const post = {
      id: postID,
      ...postData,
      authorID,
      author,
      hashtags,
      createdAt: new Date().getTime(),
      commentCount: 0,
      reactionsCount: 0,
      reactions: {
        like: [],
      },
    }

    await canonicalPostsRef.doc(postID).set(post, { merge: true })

    const prevCount = author.postCount || 0
    await updateUser(authorID, { postCount: prevCount + 1 })
  })

exports.deletePost = functions.https.onCall(async (data, context) => {
  console.log(`Deleting  post: ${JSON.stringify(data)}`)

  const { authorID, postID } = data

  await canonicalPostsRef.doc(postID).delete()

  const author = await fetchUser(authorID)
  await updateUser(authorID, { postCount: (author.postCount || 1) - 1 })
})

exports.addReaction = functions
  .runWith({
    minInstances: 1,
  })
  .https.onCall(async (data, context) => {
    console.log(`Reacting to post: ${JSON.stringify(data)}`)

    const reactionKeys = [
      'like',
      'love',
      'laugh',
      'angry',
      'suprised',
      'cry',
      'sad',
    ]

    let { authorID, postID, reaction } = data
    reaction = 'like'

    const post = await fetchPost(postID)
    const postAuthor = await fetchUser(post?.authorID)
    const postReactionsDict = post.reactions
    var newPostReactionsDict = {}
    var reactionsCount = post.reactionsCount
    var postAuthorReactionsCount = postAuthor?.reactionsCount ?? 0

    const reactionKeyForAuthorAndPost = reactionKeys.find(
      key =>
        postReactionsDict[key] && postReactionsDict[key].includes(authorID),
    )

    if (reactionKeyForAuthorAndPost) {
      if (reactionKeyForAuthorAndPost === reaction) {
        newPostReactionsDict = { ...postReactionsDict }
        newPostReactionsDict[reactionKeyForAuthorAndPost] = postReactionsDict[
          reactionKeyForAuthorAndPost
        ].filter(id => id !== authorID)
        reactionsCount = reactionsCount - 1
        postAuthorReactionsCount =
          postAuthorReactionsCount - 1 < 0 ? 0 : postAuthorReactionsCount - 1
      } else {
        newPostReactionsDict = { ...postReactionsDict }
        newPostReactionsDict[reactionKeyForAuthorAndPost] = postReactionsDict[
          reactionKeyForAuthorAndPost
        ].filter(id => id !== authorID)
        newPostReactionsDict[reaction] = [
          ...newPostReactionsDict[reaction],
          authorID,
        ]
      }
    } else {
      newPostReactionsDict = { ...postReactionsDict }
      newPostReactionsDict[reaction] = [
        ...newPostReactionsDict[reaction],
        authorID,
      ]
      reactionsCount = reactionsCount + 1
      postAuthorReactionsCount = postAuthorReactionsCount + 1

      try {
        if (post.authorID !== authorID) {
          const reactionAuthor = await fetchUser(authorID)
          await sendPushNotification(
            post.authorID,
            'Green Guard',
            `${reactionAuthor.firstName} reacted to your post.`,
            'feed_reaction',
            { postID, reactionAuthorID: authorID },
          )
        }
      } catch (e) {
        console.log(e)
      }
    }

    await updateUser(post.authorID, {
      reactionsCount: postAuthorReactionsCount,
    })
    const newPostData = { reactions: newPostReactionsDict, reactionsCount }
    await canonicalPostsRef.doc(postID).set(newPostData, { merge: true })
    return { ...post, ...newPostData }
  })

exports.addComment = functions
  .runWith({
    minInstances: 1,
  })
  .https.onCall(async (data, context) => {
    console.log(`Adding comment to post: ${JSON.stringify(data)}`)

    const { authorID, postID, commentText } = data
    const author = await fetchUser(authorID)
    const commentID = uuidv4()
    const commentData = {
      id: commentID,
      commentText,
      authorID,
      author,
      postID,
      createdAt: new Date().getTime(),
    }

    await add(canonicalPostsRef.doc(postID), 'comments', commentData, true)

    const post = await fetchPost(postID)
    const { commentCount } = post
    const postData = { commentCount: commentCount + 1 }
    await canonicalPostsRef.doc(postID).set(postData, { merge: true })

    if (post.authorID !== authorID) {
      await sendPushNotification(
        post.authorID,
        'Green Guard',
        `${author.firstName} commented to your post.`,
        'feed_comment',
        {
          postID,
          commentAuthorID: authorID,
        },
      )
    }

    return commentData
  })

exports.listHomeFeedPosts = functions
  .runWith(HOT_PATH_RUNTIME)
  .https.onCall(async (data, context) => {
    const { userID, page, size } = data

    console.log(`Fetching home feed for ${JSON.stringify(data)} `)

    const posts = await getList(
      socialFeedsRef.doc(userID),
      'home_feed',
      page,
      size,
      true,
    )

    if (posts?.length > 0) {
      console.log(`fetched posts: `)
      console.log(posts)
      return { posts, success: true }
    } else {
      return { posts: [], success: true }
    }
  })

exports.listProfileFeedPosts = functions
  .runWith(HOT_PATH_RUNTIME)
  .https.onCall(async (data, context) => {
    const { userID, page, size } = data
    console.log(`Fetching profile feed for ${JSON.stringify(data)} `)

    const posts = await getList(
      socialFeedsRef.doc(userID),
      'profile_feed',
      page,
      size,
      true,
    )
    if (posts?.length > 0) {
      console.log(`fetched posts: ${JSON.stringify(posts)}`)
      return { posts, success: true }
    } else {
      return { posts: [], success: true }
    }
  })

exports.listComments = functions
  .runWith(HOT_PATH_RUNTIME)
  .https.onCall(async (data, context) => {
    const { postID, page, size } = data
    console.log(`Fetching comments for ${JSON.stringify(data)} `)

    const comments = await getList(
      canonicalPostsRef.doc(postID),
      'comments',
      page,
      size,
      true,
    )
    if (comments?.length > 0) {
      console.log(`fetched comments: `)
      console.log(comments)
      return { comments, success: true }
    } else {
      return { comments: [], success: true }
    }
  })

exports.fetchProfile = functions
  .runWith(HOT_PATH_RUNTIME)
  .https.onCall(async (data, context) => {
    const { profileID, viewerID } = data
    console.log(`Fetching profile for ${JSON.stringify(data)} `)

    const [profile, friends, friendship] = await Promise.all([
      fetchUser(profileID),
      getList(socialGraphRef.doc(profileID), 'mutual_users', -1, 0, false),
      profileID === viewerID
        ? Promise.resolve(null)
        : get(socialGraphRef.doc(viewerID), 'mutual_users', profileID),
    ])

    let result = { user: profile, success: true }

    if (friends?.length > 0) {
      result = {
        ...result,
        friends: friends.slice(0, 6),
        moreFriendsAvailable: friends.length > 6,
      }
    }

    if (profileID === viewerID) {
      result = { ...result, actionButtonType: 'settings' }
    } else if (friendship) {
      result = { ...result, actionButtonType: 'message' }
    } else {
      result = { ...result, actionButtonType: 'add' }
    }

    console.log(`fetched profileData: ${JSON.stringify(result)} `)
    return { profileData: result, success: true }
  })

exports.listDiscoverFeedPosts = functions
  .runWith(HOT_PATH_RUNTIME)
  .https.onCall(async (data, context) => {
    const { userID, page, size } = data

    console.log(`Fetching discover/explore feed for ${JSON.stringify(data)} `)

    const [
      harshedUsersBlockedByMe,
      harshedUsersBlockingMe,
      mutualUserIDs,
    ] = await Promise.all([
      getAllUsersBlockedByMe(userID),
      getAllUsersBlockingMe(userID),
      getCollectionDocIDs(socialGraphRef.doc(userID), 'mutual_users'),
    ])

    const excludedAuthorIDs = new Set([
      ...Object.keys(harshedUsersBlockedByMe || {}),
      ...Object.keys(harshedUsersBlockingMe || {}),
      ...Array.from(mutualUserIDs || []),
      userID,
    ])

    const posts = await fetchNonRelatedPosts(page, size, excludedAuthorIDs, [])

    if (posts?.length > 0) {
      console.log(`fetched posts: ${JSON.stringify(posts)} `)
      return { posts, success: true }
    } else {
      return { posts: [], success: true }
    }
  })

exports.listStories = functions
  .runWith(HOT_PATH_RUNTIME)
  .https.onCall(async (data, context) => {
    const { userID, page, size } = data
    console.log(`Fetching stories for ${JSON.stringify(data)} `)

    const stories = await getList(
      socialFeedsRef.doc(userID),
      'stories_feed',
      page,
      size,
      true,
    )
    if (stories?.length > 0) {
      console.log(`fetched stories: `)
      console.log(stories)
      return { stories, success: true }
    } else {
      return { stories: [], success: true }
    }
  })

exports.addStoryReaction = functions
  .runWith(HOT_PATH_RUNTIME)
  .https.onCall(async (data, context) => {
    console.log(`Adding story reaction: ${JSON.stringify(data)}`)

    const { userID, storyID } = data
    const story = await fetchStory(storyID)
    const { reactionsCount } = story

    let storyData = {}

    if (story?.reactions?.includes(userID)) {
      storyData = {
        reactionsCount: reactionsCount - 1,
        reactions: story?.reactions?.filter(id => id !== userID),
      }
    } else {
      storyData = {
        reactionsCount: reactionsCount + 1,
        reactions: [...(story?.reactions || []), userID],
      }
    }

    await canonicalStoriesRef.doc(storyID).set(storyData, { merge: true })

    return { ...story, ...storyData }
  })

exports.listHashtagFeedPosts = functions
  .runWith(HOT_PATH_RUNTIME)
  .https.onCall(async (data, context) => {
    const { userID, hashtag, page, size } = data
    console.log(`Fetching hashtag feed for ${JSON.stringify(data)} `)

    const [harshedUsersBlockedByMe, harshedUsersBlockingMe] = await Promise.all(
      [getAllUsersBlockedByMe(userID), getAllUsersBlockingMe(userID)],
    )

    const hashtagFeedsRef = db.collection('hashtags')
    const posts = await getList(
      hashtagFeedsRef.doc(hashtag),
      'feed',
      page,
      size,
      true,
    )

    const finalPosts = posts.filter(
      post =>
        post.authorID &&
        !harshedUsersBlockedByMe[post.authorID] &&
        !harshedUsersBlockingMe[post.authorID],
    )

    if (finalPosts?.length > 0) {
      console.log(`fetched posts: ${JSON.stringify(finalPosts)} `)
      return { posts: finalPosts, success: true }
    } else {
      return { posts: [], success: true }
    }
  })

const fetchNonRelatedPosts = async (page, size, excludedAuthorIDs, postsSoFar) => {
  if (postsSoFar.length >= size) {
    return postsSoFar.slice(0, size)
  }

  const fetchBatchSize = Math.max(size * 2, 20)

  const snapshot = await canonicalPostsRef
    .orderBy('createdAt', 'desc')
    .offset(page * fetchBatchSize)
    .limit(fetchBatchSize)
    .get()

  const allPosts = snapshot?.docs?.map(doc => doc.data()) ?? []

  if (allPosts.length === 0) {
    return postsSoFar.slice(0, size)
  }

  const posts = allPosts.filter(
    post => post?.authorID && !excludedAuthorIDs.has(post.authorID),
  )

  const combined = [...postsSoFar, ...posts]

  if (combined.length >= size || allPosts.length < fetchBatchSize) {
    return combined.slice(0, size)
  }

  return fetchNonRelatedPosts(page + 1, size, excludedAuthorIDs, combined)
}

const extractHashtags = text => {
  const regexp = /(\s|^)\#\w\w+\b/gm
  let result = text?.match(regexp)
  if (result) {
    result = result.map(hashtag => hashtag.trim())
    return result
  } else {
    return []
  }
}