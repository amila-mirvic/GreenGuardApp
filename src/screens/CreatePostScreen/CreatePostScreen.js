import React, { useState, useLayoutEffect, useEffect, useRef } from 'react'
import { BackHandler, ActivityIndicator, Platform, Button } from 'react-native'
import { useTheme, useTranslations, Alert } from '../../core/dopebase'
import { CreatePost } from '../../components'
import { usePostMutations } from '../../core/socialgraph/feed'
import { useSocialGraphFriends } from '../../core/socialgraph/friendships'
import { useCurrentUser } from '../../core/onboarding'

const CreatePostScreen = props => {
  const { navigation } = props
  const { localized } = useTranslations()
  const { theme, appearance } = useTheme()

  const currentUser = useCurrentUser()

  const { addPost } = usePostMutations()
  const { friends } = useSocialGraphFriends(currentUser?.id)

  const [post, setPost] = useState({
    postText: '',
  })
  const [postMedia, setPostMedia] = useState([]) // array of local photo URLs
  const [location, setLocation] = useState('')
  const [isPosting, setIsPosting] = useState(false)

  const inputRef = useRef(null)
  const willBlurSubscription = useRef(null)
  const didFocusSubscription = useRef(
    navigation.addListener('focus', payload =>
      BackHandler.addEventListener(
        'hardwareBackPress',
        onBackButtonPressAndroid,
      ),
    ),
  )

  useLayoutEffect(() => {
    const colorSet = theme.colors[appearance]
    navigation.setOptions({
      headerTitle: localized('Create Post'),
      headerStyle: {
        backgroundColor: colorSet.primaryBackground,
        borderBottomColor: colorSet.hairline,
      },
      headerTintColor: colorSet.primaryText,
    })
  }, [])

  useEffect(() => {
    const colorSet = theme.colors[appearance]

    navigation.setOptions({
      headerRight: () =>
        isPosting ? (
          Platform.OS === 'ios' ? (
            <ActivityIndicator
              animating={true}
              style={{ margin: 10 }}
              color={colorSet.primaryText}
              size="small"
            />
          ) : (
            <ActivityIndicator
              animating={true}
              color={colorSet.primaryText}
              style={{ margin: 10 }}
              number={5}
            />
          )
        ) : (
          <Button
            title={localized('Post')}
            style={{ marginRight: 12 }}
            onPress={onPost}
            color="#1F6A45"
          />
        ),
    })
  }, [post, isPosting, postMedia, navigation])

  useEffect(() => {
    inputRef.current?.focus()
    willBlurSubscription.current = navigation.addListener('blur', payload =>
      BackHandler.removeEventListener(
        'hardwareBackPress',
        onBackButtonPressAndroid,
      ),
    )
    return () => {
      willBlurSubscription.current && willBlurSubscription.current()
      didFocusSubscription.current && didFocusSubscription.current()
    }
  }, [])

  const onBackButtonPressAndroid = () => {
    navigation.goBack()
    return true
  }

  const onPostDidChange = post => {
    setPost(post)
  }

  const onSetMedia = files => {
    if (files?.length > 0) {
      setPostMedia(files)
    }
  }

  const onLocationDidChange = location => {
    setLocation(location)
  }

  const onPost = async () => {
    const tempPost = {
      ...post,
      location: location,
    }
    setPost(tempPost)

    const isEmptyPost = tempPost.postText.trim() === ''
    if (postMedia.length === 0 && isEmptyPost) {
      Alert.alert(
        localized('Empty Post'),
        localized(
          'You may not create an empty post. Write a post or select a photo to proceed.',
        ),
        [{ text: localized('OK') }],
        {
          cancelable: false,
        },
      )
      return
    }

    setIsPosting(true)
    await addPost(tempPost, postMedia, currentUser)
    setIsPosting(false)
    navigation.goBack()
    // TODO: Handle errors
  }

  const blurInput = () => {
    inputRef.current?.blur()
  }

  return (
    <CreatePost
      inputRef={inputRef}
      user={currentUser}
      onPostDidChange={onPostDidChange}
      onSetMedia={onSetMedia}
      onLocationDidChange={onLocationDidChange}
      blurInput={blurInput}
      friends={friends}
    />
  )
}

export default CreatePostScreen
