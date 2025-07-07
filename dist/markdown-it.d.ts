export type MermaidPluginOptions = {
    /**
     * File-system path of directory where .mermaid file
     * will land
     */
    fspath: string;
    /**
     * Prefix string to use on generated file names
     * for .mermaid and .svg files
     */
    prefix: string;
};
/**
 * Add Mermaid support to Markdown-IT such that ```mermaid .. ``` will
 * in turn call the Mermaid CLI function `run` to render the Mermaid document.
 *
 * @param md
 * @param opts
 */
export declare function MarkdownITMermaidPlugin(md: any, opts: MermaidPluginOptions): void;
//# sourceMappingURL=markdown-it.d.ts.map