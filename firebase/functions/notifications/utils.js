const admin = require('firebase-admin')
const axios = require('axios')
const firestore = admin.firestore()
const notificationsRef = firestore.collection('notifications')
const userClient = require('../core/user')

const { fetchUser, updateUser } = userClient

const sendPushNotification = async (
  toUserID,
  titleStr,
  contentStr,
  type,
  metadata = {},
) => {
  try {
    console.log(`sendPushNotification ${toUserID} ${titleStr} ${contentStr}`)

    const toUser = await fetchUser(toUserID)

    // ✅ prvo uvijek spremi notification u bazu
    await saveNotificationsToDB(toUser, titleStr, contentStr, type, metadata)

    const { pushToken } = toUser || {}
    console.log(`pushToken: ${pushToken}`)

    // ✅ ako nema push tokena, notification ipak ostaje u app-u
    if (!pushToken) {
      return null
    }

    let fcmToken = toUser?.fcmToken
    if (!fcmToken || fcmToken.length === 0) {
      fcmToken = await retrieveFCMTokenForPushToken(pushToken)
      console.log(`Retrieved fcmToken: ${fcmToken}`)

      if (fcmToken?.length > 0) {
        await updateUser(toUserID, { fcmToken })
      }
    }

    if (!fcmToken) {
      return null
    }

    const userBadgeCount = await handleUserBadgeCount(toUser)
    console.log(`userBadgeCount: ${userBadgeCount}`)

    const data = {
      message: {
        token: fcmToken,
        notification: {
          title: titleStr,
          body: contentStr,
        },
        apns: {
          payload: {
            aps: {
              badge: userBadgeCount,
            },
          },
        },
      },
    }

    return admin.messaging().send(data.message)
  } catch (e) {
    console.log('Error in sendPushNotification', e)
    return null
  }
}

const handleUserBadgeCount = async user => {
  const newBadgeCount = (user?.badgeCount ?? 0) + 1
  await updateUser(user.id, { badgeCount: newBadgeCount })
  return newBadgeCount
}

const saveNotificationsToDB = async (toUser, title, body, type, metadata) => {
  const notification = {
    toUserID: toUser.id,
    title,
    body,
    metadata,
    toUser,
    type,
    seen: false,
    createdAt: Math.floor(Date.now() / 1000),
  }

  const ref = await notificationsRef.add(notification)
  await notificationsRef.doc(ref.id).update({ id: ref.id })
}

const retrieveFCMTokenForPushToken = async pushToken => {
  const url = 'https://iid.googleapis.com/iid/v1:batchImport'
  const config = {
    headers: {
      Authorization:
        'key=AAAABVjck0Q:APA91bGWI2gEQ-b6i5dGtIgYPl0da2rM10kkfPn1KBPJns9AS_oIM3iq0p1VmYSNeMaIXvs4kevHiHEzs-EpZ05Hs-6RQif5kK2g9uvtHxd9vwcZFw_9Ny125_n09xm52h73sR1GzwUv',
      'Content-Type': 'application/json',
    },
  }

  try {
    const res = await axios.post(
      url,
      {
        apns_tokens: [pushToken],
        application: 'eu.greenguard.rn.ios.demo',
        sandbox: false,
      },
      config,
    )

    console.log(res.data.results)
    return res?.data?.results?.[0]?.registration_token || null
  } catch (e) {
    console.log(`Error in FCM exchange:: ${e}`)
    return null
  }
}

exports.sendPushNotification = sendPushNotification