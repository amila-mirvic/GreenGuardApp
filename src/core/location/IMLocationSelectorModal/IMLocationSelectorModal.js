import React, { useState, useEffect, useLayoutEffect } from 'react'
import { Modal, View, SafeAreaView, Button, Platform } from 'react-native'
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete'
import MapView, { Marker } from 'react-native-maps'
import * as Location from 'expo-location'
import { useTheme } from '../../dopebase'
import dynamicStyles from './styles'

const locationDelta = { latitudeDelta: 0.0922, longitudeDelta: 0.0421 }
const defaultGoogleApiKey = 'AIzaSyABq2WJNGXFZC2u-_9Z9SjWovSdmTe29ko'

function IMLocationSelectorModal(props) {
  const { onCancel, isVisible, onChangeLocation, onDone, apiKey, navigation } =
    props
  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)

  const [region, setRegion] = useState({
    latitude: 37.7749,
    longitude: -122.4194,
  })
  const [address, setAddress] = useState(' ')

  useLayoutEffect(() => {
    navigator.geolocation = require('@react-native-community/geolocation')
  }, [navigation])

  useEffect(() => {
    getCurrentPosition()
  }, [])

  const getCurrentPosition = () => {
    Location.getCurrentPositionAsync()
      .then(position => {
        const newRegion = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }
        setRegion(newRegion)
        onLocationChange(newRegion)
      })
      .catch(error => {
        console.log(error.message)
      })
  }

  const onLocationChange = async location => {
    try {
      let json = await Location.reverseGeocodeAsync({
        latitude: location.latitude,
        longitude: location.longitude,
      })

      const choosenIndex = Math.floor(json.length * 0.8)
      const formatted_address = `${json[choosenIndex].city}, ${json[choosenIndex].region}.`
      setAddress(formatted_address)
      onChangeLocation(formatted_address)
    } catch (error) {
      console.log(error)
      setAddress('')
    }
  }

  const setLocationDetails = (data, details) => {
    if (details?.geometry?.location) {
      const newRegion = {
        latitude: details.geometry.location.lat,
        longitude: details.geometry.location.lng,
      }
      setRegion(newRegion)
      return newRegion
    }
    return null
  }

  const onMapMarkerDragEnd = location => {
    const newRegion = {
      latitude: location.nativeEvent.coordinate.latitude,
      longitude: location.nativeEvent.coordinate.longitude,
    }
    setRegion(newRegion)
    onLocationChange(newRegion)
  }

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={isVisible}
      onRequestClose={onCancel}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.containerWrapper}>
          <View style={styles.navBarContainer}>
            <View style={styles.leftButtonContainer}>
              <Button
                title={'Cancel'}
                style={styles.buttonText}
                onPress={onCancel}
              />
            </View>
            <View style={styles.navBarTitleContainer} />
            <View style={styles.rightButtonContainer}>
              <Button
                title={'Done'}
                style={styles.buttonText}
                onPress={() => onDone(address)}
              />
            </View>
          </View>
          <GooglePlacesAutocomplete
            placeholder={'Enter location address'}
            minLength={2}
            autoFocus={false}
            returnKeyType={'search'}
            keyboardAppearance={'light'}
            listViewDisplayed="auto"
            fetchDetails={true}
            renderDescription={row => row.description}
            onPress={(data, details = null) => {
              const { formatted_address } = details
              setAddress(formatted_address)
              const newRegion = setLocationDetails(data, details)
              if (newRegion) {
                onLocationChange(newRegion)
              }
            }}
            getDefaultValue={() => ''}
            query={{
              key: apiKey || defaultGoogleApiKey,
              language: 'en',
            }}
            styles={{
              container: styles.placesAutocompleteContainer,
              textInputContainer: styles.placesAutocompleteTextInputContainer,
              textInput: styles.placesAutocompleteTextInput,
              description: styles.placesAutocompletedDescription,
              predefinedPlacesDescription: styles.predefinedPlacesDescription,
              poweredContainer: styles.predefinedPlacesPoweredContainer,
            }}
            nearbyPlacesAPI="GooglePlacesSearch"
            GoogleReverseGeocodingQuery={{}}
            GooglePlacesSearchQuery={{
              rankby: 'distance',
            }}
            GooglePlacesDetailsQuery={{
              fields: 'formatted_address,geometry',
            }}
            filterReverseGeocodingByTypes={[
              'locality',
              'administrative_area_level_3',
            ]}
            debounce={200}
          />
          <MapView
            provider={'google'}
            style={styles.mapContainer}
            region={{
              ...region,
              ...locationDelta,
            }}
          >
            <Marker
              draggable={true}
              onDragEnd={onMapMarkerDragEnd}
              coordinate={region}
            />
          </MapView>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

export default IMLocationSelectorModal
