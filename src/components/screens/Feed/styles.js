import { StyleSheet } from 'react-native'

const dynamicStyles = (theme, appearance) => {
  const colorSet = theme.colors[appearance]

  return new StyleSheet.create({
    feedContainer: {
      flex: 1,
      backgroundColor: colorSet.grey0,
    },
    emptyStateView: {
      marginTop: 50,
    },
  })
}

export default dynamicStyles
