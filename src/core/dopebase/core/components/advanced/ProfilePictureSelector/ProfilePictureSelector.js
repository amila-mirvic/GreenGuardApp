import React, { useState, useRef, useMemo, useEffect } from 'react'
import {
  View,
  TouchableOpacity,
  ScrollView,
  TouchableHighlight,
  Platform,
  Alert,
} from 'react-native'
import ImageView from 'react-native-image-viewing'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { useActionSheet, useTheme, useTranslations } from '../../..'
import dynamicStyles from './styles'

const defaultProfilePhotoURL =
  'https://www.iosapptemplates.com/wp-content/uploads/2019/06/empty-avatar.jpg'

export const ProfilePictureSelector = props => {
  const [profilePictureURL, setProfilePictureURL] = useState(
    props.profilePictureURL?.length > 0
      ? props.profilePictureURL
      : defaultProfilePhotoURL,
  )

  useEffect(() => {
  setProfilePictureURL(
    props.profilePictureURL?.length > 0
      ? props.profilePictureURL
      : defaultProfilePhotoURL,
  )
}, [props.profilePictureURL])

  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false)
  const [tappedImage, setTappedImage] = useState([])

  // We only want to show a blocking alert if the user actually selected a photo
  // and the upload/rendering fails. Many apps use a remote default avatar URL;
  // if that URL fails to load (offline / blocked), we should fall back silently.
  const [hasUserSelectedPhoto, setHasUserSelectedPhoto] = useState(false)

  const { localized } = useTranslations()
  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)

  const { showActionSheetWithOptions } = useActionSheet()

  const actionSheetOptions = useMemo(() => {
    return {
      title: localized('Confirm action'),
      options: [
        localized('Change Profile Photo'),
        localized('Cancel'),
        localized('Remove Profile Photo'),
      ],
      cancelButtonIndex: 1,
      destructiveButtonIndex: 2,
    }
  }, [])

  const handleImageClick = url => {
    if (url) {
      const isAvatar = url.includes('empty-avatar') || url.includes('avatar')
      const image = { uri: url }

      if (!isAvatar) {
        setTappedImage(image)
        setIsImageViewerVisible(true)
      } else {
        showProfileActionSheet()
      }
    } else {
      showProfileActionSheet()
    }
  }

  const onImageError = () => {
    console.log('Error loading profile photo at url ' + profilePictureURL)

    const isDefaultAvatar =
      !profilePictureURL ||
      profilePictureURL === defaultProfilePhotoURL ||
      profilePictureURL.includes('empty-avatar') ||
      profilePictureURL.includes('avatar')

    // If the default remote avatar fails to load (common in offline/dev environments),
    // do NOT show an alert. Just fall back to the local placeholder icon.
    if (isDefaultAvatar || !hasUserSelectedPhoto) {
      setProfilePictureURL(null)
      return
    }

    Alert.alert(
      localized('Alert'),
      localized(
        'There was an error in uploading your profile photo. Please try a different image',
      ),
      [{ text: localized('OK') }],
      { cancelable: true },
    )

    // Back to original photo after erroring out
    setProfilePictureURL(null)
    props.setProfilePictureFile?.(null)
    setHasUserSelectedPhoto(false)
  }

  const getPermissionAsync = async () => {
    if (Platform.OS === 'ios') {
      let permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync(false)

      if (permissionResult.granted === false) {
        alert(
          localized('Sorry, we need camera roll permissions to make this work.'),
        )
      }
    }
  }

  const pickImage = async () => {
    await getPermissionAsync()

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    })

    if (result.canceled !== true) {
      const asset = result.assets[0]

      setProfilePictureURL(asset.uri)
      props.setProfilePictureFile(asset)
      setHasUserSelectedPhoto(true)
    }
  }

  const showProfileActionSheet = () => {
    showActionSheetWithOptions(
      {
        title: actionSheetOptions.title,
        options: actionSheetOptions.options,
        cancelButtonIndex: actionSheetOptions.cancelButtonIndex,
        destructiveButtonIndex: actionSheetOptions.destructiveButtonIndex,
      },
      onProfileActionDone,
    )
  }

  const onProfileActionDone = index => {
    if (index == 0) {
      pickImage()
    }
    if (index == 2) {
      // Remove button
      if (profilePictureURL) {
        setProfilePictureURL(null)
        props.setProfilePictureFile(null)
        setHasUserSelectedPhoto(false)
      }
    }
  }

  return (
    <>
      <View style={styles.imageBlock}>
        <TouchableHighlight
          style={styles.imageContainer}
          onPress={() => handleImageClick(profilePictureURL)}
        >
          <Image
            style={[styles.image, { opacity: profilePictureURL ? 1 : 0.3 }]}
            source={
              profilePictureURL ? { uri: profilePictureURL } : theme.icons.userAvatar
            }
            contentFit="cover"
            onError={onImageError}
          />
        </TouchableHighlight>

        <TouchableOpacity
          onPress={showProfileActionSheet}
          style={styles.addButton}
        >
          <Image style={styles.cameraIcon} source={theme.icons.cameraFilled} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <ImageView
          images={[tappedImage]}
          visible={isImageViewerVisible}
          onRequestClose={() => setIsImageViewerVisible(false)}
        />
      </ScrollView>
    </>
  )
}
