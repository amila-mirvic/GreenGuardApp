import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react'
import { Share } from 'react-native'
import { useTheme, useTranslations } from '../../core/dopebase'
import { useDispatch } from 'react-redux'
import { SinglePost } from '../../components'
import { useUserReportingMutations } from '../../core/user-reporting'
import { setLocallyDeletedPost } from '../../core/socialgraph/feed/redux'
import {
  useCommentMutations,
  useComments,
  usePost,
  usePostMutations,
} from '../../core/socialgraph/feed'
import { useCurrentUser } from '../../core/onboarding'

const SinglePostScreen = props => {
  const { navigation, route } = props
  const lastScreenTitle = route.params.lastScreenTitle
  const profileScreenTitle = lastScreenTitle + 'Profile'
  const { params } = route
  const { item } = params

  const dispatch = useDispatch()

  const { localized } = useTranslations()
  const { theme, appearance } = useTheme()
  const currentUser = useCurrentUser()

  const { deletePost } = usePostMutations()
  const { addComment } = useCommentMutations()
  const { markAbuse } = useUserReportingMutations()

  const { comments, commentsLoading, subscribeToComments } = useComments()
  const { remotePost, subscribeToPost, addReaction } = usePost()

  const [feedItem, setFeedItem] = useState(item)
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(null)
  const [selectedFeedItems, setSelectedFeedItems] = useState([])
  const [isMediaViewerOpen, setIsMediaViewerOpen] = useState(false)

  useLayoutEffect(() => {
    const colorSet = theme.colors[appearance]
    navigation.setOptions({
      headerTitle: localized('Post'),
      headerStyle: {
        backgroundColor: colorSet.primaryBackground,
        borderBottomColor: colorSet.hairline,
      },
      headerTintColor: colorSet.primaryText,
    })
  }, [theme, appearance, navigation, localized])

  useEffect(() => {
    if (!item?.id) {
      return
    }
    const postUnsubscribe = subscribeToPost(item.id, currentUser?.id)
    const commentsUnsubscribe = subscribeToComments(item.id)
    return () => {
      postUnsubscribe && postUnsubscribe()
      commentsUnsubscribe && commentsUnsubscribe()
    }
  }, [item?.id, currentUser?.id, subscribeToPost, subscribeToComments])

  useEffect(() => {
    if (remotePost) {
      setFeedItem(remotePost)
    }
  }, [remotePost])

  const onCommentSend = useCallback(
    async text => {
      const trimmedText = typeof text === 'string' ? text.trim() : ''
      if (!trimmedText || !feedItem?.id || !currentUser?.id) {
        return
      }

      setFeedItem(prev => ({
        ...prev,
        commentCount: Number(prev?.commentCount || 0) + 1,
      }))

      await addComment(trimmedText, feedItem.id, currentUser.id)
    },
    [addComment, currentUser?.id, feedItem?.id],
  )

  const onReaction = useCallback(
    async reaction => {
      await addReaction(feedItem, currentUser, reaction)
    },
    [addReaction, feedItem, currentUser],
  )

  const onMediaPress = useCallback((media, mediaIndex) => {
    setSelectedMediaIndex(mediaIndex)
    const mediaUrls = media.map(item => item.url)
    setSelectedFeedItems(mediaUrls)
    setIsMediaViewerOpen(true)
  }, [])

  const onMediaClose = useCallback(() => {
    setIsMediaViewerOpen(false)
  }, [])

  const onFeedUserItemPress = useCallback(
    async pressedUser => {
      if (pressedUser.id === currentUser.id) {
        navigation.navigate(profileScreenTitle, {
          stackKeyTitle: profileScreenTitle,
          lastScreenTitle: lastScreenTitle,
        })
      } else {
        navigation.navigate(profileScreenTitle, {
          user: pressedUser,
          stackKeyTitle: profileScreenTitle,
          lastScreenTitle: lastScreenTitle,
        })
      }
    },
    [currentUser, navigation, profileScreenTitle, lastScreenTitle],
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

  const onDeletePost = useCallback(
    async item => {
      dispatch(setLocallyDeletedPost(item.id))
      await deletePost(item.id, currentUser.id)
      navigation.goBack()
    },
    [dispatch, deletePost, currentUser?.id, navigation],
  )

  const onUserReport = useCallback(
    async (item, type) => {
      await markAbuse(currentUser.id, item.authorID, type)
      navigation.goBack()
    },
    [markAbuse, currentUser?.id, navigation],
  )

  return (
    <SinglePost
      feedItem={feedItem}
      commentItems={comments}
      commentsLoading={commentsLoading}
      onCommentSend={onCommentSend}
      onFeedUserItemPress={onFeedUserItemPress}
      onMediaPress={onMediaPress}
      feedItems={selectedFeedItems}
      onMediaClose={onMediaClose}
      isMediaViewerOpen={isMediaViewerOpen}
      selectedMediaIndex={selectedMediaIndex}
      onReaction={onReaction}
      onSharePost={onSharePost}
      onDeletePost={onDeletePost}
      onUserReport={onUserReport}
      user={currentUser}
      navigation={navigation}
    />
  )
}

export default SinglePostScreen