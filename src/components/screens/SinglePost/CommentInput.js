import React, { useState, useRef, memo } from 'react'
import { TouchableOpacity, Image, View, TextInput } from 'react-native'
import { useTheme } from '../../../core/dopebase'
import dynamicStyles from './styles'

const CommentInput = memo(props => {
  const { onCommentSend } = props

  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)

  const [value, setValue] = useState('')
  const textInputRef = useRef(null)

  const onChangeText = value => {
    setValue(value)
  }

  const onSendComment = () => {
    onCommentSend(value)
    setValue('')
    setTimeout(() => {
      textInputRef.current?.blur()
    }, 1000)
  }

  const isDisabled = () => {
    if (/\S/.test(value)) {
      return false
    } else {
      return true
    }
  }

  return (
    <View style={styles.commentInputContainer}>
      <View style={styles.commentTextInputContainer}>
        <TextInput
          ref={textInputRef}
          underlineColorAndroid="transparent"
          placeholder={'Add Comment to this Post'}
          placeholderTextColor={theme.colors[appearance].secondaryText}
          value={value}
          onChangeText={onChangeText}
          style={styles.commentTextInput}
        />
      </View>
      <TouchableOpacity
        onPress={onSendComment}
        disabled={isDisabled()}
        style={styles.commentInputIconContainer}>
        <Image
          style={[
            styles.commentInputIcon,
            isDisabled() ? { opacity: 0.3 } : { opacity: 1 },
          ]}
          source={theme.icons.send}
        />
      </TouchableOpacity>
    </View>
  )
})

export default CommentInput
