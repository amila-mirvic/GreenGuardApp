import Geolocation from '@react-native-community/geolocation'
import * as Location from 'expo-location'
// import * as Facebook from 'expo-facebook'
import { LoginManager, AccessToken } from 'react-native-fbsdk-next'
import appleAuth, {
  AppleAuthRequestScope,
  AppleAuthRequestOperation,
} from '@invertase/react-native-apple-authentication'
import { GoogleSignin } from '@react-native-google-signin/google-signin'

import { storageAPI } from '../../../media'
import * as authAPI from './authClient'
import { updateUser } from '../../../users'
import { ErrorCode } from '../../api/ErrorCode'

const defaultProfilePhotoURL =
  'https://www.iosapptemplates.com/wp-content/uploads/2019/06/empty-avatar.jpg'

const validateUsernameFieldIfNeeded = (inputFields, appConfig) => {
  return new Promise((resolve, _reject) => {
    const usernamePattern = /^[aA-zZ]\w{3,29}$/

    if (!appConfig.isUsernameFieldEnabled) {
      resolve({ success: true })
      return
    }

    if (
      appConfig.isUsernameFieldEnabled &&
      !inputFields?.hasOwnProperty('username')
    ) {
      return resolve({ error: 'Invalid username' })
    }

    if (!usernamePattern.test(inputFields.username)) {
      return resolve({ error: 'Invalid username' })
    }

    resolve({ success: true })
  })
}

const loginWithEmailAndPassword = (email, password) => {
  return new Promise(function (resolve, _reject) {
    authAPI.loginWithEmailAndPassword(email, password).then(response => {
      if (!response.error) {
        handleSuccessfulLogin({ ...response.user }, false).then(res => {
          resolve({ user: res.user })
        })
      } else {
        resolve({ error: response.error })
      }
    })
  })
}

const createAccountWithEmailAndPassword = (userDetails, appConfig) => {
  const { photoFile } = userDetails

  const accountCreationTask = userData => {
    return new Promise(resolve => {
      authAPI
        .registerWithEmail(userData, appConfig.appIdentifier)
        .then(async response => {
          if (response.error) {
            resolve({ error: response.error })
            return
          }

          // ✅ user kreiran
          const user = response.user

          // ✅ Ako nema slike -> odmah resolve
          if (!photoFile) {
            resolve({
              user: {
                ...user,
                profilePictureURL: defaultProfilePhotoURL,
              },
            })
            return
          }

          // ✅ Ako ima sliku -> upload + update, ali NIKAD ne smije ostati pending
          try {
            const uploadResp = await storageAPI.processAndUploadMediaFile(photoFile)

            // Ako upload API vrati error ili nema URL
            if (uploadResp?.error || !uploadResp?.downloadURL) {
              resolve({
                nonCriticalError: uploadResp?.error || 'PHOTO_UPLOAD_FAILED',
                user: {
                  ...user,
                  profilePictureURL: defaultProfilePhotoURL,
                },
              })
              return
            }

            const downloadURL = uploadResp.downloadURL

            // Pokušaj upisati photo URL u bazu, ali i ako pukne — resolve mora doći
            try {
              await authAPI.updateProfilePhoto(user.id, downloadURL)
              resolve({
                user: {
                  ...user,
                  profilePictureURL: downloadURL,
                },
              })
            } catch (e) {
              console.log('updateProfilePhoto failed:', e)
              resolve({
                nonCriticalError: 'PROFILE_PHOTO_DB_UPDATE_FAILED',
                user: {
                  ...user,
                  // user i dalje dobije sliku u UI, čak i ako DB update nije prošao
                  profilePictureURL: downloadURL,
                },
              })
            }
          } catch (e) {
            console.log('processAndUploadMediaFile threw:', e)
            resolve({
              nonCriticalError: 'PHOTO_UPLOAD_THROWN_ERROR',
              user: {
                ...user,
                profilePictureURL: defaultProfilePhotoURL,
              },
            })
          }
        })
        .catch(e => {
          console.log('registerWithEmail threw:', e)
          resolve({ error: ErrorCode.serverError || 'REGISTER_FAILED' })
        })
    })
  }

  return new Promise(function (resolve, _reject) {
    const userData = {
      ...userDetails,
      profilePictureURL: defaultProfilePhotoURL,
    }

    accountCreationTask(userData).then(response => {
      if (response.error) {
        resolve({ error: response.error })
      } else {
        handleSuccessfulLogin(response.user, true).then(loginResponse => {
          resolve({
            ...loginResponse,
            // proslijedi nonCriticalError ako se desio, da možeš prikazati toast ako želiš
            nonCriticalError: response.nonCriticalError,
          })
        })
      }
    })
  })
}

const retrievePersistedAuthUser = () => {
  return new Promise(resolve => {
    authAPI.retrievePersistedAuthUser().then(user => {
      if (user) {
        handleSuccessfulLogin(user, false).then(res => {
          resolve({ user: res.user })
        })
      } else {
        resolve(null)
      }
    })
  })
}

const sendPasswordResetEmail = email => {
  return new Promise(resolve => {
    authAPI.sendPasswordResetEmail(email)
    resolve()
  })
}

const logout = user => {
  const userData = {
    ...user,
    isOnline: false,
  }
  updateUser(user.id || user.userID, userData)
  authAPI.logout()
}

const loginOrSignUpWithApple = appConfig => {
  return new Promise(async (resolve, _reject) => {
    try {
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: AppleAuthRequestOperation.LOGIN,
        requestedScopes: [
          AppleAuthRequestScope.EMAIL,
          AppleAuthRequestScope.FULL_NAME,
        ],
      })

      const { identityToken, nonce } = appleAuthRequestResponse

      authAPI
        .loginWithApple(identityToken, nonce, appConfig.appIdentifier)
        .then(async response => {
          if (response?.user) {
            const newResponse = {
              user: { ...response.user },
              accountCreated: response.accountCreated,
            }

            handleSuccessfulLogin(newResponse.user, response.accountCreated).then(
              response => {
                resolve({ ...response })
              },
            )
          } else {
            resolve({ error: ErrorCode.appleAuthFailed })
          }
        })
    } catch (error) {
      console.log(error)
      resolve({ error: ErrorCode.appleAuthFailed })
    }
  })
}

const loginOrSignUpWithGoogle = appConfig => {
  GoogleSignin.configure({
    webClientId: appConfig.webClientId,
    iosClientId: appConfig.webClientId,
  })

  return new Promise(async (resolve, _reject) => {
    try {
      const { idToken } = await GoogleSignin.signIn()

      authAPI
        .loginWithGoogle(idToken, appConfig.appIdentifier)
        .then(async response => {
          if (response?.user) {
            const newResponse = {
              user: { ...response.user },
              accountCreated: response.accountCreated,
            }

            handleSuccessfulLogin(newResponse.user, response.accountCreated).then(
              response => {
                resolve({ ...response })
              },
            )
          } else {
            resolve({ error: ErrorCode.googleSigninFailed })
          }
        })
    } catch (error) {
      console.log(JSON.stringify(error))
      resolve({ error: ErrorCode.googleSigninFailed })
    }
  })
}

const loginOrSignUpWithFacebook = appConfig => {
  return new Promise(async (resolve, _reject) => {
    try {
      if (!LoginManager) {
        console.error(
          'LoginManager is null. Facebook SDK might not be initialized.',
        )
        resolve({ error: ErrorCode.fbAuthFailed })
        return
      }

      const result = await LoginManager.logInWithPermissions([
        'public_profile',
        'email',
      ])

      if (result.isCancelled) {
        resolve({ error: ErrorCode.fbAuthCancelled })
      } else {
        const data = await AccessToken.getCurrentAccessToken()

        if (!data) {
          resolve({ error: ErrorCode.fbAuthFailed })
          return
        }

        const { accessToken } = data

        authAPI
          .loginWithFacebook(accessToken, appConfig.appIdentifier)
          .then(async response => {
            if (response?.user) {
              const newResponse = {
                user: { ...response.user },
                accountCreated: response.accountCreated,
              }

              handleSuccessfulLogin(newResponse.user, response.accountCreated).then(
                response => {
                  resolve({ ...response })
                },
              )
            } else {
              resolve({ error: ErrorCode.fbAuthFailed })
            }
          })
      }
    } catch (error) {
      console.error('Facebook login error:', error)
      resolve({ error: ErrorCode.fbAuthFailed })
    }
  })
}

const sendSMSToPhoneNumber = phoneNumber => {
  return authAPI.sendSMSToPhoneNumber(phoneNumber)
}

const onVerification = phone => {
  authAPI.onVerificationChanged(phone)
}

const loginWithSMSCode = (smsCode, verificationID) => {
  return new Promise(function (resolve, _reject) {
    authAPI.loginWithSMSCode(smsCode, verificationID).then(response => {
      if (response.error) {
        resolve({ error: response.error })
      } else {
        handleSuccessfulLogin(response.user, false).then(response => {
          resolve(response)
        })
      }
    })
  })
}

const registerWithPhoneNumber = (
  userDetails,
  smsCode,
  verificationID,
  appIdentifier,
) => {
  console.log(userDetails)
  const { photoFile } = userDetails

  const accountCreationTask = userData => {
    return new Promise(function (resolve, _reject) {
      authAPI
        .registerWithPhoneNumber(userData, smsCode, verificationID, appIdentifier)
        .then(async response => {
          if (response.error) {
            resolve({ error: response.error })
          } else {
            let user = response.user

            if (photoFile) {
              storageAPI
                .processAndUploadMediaFile(photoFile)
                .then(response => {
                  if (response.error) {
                    resolve({
                      nonCriticalError: response.error,
                      user: {
                        ...user,
                        profilePictureURL: defaultProfilePhotoURL,
                      },
                    })
                  } else {
                    authAPI
                      .updateProfilePhoto(user.id, response.downloadURL)
                      .then(_res => {
                        resolve({
                          user: {
                            ...user,
                            profilePictureURL: response.downloadURL,
                          },
                        })
                      })
                      .catch(e => {
                        console.log('updateProfilePhoto failed:', e)
                        resolve({
                          nonCriticalError: 'PROFILE_PHOTO_DB_UPDATE_FAILED',
                          user: {
                            ...user,
                            profilePictureURL: response.downloadURL,
                          },
                        })
                      })
                  }
                })
                .catch(e => {
                  console.log('processAndUploadMediaFile threw:', e)
                  resolve({
                    nonCriticalError: 'PHOTO_UPLOAD_THROWN_ERROR',
                    user: {
                      ...user,
                      profilePictureURL: defaultProfilePhotoURL,
                    },
                  })
                })
            } else {
              resolve({
                user: {
                  ...response.user,
                  profilePictureURL: defaultProfilePhotoURL,
                },
              })
            }
          }
        })
        .catch(e => {
          console.log('registerWithPhoneNumber threw:', e)
          resolve({ error: 'REGISTER_PHONE_FAILED' })
        })
    })
  }

  return new Promise(function (resolve, _reject) {
    const userData = {
      ...userDetails,
      profilePictureURL: defaultProfilePhotoURL,
    }

    accountCreationTask(userData).then(response => {
      if (response.error) {
        resolve({ error: response.error })
      } else {
        handleSuccessfulLogin(response.user, true).then(response => {
          resolve(response)
        })
      }
    })
  })
}

const handleSuccessfulLogin = (user, accountCreated) => {
  return new Promise(resolve => {
    fetchAndStoreExtraInfoUponLogin(user, accountCreated)
      .then(updatedUser => {
        resolve({ user: { ...updatedUser } })
      })
      .catch(() => {
        resolve({ user: { ...user } })
      })
  })
}

const fetchAndStoreExtraInfoUponLogin = async (user, accountCreated) => {
  await authAPI.fetchAndStorePushTokenIfPossible(user)

  return getCurrentLocation().then(async location => {
    const latitude = location?.coords?.latitude
    const longitude = location?.coords?.longitude

    let locationData = {}

    if (latitude && longitude) {
      locationData = {
        location: { latitude, longitude },
      }

      if (accountCreated) {
        locationData = {
          ...locationData,
          signUpLocation: { latitude, longitude },
        }
      }
    }

    // ✅ NAJBITNIJE: ne smijemo pregaziti user doc bez postojeceg profilePictureURL itd.
    const userData = {
      ...user,
      // ✅ cuva profilePictureURL i ostala polja
      ...locationData,
      isOnline: true,
      id: user.id, // (sigurno, za slučaj da updateUser očekuje id u payloadu)
    }

    return updateUser(user.id, userData).then(response => {
      if (response.success) return response.user
      console.error('Error updating user:', response)
      return user
    })
  })
}

const getCurrentLocation = () => {
  return new Promise(async resolve => {
    let { status } = await Location.requestForegroundPermissionsAsync()

    if (status !== 'granted') {
      resolve({ coords: { latitude: '', longitude: '' } })
      return
    }

    Geolocation.getCurrentPosition(
      location => {
        console.log(location)
        resolve(location)
      },
      error => {
        console.log(error)
        // ✅ bitno: ako fail-a geolocation, mora resolve, da ne blokira login flow
        resolve({ coords: { latitude: '', longitude: '' } })
      },
    )
  })
}

const deleteUser = (userID, callback) => {
  authAPI.removeUser(userID).then(response => callback(response))
}

const authManager = {
  validateUsernameFieldIfNeeded,
  retrievePersistedAuthUser,
  loginWithEmailAndPassword,
  sendPasswordResetEmail,
  logout,
  createAccountWithEmailAndPassword,
  deleteUser,
  loginOrSignUpWithApple,
  loginOrSignUpWithFacebook,
  sendSMSToPhoneNumber,
  loginWithSMSCode,
  registerWithPhoneNumber,
  onVerification,
  loginOrSignUpWithGoogle,
}

export default authManager
