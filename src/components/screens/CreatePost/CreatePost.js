import React, { useState, useRef, useEffect, memo } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { useActionSheet } from '@expo/react-native-action-sheet'
import { Video } from 'expo-av'
import { Camera } from 'expo-camera/legacy'
import {
  useTheme,
  useTranslations,
  Alert,
  StoryItem,
  TouchableIcon,
} from '../../../core/dopebase'
import { extractSourceFromFile } from '../../../core/helpers/retrieveSource'
import { IMRichTextInput, IMMentionList, EU } from '../../../core/mentions'
import IMCameraModal from '../../../core/camera/IMCameraModal'
import dynamicStyles from './styles'
import { useConfig } from '../../../config'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const CreatePost = memo(props => {
  const { onPostDidChange, onSetMedia, user, inputRef, blurInput, friends } =
    props

  const { localized } = useTranslations()
  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)

  const config = useConfig()
  const insets = useSafeAreaInsets()

  const { showActionSheetWithOptions } = useActionSheet()

  const [media, setMedia] = useState([])
  const [mediaSources, setMediaSources] = useState([])
  const [isCameralContainer, setIsCameralContainer] = useState(true)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [keyword, setKeyword] = useState('')
  const [isTrackingStarted, setIsTrackingStarted] = useState(false)
  const [friendshipData, setFriendshipData] = useState([])
  const editorRef = useRef()

  const [keyboardOffset, setKeyboardOffset] = useState(0)

  const androidAddPhotoOptions = [
    localized('Import from Library'),
    localized('Take Photo'),
    localized('Record Video'),
    localized('Cancel'),
  ]

  const iosAddPhotoOptions = [
    localized('Import from Library'),
    localized('Open Camera'),
    localized('Cancel'),
  ]

  const addPhotoCancelButtonIndex = {
    ios: 2,
    android: 3,
  }

  const addPhotoOptions =
    Platform.OS === 'android' ? androidAddPhotoOptions : iosAddPhotoOptions

  useEffect(() => {
    if (!friends) {
      return
    }
    const formattedFriends = friends.map(friend => {
      const name = `${friend.firstName} ${friend.lastName}`
      const username = `${friend.firstName}.${friend.lastName}`
      const id = friend.id || friend.userID

      return { id, name, username, ...friend }
    })
    setFriendshipData(formattedFriends)
  }, [friends])

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'

    const onShow = e => setKeyboardOffset(e?.endCoordinates?.height || 0)
    const onHide = () => setKeyboardOffset(0)

    const subShow = Keyboard.addListener(showEvent, onShow)
    const subHide = Keyboard.addListener(hideEvent, onHide)

    return () => {
      subShow?.remove?.()
      subHide?.remove?.()
    }
  }, [])

  const onChangeText = ({ displayText, text }) => {
    const mentions = EU.findMentions(text)
    const post = {
      postText: text,
      mentions,
    }
    onPostDidChange(post)
  }

  const runIfCameraPermissionGranted = async callback => {
    if (Platform.OS == 'web') {
      return callback()
    }
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

  const onCameraIconPress = () => {
    runIfCameraPermissionGranted(() => {
      if (Platform.OS === 'ios') {
        setIsCameraOpen(true)
      } else {
        showActionSheetWithOptions(
          {
            title: localized('Add photo'),
            options: addPhotoOptions,
            cancelButtonIndex: addPhotoCancelButtonIndex[Platform.OS],
          },
          onPhotoUploadDialogDone,
        )
      }
    })
  }

  const onPhotoUploadDialogDoneIOS = index => {
    if (index == 0) {
      onOpenPhotos()
    }
    if (index == 1) {
      onLaunchCamera()
    }
  }

  const onPhotoUploadDialogDoneAndroid = index => {
    if (index == 0) {
      onOpenPhotos()
    }

    if (index == 1) {
      onLaunchCamera()
    }

    if (index == 2) {
      onLaunchVideoCamera()
    }
  }

  const onPhotoUploadDialogDone = index => {
    const onPhotoUploadDialogDoneSetter = {
      ios: () => onPhotoUploadDialogDoneIOS(index),
      android: () => onPhotoUploadDialogDoneAndroid(index),
      web: () => onPhotoUploadDialogDoneIOS(index),
    }

    onPhotoUploadDialogDoneSetter[Platform.OS]()
  }

  const onLaunchCamera = () => {
    ImagePicker.launchCameraAsync({
      allowsEditing: false,
    }).then(result => {
      if (result.canceled !== true) {
        handleMediaFile(result.assets[0])
      }
    })
  }

  const onLaunchVideoCamera = () => {
    ImagePicker.launchCameraAsync({
      allowsEditing: false,
      mediaType: ImagePicker.MediaTypeOptions.Videos,
    }).then(result => {
      if (result.canceled !== true) {
        handleMediaFile(result.assets[0])
      }
    })
  }

  const onOpenPhotos = () => {
    ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      allowsMultipleSelection: false,
    }).then(result => {
      if (result.canceled !== true) {
        handleMediaFile(result.assets[0])
      }
    })
  }

  const onRemovePhotoDialogDone = index => {
    if (index === 0) {
      removePhoto()
    } else {
      setSelectedIndex(null)
    }
  }

  const onMediaPress = async index => {
    await setSelectedIndex(index)
    showActionSheetWithOptions(
      {
        title: localized('Remove photo'),
        options: [localized('Remove'), localized('Cancel')],
        cancelButtonIndex: 1,
        destructiveButtonIndex: 0,
      },
      onRemovePhotoDialogDone,
    )
  }

  const onCameraClose = () => {
    setIsCameraOpen(false)
  }

  const onImagePost = item => {
    handleMediaFile(item)
  }

  const handleMediaFile = mediaFile => {
    setIsCameraOpen(false)

    let pattern = /[a-zA-Z]+\/[A-Za-z0-9]+/i
    let match = pattern.exec(mediaFile.uri)

    const newMediaFile = {
      type: (match ?? [])[0],
      ...mediaFile,
    }

    const { source, type, filename, uri } = extractSourceFromFile(newMediaFile)

    setMedia([...media, { source, type }])
    setMediaSources([...mediaSources, { filename, uri, type }])
    onSetMedia([...mediaSources, newMediaFile])
  }

  const removePhoto = async () => {
    const slicedMedia = [...media]
    const slicedMediaSources = [...mediaSources]
    await slicedMedia.splice(selectedIndex, 1)
    await slicedMediaSources.splice(selectedIndex, 1)
    setMedia([...slicedMedia])
    setMediaSources([...slicedMediaSources])
    onSetMedia([...slicedMediaSources])
  }

  const onToggleImagesContainer = () => {
    toggleImagesContainer()
  }

  const toggleImagesContainer = () => {
    setIsCameralContainer(!isCameralContainer)
  }

  const onStoryItemPress = item => {
    console.log('')
  }

  const editorStyles = {
    input: {
      color: theme.colors[appearance].primaryText,
    },
  }

  const bottomForKeyboard = Math.max(keyboardOffset - (insets?.bottom || 0), 0)

  return (
    <KeyboardAvoidingView
      behavior={'height'}
      enabled={false}
      style={styles.container}>
      <View style={styles.topContainer}>
        <View style={styles.headerContainer}>
          <StoryItem
            onPress={onStoryItemPress}
            item={user}
            imageContainerStyle={styles.userIconContainer}
            imageStyle={styles.userIcon}
          />
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{user.firstName}</Text>
          </View>
        </View>

        <View style={styles.postInputContainer}>
          <IMRichTextInput
            richTextInputRef={editorRef}
            inputRef={inputRef}
            list={friendshipData}
            mentionListPosition={'bottom'}
            onChange={onChangeText}
            showEditor={true}
            toggleEditor={() => {}}
            editorStyles={editorStyles}
            onUpdateSuggestions={setKeyword}
            onTrackingStateChange={setIsTrackingStarted}
            placeholder={localized('What is on your mind?')}
            autoFocus={true}
          />
        </View>
      </View>

      <View
        style={[
          styles.bottomContainer,
          {
            bottom: bottomForKeyboard,
            marginBottom: 0,
            paddingBottom: keyboardOffset > 0 ? 0 : undefined,
          },
        ]}>
        <View
          style={[
            styles.postImageAndLocationContainer,
            isTrackingStarted && { height: '100%' },
          ]}>
          <ScrollView
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            style={[
              styles.imagesContainer,
              isCameralContainer ? { display: 'flex' } : { display: 'none' },
            ]}>
            {media.map((singleMedia, index) => {
              const { source, type } = singleMedia

              if (type?.startsWith('image')) {
                return (
                  <TouchableOpacity
                    key={source}
                    activeOpacity={0.9}
                    onPress={() => onMediaPress(index)}
                    style={styles.imageItemcontainer}>
                    <Image style={styles.imageItem} source={{ uri: source }} />
                  </TouchableOpacity>
                )
              } else {
                return (
                  <TouchableOpacity
                    key={source}
                    activeOpacity={0.9}
                    onPress={() => onMediaPress(index)}
                    style={styles.imageItemcontainer}>
                    <Video
                      source={{ uri: source }}
                      resizeMode={'cover'}
                      shouldPlay={false}
                      isMuted={true}
                      style={styles.imageItem}
                    />
                  </TouchableOpacity>
                )
              }
            })}

            <TouchableOpacity
              onPress={onCameraIconPress}
              style={[styles.imageItemcontainer, styles.imageBackground]}>
              <Image
                style={styles.addImageIcon}
                source={theme.icons.cameraFilled}
              />
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.addTitleAndlocationIconContainer}>
            <View style={styles.addTitleContainer}>
              <Text style={styles.addTitle}>
                {!isCameralContainer
                  ? localized('Add to your post')
                  : localized('Add photos to your post')}
              </Text>
            </View>

            <View style={styles.iconsContainer}>
              <TouchableIcon
                onPress={onToggleImagesContainer}
                containerStyle={styles.iconContainer}
                imageStyle={[
                  styles.icon,
                  isCameralContainer
                    ? styles.cameraFocusTintColor
                    : styles.cameraUnfocusTintColor,
                ]}
                iconSource={theme.icons.cameraFilled}
              />
            </View>
          </View>

          <IMMentionList
            list={friendshipData}
            keyword={keyword}
            isTrackingStarted={isTrackingStarted}
            onSuggestionTap={editorRef.current?.onSuggestionTap}
          />
        </View>
      </View>

      <View
        style={[
          styles.blankBottom,
          keyboardOffset > 0 && { height: 0, marginTop: 0, display: 'none' },
        ]}
      />

      <IMCameraModal
        wrapInModal={true}
        isCameraOpen={isCameraOpen}
        onImagePost={onImagePost}
        onCameraClose={onCameraClose}
        maxDuration={config.videoMaxDuration}
      />
    </KeyboardAvoidingView>
  )
})

export default CreatePost