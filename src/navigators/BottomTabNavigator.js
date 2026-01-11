import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import React from 'react'
import {
  InnerFeedNavigator,
  InnerChatSearchNavigator,
  InnerFriendsSearchNavigator,
  InnerDiscoverNavigator,
  InnerProfileNavigator,
} from './InnerStackNavigators'
import { TabBarBuilder } from '../core/ui'
import { useConfig } from '../config'
import { useTheme } from '../core/dopebase'

const BottomTab = createBottomTabNavigator()
const BottomTabNavigator = () => {
  const config = useConfig()
  const { theme } = useTheme()

  return (
    <BottomTab.Navigator
      screenOptions={({ route }) => ({
        title: route.name,
        headerShown: false,
        sceneContainerStyle: theme.webContainerStyle,
      })}
      tabBar={({ state, route, navigation }) => (
        <TabBarBuilder
          tabIcons={config.tabIcons}
          route={route}
          state={state}
          navigation={navigation}
        />
      )}
      initialRouteName="HomeFeed">
      <BottomTab.Screen name="HomeFeed" component={InnerFeedNavigator} />
      <BottomTab.Screen name="Discover" component={InnerDiscoverNavigator} />
      <BottomTab.Screen name="Chat" component={InnerChatSearchNavigator} />
      <BottomTab.Screen
        name="Friends"
        component={InnerFriendsSearchNavigator}
      />
      <BottomTab.Screen name="Profile" component={InnerProfileNavigator} />
    </BottomTab.Navigator>
  )
}
export default BottomTabNavigator
