/**
 * Local implementation of storage API with proper media processing
 */
import * as FileSystem from 'expo-file-system'
import { processMediaFile } from '../../mediaProcessor'
import { Platform } from 'react-native'
import 'react-native-get-random-values'
import { v4 as uuid } from 'uuid'

const localMediaDir = `${FileSystem.documentDirectory}media/`

// Ensure the media directory exists
const ensureMediaDirExists = async () => {
  try {
    const dirInfo = await FileSystem.getInfoAsync(localMediaDir)
    if (!dirInfo.exists) {
      console.log('[localStorage] Creating media directory:', localMediaDir)
      await FileSystem.makeDirectoryAsync(localMediaDir, {
        intermediates: true,
      })
    } else {
      console.log('[localStorage] Media directory exists:', localMediaDir)
    }
  } catch (error) {
    console.error(
      '[localStorage] Error ensuring media directory exists:',
      error,
    )
    // Try to create it anyway if there was an error checking
    try {
      await FileSystem.makeDirectoryAsync(localMediaDir, {
        intermediates: true,
      })
    } catch (mkdirError) {
      console.error(
        '[localStorage] Failed to create media directory:',
        mkdirError,
      )
    }
  }
}

/**
 * Save a file to local storage and return its URI
 */
const saveFileLocally = async (fileURI, fileType) => {
  try {
    if (!fileURI) {
      console.error(
        '[localStorage] Cannot save file: fileURI is null or undefined',
      )
      return null
    }

    // Check for special cases where fileURI is the same as the output dest (this causes INTERNAL errors)
    if (fileURI?.startsWith(localMediaDir)) {
      console.log(
        '[localStorage] File is already in the local media directory, skipping copy',
      )
      return fileURI
    }

    await ensureMediaDirExists()

    const extension = fileType?.includes('video')
      ? 'mp4'
      : fileType?.includes('image')
        ? 'jpg'
        : 'file'

    const localURI = `${localMediaDir}${uuid()}.${extension}`

    console.log('[localStorage] Copying file from', fileURI, 'to', localURI)

    // Check if source exists
    const sourceInfo = await FileSystem.getInfoAsync(fileURI)
    if (!sourceInfo.exists) {
      console.error('[localStorage] Source file does not exist:', fileURI)
      return null
    }

    // For files in cache directory or with buffer issues, use moveAsync instead of copyAsync
    if (fileURI.includes('ImageManipulator') || fileURI.includes('Caches')) {
      try {
        // First make a copy to a temporary location to avoid INTERNAL errors
        const tempURI = `${FileSystem.cacheDirectory}temp-${uuid()}.${extension}`
        await FileSystem.copyAsync({
          from: fileURI,
          to: tempURI,
        })

        // Then move from temp to final destination
        await FileSystem.moveAsync({
          from: tempURI,
          to: localURI,
        })

        console.log('[localStorage] File saved with move method at:', localURI)
        return localURI
      } catch (moveError) {
        console.error('[localStorage] Move method failed:', moveError)
      }
    }

    // Regular file method as fallback
    try {
      // Regular method with copyAsync
      await FileSystem.copyAsync({
        from: fileURI,
        to: localURI,
      })

      console.log(
        '[localStorage] File saved with copyAsync method at:',
        localURI,
      )

      // Verify the file was saved successfully
      const fileInfo = await FileSystem.getInfoAsync(localURI)
      if (!fileInfo.exists) {
        throw new Error('File was not saved successfully')
      }

      return localURI
    } catch (copyError) {
      console.error('[localStorage] copyAsync method failed:', copyError)

      // Last resort: read/write method
      try {
        const content = await FileSystem.readAsStringAsync(fileURI, {
          encoding: FileSystem.EncodingType.Base64,
        })

        await FileSystem.writeAsStringAsync(localURI, content, {
          encoding: FileSystem.EncodingType.Base64,
        })

        console.log(
          '[localStorage] File saved with readWrite method at:',
          localURI,
        )
        return localURI
      } catch (readWriteError) {
        console.error('[localStorage] All save methods failed:', readWriteError)
        return fileURI // Return original as last resort
      }
    }
  } catch (error) {
    console.error('[localStorage] Error saving file locally:', error)
    return fileURI // Return original URI as fallback
  }
}

/**
 * Process and save a thumbnail safely with specific handling for the INTERNAL error
 */
const processThumbnail = async (thumbnail, mainFileUri) => {
  if (!thumbnail || !thumbnail.uri) {
    console.log('[localStorage] No thumbnail to process')
    return mainFileUri // Return the main file URI as thumbnail
  }

  try {
    console.log('[localStorage] Processing thumbnail:', thumbnail.uri)

    // Check if the thumbnail URI is identical to the main file URI
    if (thumbnail.uri === mainFileUri) {
      console.log(
        '[localStorage] Thumbnail URI is same as main file, returning main file URI',
      )
      return mainFileUri
    }

    // Special handling for cached ImageManipulator files which often cause INTERNAL errors
    if (
      thumbnail.uri.includes('ImageManipulator') ||
      thumbnail.uri.includes('Caches')
    ) {
      try {
        // Create a new file name in the media directory
        const thumbName = `${localMediaDir}thumb-${uuid()}.jpg`

        // Use FileSystem.copyAsync which handles cache files better than readAsStringAsync
        await FileSystem.copyAsync({
          from: thumbnail.uri,
          to: thumbName,
        })

        console.log('[localStorage] Thumbnail copied directly to:', thumbName)
        return thumbName
      } catch (copyError) {
        console.error(
          '[localStorage] Error copying thumbnail directly:',
          copyError,
        )
        // Continue to standard method if direct copy fails
      }
    }

    // Fall back to the standard save method if special handling fails
    const thumbnailUri = await saveFileLocally(thumbnail.uri, 'image/jpeg')
    if (!thumbnailUri) {
      console.log('[localStorage] Failed to save thumbnail, using main file')
      return mainFileUri
    }

    return thumbnailUri
  } catch (error) {
    console.error('[localStorage] Error processing thumbnail:', error)

    // Return the main file URI if thumbnail processing fails
    return mainFileUri
  }
}

/**
 * This method uploads files and calls the callbacks multiple times, providing the progress percentage
 *
 * @param {object} file
 * @param {function} callbackProgress
 * @param {function} callbackSuccess
 * @param {function} callbackError
 */
const processAndUploadMediaFileWithProgressTracking = async (
  file,
  callbackProgress,
  callbackSuccess,
  callbackError,
) => {
  if (!file) {
    callbackError({ error: 'No file provided' })
    return
  }

  try {
    console.log(
      '[localStorage] Starting processAndUploadMediaFileWithProgressTracking for file:',
      file,
    )
    // Simulate progress
    callbackProgress(0.1)

    // Process the file first
    processMediaFile(file, async ({ processedUri, thumbnail }) => {
      try {
        console.log('[localStorage] Media processed:', {
          processedUri,
          thumbnail,
        })
        callbackProgress(0.5)

        if (!processedUri) {
          throw new Error('No processed URI returned from media processor')
        }

        // Save processed file locally
        const localUri = await saveFileLocally(processedUri, file.type)
        if (!localUri) {
          throw new Error('Failed to save processed file locally')
        }

        console.log('[localStorage] Processed file saved at:', localUri)
        callbackProgress(0.8)

        // If it's a video with thumbnail, also save the thumbnail
        let thumbnailUri = null
        if (thumbnail) {
          thumbnailUri = await processThumbnail(thumbnail, localUri)
        }

        callbackProgress(1)
        callbackSuccess({
          downloadURL: localUri,
          thumbnailURL: thumbnailUri || localUri, // Fallback to the main image if no thumbnail
        })
      } catch (error) {
        console.error(
          '[localStorage] Error in processing media file with tracking:',
          error,
        )
        callbackError({ error: 'photoUploadFailed', details: error.message })
      }
    })
  } catch (error) {
    console.error(
      '[localStorage] Error in processing media file with tracking:',
      error,
    )
    callbackError({ error: 'photoUploadFailed', details: error.message })
  }
}

/**
 * processAndUploadMediaFile uploads files without progress tracking
 *
 * @param {object} file an object containing information about the file to be uploaded
 */
const processAndUploadMediaFile = file => {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve({ error: 'No file provided' })
      return
    }

    console.log(
      '[localStorage] Starting processAndUploadMediaFile for file:',
      file,
    )

    try {
      processMediaFile(file, async ({ processedUri, thumbnail }) => {
        try {
          console.log('[localStorage] Media processed:', {
            processedUri,
            thumbnail: thumbnail ? { ...thumbnail, uri: thumbnail.uri } : null,
          })

          if (!processedUri) {
            resolve({ error: 'No processed URI returned from media processor' })
            return
          }

          // Save processed file locally
          const localUri = await saveFileLocally(processedUri, file.type)
          if (!localUri) {
            resolve({ error: 'Failed to save processed file locally' })
            return
          }

          console.log('[localStorage] Processed file saved at:', localUri)

          // Wrap thumbnail processing in try-catch to prevent it from causing failures
          let thumbnailUri = null
          try {
            // Process the thumbnail, passing the main file URI as fallback
            if (thumbnail) {
              thumbnailUri = await processThumbnail(thumbnail, localUri)
              console.log('[localStorage] Thumbnail saved at:', thumbnailUri)
            }
          } catch (thumbError) {
            // Don't let thumbnail errors fail the whole process
            console.error(
              '[localStorage] Thumbnail processing failed:',
              thumbError,
            )
            thumbnailUri = localUri
          }

          // Always use a non-null thumbnailURL
          const finalThumbnailUri = thumbnailUri || localUri

          // Use a timeout to ensure this resolves properly and isn't interrupted
          setTimeout(() => {
            try {
              resolve({
                downloadURL: localUri,
                thumbnailURL: finalThumbnailUri,
              })
            } catch (finalError) {
              console.error(
                '[localStorage] Error in final resolve:',
                finalError,
              )
              resolve({
                downloadURL: localUri,
                thumbnailURL: localUri,
              })
            }
          }, 0)
        } catch (error) {
          console.error('[localStorage] Error in processing media file:', error)

          // Try to resolve with the original file as fallback
          try {
            const originalUri = file.uri || file.path
            resolve({
              downloadURL: originalUri,
              thumbnailURL: originalUri,
              error: 'Error processing media, using original file',
            })
          } catch (fallbackError) {
            resolve({ error: 'photoUploadFailed', details: error.message })
          }
        }
      })
    } catch (error) {
      console.error(
        '[localStorage] Exception in processAndUploadMediaFile:',
        error,
      )
      resolve({ error: 'photoUploadFailed', details: error.message })
    }
  })
}

/**
 * Upload media and return enhanced media object
 */
const uploadMedia = async mediaAsset => {
  if (!mediaAsset) {
    console.error('[localStorage] No media asset provided to uploadMedia')
    return null
  }

  try {
    console.log('[localStorage] Starting uploadMedia for asset:', mediaAsset)
    const response = await processAndUploadMediaFile(mediaAsset)
    console.log('[localStorage] uploadMedia response:', response)

    if (response.error) {
      console.error('[localStorage] Error in uploadMedia:', response.error)
      return null
    }

    return {
      ...mediaAsset,
      downloadURL: response.downloadURL,
      thumbnailURL: response.thumbnailURL ?? response.downloadURL,
      type: mediaAsset.type || mediaAsset.mime || 'image/jpeg',
    }
  } catch (error) {
    console.log('[localStorage] error uploading media', error)
    return null
  }
}

const localStorage = {
  processAndUploadMediaFile,
  processAndUploadMediaFileWithProgressTracking,
  uploadMedia,
  // Export for testing/debugging
  _saveFileLocally: saveFileLocally,
  _processThumbnail: processThumbnail,
}

export default localStorage
