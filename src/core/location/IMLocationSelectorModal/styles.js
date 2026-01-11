import { StyleSheet, Platform, Dimensions } from 'react-native'

const { height: screenHeight } = Dimensions.get('window')
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 40 : 0
const HEADER_HEIGHT = 60

const dynamicStyles = (theme, appearance) => {
  const colorSet = theme.colors[appearance]

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colorSet.primaryBackground,
    },
    containerWrapper: {
      backgroundColor: colorSet.primaryBackground,
      maxWidth: 1024,
      height: '100%',
      width: '100%',
      alignSelf: 'center',
    },
    navBarContainer: {
      flexDirection: 'row',
      position: 'absolute',
      justifyContent: 'space-between',
      alignItems: 'center',
      top: 0,
      height: HEADER_HEIGHT,
      width: '100%',
      paddingHorizontal: 15,
      backgroundColor: colorSet.primaryBackground,
      zIndex: 2,
      borderBottomWidth: 1,
      borderBottomColor: colorSet.hairline,
    },
    navBarTitleContainer: {
      flex: 2,
    },
    leftButtonContainer: {
      flex: 1,
      alignItems: 'flex-start',
    },
    rightButtonContainer: {
      flex: 1,
      alignItems: 'flex-end',
    },
    buttonText: {
      fontSize: 16,
      color: colorSet.primaryForeground,
      fontWeight: '600',
    },
    // GooglePlacesAutocomplete
    placesAutocompleteContainer: {
      position: 'absolute',
      top: HEADER_HEIGHT,
      left: 0,
      right: 0,
      height: screenHeight * 0.4,
      backgroundColor: colorSet.primaryBackground,
      zIndex: 1,
    },
    placesAutocompleteTextInputContainer: {
      width: '100%',
      backgroundColor: colorSet.hairline,
      borderBottomWidth: 1,
      borderTopWidth: 1,
      borderColor: colorSet.hairline,
      padding: 10,
    },
    placesAutocompleteTextInput: {
      height: 40,
      backgroundColor: colorSet.primaryBackground,
      color: colorSet.primaryText,
      fontSize: 16,
      paddingHorizontal: 10,
    },
    placesAutocompletedDescription: {
      fontWeight: '400',
      color: colorSet.secondaryText,
    },
    predefinedPlacesDescription: {
      color: colorSet.secondaryText,
    },
    predefinedPlacesPoweredContainer: {
      backgroundColor: colorSet.primaryBackground,
    },
    mapContainer: {
      position: 'absolute',
      top: HEADER_HEIGHT + screenHeight * 0.4,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colorSet.grey0,
    },
  })
}

export default dynamicStyles
