


async function nextPuzzle(client, guildId) {
  const queue = await getServerQueue(client, guildId);

  if (queue.length <= 1) {
    const approvedCollections = await getServerApprovedCollections(client, guildId);
    if (approvedCollections == null || approvedCollections.length == 0) {
      throw new Error("No puzzle in queue! Please add one with /add_puzzle, or add a back-up collection with" +
        " /collection add <collection name>");
    }

    collectionId = approvedCollections[Math.floor(Math.random() * approvedCollections.length)];
    const puzzles = await getAllPuzzlesInCollection(collectionId);

    const puzzle = puzzles[Math.floor(Math.random() * puzzles.length)];

    const clientdb = client.dbconn.db("Puzzle_Bot");
    const coll = clientdb.collection("servers");

    await coll.updateOne(
      { serverId: guildId },
      {
        $push: {
          puzzle_queue: puzzle.id
        }
      }
    );

    resetPuzzle(client, guildId);

    //edge case
    if (queue.length >= 1) {
      await moveQueue(client, guildId);
    }

    return "No puzzles in queue; using random approved collection!";
  }

  resetPuzzle(client, guildId);
  await moveQueue(client, guildId);

  return "Server moved to next puzzle!";
}