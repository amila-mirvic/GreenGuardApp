import storage from '@react-native-firebase/storage'
import auth from '@react-native-firebase/auth'

// mali "uuid" bez dependencija (dovoljno dobar za imena fajlova)
function makeId() {
  return (
    Math.random().toString(16).slice(2) +
    Math.random().toString(16).slice(2)
  )
}

const DEFAULT_CONTENT_TYPE = 'image/jpeg'

function extFromContentType(contentType) {
  const ct = String(contentType || '').toLowerCase()

  if (ct.includes('png')) return 'png'
  if (ct.includes('webp')) return 'webp'
  if (ct.includes('heic') || ct.includes('heif')) return 'heic'

  return 'jpg'
}

async function uploadFileToFirebaseStorage({
  localUri,
  userID,
  folder = 'media',
  fileName,
  contentType = DEFAULT_CONTENT_TYPE,
}) {
  if (!localUri) {
    throw new Error('uploadFileToFirebaseStorage: localUri is missing')
  }

  if (!userID) {
    throw new Error('uploadFileToFirebaseStorage: userID is missing')
  }

  const ext = extFromContentType(contentType)
  const safeName =
    fileName || `${Date.now()}_${makeId()}.${ext}`

  const storagePath = `${folder}/${userID}/${safeName}`
  const ref = storage().ref(storagePath)

  await ref.putFile(localUri, {
    contentType,
    cacheControl: 'public,max-age=31536000',
  })

  const downloadURL = await ref.getDownloadURL()

  return {
    downloadURL,
    storagePath,
  }
}

const storageAPI = {
  /**
   * Upload ONE media file (profilna slika + story u ovom projektu).
   * Ovu funkciju poziva više dijelova koda: profile + auth + stories.
   */
  processAndUploadMediaFile: async (fileData, options = {}) => {
    const uid =
      options.userID || auth().currentUser?.uid

    if (!uid) {
      return {
        error:
          'processAndUploadMediaFile: missing userID (not logged in?)',
      }
    }

    const localUri =
      fileData?.uri || fileData?.localUri

    const contentType =
      options.contentType ||
      fileData?.type ||
      fileData?.mimeType ||
      DEFAULT_CONTENT_TYPE

    const folder = options.folder || 'profile'
    const fileName =
      options.fileName ||
      fileData?.fileName ||
      fileData?.filename

    try {
      const main = await uploadFileToFirebaseStorage({
        localUri,
        userID: uid,
        folder,
        fileName,
        contentType,
      })

      const thumbnailUri =
        typeof fileData?.thumbnail === 'string'
          ? fileData.thumbnail
          : fileData?.thumbnail?.uri

      let thumbnailURL = main.downloadURL
      let thumbnailStoragePath = main.storagePath

      if (thumbnailUri) {
        const thumb =
          await uploadFileToFirebaseStorage({
            localUri: thumbnailUri,
            userID: uid,
            folder: `${folder}_thumbs`,
            fileName:
              fileData?.thumbnail?.fileName,
            contentType:
              fileData?.thumbnail?.type ||
              DEFAULT_CONTENT_TYPE,
          })

        thumbnailURL = thumb.downloadURL
        thumbnailStoragePath = thumb.storagePath
      }

      return {
        downloadURL: main.downloadURL,
        downloadKey: main.downloadURL, // kompatibilnost
        storagePath: main.storagePath,
        thumbnailURL,
        thumbnailStoragePath,
      }
    } catch (e) {
      console.log(
        'processAndUploadMediaFile error:',
        e,
      )

      return {
        error: e?.message || 'Upload failed',
      }
    }
  },

  /**
   * Upload MULTIPLE files for posts (postMedia).
   */
  remoteMediaAfterUploadingAllFiles: async ({
    localFiles = [],
    userID,
  }) => {
    const uid =
      userID || auth().currentUser?.uid

    if (!uid) {
      throw new Error(
        'remoteMediaAfterUploadingAllFiles: userID is missing',
      )
    }

    const uploads = (localFiles || []).map(
      async fileData => {
        const localUri = fileData?.uri

        const contentType =
          fileData?.type ||
          fileData?.mimeType ||
          DEFAULT_CONTENT_TYPE

        const thumbnailUri =
          typeof fileData?.thumbnail === 'string'
            ? fileData.thumbnail
            : fileData?.thumbnail?.uri

        const main =
          await uploadFileToFirebaseStorage({
            localUri,
            userID: uid,
            folder: 'posts',
            fileName:
              fileData?.fileName ||
              fileData?.filename,
            contentType,
          })

        let thumbnailURL = main.downloadURL
        let thumbnailStoragePath =
          main.storagePath

        if (thumbnailUri) {
          const thumb =
            await uploadFileToFirebaseStorage({
              localUri: thumbnailUri,
              userID: uid,
              folder: 'posts_thumbs',
              fileName:
                fileData?.thumbnail?.fileName,
              contentType:
                fileData?.thumbnail?.type ||
                DEFAULT_CONTENT_TYPE,
            })

          thumbnailURL = thumb.downloadURL
          thumbnailStoragePath =
            thumb.storagePath
        }

        return {
          ...fileData,
          url: main.downloadURL,
          downloadURL: main.downloadURL,
          thumbnailURL,
          storagePath: main.storagePath,
          thumbnailStoragePath,
          type: contentType,
        }
      },
    )

    return Promise.all(uploads)
  },
}

export default storageAPI
