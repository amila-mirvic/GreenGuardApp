import React, { memo, useCallback, useEffect, useMemo } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { useCurrentUser } from '../../onboarding'
import { useChatChannelsAndFriends } from '../api'
import IMConversationList from '../IMConversationList'
import { useTheme } from '../../dopebase'

const IMConversationListView = memo(props => {
  const { navigation, headerComponent, emptyStateConfig } = props
  const currentUser = useCurrentUser()
  const { theme } = useTheme()

  const {
    hydratedListWithChannelsAndFriends,
    refreshing,
    loadingBottom,
    subscribeToChannels,
    loadMoreChannels,
    pullToRefresh,
    channels,
  } = useChatChannelsAndFriends()

  useEffect(() => {
    if (!currentUser?.id) {
      return
    }

    const unsubscribe = subscribeToChannels(currentUser.id)

    return () => {
      unsubscribe && unsubscribe()
    }
  }, [currentUser?.id, subscribeToChannels])

  useEffect(() => {
    if (!currentUser?.id) {
      return
    }

    if (channels === null) {
      pullToRefresh(currentUser.id)
    }
  }, [currentUser?.id, channels, pullToRefresh])

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
  }, [currentUser?.id, pullToRefresh])

  const onListEndReached = useCallback(() => {
    if (!currentUser?.id) return
    loadMoreChannels(currentUser.id)
  }, [currentUser?.id, loadMoreChannels])

  const safeConversationList = useMemo(() => {
    return Array.isArray(hydratedListWithChannelsAndFriends)
      ? hydratedListWithChannelsAndFriends.filter(Boolean)
      : []
  }, [hydratedListWithChannelsAndFriends])

  if (!currentUser) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    )
  }

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