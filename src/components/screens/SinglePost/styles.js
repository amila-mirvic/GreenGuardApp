import { Dimensions, StyleSheet, Platform } from 'react-native'

const dynamicStyles = (theme, appearance) => {
  const colorSet = theme.colors[appearance]
  const windowWidth = Dimensions.get('window').width

  return StyleSheet.create({
    singlePostContainer: {
      flex: 1,
      backgroundColor: colorSet.primaryBackground,
    },
    commentItemContainer: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      marginVertical: 2,
      minWidth: Platform.OS === 'web' ? 468 : Math.floor(windowWidth * 0.71),
    },
    commentItemImageContainer: {
      flex: 1,
      alignItems: 'center',
    },
    commentItemImage: {
      height: 36,
      width: 36,
      borderRadius: 18,
      marginVertical: 5,
      marginLeft: 5,
    },
    commentItemBodyContainer: {
      flex: 5,
    },
    commentItemBodyRadiusContainer: {
      width: '71%',
      padding: 7,
      borderRadius: 13,
      margin: 5,
      backgroundColor: colorSet.grey0,
    },
    commentItemBodyTitle: {
      fontSize: 12,
      fontWeight: '500',
      color: colorSet.primaryText,
      paddingVertical: 3,
      paddingLeft: 8,
      lineHeight: 12,
    },
    commentItemBodySubtitle: {
      fontSize: 12,
      color: colorSet.primaryText,
      paddingVertical: 3,
      paddingLeft: 8,
    },
    commentInputContainer: {
      backgroundColor: colorSet.grey0,
      flexDirection: 'row',
      width: '100%',
      height: 60,
      justifyContent: 'center',
      alignItems: 'center',
    },
    commentTextInputContainer: {
      flex: 6,
      backgroundColor: colorSet.primaryBackground,
      color: colorSet.primaryText,
      height: '90%',
      width: '90%',
      marginLeft: 8,
      justifyContent: 'center',
    },
    commentTextInput: {
      padding: 8,
      color: colorSet.primaryText,
    },
    commentInputIconContainer: {
      flex: 0.7,
      justifyContent: 'center',
      marginLeft: 8,
    },
    commentInputIcon: {
      height: 22,
      width: 22,
      tintColor: colorSet.primaryForeground,
    },
  })
}

export default dynamicStyles
