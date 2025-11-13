const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import the File model (compiled JS from dist)
const FileModel = require('../dist/models/File').default;

async function cleanupTrashedFiles() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Find files in trash older than 30 days
    const oldTrashedFiles = await FileModel.find({
      isDeleted: true,
      deletedAt: { $lte: cutoff }
    }).select('fileId filePath originalName');

    console.log(`Found ${oldTrashedFiles.length} files to permanently delete from trash...`);

    // Permanently remove them from DB; physical storage cleanup should be handled elsewhere if needed
    const ids = oldTrashedFiles.map(f => f.fileId);
    if (ids.length > 0) {
      const result = await FileModel.deleteMany({ fileId: { $in: ids } });
      console.log(`Permanently removed ${result.deletedCount} files from database.`);
    } else {
      console.log('No files eligible for permanent deletion.');
    }
  } catch (error) {
    console.error('Error during trash cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

cleanupTrashedFiles();


