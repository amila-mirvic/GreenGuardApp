import { useEffect, useMemo, useState } from 'react'
import { useChatChannels } from './useChatChannels'
import { useSocialGraphFriends } from '../../../socialgraph/friendships'
import { useCurrentUser } from '../../../onboarding'

const buildDirectChannelID = (id1, id2) => {
  if (!id1 || !id2) return ''
  return id1 < id2 ? `${id1}${id2}` : `${id2}${id1}`
}

const getItemID = item => item?.id || item?.channelID

const getItemTimestamp = item =>
  item?.updatedAt || item?.lastMessageDate || item?.createdAt || 0

const getItemRichnessScore = item => {
  if (!item) return 0

  let score = 0

  if (Array.isArray(item?.participants) && item.participants.length > 0) score += 1
  if (typeof item?.title === 'string' && item.title.trim().length > 0) score += 1
  if (typeof item?.name === 'string' && item.name.trim().length > 0) score += 1
  if (typeof item?.content === 'string' && item.content.trim().length > 0) score += 3
  if (typeof item?.lastMessage === 'string' && item.lastMessage.trim().length > 0)
    score += 4
  if (item?.media) score += 2
  if (typeof item?.markedAsRead === 'boolean') score += 3
  if (item?.lastMessageDate) score += 4
  if (item?.createdAt) score += 1

  return score
}

const mergeItemsPreferRicher = (existingItem, incomingItem) => {
  if (!existingItem) return incomingItem
  if (!incomingItem) return existingItem

  const existingScore = getItemRichnessScore(existingItem)
  const incomingScore = getItemRichnessScore(incomingItem)

  const base =
    incomingScore >= existingScore ? incomingItem : existingItem

  const secondary =
    incomingScore >= existingScore ? existingItem : incomingItem

  return {
    ...secondary,
    ...base,
    id: getItemID(base) || getItemID(secondary),
    channelID: getItemID(base) || getItemID(secondary),
    participants: Array.isArray(base?.participants)
      ? base.participants
      : Array.isArray(secondary?.participants)
      ? secondary.participants
      : [],
  }
}

export const useChatChannelsAndFriends = () => {
  const currentUser = useCurrentUser()
  const {
    channels,
    subscribeToChannels,
    pullToRefresh,
  } = useChatChannels()
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
    pullToRefresh(currentUser?.id)

    return () => {
      unsubscribe && unsubscribe()
    }
  }, [currentUser?.id])

  const mergedList = useMemo(() => {
    const safeChannels = Array.isArray(channels) ? channels.filter(Boolean) : []
    const safeFriends = Array.isArray(friends) ? friends.filter(Boolean) : []

    const byID = new Map()

    safeChannels.forEach(channel => {
      const channelID = getItemID(channel)
      if (!channelID) {
        return
      }

      byID.set(channelID, {
        ...channel,
        id: channelID,
        channelID,
        participants: Array.isArray(channel?.participants)
          ? channel.participants
          : [],
      })
    })

    safeFriends.forEach(friend => {
      const friendID = friend?.id || friend?.userID
      const currentUserID = currentUser?.id || currentUser?.userID

      if (!friendID || !currentUserID || friendID === currentUserID) {
        return
      }

      const channelID = buildDirectChannelID(currentUserID, friendID)

      const placeholder = {
        id: channelID,
        channelID,
        participants: [currentUser, friend].filter(Boolean),
        title:
          `${friend?.firstName || ''} ${friend?.lastName || ''}`.trim() ||
          friend?.username ||
          'Conversation',
        lastMessage: '',
      }

      const existing = byID.get(channelID)
      byID.set(channelID, mergeItemsPreferRicher(existing, placeholder))
    })

    return Array.from(byID.values()).sort(
      (a, b) => getItemTimestamp(b) - getItemTimestamp(a),
    )
  }, [channels, friends, currentUser])

  useEffect(() => {
    setHydratedListWithChannelsAndFriends(mergedList)
  }, [mergedList])

  return {
    hydratedListWithChannelsAndFriends,
  }
}