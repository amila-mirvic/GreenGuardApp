import { DeviceEventEmitter } from 'react-native'

export const CHAT_CONVERSATION_PATCH_EVENT = 'CHAT_CONVERSATION_PATCH_EVENT'

export const emitConversationPatch = patch => {
  DeviceEventEmitter.emit(CHAT_CONVERSATION_PATCH_EVENT, patch)
}

export const subscribeConversationPatch = callback => {
  const subscription = DeviceEventEmitter.addListener(
    CHAT_CONVERSATION_PATCH_EVENT,
    callback,
  )

  return () => {
    subscription?.remove?.()
  }
}