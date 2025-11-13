const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import the SecureLink model
const SecureLinkModel = require('../dist/models/SecureLink').default;

async function cleanupExpiredLinks() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find and update expired links
    const result = await SecureLinkModel.updateMany(
      { 
        expiresAt: { $lt: new Date() },
        isActive: true 
      },
      { 
        isActive: false 
      }
    );

    console.log(`Cleanup completed: ${result.modifiedCount} expired links deactivated`);

    // Also clean up links that have reached their access limit
    const accessLimitResult = await SecureLinkModel.updateMany(
      { 
        $expr: { 
          $and: [
            { $ne: ['$maxAccessCount', null] },
            { $gte: ['$accessCount', '$maxAccessCount'] },
            { $eq: ['$isActive', true] }
          ]
        }
      },
      { 
        isActive: false 
      }
    );

    console.log(`Access limit cleanup: ${accessLimitResult.modifiedCount} links deactivated`);

  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the cleanup
cleanupExpiredLinks();
