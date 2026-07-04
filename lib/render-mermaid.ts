
import fs, { promises as fsp } from 'node:fs';
import { renderSvg, renderSvgWithConfig, registerFont } from 'mermaid-wasm-renderer';

// The WASM renderer cannot see the filesystem, so for exact text
// measurement fonts are read here and passed in as bytes.

let mermaidFontRegistered = false;

const registeredFontFNs = new Set<string>();

/**
 * Register the named TTF/OTF font files for text measurement.
 * Suppresses the automatic system font registration - the
 * user-supplied fonts take priority.  Each file is registered
 * at most once, so this is safe to call for every render.
 */
export function registerMermaidFonts(fontFNs: string[]) {
    for (const fontFN of fontFNs) {
        if (registeredFontFNs.has(fontFN)) continue;
        registerFont(fs.readFileSync(fontFN));
        registeredFontFNs.add(fontFN);
    }
    mermaidFontRegistered = true;
}

/**
 * Register a common system font, if one is found.  If none of
 * the candidates exist, the renderer uses calibrated fallback
 * metrics.  Runs at most once; does nothing if fonts were
 * already registered with registerMermaidFonts.
 */
export function registerMermaidFont() {
    if (mermaidFontRegistered) return;
    mermaidFontRegistered = true;
    const candidates = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
        '/usr/share/fonts/TTF/DejaVuSans.ttf',
        '/System/Library/Fonts/Helvetica.ttc',
        'C:\\Windows\\Fonts\\arial.ttf',
    ];
    for (const fontFN of candidates) {
        try {
            registerFont(fs.readFileSync(fontFN));
            return;
        } catch (err) {
            // Try the next candidate.
        }
    }
}

/**
 * Render Mermaid diagram text to an SVG string.
 */
export function renderMermaidSvg(
    code: string,
    configJSON?: string,
    themePreset?: string
): string {
    registerMermaidFont();
    return (configJSON || themePreset)
        ? renderSvgWithConfig(code, configJSON, themePreset)
        : renderSvg(code);
}

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

export async function doMermaid(
    options: MermaidRenderOptions
): Promise<void> {
    if (Array.isArray(options.fontFNs)
     && options.fontFNs.length >= 1
    ) {
        registerMermaidFonts(options.fontFNs);
    }

    const svg = renderMermaidSvg(
        options.code, options.configJSON, options.themePreset);

    await fsp.writeFile(options.outputFN, svg, 'utf-8');
}
