import React, { useEffect, useState } from 'react'
import { Text, View, StatusBar } from 'react-native'
import { useTheme, useTranslations } from '../../../../dopebase'
import dynamicStyles from './styles'
import IMProfileItemView from '../IMProfileItemView/IMProfileItemView'
import { ProfilePictureSelector } from '../../../../dopebase/core/components/advanced'
import { updateProfilePhoto } from '../../../../users'
import { storageAPI } from '../../../../media'
import { useCurrentUser } from '../../../../onboarding'

const IMUserProfileComponent = props => {
  const { menuItems, onUpdateUser, onLogout } = props

  const currentUser = useCurrentUser()
  const { profilePictureURL, id } = currentUser || {}

  const { localized } = useTranslations()
  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)

  const [profilePicture, setProfilePicture] = useState(profilePictureURL || null)

  useEffect(() => {
    setProfilePicture(profilePictureURL || null)
  }, [profilePictureURL])

  const displayName = () => {
    const { firstName, lastName, fullname } = currentUser || {}
    if (
      (firstName && firstName.length > 0) ||
      (lastName && lastName.length > 0)
    ) {
      return `${firstName || ''} ${lastName || ''}`.trim()
    }
    return fullname || ''
  }

  const setProfilePictureFile = async photoFile => {
    if (photoFile == null) {
      setProfilePicture(null)
      const finalRes = await updateProfilePhoto(id, null)
      if (finalRes.success === true) {
        onUpdateUser &&
          onUpdateUser({ ...currentUser, profilePictureURL: null })
      }
      return
    }

    const response = await storageAPI.processAndUploadMediaFile(photoFile)
    if (response.error) {
      return
    }

    const remoteURL = response.downloadURL || response.downloadKey || null
    if (!remoteURL) {
      return
    }

    setProfilePicture(remoteURL)

    const finalRes = await updateProfilePhoto(id, remoteURL)
    if (finalRes.success === true) {
      onUpdateUser &&
        onUpdateUser({
          ...currentUser,
          profilePictureURL: remoteURL,
        })
    }
  }

  const renderMenuItem = (menuItem, index) => {
    const { title, icon, onPress, tintColor } = menuItem
    return (
      <IMProfileItemView
        title={title}
        icon={icon}
        iconStyle={{ tintColor }}
        onPress={onPress}
        key={index}
      />
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar />
      <View style={styles.imageContainer}>
        <ProfilePictureSelector
          setProfilePictureFile={setProfilePictureFile}
          profilePictureURL={profilePicture}
        />
      </View>
      <Text style={styles.userName}>{displayName()}</Text>
      {menuItems.map((menuItem, index) => renderMenuItem(menuItem, index))}
      <Text onPress={onLogout} style={styles.logout}>
        {localized('Logout')}
      </Text>
    </View>
  )
}

export default IMUserProfileComponent