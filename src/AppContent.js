import React, { useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import * as WebBrowser from 'expo-web-browser'
import { Audio } from 'expo-av'
import { useConfig } from './config'
import { OnboardingConfigProvider } from './core/onboarding/hooks/useOnboardingConfig'
import AppContainer from './screens/AppContainer'
import { ProfileConfigProvider } from './core/profile/hooks/useProfileConfig'

WebBrowser.maybeCompleteAuthSession()

const MainNavigator =
    AppContainer


const AppContent = () => {
  const config = useConfig()

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      playsInSilentLockedModeIOS: true,
      shouldDuckAndroid: true,
    })
  }, [])

  return (
    <OnboardingConfigProvider config={config}>
      <ProfileConfigProvider config={config}>
        <StatusBar style="auto" />
        <MainNavigator />
      </ProfileConfigProvider>
    </OnboardingConfigProvider>
  )
}

export default AppContent
