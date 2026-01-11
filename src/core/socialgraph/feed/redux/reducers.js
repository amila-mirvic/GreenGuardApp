import IMFeedActionsConstants from './types'

const initialState = {
  mainFeedPosts: null,
  discoverFeedPosts: null,
  feedPostReactions: null,
  currentUserFeedPosts: null,
  locallyDeletedPosts: [],
  mainStories: null,
  didSubscribeToMainFeed: false,
}

export const feed = (state = initialState, action) => {
  switch (action.type) {
    case IMFeedActionsConstants.SET_MAIN_FEED_POSTS:
      return { ...state, mainFeedPosts: [...action.data] }
    case IMFeedActionsConstants.SET_CURRENT_USER_FEED_POSTS:
      return { ...state, currentUserFeedPosts: [...action.data] }
    case IMFeedActionsConstants.SET_LOCALLY_DELETED_POST:
      const postID = action.data.postID
      return {
        ...state,
        locallyDeletedPosts: [...state.locallyDeletedPosts, postID],
        mainFeedPosts: state.mainFeedPosts
          ? state.mainFeedPosts.filter(post => post.id !== postID)
          : null,
        currentUserFeedPosts: state.currentUserFeedPosts
          ? state.currentUserFeedPosts.filter(post => post.id !== postID)
          : null,
        discoverFeedPosts: state.discoverFeedPosts
          ? state.discoverFeedPosts.filter(post => post.id !== postID)
          : null,
      }
    case IMFeedActionsConstants.SET_DISCOVER_FEED_POSTS:
      return { ...state, discoverFeedPosts: [...action.data] }
    case IMFeedActionsConstants.SET_MAIN_FEED_POST_REACTIONS:
      return { ...state, feedPostReactions: [...action.data] }
    case IMFeedActionsConstants.SET_MAIN_STORIES:
      return { ...state, mainStories: [...action.data] }
    case IMFeedActionsConstants.DID_SUBSCRIBE:
      return { ...state, didSubscribeToMainFeed: true }
    case 'LOG_OUT':
      return initialState
    default:
      return state
  }
}
