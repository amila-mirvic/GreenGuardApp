export const subscribeToMessages = (channelID, callback) => {
  return DocRef(channelID)
    .messagesLive
    .orderBy('createdAt', 'desc')
    .onSnapshot(
      { includeMetadataChanges: true },
      snapshot => {
        const items = snapshot?.docs?.map(doc => doc.data()) ?? []
        callback && callback(items)
      },
      error => {
        console.log('subscribeToMessages error:', error)
        callback && callback([])
      },
    )
}