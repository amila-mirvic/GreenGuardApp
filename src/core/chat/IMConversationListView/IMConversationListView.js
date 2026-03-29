import React, { memo, useCallback, useEffect, useMemo } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { useCurrentUser } from '../../onboarding'
import { useChatChannels, useChatChannelsAndFriends } from '../api'
import IMConversationList from '../IMConversationList'
import { useTheme } from '../../dopebase'

const getItemID = item => item?.id || item?.channelID
const getItemTimestamp = item =>
  item?.updatedAt || item?.lastMessageDate || item?.createdAt || 0

const getItemRichnessScore = item => {
  if (!item) return 0

  let score = 0

  if (Array.isArray(item?.participants) && item.participants.length > 0) score += 1
  if (typeof item?.title === 'string' && item.title.trim().length > 0) score += 1
  if (typeof item?.name === 'string' && item.name.trim().length > 0) score += 1
  if (typeof item?.content === 'string' && item.content.trim().length > 0) score += 3
  if (typeof item?.lastMessage === 'string' && item.lastMessage.trim().length > 0)
    score += 4
  if (item?.media) score += 2
  if (typeof item?.markedAsRead === 'boolean') score += 3
  if (item?.lastMessageDate) score += 4
  if (item?.createdAt) score += 1

  return score
}

const mergeItemsPreferRicher = (existingItem, incomingItem) => {
  if (!existingItem) return incomingItem
  if (!incomingItem) return existingItem

  const existingScore = getItemRichnessScore(existingItem)
  const incomingScore = getItemRichnessScore(incomingItem)

  const base =
    incomingScore >= existingScore ? incomingItem : existingItem

  const secondary =
    incomingScore >= existingScore ? existingItem : incomingItem

  return {
    ...secondary,
    ...base,
    id: getItemID(base) || getItemID(secondary),
    channelID: getItemID(base) || getItemID(secondary),
    participants: Array.isArray(base?.participants)
      ? base.participants
      : Array.isArray(secondary?.participants)
      ? secondary.participants
      : [],
  }
}

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

  const safeConversationList = useMemo(() => {
    const safeChannels = Array.isArray(channels) ? channels.filter(Boolean) : []
    const safeHydrated = Array.isArray(hydratedListWithChannelsAndFriends)
      ? hydratedListWithChannelsAndFriends.filter(Boolean)
      : []

    const byID = new Map()

    ;[...safeChannels, ...safeHydrated].forEach(item => {
      const itemID = getItemID(item)
      if (!itemID) {
        return
      }

      const normalizedItem = {
        ...item,
        id: itemID,
        channelID: itemID,
        participants: Array.isArray(item?.participants)
          ? item.participants
          : [],
      }

      const existing = byID.get(itemID)
      byID.set(itemID, mergeItemsPreferRicher(existing, normalizedItem))
    })

    return Array.from(byID.values()).sort(
      (a, b) => getItemTimestamp(b) - getItemTimestamp(a),
    )
  }, [channels, hydratedListWithChannelsAndFriends])

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