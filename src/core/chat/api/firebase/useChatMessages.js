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

export const useChatMessages = () => {
  const [messages, setMessages] = useState([])

  const pagination = useRef({ page: 0, size: 25, exhausted: false })

  const { handleMessageReaction } = useReactions(setMessages)
  const currentUser = useCurrentUser()

  const addReaction = async (message, author, reaction, channelID) => {
    await handleMessageReaction(message, reaction, author, channelID)
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
    pagination.current = { page: 0, size: 25, exhausted: false }

    // KLJUČNI FIX:
    // ako još ne postoji pravi channel, chat ne smije ostati u loading loop-u
    if (!channelID) {
      setMessages([])
      return () => {}
    }

    return subscribeMessagesAPI(channelID, newMessages => {
      const safeMessages = Array.isArray(newMessages) ? newMessages : []

      setMessages(prevMessages =>
        hydrateMessagesWithMyReactions(
          deduplicatedMessages(prevMessages, safeMessages, false),
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