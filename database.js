
//Auto Generated from MongoDB Atlas
const { MongoClient, ServerApiVersion } = require('mongodb');
const {dbConnString} = require('./config.json');
const { getAllPuzzlesInCollection } = require('./OGS.js')
// Create a MongoClient with a MongoClientOptions object to set the Stable API version


async function rundb() {
  const dbclient = new MongoClient(dbConnString, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });

  try {
    // Connect the client to the server	(optional starting in v4.7)
    await dbclient.connect();
    // Send a ping to confirm a successful connection
    await dbclient.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    return dbclient;
  } catch (error) {
    console.log(error);
    // Ensures that the client will close when you finish/error
    await dbclient.close();
  }
  
}


async function ensureAllServersExist(client) {
  const database = client.dbconn.db('Puzzle_Bot');
  const serversCollection = database.collection('servers');

  // Get the list of guilds and loop through each checking if they exist
  const guilds = client.guilds.cache//.each((guild) => {
  
  for(const [, guild] of guilds){
    const existingServer =  await serversCollection.findOne({ serverId : guild.id });

    if (!existingServer) {
      console.log(`Server ${guild.id} does not exist. Creating...`);
      
      await serversCollection.insertOne({
        'serverId' : guild.id,
        'name' : guild.name,  
        'puzzle_queue' : [],
        'approved_collections': []
      });
    }
  }
}

async function getServerName(client, guildID){
  const clientdb = await client.dbconn.db("Puzzle_Bot");
  const serverColl = await clientdb.collection("servers");

  const activePuzzleServer = await serverColl.findOne({
    "serverId": guildID
  })

  return activePuzzleServer?.name;
}

async function getUsersActiveStones(client, userID) {  
  const clientdb = await client.dbconn.db("Puzzle_Bot");
  const userColl = await clientdb.collection("users");
  
  const activePuzzle = await userColl.findOne({
      "userId": userID,
      "guilds.active": 1
  }, {
      projection: {
          "guilds.$": 1
      }
  });
  
  return activePuzzle?.guilds?.[0]?.active_moves;
}

async function addUserActiveStone(client,userID,stoneToAdd){
  const clientdb = client.dbconn.db("Puzzle_Bot");
  const userColl = clientdb.collection("users");

  userColl.updateOne({
    "userId" : userID,
    "guilds.active" : 1
  },{
    $push: {
      "guilds.$.active_moves" : stoneToAdd
    }
  });
}

async function removeLastUserStone(client,userID){
  const clientdb = client.dbconn.db("Puzzle_Bot");
  const userColl = clientdb.collection("users");

  userColl.updateOne({
    "userId" : userID,
    "guilds.active" : 1
  },{
    $pop: {
      "guilds.$.active_moves" : 1
    }
  });
}

async function getActivePuzzleID(client, userID = "",guildID=""){
  const clientdb = await client.dbconn.db("Puzzle_Bot");
  if(userID != ""){

    const userColl = await clientdb.collection("users");
    const activePuzzle = await userColl.findOne({
      "userId" : userID,
      "guilds.active" : 1
    },{
      projection : {
        "guilds.$" : 1
      }
    });
    guildID = activePuzzle?.guilds?.[0].guildId;
  }

  const serverColl = await clientdb.collection("servers");

  const activePuzzleServer = await serverColl.findOne({
    "serverId": guildID
  })

  return activePuzzleServer?.puzzle_queue[0];
}

async function resetUserActiveMoves(client,userID){
  const clientdb = await client.dbconn.db("Puzzle_Bot");
  const userColl = await clientdb.collection("users");

  await userColl.updateOne(
    { 
        "userId" : userID,
        "guilds.active": 1 
    },
    {
        $set: {
            "guilds.$.active_moves": []
        }
    }
);
}

//sets active moves to [], tires to 0 and in progress to 0, and active to 0
async function resetPuzzle(client, guildId) {
  const clientdb = await client.dbconn.db("Puzzle_Bot");
  const userColl = await clientdb.collection("users");

  await userColl.updateMany(
    { "guilds.guildId": guildId },
    {
        $set: {
            "guilds.$.active_moves": [],
            "guilds.$.tries": 0,
            "guilds.$.active": 0,
            "guilds.$.in_progress": 0,
            "guilds.$.solved": false,
        }
    }
);
}

async function getServerQueue(client,guildId){
  const clientdb = await client.dbconn.db("Puzzle_Bot");
  const serverColl = await clientdb.collection("servers");

  const server = await serverColl.findOne(
    { serverId: guildId },
  );
  return server.puzzle_queue;
}

async function getServerApprovedCollections(client,guildId){
  const clientdb = await client.dbconn.db("Puzzle_Bot");
  const serverColl = await clientdb.collection("servers");

  const server = await serverColl.findOne(
    { serverId: guildId },
  );
  return server.approved_collections;
}

async function moveQueue(client,guildId){
  const clientdb = await client.dbconn.db("Puzzle_Bot");
  const serverColl = await clientdb.collection("servers");

  await serverColl.updateOne(
    { serverId: guildId },
    { $pop: { puzzle_queue: -1 } }  // -1 removes first element, 1 would remove last element
);
}

async function getActiveServerName(client,userID){
  const clientdb = await client.dbconn.db("Puzzle_Bot");
  const userColl = await clientdb.collection("users");

  const activePuzzle = await userColl.findOne({
    "userId" : userID,
    "guilds.active" : 1
  },{
    projection : {
      "guilds.$" : 1
    }
  });

  const activeGuild = activePuzzle?.guilds?.[0].guildId;

  const serverColl = await clientdb.collection("servers");

  const activePuzzleServer = await serverColl.findOne({
    "serverId": activeGuild
  })

  return activePuzzleServer?.name;
}

async function incrementTries(client,userID){
  const clientdb = await client.dbconn.db("Puzzle_Bot");
  const userColl = await clientdb.collection("users");

  await userColl.updateOne(
    { 
        "userId" : userID,
        "guilds.active": 1 
    },
    {
        $inc: {
            "guilds.$.tries": 1
        }
    }
);
}

async function incrementScore(client,userID){
  const clientdb = await client.dbconn.db("Puzzle_Bot");
  const userColl = await clientdb.collection("users");

  await userColl.updateOne(
    { 
        "userId" : userID,
        "guilds.active": 1 
    },
    {
        $inc: {
            "guilds.$.score": 1,
            "guilds.$.all_time_score": 1
        }
    }
);
}

async function checkSolved(client,userID){
  const clientdb = await client.dbconn.db("Puzzle_Bot");
  const userColl = await clientdb.collection("users");

  const activePuzzle = await userColl.findOne({
    "userId" : userID,
    "guilds.active" : 1
  },{
    projection : {
      "guilds.$" : 1
    }
  });

  return activePuzzle.guilds[0].solved;
}

async function setSolved(client,userID,solved = false){
  const clientdb = await client.dbconn.db("Puzzle_Bot");
  const userColl = await clientdb.collection("users");

  await userColl.updateOne(
    { 
        "userId" : userID,
        "guilds.active": 1 
    },
    {
        $set: {
            "guilds.$.solved": solved
        }
    }
);
}

async function getInProgessPuzzles(client,userID){
  const clientdb = client.dbconn.db("Puzzle_Bot");
  const userColl = clientdb.collection("users");

  // First, find the user document
  const user = await userColl.findOne({ userId: userID });

  // Then count inprogress puzzles using chained operations:
  const inProgressPuzzles = user?.guilds?.filter(g => g.in_progress === 1);

  //get guild names of inprogress puzzles and add it to the active puzzle array
  const serverColl = clientdb.collection("servers");

  for(const item of inProgressPuzzles){
      const guild = await serverColl.findOne({
          serverId : item.guildId
      });
      item.guildName = guild.name;
  }

  return inProgressPuzzles;
}

async function getScores(client,guildID){
  const clientdb = client.dbconn.db("Puzzle_Bot");
  const userColl = clientdb.collection("users");

  const userArray =  await userColl.aggregate([
    // Unwind the guilds array to work with individual guild documents
    { $unwind: "$guilds" },
    
    // Match only the specific guild we want
    { $match: { "guilds.guildId": guildID } },
    
    // Project only the fields we need
    { $project: {
        userId: 1,
        score: "$guilds.score"
    }}
  ]).toArray();

  return userArray;
}


async function nextPuzzle(client,guildId){
  const queue = await getServerQueue(client,guildId);

  if(queue.length <= 1){
    const approvedCollections = await getServerApprovedCollections(client,guildId);
    if(approvedCollections == null || approvedCollections.length == 0){
        throw new Error("No puzzle in queue! Please add one with /add_puzzle, or add a back-up collection with" +
            " /collection add <collection name>");
    }
    
    collectionId = approvedCollections[Math.floor(Math.random() * approvedCollections.length)];
    const puzzles = await getAllPuzzlesInCollection(collectionId);

    const puzzle = puzzles[Math.floor(Math.random() * puzzles.length)];

    const clientdb = client.dbconn.db("Puzzle_Bot");
    const coll = clientdb.collection("servers");

    await coll.updateOne(
        {serverId : guildId},
        {
            $push: {
                puzzle_queue: puzzle.id
            }
        }
    );

    resetPuzzle(client,guildId);

    //edge case
    if(queue.length >= 1){
        await moveQueue(client,guildId);
    }
    
    return "No puzzles in queue; using random approved collection!";
  }
  
  resetPuzzle(client,guildId);
  await moveQueue(client,guildId);

  return "Server moved to next puzzle!";
}

async function resetLeaderboard(client,guildId){
  const clientdb = client.dbconn.db("Puzzle_Bot");
  const userColl = clientdb.collection("users");

  await userColl.updateMany({
      "guilds.guildId": guildId
    },
    { $set :{ "guilds.$.score": 0} }
  );

  // Find all users who have solved puzzles in this guild
  const usersWithSolvedPuzzles = await userColl.find({
    "guilds": {
      $elemMatch: {
        "guildId": guildId,
        "solved": true
      }
    }
  }).toArray();

  // Update each user individually to set their score to 1
  for (const user of usersWithSolvedPuzzles) {
    await userColl.updateOne({ 
        "userId": user.userId,
        "guilds.guildId": guildId
      },
      { $set: { "guilds.$.score": 1 } }
    );
  }
}


module.exports = {
  ensureAllServersExist,
  rundb,
  getUsersActiveStones,
  addUserActiveStone,
  getActivePuzzleID,
  resetPuzzle,
  moveQueue,
  resetUserActiveMoves,
  getActiveServerName,
  getServerName,
  removeLastUserStone,
  incrementTries,
  incrementScore,
  checkSolved,
  setSolved,
  getServerQueue,
  getInProgessPuzzles,
  getScores,
  getServerApprovedCollections,
  nextPuzzle,
  resetLeaderboard
};
