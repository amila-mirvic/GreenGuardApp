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
  const [posts, setPosts] = useState([])
  const [isLoadingBottom, setIsLoadingBottom] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const { handleFeedReaction } = useReactions(setPosts)

  const realtimePostsRef = useRef([])
  const pagination = useRef({ page: 0, size: batchSize, exhausted: false })

  const locallyDeletedPosts = useSelector(
    state => state.feed?.locallyDeletedPosts ?? [],
  )

  useEffect(() => {
    if (posts?.length && locallyDeletedPosts?.length) {
      setPosts(prev => removeLocallyDeletedPosts(prev || []))
    }
  }, [JSON.stringify(locallyDeletedPosts)])

  useEffect(() => {
    async function fetchData() {
      if (!profileID || !viewerID) {
        return
      }
      const profileData = await fetchProfile(profileID, viewerID)
      setProfile(profileData)
    }
    fetchData()
  }, [profileID, viewerID])

  const removeLocallyDeletedPosts = (postList = []) => {
    return postList.filter(post => post && !locallyDeletedPosts.includes(post.id))
  }

  const deduplicatedPosts = (oldPosts, newPosts, appendToBottom) => {
    const oldList = Array.isArray(oldPosts) ? oldPosts.filter(Boolean) : []
    const newList = Array.isArray(newPosts) ? newPosts.filter(Boolean) : []

    const all = appendToBottom
      ? [...oldList, ...newList]
      : [...newList, ...oldList]

    return all.reduce((acc, curr) => {
      if (curr?.id && !acc.some(post => post?.id === curr.id)) {
        acc.push(curr)
      }
      return acc
    }, [])
  }

  const subscribeToProfileFeedPosts = userID => {
    return subscribeToProfileFeedPostsAPI(userID, livePosts => {
      const filteredLive = removeLocallyDeletedPosts(livePosts || [])
      realtimePostsRef.current = filteredLive

      setPosts(oldPosts =>
        hydratePostsWithMyReactions(
          deduplicatedPosts(oldPosts, filteredLive, false),
          userID,
        ),
      )
    })
  }

  const loadMorePosts = async userID => {
    if (!userID || pagination.current.exhausted || isLoadingBottom) {
      return
    }

    try {
      setIsLoadingBottom(true)

      const newPosts = await listProfileFeedAPI(
        userID,
        pagination.current.page,
        pagination.current.size,
      )

      const safePosts = removeLocallyDeletedPosts(newPosts || [])

      if (!safePosts.length) {
        if (pagination.current.page === 0) {
          const merged = deduplicatedPosts([], realtimePostsRef.current, true)
          setPosts(hydratePostsWithMyReactions(merged, userID))
        }
        pagination.current.exhausted = true
        return
      }

      pagination.current.page += 1

      setPosts(oldPosts =>
        hydratePostsWithMyReactions(
          deduplicatedPosts(oldPosts, safePosts, true),
          userID,
        ),
      )
    } catch (error) {
      console.error('Error loading profile posts:', error)
      setPosts(hydratePostsWithMyReactions(realtimePostsRef.current || [], userID))
    } finally {
      setIsLoadingBottom(false)
    }
  }

  const pullToRefresh = async userID => {
    if (!userID) return

    try {
      setRefreshing(true)

      const freshProfile = await fetchProfile(profileID, viewerID)
      setProfile(freshProfile)

      pagination.current = { page: 0, size: batchSize, exhausted: false }

      const newPosts = await listProfileFeedAPI(
        userID,
        pagination.current.page,
        pagination.current.size,
      )

      const safePosts = removeLocallyDeletedPosts(newPosts || [])
      const merged = deduplicatedPosts(realtimePostsRef.current, safePosts, true)

      setPosts(hydratePostsWithMyReactions(merged, userID))

      if (!safePosts.length) {
        pagination.current.exhausted = true
      } else {
        pagination.current.page += 1
      }
    } catch (error) {
      console.error('Error refreshing profile feed:', error)
      setPosts(hydratePostsWithMyReactions(realtimePostsRef.current || [], userID))
    } finally {
      setRefreshing(false)
    }
  }

  const addReaction = async (post, author, reaction) => {
    await handleFeedReaction(post, reaction, author)
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