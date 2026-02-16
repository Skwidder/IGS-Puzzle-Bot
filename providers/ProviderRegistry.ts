import type { PuzzleProvider } from "./PuzzleProvider";
import { OGSProvider } from "./OGSProvider";

export enum Providers {
    OGS = "ogs",
}

export class Registry {
    private providers: Map<Providers, PuzzleProvider> = new Map();

    constructor() {
        //Register Providers
        this.register(new OGSProvider());
    }

    private register(provider: PuzzleProvider){
        this.providers.set(provider.slug,provider);
    }

    get(slug: Providers): PuzzleProvider{
        const provider = this.providers.get(slug);
        if(!provider){
            throw new Error(`No Puzzle Provider found for slug: ${slug}`);
        }
    return provider
    }
    
    getAll(): Map<Providers, PuzzleProvider> {
        return this.providers
    }
}