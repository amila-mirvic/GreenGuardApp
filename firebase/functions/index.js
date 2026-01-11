'use strict';

const admin = require('firebase-admin');

// ✅ FIX: ispravan bucket (kod tebe u logu: greenguard-5be6a.firebasestorage.app)
admin.initializeApp({
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'greenguard-5be6a.firebasestorage.app',
});

const triggers = require('./triggers');

const media = require('./media/upload');
exports.uploadMedia = media.uploadMedia;

// social graph
const socialGraph = require('./socialgraph/socialgraph');
exports.add = socialGraph.add;
exports.unfriend = socialGraph.unfriend;
exports.unfollow = socialGraph.unfollow;
exports.fetchFriends = socialGraph.fetchFriends;
exports.fetchFriendships = socialGraph.fetchFriendships;
exports.fetchOtherUserFriendships = socialGraph.fetchOtherUserFriendships;
exports.searchUsers = socialGraph.searchUsers;

// user reporting
const userReporting = require('./user-reporting/user-reporting');
const { onReportWrite } = require('./user-reporting/triggers');
exports.fetchBlockedUsers = userReporting.fetchBlockedUsers;
exports.markAbuse = userReporting.markAbuse;
exports.unblockUser = userReporting.unblockUser;
exports.onReportWrite = onReportWrite;

// chat
const chat = require('./chat/chat');
exports.fetchMessagesOfFormerParticipant = chat.fetchMessagesOfFormerParticipant;
exports.listMessages = chat.listMessages;
exports.insertMessage = chat.insertMessage;

exports.deleteMessage = chat.deleteMessage;
exports.createChannel = chat.createChannel;
exports.markAsRead = chat.markAsRead;
exports.markUserAsTypingInChannel = chat.markUserAsTypingInChannel;
exports.addMessageReaction = chat.addMessageReaction;
exports.updateGroup = chat.updateGroup;
exports.leaveGroup = chat.leaveGroup;
exports.deleteGroup = chat.deleteGroup;

exports.listChannels = chat.listChannels;

// feed
const feed = require('./feed/functions');
exports.addPost = feed.addPost;
exports.deletePost = feed.deletePost;
exports.addStory = feed.addStory;
exports.addStoryReaction = feed.addStoryReaction;
exports.addReaction = feed.addReaction;
exports.addComment = feed.addComment;
exports.listHomeFeedPosts = feed.listHomeFeedPosts;
exports.listProfileFeedPosts = feed.listProfileFeedPosts;
exports.listDiscoverFeedPosts = feed.listDiscoverFeedPosts;
exports.listStories = feed.listStories;
exports.listComments = feed.listComments;
exports.fetchProfile = feed.fetchProfile;
exports.listHashtagFeedPosts = feed.listHashtagFeedPosts;

const feedTriggers = require('./feed/triggers');
exports.onCanonicalPostWrite = feedTriggers.onCanonicalPostWrite;
exports.onCanonicalStoryWrite = feedTriggers.onCanonicalStoryWrite;

const notifiction = require('./notifications/notifications');
exports.listNotifications = notifiction.listNotifications;
exports.updateNotification = notifiction.updateNotification;

// Production triggers
exports.propagateUserProfileUpdates = triggers.propagateUserProfileUpdates;

/* INSERT_FIREBASE_FUNCTION */
