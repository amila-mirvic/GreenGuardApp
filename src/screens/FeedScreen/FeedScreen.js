import React, { useEffect, useState, useLayoutEffect, useCallback } from 'react'
import { Platform, View, Share } from 'react-native'
import { useDispatch } from 'react-redux'
import * as ImagePicker from 'expo-image-picker'
import { Camera } from 'expo-camera/legacy'
// import * as FacebookAds from 'expo-ads-facebook'
import {
  useTheme,
  useTranslations,
  ActivityIndicator,
  Alert,
  TouchableIcon,
} from '../../core/dopebase'
import { Feed } from '../../components'
import styles from './styles'
import { useUserReportingMutations } from '../../core/user-reporting'
import { setLocallyDeletedPost } from '../../core/socialgraph/feed/redux'
import { useConfig } from '../../config'
import { useCurrentUser } from '../../core/onboarding'
import {
  useHomeFeedPosts,
  useStories,
  useStoryMutations,
  usePostMutations,
} from '../../core/socialgraph/feed'
import { useOnlineStatus } from '../../core/users/api/firebase/hooks/useOnlineStatus'

const FeedScreen = props => {
  const { navigation } = props
  const config = useConfig()
  const currentUser = useCurrentUser()

  const { localized } = useTranslations()
  const { theme, appearance } = useTheme()

  const dispatch = useDispatch()

  const {
    posts,
    refreshing,
    isLoadingBottom,
    subscribeToHomeFeedPosts,
    loadMorePosts,
    pullToRefresh,
    addReaction,
    ingestAdSlots,
    batchSize,
  } = useHomeFeedPosts()

  const { groupedStories, myStories, subscribeToStories, loadMoreStories } =
    useStories()

  const loading = posts === null
  const { addStory } = useStoryMutations()
  const { deletePost } = usePostMutations()
  const { markAbuse } = useUserReportingMutations()

  const [isUploadingStory, setIsUploadingStory] = useState(false)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [isMediaViewerOpen, setIsMediaViewerOpen] = useState(false)
  const [selectedFeedItems, setSelectedFeedItems] = useState([])
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(null)
  const [willBlur, setWillBlur] = useState(false)
  const [adsManager, setAdsManager] = useState(null)
  const [adsLoaded, setAdsLoaded] = useState(false)

  useOnlineStatus(currentUser)

  useLayoutEffect(() => {
    const colorSet = theme.colors[appearance]

    navigation.setOptions({
      headerTitle: localized('Home'),
      headerRight: () => (
        <View style={styles.doubleNavIcon}>
          {Platform.OS === 'android' && (
            <TouchableIcon
              imageStyle={{ tintColor: colorSet.primaryText }}
              iconSource={theme.icons.camera}
              onPress={toggleCamera}
            />
          )}
          <TouchableIcon
            imageStyle={{ tintColor: colorSet.primaryText }}
            iconSource={theme.icons.inscription}
            onPress={() => navigation.navigate('CreatePost')}
          />
        </View>
      ),
      headerStyle: {
        backgroundColor: colorSet.primaryBackground,
        borderBottomColor: colorSet.hairline,
      },
      headerTintColor: colorSet.primaryText,
    })
  }, [])

  useEffect(() => {
    if (!currentUser?.id) {
      return
    }

    const postsUnsubscribe = subscribeToHomeFeedPosts(currentUser?.id)
    const storiesUnsubscribe = subscribeToStories(currentUser?.id)

pullToRefresh(currentUser?.id)
loadMoreStories(currentUser?.id)

    return () => {
      postsUnsubscribe && postsUnsubscribe()
      storiesUnsubscribe && storiesUnsubscribe()
    }
  }, [currentUser?.id])

  useEffect(() => {
    // FacebookAds.InterstitialAdManager.showAd("834318260403282_834371153731326")
    //   .then(didClick => {})
    //   .catch(error => {
    //     alert(error);
    //   });
    //
    // const placementID =
    //   config.adsConfig && config.adsConfig.facebookAdsPlacementID
    // if (placementID) {
    //   const manager = new FacebookAds.NativeAdsManager(placementID, 5)
    //   manager.onAdsLoaded(onAdsLoaded)
    //   setAdsManager(manager)
    // }
  }, [1])

  useEffect(() => {
    const { adsConfig } = config
    if (adsConfig && adsLoaded) {
      ingestAdSlots(adsConfig.adSlotInjectionInterval)
    }
  }, [adsLoaded])

  const onAdsLoaded = useCallback(() => {
    setAdsLoaded(true)
  }, [setAdsLoaded])

  const onStoriesListEndReached = useCallback(() => {
    loadMoreStories(currentUser?.id)
  }, [loadMoreStories, currentUser?.id])

  const onCommentPress = useCallback(
    item => {
      navigation.navigate('FeedSinglePostNavigator', {
        item: item,
        lastScreenTitle: 'Feed',
      })
    },
    [navigation],
  )

  const runIfCameraPermissionGranted = async callback => {
    const { status } = await Camera.requestCameraPermissionsAsync()
    if (status === 'granted') {
      callback && callback()
    } else {
      Alert.alert(
        localized('Camera permission denied'),
        localized(
          'You must enable camera permissions in order to take photos.',
        ),
      )
    }
  }

  const toggleCamera = useCallback(() => {
    if (Platform.OS === 'web') {
      return openMediaPicker()
    }

    runIfCameraPermissionGranted(() => {
      setIsCameraOpen(!isCameraOpen)
    })
  }, [runIfCameraPermissionGranted, setIsCameraOpen, isCameraOpen])

  const openMediaPicker = useCallback(() => {
    ImagePicker.launchImageLibraryAsync({
      mediaType: ImagePicker.MediaTypeOptions.All,
    }).then(result => {
      if (result.canceled !== true) {
        const image = result.assets[0]
        let pattern = /[a-zA-Z]+\/[A-Za-z0-9]+/i
        let match = pattern.exec(image.uri)

        onPostStory({ ...image, type: (match ?? [])[0] })
      }
    })
  }, [ImagePicker, onPostStory])

  const onCameraClose = useCallback(() => {
    setIsCameraOpen(false)
  }, [setIsCameraOpen])

  const onUserItemPress = useCallback(
    shouldOpenCamera => {
      if (shouldOpenCamera) {
        toggleCamera()
      }
    },
    [toggleCamera],
  )

  const onFeedUserItemPress = useCallback(
    async item => {
      if (item.id === currentUser.id) {
        navigation.navigate('FeedProfile', {
          stackKeyTitle: 'FeedProfile',
          lastScreenTitle: 'Feed',
        })
      } else {
        navigation.navigate('FeedProfile', {
          user: item,
          stackKeyTitle: 'FeedProfile',
          lastScreenTitle: 'Feed',
        })
      }
    },
    [navigation, currentUser?.id],
  )

  const onMediaClose = useCallback(() => {
    setIsMediaViewerOpen(false)
    navigation.setOptions({
      headerShown: true,
    })
  }, [setIsMediaViewerOpen, navigation])

  const onMediaPress = useCallback(
    (media, mediaIndex) => {
      const mediaUrls = media.map(item => item.url)
      setSelectedFeedItems(mediaUrls)
      setSelectedMediaIndex(mediaIndex)
      setIsMediaViewerOpen(true)
      navigation.setOptions({
        headerShown: false,
      })
    },
    [
      setSelectedFeedItems,
      setSelectedMediaIndex,
      setIsMediaViewerOpen,
      navigation,
    ],
  )

  const onPostStory = useCallback(
    async file => {
      toggleCamera()

      setIsUploadingStory(true)
      await addStory(file, currentUser)
      setIsUploadingStory(false)
    },
    [toggleCamera, addStory, localized, currentUser],
  )

  const onReaction = useCallback(
    async (reaction, post) => {
      await addReaction(post, currentUser, reaction)
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
    },
    [Share],
  )

  const onDeletePost = useCallback(
    async item => {
      dispatch(setLocallyDeletedPost(item.id))
      await deletePost(item.id, currentUser?.id)
    },
    [deletePost, currentUser],
  )

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
  }, [currentUser?.id, posts, loadMorePosts])

  const onFeedScroll = () => {}

  const onEmptyStatePress = useCallback(() => {
    navigation.navigate('Friends')
  }, [navigation])

  const emptyStateConfig = {
    title: localized('Welcome'),
    description: localized(
      'Go ahead and follow a few friends. Their posts will show up here.',
    ),
    callToAction: localized('Find Friends'),
    onPress: onEmptyStatePress,
  }

  const pullToRefreshConfig = {
    refreshing: refreshing,
    onRefresh: () => {
      pullToRefresh(currentUser?.id)
    },
  }

  return (
    <View style={styles.container}>
      {isUploadingStory && <ActivityIndicator />}
      <Feed
        loading={loading}
        posts={posts}
        onCommentPress={onCommentPress}
        user={currentUser}
        isCameraOpen={isCameraOpen}
        onCameraClose={onCameraClose}
        onUserItemPress={onUserItemPress}
        onFeedUserItemPress={onFeedUserItemPress}
        isMediaViewerOpen={isMediaViewerOpen}
        feedItems={selectedFeedItems}
        onMediaClose={onMediaClose}
        onMediaPress={onMediaPress}
        selectedMediaIndex={selectedMediaIndex}
        storiesEnabled={true}
        stories={groupedStories || []}
        userStories={myStories}
        onStoriesListEndReached={onStoriesListEndReached}
        onPostStory={onPostStory}
        onReaction={onReaction}
        handleOnEndReached={handleOnEndReached}
        isLoadingBottom={isLoadingBottom}
        onSharePost={onSharePost}
        onDeletePost={onDeletePost}
        onUserReport={onUserReport}
        onFeedScroll={onFeedScroll}
        shouldReSizeMedia={true}
        displayStories={true}
        willBlur={willBlur}
        onEmptyStatePress={onEmptyStatePress}
        adsManager={adsManager}
        emptyStateConfig={emptyStateConfig}
        navigation={navigation}
        pullToRefreshConfig={pullToRefreshConfig}
      />
    </View>
  )
}

export default FeedScreen