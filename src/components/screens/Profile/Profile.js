import React, { memo, useCallback } from 'react'
import { View, FlatList, Text } from 'react-native'
import { useActionSheet } from '@expo/react-native-action-sheet'
import * as ImagePicker from 'expo-image-picker'
import {
  useTheme,
  useTranslations,
  EmptyStateView,
  MediaViewerModal,
  StoryItem,
  ActivityIndicator,
} from '../../../core/dopebase'
import FeedItem from '../../FeedItem/FeedItem'
import ProfileButton from './ProfileButton'
import dynamicStyles from './styles'
import FriendCard from './FriendCard'
import { useUserReportingMutations } from '../../../core/user-reporting'
import { useCurrentUser } from '../../../core/onboarding'

const Profile = memo(props => {
  const { localized } = useTranslations()
  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)

  const {
    onMainButtonPress,
    recentUserFeeds,
    user,
    mainButtonTitle,
    isMediaViewerOpen,
    feedItems,
    onMediaClose,
    selectedMediaIndex,
    removePhoto,
    startUpload,
    handleOnEndReached,
    onFeedUserItemPress,
    isFetching,
    isOtherUser,
    onEmptyStatePress,
    onSubButtonTitlePress,
    subButtonTitle,
    onCommentPress,
    friends,
    onMediaPress,
    onReaction,
    onDeletePost,
    onSharePost,
    loggedInUser,
    willBlur,
    onFriendItemPress,
    navigation,
    pullToRefreshConfig,
  } = props

  const { refreshing, onRefresh } = pullToRefreshConfig

  const { showActionSheetWithOptions } = useActionSheet()

  const currentUser = useCurrentUser()
  const { markAbuse } = useUserReportingMutations()

  const onProfilePicturePress = () => {
    if (isOtherUser) {
      return
    }
    showActionSheetWithOptions(
      {
        title: localized('Profile Picture'),
        options: [
          localized('Change Photo'),
          localized('Remove'),
          localized('Cancel'),
        ],
        cancelButtonIndex: 2,
        destructiveButtonIndex: 1,
      },
      onUpdatePhotoDialogDone,
    )
  }

  const onUpdatePhotoDialogDone = index => {
    if (index === 0) {
      showActionSheetWithOptions(
        {
          title: localized('Select Photo'),
          options: [
            localized('Camera'),
            localized('Library'),
            localized('Cancel'),
          ],
          cancelButtonIndex: 2,
        },
        onPhotoUploadDialogDone,
      )
    }

    if (index === 1) {
      removePhoto()
    }
  }

  const onPhotoUploadDialogDone = index => {
    if (index === 0) {
      onLaunchCamera()
    }

    if (index === 1) {
      onOpenPhotos()
    }
  }

  const onUserReport = useCallback(
    async (item, type) => {
      markAbuse(currentUser.id, item.authorID, type)
      props.navigation.goBack()
    },
    [currentUser.id, markAbuse],
  )

  const onLaunchCamera = () => {
    ImagePicker.launchCameraAsync({
      allowsEditing: false,
      allowsMultipleSelection: false,
    }).then(result => {
      if (result.canceled !== true) {
        startUpload(result.assets[0])
      }
    })
  }

  const onOpenPhotos = () => {
    ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      allowsMultipleSelection: false,
    }).then(result => {
      if (result.canceled !== true) {
        startUpload(result.assets[0])
      }
    })
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

  const renderItem = ({ item, index }) => {
    let shouldUpdate = false
    if (item.shouldUpdate) {
      shouldUpdate = item.shouldUpdate
    }
    return (
      <FeedItem
        item={item}
        isLastItem={true}
        index={index}
        key={index + 'feeditem'}
        onUserItemPress={onFeedUserItemPress}
        onCommentPress={onCommentPress}
        onMediaPress={() => {}}
        onReaction={onReaction}
        onSharePost={onSharePost}
        onDeletePost={onDeletePost}
        user={loggedInUser}
        willBlur={willBlur}
        onUserReport={onUserReport}
        onTextFieldHashTagPress={onTextFieldHashTagPress}
        onTextFieldUserPress={onTextFieldUserPress}
      />
    )
  }

  const renderListFooter = () => {
    if (isFetching) {
      return <ActivityIndicator style={{ marginVertical: 7 }} size="small" />
    }
    return null
  }

  const renderListHeader = () => {
    return (
      <View style={styles.subContainer}>
        <StoryItem
          item={user}
          imageStyle={styles.userImage}
          imageContainerStyle={styles.userImageContainer}
          containerStyle={styles.userImageMainContainer}
          activeOpacity={1}
          title={true}
          onPress={onProfilePicturePress}
          textStyle={styles.userName}
          displayVerifiedBadge={true}
        />
        {mainButtonTitle && (
          <ProfileButton title={mainButtonTitle} onPress={onMainButtonPress} />
        )}
        {friends && friends.length > 0 && (
          <Text style={styles.friendsTitle}>{'Friends'}</Text>
        )}
        {friends && friends.length > 0 && (
          <View style={styles.friendsContainer}>
            {friends.length > 0 &&
              friends.map(item => (
                <FriendCard
                  onPress={() => onFriendItemPress(item)}
                  key={item.id}
                  item={item}
                />
              ))}
          </View>
        )}
        {subButtonTitle && (
          <ProfileButton
            title={subButtonTitle}
            onPress={onSubButtonTitlePress}
            containerStyle={[
              {
                marginVertical: 22,
              },
              styles.subButtonColor,
            ]}
            titleStyle={styles.titleStyleColor}
          />
        )}
      </View>
    )
  }

  const renderEmptyComponent = () => {
    var emptyStateConfig = {
      title: localized('No Posts'),
      description: localized(
        'There are currently no posts on this profile. All the posts will show up here.',
      ),
    }
    if (!isOtherUser) {
      emptyStateConfig = {
        ...emptyStateConfig,
        callToAction: localized('Add Your First Post'),
        onPress: onEmptyStatePress,
      }
    }
    return (
      <EmptyStateView
        emptyStateConfig={emptyStateConfig}
        style={{
          marginTop: 20,
          marginBottom: 10,
          paddingTop: 20,
          paddingBottom: 20,
        }}
      />
    )
  }
  return (
    <View style={styles.container}>
      {recentUserFeeds && (
        <FlatList
          scrollEventThrottle={16}
          data={recentUserFeeds ?? []}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          onEndReachedThreshold={0.5}
          horizontal={false}
          onEndReached={handleOnEndReached}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListHeaderComponent={renderListHeader}
          ListFooterComponent={renderListFooter}
          ListEmptyComponent={renderEmptyComponent}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
        />
      )}
      {recentUserFeeds == null && <ActivityIndicator />}
      <MediaViewerModal
        mediaItems={feedItems}
        isModalOpen={isMediaViewerOpen}
        onClosed={onMediaClose}
        selectedMediaIndex={selectedMediaIndex}
      />
    </View>
  )
})

export default Profile
