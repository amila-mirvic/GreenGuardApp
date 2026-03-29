import React, { memo, useCallback, useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { useCurrentUser } from '../../onboarding'
import { useChatChannels, useChatChannelsAndFriends } from '../api'
import IMConversationList from '../IMConversationList'
import { useTheme } from '../../dopebase'

const IMConversationListView = memo(props => {
  const { navigation, headerComponent, emptyStateConfig } = props
  const currentUser = useCurrentUser()
  const { theme } = useTheme()

  const {
    channels,
    refreshing,
    loadingBottom,
    subscribeToChannels,
    loadMoreChannels,
    pullToRefresh,
  } = useChatChannels()

  const { hydratedListWithChannelsAndFriends } = useChatChannelsAndFriends()

  useEffect(() => {
    if (!currentUser?.id) {
      return
    }

    const unsubscribe = subscribeToChannels(currentUser.id)
    pullToRefresh(currentUser.id)

    return () => {
      unsubscribe && unsubscribe()
    }
  }, [currentUser?.id])

  const onChatItemPress = useCallback(
    item => {
      navigation.navigate('PersonalChat', {
        channel: item,
      })
    },
    [navigation],
  )

  const onRefresh = useCallback(() => {
    if (!currentUser?.id) return
    pullToRefresh(currentUser.id)
  }, [currentUser?.id])

  const onListEndReached = useCallback(() => {
    if (!currentUser?.id) return
    loadMoreChannels(currentUser.id)
  }, [currentUser?.id])

  if (!currentUser) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    )
  }

  const safeConversationList =
    Array.isArray(hydratedListWithChannelsAndFriends) &&
    hydratedListWithChannelsAndFriends.length > 0
      ? hydratedListWithChannelsAndFriends
      : channels || []

  return (
    <IMConversationList
      user={currentUser}
      conversations={safeConversationList}
      loading={channels === null && safeConversationList.length === 0}
      loadingBottom={loadingBottom}
      onConversationPress={onChatItemPress}
      headerComponent={headerComponent}
      emptyStateConfig={
        emptyStateConfig || {
          title: 'No conversations',
          description: 'Start a new conversation from your friends list.',
        }
      }
      pullToRefreshConfig={{
        refreshing,
        onRefresh,
      }}
      onListEndReached={onListEndReached}
      theme={theme}
    />
  )
})

export default IMConversationListView