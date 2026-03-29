import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useMemo,
  memo,
} from 'react'
import { useDispatch } from 'react-redux'
import { View, Text, Dimensions, Platform } from 'react-native'
import {
  useTheme,
  useTranslations,
  Alert,
  IconButton,
  useActionSheet,
} from '../../dopebase'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import { useCurrentUser } from '../../onboarding'
import IMChat from '../IMChat/IMChat'
import {
  useChatMessages,
  useChatChannels,
  useChatSingleChannel,
} from '../../chat/api'
import { storageAPI } from '../../media'
import { useUserReportingMutations } from '../../user-reporting'
import { formatMessage } from '../helpers/utils'

const IMChatScreen = memo(props => {
  const { localized } = useTranslations()
  const { theme, appearance } = useTheme()
  const currentUser = useCurrentUser()
  const dispatch = useDispatch()

  const { navigation, route } = props
  const openedFromPushNotification = route.params.openedFromPushNotification
  const isChatUserItemPress = route.params.isChatUserItemPress

  const {
    messages,
    subscribeToMessages,
    loadMoreMessages,
    sendMessage: sendMessageAPI,
    optimisticSetMessage,
    deleteMessage,
    addReaction,
    getMessageObject,
  } = useChatMessages()

  const [channel, setChannel] = useState(null)
  const [loading, setLoading] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [downloadObject, setDownloadObject] = useState(null)
  const [isMediaViewerOpen, setIsMediaViewerOpen] = useState(false)
  const [isRenameDialogVisible, setIsRenameDialogVisible] = useState(false)
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(-1)
  const [inReplyToItem, setInReplyToItem] = useState(null)

  const richTextInputRef = useRef()

  const {
    createChannel,
    markChannelMessageAsRead,
    updateGroup,
    leaveGroup,
    deleteGroup,
  } = useChatChannels()
  const { remoteChannel, subscribeToSingleChannel } = useChatSingleChannel(
    route.params.channel,
  )

  const activeChannelID = useMemo(() => {
    return (
      remoteChannel?.channelID ||
      remoteChannel?.id ||
      channel?.channelID ||
      channel?.id ||
      route?.params?.channel?.channelID ||
      route?.params?.channel?.id ||
      null
    )
  }, [channel, remoteChannel, route?.params?.channel])

  const { showActionSheetWithOptions } = useActionSheet()

  const { markAbuse } = useUserReportingMutations()
  const subscribeMessagesRef = useRef(null)

  const photoUploadActionSheet = useMemo(() => {
    return {
      title: localized('Photo Upload'),
      options: [
        localized('Launch Camera'),
        localized('Open Photo Gallery'),
        localized('Cancel'),
      ],
      cancelButtonIndex: 2,
    }
  }, [])

  const groupOptionsActionSheet = useMemo(() => {
    return {
      title: localized('Group Settings'),
      options: [
        localized('View Members'),
        localized('Rename Group'),
        localized('Leave Group'),
      ],
    }
  }, [])

  const groupSettingsActionSheet = useMemo(() => {
    return {
      title: localized('Group Settings'),
      options: [...groupOptionsActionSheet.options, localized('Cancel')],
      cancelButtonIndex: 3,
    }
  }, [])

  const adminGroupSettingsActionSheet = useMemo(() => {
    return {
      title: localized('Group Settings'),
      options: [
        ...groupOptionsActionSheet.options,
        localized('Delete Group'),
        localized('Cancel'),
      ],
      cancelButtonIndex: 4,
      destructiveButtonIndex: 3,
    }
  }, [])

  const privateSettingsActionSheet = useMemo(() => {
    return {
      title: localized('Actions'),
      options: [
        localized('Block user'),
        localized('Report user'),
        localized('Cancel'),
      ],
      cancelButtonIndex: 2,
    }
  }, [])

  useLayoutEffect(() => {
    if (!openedFromPushNotification) {
      configureNavigation(
        channelWithHydratedOtherParticipants(route.params.channel),
      )
    } else {
      navigation.setOptions({ headerTitle: '' })
    }
  }, [navigation, route.params.channel])

  useEffect(() => {
    configureNavigation(remoteChannel || channel)
  }, [channel, remoteChannel])

  useEffect(() => {
    if (selectedMediaIndex !== -1) {
      setIsMediaViewerOpen(true)
    } else {
      setIsMediaViewerOpen(false)
    }
  }, [selectedMediaIndex])

  useEffect(() => {
    const hydratedChannel = channelWithHydratedOtherParticipants(
      route.params.channel,
    )
    if (!hydratedChannel) {
      return
    }

    const channelID = hydratedChannel?.channelID || hydratedChannel?.id

    setChannel(hydratedChannel)
    subscribeMessagesRef.current = subscribeToMessages(channelID)
    const unsubscribe = subscribeToSingleChannel(channelID)

    return () => {
      subscribeMessagesRef.current && subscribeMessagesRef.current()
      unsubscribe && unsubscribe()
    }
  }, [currentUser?.id])

  useEffect(() => {
    if (downloadObject !== null) {
      onSendInput()
    }
  }, [downloadObject])

  const onListEndReached = useCallback(() => {
    if (!activeChannelID) {
      return
    }

    loadMoreMessages(activeChannelID)
  }, [activeChannelID, loadMoreMessages])

  const configureNavigation = channel => {
    if (!channel) {
      return
    }

    var title = channel?.name
    var isGroupChat = channel?.participants?.length > 2
    if (!title && channel?.participants?.length > 1) {
      const otherUser = channel.participants.find(
        participant => participant.id !== currentUser.id,
      )
      title =
        otherUser?.fullName ||
        (otherUser?.firstName ?? '') + ' ' + (otherUser?.lastName ?? '')
    }

    navigation.setOptions({
      headerTitle: title || route.params.title || localized('Chat'),
      headerStyle: {
        backgroundColor: theme.colors[appearance].primaryBackground,
      },
      headerBackTitleVisible: false,
      headerTitleStyle:
        isGroupChat && Platform.OS !== 'web'
          ? {
              width: Dimensions.get('window').width - 110,
            }
          : null,
      headerTintColor: theme.colors[appearance].primaryText,
      headerRight: () => (
        <View style={{ flexDirection: 'row' }}>
          <IconButton
            source={require('../assets/settings-icon.png')}
            tintColor={theme.colors[appearance].primaryForeground}
            onPress={onSettingsPress}
            marginRight={15}
            width={20}
            height={20}
          />
        </View>
      ),
    })
  }

  useEffect(() => {
    if (!remoteChannel) {
      return
    }
    console.log(`Remote channel changed`)
    const hydratedChannel = channelWithHydratedOtherParticipants(remoteChannel)
    setChannel(hydratedChannel)
    markThreadItemAsReadIfNeeded(hydratedChannel)

    if (openedFromPushNotification) {
      configureNavigation(hydratedChannel)
    }
  }, [remoteChannel])

  const channelWithHydratedOtherParticipants = channel => {
    if (!channel) {
      return channel
    }

    const allParticipants = Array.isArray(channel?.participants)
      ? channel.participants
          .map(participant => {
            if (!participant) {
              return null
            }
            const participantID = participant?.id || participant?.userID
            if (!participantID) {
              return null
            }
            return participant?.id
              ? participant
              : { ...participant, id: participantID }
          })
          .filter(Boolean)
      : []

    const otherParticipants = allParticipants.filter(
      participant => participant && participant.id !== currentUser.id,
    )

    return {
      ...channel,
      id: channel?.id || channel?.channelID,
      channelID: channel?.channelID || channel?.id,
      participants: allParticipants,
      otherParticipants,
    }
  }

  const onGroupSettingsActionDone = useCallback(
    (index, passedChannel) => {
      if (index === 0) {
        onViewMembers(passedChannel)
      } else if (index === 1) {
        setIsRenameDialogVisible(true)
      } else if (index === 2) {
        onLeave(passedChannel)
      }
    },
    [setIsRenameDialogVisible],
  )

  const onAdminGroupSettingsActionDone = useCallback(
    (index, passedChannel) => {
      if (index === 0) {
        onViewMembers(passedChannel)
      } else if (index === 1) {
        setIsRenameDialogVisible(true)
      } else if (index === 2) {
        onLeave(passedChannel)
      } else if (index === 3) {
        onDeleteGroup(passedChannel)
      }
    },
    [setIsRenameDialogVisible],
  )

  const onPrivateSettingsActionDone = useCallback(
    (index, passedChannel) => {
      if (index == 2) {
        return
      }
      var message, actionCallback
      if (index == 0) {
        actionCallback = onUserBlockPress
        message = localized(
          "Are you sure you want to block this user? You won't see their messages again.",
        )
      } else if (index == 1) {
        actionCallback = onUserReportPress
        message = localized(
          "Are you sure you want to report this user? You won't see their messages again.",
        )
      }
      Alert.alert(localized('Are you sure?'), message, [
        {
          text: localized('Yes'),
          onPress: () => actionCallback(passedChannel),
        },
        {
          text: localized('Cancel'),
          style: 'cancel',
        },
      ])
    },
    [localized],
  )

  const onSettingsPress = useCallback(() => {
    if (channel?.admins && channel?.admins?.includes(currentUser?.id)) {
      showActionSheetWithOptions(
        {
          title: adminGroupSettingsActionSheet.title,
          options: adminGroupSettingsActionSheet.options,
          cancelButtonIndex: adminGroupSettingsActionSheet.cancelButtonIndex,
          destructiveButtonIndex:
            adminGroupSettingsActionSheet.destructiveButtonIndex,
        },
        index => onAdminGroupSettingsActionDone(index, remoteChannel),
      )
    } else if (channel?.admins) {
      showActionSheetWithOptions(
        {
          title: groupSettingsActionSheet.title,
          options: groupSettingsActionSheet.options,
          cancelButtonIndex: groupSettingsActionSheet.cancelButtonIndex,
        },
        index => onGroupSettingsActionDone(index, remoteChannel),
      )
    } else {
      showActionSheetWithOptions(
        {
          title: privateSettingsActionSheet.title,
          options: privateSettingsActionSheet.options,
          cancelButtonIndex: privateSettingsActionSheet.cancelButtonIndex,
        },
        index => onPrivateSettingsActionDone(index, remoteChannel),
      )
    }
  }, [
    channel?.admins,
    currentUser?.id,
    onGroupSettingsActionDone,
    onAdminGroupSettingsActionDone,
    onPrivateSettingsActionDone,
  ])

  const onViewMembers = useCallback(
    passedChannel => {
      navigation.navigate('ViewGroupMembers', {
        channel: passedChannel,
      })
    },
    [navigation, remoteChannel],
  )

  const onChangeName = useCallback(
    async text => {
      const channelID = channel?.channelID || channel?.id
      setIsRenameDialogVisible(false)
      const data = {
        ...channel,
        name: text,
        content: `${
          currentUser?.firstName ?? 'Someone'
        } has renamed the group.`,
      }
      await updateGroup(channelID, currentUser.id, data)
    },
    [channel, currentUser, updateGroup],
  )

  const onLeave = useCallback(
    async passedChannel => {
      const channelID = passedChannel?.channelID || passedChannel?.id
      await leaveGroup(
        channelID,
        currentUser.id,
        `${currentUser.firstName} left this group.`,
      )
      navigation.goBack()
    },
    [currentUser, leaveGroup, navigation],
  )

  const onDeleteGroup = useCallback(
    async passedChannel => {
      const channelID = passedChannel?.channelID || passedChannel?.id
      await deleteGroup(channelID)
      navigation.goBack()
    },
    [deleteGroup, navigation],
  )

  const markThreadItemAsReadIfNeeded = channel => {
    const {
      id,
      channelID,
      lastThreadMessageId,
      readUserIDs,
      lastMessage,
    } = channel || {}
    const userID = currentUser?.id

    const newReadUserIDs = [...(readUserIDs || []), userID]

    if (!readUserIDs?.includes(userID) && lastMessage && userID) {
      markChannelMessageAsRead(
        id || channelID,
        userID,
        lastThreadMessageId,
        newReadUserIDs,
      )
    }
  }

  const onChangeTextInput = useCallback(
    text => {
      setInputValue(text)
    },
    [setInputValue],
  )

  const createOne2OneChannel = async () => {
    const response = await createChannel(
      currentUser,
      channelWithHydratedOtherParticipants(channel)?.otherParticipants,
    )

    if (response?.id || response?.channelID) {
      const createdChannelID = response?.channelID || response?.id
      const hydratedResponse = channelWithHydratedOtherParticipants(response)

      setChannel(hydratedResponse)
      subscribeMessagesRef.current && subscribeMessagesRef.current()
      subscribeMessagesRef.current = subscribeToMessages(createdChannelID)
      subscribeToSingleChannel(createdChannelID)

      return hydratedResponse
    }

    return null
  }

  const onSendInput = async () => {
    if (!inputValue && !downloadObject) {
      console.log('No message to be sent')
      return
    }

    let tempInputValue = inputValue
    if (!tempInputValue) {
      tempInputValue = formatMessage(downloadObject, localized)
    }

    const newMessage = optimisticSetMessage(
      currentUser,
      tempInputValue,
      downloadObject,
      inReplyToItem,
    )

    richTextInputRef.current?.clear()
    setInputValue('')
    setInReplyToItem(null)

    const hasRemoteChannel = Boolean(
      (remoteChannel?.id || remoteChannel?.channelID) &&
        (remoteChannel?.creatorID ||
          remoteChannel?.lastMessageDate ||
          (Array.isArray(remoteChannel?.admins) && remoteChannel.admins.length > 0)),
    )
    const isGroupChannel = Array.isArray(channel?.admins) && channel.admins.length > 0

    if (hasRemoteChannel || isGroupChannel) {
      await sendMessage(newMessage, tempInputValue, remoteChannel || channel)
      return
    }

    const newChannel = await createOne2OneChannel()
    if (newChannel) {
      await sendMessage(newMessage, tempInputValue, newChannel)
      return
    }

    setInputValue(tempInputValue)
    setInReplyToItem(newMessage.inReplyToItem)
    alert(localized('The message could not be sent. Please try again.'))
    setLoading(false)
  }

  const sendMessage = async (
    newMessage,
    tempInputValue,
    newChannel = channel,
  ) => {
    const response = await sendMessageAPI(newMessage, newChannel)
    if (response?.error) {
      alert(response.error)
      setInputValue(tempInputValue)
      setInReplyToItem(newMessage.inReplyToItem)
    } else {
      setDownloadObject(null)
    }
  }

  const onPhotoUploadDialogDone = useCallback(
    index => {
      if (index === 0) {
        onLaunchCamera()
      }

      if (index === 1) {
        onOpenPhotos()
      }
    },
    [],
  )

  const onAddMediaPress = useCallback(() => {
    showActionSheetWithOptions(
      {
        title: photoUploadActionSheet.title,
        options: photoUploadActionSheet.options,
        cancelButtonIndex: photoUploadActionSheet.cancelButtonIndex,
      },
      onPhotoUploadDialogDone,
    )
  }, [
    onPhotoUploadDialogDone,
    photoUploadActionSheet,
    showActionSheetWithOptions,
  ])

  const onAudioRecordSend = useCallback(
    audioRecord => {
      startUpload(audioRecord)
    },
    [],
  )

  const onLaunchCamera = useCallback(() => {
    ImagePicker.launchCameraAsync({})
      .then(result => {
        if (result.canceled !== true) {
          startUpload(result.assets[0])
        }
      })
      .catch(function (error) {
        console.log(error)
      })
  }, [])

  const onOpenPhotos = useCallback(() => {
    ImagePicker.launchImageLibraryAsync({
      selectionLimit: 1,
      mediaTypes: ImagePicker.MediaTypeOptions.All,
    })
      .then(result => {
        if (result.canceled !== true) {
          const image = result.assets[0]
          let pattern = /[a-zA-Z]+\/[A-Za-z0-9]+/i
          let match = pattern.exec(image.uri)
          startUpload({ type: (match ?? [])[0], ...image })
        }
      })
      .catch(function (error) {
        console.log('this the error', error)
      })
  }, [])

  const onAddDocPress = useCallback(async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync()
      if (res) {
        startUpload({
          ...res,
          type: 'file',
          fileID: +new Date() + res.name,
        })
      }
    } catch (e) {
      console.warn(e)
    }
  }, [])

  const startUpload = async uploadData => {
    setLoading(true)
    const { type } = uploadData
    if (!type) {
      console.log("Can't upload file without type")
      console.log(uploadData)
      alert(
        localized(
          `Can\'t upload file without a media type. Please report this error with the full error logs`,
        ),
      )
    }
    const { downloadURL, thumbnailURL } =
      await storageAPI.processAndUploadMediaFile(uploadData)
    if (downloadURL) {
      setDownloadObject({
        ...uploadData,
        source: downloadURL,
        uri: downloadURL,
        url: downloadURL,
        urlKey: '',
        type,
        thumbnailURL,
        thumbnailKey: '',
      })
    }
    setLoading(false)
  }

  const images = useMemo(() => {
    const list = []

    messages?.forEach(item => {
      if (item?.media) {
        const type = item.media?.type
        if (type?.startsWith('image')) {
          list.push({
            id: item.id,
            url: item.media.url,
          })
        }
      }
    })

    return list
  }, [messages])

  const mediaItemURLs = useMemo(() => {
    return images.flatMap(i => i.url)
  }, [images])

  const onChatMediaPress = useCallback(
    item => {
      const index = images?.findIndex(image => {
        return image.id === item.id
      })
      setSelectedMediaIndex(index)
    },
    [images, setSelectedMediaIndex],
  )

  const onMediaClose = useCallback(() => {
    setSelectedMediaIndex(-1)
  }, [setSelectedMediaIndex])

  const onUserBlockPress = useCallback(
    passedChannel => {
      reportAbuse(passedChannel, 'block')
    },
    [currentUser?.id],
  )

  const onUserReportPress = useCallback(
    passedChannel => {
      reportAbuse(passedChannel, 'report')
    },
    [currentUser?.id],
  )

  const reportAbuse = async (passedChannel, type) => {
    const myID = currentUser?.id
    const participants = Array.isArray(passedChannel?.participants)
      ? passedChannel.participants.filter(Boolean)
      : []
    const otherUser = participants.find(participant => participant?.id !== myID)
    const otherUserID = otherUser?.id

    if (!myID || !otherUserID) {
      return
    }

    setLoading(true)
    const response = await markAbuse(myID, otherUserID, type)
    setLoading(false)
    if (!response?.error) {
      navigation.goBack(null)
    }
  }

  const onReplyActionPress = useCallback(
    replyItem => {
      setInReplyToItem(replyItem)
    },
    [setInReplyToItem],
  )

  const onReplyingToDismiss = useCallback(() => {
    setInReplyToItem(null)
  }, [setInReplyToItem])

  const onDeleteThreadItem = useCallback(
    message => {
      deleteMessage(channel, message?.id)
    },
    [channel, deleteMessage],
  )

  const onChatUserItemPress = useCallback(
    async item => {
      if (isChatUserItemPress) {
        if (item.id === currentUser.id) {
          navigation.navigate('MainProfile', {
            stackKeyTitle: 'MainProfile',
            lastScreenTitle: 'Chat',
          })
        } else {
          navigation.navigate('MainProfile', {
            user: item,
            stackKeyTitle: 'MainProfile',
            lastScreenTitle: 'Chat',
          })
        }
      }
    },
    [navigation, currentUser?.id, isChatUserItemPress],
  )

  const onReaction = useCallback(
    async (reaction, message) => {
      await addReaction(message, currentUser, reaction, channel?.id || channel?.channelID)
    },
    [addReaction, channel, currentUser],
  )

  const onForwardMessageActionPress = useCallback(async (targetChannel, message) => {
    let tempInputValue = { content: message.content }
    if (!tempInputValue) {
      tempInputValue = formatMessage(downloadObject, localized)
    }
    let hydrateChannel = channelWithHydratedOtherParticipants(targetChannel)

    const newMessage = getMessageObject(
      currentUser,
      tempInputValue,
      message?.media,
      null,
      true,
    )

    if (hydrateChannel?.title || hydrateChannel?.channelID || hydrateChannel?.id) {
      const response = await sendMessageAPI(newMessage, hydrateChannel)
      if (response?.error) {
        alert(response.error)
        return false
      }
      setInReplyToItem(null)
      return true
    }

    const newChannel = await createChannel(
      currentUser,
      channelWithHydratedOtherParticipants(targetChannel)?.otherParticipants,
    )

    if (newChannel) {
      const response = await sendMessageAPI(newMessage, newChannel)
      if (response?.error) {
        alert(response.error)
        return false
      }
      setInReplyToItem(null)
      return true
    }
    setInReplyToItem(null)
    return false
  }, [channel, createChannel, currentUser, downloadObject, getMessageObject, localized, sendMessageAPI])

  return (
    <IMChat
      user={currentUser}
      messages={messages}
      inReplyToItem={inReplyToItem}
      loading={loading}
      richTextInputRef={richTextInputRef}
      onAddMediaPress={onAddMediaPress}
      onAddDocPress={onAddDocPress}
      onSendInput={onSendInput}
      onAudioRecordSend={onAudioRecordSend}
      onChangeTextInput={onChangeTextInput}
      onLaunchCamera={onLaunchCamera}
      onOpenPhotos={onOpenPhotos}
      mediaItemURLs={mediaItemURLs}
      isMediaViewerOpen={isMediaViewerOpen}
      selectedMediaIndex={selectedMediaIndex}
      onChatMediaPress={onChatMediaPress}
      onMediaClose={onMediaClose}
      isRenameDialogVisible={isRenameDialogVisible}
      showRenameDialog={setIsRenameDialogVisible}
      onViewMembers={onViewMembers}
      onChangeName={onChangeName}
      onLeave={onLeave}
      onDeleteGroup={onDeleteGroup}
      onUserBlockPress={onUserBlockPress}
      onUserReportPress={onUserReportPress}
      onReplyActionPress={onReplyActionPress}
      onReplyingToDismiss={onReplyingToDismiss}
      onDeleteThreadItem={onDeleteThreadItem}
      channelItem={channel}
      onListEndReached={onListEndReached}
      onChatUserItemPress={onChatUserItemPress}
      onReaction={onReaction}
      onForwardMessageActionPress={onForwardMessageActionPress}
    />
  )
})

export default IMChatScreen