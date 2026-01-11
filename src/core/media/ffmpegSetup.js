import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import { Platform } from 'react-native'
import * as FileSystem from 'expo-file-system'

// Create a singleton FFmpeg instance
let ffmpegInstance = null
let isLoading = false
let loadingPromise = null

/**
 * Returns an initialized FFmpeg instance
 * Makes sure we only load FFmpeg once in the app
 */
export const getFFmpeg = async () => {
  if (ffmpegInstance) {
    return ffmpegInstance
  }

  if (isLoading) {
    return loadingPromise
  }

  isLoading = true
  loadingPromise = new Promise(async (resolve, reject) => {
    try {
      console.log('Creating new FFmpeg instance...')
      ffmpegInstance = new FFmpeg()

      console.log('Loading FFmpeg...')
      await ffmpegInstance.load()
      console.log('FFmpeg loaded successfully')

      isLoading = false
      resolve(ffmpegInstance)
    } catch (error) {
      console.error('Failed to load FFmpeg:', error)
      ffmpegInstance = null
      isLoading = false
      reject(error)
    }
  })

  return loadingPromise
}

/**
 * Utility function to check if FFmpeg is loaded and ready
 */
export const isFFmpegLoaded = () => {
  return ffmpegInstance !== null
}

/**
 * Utility function for processing files with FFmpeg
 */
export const processFfmpeg = async (inputPath, outputPath, ffmpegArgs) => {
  try {
    const ffmpeg = await getFFmpeg()

    // Fix Android file path if needed
    let normalizedInput = inputPath
    if (Platform.OS === 'android' && !normalizedInput.includes('file:///')) {
      normalizedInput = `file://${normalizedInput}`
    }

    console.log('Processing with FFmpeg:', normalizedInput)

    // Read input file
    const inputData = await fetchFile(normalizedInput)
    await ffmpeg.writeFile('input.mp4', inputData)

    // Run command
    console.log('Executing FFmpeg with args:', ffmpegArgs)
    await ffmpeg.exec(ffmpegArgs)

    // Read output
    const data = await ffmpeg.readFile('output.mp4')
    const uint8Array = new Uint8Array(data)

    return {
      uint8Array,
      outputPath,
    }
  } catch (error) {
    console.error('Error processing with FFmpeg:', error)
    throw error
  }
}

/**
 * Handle file conversion between formats with FFmpeg
 */
export const convertFile = async (source, destination, format) => {
  try {
    const ffmpeg = await getFFmpeg()

    // Fix path if needed
    let normalizedInput = source
    if (Platform.OS === 'android' && !normalizedInput.includes('file:///')) {
      normalizedInput = `file://${normalizedInput}`
    }

    // Read source file
    const inputData = await fetchFile(normalizedInput)
    await ffmpeg.writeFile('input', inputData)

    // Set conversion arguments based on format
    let args = []

    switch (format.toLowerCase()) {
      case 'mp4':
        args = [
          '-i',
          'input',
          '-c:v',
          'libx264',
          '-preset',
          'fast',
          '-c:a',
          'aac',
          'output.mp4',
        ]
        break
      case 'mp3':
        args = [
          '-i',
          'input',
          '-vn',
          '-ar',
          '44100',
          '-ac',
          '2',
          '-b:a',
          '192k',
          'output.mp3',
        ]
        break
      case 'gif':
        args = [
          '-i',
          'input',
          '-vf',
          'fps=10,scale=320:-1:flags=lanczos',
          'output.gif',
        ]
        break
      default:
        throw new Error(`Unsupported format: ${format}`)
    }

    // Execute conversion
    await ffmpeg.exec(args)

    // Read output
    const data = await ffmpeg.readFile(`output.${format.toLowerCase()}`)
    const uint8Array = new Uint8Array(data)

    return uint8Array
  } catch (error) {
    console.error(`Error converting file to ${format}:`, error)
    throw error
  }
}

export { fetchFile }
