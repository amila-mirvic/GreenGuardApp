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

  const pagination = useRef({ size: batchSize, exhausted: false })

  const locallyDeletedPosts = useSelector(
    state => state.feed?.locallyDeletedPosts ?? [],
  )

  useEffect(() => {
    if (posts?.length && locallyDeletedPosts?.length) {
      const hydrateDeletedPosts = posts.filter(post => {
        !locallyDeletedPosts.includes(post.id)
      })
      setPosts(hydrateDeletedPosts)
    }
  }, [JSON.stringify(locallyDeletedPosts)])

  const loadMorePosts = async (userID, isRefresh = false) => {
    if (!userID) return

    if (isRefresh) {
      // Reset pagination when refreshing
      pagination.current = { page: 0, size: batchSize, exhausted: false }
      setIsLoadingBottom(true)

      try {
        const newPosts = await listDiscoverFeedPostsAPI(
          userID,
          0, // Start from beginning
          batchSize,
        )

        if (newPosts?.length === 0) {
          setPosts([])
          pagination.current.exhausted = true
        } else {
          pagination.current.page = 1
          setPosts(hydratePostsWithMyReactions(newPosts, userID))
        }
      } catch (error) {
        console.error('Error refreshing discover posts:', error)
      } finally {
        setIsLoadingBottom(false)
      }
      return
    }

    // Original load more logic for pagination
    if (pagination.current.exhausted) {
      return
    }
    setIsLoadingBottom(true)

    try {
      const newPosts = await listDiscoverFeedPostsAPI(
        userID,
        pagination.current.page,
        pagination.current.size,
      )

      if (newPosts?.length === 0) {
        setPosts([])
        pagination.current.exhausted = true
        setIsLoadingBottom(false)
        return
      }

      pagination.current.page += 1

      setPosts(oldPosts => {
        const combinedPosts = oldPosts ? [...oldPosts, ...newPosts] : newPosts
        return hydratePostsWithMyReactions(
          removeDuplicates(combinedPosts),
          userID,
        )
      })
    } catch (error) {
      console.error('Error loading more posts:', error)
    } finally {
      setIsLoadingBottom(false)
    }
  }

  const removeDuplicates = posts => {
    if (!posts?.length) return []
    return Array.from(new Map(posts.map(post => [post.id, post])).values())
  }

  const pullToRefresh = async userID => {
    setRefreshing(true)
    pagination.current.page = 0
    pagination.current.exhausted = false

    const newPosts = await listDiscoverFeedPostsAPI(
      userID,
      pagination.current.page,
      pagination.current.size,
    )
    if (newPosts?.length === 0) {
      pagination.current.exhausted = true
      setPosts([])
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
    if (!oldPosts?.length || !newPosts?.length) {
      return oldPosts?.length ? oldPosts : newPosts?.length ? newPosts : []
    }
    const all = oldPosts
      ? appendToBottom
        ? [...oldPosts, ...newPosts]
        : [...newPosts, ...oldPosts]
      : newPosts
    const deduplicatedPosts = all?.reduce((acc, curr) => {
      if (!acc.some(post => post.id === curr.id)) {
        acc.push(curr)
      }
      return acc
    }, [])

    return deduplicatedPosts || []
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
