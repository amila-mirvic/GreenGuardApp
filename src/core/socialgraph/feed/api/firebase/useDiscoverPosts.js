import { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { listDiscoverFeedPosts as listDiscoverFeedPostsAPI } from './firebaseFeedClient'
import { useReactions } from './useReactions'
import { hydratePostsWithMyReactions } from '../utils'

const batchSize = 25

export const useDiscoverPosts = () => {
  const [posts, setPosts] = useState(null)
  const [isLoadingBottom, setIsLoadingBottom] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const { handleFeedReaction } = useReactions(setPosts)

  const pagination = useRef({
    page: 0,
    size: batchSize,
    exhausted: false,
  })

  const locallyDeletedPosts = useSelector(
    state => state.feed?.locallyDeletedPosts ?? [],
  )

  useEffect(() => {
    if (posts?.length && locallyDeletedPosts?.length) {
      const hydratedDeletedPosts = posts.filter(
        post => !locallyDeletedPosts.includes(post.id),
      )
      setPosts(hydratedDeletedPosts)
    }
  }, [JSON.stringify(locallyDeletedPosts)])

  const removeDuplicates = incomingPosts => {
    if (!incomingPosts?.length) return []
    return Array.from(
      new Map(incomingPosts.map(post => [post.id, post])).values(),
    )
  }

  const loadMorePosts = async (userID, isRefresh = false) => {
    if (!userID) {
      setPosts([])
      return
    }

    if (isRefresh) {
      pagination.current = {
        page: 0,
        size: batchSize,
        exhausted: false,
      }
    }

    if (pagination.current.exhausted || isLoadingBottom) {
      return
    }

    setIsLoadingBottom(true)

    try {
      const newPosts = await listDiscoverFeedPostsAPI(
        userID,
        pagination.current.page,
        pagination.current.size,
      )

      const safePosts = Array.isArray(newPosts) ? newPosts : []

      if (!safePosts.length) {
        if (pagination.current.page === 0) {
          setPosts([])
        }
        pagination.current.exhausted = true
        return
      }

      pagination.current.page += 1

      setPosts(oldPosts => {
        const combinedPosts =
          pagination.current.page === 1 || isRefresh
            ? safePosts
            : [...(oldPosts || []), ...safePosts]

        return hydratePostsWithMyReactions(
          removeDuplicates(combinedPosts),
          userID,
        )
      })
    } catch (error) {
      console.error('Error loading discover posts:', error)
      if (posts == null) {
        setPosts([])
      }
    } finally {
      setIsLoadingBottom(false)
    }
  }

  const pullToRefresh = async userID => {
    setRefreshing(true)
    try {
      await loadMorePosts(userID, true)
    } finally {
      setRefreshing(false)
    }
  }

  const addReaction = async (post, author, reaction) => {
    await handleFeedReaction(post, reaction, author)
  }

  return {
    batchSize,
    posts,
    refreshing,
    isLoadingBottom,
    loadMorePosts,
    pullToRefresh,
    addReaction,
  }
}