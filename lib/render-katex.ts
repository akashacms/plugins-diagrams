
import path from 'node:path';
import { promises as fsp } from 'node:fs';
import { encode } from 'html-entities';
import katex from 'katex';
import * as akasha from 'akasharender';

/**
 * Options shared by every KaTeX rendering entry point.
 * They are a subset of the options accepted by the KaTeX
 * renderToString function.
 */
export type KaTeXOptions = {
    /**
     * Render in display (block) mode rather than inline mode.
     * Display mode centers the math on its own line.
     * Default: true.
     */
    displayMode?: boolean;

    /**
     * Markup to emit: htmlAndMathml (the default), html, or
     * mathml.  The default includes MathML alongside the HTML
     * for accessibility.
     */
    output?: 'html' | 'mathml' | 'htmlAndMathml';

    /**
     * A collection of custom macros, mapping macro names to
     * their expansions, such as { "\\RR": "\\mathbb{R}" }.
     */
    macros?: Record<string, string>;
};

/**
 * Render TeX math text to a KaTeX HTML string using the KaTeX
 * renderToString function.  Rendering is synchronous and happens
 * in-process.  Invalid TeX throws katex.ParseError.
 *
 * The generated markup requires the KaTeX stylesheet
 * (katex/dist/katex.min.css) to display correctly.
 */
export function renderKaTeXHtml(
    code: string, options?: KaTeXOptions
): string {
    return katex.renderToString(code, {
        displayMode: options?.displayMode ?? true,
        output: options?.output,
        macros: options?.macros,
        throwOnError: true
    });
}

export type KaTeXRenderOptions = KaTeXOptions & {
    /**
     * TeX math text to render
     */
    code: string;

    /**
     * File to write the HTML fragment into
     */
    outputFN: string;
};

export async function doKaTeX(
    options: KaTeXRenderOptions
): Promise<void> {
    const html = renderKaTeXHtml(options.code, options);
    await fsp.writeFile(options.outputFN, html, 'utf-8');
}

/**
 * Handle converting a single TeX math expression for display
 * in a document, from the <diagrams-katex> element.
 *
 * The math text is either inline in the element body or in
 * the file named by the input-file attribute.  The rendered
 * KaTeX markup is always embedded inline in the generated
 * HTML - unlike the diagram elements there is no output-file
 * mode, because the output is HTML markup rather than an
 * image that could be referenced with <img>.
 *
 * By default the math is rendered in display (block) mode
 * and wrapped in a <figure>.  With the inline property the
 * math is rendered in inline mode and wrapped in a <span>,
 * suitable for use within a paragraph.
 */
export class KaTeXLocal extends akasha.CustomElement {
	get elementName() { return "diagrams-katex"; }

    async process($element, metadata, dirty: Function) {

        let code = $element.text();
        const inf =  $element.attr('input-file');

        if (typeof $element.attr('output-file') === 'string') {
            throw new Error(`diagrams-katex renders inline HTML markup - output-file is not supported`);
        }

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

        const doc = vpathIn
            ? await documents.find(vpathIn)
            : undefined;

        let asset;
        if (!doc) asset = vpathIn
            ? await assets.find(vpathIn)
            : undefined;

        if (doc) fspathIn = doc.fspath;
        else if (asset) fspathIn = asset.fspath;

        if (typeof fspathIn === 'string') {
            code = await fsp.readFile(fspathIn, 'utf-8');
        }

        if (typeof code !== 'string' || code.trim().length < 1) {
            throw new Error(`diagrams-katex requires an input-file or an inline math body`);
        }

        const katexOptions = this.array.options?.katex ?? {};

        const inline = typeof $element.prop('inline') !== 'undefined';

        let html;
        try {
            html = renderKaTeXHtml(code, {
                displayMode: !inline,
                output: katexOptions.output,
                macros: katexOptions.macros
            });
        } catch (err) {
            console.error(`KaTeX threw error ${err.message}
Input: ${inf} ${fspathIn}
${code}
`);
            return `
<div class="diagrams-render-error">
<span class="diagrams-title">KaTeX threw error ${encode(err.message)}</span>
<span class="diagrams-error-files">
<b>Input:</b> ${inf} ${fspathIn}</span>
<code class="diagrams-error-input"><pre>${encode(code)}</pre></code>
</div>
`;
        }

        const id = $element.attr('id');
        const clazz = $element.attr('class');
        const title = $element.attr('title');
        const caption = $element.attr('caption');

        const cap = typeof caption === 'string'
            ? `<figcaption>${encode(caption)}</figcaption>`
            : '';
        const Ttitle = typeof title === 'string'
            ? `title="${encode(title)}"`
            : '';
        const Tid = typeof id === 'string'
            ? `id="${encode(id)}"`
            : '';
        // The diagrams-katex class carries the stylesheet rules
        // constraining wide equations to their container.
        const Tclazz = typeof clazz === 'string'
            ? `class="diagrams-katex ${encode(clazz)}"`
            : `class="diagrams-katex"`;

        return inline
            ? `<span ${Tid} ${Tclazz} ${Ttitle}>${html}</span>`
            : `
        <figure ${Tid} ${Tclazz} ${Ttitle}>
        ${html}
        ${cap}
        </figure>
        `;
    }
}
