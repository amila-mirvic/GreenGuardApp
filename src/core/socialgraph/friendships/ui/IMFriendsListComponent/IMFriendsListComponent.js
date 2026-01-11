import React from 'react'
import { FlatList, View } from 'react-native'
import {
  useTheme,
  useTranslations,
  EmptyStateView,
  ActivityIndicator,
} from '../../../../dopebase'
import IMFriendItem from '../../ui/IMFriendItem/IMFriendItem'
import SearchBarAlternate from '../../../../ui/SearchBarAlternate/SearchBarAlternate'
import dynamicStyles from './styles'

function IMFriendsListComponent(props) {
  const {
    containerStyle,
    onFriendAction,
    friendsData,
    onFriendItemPress,
    displayActions,
    isLoading,
    followEnabled,
    viewer,
    searchBar,
    onSearchBarPress,
    emptyStateConfig,
    onListEndReached,
    pullToRefreshConfig,
  } = props

  const { onRefresh, refreshing } = pullToRefreshConfig
  const { localized } = useTranslations()
  const { theme, appearance } = useTheme()

  const styles = dynamicStyles(theme, appearance)

  const renderItem = ({ item }) => (
    <IMFriendItem
      onFriendItemPress={onFriendItemPress}
      item={item}
      onFriendAction={onFriendAction}
      displayActions={displayActions && item.user.id != viewer.id}
      followEnabled={followEnabled}
    />
  )

  const ListEmptyComponent = () => (
    <View style={styles.emptyViewContainer}>
      <EmptyStateView emptyStateConfig={emptyStateConfig} />
    </View>
  )

  return (
    <View style={[styles.container, containerStyle]}>
      {searchBar && (
        <SearchBarAlternate
          onPress={onSearchBarPress}
          placeholderTitle={localized('Search for friends')}
        />
      )}
      <FlatList
        showsVerticalScrollIndicator={false}
        data={friendsData || []}
        renderItem={renderItem}
        keyExtractor={item => item.user.id}
        onEndReached={onListEndReached}
        onEndReachedThreshold={0.3}
        onRefresh={onRefresh}
        refreshing={refreshing}
        ListEmptyComponent={!isLoading && ListEmptyComponent}
      />
      {(isLoading || friendsData == null) && <ActivityIndicator />}
    </View>
  )
}

export default IMFriendsListComponent
