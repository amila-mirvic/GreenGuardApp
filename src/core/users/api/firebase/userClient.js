import firestore from '@react-native-firebase/firestore'
import { firebase } from '@react-native-firebase/firestore'

const usersRef = firestore().collection('users')

export const updateUser = async (userID, newData) => {
  const dataWithOnlineStatus = {
    ...newData,
    isOnline: true,
    lastOnlineTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
  }

  try {
    await usersRef.doc(userID).set({ ...dataWithOnlineStatus }, { merge: true })

    const updatedUserDoc = await usersRef.doc(userID).get()
    const updatedUserData = updatedUserDoc.data()

    return { success: true, user: updatedUserData }
  } catch (error) {
    console.log('updateUser error:', error)
    return {
      success: false,
      error: error?.message || String(error),
    }
  }
}

export const updateOnlineStatus = async userID => {
  try {
    await usersRef.doc(userID).set(
      {
        isOnline: true,
        lastOnlineTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
    return { success: true }
  } catch (error) {
    console.log(error)
    return { success: false, error: error?.message || String(error) }
  }
}

export const updateProfilePhoto = async (userID, profilePictureURL) => {
  try {
    if (!userID) {
      return { success: false, error: 'Missing userID' }
    }

    await usersRef.doc(userID).set(
      {
        profilePictureURL: profilePictureURL ?? null,
      },
      { merge: true },
    )

    return { success: true, profilePictureURL: profilePictureURL ?? null }
  } catch (error) {
    console.log('updateProfilePhoto error:', error)
    return { success: false, error: error?.message || String(error) }
  }
}

export const getUserByID = async userID => {
  try {
    const userDoc = await usersRef.doc(userID).get()
    const userData = userDoc.data()
    return { success: true, user: userData }
  } catch (error) {
    console.log(error)
    return { success: false, error: error?.message || String(error) }
  }
}

export const unsubscribeUserListener = (userID, callback) => {
  return usersRef.doc(userID).onSnapshot(doc => {
    callback(doc.data())
  })
}