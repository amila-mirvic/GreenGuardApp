import { Platform } from 'react-native'
import React from 'react'
import { createStackNavigator } from '@react-navigation/stack'
import { useTheme, useTranslations } from '../core/dopebase'
import DrawerNavigator from './DrawerNavigator'
import BottomTabNavigator from './BottomTabNavigator'
import {
  IMEditProfileScreen,
  IMUserSettingsScreen,
  IMProfileSettingsScreen,
} from '../core/profile'
import { IMAllFriendsScreen } from '../core/socialgraph/friendships'
import { IMNotificationScreen } from '../core/notifications'
import { FeedSearchScreen, SinglePostScreen, ProfileScreen } from '../screens'
import { IMChatScreen, IMViewGroupMembersScreen } from '../core/chat'
import useNotificationOpenedApp from '../core/helpers/notificationOpenedApp'

const MainStack = createStackNavigator()
const MainStackNavigator = () => {
  useNotificationOpenedApp()
  const { localized } = useTranslations()
  const { theme } = useTheme()
  return (
    <MainStack.Navigator
      screenOptions={{
        headerBackTitleVisible: false,
        headerBackTitle: localized('Back'),
        cardStyle: theme.webContainerStyle,
      }}
      initialRouteName="NavStack">
      <MainStack.Screen
        name="NavStack"
       options={{ headerShown: false, cardStyle: { ...theme.webContainerStyle, maxWidth: '100%' } }}
        component={BottomTabNavigator}

      />
      <MainStack.Screen name="FeedSearch" component={FeedSearchScreen} />
      <MainStack.Screen
        name="MainSinglePostNavigator"
        component={SinglePostScreen}
      />
      <MainStack.Screen name="MainProfile" component={ProfileScreen} />
      <MainStack.Screen name="Notification" component={IMNotificationScreen} />
      <MainStack.Screen
        name="ProfileSettings"
        component={IMProfileSettingsScreen}
      />
      <MainStack.Screen name="EditProfile" component={IMEditProfileScreen} />
      <MainStack.Screen name="AppSettings" component={IMUserSettingsScreen} />
      <MainStack.Screen name="AllFriends" component={IMAllFriendsScreen} />
      <MainStack.Screen
        name="MainProfilePostDetails"
        component={SinglePostScreen}
      />
      <MainStack.Screen name="PersonalChat" component={IMChatScreen} />
      <MainStack.Screen
        name="ViewGroupMembers"
        component={IMViewGroupMembersScreen}
      />
    </MainStack.Navigator>
  )
}

export default MainStackNavigator
