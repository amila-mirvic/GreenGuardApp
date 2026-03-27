const formatMessage = (message, localized) => {
  if (!message) {
    return ''
  }

  if (typeof message === 'string') {
    return message
  }

  if (typeof message?.lastMessage === 'string' && message.lastMessage.length > 0) {
    return message.lastMessage
  }

  if (typeof message?.content === 'string' && message.content.length > 0) {
    return message.content
  }

  const type = message?.media?.type
  if (type) {
    if (type.includes('video')) {
      return localized('Someone sent a video.')
    } else if (type.includes('audio')) {
      return localized('Someone sent an audio.')
    } else if (type.includes('image')) {
      return localized('Someone sent a photo.')
    } else if (type.includes('file')) {
      return localized('Someone sent a file.')
    }
  }

  return ''
}

export { formatMessage }