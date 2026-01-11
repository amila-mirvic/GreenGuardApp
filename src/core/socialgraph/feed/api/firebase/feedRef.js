import { db, functions } from '../../../../firebase/config'

// feed
export const postsRef = db.collection('posts')
export const hashtagsRef = db.collection('hashtags')
export const socialFeedsRef = db.collection('social_feeds')

// doc collections ref
export const DocRef = id => {
  return {
    // feed
    homeFeedLive: socialFeedsRef.doc(id).collection('home_feed_live'),
    storiesFeedLive: socialFeedsRef.doc(id).collection('stories_feed_live'),
    mainFeed: socialFeedsRef.doc(id).collection('main_feed'),
    profileFeedLive: socialFeedsRef.doc(id).collection('profile_feed_live'),
    commentsLive: postsRef.doc(id).collection('comments_live'),
    post: postsRef.doc(id),
    hashtag: hashtagsRef.doc(id).collection('feed_live'),
  }
}

export const FeedFunctions = () => {
  return {
    // feed
    addPost: functions().httpsCallable('addPost'),
    deletePost: functions().httpsCallable('deletePost'),
    addStory: functions().httpsCallable('addStory'),
    addStoryReaction: functions().httpsCallable('addStoryReaction'),
    listStories: functions().httpsCallable('listStories'),
    listHomeFeedPosts: functions().httpsCallable('listHomeFeedPosts'),
    addReaction: functions().httpsCallable('addReaction'),
    addComment: functions().httpsCallable('addComment'),
    listComments: functions().httpsCallable('listComments'),
    listDiscoverFeedPosts: functions().httpsCallable('listDiscoverFeedPosts'),
    listHashtagFeedPosts: functions().httpsCallable('listHashtagFeedPosts'),
    listProfileFeedPosts: functions().httpsCallable('listProfileFeedPosts'),
    fetchProfile: functions().httpsCallable('fetchProfile'),
  }
}
