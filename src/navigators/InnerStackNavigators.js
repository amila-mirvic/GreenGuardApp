import { createStackNavigator } from '@react-navigation/stack'
import React from 'react'
import { Platform } from 'react-native'
import { useTranslations } from '../core/dopebase'
import {
  FeedScreen,
  SinglePostScreen,
  CreatePostScreen,
  DiscoverScreen,
  ProfileScreen,
  ChatScreen,
} from '../screens'
import { IMCreateGroupScreen } from '../core/chat'
import {
  IMFriendsScreen,
  IMAllFriendsScreen,
  IMUserSearchModal,
} from '../core/socialgraph/friendships'
import {
  IMEditProfileScreen,
  IMUserSettingsScreen,
  IMProfileSettingsScreen,
  IMBlockedUsersScreen,
} from '../core/profile'
import { IMNotificationScreen } from '../core/notifications'

const InnerStack = createStackNavigator()
const InnerFeedNavigator = () => {
  return (
    <InnerStack.Navigator
      initialRouteName="InnerFeed"
      screenOptions={{ headerMode: 'float' }}>
      <InnerStack.Screen name="InnerFeed" component={FeedScreen} />
      <InnerStack.Screen
        name="FeedSinglePostNavigator"
        component={SinglePostScreen}
      />
      <InnerStack.Screen name="CreatePost" component={CreatePostScreen} />
      <InnerStack.Screen name="FeedProfile" component={ProfileScreen} />
      <InnerStack.Screen
        name="FeedNotification"
        component={IMNotificationScreen}
      />
      <InnerStack.Screen
        name="FeedProfileSettings"
        component={IMProfileSettingsScreen}
      />
      <InnerStack.Screen
        name="FeedEditProfile"
        component={IMEditProfileScreen}
      />
      <InnerStack.Screen
        name="FeedAppSettings"
        component={IMUserSettingsScreen}
      />
      
      <InnerStack.Screen name="FeedAllFriends" component={IMAllFriendsScreen} />
      <InnerStack.Screen
        name="FeedProfilePostDetails"
        component={SinglePostScreen}
      />
    </InnerStack.Navigator>
  )
}

const ChatSearch = createStackNavigator()
const InnerChatSearchNavigator = () => {
  return (
    <ChatSearch.Navigator
      initialRouteName="ChatSearch"
      screenOptions={{ headerMode: 'float', presentation: 'modal' }}>
      <ChatSearch.Screen
        name="ChatSearch"
        component={InnerChatNavigator}
        options={{ headerShown: false }}
      />
      <ChatSearch.Screen
        name="UserSearchScreen"
        component={IMUserSearchModal}
        options={{ headerShown: false }}
      />
    </ChatSearch.Navigator>
  )
}

const InnerChat = createStackNavigator()
const InnerChatNavigator = () => {
  return (
    <InnerChat.Navigator
      initialRouteName="Chat"
      screenOptions={{ headerMode: 'float' }}>
      <InnerChat.Screen name="Chat" component={ChatScreen} />
      <InnerChat.Screen name="CreateGroup" component={IMCreateGroupScreen} />
    </InnerChat.Navigator>
  )
}

const FriendsSearch = createStackNavigator()
const InnerFriendsSearchNavigator = () => {
  return (
    <FriendsSearch.Navigator
      initialRouteName="Friend"
      screenOptions={{ headerMode: 'float', presentation: 'modal' }}>
      <FriendsSearch.Screen
        name="Friend"
        component={InnerFriendsNavigator}
        options={{ headerShown: false }}
      />
      <FriendsSearch.Screen
        name="UserSearchScreen"
        component={IMUserSearchModal}
        options={{ headerShown: false }}
      />
    </FriendsSearch.Navigator>
  )
}

const InnerFriends = createStackNavigator()
const InnerFriendsNavigator = () => {
  const { localized } = useTranslations()
  return (
    <InnerFriends.Navigator
      screenOptions={{ headerMode: 'float' }}
      initialRouteName="Friends">
      <InnerFriends.Screen
        initialParams={{
          followEnabled: false,
          friendsScreenTitle: localized('Friends'),
          showDrawerMenuButton: Platform.OS !== 'ios',
        }}
        name="Friends"
        component={IMFriendsScreen}
      />
      <InnerFriends.Screen name="FriendsProfile" component={ProfileScreen} />
      <InnerFriends.Screen
        name="FriendsAllFriends"
        component={IMAllFriendsScreen}
      />
    </InnerFriends.Navigator>
  )
}

const InnerDiscover = createStackNavigator()
const InnerDiscoverNavigator = () => {
  return (
    <InnerDiscover.Navigator
      initialRouteName="Discover"
      screenOptions={{ headerMode: 'float' }}>
      <InnerDiscover.Screen name="Discover" component={DiscoverScreen} />
      <InnerDiscover.Screen
        name="DiscoverSinglePostNavigator"
        component={SinglePostScreen}
      />
      <InnerDiscover.Screen name="DiscoverProfile" component={ProfileScreen} />
      <InnerDiscover.Screen
        name="DiscoverNotification"
        component={IMNotificationScreen}
      />
      <InnerDiscover.Screen
        name="DiscoverProfileSettings"
        component={IMProfileSettingsScreen}
      />
      <InnerDiscover.Screen
        name="DiscoverEditProfile"
        component={IMEditProfileScreen}
      />
      <InnerDiscover.Screen
        name="DiscoverAppSettings"
        component={IMUserSettingsScreen}
      />
      <InnerDiscover.Screen
        name="DiscoverAllFriends"
        component={IMAllFriendsScreen}
      />
      <InnerDiscover.Screen
        name="DiscoverProfilePostDetails"
        component={SinglePostScreen}
      />
    </InnerDiscover.Navigator>
  )
}

// working
const InnerProfile = createStackNavigator()
const InnerProfileNavigator = () => {
  return (
    <InnerProfile.Navigator
      initialRouteName="Profile"
      screenOptions={{ headerMode: 'float' }}>
      <InnerProfile.Screen name="Profile" component={ProfileScreen} />
      <InnerProfile.Screen name="ProfileProfile" component={ProfileScreen} />
      <InnerProfile.Screen
        name="ProfileNotification"
        component={IMNotificationScreen}
      />
      <InnerDiscover.Screen
        name="ProfileSinglePostNavigator"
        component={SinglePostScreen}
      />
      <InnerProfile.Screen
        name="ProfileProfileSettings"
        component={IMProfileSettingsScreen}
      />
      <InnerProfile.Screen
        name="ProfileBlockedSettings"
        component={IMBlockedUsersScreen}
      />
      <InnerProfile.Screen
        name="ProfileEditProfile"
        component={IMEditProfileScreen}
      />
      <InnerProfile.Screen
        name="ProfileAppSettings"
        component={IMUserSettingsScreen}
      />
      <InnerProfile.Screen
        name="ProfileAllFriends"
        component={IMAllFriendsScreen}
      />
      <InnerProfile.Screen
        name="ProfilePostDetails"
        component={SinglePostScreen}
      />
      <InnerProfile.Screen
        name="ProfileSinglePostProfile"
        component={ProfileScreen}
      />
    </InnerProfile.Navigator>
  )
}

export {
  InnerFeedNavigator,
  InnerChatSearchNavigator,
  InnerFriendsSearchNavigator,
  InnerDiscoverNavigator,
  InnerProfileNavigator,
}
