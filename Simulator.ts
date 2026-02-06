import type { ActivePuzzle } from "./database";
import type { MoveResponse } from "./providers/PuzzleProvider";
import { sgfToCoords } from "./utils/utils";
import wgo from 'wgo' 


export async function getSimulatedBoard(
    puzzle: ActivePuzzle, 
    pastMoves: string[], 
    newMove?: string, 
    responseMove?: MoveResponse ): Promise<false | wgo.Position>{

    //Wgo handles x y coords backwards so we swap them when we place the stone
    const game = new wgo.Game(puzzle.size)
    
    for (const move in puzzle.whiteStonesInitial){
        const coord = sgfToCoords(move);

        if(!coord) continue;
        game.addStone(coord.y, coord.x, wgo.Color.WHITE);
    }
    
    for (const move in puzzle.blackStonesInitial) {
        const coord = sgfToCoords(move);
        
        if(!coord) continue;
        game.addStone(coord.y, coord.x, wgo.Color.BLACK);
    }
    

    //We want to pass if the playerColor dose not match the turn otherwise we will be putting down the wrong color
    if ((game.turn == wgo.Color.BLACK && puzzle.initialPlayer == 'white') 
        || (game.turn == wgo.Color.WHITE && puzzle.initialPlayer == 'black')) {

        game.pass();
    }

    let state: false | wgo.Position = false;

    //add past moves
    for (let move of pastMoves) {
        const coord = sgfToCoords(move);
        if(!coord) continue;

        state = game.play(coord.y, coord.x);//have to do play instead of add so it simulates captures

        //state is false if move is invalid
        if (state == false) return false;
    }
    
    
    //TODO: rewite to append to past moves(DRC)

    //add new player move
    if(newMove){
        let coord = sgfToCoords(newMove);
        if(!coord) return false; 

        state = game.play(coord.y, coord.x);
        if (state == false) return false;
    }
        

    //add reponse move
    if(responseMove?.responseMove){
        coord = sgfToCoords(responseMove.responseMove);
        if(!coord) return false; 

        state = game.play(coord.y, coord.x);
        if (state == false) return false;
    }
    return state;
}


//for testing
/* function printBoard(array) {
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
} */
