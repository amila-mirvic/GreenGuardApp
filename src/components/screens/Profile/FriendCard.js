import React, { memo } from 'react'
import { Text, TouchableOpacity } from 'react-native'
import { Image } from 'expo-image'
import { useTheme } from '../../../core/dopebase'
import dynamicStyles from './styles'

const FriendCard = memo(props => {
  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)

  const {
    onPress,
    containerStyle,
    imageStyle,
    item,
    titleStyle,
    activeOpacity,
  } = props

  return (
    <TouchableOpacity
      activeOpacity={activeOpacity}
      onPress={onPress}
      style={[styles.friendCardContainer, containerStyle]}>
      <Image
        style={[styles.friendCardImage, imageStyle]}
        source={{ uri: item.profilePictureURL }}
      />
      {!!item.firstName && (
        <Text style={[styles.friendCardTitle, titleStyle]}>
          {item.firstName}
        </Text>
      )}
    </TouchableOpacity>
  )
})

export default FriendCard
