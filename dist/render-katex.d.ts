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
export declare function renderKaTeXHtml(code: string, options?: KaTeXOptions): string;
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
export declare function doKaTeX(options: KaTeXRenderOptions): Promise<void>;
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
export declare class KaTeXLocal extends akasha.CustomElement {
    get elementName(): string;
    process($element: any, metadata: any, dirty: Function): Promise<string>;
}
//# sourceMappingURL=render-katex.d.ts.map