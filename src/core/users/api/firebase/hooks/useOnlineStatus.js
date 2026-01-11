import { useEffect } from 'react'
import { AppState } from 'react-native'
import NetInfo from '@react-native-community/netinfo'
import { updateOnlineStatus } from '../../../index'

export const useOnlineStatus = currentUser => {
  useEffect(() => {
    if (!currentUser?.id) return

    const handleStatusUpdate = async isOnline => {
      try {
        await updateOnlineStatus(currentUser.id, isOnline)
      } catch (error) {
        console.log('Failed to update online status', error)
      }
    }
    handleStatusUpdate(true)

    const handleAppStateChange = nextAppState => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        handleStatusUpdate(false)
      } else if (nextAppState === 'active') {
        handleStatusUpdate(true)
      }
    }

    const unsubscribeNetInfo = NetInfo.addEventListener(state => {
      if (!state.isConnected) {
        handleStatusUpdate(false)
      } else {
        handleStatusUpdate(true)
      }
    })
    const appStateSubscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    )

    return () => {
      unsubscribeNetInfo()
      appStateSubscription.remove()
      handleStatusUpdate(false)
    }
  }, [currentUser?.id])
}
