import React from 'react'
import { TouchableOpacity, View, Text } from 'react-native'
import { Image } from 'expo-image'
import { Video } from 'expo-av'
import { useTranslations } from '../dopebase/core'
import styles from './styles'

function IMPostCamera(props) {
  const { onCancel, imageSource, onPost, onVideoLoadStart } = props
  const { localized } = useTranslations()

  const renderMedia = () => {
    if (imageSource?.type.startsWith('image')) {
      return <Image source={{ uri: imageSource?.uri }} style={styles.image} />
    } else {
      return (
        <Video
          source={{ uri: imageSource?.uri }}
          onLoadStart={onVideoLoadStart}
          shouldPlay={true}
          resizeMode={'contain'}
          style={styles.image}
          rate={imageSource.rate ?? 1}
        />
      )
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: '#000000' }]}>
      <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
        <View
          style={[styles.closeCross, { transform: [{ rotate: '45deg' }] }]}
        />
        <View
          style={[styles.closeCross, { transform: [{ rotate: '-45deg' }] }]}
        />
      </TouchableOpacity>
      {renderMedia()}
      <TouchableOpacity onPress={onPost} style={styles.postContainer}>
        <Text style={styles.postText}>{localized('Next')}</Text>
      </TouchableOpacity>
    </View>
  )
}

export default IMPostCamera
