/**
 * Register the named TTF/OTF font files for text measurement.
 * Suppresses the automatic system font registration - the
 * user-supplied fonts take priority.  Each file is registered
 * at most once, so this is safe to call for every render.
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
/**
 * Adjust the root element of a rendered SVG for inline embedding
 * in a web page.
 *
 * The renderer emits fixed pixel width= and height= attributes,
 * which overflow narrow containers.  Those attributes are removed
 * (the viewBox preserves the aspect ratio) and replaced with a
 * max-width style holding the diagram's natural width, so that
 * stylesheet rules like `width: 100%; height: auto` constrain the
 * diagram to its container without upscaling small diagrams.
 *
 * When an explicit width is given, it becomes a width style
 * instead, overriding any stylesheet sizing.
 *
 * An existing style attribute on the SVG root (PlantUML emits
 * one carrying width, height, and background) is merged: its
 * width and height declarations are superseded by the sizing
 * computed here, while other declarations such as background
 * survive.
 *
 * The alt text, when given, becomes an aria-label; the SVG is
 * marked role="img" for accessibility either way.
 */
export declare function adaptInlineSvg(svg: string, width?: number, alt?: string): string;
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