import { useCallback, useEffect, useRef, useState } from 'react'
import { subscribeToSingleChannel as subscribeToSingleChannelAPI } from './firebaseChatClient'

const isRealChannelObject = channel => {
  return Boolean(
    channel &&
      (channel?.channelID ||
        (Array.isArray(channel?.participants) && channel.participants.length > 0) ||
        channel?.creatorID ||
        channel?.lastMessageDate),
  )
}

export const useChatSingleChannel = initialChannel => {
  const [remoteChannel, setRemoteChannel] = useState(
    isRealChannelObject(initialChannel) ? initialChannel : null,
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

      const channelID =
        typeof channelInput === 'string'
          ? channelInput
          : channelInput?.channelID || channelInput?.id

      if (!channelID) {
        setRemoteChannel(null)
        return () => {}
      }

      unsubscribeRef.current = subscribeToSingleChannelAPI(channelID, channel => {
        setRemoteChannel(channel || null)
      })

      return () => {
        cleanup()
      }
    },
    [cleanup],
  )

  useEffect(() => {
    cleanup()

    if (!isRealChannelObject(initialChannel)) {
      setRemoteChannel(null)
      return () => {}
    }

    const channelID = initialChannel?.channelID || initialChannel?.id
    if (!channelID) {
      setRemoteChannel(initialChannel)
      return () => {}
    }

    setRemoteChannel(initialChannel)

    unsubscribeRef.current = subscribeToSingleChannelAPI(channelID, channel => {
      setRemoteChannel(channel || null)
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