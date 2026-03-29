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
import { View, Dimensions, Platform } from 'react-native'
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
  const openedFromPushNotification = route?.params?.openedFromPushNotification
  const isChatUserItemPress = route?.params?.isChatUserItemPress
  const routeChannel = route?.params?.channel

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
  const subscribeMessagesRef = useRef(null)

  const {
    createChannel,
    markChannelMessageAsRead,
    updateGroup,
    leaveGroup,
    deleteGroup,
  } = useChatChannels()

  const isRealChannelObject = useCallback(obj => {
    return Boolean(
      obj &&
        (obj?.channelID ||
          (Array.isArray(obj?.participants) && obj.participants.length > 0) ||
          obj?.creatorID ||
          obj?.lastMessageDate),
    )
  }, [])

  const realChannelArg = useMemo(() => {
    if (isRealChannelObject(routeChannel)) {
      return routeChannel
    }
    return null
  }, [isRealChannelObject, routeChannel])

  const { remoteChannel, subscribeToSingleChannel } = useChatSingleChannel(
    realChannelArg,
  )

  const { showActionSheetWithOptions } = useActionSheet()
  const { markAbuse } = useUserReportingMutations()

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
  }, [localized])

  const groupOptionsActionSheet = useMemo(() => {
    return {
      title: localized('Group Settings'),
      options: [
        localized('View Members'),
        localized('Rename Group'),
        localized('Leave Group'),
      ],
    }
  }, [localized])

  const groupSettingsActionSheet = useMemo(() => {
    return {
      title: localized('Group Settings'),
      options: [...groupOptionsActionSheet.options, localized('Cancel')],
      cancelButtonIndex: 3,
    }
  }, [groupOptionsActionSheet, localized])

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
  }, [groupOptionsActionSheet, localized])

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
  }, [localized])

  const buildDraftOneToOneChannel = useCallback(
    userItem => {
      if (!userItem || !currentUser?.id) {
        return null
      }

      const targetUser =
        userItem?.participants?.find(item => item?.id !== currentUser.id) || userItem

      return {
        id: null,
        channelID: null,
        participants: [currentUser, targetUser].filter(Boolean),
        otherParticipants: [targetUser].filter(Boolean),
        creatorID: currentUser.id,
        name: '',
        admins: null,
        lastMessageDate: null,
      }
    },
    [currentUser],
  )

  const channelWithHydratedOtherParticipants = useCallback(
    passedChannel => {
      if (!passedChannel) {
        return null
      }

      const allParticipants = passedChannel?.participants

      if (!Array.isArray(allParticipants) || allParticipants.length === 0) {
        return buildDraftOneToOneChannel(passedChannel)
      }

      const otherParticipants = allParticipants.filter(
        participant => participant && participant.id !== currentUser.id,
      )

      return { ...passedChannel, otherParticipants }
    },
    [buildDraftOneToOneChannel, currentUser.id],
  )

  const configureNavigation = useCallback(
    passedChannel => {
      if (!passedChannel) {
        return
      }

      let title = passedChannel?.name
      const isGroupChat = passedChannel?.participants?.length > 2

      if (!title) {
        const otherUser =
          passedChannel?.otherParticipants?.[0] ||
          passedChannel?.participants?.find(
            participant => participant.id !== currentUser.id,
          ) ||
          passedChannel

        title =
          otherUser?.fullName ||
          `${otherUser?.firstName ?? ''} ${otherUser?.lastName ?? ''}`.trim()
      }

      navigation.setOptions({
        headerTitle: title || route?.params?.title || localized('Chat'),
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
    },
    [appearance, currentUser.id, localized, navigation, route?.params?.title, theme.colors],
  )

  useLayoutEffect(() => {
    if (!openedFromPushNotification) {
      configureNavigation(channelWithHydratedOtherParticipants(routeChannel))
    } else {
      navigation.setOptions({ headerTitle: '' })
    }
  }, [channelWithHydratedOtherParticipants, configureNavigation, navigation, openedFromPushNotification, routeChannel])

  useEffect(() => {
    configureNavigation(remoteChannel || channel)
  }, [channel, configureNavigation, remoteChannel])

  useEffect(() => {
    setIsMediaViewerOpen(selectedMediaIndex !== -1)
  }, [selectedMediaIndex])

  useEffect(() => {
    const hydratedChannel = channelWithHydratedOtherParticipants(routeChannel)
    if (!hydratedChannel) {
      return
    }

    setChannel(hydratedChannel)

    // BITNO: subscribujemo samo ako je stvarni channel, ne user item
    const realChannelID =
      isRealChannelObject(hydratedChannel)
        ? hydratedChannel?.channelID || hydratedChannel?.id
        : null

    if (!realChannelID) {
      return
    }

    subscribeMessagesRef.current && subscribeMessagesRef.current()
    subscribeMessagesRef.current = subscribeToMessages(realChannelID)
    const unsubscribeSingle = subscribeToSingleChannel(realChannelID)

    return () => {
      subscribeMessagesRef.current && subscribeMessagesRef.current()
      unsubscribeSingle && unsubscribeSingle()
    }
  }, [
    channelWithHydratedOtherParticipants,
    currentUser?.id,
    isRealChannelObject,
    routeChannel,
    subscribeToMessages,
    subscribeToSingleChannel,
  ])

  useEffect(() => {
    if (!remoteChannel) {
      return
    }
    const hydratedChannel = channelWithHydratedOtherParticipants(remoteChannel)
    setChannel(hydratedChannel)
    markThreadItemAsReadIfNeeded(hydratedChannel)

    if (openedFromPushNotification) {
      configureNavigation(hydratedChannel)
    }
  }, [channelWithHydratedOtherParticipants, configureNavigation, openedFromPushNotification, remoteChannel])

  useEffect(() => {
    if (downloadObject !== null) {
      onSendInput()
    }
  }, [downloadObject])

  const normalizeInputToString = value => {
    if (typeof value === 'string') {
      return value.trim()
    }

    if (value && typeof value === 'object') {
      if (typeof value.content === 'string') {
        return value.content.trim()
      }
      if (typeof value.text === 'string') {
        return value.text.trim()
      }
      if (typeof value.displayText === 'string') {
        return value.displayText.trim()
      }
    }

    return ''
  }

  const onListEndReached = useCallback(() => {
    const channelID = channel?.id || channel?.channelID
    if (channelID) {
      loadMoreMessages(channelID)
    }
  }, [channel, loadMoreMessages])

  const onViewMembers = useCallback(
    passedChannel => {
      navigation.navigate('ViewGroupMembers', {
        channel: passedChannel,
      })
    },
    [navigation],
  )

  const showRenameDialog = useCallback(shouldShow => {
    setIsRenameDialogVisible(shouldShow)
  }, [])

  const onLeave = useCallback(
    async passedChannel => {
      const channelID = passedChannel?.channelID || passedChannel?.id
      if (!channelID) return
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
      if (!channelID) return
      await deleteGroup(channelID)
      navigation.goBack()
    },
    [deleteGroup, navigation],
  )

  const onGroupSettingsActionDone = useCallback(
    (index, passedChannel) => {
      if (index === 0) {
        onViewMembers(passedChannel)
      } else if (index === 1) {
        showRenameDialog(true)
      } else if (index === 2) {
        onLeave(passedChannel)
      }
    },
    [onLeave, onViewMembers, showRenameDialog],
  )

  const onAdminGroupSettingsActionDone = useCallback(
    (index, passedChannel) => {
      if (index === 0) {
        onViewMembers(passedChannel)
      } else if (index === 1) {
        showRenameDialog(true)
      } else if (index === 2) {
        onLeave(passedChannel)
      } else if (index === 3) {
        onDeleteGroup(passedChannel)
      }
    },
    [onDeleteGroup, onLeave, onViewMembers, showRenameDialog],
  )

  const reportAbuse = useCallback(
    async (passedChannel, type) => {
      try {
        setLoading(true)
        const myID = currentUser.id
        const otherUser = passedChannel?.participants?.find(
          participant => participant.id !== myID,
        )
        const otherUserID = otherUser?.id

        const response = await markAbuse(myID, otherUserID, type)
        setLoading(false)
        if (!response?.error) {
          navigation.goBack(null)
        }
      } catch (error) {
        setLoading(false)
        console.log('reportAbuse error:', error)
      }
    },
    [currentUser.id, markAbuse, navigation],
  )

  const onUserBlockPress = useCallback(
    passedChannel => {
      reportAbuse(passedChannel, 'block')
    },
    [reportAbuse],
  )

  const onUserReportPress = useCallback(
    passedChannel => {
      reportAbuse(passedChannel, 'report')
    },
    [reportAbuse],
  )

  const onPrivateSettingsActionDone = useCallback(
    (index, passedChannel) => {
      if (index === 2) {
        return
      }
      let message
      let actionCallback
      if (index === 0) {
        actionCallback = onUserBlockPress
        message = localized(
          "Are you sure you want to block this user? You won't see their messages again.",
        )
      } else if (index === 1) {
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
    [localized, onUserBlockPress, onUserReportPress],
  )

  const onSettingsPress = useCallback(() => {
    const targetChannel = remoteChannel || channel
    if (!targetChannel) return

    if (targetChannel?.admins && targetChannel?.admins?.includes(currentUser?.id)) {
      showActionSheetWithOptions(
        {
          title: adminGroupSettingsActionSheet.title,
          options: adminGroupSettingsActionSheet.options,
          cancelButtonIndex: adminGroupSettingsActionSheet.cancelButtonIndex,
          destructiveButtonIndex:
            adminGroupSettingsActionSheet.destructiveButtonIndex,
        },
        index => onAdminGroupSettingsActionDone(index, targetChannel),
      )
    } else if (targetChannel?.admins) {
      showActionSheetWithOptions(
        {
          title: groupSettingsActionSheet.title,
          options: groupSettingsActionSheet.options,
          cancelButtonIndex: groupSettingsActionSheet.cancelButtonIndex,
        },
        index => onGroupSettingsActionDone(index, targetChannel),
      )
    } else {
      showActionSheetWithOptions(
        {
          title: privateSettingsActionSheet.title,
          options: privateSettingsActionSheet.options,
          cancelButtonIndex: privateSettingsActionSheet.cancelButtonIndex,
        },
        index => onPrivateSettingsActionDone(index, targetChannel),
      )
    }
  }, [
    adminGroupSettingsActionSheet,
    channel,
    currentUser?.id,
    groupSettingsActionSheet,
    onAdminGroupSettingsActionDone,
    onGroupSettingsActionDone,
    onPrivateSettingsActionDone,
    privateSettingsActionSheet,
    remoteChannel,
    showActionSheetWithOptions,
  ])

  const onChangeName = useCallback(
    async newText => {
      const channelID = channel?.channelID || channel?.id
      if (!channelID) return
      setIsRenameDialogVisible(false)
      const data = {
        ...channel,
        name: newText,
        content: `${currentUser?.firstName ?? 'Someone'} has renamed the group.`,
      }
      await updateGroup(channelID, currentUser.id, data)
    },
    [channel, currentUser, updateGroup],
  )

  const markThreadItemAsReadIfNeeded = useCallback(
    passedChannel => {
      const {
        id,
        channelID,
        lastThreadMessageId,
        readUserIDs,
        lastMessage,
      } = passedChannel || {}

      const userID = currentUser?.id
      const resolvedChannelID = id || channelID
      const nextReadUserIDs = Array.isArray(readUserIDs)
        ? [...readUserIDs, userID].filter(Boolean)
        : [userID].filter(Boolean)

      if (
        resolvedChannelID &&
        userID &&
        lastMessage &&
        !readUserIDs?.includes?.(userID)
      ) {
        markChannelMessageAsRead(
          resolvedChannelID,
          userID,
          lastThreadMessageId,
          nextReadUserIDs,
        )
      }
    },
    [currentUser?.id, markChannelMessageAsRead],
  )

  const onChangeTextInput = useCallback(text => {
    setInputValue(text)
  }, [])

  const createOne2OneChannel = useCallback(async () => {
    const sourceChannel = channelWithHydratedOtherParticipants(channel || routeChannel)
    const response = await createChannel(
      currentUser,
      sourceChannel?.otherParticipants,
    )

    if (response) {
      const hydrated = channelWithHydratedOtherParticipants(response)
      const newChannelID = hydrated?.channelID || hydrated?.id

      setChannel(hydrated)

      if (newChannelID) {
        subscribeMessagesRef.current && subscribeMessagesRef.current()
        subscribeMessagesRef.current = subscribeToMessages(newChannelID)
      }

      return hydrated
    }

    return null
  }, [channel, channelWithHydratedOtherParticipants, createChannel, currentUser, routeChannel, subscribeToMessages])

  const sendPersistedMessage = useCallback(
    async (newMessage, tempInputValue, targetChannel = channel) => {
      const response = await sendMessageAPI(newMessage, targetChannel)
      if (response?.error) {
        Alert.alert(localized('Error'), localized('Message failed to send'))
        setInputValue(tempInputValue)
        setInReplyToItem(newMessage?.inReplyToItem || null)
        return false
      }

      setDownloadObject(null)
      return true
    },
    [channel, localized, sendMessageAPI],
  )

  const onSendInput = useCallback(async () => {
    if (!inputValue && !downloadObject) {
      return
    }

    let tempInputValue = normalizeInputToString(inputValue)
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

    const hasExistingConversation = Boolean(
      channel?.lastMessageDate || channel?.otherParticipants?.length > 1,
    )

    if (hasExistingConversation && (channel?.id || channel?.channelID)) {
      await sendPersistedMessage(newMessage, tempInputValue, channel)
      return
    }

    const newChannel = await createOne2OneChannel()
    if (newChannel) {
      await sendPersistedMessage(newMessage, tempInputValue, newChannel)
    } else {
      Alert.alert(localized('Error'), localized('Message failed to send'))
    }
  }, [
    channel,
    createOne2OneChannel,
    currentUser,
    downloadObject,
    inReplyToItem,
    inputValue,
    localized,
    optimisticSetMessage,
    sendPersistedMessage,
  ])

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
  }, [onPhotoUploadDialogDone, photoUploadActionSheet, showActionSheetWithOptions])

  const startUpload = useCallback(
    async uploadData => {
      try {
        setLoading(true)
        const { type } = uploadData
        if (!type) {
          Alert.alert(
            localized('Error'),
            localized(
              "Can't upload file without a media type. Please report this error with the full error logs",
            ),
          )
          setLoading(false)
          return
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
      } catch (error) {
        setLoading(false)
        console.log('startUpload error:', error)
      }
    },
    [localized],
  )

  const onAudioRecordSend = useCallback(
    audioRecord => {
      startUpload(audioRecord)
    },
    [startUpload],
  )

  const onLaunchCamera = useCallback(() => {
    ImagePicker.launchCameraAsync({})
      .then(result => {
        if (result.canceled !== true) {
          startUpload(result.assets[0])
        }
      })
      .catch(error => {
        console.log(error)
      })
  }, [startUpload])

  const onOpenPhotos = useCallback(() => {
    ImagePicker.launchImageLibraryAsync({
      selectionLimit: 1,
      mediaTypes: ImagePicker.MediaTypeOptions.All,
    })
      .then(result => {
        if (result.canceled !== true) {
          const image = result.assets[0]
          const pattern = /[a-zA-Z]+\/[A-Za-z0-9]+/i
          const match = pattern.exec(image.uri)
          startUpload({ type: (match ?? [])[0], ...image })
        }
      })
      .catch(error => {
        console.log('this the error', error)
      })
  }, [startUpload])

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
  }, [startUpload])

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
      const index = images?.findIndex(image => image.id === item.id)
      setSelectedMediaIndex(index)
    },
    [images],
  )

  const onMediaClose = useCallback(() => {
    setSelectedMediaIndex(-1)
  }, [])

  const onReplyActionPress = useCallback(replyItem => {
    setInReplyToItem(replyItem)
  }, [])

  const onReplyingToDismiss = useCallback(() => {
    setInReplyToItem(null)
  }, [])

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
      await addReaction(
        message,
        currentUser,
        reaction,
        channel?.id || channel?.channelID,
      )
    },
    [addReaction, channel, currentUser],
  )

  const onForwardMessageActionPress = useCallback(
    async (targetChannel, message) => {
      const tempInputValue = { content: message?.content || '' }
      const hydrateChannel = channelWithHydratedOtherParticipants(targetChannel)

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
          Alert.alert(localized('Error'), localized('Message failed to send'))
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
          Alert.alert(localized('Error'), localized('Message failed to send'))
          return false
        }
        setInReplyToItem(null)
        return true
      }

      setInReplyToItem(null)
      return false
    },
    [channelWithHydratedOtherParticipants, createChannel, currentUser, getMessageObject, localized, sendMessageAPI],
  )

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