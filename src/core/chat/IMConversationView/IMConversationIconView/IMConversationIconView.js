import React, { memo, useMemo, useState } from 'react'
import { View, Image } from 'react-native'
import { useTheme } from '../../../dopebase'
import dynamicStyles from './styles'

const defaultAvatar =
  'https://www.iosapptemplates.com/wp-content/uploads/2019/06/empty-avatar.jpg'

const IMConversationIconView = props => {
  const { participants: incomingParticipants, imageStyle, style } = props

  const participants = useMemo(() => {
    return Array.isArray(incomingParticipants)
      ? incomingParticipants.filter(Boolean)
      : []
  }, [incomingParticipants])

  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)

  const [imgErr, setImgErr] = useState(false)
  const [secondImgErr, setSecondImgErr] = useState(false)

  const firstUri =
    typeof participants?.[0]?.profilePictureURL === 'string' &&
    participants[0].profilePictureURL.length > 0
      ? participants[0].profilePictureURL
      : defaultAvatar

  const secondUri =
    typeof participants?.[1]?.profilePictureURL === 'string' &&
    participants[1].profilePictureURL.length > 0
      ? participants[1].profilePictureURL
      : defaultAvatar

  return (
    <View style={styles.container}>
      {participants.length === 0 && (
        <View style={styles.singleParticipation}>
          <Image
            style={styles.singleChatItemIcon}
            source={{ uri: defaultAvatar }}
          />
        </View>
      )}

      {participants.length === 1 && (
        <View style={style ? style : styles.singleParticipation}>
          <Image
            style={[styles.singleChatItemIcon, imageStyle]}
            onError={() => setImgErr(true)}
            source={{ uri: imgErr ? defaultAvatar : firstUri }}
          />
          {!!participants?.[0]?.isOnline && <View style={styles.onlineMark} />}
        </View>
      )}

      {participants.length > 1 && (
        <View style={styles.multiParticipation}>
          <Image
            style={[styles.multiPaticipationIcon, styles.bottomIcon]}
            onError={() => setImgErr(true)}
            source={{ uri: imgErr ? defaultAvatar : firstUri }}
          />
          <Image
            style={[styles.multiPaticipationIcon, styles.topIcon]}
            onError={() => setSecondImgErr(true)}
            source={{ uri: secondImgErr ? defaultAvatar : secondUri }}
          />
        </View>
      )}
    </View>
  )
}

export default memo(IMConversationIconView)