import { useEffect, useMemo, useState } from 'react'
import { useChatChannels } from './useChatChannels'
import { useSocialGraphFriends } from '../../../socialgraph/friendships'
import { useCurrentUser } from '../../../onboarding'

const buildDirectChannelID = (id1, id2) => {
  if (!id1 || !id2) return ''
  return id1 < id2 ? `${id1}${id2}` : `${id2}${id1}`
}

const getConversationKey = (item, currentUserID) => {
  if (!item) {
    return ''
  }

  const participants = Array.isArray(item?.participants)
    ? item.participants.filter(Boolean)
    : []

  const isGroupChat = Array.isArray(item?.admins) && item.admins.length > 0
  if (isGroupChat) {
    return item?.id || item?.channelID || ''
  }

  const otherParticipant = participants.find(
    participant => participant?.id && participant.id !== currentUserID,
  )

  if (otherParticipant?.id) {
    return `direct_${otherParticipant.id}`
  }

  return item?.id || item?.channelID || ''
}

const getConversationScore = item => {
  let score = 0

  if (item?.lastMessageDate) {
    score += 100
  }

  if (typeof item?.lastMessage === 'string' && item.lastMessage.trim().length > 0) {
    score += 50
  }

  if (typeof item?.content === 'string' && item.content.trim().length > 0) {
    score += 25
  }

  if (item?.createdAt) {
    score += 10
  }

  if (Array.isArray(item?.admins) && item.admins.length > 0) {
    score += 5
  }

  return score
}

const normalizeCreatedAt = value => {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? 0 : parsed
  }
  if (value?.seconds) return value.seconds
  if (typeof value?.toDate === 'function') {
    return Math.floor(value.toDate().getTime() / 1000)
  }
  return 0
}

export const useChatChannelsAndFriends = () => {
  const currentUser = useCurrentUser()
  const { channels, subscribeToChannels } = useChatChannels()
  const { friends } = useSocialGraphFriends(currentUser?.id)

  const [
    hydratedListWithChannelsAndFriends,
    setHydratedListWithChannelsAndFriends,
  ] = useState([])

  useEffect(() => {
    if (!currentUser?.id) {
      return
    }

    const unsubscribe = subscribeToChannels(currentUser?.id)

    return () => {
      unsubscribe && unsubscribe()
    }
  }, [currentUser?.id])

  const mergedList = useMemo(() => {
    const safeChannels = Array.isArray(channels) ? channels.filter(Boolean) : []
    const safeFriends = Array.isArray(friends) ? friends.filter(Boolean) : []
    const currentUserID = currentUser?.id || currentUser?.userID

    const all = [...safeChannels]

    safeFriends.forEach(friend => {
      const friendID = friend?.id || friend?.userID

      if (!friendID || !currentUserID || friendID === currentUserID) {
        return
      }

      const channelID = buildDirectChannelID(currentUserID, friendID)

      all.push({
        id: channelID,
        channelID,
        participants: [currentUser, friend],
        title:
          `${friend?.firstName || ''} ${friend?.lastName || ''}`.trim() ||
          friend?.username ||
          'Conversation',
        lastMessage: '',
      })
    })

    const reduced = all.reduce((acc, curr) => {
      const conversationKey = getConversationKey(curr, currentUserID)
      const fallbackKey = curr?.id || curr?.channelID
      const storageKey = conversationKey || fallbackKey

      if (!storageKey) {
        return acc
      }

      const normalizedItem = {
        ...curr,
        id: curr?.id || curr?.channelID || fallbackKey,
        channelID: curr?.channelID || curr?.id || fallbackKey,
        participants: Array.isArray(curr?.participants) ? curr.participants : [],
      }

      const existing = acc.get(storageKey)
      if (!existing) {
        acc.set(storageKey, normalizedItem)
        return acc
      }

      const existingScore = getConversationScore(existing)
      const currentScore = getConversationScore(normalizedItem)
      const existingTime = normalizeCreatedAt(
        existing?.lastMessageDate || existing?.createdAt,
      )
      const currentTime = normalizeCreatedAt(
        normalizedItem?.lastMessageDate || normalizedItem?.createdAt,
      )

      if (
        currentScore > existingScore ||
        (currentScore === existingScore && currentTime > existingTime)
      ) {
        acc.set(storageKey, normalizedItem)
      }

      return acc
    }, new Map())

    return Array.from(reduced.values()).sort((a, b) => {
      const aTime = normalizeCreatedAt(a?.lastMessageDate || a?.createdAt)
      const bTime = normalizeCreatedAt(b?.lastMessageDate || b?.createdAt)
      return bTime - aTime
    })
  }, [channels, friends, currentUser])

  useEffect(() => {
    setHydratedListWithChannelsAndFriends(mergedList)
  }, [mergedList])

  return {
    hydratedListWithChannelsAndFriends,
  }
}
