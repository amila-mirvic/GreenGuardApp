import { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import {
  subscribeToProfileFeedPosts as subscribeToProfileFeedPostsAPI,
  listProfileFeed as listProfileFeedAPI,
  fetchProfile,
} from './firebaseFeedClient'
import { useReactions } from './useReactions'
import { hydratePostsWithMyReactions } from '../utils'

const batchSize = 25

export const useProfile = (profileID, viewerID) => {
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState(null)
  const [isLoadingBottom, setIsLoadingBottom] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const { handleFeedReaction } = useReactions(setPosts)

  const pagination = useRef({ page: 0, size: batchSize, exhausted: false })

  const locallyDeletedPosts = useSelector(
    state => state.feed?.locallyDeletedPosts ?? [],
  )

  useEffect(() => {
    if (posts?.length && locallyDeletedPosts?.length) {
      const filterDeletedPosts = removeLocallyDeletedPosts(posts)
      setPosts(filterDeletedPosts)
    }
  }, [JSON.stringify(locallyDeletedPosts)])

  useEffect(() => {
    async function fetchData() {
      const profile = await fetchProfile(profileID, viewerID)
      setProfile(profile)
    }
    fetchData()
  }, [profileID, viewerID])

  const loadMorePosts = async userID => {
    if (pagination.current.exhausted) {
      return
    }
    setIsLoadingBottom(true)
    const newPosts = await listProfileFeedAPI(
      userID,
      pagination.current.page,
      pagination.current.size,
    )
    if (newPosts?.length === 0) {
      pagination.current.exhausted = true
    }
    pagination.current.page += 1
    setIsLoadingBottom(false)
    setPosts(oldPosts =>
      hydratePostsWithMyReactions(
        deduplicatedPosts(oldPosts, newPosts, true),
        userID,
      ),
    )
  }

  const subscribeToProfileFeedPosts = userID => {
    return subscribeToProfileFeedPostsAPI(userID, newPosts => {
      setPosts(oldPosts =>
        hydratePostsWithMyReactions(
          deduplicatedPosts(
            oldPosts,
            removeLocallyDeletedPosts(newPosts),
            false,
          ),
          userID,
        ),
      )
    })
  }

  const pullToRefresh = async userID => {
    setRefreshing(true)

    const profile = await fetchProfile(profileID, viewerID)
    setProfile(profile)

    pagination.current.page = -1
    pagination.current.exhausted = false

    const newPosts = await listProfileFeedAPI(
      userID,
      pagination.current.page,
      pagination.current.size,
    )
    if (newPosts?.length === 0) {
      pagination.current.exhausted = true
    }
    pagination.current.page += 1
    setRefreshing(false)
    setPosts(oldPosts =>
      hydratePostsWithMyReactions(
        deduplicatedPosts(oldPosts, newPosts, true),
        userID,
      ),
    )
  }

  const addReaction = async (post, author, reaction) => {
    await handleFeedReaction(post, reaction, author)
  }

  const deduplicatedPosts = (oldPosts, newPosts, appendToBottom) => {
    if (!newPosts?.length) {
      return oldPosts || []
    }
    if (!oldPosts?.length) {
      return newPosts
    }

    if (appendToBottom) {
      const existingPostIds = new Set(oldPosts.map(post => post.id))
      return [
        ...oldPosts,
        ...newPosts.filter(post => !existingPostIds.has(post.id)),
      ]
    } else {
      const postMap = new Map()
      ;[...newPosts, ...oldPosts].forEach(post => {
        if (!postMap.has(post.id)) {
          postMap.set(post.id, post)
        }
      })

      return Array.from(postMap.values())
    }
  }

  const removeLocallyDeletedPosts = (postList = []) => {
    return postList.filter(post => !locallyDeletedPosts.includes(post.id))
  }

  return {
    batchSize,
    profile,
    posts,
    refreshing,
    isLoadingBottom,
    subscribeToProfileFeedPosts,
    loadMorePosts,
    pullToRefresh,
    addReaction,
  }
}
