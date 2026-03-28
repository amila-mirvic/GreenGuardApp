const Constants = {
  liveCollectionCountLimit: 50,
}

exports.getList = async (
  docRef,
  collectionName,
  page,
  limit,
  sortedByDate = false,
) => {
  const liveCollection = docRef.collection(`${collectionName}_live`)
  const historicalCollection = docRef.collection(
    `${collectionName}_historical`,
  )

  if (page === -1) {
    const snapshot = sortedByDate
      ? await liveCollection.orderBy('createdAt', 'desc').get()
      : await liveCollection.get()

    return snapshot?.docs?.map(doc => doc.data()) ?? []
  }

  if (page === 0) {
    const liveSnapshot = sortedByDate
      ? await liveCollection.orderBy('createdAt', 'desc').get()
      : await liveCollection.get()

    const liveItems = liveSnapshot?.docs?.map(doc => doc.data()) ?? []
    const liveIDs = new Set(liveItems.map(item => item?.id).filter(Boolean))

    const historicalSnapshot = sortedByDate
      ? await historicalCollection.orderBy('createdAt', 'desc').get()
      : await historicalCollection.get()

    const historicalItemsRaw =
      historicalSnapshot?.docs?.map(doc => doc.data()) ?? []

    const historicalItems = historicalItemsRaw.filter(
      item => item?.id && !liveIDs.has(item.id),
    )

    const combined = [...liveItems, ...historicalItems]

    return typeof limit === 'number' && limit > 0
      ? combined.slice(0, limit)
      : combined
  }

  const historicalOffset = page * limit - limit
  const safeOffset = Math.max(0, historicalOffset)

  const historicalQuery =
    sortedByDate === false
      ? historicalCollection.offset(safeOffset).limit(limit)
      : historicalCollection
          .orderBy('createdAt', 'desc')
          .offset(safeOffset)
          .limit(limit)

  const snapshot = await historicalQuery.get()
  return snapshot?.docs?.map(doc => doc.data()) ?? []
}

exports.add = async (docRef, collectionName, data, sortedByDate = false) => {
  const liveCollection = docRef.collection(`${collectionName}_live`)
  const historicalCollection = docRef.collection(`${collectionName}_historical`)

  const liveData = await liveCollection.get()
  const liveDataDocs = liveData?.docs ?? []

  const res = await liveCollection.doc(data.id).get()
  if (res?.exists) {
    await liveCollection.doc(data.id).set(data, { merge: true })
    return
  }

  const hRes = await historicalCollection.doc(data.id).get()
  if (hRes?.exists) {
    await historicalCollection.doc(data.id).set(data, { merge: true })
    return
  }

  await liveCollection.doc(data.id).set(data)

  if (liveDataDocs.length > Constants.liveCollectionCountLimit) {
    let sortedDocs = liveDataDocs

    if (sortedByDate) {
      sortedDocs = [...liveDataDocs].sort((a, b) => {
        const aData = a.data()
        const bData = b.data()
        return (bData?.createdAt || 0) - (aData?.createdAt || 0)
      })
    }

    const docsToMove = sortedDocs.slice(Constants.liveCollectionCountLimit)

    const promises = docsToMove.map(async doc => {
      const docData = doc.data()
      await historicalCollection.doc(doc.id).set(docData)
      await liveCollection.doc(doc.id).delete()
    })

    await Promise.all(promises)
  }
}

exports.get = async (docRef, collectionName, id) => {
  const liveCollection = docRef.collection(`${collectionName}_live`)
  const doc = await liveCollection.doc(id).get()
  if (doc?.exists) {
    return doc.data()
  }

  const historicalCollection = docRef.collection(`${collectionName}_historical`)
  const hDoc = await historicalCollection.doc(id).get()
  if (hDoc?.exists) {
    return hDoc.data()
  }
  return null
}

exports.getCount = async (docRef, collectionName) => {
  const liveCollection = docRef.collection(`${collectionName}_live`)
  const snapshot = await liveCollection.get()
  const liveCount = snapshot?.docs?.length || 0

  const historicalCollection = docRef.collection(`${collectionName}_historical`)
  const hSnapshot = await historicalCollection.get()
  const historicalCount = hSnapshot?.docs?.length || 0
  return liveCount + historicalCount || 0
}

exports.getDoc = async (docRef, collectionName, id) => {
  const liveCollection = docRef.collection(`${collectionName}_live`)
  const doc = await liveCollection.doc(id).get()
  if (doc?.exists) {
    return doc
  }

  const historicalCollection = docRef.collection(`${collectionName}_historical`)
  const hDoc = await historicalCollection.doc(id).get()
  if (hDoc?.exists) {
    return hDoc
  }
  return null
}

exports.remove = async (docRef, collectionName, id, sortedByDate = false) => {
  const liveCollection = docRef.collection(`${collectionName}_live`)
  const historicalCollection = docRef.collection(`${collectionName}_historical`)

  const doc = await historicalCollection.doc(id).get()
  if (doc.exists) {
    await historicalCollection.doc(id).delete()
  } else {
    const liveDoc = await liveCollection.doc(id).get()
    if (liveDoc.exists) {
      await liveCollection.doc(id).delete()

      const entry =
        sortedByDate === false
          ? await historicalCollection.limit(1).get()
          : await historicalCollection
              .orderBy('createdAt', 'desc')
              .limit(1)
              .get()

      if (entry?.docs?.length > 0) {
        const entryData = entry.docs[0].data()
        const promoteDoc = entry.docs[0]
        await liveCollection.doc(promoteDoc.id).set(entryData)
        await historicalCollection.doc(promoteDoc.id).delete()
      }
    }
  }

  await liveCollection.doc(id).delete()
  await historicalCollection.doc(id).delete()
}

exports.deleteCollection = async (db, collectionRef) => {
  const query = collectionRef.limit(Constants.liveCollectionCountLimit)
  await deleteQueryBatch(db, query)
}

const deleteQueryBatch = async (db, query) => {
  const snapshot = await query.get()

  const batchSize = snapshot.size
  if (batchSize === 0) {
    return
  }

  const batch = db.batch()
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref)
  })
  await batch.commit()

  process.nextTick(() => {
    deleteQueryBatch(db, query)
  })
}