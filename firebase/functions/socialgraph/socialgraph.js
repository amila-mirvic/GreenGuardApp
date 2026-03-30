const functions = require('firebase-functions')
const admin = require('firebase-admin')

const db = admin.firestore()

const socialGraphRef = db.collection('social_graph')

const userClient = require('../core/user')
const { fetchUser, updateUser } = userClient

const {
  getAllUsersBlockedByMe,
  getAllUsersBlockingMe,
} = require('../user-reporting/user-reporting')
const { unfriendEdge, unfollowEdge, addEdge } = require('./utils')

const {
  hydrateHomeFeedsOnAddFriend,
  hydrateStoryFeedsOnAddFriend,
} = require('../feed/common')

const collectionsUtils = require('../core/collections')

const { add, get, remove, getList, getCount } = collectionsUtils

const usersRef = db.collection('users')

const normalizeSearchText = user => {
  const firstName = user?.firstName || ''
  const lastName = user?.lastName || ''
  const email = user?.email || ''
  const username = user?.username || ''
  return `${firstName} ${lastName} ${email} ${username}`.trim().toLowerCase()
}

const getExistingFriendshipIDs = async userID => {
  try {
    const [liveSnapshot, historicalSnapshot] = await Promise.all([
      socialGraphRef.doc(userID).collection('friendships_live').get(),
      socialGraphRef.doc(userID).collection('friendships_historical').get(),
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
    console.log('getExistingFriendshipIDs error:', error)
    return new Set()
  }
}

exports.add = functions
  .runWith({
    minInstances: 1,
  })
  .https.onCall(async (data, context) => {
    const { sourceUserID, destUserID } = data

    const destUser = await fetchUser(destUserID)
    const sourceUser = await fetchUser(sourceUserID)

    await addEdge(sourceUserID, destUserID, 'outbound_users')
    await addEdge(destUserID, sourceUserID, 'inbound_users')

    const res = await get(
      socialGraphRef.doc(sourceUserID),
      'inbound_users',
      destUserID,
    )
    if (res) {
      console.log(
        `${destUserID} added to ${sourceUserID}'s mutual list and viceversa`,
      )
      await addEdge(sourceUserID, destUserID, 'mutual_users')
      await addEdge(destUserID, sourceUserID, 'mutual_users')

      await add(socialGraphRef.doc(sourceUserID), 'friendships', {
        user: destUser,
        type: 'reciprocal',
        id: destUserID,
      })

      await add(socialGraphRef.doc(destUserID), 'friendships', {
        user: sourceUser,
        type: 'reciprocal',
        id: sourceUserID,
      })
    } else {
      await add(socialGraphRef.doc(sourceUserID), 'friendships', {
        user: destUser,
        type: 'outbound',
        id: destUserID,
      })

      await add(socialGraphRef.doc(destUserID), 'friendships', {
        user: sourceUser,
        type: 'inbound',
        id: sourceUserID,
      })
    }

    await hydrateHomeFeedsOnAddFriend(sourceUserID, destUserID)
    await hydrateStoryFeedsOnAddFriend(sourceUserID, destUserID)

    return { success: true }
  })

exports.unfriend = functions.https.onCall(async (data, context) => {
  const { sourceUserID, destUserID } = data

  return unfriendEdge(sourceUserID, destUserID)
})

exports.unfollow = functions.https.onCall(async (data, context) => {
  const { sourceUserID, destUserID } = data

  return unfollowEdge(sourceUserID, destUserID)
})

exports.fetchFriends = functions
  .runWith({
    minInstances: 1,
  })
  .https.onCall(async (data, context) => {
    const { userID, page, size } = data
    console.log(`fetching friends `)
    console.log(JSON.stringify(data))
    const mutualUsers = await getList(
      socialGraphRef.doc(userID),
      'mutual_users',
      page,
      size,
    )
    if (mutualUsers?.length > 0) {
      console.log(`fetched friends: `)
      console.log(JSON.stringify(mutualUsers))
      return { friends: mutualUsers, success: true }
    } else {
      return { friends: [], success: true }
    }
  })

exports.fetchFriendships = functions
  .runWith({
    minInstances: 1,
  })
  .https.onCall(async (data, context) => {
    const { userID, page, size } = data
    console.log(`fetchFriendships: ${JSON.stringify(data)}`)

    const friendships = await getList(
      socialGraphRef.doc(userID),
      'friendships',
      page,
      size,
    )
    if (friendships?.length > 0) {
      console.log(`fetched friendships: `)
      console.log(JSON.stringify(friendships))
      return { friendships: friendships, success: true }
    } else {
      return { friendships: [], success: true }
    }
  })

exports.fetchOtherUserFriendships = functions.https.onCall(
  async (data, context) => {
    const { viewerID, userID, type, page, size } = data

    const harshedViewerBlockedUsers = await getAllUsersBlockedByMe(viewerID)
    const harshedUsersBlockingViewers = await getAllUsersBlockingMe(viewerID)

    const collectionName =
      type === 'reciprocal'
        ? 'mutual_users'
        : type === 'inbound'
        ? 'inbound_users'
        : 'outbound_users'

    const friendList = await getList(
      socialGraphRef.doc(userID),
      collectionName,
      page,
      size,
    )

    const friends = friendList.filter(
      friend =>
        !harshedViewerBlockedUsers[friend.id] &&
        !harshedUsersBlockingViewers[friend.id],
    )

    const promiseFriendships = friends.map(async friend => {
      const friendship = await get(
        socialGraphRef.doc(viewerID),
        'friendships',
        friend.id,
      )
      return friendship
    })

    const friendships = await Promise.all(promiseFriendships)
    var hash = {}
    friendships.forEach(friendship => {
      if (friendship?.id) {
        hash[friendship.id] = friendship.type
      }
    })

    const res = friends.map(friend => ({
      user: friend,
      id: friend.id,
      type: hash[friend.id] || 'none',
    }))

    if (res?.length > 0) {
      console.log(
        `fetchOtherUserFriendships: viewerID=${viewerID} userID=${userID} type=${type} page=${page}, size=${size}`,
      )
      console.log(JSON.stringify(hash))
      console.log(JSON.stringify(res))
      return { friendships: res, success: true }
    } else {
      return { friendships: [], success: true }
    }
  },
)

exports.searchUsers = functions
  .runWith({
    minInstances: 1,
  })
  .https.onCall(async (data, context) => {
    const searchPageLimit = 100
    const { userID, keyword } = data

    console.log(`searching users `)
    console.log(JSON.stringify(data))

    const normalizedKeyword = (keyword || '').trim().toLowerCase()

    const [harshedViewerBlockedUsers, harshedUsersBlockingViewers, friendshipIDs] =
      await Promise.all([
        getAllUsersBlockedByMe(userID),
        getAllUsersBlockingMe(userID),
        getExistingFriendshipIDs(userID),
      ])

    let users = []

    if (!normalizedKeyword.length) {
      const snapshot = await usersRef
        .orderBy('firstName', 'asc')
        .limit(searchPageLimit * 3)
        .get()

      users = snapshot?.docs?.map(doc => doc.data()) ?? []
    } else {
      const snapshot = await usersRef.get()
      users = snapshot?.docs?.map(doc => doc.data()) ?? []
    }

    const filteredUsers = users.filter(user => {
      if (!user?.id || user.id === userID) {
        return false
      }

      if (harshedViewerBlockedUsers[user.id] || harshedUsersBlockingViewers[user.id]) {
        return false
      }

      if (friendshipIDs.has(user.id)) {
        return false
      }

      if (!normalizedKeyword.length) {
        return true
      }

      return normalizeSearchText(user).includes(normalizedKeyword)
    })

    const finalUsers = filteredUsers.slice(0, searchPageLimit)

    if (finalUsers?.length > 0) {
      console.log(`searched users : `)
      console.log(JSON.stringify(finalUsers))
      return { users: finalUsers, success: true }
    } else {
      return { users: [], success: true }
    }
  })