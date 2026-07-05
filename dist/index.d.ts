import { PintoraConfig } from '@pintora/cli';
export { MarkdownITMermaidPlugin, MarkdownITPlantUMLPlugin, MermaidPluginOptions } from './markdown-it.js';
import * as akasha from 'akasharender';
import { Plugin } from 'akasharender/dist/Plugin.js';
export { MermaidRenderOptions, doMermaid, renderMermaidSvg, registerMermaidFonts } from './render-mermaid.js';
export type DiagramsPluginOptions = {
    /**
     * Options for rendering <diagrams-mermaid> elements
     */
    mermaid?: {
        /**
         * File name of a JSON configuration file using the same
         * schema as the mmdr --config file (theme, themeVariables,
         * flowchart, ...).  Read once at configuration time.
         */
        configFN?: string;
        /**
         * JSON configuration string with the same schema.  Takes
         * precedence over configFN.
         */
        configJSON?: string;
        /**
         * Theme preset name: default, dark, forest, neutral, modern.
         * Takes precedence over the config's theme name.
         */
        themePreset?: string;
        /**
         * TTF/OTF font files to register for text measurement.
         * When omitted, a common system font is used if found.
         */
        fontFNs?: string[];
    };
};
export declare class DiagramsPlugin extends Plugin {
    #private;
    constructor();
    configure(config: any, options?: DiagramsPluginOptions): void;
    get config(): any;
}
export declare function mahabhutaArray(options: any, config?: akasha.Configuration, akasha?: any, plugin?: Plugin): akasha.mahabhuta.MahafuncArray;
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
    /**
     * URL for a PlantUML server, such as
     * http://localhost:8080.  Overrides the
     * PLANTUML_SERVER_URL environment variable.
     */
    serverURL?: string;
    /**
     * Filesystem path for a plantuml.jar file.
     * Overrides the PLANTUML_JAR environment variable.
     */
    jarPath?: string;
};
/**
 * Render a PlantUML diagram using whichever rendering
 * backend is configured.  If a server URL is available
 * (the serverURL option or the PLANTUML_SERVER_URL
 * environment variable), the diagram is sent to that
 * PlantUML server.  Otherwise, if a JAR path is available
 * (the jarPath option or the PLANTUML_JAR environment
 * variable), the diagram is rendered locally by running
 * the JAR with Java.  If neither is available, an error
 * is thrown directing the user to the README.
 *
 * In the single-input modes (inputBody or one entry in
 * inputFNs), when no outputFN is given the rendered
 * output is returned as a Buffer instead of being
 * written to a file.
 */
export declare function doPlantUML(options: doPlantUMLOptions): Promise<Buffer | undefined>;
/**
 * Encode PlantUML diagram text for use in a PlantUML
 * server URL, as documented at
 * https://plantuml.com/text-encoding -- the text is
 * deflated, then encoded with a base64-like alphabet.
 */
export declare function plantumlEncode(diagram: string): string;
/**
 * Render a PlantUML diagram by sending it to a PlantUML
 * server.  The server URL comes from the serverURL option
 * or the PLANTUML_SERVER_URL environment variable.
 *
 * The server supports a subset of the JAR's features:
 * PNG (tpng, the default), SVG (tsvg), and ASCII art
 * (ttxt) output formats.  The input is either inputBody
 * or a single entry in inputFNs.  The rendered output is
 * written to outputFN when given, and returned as a
 * Buffer otherwise.  Options that only make sense for
 * the JAR (darkmode, charset, nbthread, outputDir, and
 * the other output formats) are not supported.
 */
export declare function doPlantUMLServer(options: doPlantUMLOptions): Promise<Buffer | undefined>;
export declare function doPlantUMLLocal(options: doPlantUMLOptions): Promise<Buffer | undefined>;
export declare function isValidCharset(charset: any): boolean;
//# sourceMappingURL=index.d.ts.map