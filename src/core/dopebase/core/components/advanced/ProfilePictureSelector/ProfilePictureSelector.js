import React, { useState, useMemo, useEffect } from 'react'
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
  const resolvedIncomingURL =
    typeof props.profilePictureURL === 'string' &&
    props.profilePictureURL.trim().length > 0
      ? props.profilePictureURL
      : defaultProfilePhotoURL

  const [profilePictureURL, setProfilePictureURL] = useState(resolvedIncomingURL)
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false)
  const [tappedImage, setTappedImage] = useState([])
  const [hasUserSelectedPhoto, setHasUserSelectedPhoto] = useState(false)

  const { localized } = useTranslations()
  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)
  const { showActionSheetWithOptions } = useActionSheet()

  useEffect(() => {
    setProfilePictureURL(resolvedIncomingURL)
  }, [resolvedIncomingURL])

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
  }, [localized])

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

    if (isDefaultAvatar || !hasUserSelectedPhoto) {
      setProfilePictureURL(defaultProfilePhotoURL)
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

    // samo UI fallback, NIKAD ne briši backend ovdje
    setProfilePictureURL(defaultProfilePhotoURL)
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
      setHasUserSelectedPhoto(true)
      props.setProfilePictureFile?.(asset)
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
    if (index === 0) {
      pickImage()
    }

    if (index === 2) {
      setProfilePictureURL(defaultProfilePhotoURL)
      setHasUserSelectedPhoto(false)
      props.setProfilePictureFile?.(null)
    }
  }

  const displaySource =
    profilePictureURL && profilePictureURL.length > 0
      ? { uri: profilePictureURL }
      : { uri: defaultProfilePhotoURL }

  return (
    <>
      <View style={styles.imageBlock}>
        <TouchableHighlight
          style={styles.imageContainer}
          onPress={() => handleImageClick(profilePictureURL)}
        >
          <Image
            style={[styles.image, { opacity: 1 }]}
            source={displaySource}
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
          images={tappedImage?.uri ? [tappedImage] : []}
          visible={isImageViewerVisible}
          onRequestClose={() => setIsImageViewerVisible(false)}
        />
      </ScrollView>
    </>
  )
}