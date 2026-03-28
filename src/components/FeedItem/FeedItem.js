import React, { memo, useCallback, useMemo, useState } from 'react'
import { View, Text, TouchableOpacity, Image } from 'react-native'
import { useTheme, TouchableIcon } from '../../core/dopebase'
import { timeFormat } from '../../core/helpers/timeFormat'
import dynamicStyles from './styles'

const FeedItem = memo(props => {
  const {
    item,
    onUserItemPress,
    onReaction,
    onCommentPress,
    onMediaPress,
  } = props

  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)

  const [otherReactionsVisible, setOtherReactionsVisible] = useState(false)

  const reactionIcons = ['like', 'love', 'laugh', 'surprised', 'sad', 'angry']

  const authorName = useMemo(() => {
    if (!item?.author) return ''
    return `${item.author.firstName || ''}${
      item.author.lastName ? ` ${item.author.lastName}` : ''
    }`.trim()
  }, [item?.author])

  const authorProfilePicture = useMemo(() => {
    return (
      item?.author?.profilePictureURL ||
      item?.author?.profilePicture ||
      item?.author?.photoURL ||
      item?.author?.avatar ||
      null
    )
  }, [item?.author])

  const mediaURL = useMemo(() => {
    if (!Array.isArray(item?.postMedia) || item.postMedia.length === 0) {
      return null
    }
    const firstMedia = item.postMedia[0]
    return firstMedia?.url || firstMedia?.uri || firstMedia || null
  }, [item?.postMedia])

  const onHideReactions = useCallback(() => {
    setOtherReactionsVisible(false)
  }, [])

  const onMorePress = useCallback(() => {
    // intentionally empty, samo da ne ruši build / UX
  }, [])

  const handleAuthorPress = useCallback(() => {
    if (onUserItemPress && item?.author) {
      onUserItemPress(item.author)
    }
  }, [onUserItemPress, item?.author])

  const handleLikePress = useCallback(() => {
    onReaction?.('like', item)
  }, [onReaction, item])

  const handleCommentPress = useCallback(() => {
    onCommentPress?.(item)
  }, [onCommentPress, item])

  const handleMediaPress = useCallback(() => {
    if (mediaURL) {
      onMediaPress?.(item.postMedia, 0)
    }
  }, [onMediaPress, item?.postMedia, mediaURL])

  const renderTouchableReactionIcon = (iconSource, reaction, index) => (
    <TouchableIcon
      key={`${reaction}-${index}`}
      iconSource={iconSource}
      imageStyle={styles.reactionIcon}
      containerStyle={styles.reactionIconContainer}
      onPress={() => {
        onHideReactions()
        onReaction?.(reaction, item)
      }}
    />
  )

  const renderReactionIcons = () => {
    if (item?.myReaction) {
      return (
        <TouchableIcon
          containerStyle={styles.footerIconContainer}
          iconSource={
            theme.icons[`${item.myReaction}Filled`] || theme.icons.likeFilled
          }
          imageStyle={styles.inlineActionIcon}
          renderTitle={true}
          title={item?.reactionsCount > 0 ? item.reactionsCount : ' '}
          onPress={handleLikePress}
          onLongPress={() => setOtherReactionsVisible(!otherReactionsVisible)}
        />
      )
    }

    return (
      <TouchableIcon
        containerStyle={styles.footerIconContainer}
        iconSource={theme.icons.likeUnfilled}
        imageStyle={styles.inlineActionIconDefault}
        renderTitle={true}
        title={item?.reactionsCount > 0 ? item.reactionsCount : ' '}
        onPress={handleLikePress}
        onLongPress={() => setOtherReactionsVisible(!otherReactionsVisible)}
      />
    )
  }

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onHideReactions}
      style={[styles.container, props.containerStyle]}
    >
      <View style={styles.headerContainer}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleAuthorPress}
          style={[
            styles.userImageContainer,
            {
              width: 52,
              height: 52,
              borderRadius: 26,
              marginHorizontal: 10,
              marginTop: 10,
              backgroundColor: '#ddd',
            },
          ]}
        >
          <Image
            source={
              authorProfilePicture
                ? { uri: authorProfilePicture }
                : theme.icons.userAvatar
            }
            style={{
              width: '100%',
              height: '100%',
              borderRadius: 26,
            }}
          />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          {!!authorName && (
            <View style={[styles.verifiedContainer, { marginTop: 10 }]}>
              <Text style={styles.title}>{authorName}</Text>
              {item?.author?.isVerified && (
                <Image
                  style={styles.verifiedIcon}
                  source={require('../../assets/icons/verified.png')}
                />
              )}
            </View>
          )}

          <View style={styles.mainSubtitleContainer}>
            <View style={styles.subtitleContainer}>
              <Text style={styles.subtitle}>{timeFormat(item?.createdAt)}</Text>
            </View>
          </View>
        </View>

        <TouchableIcon
          onPress={onMorePress}
          imageStyle={styles.moreIcon}
          containerStyle={[styles.moreIconContainer, { marginTop: 10, marginRight: 10 }]}
          iconSource={theme.icons.more}
        />
      </View>

      {!!item?.postText && (
        <Text style={styles.body}>{item.postText}</Text>
      )}

      {!!mediaURL && (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleMediaPress}
          style={styles.bodyImageContainer}
        >
          <Image
            style={styles.bodyImage}
            source={{ uri: mediaURL }}
            resizeMode="cover"
          />
        </TouchableOpacity>
      )}

      {otherReactionsVisible && (
        <View style={styles.reactionContainer}>
          {reactionIcons.map((icon, index) =>
            renderTouchableReactionIcon(theme.icons[icon], icon, index),
          )}
        </View>
      )}

      <View style={styles.footerContainer}>
        <View style={styles.reactionIconsContainer}>{renderReactionIcons()}</View>

        <TouchableIcon
          containerStyle={styles.footerIconContainer}
          iconSource={theme.icons.commentUnfilled}
          imageStyle={styles.inlineActionIconDefault}
          renderTitle={true}
          title={item?.commentCount > 0 ? item.commentCount : ' '}
          onPress={handleCommentPress}
        />
      </View>
    </TouchableOpacity>
  )
})

export default FeedItem