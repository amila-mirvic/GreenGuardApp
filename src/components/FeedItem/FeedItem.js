import React, { memo, useCallback, useState } from 'react'
import { View, Text, TouchableOpacity, Image } from 'react-native'
import { useTheme, TouchableIcon } from '../../core/dopebase'
import { timeFormat } from '../../core/helpers/timeFormat'
import dynamicStyles from './styles'

const FeedItem = memo(props => {
  const {
    item,
    onUserItemPress,
    onReaction,
    didPressComment,
    onMediaPress,
  } = props

  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)

  const [otherReactionsVisible, setOtherReactionsVisible] = useState(false)

  const reactionIcons = ['like', 'love', 'laugh', 'surprised', 'sad', 'angry']

  const onHideReactions = useCallback(() => {
    setOtherReactionsVisible(false)
  }, [])

  const onMorePress = useCallback(() => {
    // ostavljeno prazno da ne ruši build
  }, [])

  const handleAuthorPress = useCallback(() => {
    if (onUserItemPress && item?.author) {
      onUserItemPress(item.author)
    }
  }, [onUserItemPress, item])

  const renderTouchableReactionIcon = (iconSource, reaction, index) => (
    <TouchableIcon
      key={`${reaction}-${index}`}
      iconSource={iconSource}
      imageStyle={styles.reactionIcon}
      containerStyle={styles.reactionIconContainer}
      onPress={() => {
        onHideReactions()
        onReaction(reaction, item)
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
          imageStyle={styles.inlineActionIconSelected}
          renderTitle={true}
          title={item?.reactionsCount < 1 ? ' ' : item?.reactionsCount}
          onPress={() => onReaction(item.myReaction, item)}
        />
      )
    }

    return (
      <TouchableIcon
        containerStyle={styles.footerIconContainer}
        iconSource={theme.icons.likeUnfilled}
        imageStyle={styles.inlineActionIconDefault}
        renderTitle={true}
        title={item?.reactionsCount < 1 ? ' ' : item?.reactionsCount}
        onPress={() => setOtherReactionsVisible(!otherReactionsVisible)}
      />
    )
  }

  const renderPostText = currentItem => {
    if (!currentItem?.postText) {
      return null
    }

    return <Text style={styles.description}>{currentItem.postText}</Text>
  }

  const renderMedia = currentItem => {
    if (!currentItem?.postMedia || currentItem.postMedia.length === 0) {
      return null
    }

    const media = currentItem.postMedia
    const firstMedia = media[0]
    const mediaURL = firstMedia?.url || firstMedia

    if (!mediaURL) {
      return null
    }

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => onMediaPress?.(media, 0)}
      >
        <Image style={styles.postImage} source={{ uri: mediaURL }} />
      </TouchableOpacity>
    )
  }

  const authorName = item?.author
    ? `${item.author.firstName || ''}${
        item.author.lastName ? ' ' + item.author.lastName : ''
      }`.trim()
    : ''

  const authorProfilePicture =
    item?.author?.profilePictureURL ||
    item?.author?.profilePicture ||
    item?.author?.photoURL ||
    item?.author?.avatar

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
          style={styles.userImageContainer}
        >
          <Image
            source={
              authorProfilePicture
                ? { uri: authorProfilePicture }
                : theme.icons.userAvatar
            }
            style={styles.userImage}
          />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          {!!authorName && (
            <View style={styles.verifiedContainer}>
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
          containerStyle={styles.moreIconContainer}
          iconSource={theme.icons.more}
        />
      </View>

      {renderPostText(item)}
      {renderMedia(item)}

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
          title={item?.commentCount < 1 ? ' ' : item?.commentCount}
          onPress={didPressComment}
        />
      </View>
    </TouchableOpacity>
  )
})

export default FeedItem