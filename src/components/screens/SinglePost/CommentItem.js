import React, { memo } from 'react'
import { Text, View } from 'react-native'
import { Image } from 'expo-image'
import { useTheme } from '../../../core/dopebase'
import dynamicStyles from './styles'

const defaultAvatar =
  'https://www.iosapptemplates.com/wp-content/uploads/2019/06/empty-avatar.jpg'

const CommentItem = memo(props => {
  const { item } = props
  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)

  return (
    <View style={styles.commentItemContainer}>
      <View style={styles.commentItemImageContainer}>
        <Image
          style={styles.commentItemImage}
          source={{
            uri: item?.author?.profilePictureURL ?? defaultAvatar,
          }}
        />
      </View>
      <View style={styles.commentItemBodyContainer}>
        <View style={styles.commentItemBodyRadiusContainer}>
          <Text style={styles.commentItemBodyTitle}>
            {item?.author?.username?.length > 0
              ? item?.author?.username
              : `${item?.author?.firstName ?? 'Anonymous'} ${
                  item?.author?.lastName ?? ''
                } `}
          </Text>
          <Text style={styles.commentItemBodySubtitle}>{item.commentText}</Text>
        </View>
      </View>
    </View>
  )
})

export default CommentItem
