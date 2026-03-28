import { useEffect, useRef, useState } from 'react'
import {
  fetchFriends as fetchFriendsAPI,
  subscribeToFriends as subscribeToFriendsAPI,
} from '../firebaseSocialGraphClient'

const batchSize = 25

const normalizeFriend = item => {
  if (!item) return null
  if (item.user) {
    return item.user
  }
  return item
}

export const useSocialGraphFriends = userID => {
  const [friends, setFriends] = useState(null)
  const pagination = useRef({ page: 0, size: batchSize, exhausted: false })

  const deduplicatedFriends = (oldFriends, newFriends) => {
    const oldList = Array.isArray(oldFriends) ? oldFriends.filter(Boolean) : []
    const newList = Array.isArray(newFriends)
      ? newFriends.map(normalizeFriend).filter(Boolean)
      : []

    const all = [...oldList, ...newList]

    return all.reduce((acc, curr) => {
      if (!curr?.id) {
        return acc
      }
      if (!acc.some(friend => friend?.id === curr.id)) {
        acc.push(curr)
      }
      return acc
    }, [])
  }

  const subscribeToFriends = userID => {
    return subscribeToFriendsAPI(userID, newFriends => {
      setFriends(oldFriends => deduplicatedFriends(oldFriends, newFriends))
    })
  }

  const loadMoreFriends = async userID => {
    if (!userID || pagination.current.exhausted) {
      return
    }

    try {
      const newFriends = await fetchFriendsAPI(
        userID,
        pagination.current.page,
        pagination.current.size,
      )

      const safeFriends = Array.isArray(newFriends) ? newFriends : []

      if (safeFriends.length < pagination.current.size) {
        pagination.current.exhausted = true
      }

      if (safeFriends.length > 0) {
        pagination.current.page += 1
        setFriends(oldFriends => deduplicatedFriends(oldFriends, safeFriends))
      }
    } catch (error) {
      console.log('loadMoreFriends error:', error)
    }
  }

  useEffect(() => {
    if (!userID) {
      return
    }

    let mounted = true

    const unsubscribe = subscribeToFriends(userID)

    fetchFriendsAPI(userID, 0, batchSize)
      .then(initialFriends => {
        if (!mounted) return
        const safeFriends = Array.isArray(initialFriends) ? initialFriends : []
        if (safeFriends.length < batchSize) {
          pagination.current.exhausted = true
        } else {
          pagination.current.page = 1
        }
        setFriends(oldFriends => deduplicatedFriends(oldFriends, safeFriends))
      })
      .catch(error => {
        console.log('initial fetchFriends error:', error)
        if (mounted && friends == null) {
          setFriends([])
        }
      })

    return () => {
      mounted = false
      unsubscribe && unsubscribe()
    }
  }, [userID])

  return {
    batchSize,
    friends,
    subscribeToFriends,
    loadMoreFriends,
  }
}