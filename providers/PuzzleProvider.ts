import type { ActivePuzzle, CollectionSource } from "../database";
import type { Providers } from "./ProviderRegistry";

export interface MoveResponse{
    isSequanceEnd: boolean
    isCorrect: boolean
    responseMove?: string //SGF format eg W[ac]
    marks?: string[] //SGF format 
    comments?: string
}


export abstract class PuzzleProvider {
    abstract readonly name: string;
    abstract readonly slug: Providers;
    abstract readonly baseURL: string;

    abstract fetchPuzzle(puzzleId: string | number): Promise<ActivePuzzle | null>;

    abstract discoverPuzzles(collectionSource: CollectionSource): Promise<number[] | string[] | null>;
    
    abstract getMoveResponse(puzzle: ActivePuzzle, pastMoves: string[], newMove: string): Promise<MoveResponse>;

    abstract getMarks(puzzle: ActivePuzzle, moves: string[]): Promise<string[] | undefined>
}
