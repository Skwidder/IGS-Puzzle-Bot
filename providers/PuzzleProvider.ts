import type { ActivePuzzle, CollectionSource } from "../database";
import type { Providers } from "./ProviderRegistry";


export abstract class PuzzleProvider {
    abstract readonly name: string;
    abstract readonly slug: Providers;
    abstract readonly baseURL: string;

    abstract fetchPuzzle(puzzleId: string): Promise<ActivePuzzle>;

    abstract discoverPuzzles(collectionSource: CollectionSource): Promise<number[]>;
    
    abstract simulateMove(puzzle: ActivePuzzle, pastMoves: string, newMove: string);
}
