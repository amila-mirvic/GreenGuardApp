import React, { useState, useLayoutEffect, useCallback } from 'react'
import { Share } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { useTheme, useTranslations } from '../../core/dopebase'
import { Feed } from '../../components'
import { useDiscoverPosts } from '../../core/socialgraph/feed'
import { useUserReportingMutations } from '../../core/user-reporting'
import { useCurrentUser } from '../../core/onboarding'

const DiscoverScreen = props => {
  const { navigation } = props

  const { localized } = useTranslations()
  const { theme, appearance } = useTheme()

  const {
    posts,
    refreshing,
    loadMorePosts,
    pullToRefresh,
    addReaction,
    isLoadingBottom,
    batchSize,
  } = useDiscoverPosts()

  const currentUser = useCurrentUser()
  const { markAbuse } = useUserReportingMutations()

  const [isMediaViewerOpen, setIsMediaViewerOpen] = useState(false)
  const [selectedFeedItems, setSelectedFeedItems] = useState([])
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(null)

  useLayoutEffect(() => {
    const colorSet = theme.colors[appearance]
    navigation.setOptions({
      headerTitle: localized('Discover'),
      headerStyle: {
        backgroundColor: colorSet.primaryBackground,
        borderBottomColor: colorSet.hairline,
      },
      headerTintColor: colorSet.primaryText,
    })
  }, [])

  useFocusEffect(
    useCallback(() => {
      if (currentUser?.id) {
        pullToRefresh(currentUser.id)
      }
    }, [currentUser?.id]),
  )

  const onCommentPress = item => {
    const copyItem = { ...item }
    navigation.navigate('DiscoverSinglePostNavigator', {
      item: { ...copyItem },
      lastScreenTitle: 'Discover',
    })
  }

  const onFeedUserItemPress = useCallback(
    async author => {
      if (author.id === currentUser.id) {
        navigation.navigate('DiscoverProfile', {
          stackKeyTitle: 'DiscoverProfile',
          lastScreenTitle: 'Discover',
        })
      } else {
        navigation.navigate('DiscoverProfile', {
          user: author,
          stackKeyTitle: 'DiscoverProfile',
          lastScreenTitle: 'Discover',
        })
      }
    },
    [navigation, currentUser?.id],
  )

  const onMediaClose = useCallback(() => {
    setIsMediaViewerOpen(false)
  }, [])

  const onMediaPress = useCallback((media, mediaIndex) => {
    setSelectedMediaIndex(mediaIndex)
    const mediaUrls = media.map(item => item.url)
    setSelectedFeedItems(mediaUrls)
    setIsMediaViewerOpen(true)
  }, [])

  const onReaction = useCallback(
    async (reaction, item) => {
      await addReaction(item, currentUser, reaction)
    },
    [addReaction, currentUser],
  )

  const onSharePost = useCallback(async item => {
    let url = ''
    if (item.postMedia?.length > 0) {
      url = item.postMedia[0]?.url || item.postMedia[0]
    }
    try {
      await Share.share(
        {
          title: 'Share SocialNetwork post.',
          message: item.postText,
          url,
        },
        {
          dialogTitle: 'Share SocialNetwork post.',
        },
      )
    } catch (error) {
      alert(error.message)
    }
  }, [])

  const onDeletePost = useCallback(async () => {}, [])

  const onUserReport = useCallback(
    async (item, type) => {
      markAbuse(currentUser.id, item.authorID, type)
    },
    [currentUser?.id, markAbuse],
  )

  const handleOnEndReached = useCallback(() => {
    if ((posts?.length || 0) >= batchSize) {
      loadMorePosts(currentUser?.id)
    }
  }, [currentUser?.id, posts, loadMorePosts, batchSize])

  const onEmptyStatePress = useCallback(() => {}, [])

  const emptyStateConfig = {
    title: localized('No Discover Posts'),
    description: localized(
      'There are currently no posts from people who are not your friends. Posts from non-friends will show up here.',
    ),
    onPress: onEmptyStatePress,
  }

  const pullToRefreshConfig = {
    refreshing,
    onRefresh: () => {
      pullToRefresh(currentUser?.id)
    },
  }

  return (
    <Feed
      loading={posts === null}
      posts={posts}
      onCommentPress={onCommentPress}
      user={currentUser}
      onFeedUserItemPress={onFeedUserItemPress}
      isMediaViewerOpen={isMediaViewerOpen}
      feedItems={selectedFeedItems}
      onMediaClose={onMediaClose}
      onMediaPress={onMediaPress}
      selectedMediaIndex={selectedMediaIndex}
      onReaction={onReaction}
      handleOnEndReached={handleOnEndReached}
      isLoadingBottom={isLoadingBottom}
      onSharePost={onSharePost}
      onDeletePost={onDeletePost}
      onUserReport={onUserReport}
      shouldReSizeMedia={true}
      displayStories={false}
      emptyStateConfig={emptyStateConfig}
      navigation={navigation}
      pullToRefreshConfig={pullToRefreshConfig}
    />
  )
}

export default DiscoverScreen