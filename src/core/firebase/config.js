import app from '@react-native-firebase/app'
import fauth from '@react-native-firebase/auth'
import ffirestore from '@react-native-firebase/firestore'
import ffunctions from '@react-native-firebase/functions'

console.log('🔥 Firebase options:', app().options)
console.log('🔥 projectId:', app().options?.projectId)
console.log('🔥 storageBucket:', app().options?.storageBucket)

export const db = ffirestore()
export const auth = fauth
export const firestore = ffirestore
export const functions = ffunctions

// Ako negdje koristiš direktan URL za upload funkciju, mora biti isti projekat kao aplikacija:
export const uploadMediaFunctionURL =
  'https://us-central1-greenguard-5be6a.cloudfunctions.net/uploadMedia'
