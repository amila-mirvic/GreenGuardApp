import React, { useState, useRef, useEffect, memo, useCallback } from 'react'
import { Text, View, TouchableOpacity, Platform, Image } from 'react-native'
import Swiper from 'react-native-swiper'
import { useActionSheet } from '@expo/react-native-action-sheet'
import TruncateText from 'react-native-view-more-text'
import InView from 'react-native-component-inview'
import {
  useTheme,
  useTranslations,
  TouchableIcon,
  StoryItem,
} from '../../core/dopebase'
import FeedMedia from './FeedMedia'
import IMRichTextView from '../../core/mentions/IMRichTextView/IMRichTextView'
import dynamicStyles from './styles'
import { timeFormat } from '../../core/helpers/timeFormat'

const reactionIcons = ['like']

const FeedItem = memo(props => {
  const {
    item,
    isLastItem,
    onCommentPress,
    containerStyle,
    onUserItemPress,
    onMediaPress,
    onReaction,
    onSharePost,
    onDeletePost,
    onUserReport,
    user,
    willBlur,
    onTextFieldUserPress,
    onTextFieldHashTagPress,
    playVideoOnLoad,
  } = props

  if (!item) {
    alert('There is no feed item to display. You must fix this error.')
    return null
  }

  const { localized } = useTranslations()
  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)

  const defaultReactionIcon = 'thumbsupUnfilled'
  const [postMediaIndex, setPostMediaIndex] = useState(0)
  const [inViewPort, setInViewPort] = useState(false)
  const [otherReactionsVisible, setOtherReactionsVisible] = useState(false)

  const { showActionSheetWithOptions } = useActionSheet()

  const moreArray = useRef([localized('Share Post')])

  const selectedIconName = item?.myReaction
    ? item.myReaction
    : defaultReactionIcon
  const reactionCount = item.reactionsCount

  useEffect(() => {
    if (item.authorID === user.id) {
      moreArray.current.push(localized('Delete Post'))
    } else {
      moreArray.current.push(localized('Block User'))
      moreArray.current.push(localized('Report Post'))
    }

    moreArray.current.push(localized('Cancel'))
  }, [item?.authorID])

  const onReactionPress = async reaction => {
    if (reaction === null) {
      onReaction('like', item)
      setOtherReactionsVisible(false)
      return
    } 
    if (item.myReaction === reaction) {
      onReaction(null, item)
    } else {
      onReaction(reaction, item)
    }
    setOtherReactionsVisible(false)
  }

  const onReactionLongPress = useCallback(() => {
    setOtherReactionsVisible(!otherReactionsVisible)
  }, [setOtherReactionsVisible, otherReactionsVisible])

  const onMorePress = useCallback(() => {
    if (otherReactionsVisible) {
      setOtherReactionsVisible(false)
      return
    }
    showActionSheetWithOptions(
      {
        title: localized('More'),
        options: moreArray.current,
        cancelButtonIndex: moreArray.current.length - 1,
        destructiveButtonIndex: moreArray.current.indexOf('Delete Post'),
      },
      onMoreDialogDone,
    )
  }, [setOtherReactionsVisible, otherReactionsVisible])

  const didPressComment = useCallback(() => {
    if (otherReactionsVisible) {
      setOtherReactionsVisible(false)
      return
    }
    onCommentPress(item)
  }, [onCommentPress, setOtherReactionsVisible, otherReactionsVisible])

  const onMoreDialogDone = useCallback(
    index => {
      if (index === moreArray.current.indexOf(localized('Share Post'))) {
        onSharePost(item)
      }

      if (
        index === moreArray.current.indexOf(localized('Report Post')) ||
        index === moreArray.current.indexOf(localized('Block User'))
      ) {
        onUserReport(item, moreArray.current[index])
      }

      if (index === moreArray.current.indexOf(localized('Delete Post'))) {
        onDeletePost(item)
      }
    },
    [onSharePost, onDeletePost, onUserReport, moreArray],
  )

  const onEnterView = useCallback(isVisible => {
    setInViewPort(isVisible)
  }, [])

  const inactiveDot = () => <View style={styles.inactiveDot} />

  const activeDot = () => <View style={styles.activeDot} />

  const renderTouchableIconIcon = (src, tappedIcon, index) => {
    return (
      <TouchableIcon
        key={index + 'icon'}
        containerStyle={styles.reactionIconContainer}
        iconSource={src}
        imageStyle={styles.reactionIcon}
        onPress={() => onReactionPress(tappedIcon)}
      />
    )
  }

  const renderViewMore = onPress => {
    return (
      <Text onPress={onPress} style={styles.moreText}>
        {localized('more')}
      </Text>
    )
  }

  const renderViewLess = onPress => {
    return (
      <Text onPress={onPress} style={styles.moreText}>
        {localized('less')}
      </Text>
    )
  }

  const renderPostText = item => {
    if (item.postText) {
      return (
        <TruncateText
          numberOfLines={2}
          renderViewMore={renderViewMore}
          renderViewLess={renderViewLess}
          textStyle={styles.body}>
          <IMRichTextView
            defaultTextStyle={styles.body}
            onUserPress={onTextFieldUserPress}
            onHashTagPress={onTextFieldHashTagPress}>
            {item.postText || ' '}
          </IMRichTextView>
        </TruncateText>
      )
    }
    return null
  }

  const renderMediaContent = () => {
    return (
      <Swiper
        removeClippedSubviews={false}
        containerStyle={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          height: '100%',
        }}
        dot={inactiveDot()}
        activeDot={activeDot()}
        paginationStyle={{
          bottom: 20,
        }}
        onIndexChanged={swiperIndex => setPostMediaIndex(swiperIndex)}
        loop={false}>
        {item.postMedia.map((media, index) => (
          <FeedMedia
            key={index + 'feedMedia'}
            inViewPort={inViewPort}
            index={index}
            postMediaIndex={postMediaIndex}
            media={media}
            item={item}
            isLastItem={isLastItem}
            onImagePress={onMediaPress}
            willBlur={willBlur}
            playVideoOnLoad={playVideoOnLoad}
          />
        ))}
      </Swiper>
    )
  }

  const renderReactionIcons = () => {
  // server count
  const likeArray = Array.isArray(item?.reactions?.like) ? item.reactions.like : []
  const count = likeArray.length

  // jesam li ja lajkovala? (radi i kad myReaction nije setovan)
  const isLiked =
    item.myReaction === 'like' ||
    likeArray.some(r => r === user.id || r?.id === user.id || r?.userID === user.id)

  return [
    <TouchableIcon
      key="like-single"
      containerStyle={styles.footerIconContainer}
      iconSource={isLiked ? theme.icons.like : theme.icons[defaultReactionIcon]}
      imageStyle={isLiked ? styles.inlineActionIcon : styles.inlineActionIconDefault}
      renderTitle={true}
      title={count > 0 ? String(count) : ' '}
      onLongPress={onReactionLongPress}
      // ako je lajkovano -> šaljemo 'like' (unlike), ako nije -> null (like)
      onPress={() => onReactionPress(isLiked ? 'like' : null)}
    />,
  ]
}


  const getReactionCountByType = type => {
    if (!item.reactions || !item.reactions[type]) {
      return 0
    }
    return item.reactions[type].length
  }
  
  const getTotalReactionCount = () => {
    let total = 0
    reactionIcons.forEach(type => {
      total += getReactionCountByType(type)
    })
    return total
  }

  const renderMedia = item => {
    if (
      item &&
      item.postMedia &&
      item.postMedia.length &&
      item.postMedia.length > 0
    ) {
      return (
        <View style={styles.bodyImageContainer}>
          {Platform.OS === 'ios' && (
            <InView style={styles.fillContainer} onChange={onEnterView}>
              {renderMediaContent()}
            </InView>
          )}
          {Platform.OS !== 'ios' && renderMediaContent()}
        </View>
      )
    }
    return null
  }

  const inlineActionIconStyle =
    Platform.OS !== 'android'
      ? selectedIconName == defaultReactionIcon
        ? [styles.inlineActionIconDefault]
        : [styles.inlineActionIcon]
      : [styles.inlineActionIcon]

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={didPressComment}
      style={[styles.container, containerStyle]}>
      <View style={styles.headerContainer}>
        {item.author && (
          <StoryItem
            imageContainerStyle={styles.userImageContainer}
            item={item.author}
            onPress={onUserItemPress}
          />
        )}
        <View style={styles.titleContainer}>
          {item.author && (
            <View style={styles.verifiedContainer}>
              <Text style={styles.title}>
                {item.author.firstName +
                  (item.author.lastName ? ' ' + item.author.lastName : '')}
              </Text>
              {item.author.isVerified && (
                <Image
                  style={styles.verifiedIcon}
                  source={require('../../assets/icons/verified.png')}
                />
              )}
            </View>
          )}
          <View style={styles.mainSubtitleContainer}>
            <View style={styles.subtitleContainer}>
              <Text style={styles.subtitle}>{timeFormat(item.createdAt)}</Text>
            </View>
            <View style={[styles.subtitleContainer, { flex: 2 }]}>
              <Text style={styles.subtitle}>{item.location}</Text>
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
            renderTouchableIconIcon(theme.icons[icon], icon, index),
          )}
        </View>
      )}
      <View style={styles.footerContainer}>
      <View style={styles.reactionIconsContainer}>
    {renderReactionIcons()}
  </View>
        <TouchableIcon
          containerStyle={styles.footerIconContainer}
          iconSource={theme.icons.commentUnfilled}
          imageStyle={[styles.inlineActionIconDefault]}
          renderTitle={true}
          title={item.commentCount < 1 ? ' ' : item.commentCount}
          onPress={didPressComment}
        />
      </View>
    </TouchableOpacity>
  )
})

export default FeedItem
