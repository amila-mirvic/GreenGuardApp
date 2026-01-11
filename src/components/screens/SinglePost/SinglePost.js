import React, { memo, useState } from 'react'
import {
  ScrollView,
  ActivityIndicator as RNActivityIndicator,
  SafeAreaView,
} from 'react-native'
import {
  useTheme,
  ActivityIndicator,
  KeyboardAvoidingView,
  MediaViewerModal,
} from '../../../core/dopebase'
import FeedItem from '../../FeedItem/FeedItem'
import CommentItem from './CommentItem'
import CommentInput from './CommentInput'
import dynamicStyles from './styles'

const SinglePost = memo(props => {
  const {
    feedItem,
    feedItems,
    commentItems,
    onCommentSend,
    onMediaPress,
    onReaction,
    onOtherReaction,
    onMediaClose,
    isMediaViewerOpen,
    selectedMediaIndex,
    onFeedUserItemPress,
    onSharePost,
    onDeletePost,
    onUserReport,
    user,
    commentsLoading,
    navigation,
  } = props
  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)

  const [loading, setLoading] = useState(false)

  const onCommentPress = async () => {
    console.log('comment')
  }

  const onComment = async text => {
    setLoading(true)
    await onCommentSend(text)
    setLoading(false)
  }

  const onTextFieldUserPress = userInfo => {
    navigation.navigate('MainProfile', {
      user: userInfo,
      stackKeyTitle: 'MainProfile',
      lastScreenTitle: 'MainProfile',
    })
  }

  const onTextFieldHashTagPress = hashtag => {
    navigation.push('FeedSearch', { hashtag })
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={styles.singlePostContainer}
        verticalOffset={34}>
        <ScrollView style={{ flex: 1 }}>
          <FeedItem
            item={feedItem}
            isLastItem={true}
            onUserItemPress={onFeedUserItemPress}
            onCommentPress={onCommentPress}
            onMediaPress={() => {}}
            onReaction={onReaction}
            onSharePost={onSharePost}
            onDeletePost={onDeletePost}
            onUserReport={onUserReport}
            user={user}
            onTextFieldHashTagPress={onTextFieldHashTagPress}
            onTextFieldUserPress={onTextFieldUserPress}
            playVideoOnLoad={true}
          />
          {commentsLoading ? (
            <RNActivityIndicator style={{ marginVertical: 7 }} size="small" />
          ) : (
            commentItems &&
            commentItems.map(comment => (
              <CommentItem item={comment} key={comment.id} />
            ))
          )}
        </ScrollView>
        {loading && <ActivityIndicator />}
        <CommentInput onCommentSend={onComment} />
        <MediaViewerModal
          mediaItems={feedItems}
          isModalOpen={isMediaViewerOpen}
          onClosed={onMediaClose}
          selectedMediaIndex={selectedMediaIndex}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
})
export default SinglePost
