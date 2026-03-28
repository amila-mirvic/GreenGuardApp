import React, { memo, useCallback, useMemo, useState } from 'react'
import { View, Text, TouchableOpacity, Image } from 'react-native'
import { useTheme, TouchableIcon } from '../../core/dopebase'
import { timeFormat } from '../../core/helpers/timeFormat'
import FeedMedia from './FeedMedia'
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

  const reactionIcons = ['like', 'love', 'laugh', 'angry', 'surprised', 'cry']

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

  const normalizedMedia = useMemo(() => {
    if (!Array.isArray(item?.postMedia) || item.postMedia.length === 0) {
      return []
    }

    return item.postMedia
      .map(mediaItem => {
        if (typeof mediaItem === 'string') {
          return {
            url: mediaItem,
            thumbnailURL: mediaItem,
            type: 'image/jpeg',
          }
        }

        return {
          ...mediaItem,
          url:
            mediaItem?.url ||
            mediaItem?.uri ||
            mediaItem?.downloadURL ||
            mediaItem?.downloadKey ||
            null,
          thumbnailURL:
            mediaItem?.thumbnailURL ||
            mediaItem?.url ||
            mediaItem?.uri ||
            mediaItem?.downloadURL ||
            null,
          type: mediaItem?.type || 'image/jpeg',
        }
      })
      .filter(Boolean)
  }, [item?.postMedia])

  const firstMedia = normalizedMedia[0]

  const onHideReactions = useCallback(() => {
    setOtherReactionsVisible(false)
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
    if (normalizedMedia.length > 0) {
      onMediaPress?.(normalizedMedia, 0)
    }
  }, [normalizedMedia, onMediaPress])

  const renderReactionIcon = (iconSource, reaction, index) => (
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
          onPress={() => {}}
          imageStyle={styles.moreIcon}
          containerStyle={[
            styles.moreIconContainer,
            { marginTop: 10, marginRight: 10 },
          ]}
          iconSource={theme.icons.more}
        />
      </View>

      {!!item?.postText && <Text style={styles.body}>{item.postText}</Text>}

      {!!firstMedia?.url && (
        <View style={styles.bodyImageContainer}>
          <FeedMedia
            media={firstMedia}
            index={0}
            item={{
              ...item,
              postMedia: normalizedMedia,
            }}
            onImagePress={handleMediaPress}
            postMediaIndex={0}
            inViewPort={true}
            willBlur={false}
            showVideo={true}
            playVideoOnLoad={false}
          />
        </View>
      )}

      {otherReactionsVisible && (
        <View style={styles.reactionContainer}>
          {reactionIcons.map((icon, index) =>
            renderReactionIcon(theme.icons[icon], icon, index),
          )}
        </View>
      )}

      <View style={styles.footerContainer}>
        <View style={styles.reactionIconsContainer}>
          <TouchableIcon
            containerStyle={styles.footerIconContainer}
            iconSource={item?.myReaction ? theme.icons.like : theme.icons.thumbsupUnfilled}
            imageStyle={item?.myReaction ? styles.inlineActionIcon : styles.inlineActionIconDefault}
            renderTitle={true}
            title={item?.reactionsCount > 0 ? item.reactionsCount : ' '}
            onPress={handleLikePress}
            onLongPress={() => setOtherReactionsVisible(!otherReactionsVisible)}
          />
        </View>

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