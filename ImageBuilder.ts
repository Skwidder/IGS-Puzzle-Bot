import { sgfToCoords } from "./utils/utils";
import sharp from 'sharp'
import { Color } from "wgo";
import fs from "fs"


export class GoBoardImageBuilder {
    private svgContent: string[] = [];
    private size: number;
    private boardSize: number = 800; //pixels
    private margin: number = 50; //margin for labels
    private gridSize: number = 50;
    // The amount of lines to extend to show that the board continues in a particular direction
    private hBleed: number = 0.3; 
    private vBleed: number = 0.3; 
    private stones: {x: number, y: number, color: "black" | "white"}[] = [];
    private marks: {
        x: number, 
        y: number, 
        markType: string //"LB" | "MA" | "CR" | "TR" | "SQ" 
        char?: string
    }[] = [];

    private pngPath: string = ""


    constructor(size = 19) {
        this.size = size;
    }

    private calculateBoundingBox(padding = 1) {
        if (this.stones.length === 0) return null;

        const minX = Math.min(...this.stones.map(stone => stone.x), ...this.marks.map(mark => mark.x));
        const maxX = Math.max(...this.stones.map(stone => stone.x), ...this.marks.map(mark => mark.x));
        const minY = Math.min(...this.stones.map(stone => stone.y), ...this.marks.map(mark => mark.y));
        const maxY = Math.max(...this.stones.map(stone => stone.y), ...this.marks.map(mark => mark.y));

        // Check if closer to left or right edge
        //MinX is distance from left edge, size - 1 - maxX is distance from right edge
        const anchorLeft = minX < (this.size - 1 - maxX);
        // Check if closer to top or bottom edge
        const anchorTop = minY < (this.size - 1 - maxY);

        return {
            minX: anchorLeft ? 0 : Math.max(0, minX - padding),
            maxX: anchorLeft ? Math.min(this.size - 1, maxX + padding) : this.size - 1,
            minY: anchorTop ? 0 : Math.max(0, minY - padding),
            maxY: anchorTop ? Math.min(this.size - 1, maxY + padding) : this.size - 1,
            anchorLeft: anchorLeft,
            anchorTop: anchorTop
        };
    }

    public async saveAsPNG(outputPath = 'goboard.png', padding = 1) {
        const svg = this.generateSVG(padding);
        this.pngPath = outputPath;
        
        try {
            await sharp(Buffer.from(svg))
                .png({
                    compressionLevel: 9,
                    quality: 80
                })
                .toFile(outputPath);
            // console.log(`Board saved as ${outputPath}`);
        } catch (error) {
            console.error('Error converting to PNG:', error);
        }
    }

    public async deletePNG(){
        fs.unlink(this.pngPath, (err) => {
            if (err) {
                fs.unlink(this.pngPath, (err) => {
                    if (err) throw err;
                    console.log('File deleted on second try');
                });
            }
        });
    }


    private generateSVG(padding = 1): string {

        const box = this.calculateBoundingBox(padding);
        if (!box) throw Error("Bounding box not calculated");

        const fullWidth = this.size == box.maxX - box.minX + 1
        const fullHeight = this.size == box.maxY - box.minY + 1

        const width = fullWidth ? this.size : box.maxX - box.minX + 1;
        const height = fullHeight ? this.size : box.maxY - box.minY + 1;

        const svgWidth = width * this.gridSize + 2 * this.margin;
        const svgHeight = height * this.gridSize + 2 * this.margin;

        // SVG header
        this.svgContent.push(`<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">`);

        // Board background
        this.svgContent.push(`<rect width="100%" height="100%" fill="#DCB35C"/>`);

        // Grid lines
        const topBleed = (fullHeight || box.anchorTop ? 0 : this.vBleed) * this.gridSize
        const bottomBleed = (fullHeight || !box.anchorTop ? 0 : this.vBleed) * this.gridSize
        const leftBleed = (fullWidth || box.anchorLeft ? 0 : this.hBleed) * this.gridSize
        const rightBleed = (fullWidth || !box.anchorLeft ? 0 : this.hBleed) * this.gridSize

        // Grid lines
        for (let i = box.minX; i <= box.maxX; i++) {
            const x = this.margin + (i - box.minX) * this.gridSize;
            this.svgContent.push(`<line 
                x1="${x}" y1="${this.margin - topBleed}" 
                x2="${x}" y2="${svgHeight - (this.margin + this.gridSize) + bottomBleed}" 
                stroke="black" stroke-width="2"/>`);
        }
        for (let i = box.minY; i <= box.maxY; i++) {
            const y = this.margin + (i - box.minY) * this.gridSize;
            this.svgContent.push(`<line 
                x1="${this.margin - leftBleed}" y1="${y}" 
                x2="${svgWidth - (this.margin + this.gridSize) + rightBleed}" y2="${y}" 
                stroke="black" stroke-width="2"/>`);
        }


        // Coordinate labels
        this.addCroppedCoordinateLabels(box);

        // Star points
        const starPoints = this.getStarPoints();
        starPoints.forEach(([x, y]) => {
            if (x >= box.minX && x <= box.maxX && y >= box.minY && y <= box.maxY) {
                const px = this.margin + (x - box.minX) * this.gridSize;
                const py = this.margin + (y - box.minY) * this.gridSize;
                this.svgContent.push(`<circle cx="${px}" cy="${py}" r="${0.1*this.gridSize}" fill="black"/>`);
            }
        });

        // Stones
        this.stones.forEach(({ x, y, color }) => {
            const px = this.margin + (x - box.minX) * this.gridSize;
            const py = this.margin + (y - box.minY) * this.gridSize;
            const stoneRadius = this.gridSize * 0.45;

            // Stone shadow
            this.svgContent.push(`<circle cx="${px + 1}" cy="${py + 1}" r="${stoneRadius}" 
               fill="rgba(0,0,0,0.3)"/>`);

            // Stone
            const gradient = color === 'black' ?
                `url(#blackStoneGradient)` : `url(#whiteStoneGradient)`;
            this.svgContent.push(`<circle cx="${px}" cy="${py}" r="${stoneRadius}" 
               fill="${gradient}"/>`);
        });

        // Gradients
        this.svgContent.push(this.generateGradients());

        // Marks
        this.marks.forEach(mark => { 
            const px = this.margin + (mark.x - box.minX) * this.gridSize;
            const py = this.margin + (mark.y - box.minY) * this.gridSize;

            // Find if there's a stone at this position
            const stone = this.stones.find(s => s.x === mark.x && s.y === mark.y);
            const markColor = stone?.color === 'black' ? 'white' : 'black';
            const markSize = this.gridSize * 0.6; // Size for shapes

            switch (mark.markType) {
                case 'LB':
                    this.svgContent.push(`<text 
                       x="${px}" 
                       y="${py + (this.gridSize * 0.25)}" 
                       text-anchor="middle" 
                       dominant-baseline="central"
                       fill="${markColor}"
                       font-size="${this.gridSize * 0.7}"
                       font-weight="bold"
                       font-family="Arial">${mark.char}</text>`);
                    break;
                case 'SQ':
                    const halfSize = markSize / 2;
                    this.svgContent.push(`<rect 
                        x="${px - halfSize}" 
                        y="${py - halfSize}" 
                        width="${markSize}" 
                        height="${markSize}"
                        stroke="${markColor}"
                        stroke-width="4"
                        fill="none"/>`);
                    break;
                case 'CR':
                    this.svgContent.push(`<circle 
                        cx="${px}" 
                        cy="${py}" 
                        r="${markSize / 2}"
                        stroke="${markColor}"
                        stroke-width="4"
                        fill="none"/>`);
                    break;
                case 'TR':
                    const size = markSize;
                    const height = size * Math.sqrt(3) / 2;
                    const points = [
                        `${px},${py - height / 2}`,
                        `${px - size / 2},${py + height / 2}`,
                        `${px + size / 2},${py + height / 2}`
                    ].join(' ');
                    this.svgContent.push(`<polygon 
                        points="${points}"
                        stroke="${markColor}"
                        stroke-width="4"
                        fill="none"/>`);
                    break;
                case 'MA':
                    const crossSize = markSize / 2.5;
                    this.svgContent.push(`<path 
                        d="M${px - crossSize},${py - crossSize} L${px + crossSize},${py + crossSize} M${px - crossSize},${py + crossSize} L${px + crossSize},${py - crossSize}"
                        stroke="${markColor}"
                        stroke-width="4"/>`);
                    break;
            }
        });

        // Close SVG
        this.svgContent.push('</svg>');

        return this.svgContent.join('\n');
    }

    private addCroppedCoordinateLabels(box: any) {
        const letters = 'ABCDEFGHJKLMNOPQRST'; // Skip 'I' as per Go convention

        // Add column labels (letters)
        for (let i = box.minX; i <= box.maxX; i++) {
            const x = this.margin + (i - box.minX) * this.gridSize;
            // Top labels
            this.svgContent.push(`<text x="${x}" y="${this.margin - 20}" 
                text-anchor="middle" font-size="32">${letters[i]}</text>`);
            // Bottom labels
            this.svgContent.push(`<text x="${x}" y="${(box.maxY + 1) * this.gridSize + this.margin}" 
                text-anchor="middle" font-size="32">${letters[i]}</text>`);
        }

        // Add row labels (numbers)
        for (let i = box.minY; i <= box.maxY; i++) {
            const y = this.margin + (i - box.minY) * this.gridSize;
            const label = this.size - i;
            // Left labels
            this.svgContent.push(`<text x="${this.margin - 20}" y="${y + 10}" 
                text-anchor="end" font-size="32">${label}</text>`);
            // Right labels
            this.svgContent.push(`<text x="${(box.maxX - box.minX + 1) * this.gridSize + this.margin - 10}" y="${y + 10}" 
                text-anchor="start" font-size="32">${label}</text>`);
        }
    }

    private getStarPoints() {
        if (this.size === 19) {
            return [[3, 3], [3, 9], [3, 15],
            [9, 3], [9, 9], [9, 15],
            [15, 3], [15, 9], [15, 15]];
        } else if (this.size === 13) {
            return [[3, 3], [3, 9], [6, 6], [9, 3], [9, 9]];
        } else if (this.size === 9) {
            return [[2, 2], [2, 6], [4, 4], [6, 2], [6, 6]];
        }
        return [];
    }

    private generateGradients() {
        return `
            <defs>
                <radialGradient id="blackStoneGradient">
                    <stop offset="0%" stop-color="#505050"/>
                    <stop offset="80%" stop-color="#000000"/>
                </radialGradient>
                <radialGradient id="whiteStoneGradient">
                    <stop offset="0%" stop-color="#FFFFFF"/>
                    <stop offset="80%" stop-color="#E0E0E0"/>
                </radialGradient>
            </defs>
        `;
    }
    
    public addSGFStones(stones: string[]){
        //TODO:
    }

    /**
     * Convert from SGF to a mark type thats a bit easier to use in this
     * class
     * @param marks SGF Version of Marks
     */
    public addSGFMarks(marks: string[]) {
        for (const mark in marks){
            if(mark.length != 5 && mark.length != 6) {
                //i want to know if this happens
                console.log(`Mark Wrong Length: ${mark}`);
                continue;
            }

            //hardcode substring for now might cause issues later
            const coord = sgfToCoords(mark.substring(3,5));
            if(!coord) continue;

            let markCharacter: string | undefined = undefined;

            if (mark.substring(0,3) === "LB"){
               markCharacter = mark.substring(6);
            }

            this.marks.push({
                x: coord?.x, 
                y: coord?.y, 
                markType: mark.substring(0,3),
                char: markCharacter,
            });
        }
    }
    
    public addWgoGridStones(grid: Color[] = []) {

        const size = Math.sqrt(grid.length)
        if (!Number.isInteger(size)) {
            console.log("Grid Must be square");
            return;
        }
    
    
        for (let row = 0; row < size; row++) {
            let line = '';
            for (let col = 0; col < size; col++) {
                if (grid[row * size + col] == 0) {
                    continue;
                } else if (grid[row * size + col] == 1) {
                    this.stones.push({ x: col, y: row, color: 'black' })
                } else {
                    this.stones.push({ x: col, y: row, color: 'white' })
                }
            }
        }
    }
}