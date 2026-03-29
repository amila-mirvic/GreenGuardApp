import { useEffect, useMemo, useState } from 'react'
import { useChatChannels } from './useChatChannels'
import { useSocialGraphFriends } from '../../../socialgraph/friendships'
import { useCurrentUser } from '../../../onboarding'

const normalizeParticipant = participant => {
  if (!participant) {
    return null
  }

  const participantID = participant?.id || participant?.userID
  if (!participantID) {
    return null
  }

  return participant?.id ? participant : { ...participant, id: participantID }
}

const normalizeChannelLikeItem = item => {
  if (!item) {
    return null
  }

  const participants = Array.isArray(item?.participants)
    ? item.participants.map(normalizeParticipant).filter(Boolean)
    : []

  return {
    ...item,
    id: item?.id || item?.channelID,
    channelID: item?.channelID || item?.id,
    participants,
  }
}

const buildDirectChannelID = (id1, id2) => {
  if (!id1 || !id2) return ''
  return id1 < id2 ? `${id1}${id2}` : `${id2}${id1}`
}

const getConversationKey = (item, currentUserID) => {
  const normalizedItem = normalizeChannelLikeItem(item)

  if (!normalizedItem) {
    return ''
  }

  const participants = normalizedItem.participants

  const isGroupChat =
    (Array.isArray(normalizedItem?.admins) && normalizedItem.admins.length > 0) ||
    participants.length > 2

  if (isGroupChat) {
    return normalizedItem?.id || normalizedItem?.channelID || ''
  }

  const otherParticipant = participants.find(
    participant => participant?.id && participant.id !== currentUserID,
  )

  if (otherParticipant?.id) {
    return `direct_${otherParticipant.id}`
  }

  return normalizedItem?.id || normalizedItem?.channelID || ''
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

  if (item?.creatorID) {
    score += 5
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
    if (channels === null) {
      return []
    }
    const safeChannels = Array.isArray(channels)
      ? channels.map(normalizeChannelLikeItem).filter(Boolean)
      : []
    const safeFriends = Array.isArray(friends)
      ? friends.map(normalizeParticipant).filter(Boolean)
      : []
    const normalizedCurrentUser = normalizeParticipant(currentUser)
    const currentUserID = normalizedCurrentUser?.id || normalizedCurrentUser?.userID

    const all = [...safeChannels]

    safeFriends.forEach(friend => {
      const friendID = friend?.id || friend?.userID

      if (!friendID || !currentUserID || friendID === currentUserID) {
        return
      }

      const channelID = buildDirectChannelID(currentUserID, friendID)
      const hasExistingConversation = safeChannels.some(channelItem => {
        const participants = Array.isArray(channelItem?.participants)
          ? channelItem.participants
          : []
        return participants.some(participant => participant?.id === friendID)
      })

      if (hasExistingConversation) {
        return
      }

      all.push({
        id: channelID,
        channelID,
        participants: [normalizedCurrentUser, friend].filter(Boolean),
        title:
          `${friend?.firstName || ''} ${friend?.lastName || ''}`.trim() ||
          friend?.username ||
          'Conversation',
        lastMessage: '',
      })
    })

    const reduced = all.reduce((acc, curr) => {
      const normalizedItem = normalizeChannelLikeItem(curr)
      const conversationKey = getConversationKey(normalizedItem, currentUserID)
      const fallbackKey = normalizedItem?.id || normalizedItem?.channelID
      const storageKey = conversationKey || fallbackKey

      if (!storageKey) {
        return acc
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
    loading: channels === null,
  }
}
