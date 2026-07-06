
import path from 'node:path';
import fs, { promises as fsp } from 'node:fs';
import { encode } from 'html-entities';
import { renderSvg, renderSvgWithConfig, registerFont } from 'mermaid-wasm-renderer';
import * as akasha from 'akasharender';

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

/**
 * Handle converting a single Mermaid diagram for display
 * in a document, from the <diagrams-mermaid> element.
 *
 * The diagram is either inline in the element body or in
 * the file named by the input-file attribute.  With an
 * output-file attribute the SVG is written to that file
 * and referenced with <img>; without it the SVG is
 * embedded inline in the generated HTML.
 */
export class MermaidLocal extends akasha.CustomElement {
	get elementName() { return "diagrams-mermaid"; }

    async process($element, metadata, dirty: Function) {

        let code = $element.text();
        const outputFN = $element.attr('output-file');
        const inf =  $element.attr('input-file');

        // console.log(`MermaidLocal ${inf} ==> ${outputFN}`);

        let vpathIn;
        let fspathIn;
        if (typeof inf === 'string'
         && inf.length >= 1
        ) {
            if (path.isAbsolute(inf)) {
                vpathIn = inf;
            } else {
                let dir = path.dirname(metadata.document.path);
                vpathIn = path.normalize(
                    path.join('/', dir, inf)
                );
            }
        }
        const documents = this.config.akasha.filecache.documentsCache;
        const assets = this.akasha.filecache.assetsCache;

        // console.log(`MermaidLocal ${inf} ${vpathIn}`);

        const doc = vpathIn
            ? await documents.find(vpathIn)
            : undefined;

        let asset;
        if (!doc) asset = vpathIn
            ? await assets.find(vpathIn)
            : undefined;
   
        if (doc) fspathIn = doc.fspath;
        else if (asset) fspathIn = asset.fspath;

        // console.log(`MermaidLocal ${inf} ${vpathIn} ${fspathIn}`);

        if (typeof fspathIn === 'string') {
            code = await fsp.readFile(fspathIn, 'utf-8');
        }

        if (typeof code !== 'string' || code.length < 1) {
            throw new Error(`diagrams-mermaid requires an input-file or an inline diagram body`);
        }

        // console.log(`MermaidLocal ${inf} ${vpathIn} ${fspathIn} read code ${code}`);

        const mermaidOptions = this.array.options?.mermaid ?? {};

        // With no output-file attribute, the rendered SVG is
        // inserted inline in the generated HTML rather than
        // written to a file and referenced with <img>.
        const inlineMode = typeof outputFN !== 'string'
                        || outputFN.length < 1;

        let svg;
        let fspathOut;
        if (!inlineMode) {
            if (!outputFN.endsWith('.svg')) {
                throw new Error(`diagrams-mermaid must have output-file with .svg extension - mermaid-wasm-renderer does not support .png`);
            }

            fspathOut = path.join(
                this.config.renderDestination, outputFN
            );

            await fsp.mkdir(path.dirname(fspathOut), {
                recursive: true
            });
        }

        try {
            if (inlineMode) {
                if (Array.isArray(mermaidOptions.fontFNs)
                 && mermaidOptions.fontFNs.length >= 1
                ) {
                    registerMermaidFonts(mermaidOptions.fontFNs);
                }
                svg = renderMermaidSvg(code,
                    mermaidOptions.configJSON,
                    mermaidOptions.themePreset);
            } else {
                await doMermaid({
                    code,
                    outputFN: fspathOut,
                    configJSON: mermaidOptions.configJSON,
                    themePreset: mermaidOptions.themePreset,
                    fontFNs: mermaidOptions.fontFNs
                });
            }
        } catch (err) {
            console.error(`Mermaid threw error ${err.message}
Input: ${inf} ${fspathIn} Output: ${outputFN} ${fspathOut}
${code}
`);
            return `
<div class="diagrams-render-error">
<span class="diagrams-title">Mermaid threw error ${encode(err.message)}</span>
<span class="diagrams-error-files">
<b>Input:</b> ${inf} ${fspathIn}<br/>
<b>Output:</b> ${outputFN} ${fspathOut}</span>
<code class="diagrams-error-input"><pre>${encode(code)}</pre></code>
</div>
`;
            // throw new Error(`Mermaid threw error ${err.message}`);
        }

        // else
        let width = $element.attr('width');
        if (typeof width === 'string') {
            width = Number.parseFloat(width);
            if (isNaN(width)) {
                throw new Error(`diagrams-mermaid: width is not a number ${width}`);
            }
        }

        const id = $element.attr('id');
        const clazz = $element.attr('class');
        const alt = $element.attr('alt');
        const title = $element.attr('title');
        const caption = $element.attr('caption');

        const cap = typeof caption === 'string'
            ? `<figcaption>${encode(caption)}</figcaption>`
            : '';
        const Talt = typeof alt === 'string'
            ? `alt="${encode(alt)}"`
            : '';
        const Ttitle = typeof title === 'string'
            ? `title="${encode(title)}"`
            : '';
        const Tid = typeof id === 'string'
            ? `id="${encode(id)}"`
            : '';
        // The diagrams-mermaid class carries the stylesheet rules
        // constraining the diagram to its container (issue #19).
        const Tclazz = typeof clazz === 'string'
            ? `class="diagrams-mermaid ${encode(clazz)}"`
            : `class="diagrams-mermaid"`;
        const Twidth = typeof width === 'number'
            ? `width="${width.toString()}"`
            : '';

        // In inline mode there is no <img> to carry the alt, title,
        // and width attributes.  The alt text becomes an aria-label
        // on the SVG root, the width becomes a width style on the
        // SVG root, and the title lands on the <figure>.
        const ret = inlineMode
            ? `
        <figure ${Tid} ${Tclazz} ${Ttitle}>
        ${adaptInlineSvg(svg,
            typeof width === 'number' ? width : undefined,
            typeof alt === 'string' ? alt : undefined)}
        ${cap}
        </figure>
        `
            : `
        <figure ${Tid} ${Tclazz}>
        <img src="${encode(outputFN)}" ${Talt} ${Ttitle} ${Twidth}/>
        ${cap}
        </figure>
        `;
        // console.log(`MermaidLocal returning `, {
        //     id: id,
        //     Tid: Tid,
        //     inputFile: inf,
        //     outputFN: outputFN,
        //     ret: ret
        // });
        // console.log(`MermaidLocal returning ${ret}`);
        return ret;
    }
}
