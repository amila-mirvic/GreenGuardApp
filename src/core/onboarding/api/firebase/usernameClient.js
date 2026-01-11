import firestore from '@react-native-firebase/firestore'

const usernamesRef = firestore().collection('usernames')

// Provjera bez query/list: samo doc.get()
// /usernames/{usernameLower}
export const checkUniqueUsername = async username => {
  try {
    const uname = (username || '').trim().toLowerCase()
    if (!uname) return { error: 'empty_username' }

    const doc = await usernamesRef.doc(uname).get()
    return { taken: doc.exists }
  } catch (error) {
    console.log('[USERNAME] checkUniqueUsername failed:', error)
    return { error }
  }
}
