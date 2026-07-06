import * as akasha from 'akasharender';
import { Plugin } from 'akasharender/dist/Plugin.js';
export { MarkdownITMermaidPlugin, MarkdownITPlantUMLPlugin, MermaidPluginOptions } from './markdown-it.js';
export { MermaidRenderOptions, doMermaid, renderMermaidSvg, registerMermaidFonts, adaptInlineSvg, MermaidLocal } from './render-mermaid.js';
export { doPlantUMLOptions, doPlantUML, doPlantUMLServer, doPlantUMLLocal, plantumlEncode, isValidCharset, PlantUMLLocal } from './render-plantuml.js';
export { PintoraRenderOptions, doPintora, PintoraLocal } from './render-pintora.js';
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
//# sourceMappingURL=index.d.ts.map