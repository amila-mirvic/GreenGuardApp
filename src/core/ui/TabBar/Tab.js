import React from 'react'
import { TouchableOpacity, Image, View } from 'react-native'
import { useTheme } from '../../dopebase'
import dynamicStyles from './styles'

function Tab({ route, onPress, focus, tabIcons, showBadge }) {
  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)

  return (
    <TouchableOpacity style={styles.tabContainer} onPress={onPress}>
      <View style={{ position: 'relative' }}>
        <Image
          source={
            focus ? tabIcons[route.name].focus : tabIcons[route.name].unFocus
          }
          style={[
            styles.tabIcon,
            focus ? styles.focusTintColor : styles.unFocusTintColor,
          ]}
        />
        {showBadge && (
          <View
            style={{
              position: 'absolute',
              top: -2,
              right: -4,
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: '#1F6A45',
            }}
          />
        )}
      </View>
    </TouchableOpacity>
  )
}

export default Tab