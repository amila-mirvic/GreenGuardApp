import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import RootNavigator from '../navigators/RootNavigator'
import { useTheme } from '../core/dopebase'

const linking = {
  prefixes: ['https://mychat.com', 'mychat://', 'http://localhost:19006'],
  config: {
    screens: {
      // PersonalChat: 'channelxxx=:channel',
    },
  },
}
const AppContainer = () => {
  const { appearance, theme } = useTheme()
  return (
    <NavigationContainer
      theme={
        appearance === 'dark'
          ? theme.navContainerTheme.dark
          : theme.navContainerTheme.light
      }
      linking={linking}>
      <RootNavigator />
    </NavigationContainer>
  )
}

export default AppContainer
