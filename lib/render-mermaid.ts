
import fs, { promises as fsp } from 'node:fs';
import { encode } from 'html-entities';
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
export function adaptInlineSvg(
    svg: string, width?: number, alt?: string
): string {
    return svg.replace(/<svg([^>]*)>/, (_m, attrs) => {
        // The width attribute may carry a unit suffix,
        // such as PlantUML's width="123px".
        const naturalWidth = Number.parseFloat(
            attrs.match(/\swidth="([^"]*)"/)?.[1]);
        const style = (attrs.match(/\sstyle="([^"]*)"/)?.[1] ?? '')
            .split(';')
            .map(decl => decl.trim())
            .filter(decl => decl.length >= 1
                && !/^(width|height)\s*:/.test(decl));
        let adjusted = attrs
            .replace(/\swidth="[^"]*"/, '')
            .replace(/\sheight="[^"]*"/, '')
            .replace(/\sstyle="[^"]*"/, '');
        if (typeof width === 'number') {
            style.push(`width: ${width}px`);
        } else if (!Number.isNaN(naturalWidth)) {
            style.push(`max-width: ${naturalWidth}px`);
        }
        let extra = style.length >= 1
            ? ` style="${style.join('; ')}"`
            : '';
        extra += ' role="img"';
        if (typeof alt === 'string') {
            extra += ` aria-label="${encode(alt)}"`;
        }
        return `<svg${adjusted}${extra}>`;
    });
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
