import React from 'react'
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native'
import { Searchbar } from 'react-native-paper'
import { useTheme, useTranslations } from '../../dopebase'
import dynamicStyles from './styles'

export default function SearchBar(props) {
  const {
    onChangeText,
    onSearchBarCancel,
    onSearch,
    searchRef,
    placeholder,
    searchContainerStyle,
  } = props
  const { localized } = useTranslations()
  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)
  const colorSet = theme.colors[appearance] || {}

  const [searchText, setSearchText] = React.useState('')

  const onSearchTextChange = text => {
    setSearchText(text)
    onChangeText(text)
  }

  const onCancel = () => {
    setSearchText('')
    onSearchBarCancel()
  }

  return (
    <View style={[styles.container, searchContainerStyle]}>
      <Searchbar
        ref={searchRef}
        placeholder={placeholder || localized('Search for friends')}
        value={searchText}
        onChangeText={onSearchTextChange}
        onIconPress={onSearch}
        onSubmitEditing={onSearch}
        style={styles.searchInput}
        icon="magnify"
        clearIcon="close"
        onClear={onCancel}
        // ↓↓↓ ZELENE NIJANSE
        theme={{ colors: { primary: colorSet.primaryForeground || '#1F6A45' } }}
        iconColor={colorSet.primaryForeground || '#1F6A45'}
        // Custom “Cancel” dugme desno, zelene boje:
        right={() => (
          <TouchableOpacity onPress={onCancel} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ color: colorSet.primaryForeground || '#1F6A45', fontSize: 16 }}>
              {localized('Cancel')}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderRadius: 8,
  },
})
