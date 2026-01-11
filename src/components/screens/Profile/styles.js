import { Dimensions, StyleSheet } from 'react-native'

const imageWidth = 110

const dynamicStyles = (theme, appearance) => {
  const colorSet = theme.colors[appearance]
  const windowWidth = Dimensions.get('window').width
  const windowHeight = Dimensions.get('window').height

  return new StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colorSet.grey0,
    },
    subContainer: {
      flex: 1,
      backgroundColor: colorSet.grey0,
      alignItems: 'center',
    },
    userImage: {
      width: imageWidth,
      height: imageWidth,
      borderRadius: Math.floor(imageWidth / 2),
      borderWidth: 0,
    },
    userImageContainer: {
      width: imageWidth,
      height: imageWidth,
      borderWidth: 0,
      margin: 18,
    },
    userImageMainContainer: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    userName: {
      fontSize: 20,
      fontWeight: 'bold',
      textAlign: 'center',
      color: colorSet.primaryText,
      paddingTop: 0,
    },
    profileSettingsButtonContainer: {
      width: '92%',
      height: 40,
      borderRadius: 8,
      backgroundColor: '#F2F1F1',
      marginVertical: 9,
      justifyContent: 'center',
      alignItems: 'center',
    },
    profileSettingsTitle: {
      color: colorSet.primaryForeground,
      fontSize: 13,
      fontWeight: '600',
    },
    friendsTitle: {
      color: colorSet.primaryText,
      fontSize: 20,
      fontWeight: '600',
      alignSelf: 'flex-start',
      padding: 10,
    },
    friendsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'center',
    },
    friendCardContainer: {
      height: Math.floor(windowWidth * 0.26) * 1.3,
      width: Math.floor(windowWidth * 0.26),
      maxWidth: 124,
      maxHeight: 124 * 1.3,
      borderRadius: 10,
      backgroundColor: colorSet.primaryBackground,
      justifyContent: 'flex-start',
      overflow: 'hidden',
      margin: 5,
    },
    friendCardImage: {
      height: '75%',
      width: '100%',
    },
    friendCardTitle: {
      color: colorSet.primaryText,
      fontSize: 13,
      padding: 4,
    },
    subButtonColor: {
      backgroundColor: appearance === 'dark' ? '#1F6A45' : '#F2F1F1',
    },
    titleStyleColor: { color: colorSet.primaryText },
  })
}

export default dynamicStyles
