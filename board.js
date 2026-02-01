const fs = require('fs');
const { addUserActiveStone, getUsersActiveStones, getActivePuzzleID, getActiveServerName, removeLastUserStone, checkSolved,
    incrementScore, incrementTries, setSolved
} = require("./database.js");
const { getPuzzleInfo } = require('./OGS.js');
const { EmbedBuilder, AttachmentBuilder } = require("discord.js");




async function runBoard(client, userId, addStone = "") {
    //simulate the board then return the stones

    if (addStone !== "" && addStone !== null) {
        await addUserActiveStone(client, userId, addStone);
    }


    const puzzleID = await getActivePuzzleID(client, userId);
    const puzzleInfo = await getPuzzleInfo(puzzleID);

    const userStones = await getUsersActiveStones(client, userId);

    const response = await simulateMove(puzzleInfo.whiteStonesInital, puzzleInfo.blackStonesInital,
        userStones, puzzleInfo.playerColor, puzzleInfo.moveTree, puzzleInfo.boardSize
    );

    //only happens when a move was invalid
    if (response == false) {
        removeLastUserStone(client, userId);
        return "Invalid Move"
    } else if (response.incorrect != undefined && response.incorrect == true) {
        if (await checkSolved(client, userId) == false) {
            incrementTries(client, userId);
        }
    } else if (response.correct != undefined && response.correct == true) {
        if (await checkSolved(client, userId) == false) {
            setSolved(client, userId, true);
            incrementScore(client, userId);
        }
    }

    return response
}

async function simulateMove(inititalWhiteStones, inititalBlackStones
    , playerPastMoves = [], playerColor, moveTree, boardSize) {

    //Wgo handles x y coords backwards so we swap them when we place the stone
    const game = new Wgo.Game(boardSize, "ko");
    for (let i = 0; i < inititalWhiteStones.length; i = i + 2) {
        const coord = sgfToCoords(inititalWhiteStones[i] + inititalWhiteStones[i + 1]);
        game.addStone(coord.y, coord.x, Wgo.Color.WHITE);
    }

    for (let i = 0; i < inititalBlackStones.length; i = i + 2) {
        const coord = sgfToCoords(inititalBlackStones[i] + inititalBlackStones[i + 1]);
        game.addStone(coord.y, coord.x, Wgo.Color.BLACK);
    }

    //We want to pass if the playerColor dose not match the turn otherwise we will be putting down the wrong color
    if (game.turn != playerColor) {
        game.pass();
    }

    let state = {};

    if (playerPastMoves === undefined || playerPastMoves.length == 0) {
        state = game.positionStack[0];
        if (moveTree.marks != undefined) {
            state.marks = moveTree.marks;
        }

        if (moveTree.text != undefined) {
            const cleanText = moveTree.text.replace(/<(?!br\s*\/?)[^>]+>/g, '');
            state.text = cleanText;
        }

        return state;
    }



    //add Players moves
    for (let move of playerPastMoves) {
        const coord = sgfToCoords(move);
        state = game.play(coord.y, coord.x);//have to do play instead of add so it simulates captures

        //state is false if move is invalid
        if (state == false) {
            return false
        }

        moveTree = getMoveBranch(coord.x, coord.y, moveTree);

        if (moveTree.marks != undefined) {
            state.marks = moveTree.marks;
        }

        if (moveTree.text != undefined) {
            const cleanText = moveTree.text.replace(/<(?!br\s*\/?)[^>]+>/g, '');
            state.text = cleanText;
        }

        if (moveTree === "Incorrect") {
            state.incorrect = true;
            return state;
        }

        if (moveTree.correct_answer != undefined && moveTree.correct_answer == true) {
            state.correct = true;
            return state;
        }

        if (moveTree.wrong_answer != undefined && moveTree.wrong_answer == true) {
            state.incorrect = true;
            return state;
        }

        //TODO: Some puzzles support multiple responces, this works but dose not store which option
        //it took so it causes it to mess up in future placements

        //move up the moveTree for the response
        // if(moveTree.branches.length > 1){
        //     const branch = Math.floor(Math.random() * moveTree.branches.length);
        //     moveTree = moveTree.branches[branch];
        // }else{

        if(!(moveTree.branches && moveTree.branches.length > 0)){
            state.incorrect = true;
            return state;
        }

        moveTree = moveTree.branches[0];
        
        // }



        state = game.play(moveTree.y, moveTree.x);
        //save the reponse move so we can use it when talking to the player
        state.response_move = { x: moveTree.x, y: moveTree.y };

        // Copy the marks from the move tree and add a circle to indicate which move is from the response
        state.marks = [...(moveTree.marks || []), { ...state.response_move, marks: { circle: true } }];

        if (moveTree.text != undefined) {
            const cleanText = moveTree.text.replace(/<(?!br\s*\/?)[^>]+>/g, '');
            state.text = cleanText;
        }

        if (moveTree.correct_answer != undefined && moveTree.correct_answer === true) {
            state.correct = true;
            return state;
        }

        if (moveTree.wrong_answer != undefined && moveTree.wrong_answer === true) {
            state.incorrect = true;
            return state;
        }

        //Needed as sometimes OGS branches can end without a true false maker
        //so if there is no more moves in this branch we just play the move and 
        //say they got it incorrect
        if(!(moveTree.branches && moveTree.branches.length > 0)){
            state.incorrect = true;
            return state;
        }

    }

    return state;
}






//for testing
function printBoard(array) {
    if (array.length !== 361) {
        console.log("Array must be exactly 361 elements");
        return;
    }

    for (let row = 0; row < 19; row++) {
        let line = '';
        for (let col = 0; col < 19; col++) {
            const index = row * 19 + col;
            // Pad each number to be 2 characters wide (including space)
            line += (array[index] >= 0 ? ' ' : '') + array[index] + ' ';
        }
        console.log(line.trim());
    }
}





function standardNotationToSGF(coord,size=19) {
    if (!coord || coord.length < 2) {
        return null;
    }

    // Split into column letter and row number
    const col = coord[0].toUpperCase();
    const row = parseInt(coord.slice(1));

    // Convert column: A->a, B->b, etc.
    // Note: SGF skips 'i' to avoid confusion
    let sgfCol = String.fromCharCode(col.charCodeAt(0) - 'A'.charCodeAt(0) + 'a'.charCodeAt(0));
    if (col.charCodeAt(0) >= 'I'.charCodeAt(0)) {
        sgfCol = String.fromCharCode(sgfCol.charCodeAt(0) - 1);
    }


    // Convert row: SGF counts from bottom-up, a=1
    // For 19x19 board, row 19 = 'a', row 1 = 's'
    const sgfRow = String.fromCharCode(('s'.charCodeAt(0) - (19 - size)) - row + 1);

    return sgfCol + sgfRow;
}

function coordsToStandard(x, y, size = 19) {
    // Convert x coordinate (0-18) to letter (A-T, skipping I)
    let col = String.fromCharCode('A'.charCodeAt(0) + x);
    if (x >= 8) { // Adjust for skipping 'I'
        col = String.fromCharCode(col.charCodeAt(0) + 1);
    }

    // Convert y coordinate (0-18) to board position (19-1)
    // Since 0,0 is top left, we subtract y from size
    const row = size - y;

    return `${col}${row}`;
}

module.exports = {
    runBoard,
    GoBoardImageBuilder,
    sgfToCoords,
    wgoGridToImageStones,
    standardNotationToSGF,
    coordsToStandard
}