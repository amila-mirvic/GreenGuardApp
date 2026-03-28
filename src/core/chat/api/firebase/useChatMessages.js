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

const normalizeMessagePayload = rawMessage => {
  if (!rawMessage) {
    return {
      id: `${Date.now()}`,
      content: '',
      createdAt: Math.floor(Date.now() / 1000),
    }
  }

  if (typeof rawMessage === 'string') {
    return {
      id: `${Date.now()}`,
      content: rawMessage,
      createdAt: Math.floor(Date.now() / 1000),
    }
  }

  const content =
    typeof rawMessage?.content === 'string'
      ? rawMessage.content
      : typeof rawMessage?.text === 'string'
      ? rawMessage.text
      : typeof rawMessage?.displayText === 'string'
      ? rawMessage.displayText
      : ''

  return {
    ...rawMessage,
    id: rawMessage?.id || `${Date.now()}`,
    content,
    createdAt:
      typeof rawMessage?.createdAt === 'number'
        ? rawMessage.createdAt
        : Math.floor(Date.now() / 1000),
  }
}

export const useChatMessages = () => {
  const [messages, setMessages] = useState(null)

  const pagination = useRef({ page: 0, size: 25, exhausted: false })

  const { handleMessageReaction } = useReactions(setMessages)
  const currentUser = useCurrentUser()

  const addReaction = async (message, author, reaction, channelID) => {
    await handleMessageReaction(message, reaction, author, channelID)
  }

  const loadMoreMessages = async channelID => {
    if (!channelID || pagination.current.exhausted) {
      return
    }

    try {
      const newMessages = await listMessagesAPI(
        channelID,
        pagination.current.page,
        pagination.current.size,
      )

      if (!newMessages?.length) {
        pagination.current.exhausted = true
        return
      }

      pagination.current.page += 1

      setMessages(prevMessages =>
        hydrateMessagesWithMyReactions(
          deduplicatedMessages(prevMessages, newMessages, true),
          currentUser?.id,
        ),
      )
    } catch (error) {
      console.log('loadMoreMessages error:', error)
    }
  }

  const subscribeToMessages = channelID => {
    if (!channelID) {
      setMessages([])
      return () => {}
    }

    pagination.current = { page: 0, size: 25, exhausted: false }

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
    const safeMessage = normalizeMessagePayload(message)

    const newMessage = getMessageObject(
      sender,
      safeMessage,
      media,
      inReplyToItem,
    )

    const normalizedNewMessage = {
      ...newMessage,
      id: newMessage?.id || safeMessage.id || `${Date.now()}`,
      content:
        typeof newMessage?.content === 'string'
          ? newMessage.content
          : safeMessage.content || '',
      createdAt:
        typeof newMessage?.createdAt === 'number'
          ? newMessage.createdAt
          : safeMessage.createdAt || Math.floor(Date.now() / 1000),
      senderID: newMessage?.senderID || sender?.id,
    }

    setMessages(prevMessages =>
      hydrateMessagesWithMyReactions(
        deduplicatedMessages(prevMessages, [normalizedNewMessage], false),
        currentUser?.id,
      ),
    )

    return normalizedNewMessage
  }

  const sendMessage = async (newMessage, channel) => {
    const safeMessage = normalizeMessagePayload(newMessage)

    return sendMessageAPI(channel, safeMessage)
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

    const deduped = all.reduce((acc, curr) => {
      const currId = curr?.id
      if (!currId) return acc
      if (!acc.some(msg => msg?.id === currId)) {
        acc.push(curr)
      }
      return acc
    }, [])

    return deduped.sort((a, b) => {
      const aTime = normalizeCreatedAt(a?.createdAt)
      const bTime = normalizeCreatedAt(b?.createdAt)
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