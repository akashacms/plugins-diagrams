import { KaTeXOptions } from './render-katex.js';
export type MermaidPluginOptions = {
    /**
     * TTF/OTF font files to register for text measurement.
     * When omitted, a common system font is used if found.
     */
    fontFNs?: string[];
    /**
     * JSON configuration string using the same schema as the
     * mmdr --config file (theme, themeVariables, flowchart, ...)
     */
    configJSON?: string;
    /**
     * Theme preset name: default, dark, forest, neutral, modern.
     * Takes precedence over the config's theme name.
     */
    themePreset?: string;
};
/**
 * Add Mermaid support to Markdown-IT such that ```mermaid .. ``` is
 * rendered to inline SVG using mermaid-wasm-renderer.
 *
 * Rendering is synchronous and happens in-process, so the SVG is
 * embedded directly in the generated HTML.  No intermediate files
 * are produced.
 *
 * @param md
 * @param opts
 */
export declare function MarkdownITMermaidPlugin(md: any, opts?: MermaidPluginOptions): void;
export type KaTeXPluginOptions = KaTeXOptions;
/**
 * Add KaTeX support to Markdown-IT such that ```math .. ``` (or
 * ```katex .. ```) is rendered to inline HTML markup using the
 * KaTeX renderToString function.
 *
 * Rendering is synchronous and happens in-process, so the markup
 * is embedded directly in the generated HTML.  No intermediate
 * files are produced.  The math is rendered in display (block)
 * mode.
 *
 * The generated markup requires the KaTeX stylesheet.  The
 * DiagramsPlugin adds it to AkashaCMS projects when configured
 * with a katex options object; outside AkashaCMS include
 * katex/dist/katex.min.css in the page yourself.
 *
 * As with the Mermaid plugin, text following the language name
 * (```math A caption) becomes the figure caption.
 *
 * @param md
 * @param opts
 */
export declare function MarkdownITKaTeXPlugin(md: any, opts?: KaTeXPluginOptions): void;
/**
 * Add Pintora support to Markdown-IT such that ```pintora .. ```
 * is rendered to inline SVG.
 *
 * Pintora rendering is asynchronous, while Markdown-IT renderer
 * rules are synchronous.  Therefore the fence is not rendered
 * here.  Instead it is converted into a <diagrams-pintora>
 * element with no output-file, which the DiagramsPlugin Mahafunc
 * renders to inline SVG during Mahabhuta processing.
 * Consequently this plugin requires the AkashaCMS rendering
 * pipeline with DiagramsPlugin configured - it does not work
 * with standalone Markdown-IT.
 *
 * As with the Mermaid plugin, text following the language name
 * (```pintora A title) becomes the figure caption.
 *
 * @param md
 */
export declare function MarkdownITPintoraPlugin(md: any): void;
/**
 * Add PlantUML support to Markdown-IT such that ```plantuml .. ```
 * is rendered to inline SVG.
 *
 * PlantUML rendering is asynchronous (a PlantUML server request
 * or a child Java process), while Markdown-IT renderer rules are
 * synchronous.  Therefore the fence is not rendered here.
 * Instead it is converted into a <diagrams-plantuml tsvg>
 * element, which the DiagramsPlugin Mahafunc renders to inline
 * SVG during Mahabhuta processing.  Consequently this plugin
 * requires the AkashaCMS rendering pipeline with DiagramsPlugin
 * configured - it does not work with standalone Markdown-IT.
 *
 * As with the Mermaid plugin, text following the language name
 * (```plantuml A title) becomes the figure caption.
 *
 * When the diagram text does not begin with a @start line, it
 * is wrapped in @startuml/@enduml, so simple diagrams need not
 * spell those out.
 *
 * @param md
 */
export declare function MarkdownITPlantUMLPlugin(md: any): void;
//# sourceMappingURL=markdown-it.d.ts.map