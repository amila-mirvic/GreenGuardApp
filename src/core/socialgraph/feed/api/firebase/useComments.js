import { useCallback, useRef, useState } from 'react'
import { listComments as listCommentsAPI } from './firebaseFeedClient'

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

const normalizeComment = comment => {
  if (!comment) return null

  return {
    ...comment,
    id:
      comment?.id ||
      `${comment?.authorID || 'comment'}_${normalizeCreatedAt(comment?.createdAt)}`,
    commentText: comment?.commentText || comment?.text || '',
    text: comment?.text || comment?.commentText || '',
  }
}

export const useComments = () => {
  const [comments, setComments] = useState([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const pagination = useRef({ page: 0, size: batchSize, exhausted: false })

  const deduplicatedComments = useCallback((oldComments, newComments, appendToBottom) => {
    const oldList = Array.isArray(oldComments) ? oldComments.filter(Boolean) : []
    const newList = Array.isArray(newComments) ? newComments.filter(Boolean) : []

    const all = appendToBottom ? [...oldList, ...newList] : [...newList, ...oldList]

    return all
      .map(normalizeComment)
      .filter(Boolean)
      .reduce((acc, curr) => {
        if (!curr?.id) {
          return acc
        }
        if (!acc.some(comment => comment?.id === curr.id)) {
          acc.push(curr)
        }
        return acc
      }, [])
      .sort((a, b) => normalizeCreatedAt(b?.createdAt) - normalizeCreatedAt(a?.createdAt))
  }, [])

  const loadMoreComments = useCallback(async postID => {
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
      pagination.current.exhausted = true
    }
  }, [deduplicatedComments])

  const subscribeToComments = useCallback(async postID => {
    if (!postID) {
      setComments([])
      setCommentsLoading(false)
      return () => {}
    }

    pagination.current = { page: 0, size: batchSize, exhausted: false }
    setComments([])
    setCommentsLoading(true)

    try {
      const initialComments = await listCommentsAPI(postID, 0, batchSize)
      const safeComments = Array.isArray(initialComments) ? initialComments : []

      if (safeComments.length < batchSize) {
        pagination.current.exhausted = true
      } else {
        pagination.current.page = 1
      }

      setComments(oldComments =>
        deduplicatedComments(oldComments, safeComments, true),
      )
    } catch (error) {
      console.log('initial comments fetch error:', error)
      setComments([])
    } finally {
      setCommentsLoading(false)
    }

    return () => {}
  }, [deduplicatedComments])

  const prependComment = useCallback(comment => {
    if (!comment) return

    setComments(oldComments =>
      deduplicatedComments(oldComments, [comment], false),
    )
  }, [deduplicatedComments])

  const refreshComments = useCallback(async postID => {
    if (!postID) return

    try {
      const freshComments = await listCommentsAPI(postID, 0, batchSize)
      const safeComments = Array.isArray(freshComments) ? freshComments : []
      setComments(oldComments =>
        deduplicatedComments(oldComments, safeComments, false),
      )
    } catch (error) {
      console.log('refreshComments error:', error)
    }
  }, [deduplicatedComments])

  return {
    batchSize,
    comments,
    commentsLoading,
    subscribeToComments,
    loadMoreComments,
    prependComment,
    refreshComments,
  }
}