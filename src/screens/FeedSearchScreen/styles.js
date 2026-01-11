import { StyleSheet } from 'react-native'

const dynamicStyles = (theme, appearance) => {
  const colorSet = theme.colors[appearance]

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colorSet.primaryBackground,
    },
    searchBarContainer: {
      width: '100%',
      paddingVertical: 5,
      marginTop: 45,
      borderBottomWidth: 0.5,
      borderBottomColor: colorSet.hairlineColor,
    },
  })
}

export default dynamicStyles
