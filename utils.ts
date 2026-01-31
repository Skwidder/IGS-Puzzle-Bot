


/**
 * 
 * @param sgfMove a string in SGF format eg. B(ef)
 * @returns an object with x and y for the x and y coordinets 
 */
export function sgfToCoords(sgfMove: string): {x: number, y: number} | null {
    if (!sgfMove || sgfMove.length !== 5) return null;

    const x: number = sgfMove.charCodeAt(2) - 'a'.charCodeAt(0);
    const y: number = sgfMove.charCodeAt(3) - 'a'.charCodeAt(0);
    return {x: x, y: y };
}

export function coordsToSGF(coord: {x: number, y: number}): string {
    let SGF: string = String.fromCharCode(coord.x + 'a'.charCodeAt(0));
    SGF += String.fromCharCode(coord.y + 'a'.charCodeAt(0));
    
    return SGF;
}

// function coordsToStandard(x, y, size = 19) {
//     // Convert x coordinate (0-18) to letter (A-T, skipping I)
//     let col = String.fromCharCode('A'.charCodeAt(0) + x);
//     if (x >= 8) { // Adjust for skipping 'I'
//         col = String.fromCharCode(col.charCodeAt(0) + 1);
//     }

//     // Convert y coordinate (0-18) to board position (19-1)
//     // Since 0,0 is top left, we subtract y from size
//     const row = size - y;

//     return `${col}${row}`;
// }