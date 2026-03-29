import { useRef, useState } from 'react'
import {
  sendMessage as sendMessageAPI,
  deleteMessage as deleteMessageAPI,
  subscribeToMessages as subscribeMessagesAPI,
  listMessages as listMessagesAPI,
} from './firebaseChatClient'
import { useReactions } from './useReactions'
import { hydrateMessagesWithMyReactions, getMessageObject } from '../utils'
import { useCurrentUser } from '../../../onboarding'

export const useChatMessages = () => {
  const [messages, setMessages] = useState(null)

  const pagination = useRef({ page: 0, size: 25, exhausted: false })
  const activeChannelIDRef = useRef(null)

  const { handleMessageReaction } = useReactions(setMessages)
  const currentUser = useCurrentUser()

  const resetForChannelIfNeeded = channelID => {
    if (!channelID) {
      return
    }

    if (activeChannelIDRef.current !== channelID) {
      activeChannelIDRef.current = channelID
      pagination.current = { page: 0, size: 25, exhausted: false }
      setMessages(null)
    }
  }

  const addReaction = async (message, author, reaction, channelID) => {
    await handleMessageReaction(message, reaction, author, channelID)
  }

  const loadMoreMessages = async channelID => {
    if (!channelID) {
      return
    }

    resetForChannelIfNeeded(channelID)

    if (pagination.current.exhausted) {
      return
    }

    const newMessages = await listMessagesAPI(
      channelID,
      pagination.current.page,
      pagination.current.size,
    )

    if (!newMessages?.length) {
      pagination.current.exhausted = true
      setMessages(prevMessages => (Array.isArray(prevMessages) ? prevMessages : []))
      return
    }

    pagination.current.page += 1

    setMessages(prevMessages =>
      hydrateMessagesWithMyReactions(
        deduplicatedMessages(prevMessages, newMessages, true),
        currentUser?.id,
      ),
    )
  }

  const subscribeToMessages = channelID => {
    if (!channelID) {
      return null
    }

    resetForChannelIfNeeded(channelID)

    return subscribeMessagesAPI(channelID, newMessages => {
      setMessages(prevMessages =>
        hydrateMessagesWithMyReactions(
          deduplicatedMessages(prevMessages, newMessages, false),
          currentUser?.id,
        ),
      )
    })
  }

  const optimisticSetMessage = (sender, message, media, inReplyToItem) => {
    const newMessage = getMessageObject(sender, message, media, inReplyToItem)

    setMessages(prevMessages =>
      hydrateMessagesWithMyReactions(
        deduplicatedMessages(prevMessages, [newMessage], false),
        currentUser?.id,
      ),
    )

    return newMessage
  }

  const sendMessage = async (newMessage, channel) => {
    return sendMessageAPI(channel, newMessage)
  }

  const deleteMessage = async (channel, threadItemID) => {
    return deleteMessageAPI(channel, threadItemID)
  }

  const deduplicatedMessages = (oldMessages, newMessages, appendToBottom) => {
    const oldList = Array.isArray(oldMessages) ? oldMessages.filter(Boolean) : []
    const newList = Array.isArray(newMessages) ? newMessages.filter(Boolean) : []

    const all = appendToBottom
      ? [...oldList, ...newList]
      : [...newList, ...oldList]

    const byID = new Map()

    all.forEach(curr => {
      const currId = curr?.id
      if (!currId) return

      const existing = byID.get(currId)
      byID.set(currId, {
        ...(existing || {}),
        ...curr,
      })
    })

    return Array.from(byID.values()).sort((a, b) => {
      const aTime = Number(a?.createdAt || 0)
      const bTime = Number(b?.createdAt || 0)
      return bTime - aTime
    })
  }

  return {
    messages,
    subscribeToMessages,
    loadMoreMessages,
    sendMessage,
    optimisticSetMessage,
    deleteMessage,
    addReaction,
    getMessageObject,
  }
}