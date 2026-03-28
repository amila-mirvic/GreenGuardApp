import { useRef, useState } from 'react'
import { subscribeToComments as subscribeToCommentsAPI } from './firebaseFeedClient'

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
    id: comment?.id || `${comment?.authorID || 'comment'}_${normalizeCreatedAt(comment?.createdAt)}`,
    commentText: comment?.commentText || comment?.text || '',
    text: comment?.text || comment?.commentText || '',
  }
}

export const useComments = () => {
  const [comments, setComments] = useState([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const pagination = useRef({ page: 0, size: batchSize, exhausted: false })

  const deduplicatedComments = (oldComments, newComments) => {
    const oldList = Array.isArray(oldComments) ? oldComments.filter(Boolean) : []
    const newList = Array.isArray(newComments) ? newComments.filter(Boolean) : []

    const all = [...newList, ...oldList].map(normalizeComment).filter(Boolean)

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

  const loadMoreComments = async () => {
    return
  }

  const subscribeToComments = postID => {
    if (!postID) {
      setComments([])
      setCommentsLoading(false)
      return () => {}
    }

    pagination.current = { page: 0, size: batchSize, exhausted: false }
    setComments([])
    setCommentsLoading(true)

    let firstSnapshotResolved = false

    const unsubscribe = subscribeToCommentsAPI(postID, newComments => {
      const safeComments = Array.isArray(newComments) ? newComments : []

      if (!firstSnapshotResolved) {
        firstSnapshotResolved = true
        setCommentsLoading(false)
      }

      setComments(oldComments => deduplicatedComments(oldComments, safeComments))
    })

    setTimeout(() => {
      if (!firstSnapshotResolved) {
        setCommentsLoading(false)
      }
    }, 2500)

    return () => {
      unsubscribe && unsubscribe()
    }
  }

  return {
    batchSize,
    comments,
    commentsLoading,
    subscribeToComments,
    loadMoreComments,
  }
}