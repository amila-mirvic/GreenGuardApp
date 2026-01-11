import { useCallback } from 'react'
import {
  addPost as addPostAPI,
  deletePost as deletePostAPI,
} from './firebaseFeedClient'
import { storageAPI } from '../../../../media'

export const usePostMutations = () => {
  const addPost = async (postData, localMediaFiles, author) => {
    if (postData && localMediaFiles?.length === 0) {
      const result = await addPostAPI(postData, author)
      return result
    }

    const postMedia = await remoteMediaAfterUploadingAllFiles(localMediaFiles)
    const result = await addPostAPI({ ...postData, postMedia }, author)
    return result
  }

  const deletePost = useCallback(async (postID, userID) => {
    try {
      // Call the API to delete the post
      const result = await deletePostAPI(postID, userID)

      // Return an object with success flag instead of null
      return { success: true }
    } catch (error) {
      return {
        error: error.message || 'An error occurred while deleting the post',
      }
    }
  }, [])

  const remoteMediaAfterUploadingAllFiles = async localMediaFiles => {
    const promises = localMediaFiles?.map(async media => {
      try {
        const response = await storageAPI.processAndUploadMediaFile(media)
        return {
          url: response.downloadURL,
          thumbnailURL: response.thumbnailURL ?? response.downloadURL,
          type: media.type || media.mime || 'image/jpeg',
        }
      } catch (error) {
        console.error('Error uploading media file:', error)
        return null
      }
    })

    // Wait for all uploads to complete
    const results = await Promise.all(promises)

    // Filter out any failed uploads
    return results.filter(item => item !== null)
  }

  return {
    addPost,
    deletePost,
  }
}
