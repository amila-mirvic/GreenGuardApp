import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
} from 'react'
import { Share, View } from 'react-native'
import { useDispatch } from 'react-redux'
import { useTheme, useTranslations } from '../../core/dopebase'
import { Feed } from '../../components'
import dynamicStyles from './styles'
import { useCurrentUser } from '../../core/onboarding'
import { setLocallyDeletedPost } from '../../core/socialgraph/feed/redux'
import { useHashtagPosts, usePostMutations } from '../../core/socialgraph/feed'

function FeedSearchScreen(props) {
  const { navigation, route } = props

  const dispatch = useDispatch()

  const { localized } = useTranslations()
  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)
  const currentUser = useCurrentUser()

  const emptyStateConfig = {
    title: localized('No Posts'),
    description: localized(''),
  }
  const [hashtag, setHashtag] = useState(route.params.hashtag)

  const {
    posts,
    refreshing,
    isLoadingBottom,
    addReaction,
    loadMorePosts,
    pullToRefresh,
  } = useHashtagPosts(hashtag, currentUser?.id)
  const { deletePost } = usePostMutations()

  const [isMediaViewerOpen, setIsMediaViewerOpen] = useState(false)
  const [selectedFeedItems, setSelectedFeedItems] = useState([])
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(null)
  const [willBlur, setWillBlur] = useState(false)

  const searchBarRef = useRef(null)
  const willBlurSubscription = useRef(null)
  const didFocusSubscription = useRef(
    navigation.addListener('focus', payload => {
      setWillBlur(false)
    }),
  )

  useLayoutEffect(() => {
    const colorSet = theme.colors[appearance]
    navigation.setOptions({
      headerTitle: hashtag,
      headerStyle: {
        backgroundColor: colorSet.primaryBackground,
        borderBottomColor: colorSet.hairline,
      },
      headerTintColor: colorSet.primaryText,
    })
  }, [theme])

  useEffect(() => {
    // setTimeout(() => {
    //   searchBarRef.current?.focus(hashtag)
    // }, 1500)
    willBlurSubscription.current = navigation.addListener('blur', payload => {
      setWillBlur(true)
    })
    navigation.setParams({
      openDrawer: openDrawer,
    })

    return () => {
      willBlurSubscription.current && willBlurSubscription.current()
      didFocusSubscription.current && didFocusSubscription.current()
    }
  }, [])

  const openDrawer = () => {
    navigation.openDrawer()
  }

  const onCommentPress = item => {
    let copyItem = { ...item }
    navigation.navigate('MainSinglePostNavigator', {
      item: { ...copyItem },
      lastScreenTitle: 'Main',
    })
  }

  const onFeedUserItemPress = async author => {
    if (author.id === currentUser.id) {
      navigation.navigate('MainProfile', {
        stackKeyTitle: 'MainProfile',
        lastScreenTitle: 'MainProfile',
      })
    } else {
      navigation.navigate('MainProfile', {
        user: author,
        stackKeyTitle: 'MainProfile',
        lastScreenTitle: 'MainProfile',
      })
    }
  }

  const onMediaClose = () => {
    setIsMediaViewerOpen(false)
  }

  const onMediaPress = (media, mediaIndex) => {
    const mediaUrls = media.map(item => item.url)
    setSelectedFeedItems(mediaUrls)
    setSelectedMediaIndex(mediaIndex)
    setIsMediaViewerOpen(true)
  }

  const onReaction = useCallback(
    async (reaction, item) => {
      await addReaction(item, currentUser, reaction)
    },
    [addReaction, currentUser],
  )

  const onSharePost = async item => {
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
  }

  const onDeletePost = useCallback(
    async item => {
      dispatch(setLocallyDeletedPost(item.id))
      await deletePost(item.id, currentUser?.id)
    },
    [deletePost],
  )

  const onSearchTextChange = text => {}

  const onSearchBarCancel = () => {
    navigation.goBack()
  }

  const onSearch = text => {
    setHashtag(text)
  }

  const onSearchClear = () => {}

  const handleOnEndReached = useCallback(
    distanceFromEnd => {
      loadMorePosts(hashtag, currentUser?.id)
    },
    [loadMorePosts, currentUser],
  )

  const onFeedScroll = () => {}

  const pullToRefreshConfig = {
    refreshing: refreshing,
    onRefresh: () => {
      pullToRefresh(currentUser?.id)
    },
  }

  return (
    <View style={styles.container}>
      {/* <View style={styles.searchBarContainer}>
        <SearchBar
          onChangeText={onSearchTextChange}
          onSearchBarCancel={onSearchBarCancel}
          searchRef={searchBarRef}
          onSearchClear={onSearchClear}
          defaultValue={hashtag}
          onSearch={onSearch}
        />
      </View> */}
      <Feed
        loading={posts === null}
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
        user={currentUser}
        onFeedScroll={onFeedScroll}
        willBlur={willBlur}
        emptyStateConfig={emptyStateConfig}
        navigation={navigation}
        isCameraOpen={false}
        pullToRefreshConfig={pullToRefreshConfig}
      />
    </View>
  )
}

export default FeedSearchScreen
