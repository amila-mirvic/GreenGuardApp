import React, { useState, useEffect } from 'react'
import { Image, Keyboard, Platform, Text, View, TouchableOpacity } from 'react-native'
import { useNavigation } from '@react-navigation/core'
import { useDispatch } from 'react-redux'
import messaging from '@react-native-firebase/messaging'
import { useTheme, useTranslations, ActivityIndicator, DismissButton } from '../../../dopebase'
import dynamicStyles from './styles'
import { setUserData } from '../../redux/auth'
import { updateUser } from '../../../users'
import { useOnboardingConfig } from '../../hooks/useOnboardingConfig'
import { useAuth } from '../../hooks/useAuth'
import useCurrentUser from '../../hooks/useCurrentUser'

// slike
import PartnersImg from '../../../../assets/images/partners.png'
import EuFooterImg from '../../../../assets/images/eu_footer.png'

const WelcomeScreen = (props) => {
  const navigation = useNavigation()
  const currentUser = useCurrentUser()
  const dispatch = useDispatch()
  const { config } = useOnboardingConfig()
  const { localized } = useTranslations()
  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)

  const [isLoading, setIsLoading] = useState(true)
  const authManager = useAuth()

  const { title, caption } = props

  // ---------- NAV HELPER (ovdje!) ----------
  const goTo = React.useCallback((screen) => {
    // pokušaj kao child rute
    navigation.navigate('DelayedOnboarding', { screen })
    // alternativni stack
    navigation.navigate('AuthStack', { screen })
    // fallback: direktno
    navigation.navigate(screen)
  }, [navigation])
  // -----------------------------------------

  useEffect(() => {
    tryToLoginFirst()
  }, [])

  const handleInitialNotification = async () => {
    const userID = currentUser?.id || currentUser?.userID
    const intialNotification = await messaging().getInitialNotification()

    if (intialNotification && Platform.OS === 'android') {
      const {
        data: { channelID, type },
      } = intialNotification

      if (type === 'chat_message') {
        handleChatMessageType(channelID)
      }
    }

    if (userID && Platform.OS === 'ios') {
      updateUser(userID, { badgeCount: 0 })
    }
  }

  const tryToLoginFirst = async () => {
    authManager
      .retrievePersistedAuthUser(config)
      .then(response => {
        if (response?.user) {
          const user = response.user
          dispatch(setUserData({ user: response.user }))
          handleInitialNotification()

          if (props.delayedMode) {
            return
          }

          navigation.reset({
            index: 0,
            routes: [{ name: 'MainStack', params: { user } }],
          })
          setIsLoading(false)
        } else {
          setIsLoading(false)
        }
      })
      .catch(() => {
        setIsLoading(false)
      })
  }

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', _keyboardDidShow)
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', _keyboardDidHide)
    return () => {
      keyboardDidShowListener.remove()
      keyboardDidHideListener.remove()
    }
  }, [])

  const _keyboardDidShow = () => {}
  const _keyboardDidHide = () => {}

  const handleChatMessageType = (channelID) => {
    navigation.navigate('PersonalChat', {
      participant: currentUser,
      channel: { id: channelID },
    })
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {props.delayedMode && (
        <DismissButton
          style={styles.dismissButton}
          tintColor={theme.colors[appearance].primaryForeground}
          onPress={() => navigation.goBack()}
        />
      )}

      {/* LOGO */}
      <View style={styles.logo} pointerEvents="none">
        <Image
          style={styles.logoImage}
          source={props.delayedMode ? theme.icons.delayedLogo : theme.icons.logo}
        />
      </View>

    

      {/* LOGIN */}
      <TouchableOpacity
        style={styles.loginContainer}
        activeOpacity={0.8}
        onPress={() => goTo('Login')}
      >
        <Text style={styles.loginText}>Log in</Text>
      </TouchableOpacity>

      {/* SIGN UP */}
      <TouchableOpacity
        style={styles.signupContainer}
        activeOpacity={0.8}
        onPress={() => goTo('Signup')}
      >
        <Text style={styles.signupText}>Sign up</Text>
      </TouchableOpacity>

      {/* PARTNERS */}
      <View style={styles.partnersBlock} pointerEvents="box-none">
        <Text style={styles.partnersTitle}>With partners</Text>
        <Image source={PartnersImg} style={styles.partnersImage} resizeMode="contain" />
      </View>

      {/* FOOTER */}
      <View style={styles.footer} pointerEvents="box-none">
        <Image source={EuFooterImg} style={styles.footerImage} resizeMode="contain" />
      </View>
    </View>
  )
}

export default WelcomeScreen
