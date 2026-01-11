import React, { memo } from 'react'
import { Text, TouchableOpacity } from 'react-native'
import { useTheme } from '../../../core/dopebase'
import dynamicStyles from './styles'

export default ProfileButton = memo(props => {
  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)

  const { containerStyle, titleStyle, title, onPress, disabled } = props

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.profileSettingsButtonContainer, containerStyle]}>
      <Text style={[styles.profileSettingsTitle, titleStyle]}>{title}</Text>
    </TouchableOpacity>
  )
})
