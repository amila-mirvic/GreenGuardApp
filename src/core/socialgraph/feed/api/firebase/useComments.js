import { useRef, useState } from 'react'
import {
  subscribeToComments as subscribeToCommentsAPI,
  listComments as listCommentsAPI,
} from './firebaseFeedClient'

const batchSize = 25

const normalizeCreatedAt = value => {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const n = Number(value)
    return Number.isNaN(n) ? 0 : n
  }
  if (value?.seconds) return value.seconds
  if (typeof value?.toDate === 'function') {
    return Math.floor(value.toDate().getTime() / 1000)
  }
  return 0
}

export const useComments = () => {
  const [comments, setComments] = useState(null)
  const [commentsLoading, setCommentsLoading] = useState(false)
  const pagination = useRef({ page: 0, size: batchSize, exhausted: false })

  const deduplicatedComments = (oldComments, newComments, appendToBottom) => {
    const oldList = Array.isArray(oldComments) ? oldComments.filter(Boolean) : []
    const newList = Array.isArray(newComments) ? newComments.filter(Boolean) : []

    const all = appendToBottom
      ? [...oldList, ...newList]
      : [...newList, ...oldList]

    const merged = all.reduce((acc, curr) => {
      const currId = curr?.id
      if (!currId) {
        return acc
      }
      if (!acc.some(comment => comment?.id === currId)) {
        acc.push(curr)
      }
      return acc
    }, [])

    return merged.sort(
      (a, b) => normalizeCreatedAt(b?.createdAt) - normalizeCreatedAt(a?.createdAt),
    )
  }

  const loadMoreComments = async postID => {
    if (!postID || pagination.current.exhausted) {
      return
    }

    try {
      const newComments = await listCommentsAPI(
        postID,
        pagination.current.page,
        pagination.current.size,
      )

      const safeComments = Array.isArray(newComments) ? newComments : []

      if (safeComments.length === 0) {
        pagination.current.exhausted = true
        return
      }

      pagination.current.page += 1

      setComments(oldComments =>
        deduplicatedComments(oldComments, safeComments, true),
      )
    } catch (error) {
      console.log('loadMoreComments error:', error)
    }
  }

  const subscribeToComments = postID => {
    if (!postID) {
      setComments([])
      return () => {}
    }

    pagination.current = { page: 0, size: batchSize, exhausted: false }
    setComments([])
    setCommentsLoading(true)

    listCommentsAPI(postID, 0, batchSize)
      .then(initialComments => {
        const safeComments = Array.isArray(initialComments) ? initialComments : []

        if (safeComments.length < batchSize) {
          pagination.current.exhausted = true
        } else {
          pagination.current.page = 1
        }

        setComments(oldComments =>
          deduplicatedComments(oldComments, safeComments, true),
        )
      })
      .catch(error => {
        console.log('initial comments fetch error:', error)
      })
      .finally(() => {
        setCommentsLoading(false)
      })

    return subscribeToCommentsAPI(postID, newComments => {
      const safeComments = Array.isArray(newComments) ? newComments : []
      setCommentsLoading(false)
      setComments(oldComments =>
        deduplicatedComments(oldComments, safeComments, false),
      )
    })
  }

  return {
    batchSize,
    comments,
    commentsLoading,
    subscribeToComments,
    loadMoreComments,
  }
}