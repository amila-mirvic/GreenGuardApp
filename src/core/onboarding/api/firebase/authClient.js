import auth from '@react-native-firebase/auth'
import firestore from '@react-native-firebase/firestore'

import { ErrorCode } from '../ErrorCode'
import { getUnixTimeStamp } from '../../../helpers/timeFormat'
import { checkUniqueUsername } from './usernameClient'

const usersRef = firestore().collection('users')
const usernamesRef = firestore().collection('usernames')

// -------------------------
// Helpers
// -------------------------

const normalizeUsername = username => (username || '').trim().toLowerCase()

const mapAuthErrorToErrorCode = error => {
  const code = error?.code || ''

  if (code.includes('auth/email-already-in-use')) return ErrorCode.emailInUse
  if (code.includes('auth/invalid-email')) return ErrorCode.badEmailFormat
  if (code.includes('auth/weak-password')) return ErrorCode.invalidPassword
  if (code.includes('auth/invalid-credential')) return ErrorCode.noUser
  if (code.includes('auth/user-not-found')) return ErrorCode.noUser
  if (code.includes('auth/wrong-password')) return ErrorCode.invalidPassword
  if (code.includes('auth/too-many-requests')) return ErrorCode.rateLimited

  return ErrorCode.serverError
}

const buildUserDataFromDoc = (uid, docData, fallbackAuthUser) => {
  const safe = docData || {}
  // Ensure these exist so UI never prints "undefined"
  const firstName = safe.firstName ?? ''
  const lastName = safe.lastName ?? ''

  return {
    ...safe,
    id: uid,
    userID: uid,
    email: safe.email ?? fallbackAuthUser?.email ?? '',
    phone: safe.phone ?? fallbackAuthUser?.phoneNumber ?? '',
    firstName,
    lastName,
  }
}

// -------------------------
// Auth: Persisted session
// -------------------------

export const retrievePersistedAuthUser = () => {
  return new Promise(async resolve => {
    try {
      const current = auth().currentUser
      if (!current) {
        resolve(null)
        return
      }

      const uid = current.uid
      const userDoc = await usersRef.doc(uid).get()
      const userData = buildUserDataFromDoc(uid, userDoc.data(), current)

      resolve(userData)
    } catch (e) {
      console.log('[AUTH] retrievePersistedAuthUser error:', e)
      resolve(null)
    }
  })
}

// -------------------------
// Auth: Email/Password
// -------------------------

export const loginWithEmailAndPassword = (email, password) => {
  return new Promise(async resolve => {
    try {
      const authResp = await auth().signInWithEmailAndPassword(email, password)
      const uid = authResp?.user?.uid

      if (!uid) {
        resolve({ error: ErrorCode.serverError })
        return
      }

      const userDoc = await usersRef.doc(uid).get()
      const userData = buildUserDataFromDoc(uid, userDoc.data(), authResp.user)
      resolve({ user: userData })
    } catch (error) {
      console.log('[AUTH] loginWithEmailAndPassword error:', error)
      resolve({ error: mapAuthErrorToErrorCode(error) })
    }
  })
}

export const sendPasswordResetEmail = email => {
  return auth().sendPasswordResetEmail(email)
}

export const logout = () => {
  return auth().signOut()
}

// -------------------------
// Auth: Registration (Email)
// -------------------------

/**
 * Registers an account (Firebase Auth) + creates Firestore profile (users/{uid})
 * + reserves a username (usernames/{usernameLower}).
 *
 * IMPORTANT: This function is written to ALWAYS resolve (never hang), so the
 * Signup screen never gets stuck in an infinite loader.
 */
export const registerWithEmail = (userDetails, _appIdentifier) => {
  return new Promise(async resolve => {
    try {
      const {
        email,
        password,
        firstName,
        lastName,
        username,
        phone,
        profilePictureURL,
        location,
        signUpLocation,
      } = userDetails || {}

      const uname = normalizeUsername(username)

      // Optional username check (kept because the UI still collects a username)
      if (uname) {
        const usernameCheck = await checkUniqueUsername(uname)
        if (usernameCheck?.taken) {
          resolve({ error: ErrorCode.usernameInUse })
          return
        }
        if (usernameCheck?.error) {
          resolve({ error: ErrorCode.serverError })
          return
        }
      }

      // 1) Create Firebase Auth user
      const authResp = await auth().createUserWithEmailAndPassword(
        String(email || '').trim(),
        String(password || ''),
      )

      const uid = authResp?.user?.uid
      if (!uid) {
        resolve({ error: ErrorCode.serverError })
        return
      }

      // 2) Create Firestore user profile
      const timestamp = getUnixTimeStamp()
      const userData = {
        id: uid,
        userID: uid,
        email: String(email || '').trim(),
        phone: phone || '',
        firstName: firstName || '',
        lastName: lastName || '',
        username: uname || '',
        profilePictureURL: profilePictureURL || '',
        createdAt: timestamp,
        ...(location ? { location } : {}),
        ...(signUpLocation ? { signUpLocation } : {}),
      }

      await usersRef.doc(uid).set(userData, { merge: true })

      // 3) Reserve username (if provided)
      if (uname) {
        try {
          await usernamesRef.doc(uname).set(
            {
              uid,
              createdAt: timestamp,
            },
            { merge: false },
          )
        } catch (e) {
          // If username reservation fails (race condition / permissions), rollback
          console.log('[AUTH] username reservation failed. Rolling back...', e)
          try {
            await usersRef.doc(uid).delete()
          } catch (e2) {}
          try {
            await authResp.user.delete()
          } catch (e3) {}

          resolve({ error: ErrorCode.usernameInUse })
          return
        }
      }

      resolve({ user: userData })
    } catch (error) {
      console.log('[AUTH] registerWithEmail error:', error)

      // Best-effort rollback if we managed to create an auth user but failed later.
      try {
        const current = auth().currentUser
        if (current?.uid) {
          if (mapAuthErrorToErrorCode(error) === ErrorCode.serverError) {
            await usersRef.doc(current.uid).delete().catch(() => {})
            await current.delete().catch(() => {})
          }
        }
      } catch (e) {}

      resolve({ error: mapAuthErrorToErrorCode(error) })
    }
  })
}

// -------------------------
// Phone Auth (not used in your email signup bugfix)
// -------------------------

export const onVerificationChanged = _phone => {
  // optional hook in some templates
}

export const sendSMSToPhoneNumber = async (_phoneNumber, _captchaVerifier) => {
  return { error: ErrorCode.smsNotSent }
}

export const loginWithSMSCode = async (_smsCode, _verificationID) => {
  return { error: ErrorCode.invalidSMSCode }
}

// -------------------------
// Push token (no-op in this repo)
// -------------------------

export const fetchAndStorePushTokenIfPossible = async _user => {
  return
}

// -------------------------
// Account removal
// -------------------------

export const removeUser = userID => {
  return new Promise(async resolve => {
    try {
      if (userID) {
        await usersRef.doc(userID).delete().catch(() => {})
      }
      const current = auth().currentUser
      if (current) {
        await current.delete()
      }
      resolve({ success: true })
    } catch (e) {
      console.log('[AUTH] removeUser error:', e)
      resolve({ success: false, error: e?.message || String(e) })
    }
  })
}
