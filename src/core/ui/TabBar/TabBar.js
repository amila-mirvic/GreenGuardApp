import React, { useEffect, useMemo } from 'react'
import { View, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../dopebase'
import dynamicStyles from './styles'
import Tab from './Tab'
import { useCurrentUser } from '../../onboarding'
import { useChatChannels } from '../../chat/api'

export function TabBarBuilder({ tabIcons, state, navigation, descriptors }) {
  const insets = useSafeAreaInsets()
  const currentUser = useCurrentUser()

  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)

  const { channels, subscribeToChannels } = useChatChannels()

  const focusedOptions =
    descriptors &&
    descriptors[state?.routes[state?.index]?.key]?.options?.tabBarStyle?.display

  useEffect(() => {
    if (!currentUser?.id) {
      return
    }

    const unsubscribe = subscribeToChannels(currentUser.id)

    return () => {
      unsubscribe && unsubscribe()
    }
  }, [currentUser?.id, subscribeToChannels])

  const unreadMessagesCount = useMemo(() => {
    const safeChannels = Array.isArray(channels) ? channels : []
    return safeChannels.filter(item => item?.markedAsRead === false).length
  }, [channels])

  const containerStyle = useMemo(() => {
    const safeBottomInset = Math.max(
      insets.bottom || 0,
      Platform.OS === 'android' ? 10 : 0,
    )

    return {
      paddingBottom: safeBottomInset,
      minHeight: 64 + safeBottomInset,
    }
  }, [insets.bottom])

  if (focusedOptions === undefined) {
    return (
      <View style={[styles.tabBarContainer, containerStyle]}>
        {state.routes.map((route, index) => {
          const isChatTab = route.name === 'Chat'
          const showBadge =
            isChatTab && state.index !== index && unreadMessagesCount > 0

          return (
            <Tab
              key={index + ''}
              route={state.routes[index]}
              tabIcons={tabIcons}
              focus={state.index === index}
              showBadge={showBadge}
              onPress={() => navigation.navigate(route.name)}
            />
          )
        })}
      </View>
    )
  }

  return null
}

export default TabBarBuilder