import { PintoraConfig } from '@pintora/cli';
import * as akasha from 'akasharender';
import { Plugin } from 'akasharender/dist/Plugin.js';
export declare class DiagramsPlugin extends Plugin {
    #private;
    constructor();
    configure(config: any, options: any): void;
    get config(): any;
}
export declare function mahabhutaArray(options: any): akasha.mahabhuta.MahafuncArray;
export type PintoraRenderOptions = {
    /**
     * pintora DSL code to render
     */
    code: string;
    devicePixelRatio?: number | null;
    /**
     * Type for the output file
     *
    // image/svg+xml
    // image/jpeg
    // image/png
     */
    mimeType?: string;
    /**
     * Assign extra background color
     */
    backgroundColor?: string;
    pintoraConfig?: Partial<PintoraConfig>;
    /**
     * width of the output, height will be calculated according to the diagram content ratio
     */
    width?: number;
    /**
     * Whether we should run render in a subprocess rather in current process.
     * If you call the `render` function, by default this is true, to avoid polluting the global environment.
     */
    renderInSubprocess?: boolean;
    outputFN: string;
};
export declare function doPintora(options: PintoraRenderOptions): Promise<void>;
/**
 * Options object that is converted into plantuml.jar options.
 */
export type doPlantUMLOptions = {
    /**
     * The PlantUML diagram text to use
     */
    inputBody?: string;
    /**
     * Zero or more file names for files to render
     */
    inputFNs?: string[];
    /**
     * Possible file to write output into
     */
    outputFN?: string;
    /**
     * To use a specific character set. Default: UTF-8
     */
    charset?: string;
    /**
     * To use dark mode for diagrams
     */
    darkmode?: boolean;
    /**
     * To generate intermediate svek files
     */
    debugsvek?: boolean;
    /**
     * "example.puml" To override %filename% variable
     */
    fileNameOverride?: string;
    /**
     * To use (N) threads for processing.  Use "auto" for 4 threads.
     */
    nbthread?: string;
    /**
     * To NOT export metadata in PNG/SVG generated files
     */
    nometadata?: boolean;
    /**
     * To generate images in the specified directory
     */
    outputDir?: string;
    /**
     * To generate images using EPS format
     */
    teps?: boolean;
    /**
     * To generate HTML file for class diagram
     */
    thtml?: boolean;
    /**
     * To generate images using LaTeX/Tikz format
     */
    tlatex?: boolean;
    /**
     * To generate images using PDF format
     */
    tpdf?: boolean;
    /**
     * To generate images using PNG format (default)
     */
    tpng?: boolean;
    /**
     * To generate SCXML file for state diagram
     */
    tscxml?: boolean;
    /**
     * To generate images using SVG format
     */
    tsvg?: boolean;
    /**
     * To generate images with ASCII art
     */
    ttxt?: boolean;
    /**
     * To generate images with ASCII art using Unicode characters
     */
    tutxt?: boolean;
    /**
     * To generate images using VDX format
     */
    tvdx?: boolean;
    /**
     * To generate XMI file for class diagram
     */
    txmi?: boolean;
    /**
     * To have log information
     */
    verbose?: boolean;
};
export declare function doPlantUMLLocal(options: any): Promise<void>;
export declare function isValidCharset(charset: any): boolean;
//# sourceMappingURL=index.d.ts.map