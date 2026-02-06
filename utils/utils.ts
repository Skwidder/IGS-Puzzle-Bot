/**
 * 
 * @param sgfMove a string in SGF format eg. B(ef)
 * @returns an object with x and y for the x and y coordinets 
 */
export function sgfToCoords(sgfMove: string): {x: number, y: number} | null {
    if (sgfMove && sgfMove.length == 5) {
         const x: number = sgfMove.charCodeAt(2) - 'a'.charCodeAt(0);
        const y: number = sgfMove.charCodeAt(3) - 'a'.charCodeAt(0);
        return {x: x, y: y };
    } 
    
    if (sgfMove && sgfMove.length == 2) {
        const x: number = sgfMove.charCodeAt(0) - 'a'.charCodeAt(0);
        const y: number = sgfMove.charCodeAt(1) - 'a'.charCodeAt(0);
        return {x: x, y: y };
    }   

    return null;
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


// function standardNotationToSGF(coord,size=19) {
//     if (!coord || coord.length < 2) {
//         return null;
//     }

//     // Split into column letter and row number
//     const col = coord[0].toUpperCase();
//     const row = parseInt(coord.slice(1));

//     // Convert column: A->a, B->b, etc.
//     // Note: SGF skips 'i' to avoid confusion
//     let sgfCol = String.fromCharCode(col.charCodeAt(0) - 'A'.charCodeAt(0) + 'a'.charCodeAt(0));
//     if (col.charCodeAt(0) >= 'I'.charCodeAt(0)) {
//         sgfCol = String.fromCharCode(sgfCol.charCodeAt(0) - 1);
//     }


//     // Convert row: SGF counts from bottom-up, a=1
//     // For 19x19 board, row 19 = 'a', row 1 = 's'
//     const sgfRow = String.fromCharCode(('s'.charCodeAt(0) - (19 - size)) - row + 1);

//     return sgfCol + sgfRow;
// }

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