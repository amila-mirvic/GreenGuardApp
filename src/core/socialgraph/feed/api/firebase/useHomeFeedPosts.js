import { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import {
  subscribeToHomeFeedPosts as subscribeToHomeFeedPostsAPI,
  listHomeFeedPosts as listHomeFeedPostsAPI,
} from './firebaseFeedClient'
import { useReactions } from './useReactions'
import { hydratePostsWithMyReactions } from '../utils'

const batchSize = 25

export const useHomeFeedPosts = () => {
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
      const filteredDeletedPosts = removeLocallyDeletedPosts(posts)
      setPosts(filteredDeletedPosts)
    }
  }, [JSON.stringify(locallyDeletedPosts)])

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

  const loadMorePosts = async userID => {
    if (!userID || pagination.current.exhausted || isLoadingBottom) {
      return
    }

    try {
      setIsLoadingBottom(true)

      const newPosts = await listHomeFeedPostsAPI(
        userID,
        pagination.current.page,
        pagination.current.size,
      )

      if (!newPosts?.length) {
        if (pagination.current.page === 0) {
          setPosts([])
        }
        pagination.current.exhausted = true
        return
      }

      pagination.current.page += 1

      setPosts(oldPosts =>
        hydratePostsWithMyReactions(
          deduplicatedPosts(oldPosts, removeLocallyDeletedPosts(newPosts), true),
          userID,
        ),
      )
    } catch (error) {
      console.error('Error loading home feed posts:', error)
    } finally {
      setIsLoadingBottom(false)
    }
  }

  const subscribeToHomeFeedPosts = userID => {
    return subscribeToHomeFeedPostsAPI(userID, newPosts => {
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
    if (!userID) return

    try {
      setRefreshing(true)
      pagination.current = { page: 0, size: batchSize, exhausted: false }

      const newPosts = await listHomeFeedPostsAPI(
        userID,
        pagination.current.page,
        pagination.current.size,
      )

      if (!newPosts?.length) {
        pagination.current.exhausted = true
        setPosts([])
        return
      }

      pagination.current.page += 1

      setPosts(
        hydratePostsWithMyReactions(
          deduplicatedPosts([], removeLocallyDeletedPosts(newPosts), true),
          userID,
        ),
      )
    } catch (error) {
      console.error('Error refreshing home feed:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const addReaction = async (post, author, reaction) => {
    await handleFeedReaction(post, reaction, author)
  }

  const ingestAdSlots = adsPlacementDistance => {
    setPosts(oldPosts =>
      postsWithInsertedAdSlots([...(oldPosts || [])], adsPlacementDistance),
    )
  }

  const postsWithInsertedAdSlots = (incomingPosts, adsDistance) => {
    if (!incomingPosts?.length || !adsDistance) {
      return incomingPosts
    }

    const postsCopy = [...incomingPosts]
    const adSlotPositions = []
    for (let i = adsDistance; i < postsCopy.length; i += adsDistance + 1) {
      adSlotPositions.push(i)
    }
    for (let j = adSlotPositions.length - 1; j >= 0; --j) {
      postsCopy.splice(adSlotPositions[j], 0, {
        id: `ad-slot-${j}-${Date.now()}`,
        isAd: true,
      })
    }
    return postsCopy
  }

  return {
    batchSize,
    posts,
    refreshing,
    isLoadingBottom,
    subscribeToHomeFeedPosts,
    loadMorePosts,
    pullToRefresh,
    addReaction,
    ingestAdSlots,
  }
}