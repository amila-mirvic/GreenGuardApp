import { createDrawerNavigator } from '@react-navigation/drawer'
import React from 'react'
import { IMDrawerMenu } from '../core/ui/drawer/IMDrawerMenu/IMDrawerMenu'
import {
  InnerFeedNavigator,
  InnerChatSearchNavigator,
  InnerFriendsSearchNavigator,
  InnerDiscoverNavigator,
  InnerProfileNavigator,
} from './InnerStackNavigators'
import { useConfig } from '../config'
import { useTheme } from '../core/dopebase'

const Drawer = createDrawerNavigator()
const DrawerNavigator = () => {
  const config = useConfig()
  const { theme } = useTheme()

  return (
    <Drawer.Navigator
      screenOptions={({ route }) => ({
        title: route.key,
        headerShown: false,
        sceneContainerStyle: theme.webContainerStyle,
      })}
      initialRouteName="Feed"
      drawerStyle={{ width: 300 }}
      drawerPosition="left"
      drawerContent={({ navigation }) => (
        <IMDrawerMenu
          navigation={navigation}
          menuItems={config.drawerMenu.upperMenu}
          menuItemsSettings={config.drawerMenu.lowerMenu}
        />
      )}>
      <Drawer.Screen name="Feed" component={InnerFeedNavigator} />
      <Drawer.Screen name="Discover" component={InnerDiscoverNavigator} />
      <Drawer.Screen name="Chat" component={InnerChatSearchNavigator} />
      <Drawer.Screen name="Friends" component={InnerFriendsSearchNavigator} />
      <Drawer.Screen name="Profile" component={InnerProfileNavigator} />
    </Drawer.Navigator>
  )
}

export default DrawerNavigator
