const {runBoard, GoBoardImageBuilder, sgfToCoords, wgoGridToImageStones, standardNotationToSGF, coordsToStandard } = require("./board.js");
const {getPuzzleInfo} = require('./OGS.js');
const { getActivePuzzleID,getActiveServerName,getServerName,getScores, nextPuzzle } = require("./database.js");
const { EmbedBuilder,AttachmentBuilder,StringSelectMenuBuilder, ActionRowBuilder, DiscordAPIError } = require("discord.js");

const Wgo = require("wgo");
const fs = require('fs');

async function runAndSendBoard(client,userID,stoneToAdd = "",showHelp = false,showPuzzleInfo = true){
    try{
        const puzzleID = await getActivePuzzleID(client,userID);
        const info = await getPuzzleInfo(puzzleID);

        const user = await client.users.fetch(userID);

        const stoneToAddSGF = await standardNotationToSGF(stoneToAdd,info.boardSize);

        const board = await runBoard(client,userID,stoneToAddSGF);

        if(board === "Invalid Move"){
            user.send("Invalid Move! Please Provide Valid Move");
            return;
        }

        const stones = await wgoGridToImageStones(board.grid);

        let text = "";
        let feilds = [];

        if(showHelp){
            feilds.push({name: "How To Use", value: "Use !Location to play a move (eg. !B17) \nUse !reset to reset puzzle to starting setup \n" +
                "Use !undo to undo last move"
            });
        }

        if(showPuzzleInfo){
            feilds.push(... await infoToEmbedFeilds(info));
        }

        if(board.response_move != undefined){
            const loc = coordsToStandard(board.response_move.x,board.response_move.y,info.boardSize);

            feilds.push({name: "Puzzle's Response", value: loc});
        }

        let notes = "";
        if(board.incorrect != undefined && board.incorrect == true){
            notes = notes + ":x: Incorrect! \n do !reset to start again\n";

        }else if(board.correct != undefined && board.correct == true){
            notes = notes + ":white_check_mark: Correct! \n";
        }

        if(board.text != undefined){
            notes = notes + board.text + "\n";
        }

        if(notes != ""){
            feilds.push({name:"Notes",value:notes,inline:true});
        }

        if (board.correct != undefined && board.correct == true){
            // add an empty field to make it 3-column, like the puzzle info above
            // to make both rows aligned with each other
            feilds.push({name:"\u200b",value:"\u200b",inline:true});

            const puzzle = puzzleID.toString();
            const link = `[${puzzle}](https://online-go.com/puzzle/${puzzle})`;
            feilds.push({name:"Puzzle",value:link,inline:true});
        }

        const imageBuilder = new GoBoardImageBuilder(info.boardSize);

        await imageBuilder.saveAsPNG(stones,marks = board.marks,userID + ".png");
        const file = new AttachmentBuilder(userID + ".png");

        const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(await getActiveServerName(client,userID) + "'s Puzzle")
        .addFields(feilds)
        .setImage("attachment://" + userID + ".png")
        .setTimestamp()

        await user.send({embeds: [embed], files: [file]});

        fs.unlink(userID + ".png", function (err){
            if (err) throw err;
        });
    }catch(error){
        console.log(error);
        // interaction.reply(error.message)
    }
}



async function showPuzzle(interaction,puzzleID="" ){
    const info = await getPuzzleInfo(puzzleID);

    const stones = await inititalStoneConverter(info.blackStonesInital,info.whiteStonesInital);
    const moveTree = info.moveTree;
    let marks = [];

    if(moveTree.marks != undefined){
        marks = moveTree.marks;
    }

    const board = new GoBoardImageBuilder(info.boardSize);
    
    await board.saveAsPNG(stones,marks = marks,interaction.id + ".png");
    const file = new AttachmentBuilder(interaction.id + ".png");

    let feilds = [];
    feilds.push(... await infoToEmbedFeilds(info));

    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle("Puzzle Id:" + puzzleID)
        .addFields(feilds)
        .setImage("attachment://" + interaction.id + ".png")
        .setTimestamp();

    await interaction.reply({embeds: [embed], files: [file]});
    
    fs.unlink(interaction.id + ".png", function (err){
        if (err) throw err;
    });
}


async function annoucePuzzle(client,guildID,channelID,role = ""){
    let channel;
    
    try{
        channel = await client.channels.fetch(channelID);
    }catch(e){
        console.log("Bot Does not have access to channel: " + channelID +
            " On Server: " + guildID);
        return;
    }

    let puzzleID = await getActivePuzzleID(client,"",guildID);
    
    if(puzzleID === undefined || puzzleID === null){
        try{
            let rsp = await nextPuzzle(client,guildID);
            console.log(rsp);
            puzzleID = await getActivePuzzleID(client,"",guildID);
        }catch(e){
            await channel.send({content: e.message});
            return;
        }
    }

    const info = await getPuzzleInfo(puzzleID);

    const stones = await inititalStoneConverter(info.blackStonesInital,info.whiteStonesInital);

    
    const moveTree = info.moveTree;
    let marks = [];

    if(moveTree.marks != undefined){
        marks = moveTree.marks;
    }
    
    const board = new GoBoardImageBuilder(info.boardSize);
    
    await board.saveAsPNG(stones,marks = marks,guildID + ".png");
    const file = new AttachmentBuilder(guildID + ".png");

    let feilds = [];
    feilds.push(... await infoToEmbedFeilds(info));
    feilds.push({name:"How To Play",value:"Just type /play"})

    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(await getServerName(client,guildID) + "'s Puzzle")
        .addFields(feilds)
        .setImage("attachment://" + guildID + ".png")
        .setTimestamp();

    let text = ""
    try{
        if(role == "" || role == undefined || role == null){
            await channel.send({embeds: [embed], files: [file]});
        }else{
            text = `<@&${role}>`;
            await channel.send({content: text, embeds: [embed], files: [file]});
        }
    }catch(e){
        console.log("Bot Does not have access to channel: " + channelID +
            " On Server: " + guildID);
        return;
    }
    
    fs.unlink(guildID + ".png", function (err){
        if (err) throw err;
    });
}



async function infoToEmbedFeilds(puzzleInfo) {
    let feilds = [];
    feilds.push({
        name: "Collection",
        value: puzzleInfo.collectionName + "\n\n",
        inline: true
    });

    feilds.push({
        name:'Author',
        value:  puzzleInfo.author + "\n\n",
        inline: true
    });

    //Discord Embed dose not allow a feild to be longer than 1024 characters,
    //so if the description is longer than that lets just set it to nothing
    let description = puzzleInfo.description + "\n\n";
    if(description.length > 1024){
        return feilds;
    }

    feilds.push({
        name: "Description",
        value:  description + "\n\n",
        inline: true
    });


    return feilds;
}


async function inititalStoneConverter(blackStonesInital,whiteStonesInital){
    stones = [];
    for (let i = 0; i < whiteStonesInital.length; i = i + 2){
        const cords = sgfToCoords(whiteStonesInital[i] + whiteStonesInital[i+1]);
        stones.push({x: cords.x, y:cords.y , color: 'white'});
    }

    for (let i = 0; i < blackStonesInital.length; i = i + 2){
        const cords = sgfToCoords(blackStonesInital[i] + blackStonesInital[i+1]);
        stones.push({x: cords.x, y:cords.y , color: 'black'});
    }

    return stones;
}

async function puzzleSelectorMenu(interaction,client,userID,inProgressPuzzles){
    //Want to allow the user to pick what puzzle to play if they have more than one
    if(inProgressPuzzles.length > 1){
        const menu = new StringSelectMenuBuilder()
        .setCustomId('puzzle_select')
        .addOptions(inProgressPuzzles.map(p => ({
            label: `Puzzle ${p.guildName}`,
            value: p.guildId
        })));

        const row = new ActionRowBuilder()
        .addComponents(menu);

        //send to DM
        const user = await interaction.client.users.fetch(interaction.user.id);
        await user.send({
            content: 'You have multiple in progress puzzles which would you like to do?',
            components: [row],
        });
    }
}

async function leaderBoard(interaction,client,guildID,numOfUsersToShow = 10) {
    await interaction.deferReply();
    const users = await getScores(client,guildID);

    let validUsers = [];

    for (user of users){
        try{
            const member = await interaction.guild.members.fetch(user.userId);
            user.name = member.displayName;
            validUsers.push(user);
        }catch(DiscordAPIError){
            continue;
        }
    }

    if(validUsers.length < 1){
        interaction.editReply("No users on the leaderboard");
        return;
    }

    const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('Leaderboard')
    .setDescription(
        validUsers.sort((a, b) => b.score - a.score)
        .slice(0, numOfUsersToShow)
        .map((user, index) => `#${index + 1} ${user.name}: ${user.score}`)
        .join('\n')
    )

    interaction.editReply({ embeds: [embed] });
}


module.exports = {
    runAndSendBoard,
    showPuzzle,
    annoucePuzzle,
    puzzleSelectorMenu,
    leaderBoard
}
