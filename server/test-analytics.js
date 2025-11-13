const mongoose = require('mongoose');
const express = require('express');

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/secure-file-share').then(async () => {
  const FileModel = mongoose.model('File');
  
  // Find all files
  const allFiles = await FileModel.find({ isDeleted: false });
  console.log('\n=== FILES IN DATABASE ===');
  console.log('Total files:', allFiles.length);
  allFiles.forEach(f => {
    console.log(`- ${f.originalName} (${f.mimeType}) - ${f.fileSize} bytes - Uploaded by: ${f.uploadedBy}`);
  });
  
  if (allFiles.length > 0) {
    const userId = allFiles[0].uploadedBy;
    console.log('\n=== TESTING ANALYTICS FOR USER:', userId, '===');
    
    // Test the aggregation
    const fileTypeBreakdown = await FileModel.aggregate([
      { $match: { uploadedBy: userId, isDeleted: false } },
      {
        $group: {
          _id: '$mimeType',
          count: { $sum: 1 },
          size: { $sum: '$fileSize' }
        }
      },
      { $sort: { size: -1 } }
    ]);
    
    console.log('\nFile Type Breakdown:');
    console.log(JSON.stringify(fileTypeBreakdown, null, 2));
  } else {
    console.log('\nNo files found in database!');
  }
  
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
