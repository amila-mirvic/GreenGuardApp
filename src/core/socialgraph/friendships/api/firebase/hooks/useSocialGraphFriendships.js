import { useRef, useState } from 'react'
import {
  fetchFriendships as fetchFriendshipsAPI,
  subscribeToFriendships as subscribeToFriendshipsAPI,
} from '../firebaseSocialGraphClient'

const batchSize = 25

export const useSocialGraphFriendships = () => {
  const [friendships, setFriendships] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const realtimeFriendships = useRef([])

  const pagination = useRef({ page: 0, size: batchSize, exhausted: false })

  const deduplicatedFriendships = (
    oldFriendships,
    newFriendships,
    appendToBottom,
  ) => {
    const oldList = Array.isArray(oldFriendships) ? oldFriendships : []
    const newList = Array.isArray(newFriendships) ? newFriendships : []

    const all = appendToBottom
      ? [...oldList, ...newList]
      : [...newList, ...oldList]

    return all.reduce((acc, curr) => {
      if (curr?.id && !acc.some(friend => friend?.id === curr.id)) {
        acc.push(curr)
      }
      return acc
    }, [])
  }

  const loadMoreFriendships = async userID => {
    if (!userID || pagination.current.exhausted) {
      return
    }

    try {
      const newFriendships = await fetchFriendshipsAPI(
        userID,
        pagination.current.page,
        pagination.current.size,
      )

      const safeFriendships = Array.isArray(newFriendships) ? newFriendships : []

      if (safeFriendships.length === 0) {
        if (pagination.current.page === 0) {
          setFriendships(realtimeFriendships.current || [])
        }
        pagination.current.exhausted = true
        return
      }

      pagination.current.page += 1

      setFriendships(old =>
        deduplicatedFriendships(old, safeFriendships, true),
      )
    } catch (error) {
      console.log('loadMoreFriendships error:', error)
      if (friendships == null) {
        setFriendships(realtimeFriendships.current || [])
      }
    }
  }

  const subscribeToFriendships = userID => {
    return subscribeToFriendshipsAPI(userID, newFriendships => {
      const safeFriendships = Array.isArray(newFriendships) ? newFriendships : []
      realtimeFriendships.current = safeFriendships

      setFriendships(old =>
        deduplicatedFriendships(old, safeFriendships, false),
      )
    })
  }

  const pullToRefresh = async userID => {
    if (!userID) return

    try {
      setRefreshing(true)
      pagination.current = { page: 0, size: batchSize, exhausted: false }

      const newFriendships = await fetchFriendshipsAPI(
        userID,
        pagination.current.page,
        pagination.current.size,
      )

      const safeFriendships = Array.isArray(newFriendships) ? newFriendships : []
      const merged = deduplicatedFriendships(
        realtimeFriendships.current,
        safeFriendships,
        true,
      )

      if (safeFriendships.length === 0) {
        pagination.current.exhausted = true
      } else {
        pagination.current.page += 1
      }

      setFriendships(merged)
    } catch (error) {
      console.log('pullToRefresh friendships error:', error)
      setFriendships(realtimeFriendships.current || [])
    } finally {
      setRefreshing(false)
    }
  }

  return {
    batchSize,
    friendships,
    setFriendships,
    refreshing,
    subscribeToFriendships,
    loadMoreFriendships,
    pullToRefresh,
  }
}