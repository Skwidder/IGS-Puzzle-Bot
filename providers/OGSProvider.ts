import { PuzzleProvider, type MoveResponse } from "./PuzzleProvider";
import { Providers } from "./ProviderRegistry";
import type { ActivePuzzle, CollectionSource } from "../databaseManager";
import axios from "axios";
import { ActionRow, type AutocompleteFocusedOption } from "discord.js";
import { coordsToSGF, sgfToCoords } from "../utils/utils";
import { request } from "node:http";

export class OGSProvider extends PuzzleProvider{
    readonly name = "Online Go Server";
    readonly slug = Providers.OGS;
    readonly apiBaseURL = "https://online-go.com/api/v1/puzzles";
    readonly playBaseURL = "https://online-go.com/puzzle/";
    
    constructor() {
        super();
    }
    
    async fetchPuzzle(puzzleId: string | number): Promise<ActivePuzzle | null> {
        try {
            const response = await axios.get(`${this.apiBaseURL}/${puzzleId}`);
            if (response.status != 200) return null;
            const data = response.data;

            let puzzle: ActivePuzzle = {
                source: Providers.OGS,
                puzzleId: puzzleId,
                tree: data.puzzle.move_tree,
                size: data.puzzle.width,
                initialPlayer: data.puzzle.initial_player,
                whiteStonesInitial: data.puzzle.initial_state.white.match(/.{2}/g),
                blackStonesInitial: data.puzzle.initial_state.black.match(/.{2}/g),
                author: data.owner.username,
                description: data.puzzle.puzzle_description,
                collectionName: data.collection.name,
                
            }

            return puzzle;
        } catch (error) {
            return null;
        }
    }

    async discoverPuzzles(collectionSource: CollectionSource): Promise<number[] | string[] | null> {

        //OGS dose not support Search at least for now
        if(collectionSource.type == "SEARCH") return null;
   
        let i = 1;
        let puzzles = [];
        let response;

        do{
            response = await axios.get(`${this.apiBaseURL}?collection=${collectionSource.payload}&page_size=50&page=${i}`);

            if(response.status != 200) return null;
            puzzles.push(... response.data.results.map((item: any) => item.id));
            i++;
        }while(response.data.count > (50 * (i - 1)));
       
        return puzzles;
    }

    async getMoveResponse(puzzle: ActivePuzzle, pastMoves: string[], newMove: string): Promise<MoveResponse> {
        let moveTree = puzzle.tree;
        
        //Add on players new move
        let moves: string[] = [];
        if(pastMoves){
            moves = [...pastMoves];
        }
        moves.push(newMove);

        if(!puzzle.initialPlayer) throw Error("OGS: Puzzle initial player is null");
        const playerColor = puzzle.initialPlayer == "black" ? "B" : "W";
        const responseColor = puzzle.initialPlayer == "white" ? "B" : "W";

        moveTree = this.getToMoveBranch(puzzle,moves);
        
        //If moveTree is null we know some where a move was played thats not supported
        if(!moveTree){
            return {
                isSequanceEnd: true,
                isCorrect: false,
                comments: ":interrobang: Move not mapped"
            };
        }

        let endCheck: MoveResponse | null = this.checkIfSequanceEnd(moveTree);
        if(endCheck) return endCheck;
        

        //Get response move
        const response = moveTree.branches[Math.floor(moveTree.branches.length * Math.random())];
        let coord: {x: number, y: number} = {x: response.x, y: response.y};
        moveTree = this.getMoveBranch(coord,moveTree);
        
        let moveSGF = responseColor + "["
        moveSGF += coordsToSGF(coord) + "]";
        
        endCheck = this.checkIfSequanceEnd(moveTree)
        if(endCheck) return endCheck; 

        const marks: string[] | undefined = await this.getMarks(puzzle,moves);

        //if we havent left yet then its just a response not a end
        return {
            isSequanceEnd: false,
            isCorrect: false,
            comments: moveTree.text?.replace(/<(?!br\s*\/?)[^>]+>/g, '') ?? "",
            responseMove: moveSGF,
            marks: marks,
        };
    }


    async getMarks(puzzle: ActivePuzzle, moves: string[]): Promise<string[] | undefined> {
        const branch = this.getToMoveBranch(puzzle, moves);
        const marks: string[] = this.convertMarks(branch?.marks ?? []);
        return marks;
    }
    
    //Iterate though the move tree untill out of moves
    private getToMoveBranch(puzzle: ActivePuzzle, moves: string[]): any {
        let moveTree = puzzle.tree;
        
        for (let move of moves){
            const coord: {x: number, y: number} | null = sgfToCoords(move);
            if(!coord) throw Error(`OGS: sgfToCoords erorr: ${move}`);
            moveTree = this.getMoveBranch(coord, moveTree);
        }
        return moveTree;
    }

    //Trim the tree to the move we are currently on
    private getMoveBranch(coord: {x: number, y: number}, moveTree: any){
        if(!moveTree) return null;

        for (let move of moveTree.branches) {
            if (move.x == coord.x && move.y == coord.y) {
                return move;
            }
        }
        //if player places anywhere not in the move tree its incorrect
        return null;
    }

    private checkIfSequanceEnd(moveTree: any, responseMove?: string): MoveResponse | null{
        const marks: string[] = this.convertMarks(moveTree.marks);

        if (!moveTree.branches || moveTree.branches.length == 0){
            if(moveTree.correct_answer) {
                if ( moveTree.correct_answer == true ){
                    return {
                        isSequanceEnd: true,
                        isCorrect: true,
                        comments: moveTree.text?.replace(/<(?!br\s*\/?)[^>]+>/g, '') ?? "",
                        responseMove: responseMove,
                        marks: marks,
                    };
                } else { //false
                    return {
                        isSequanceEnd: true,
                        isCorrect: false,
                        comments: moveTree.text?.replace(/<(?!br\s*\/?)[^>]+>/g, '') ?? "",
                        responseMove: responseMove,
                        marks: marks,
                    };
                }
            } else {
                return {
                    isSequanceEnd: true,
                    isCorrect: false,
                    comments: ":interrobang:Response not mapped",
                    responseMove: responseMove,
                    marks: marks,
                };
            }
        }
        return null
    }

    private convertMarks(OGSMarks: any): string[] {
        if(!OGSMarks) return [];

        let marks: string[] = [];
        for (const mark of OGSMarks) {
            const SGFCoord: string = coordsToSGF({x: mark.x, y: mark.y}); 
            
            const markTypes = Object.keys(mark.marks);

            for (let markType of markTypes) {
                let markSGF: string = "";
                switch(markType){
                    case "transient_letter": //just ignore these as they do nothing
                        continue;
                        break;
                    case "letter":
                        markSGF = `LB[${SGFCoord}:${mark.marks.markType}]`;
                        break;
                    case "cross":
                        markSGF = `MA[${SGFCoord}]`;
                        break;
                    case "circle":
                        markSGF = `CR[${SGFCoord}]`;
                        break;
                    case "triangle":
                        markSGF = `TR[${SGFCoord}]`;
                        break;
                    case "square":
                        markSGF = `SQ[${SGFCoord}]`
                        break;
                }
                marks.push(markSGF);
            }
        }
        return marks;
    }
    

    async searchCollection(searchString: string): Promise<CollectionSource |
     "NO_COLLECTION_FOUND" | 
     "COLLECTION_PRIVATE" |
     "TOO_MANY_COLLECTIONS" |
     "ERROR">{
        let response: axios.AxiosResponse | undefined = undefined
        try{
            const name = encodeURIComponent(searchString);
            response = await axios.get("https://online-go.com/api/v1/puzzles/collections?name=" + name);
        }catch(error){
            return "ERROR";
        }
        if(!response) return "ERROR"
        if (response.data.count == 0){
            return "NO_COLLECTION_FOUND";
        }
        if (response.data.count > 1){
            return "TOO_MANY_COLLECTIONS";
        }

        const result = response.data.results[1]

        return {
            name: result.name,
            payload: result.id,
            source: Providers.OGS,
            type: "COLLECTION"
        }
    }
    

    async collectionAutocomplete(focusedOption: AutocompleteFocusedOption): Promise<{name: string, value: string}[] | null> {
        const name = encodeURI(focusedOption.value);
        
        //grab results that contain the current focus value
        const response = await axios.get(`${this.apiBaseURL}collections?page_size=25&name__icontains=${name}`);
        if(!response || response.status !== 200) return null;
        const options = response.data.results.map(collection => {
            return {
                name: collection.name,
                value: String(collection.id)
            }
        })
        return options;
    }
    
    // puzzleAutocomplete(focusedOption: AutocompleteFocusedOption): Promise<{ name: string, value: string}[] | null> {
    //     return [{name: "test", value: "2"}];
    // }
}