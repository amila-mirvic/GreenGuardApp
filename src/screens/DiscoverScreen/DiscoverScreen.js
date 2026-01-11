import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react'
import { Platform, Share } from 'react-native'
import { useTheme, useTranslations, TouchableIcon } from '../../core/dopebase'
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

  useEffect(() => {
    if (currentUser?.id) {
      loadMorePosts(currentUser?.id)
    }
  }, [currentUser?.id])

  const openDrawer = () => {
    navigation.openDrawer()
  }

  const onCommentPress = item => {
    let copyItem = { ...item }
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
  }, [setIsMediaViewerOpen])

  const onMediaPress = useCallback(
    (media, mediaIndex) => {
      const mediaUrls = media.map(item => item.url)
      setSelectedFeedItems(mediaUrls)
      setSelectedMediaIndex(mediaIndex)
      setIsMediaViewerOpen(true)
    },
    [setIsMediaViewerOpen, setSelectedMediaIndex, setSelectedFeedItems],
  )

  const onReaction = useCallback(
    async (reaction, item) => {
      await addReaction(item, currentUser, reaction)
    },
    [addReaction, currentUser],
  )

  const onSharePost = useCallback(
    async item => {
      let url = ''
      if (item.postMedia?.length > 0) {
        url = item.postMedia[0]?.url || item.postMedia[0]
      }
      try {
        const result = await Share.share(
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
    },
    [Share],
  )

  const onDeletePost = useCallback(async item => {
    // generally you cannot delete a post in discover feed
    // implement this if you want to delete a post in discover feed
  }, [])

  const onUserReport = useCallback(
    async (item, type) => {
      await markAbuse(currentUser.id, item.authorID, type)
    },
    [currentUser.id, markAbuse],
  )

  const handleOnEndReached = useCallback(
    distanceFromEnd => {
      if (currentUser?.id && posts?.length >= batchSize) {
        loadMorePosts(currentUser?.id)
      }
    },
    [loadMorePosts, currentUser?.id, posts],
  )

  const onFeedScroll = useCallback(() => {}, [])

  const emptyStateConfig = {
    title: localized('No Discover Posts'),
    description: localized(
      'There are currently no posts from people who are not your friends. Posts from non-friends will show up here.',
    ),
  }

  const pullToRefreshConfig = {
    refreshing: refreshing,
    onRefresh: () => {
      pullToRefresh(currentUser?.id)
    },
  }

  return (
    <Feed
      loading={posts == null}
      posts={posts}
      onFeedUserItemPress={onFeedUserItemPress}
      onCommentPress={onCommentPress}
      isMediaViewerOpen={isMediaViewerOpen}
      feedItems={selectedFeedItems}
      onMediaClose={onMediaClose}
      onMediaPress={onMediaPress}
      selectedMediaIndex={selectedMediaIndex}
      handleOnEndReached={handleOnEndReached}
      isLoadingBottom={isLoadingBottom}
      onReaction={onReaction}
      onSharePost={onSharePost}
      onDeletePost={onDeletePost}
      onUserReport={onUserReport}
      user={currentUser}
      onFeedScroll={onFeedScroll}
      emptyStateConfig={emptyStateConfig}
      isCameraOpen={false}
      pullToRefreshConfig={pullToRefreshConfig}
      displayStories={false}
    />
  )
}

export default DiscoverScreen
