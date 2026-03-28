import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react'
import { useTheme, useTranslations } from '../../../../dopebase'
import { FriendshipConstants } from '../../constants'
import IMFriendsListComponent from '../../ui/IMFriendsListComponent/IMFriendsListComponent'
import { useSocialGraphFriendships, useSocialGraphMutations } from '../../api'
import { useCurrentUser } from '../../../../onboarding'

const IMFriendsScreen = props => {
  const { localized } = useTranslations()
  const { theme, appearance } = useTheme()
  const currentUser = useCurrentUser()

  const {
    friendships,
    setFriendships,
    refreshing,
    subscribeToFriendships,
    loadMoreFriendships,
    pullToRefresh,
    batchSize,
  } = useSocialGraphFriendships()

  const { addEdge, unfriend } = useSocialGraphMutations(setFriendships)

  const { navigation, route } = props
  const followEnabled = route.params.followEnabled

  const [isLoading, setIsLoading] = useState(false)

  useLayoutEffect(() => {
    const headerTitle = route.params.friendsScreenTitle || localized('Friends')
    const colorSet = theme.colors[appearance]
    navigation.setOptions({
      headerTitle: headerTitle,
      headerStyle: {
        backgroundColor: colorSet.primaryBackground,
      },
      headerTintColor: colorSet.primaryText,
    })
  }, [])

  useEffect(() => {
    if (!currentUser?.id) {
      return
    }

    const unsubscribe = subscribeToFriendships(currentUser?.id)
    pullToRefresh(currentUser?.id)

    return () => {
      unsubscribe && unsubscribe()
    }
  }, [currentUser?.id])

  const onFriendshipsListEndReached = useCallback(() => {
    if ((friendships?.length || 0) >= batchSize) {
      loadMoreFriendships(currentUser?.id)
    }
  }, [loadMoreFriendships, currentUser?.id, friendships?.length, batchSize])

  const onSearchButtonPress = useCallback(async () => {
    navigation.navigate('UserSearchScreen', {
      followEnabled: followEnabled,
    })
  }, [followEnabled, navigation])

  const onUnfriend = async item => {
    await unfriend(currentUser, item.user)
  }

  const onAddFriend = async item => {
    setIsLoading(true)
    await addEdge(currentUser, item.user)
    await pullToRefresh(currentUser?.id)
    setIsLoading(false)
  }

  const onCancel = async item => {
    await unfriend(currentUser, item.user)
  }

  const onAccept = async item => {
    setIsLoading(true)
    await addEdge(currentUser, item.user)
    await pullToRefresh(currentUser?.id)
    setIsLoading(false)
  }

  const onFriendAction = useCallback(
    item => {
      if (isLoading || (item.user && item.user.id == currentUser.id)) {
        return
      }
      switch (item.type) {
        case FriendshipConstants.FriendshipType.none:
          onAddFriend(item)
          break
        case FriendshipConstants.FriendshipType.reciprocal:
          onUnfriend(item)
          break
        case FriendshipConstants.FriendshipType.inbound:
          onAccept(item)
          break
        case FriendshipConstants.FriendshipType.outbound:
          onCancel(item)
          break
      }
    },
    [isLoading, currentUser, onAddFriend, onUnfriend, onAccept, onCancel],
  )

  const onFriendItemPress = useCallback(
    friendship => {
      if (friendship.user && friendship.user.id == currentUser.id) {
        return
      }
      navigation.push('FriendsProfile', {
        user: friendship.user,
        lastScreenTitle: 'Friends',
      })
    },
    [navigation, currentUser?.id],
  )

  const onEmptyStatePress = useCallback(() => {
    onSearchButtonPress()
  }, [onSearchButtonPress])

  const emptyStateConfig = {
    title: localized('No Friends'),
    description: localized(
      'Make some friend requests and have your friends accept them. All your friends will show up here.',
    ),
    callToAction: localized('Find friends'),
    onPress: onEmptyStatePress,
  }

  const pullToRefreshConfig = {
    refreshing: refreshing,
    onRefresh: () => {
      pullToRefresh(currentUser?.id)
    },
  }

  return (
    <IMFriendsListComponent
      onListEndReached={onFriendshipsListEndReached}
      friendsData={friendships}
      searchBar={true}
      onSearchBarPress={onSearchButtonPress}
      onFriendItemPress={onFriendItemPress}
      onFriendAction={onFriendAction}
      isLoading={isLoading}
      followEnabled={followEnabled}
      emptyStateConfig={emptyStateConfig}
      pullToRefreshConfig={pullToRefreshConfig}
      displayActions={true}
      viewer={currentUser}
    />
  )
}

export default IMFriendsScreen