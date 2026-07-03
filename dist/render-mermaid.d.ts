/**
 * Register the named TTF/OTF font files for text measurement.
 * Suppresses the automatic system font registration - the
 * user-supplied fonts take priority.
 */
export declare function registerMermaidFonts(fontFNs: string[]): void;
/**
 * Register a common system font, if one is found.  If none of
 * the candidates exist, the renderer uses calibrated fallback
 * metrics.  Runs at most once; does nothing if fonts were
 * already registered with registerMermaidFonts.
 */
export declare function registerMermaidFont(): void;
/**
 * Render Mermaid diagram text to an SVG string.
 */
export declare function renderMermaidSvg(code: string, configJSON?: string, themePreset?: string): string;
export type MermaidRenderOptions = {
    /**
     * Mermaid diagram text to render
     */
    code: string;
    /**
     * File to write the SVG into
     */
    outputFN: string;
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
    /**
     * TTF/OTF font files to register for text measurement.
     * When omitted, a common system font is used if found.
     */
    fontFNs?: string[];
};
export declare function doMermaid(options: MermaidRenderOptions): Promise<void>;
//# sourceMappingURL=render-mermaid.d.ts.map