const mongoose = require('mongoose');

async function testConnection(uri, label) {
  console.log(`\nTesting connection (${label}):\n${uri}`);
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log(`✅ SUCCESS! Connected to MongoDB (${label})`);
    await mongoose.disconnect();
  } catch (error) {
    console.log(`❌ FAILED to connect (${label})`);
    console.log(`Error: ${error.message}`);
  }
}

async function main() {
  const uriLegacy = "mongodb://gopichand:nani%40123@ac-klnlewt-shard-00-00.ymax6z0.mongodb.net:27017,ac-klnlewt-shard-00-01.ymax6z0.mongodb.net:27017,ac-klnlewt-shard-00-02.ymax6z0.mongodb.net:27017/audittrail?ssl=true&replicaSet=atlas-klnlewt-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster-2";
  await testConnection(uriLegacy, "Legacy MongoDB String");
}

main();
