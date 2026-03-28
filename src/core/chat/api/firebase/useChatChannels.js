import { useRef, useState } from 'react'
import {
  subscribeChannels as subscribeChannelsAPI,
  listChannels as listChannelsAPI,
  createChannel as createChannelAPI,
  markChannelMessageAsRead as markChannelMessageAsReadAPI,
  updateGroup as updateGroupAPI,
  leaveGroup as leaveGroupAPI,
  deleteGroup as deleteGroupAPI,
  markUserAsTypingInChannel as markUserAsTypingInChannelAPI,
} from './firebaseChatClient'

export const useChatChannels = () => {
  const [channels, setChannels] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingBottom, setLoadingBottom] = useState(false)

  const pagination = useRef({ page: 0, size: 25, exhausted: false })
  const realtimeChannelsRef = useRef([])
  const semaphores = useRef({ isMarkingAsTyping: false })

  const deduplicatedChannels = (oldChannels, newChannels, appendToBottom) => {
    const oldList = Array.isArray(oldChannels) ? oldChannels.filter(Boolean) : []
    const newList = Array.isArray(newChannels) ? newChannels.filter(Boolean) : []

    const all = appendToBottom
      ? [...oldList, ...newList]
      : [...newList, ...oldList]

    return all.reduce((acc, curr) => {
      const currId = curr?.id || curr?.channelID
      if (!currId) {
        return acc
      }

      if (!acc.some(friend => (friend?.id || friend?.channelID) === currId)) {
        acc.push({
          ...curr,
          id: currId,
          participants: Array.isArray(curr?.participants)
            ? curr.participants
            : [],
        })
      }

      return acc
    }, [])
  }

  const loadMoreChannels = async userID => {
    if (
      !userID ||
      pagination.current.exhausted ||
      loadingBottom ||
      !Array.isArray(channels) ||
      channels.length < pagination.current.size
    ) {
      return
    }

    try {
      setLoadingBottom(true)

      const newChannels = await listChannelsAPI(
        userID,
        pagination.current.page,
        pagination.current.size,
      )

      const safeChannels = Array.isArray(newChannels) ? newChannels : []

      if (safeChannels.length < pagination.current.size) {
        pagination.current.exhausted = true
      }

      if (safeChannels.length > 0) {
        pagination.current.page += 1
        setChannels(oldChannels =>
          deduplicatedChannels(oldChannels, safeChannels, true),
        )
      }
    } catch (error) {
      console.log('loadMoreChannels error:', error)
    } finally {
      setLoadingBottom(false)
    }
  }

  const subscribeToChannels = userID => {
    return subscribeChannelsAPI(userID, newChannels => {
      const safeChannels = Array.isArray(newChannels) ? newChannels : []
      realtimeChannelsRef.current = safeChannels

      setChannels(oldChannels =>
        deduplicatedChannels(oldChannels, safeChannels, false),
      )
    })
  }

  const pullToRefresh = async userID => {
    if (!userID) return

    try {
      setRefreshing(true)
      pagination.current = { page: 0, size: 25, exhausted: false }

      const newChannels = await listChannelsAPI(
        userID,
        pagination.current.page,
        pagination.current.size,
      )

      const safeChannels = Array.isArray(newChannels) ? newChannels : []
      const merged = deduplicatedChannels(
        realtimeChannelsRef.current,
        safeChannels,
        true,
      )

      if (safeChannels.length < pagination.current.size) {
        pagination.current.exhausted = true
      } else {
        pagination.current.page += 1
      }

      setChannels(merged)
    } catch (error) {
      console.log('pullToRefresh channels error:', error)
      setChannels(realtimeChannelsRef.current || [])
    } finally {
      setRefreshing(false)
    }
  }

  const createChannel = async (creator, otherParticipants, name, isAdmin) => {
    return await createChannelAPI(creator, otherParticipants, name, isAdmin)
  }

  const markUserAsTypingInChannel = async (channelID, userID) => {
    if (semaphores.current.isMarkingAsTyping === true) {
      return
    }
    semaphores.current.isMarkingAsTyping = true
    const res = await markUserAsTypingInChannelAPI(channelID, userID)
    semaphores.current.isMarkingAsTyping = false
    return res
  }

  const markChannelMessageAsRead = async (
    channelID,
    userID,
    threadMessageID,
    readUserIDs,
  ) => {
    return await markChannelMessageAsReadAPI(
      channelID,
      userID,
      threadMessageID,
      readUserIDs,
    )
  }

  const updateGroup = async (channelID, userID, data) => {
    return await updateGroupAPI(channelID, userID, data)
  }

  const leaveGroup = async (channelID, userID, content) => {
    return await leaveGroupAPI(channelID, userID, content)
  }

  const deleteGroup = async channelID => {
    return await deleteGroupAPI(channelID)
  }

  return {
    channels,
    refreshing,
    loadingBottom,
    subscribeToChannels,
    loadMoreChannels,
    pullToRefresh,
    markChannelMessageAsRead,
    markUserAsTypingInChannel,
    createChannel,
    updateGroup,
    leaveGroup,
    deleteGroup,
  }
}