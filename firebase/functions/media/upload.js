'use strict';

/**
 * POST /uploadMedia
 * multipart/form-data:
 *  - file: (image)
 *  - folder: npr "profile"
 *  - userID: (opcionalno) auth uid ili uid usera, npr "abc123"
 */

const admin = require('firebase-admin');
const functions = require('firebase-functions');
const cors = require('cors')({ origin: true });

const os = require('os');
const path = require('path');
const fs = require('fs');
const Busboy = require('busboy');
const { v4: uuidv4 } = require('uuid');

exports.uploadMedia = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const busboy = Busboy({ headers: req.headers });

      let folder = 'uploads';
      let userID = null;

      let uploadData = null;
      let fileName = null;
      let mimeType = null;

      // Fields (folder, userID)
      busboy.on('field', (fieldname, val) => {
        if (fieldname === 'folder' && val) folder = String(val).trim();
        if (fieldname === 'userID' && val) userID = String(val).trim();
      });

      // File
      busboy.on('file', (fieldname, file, info) => {
        const originalName = info?.filename || 'upload';
        mimeType = info?.mimeType || info?.mimetype || 'application/octet-stream';

        // basic validation
        if (!mimeType.startsWith('image/')) {
          file.resume(); // consume stream
          return;
        }

        const extFromName = originalName.includes('.') ? originalName.split('.').pop() : null;
        const extFromMime = mimeType.includes('/') ? mimeType.split('/').pop() : null;

        const extRaw = (extFromName || extFromMime || 'jpg').toLowerCase();
        const ext = extRaw === 'jpeg' ? 'jpg' : extRaw;

        fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${ext}`;

        const filePath = path.join(os.tmpdir(), fileName);
        uploadData = { filePath, contentType: mimeType };

        file.pipe(fs.createWriteStream(filePath));
      });

      busboy.on('finish', async () => {
        try {
          // If no file was accepted (wrong mimetype or missing)
          if (!uploadData?.filePath || !fileName) {
            return res.status(400).json({ error: 'No valid image received' });
          }

          const token = uuidv4();

          // ✅ bucket (bez hardcode!)
          const bucket = admin.storage().bucket();
          const storageBucketName = bucket.name;

          // destination path
          // npr: profile/<uid>/<filename>  ili uploads/<filename>
          const destination = userID
            ? `${folder}/${userID}/${fileName}`
            : `${folder}/${fileName}`;

          await bucket.upload(uploadData.filePath, {
            destination,
            metadata: {
              contentType: uploadData.contentType,
              metadata: {
                firebaseStorageDownloadTokens: token,
              },
            },
          });

          // cleanup tmp file
          try { fs.unlinkSync(uploadData.filePath); } catch (e) {}

          const encodedPath = encodeURIComponent(destination);
          const downloadURL =
            `https://firebasestorage.googleapis.com/v0/b/${storageBucketName}/o/${encodedPath}` +
            `?alt=media&token=${token}`;

          return res.status(200).json({ downloadURL, storagePath: destination });
        } catch (err) {
          console.error('uploadMedia finish error:', err);
          return res.status(500).json({ error: 'Upload failed' });
        }
      });

      busboy.end(req.rawBody);
    } catch (err) {
      console.error('uploadMedia error:', err);
      return res.status(500).json({ error: 'Upload failed' });
    }
  });
});
