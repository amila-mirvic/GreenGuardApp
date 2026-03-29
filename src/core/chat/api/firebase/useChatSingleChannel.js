import { useCallback, useEffect, useRef, useState } from 'react'
import { subscribeToSingleChannel as subscribeToSingleChannelAPI } from './firebaseChatClient'

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

const normalizeChannel = channel => {
  if (!channel) {
    return null
  }

  const participants = Array.isArray(channel?.participants)
    ? channel.participants.map(normalizeParticipant).filter(Boolean)
    : []

  return {
    ...channel,
    id: channel?.id || channel?.channelID,
    channelID: channel?.channelID || channel?.id,
    participants,
  }
}

const isPersistedChannelObject = channel => {
  return Boolean(
    channel &&
      (channel?.creatorID ||
        channel?.lastMessageDate ||
        (Array.isArray(channel?.admins) && channel.admins.length > 0)),
  )
}

export const useChatSingleChannel = initialChannel => {
  const normalizedInitialChannel = normalizeChannel(initialChannel)

  const [remoteChannel, setRemoteChannel] = useState(
    isPersistedChannelObject(normalizedInitialChannel)
      ? normalizedInitialChannel
      : null,
  )

  const unsubscribeRef = useRef(null)

  const cleanup = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }
  }, [])

  const subscribeToSingleChannel = useCallback(
    channelInput => {
      cleanup()

      const normalizedInput =
        typeof channelInput === 'string'
          ? { id: channelInput, channelID: channelInput, participants: [] }
          : normalizeChannel(channelInput)

      const channelID = normalizedInput?.channelID || normalizedInput?.id

      if (!channelID) {
        setRemoteChannel(null)
        return () => {}
      }

      unsubscribeRef.current = subscribeToSingleChannelAPI(channelID, channel => {
        setRemoteChannel(normalizeChannel(channel))
      })

      return () => {
        cleanup()
      }
    },
    [cleanup],
  )

  useEffect(() => {
    cleanup()

    if (
      !normalizedInitialChannel ||
      !isPersistedChannelObject(normalizedInitialChannel)
    ) {
      setRemoteChannel(null)
      return () => {}
    }

    const channelID =
      normalizedInitialChannel?.channelID || normalizedInitialChannel?.id
    if (!channelID) {
      setRemoteChannel(normalizedInitialChannel)
      return () => {}
    }

    setRemoteChannel(normalizedInitialChannel)

    unsubscribeRef.current = subscribeToSingleChannelAPI(channelID, channel => {
      setRemoteChannel(normalizeChannel(channel))
    })

    return () => {
      cleanup()
    }
  }, [cleanup, initialChannel])

  return {
    remoteChannel,
    subscribeToSingleChannel,
  }
}
