import { AppRegistry } from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

console.log('RN Firebase auth currentUser:', auth().currentUser);
console.log('RN Firebase firestore app:', firestore().app?.name);

import React, { useEffect } from 'react'
import { LogBox } from 'react-native'
import { Provider } from 'react-redux'
import SplashScreen from 'react-native-splash-screen'

import storage from '@react-native-firebase/storage'

import {
  DopebaseProvider,
  extendTheme,
  TranslationProvider,
  ActionSheetProvider,
} from './core/dopebase'
import configureStore from './redux/store'
import AppContent from './AppContent'
import translations from './translations/'
import { ConfigProvider } from './config'
import { AuthProvider } from './core/onboarding/hooks/useAuth'
import { ProfileAuthProvider } from './core/profile/hooks/useProfileAuth'
import { authManager } from './core/onboarding/api'
import InstamobileTheme from './theme'

const store = configureStore()

const App = () => {
  const theme = extendTheme(InstamobileTheme)

  useEffect(() => {
    SplashScreen.hide()
    LogBox.ignoreAllLogs(true)

    // ---- Firebase Storage debug (VIDI U KONZOLI / LOGCAT-u) ----
    try {
      const opts = storage().app?.options
      console.log('FIREBASE PROJECT:', opts?.projectId)
      console.log('FIREBASE BUCKET :', opts?.storageBucket)

      // Ovo samo testira da li Storage uopšte "diše"
      const ref = storage().ref('debug/healthcheck.txt')
      console.log('STORAGE REF OK:', ref.fullPath)
    } catch (e) {
      console.log('STORAGE DEBUG ERROR:', e)
    }
    // -----------------------------------------------------------
  }, [])

  return (
    <Provider store={store}>
      <TranslationProvider translations={translations}>
        <DopebaseProvider theme={theme}>
          <ConfigProvider>
            <AuthProvider authManager={authManager}>
              <ProfileAuthProvider authManager={authManager}>
                <ActionSheetProvider>
                  <AppContent />
                </ActionSheetProvider>
              </ProfileAuthProvider>
            </AuthProvider>
          </ConfigProvider>
        </DopebaseProvider>
      </TranslationProvider>
    </Provider>
  )
}

export default App
