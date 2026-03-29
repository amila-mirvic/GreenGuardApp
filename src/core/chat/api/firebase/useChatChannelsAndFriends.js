import { useEffect, useMemo, useState } from 'react'
import { useChatChannels } from './useChatChannels'
import { useSocialGraphFriends } from '../../../socialgraph/friendships'
import { useCurrentUser } from '../../../onboarding'

const buildDirectChannelID = (id1, id2) => {
  if (!id1 || !id2) return ''
  return id1 < id2 ? `${id1}${id2}` : `${id2}${id1}`
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

    const all = [...safeChannels]

    safeFriends.forEach(friend => {
      const friendID = friend?.id || friend?.userID
      const currentUserID = currentUser?.id || currentUser?.userID

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

    return all.reduce((acc, curr) => {
      const currId = curr?.id || curr?.channelID
      if (!currId) {
        return acc
      }

      if (!acc.some(item => (item?.id || item?.channelID) === currId)) {
        acc.push({
          ...curr,
          id: currId,
          channelID: currId,
          participants: Array.isArray(curr?.participants)
            ? curr.participants
            : [],
        })
      }

      return acc
    }, [])
  }, [channels, friends, currentUser])

  useEffect(() => {
    setHydratedListWithChannelsAndFriends(mergedList)
  }, [mergedList])

  return {
    hydratedListWithChannelsAndFriends,
  }
}