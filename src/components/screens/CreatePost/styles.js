import { StyleSheet, Dimensions } from 'react-native'

const height = Dimensions.get('window').height

const mentionItemContainerHeight = Math.floor(height * 0.066)
const mentionPhotoSize = Math.floor(mentionItemContainerHeight * 0.66)

const dynamicStyles = (theme, appearance) => {
  const colorSet = theme.colors[appearance]

  return new StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colorSet.primaryBackground,
    },
    topContainer: {
      flex: 1,
    },
    headerContainer: {
      flexDirection: 'row',
      height: 80,
    },
    postInputContainer: {
      flex: 1,
    },
    userIconContainer: {
      width: 60,
      height: 60,
      borderRadius: 30,
    },
    userIcon: {
      width: 54,
      height: 54,
      borderRadius: Math.floor(54 / 2),
    },
    titleContainer: {
      marginTop: 19,
    },
    title: {
      color: colorSet.primaryText,
      fontSize: 15,
      fontWeight: '600',
    },
    subtitle: {
      color: colorSet.primaryText,
      fontSize: 10,
    },
    postInputContainer: {
      flex: 6,
      alignItems: 'center',
    },
    postInput: {
      height: '90%',
      width: '90%',
      color: colorSet.primaryText,
      textAlignVertical: 'top',
      //
      // borderWidth: 0,
    },
    bottomContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colorSet.primaryBackground,
    },
    blankBottom: {
      height: 20,
    },
    postImageAndLocationContainer: {
      width: '100%',
      backgroundColor: colorSet.grey0,
      paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    },
    //users mention container
    usersMentionContainer: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colorSet.grey0,
    },
    usersMentionScrollContainer: {
      flex: 1,
    },
    mentionItemContainer: {
      width: ' 100%',
      height: mentionItemContainerHeight,
      alignSelf: 'center',
      padding: 10,
      alignItems: 'center',
      flexDirection: 'row',
    },
    mentionPhotoContainer: {
      flex: 0.8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    mentionPhoto: {
      height: mentionPhotoSize,
      borderRadius: mentionPhotoSize / 2,
      width: mentionPhotoSize,
    },
    mentionNameContainer: {
      flex: 6,
      height: '100%',
      justifyContent: 'center',
      borderBottomColor: colorSet.hairlineColor,
      borderBottomWidth: 0.5,
    },
    mentionName: {
      color: colorSet.primaryText,
      fontWeight: '400',
    },
    //
    imagesContainer: {
      width: '100%',
      marginBottom: 23,
    },
    imageItemcontainer: {
      width: 65,
      height: 65,
      margin: 3,
      marginTop: 5,
      borderRadius: 9,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'grey',
      overflow: 'hidden',
    },
    imageItem: {
      width: '100%',
      height: '100%',
    },
    addImageIcon: {
      width: '50%',
      height: '50%',
    },
    addTitleAndlocationIconContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
    },
    addTitleContainer: {
      flex: 5.8,
      justifyContent: 'center',
    },
    addTitle: {
      color: colorSet.primaryText,
      fontSize: 13,
      padding: 8,
    },
    iconsContainer: {
      flex: 3,
      flexDirection: 'row',
      justifyContent: 'center',
    },
    iconContainer: {
      height: 50,
      width: 50,
      marginHorizontal: 2,
    },
    icon: {
      height: 23,
      width: 23,
    },
    imageBackground: {
      backgroundColor: colorSet.primaryForeground,
    },
    cameraFocusTintColor: {
      tintColor: colorSet.primaryForeground,
    },
    cameraUnfocusTintColor: {
      tintColor: colorSet.primaryText,
    },
    pinpointTintColor: {
      tintColor: colorSet.primaryText,
    },
  })
}

export default dynamicStyles
