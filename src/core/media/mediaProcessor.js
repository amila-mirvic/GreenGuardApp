import { Platform } from 'react-native'
import * as FileSystem from 'expo-file-system'
import * as VideoThumbnails from 'expo-video-thumbnails'
import * as ImageManipulator from 'expo-image-manipulator'
import 'react-native-get-random-values'
import { v4 as uuid } from 'uuid'
import { getFFmpeg, processFfmpeg, fetchFile } from './ffmpegSetup'

const BASE_DIR = `${FileSystem.cacheDirectory}expo-cache/`

// Checks if given directory exists. If not, creates it
async function ensureDirExists(givenDir) {
  const dirInfo = await FileSystem.getInfoAsync(givenDir)
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(givenDir, { intermediates: true })
  }
}

export const downloadFile = async (file, fileName) => {
  try {
    await ensureDirExists(BASE_DIR)
    const fileUri = `${BASE_DIR}${fileName}`
    const info = await FileSystem.getInfoAsync(fileUri)
    const { exists, uri } = info

    if (exists) {
      return { uri }
    }

    const downloadResumable = FileSystem.createDownloadResumable(file, fileUri)

    return downloadResumable.downloadAsync()
  } catch (error) {
    console.error('Error downloading file:', error)
    return { uri: null }
  }
}

const compressVideo = async sourceUri => {
  // On iOS, videos are already compressed, so we just return the original
  if (Platform.OS === 'ios' || Platform.OS === 'web') {
    return new Promise(resolve => {
      console.log("no compression needed, as it's iOS or web")
      resolve(sourceUri)
    })
  }

  FileSystem.getInfoAsync(sourceUri).then(fileInfo => {
    console.log(
      'compressing video of initial size ' +
        fileInfo.size / (1024 * 1024) +
        'M',
    )
    console.log(sourceUri)
  })

  await ensureDirExists(BASE_DIR)

  const processedUri = `${BASE_DIR}${uuid()}.mp4`

  try {
    const ffmpegArgs = [
      '-i',
      'input.mp4',
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-crf',
      '28',
      '-c:a',
      'aac',
      '-strict',
      'experimental',
      'output.mp4',
    ]

    const { uint8Array } = await processFfmpeg(
      sourceUri,
      processedUri,
      ffmpegArgs,
    )

    // Save the file to the file system
    await FileSystem.writeAsStringAsync(processedUri, uint8Array.toString(), {
      encoding: FileSystem.EncodingType.Base64,
    })

    const fileInfo = await FileSystem.getInfoAsync(processedUri)
    console.log(
      'compressed video to size ' + fileInfo.size / (1024 * 1024) + 'M',
    )
    console.log(processedUri)

    return processedUri
  } catch (error) {
    console.error('Error compressing video:', error)
    return sourceUri // Fallback to original if compression fails
  }
}

const createThumbnailFromVideo = async videoUri => {
  console.log('[createThumbnailFromVideo] Starting with URI:', videoUri)

  // Normalize URI for Android
  let processedUri = videoUri
  if (Platform.OS === 'android' && !processedUri.includes('file:///')) {
    processedUri = `file://${processedUri}`
  }

  console.log('[createThumbnailFromVideo] Normalized URI:', processedUri)

  if (Platform.OS === 'web') {
    console.log('[createThumbnailFromVideo] Web platform not supported')
    return null
  }

  try {
    // First check if the video file exists
    const fileInfo = await FileSystem.getInfoAsync(processedUri)
    if (!fileInfo.exists) {
      console.error(
        '[createThumbnailFromVideo] Video file does not exist:',
        processedUri,
      )
      return null
    }

    console.log(
      '[createThumbnailFromVideo] Video file exists, size:',
      (fileInfo.size / (1024 * 1024)).toFixed(2) + 'MB',
    )

    // Try to generate a thumbnail with improved options
    const thumbnailResult = await VideoThumbnails.getThumbnailAsync(
      processedUri,
      {
        time: 1000, // Get thumbnail at 1 second
        quality: 0.8, // Higher quality
        headers: {
          // Add any necessary headers for remote videos
        },
      },
    )

    console.log(
      '[createThumbnailFromVideo] Thumbnail generated:',
      thumbnailResult,
    )

    // Further process the thumbnail to ensure it's not black
    // Sometimes resizing can help with black thumbnail issues
    const processedThumbnail = await ImageManipulator.manipulateAsync(
      thumbnailResult.uri,
      [{ resize: { width: 480 } }], // Resize to standard width
      { format: ImageManipulator.SaveFormat.JPEG, compress: 0.9 },
    )

    console.log(
      '[createThumbnailFromVideo] Processed thumbnail:',
      processedThumbnail,
    )

    // Add a fileName property for compatibility with other parts of the app
    return {
      ...processedThumbnail,
      fileName: `thumbnail-${uuid()}.jpg`,
      width: processedThumbnail.width,
      height: processedThumbnail.height,
      type: 'image/jpeg',
    }
  } catch (error) {
    console.error('[createThumbnailFromVideo] Error creating thumbnail:', error)

    // Try an alternative approach using FFmpeg if available
    try {
      console.log(
        '[createThumbnailFromVideo] Attempting thumbnail generation with FFmpeg',
      )

      await ensureDirExists(BASE_DIR)
      const thumbnailPath = `${BASE_DIR}thumbnail-${uuid()}.jpg`

      // Use FFmpeg to extract a frame
      const ffmpeg = await getFFmpeg()

      // Read the video file
      const videoData = await fetchFile(processedUri)
      await ffmpeg.writeFile('input.mp4', videoData)

      // Extract a frame at 1 second
      await ffmpeg.exec([
        '-i',
        'input.mp4',
        '-ss',
        '00:00:01.000',
        '-frames:v',
        '1',
        '-q:v',
        '2',
        'output.jpg',
      ])

      // Read the thumbnail
      const data = await ffmpeg.readFile('output.jpg')
      const uint8Array = new Uint8Array(data)

      // Save to file system
      await FileSystem.writeAsStringAsync(
        thumbnailPath,
        uint8Array.toString(),
        {
          encoding: FileSystem.EncodingType.Base64,
        },
      )

      console.log(
        '[createThumbnailFromVideo] FFmpeg thumbnail generated at:',
        thumbnailPath,
      )

      // Get the image dimensions
      const thumbnailInfo = await ImageManipulator.manipulateAsync(
        thumbnailPath,
        [],
        { format: ImageManipulator.SaveFormat.JPEG },
      )

      return {
        uri: thumbnailPath,
        width: thumbnailInfo.width,
        height: thumbnailInfo.height,
        fileName: `thumbnail-${uuid()}.jpg`,
        type: 'image/jpeg',
      }
    } catch (ffmpegError) {
      console.error(
        '[createThumbnailFromVideo] FFmpeg thumbnail generation failed:',
        ffmpegError,
      )

      // Return a fallback colored thumbnail with default dimensions
      // Create a simple colored thumbnail as a last resort
      return await createFallbackThumbnail()
    }
  }
}

// Create a simple colored thumbnail as fallback for React Native
const createFallbackThumbnail = async () => {
  try {
    console.log('[createFallbackThumbnail] Creating fallback thumbnail')
    await ensureDirExists(BASE_DIR)
    const thumbnailPath = `${BASE_DIR}fallback-thumbnail-${uuid()}.jpg`

    // Use ImageManipulator to create a solid color image
    // Create a small transparent image first (1x1 pixel)
    const transparent1x1 =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

    // Save this to a temp file
    const tempPath = `${BASE_DIR}temp-1x1-${uuid()}.png`
    await FileSystem.writeAsStringAsync(
      tempPath,
      transparent1x1.split(',')[1],
      {
        encoding: FileSystem.EncodingType.Base64,
      },
    )

    // Then use ImageManipulator to create a blue rectangle
    const result = await ImageManipulator.manipulateAsync(
      tempPath,
      [{ resize: { width: 480, height: 360 } }],
      {
        format: ImageManipulator.SaveFormat.JPEG,
        compress: 1,
        backgroundColor: '#3498db', // This gives us a blue background
      },
    )

    console.log(
      '[createFallbackThumbnail] Fallback thumbnail created at:',
      result.uri,
    )

    // Try to clean up the temp file
    try {
      await FileSystem.deleteAsync(tempPath)
    } catch (e) {
      console.log('[createFallbackThumbnail] Could not delete temp file:', e)
    }

    return {
      uri: result.uri,
      width: result.width,
      height: result.height,
      fileName: `fallback-thumbnail-${uuid()}.jpg`,
      type: 'image/jpeg',
    }
  } catch (error) {
    console.error('[createFallbackThumbnail] Error creating fallback:', error)

    // As a very last resort, return an object with just the essential properties
    return {
      uri: null,
      width: 480,
      height: 360,
      fileName: `thumbnail-${uuid()}.jpg`,
      type: 'image/jpeg',
    }
  }
}

const resizeImage = async ({ image }, callback) => {
  const imagePath = image?.path || image?.uri

  ImageManipulator.manipulateAsync(imagePath, [], {
    compress: 0.7,
    format: ImageManipulator.SaveFormat.JPEG,
  })
    .then(newSource => {
      if (newSource) {
        callback(newSource.uri)
      }
    })
    .catch(err => {
      console.log('error resizing image', err)
      callback(imagePath)
    })
}

/**
 * This function takes a media file object as the first argument and callback function as the second argument.
 * The media file object can either be a photo object or a video object.
 * If the media file is a photo object, this function resizes the photo and calls the callback function with an object of a processed uri.
 * If the media file is a video object, this function compresses the video file and creates a thumbnail from the compressed file. Then
 * calls the callback function with an object of a processed uri and thumbnail uri.
 * @param {object} file
 * @param {function} callback
 */
export const processMediaFile = (file, callback) => {
  const { type, uri, path } = file
  const fileSource = uri || path

  const includesVideo = type?.includes('video')
  if (includesVideo) {
    compressVideo(fileSource).then(async processedUri => {
      // Ensure some delay before generating the thumbnail to allow video processing to complete
      setTimeout(async () => {
        try {
          const thumbnail = await createThumbnailFromVideo(processedUri)
          console.log('[processMediaFile] Thumbnail generated:', thumbnail)
          // Add safeguard: Make sure thumbnail isn't the same as the video
          if (thumbnail && thumbnail.uri === processedUri) {
            console.warn(
              '[processMediaFile] Thumbnail URI is same as video URI - creating fallback thumbnail',
            )
            // Create an alternative thumbnail to avoid INTERNAL error
            try {
              const tempThumb = await createFallbackThumbnail()
              callback({
                thumbnail: tempThumb,
                processedUri,
              })
            } catch (fallbackError) {
              console.error(
                '[processMediaFile] Failed to create fallback thumbnail:',
                fallbackError,
              )
              callback({
                processedUri,
                thumbnail: null,
              })
            }
          } else {
            callback({
              thumbnail,
              processedUri,
            })
          }
        } catch (error) {
          console.error(
            '[processMediaFile] Error in thumbnail generation:',
            error,
          )
          callback({
            processedUri,
            thumbnail: null,
          })
        }
      }, 500) // Add a small delay to ensure video is fully processed
    })
    return
  }

  const includesImage = type?.includes('image')
  if (includesImage) {
    resizeImage({ image: file }, processedUri => {
      callback({ processedUri })
    })
    return
  }
  callback({ processedUri: fileSource })
}

export const blendVideoWithAudio = async (
  { videoStream, audioStream, videoRate },
  callback,
) => {
  try {
    if (!videoStream) {
      console.error('[blendVideoWithAudio] No video stream provided')
      callback(null)
      return
    }

    if (!audioStream) {
      console.log(
        '[blendVideoWithAudio] No audio stream provided, returning original video',
      )
      callback(videoStream)
      return
    }

    await ensureDirExists(BASE_DIR)
    const processedUri = `${BASE_DIR}${uuid()}.mp4`

    // Get FFmpeg instance
    const ffmpeg = await getFFmpeg()

    // Read input files
    const videoData = await fetchFile(videoStream)
    const audioData = await fetchFile(audioStream)

    // Write input files to FFmpeg's virtual file system
    await ffmpeg.writeFile('video.mp4', videoData)
    await ffmpeg.writeFile('audio.mp3', audioData)

    // Build command based on whether videoRate is provided
    const args = videoRate
      ? [
          '-i',
          'video.mp4',
          '-i',
          'audio.mp3',
          '-filter:v',
          `setpts=PTS/${videoRate}`,
          '-map',
          '0:v:0',
          '-map',
          '1:a:0',
          '-shortest',
          'output.mp4',
        ]
      : [
          '-i',
          'video.mp4',
          '-i',
          'audio.mp3',
          '-map',
          '0:v:0',
          '-map',
          '1:a:0',
          '-shortest',
          'output.mp4',
        ]

    console.log('blendVideoWithAudio command ', args.join(' '))

    // Execute the FFmpeg command
    await ffmpeg.exec(args)

    // Read the output file
    const data = await ffmpeg.readFile('output.mp4')

    // Save the file to the file system
    const uint8Array = new Uint8Array(data)
    await FileSystem.writeAsStringAsync(processedUri, uint8Array.toString(), {
      encoding: FileSystem.EncodingType.Base64,
    })

    callback(processedUri)
  } catch (error) {
    console.error('Error blending video with audio:', error)
    // Return original video if blending fails
    callback(videoStream || null)
  }
}
