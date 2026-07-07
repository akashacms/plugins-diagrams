import { encode } from 'html-entities';
import {
    adaptInlineSvg,
    registerMermaidFonts,
    renderMermaidSvg
} from './render-mermaid.js';
import {
    KaTeXOptions,
    renderKaTeXHtml
} from './render-katex.js';

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
export function MarkdownITMermaidPlugin(md, opts?: MermaidPluginOptions) {

    const options = opts ?? {};

    if (Array.isArray(options.fontFNs)
     && options.fontFNs.length >= 1
    ) {
        registerMermaidFonts(options.fontFNs);
    }

    const defaultRenderer = md.renderer.rules.fence.bind(md.renderer.rules);

    md.renderer.rules.fence = (tokens, idx, mdOptions, env, self) => {
        const token = tokens[idx];
        // The idea is trimming off excess whitespace from the code block.
        // But, using the .trim function removes both newlines and spaces.
        // For some Mermaid diagrams, trailing spaces are important, and
        // if the trailing spaces are missing an error is thrown.
        //
        // This replace call removes only the newlines leaving behind
        // any whitespace.
        // Source: https://stackoverflow.com/questions/14572413/remove-line-breaks-from-start-and-end-of-string
        const code = token.content.replace(/^\n|\n$/g, ''); //.trim();
        // console.log(`MermaidPlugin rules.fence ${token.info} ${code}`, opts);
        if (token.info.startsWith('mermaid')) {
            let title;
            const spc = token.info.indexOf(' ', 7);
            if (spc > 0) {
                title = token.info.slice(spc + 1);
            } else {
                title = '';
            }

            try {
                const svg = renderMermaidSvg(
                    code, options.configJSON, options.themePreset);
                const cap = title !== ''
                    ? `<figcaption>${encode(title)}</figcaption>`
                    : '';
                return `<figure class="diagrams-mermaid">
${adaptInlineSvg(svg)}
${cap}
</figure>
`;
            } catch (err) {
                console.error(`Mermaid threw error ${err.message}
${code}
`);
                return `
<div class="diagrams-render-error">
<span class="diagrams-title">Mermaid threw error ${encode(err.message)}</span>
<code class="diagrams-error-input"><pre>${encode(code)}</pre></code>
</div>
`;
            }
        }
        return defaultRenderer(tokens, idx, mdOptions, env, self);
    }
}

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
export function MarkdownITKaTeXPlugin(md, opts?: KaTeXPluginOptions) {

    const options = opts ?? {};

    const defaultRenderer = md.renderer.rules.fence.bind(md.renderer.rules);

    md.renderer.rules.fence = (tokens, idx, mdOptions, env, self) => {
        const token = tokens[idx];
        const lang = token.info.trim().split(/\s+/)[0];
        if (lang === 'math' || lang === 'katex') {
            const code = token.content.replace(/^\n|\n$/g, '');
            const title = token.info.trim()
                    .slice(lang.length).trim();

            try {
                const html = renderKaTeXHtml(code, {
                    displayMode: true,
                    output: options.output,
                    macros: options.macros
                });
                const cap = title !== ''
                    ? `<figcaption>${encode(title)}</figcaption>`
                    : '';
                return `<figure class="diagrams-katex">
${html}
${cap}
</figure>
`;
            } catch (err) {
                console.error(`KaTeX threw error ${err.message}
${code}
`);
                return `
<div class="diagrams-render-error">
<span class="diagrams-title">KaTeX threw error ${encode(err.message)}</span>
<code class="diagrams-error-input"><pre>${encode(code)}</pre></code>
</div>
`;
            }
        }
        return defaultRenderer(tokens, idx, mdOptions, env, self);
    }
}

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
export function MarkdownITPintoraPlugin(md) {

    const defaultRenderer = md.renderer.rules.fence.bind(md.renderer.rules);

    md.renderer.rules.fence = (tokens, idx, mdOptions, env, self) => {
        const token = tokens[idx];
        if (token.info.startsWith('pintora')) {
            const code = token.content.replace(/^\n|\n$/g, '');

            let title = '';
            const spc = token.info.indexOf(' ', 7);
            if (spc > 0) {
                title = token.info.slice(spc + 1);
            }
            const Tcaption = title !== ''
                ? ` caption="${encode(title)}"`
                : '';

            // The diagram text is entity-encoded so that
            // characters like < and > survive the trip
            // through the HTML parser - $element.text()
            // decodes them.
            return `<diagrams-pintora${Tcaption}>
${encode(code)}
</diagrams-pintora>
`;
        }
        return defaultRenderer(tokens, idx, mdOptions, env, self);
    }
}

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
export function MarkdownITPlantUMLPlugin(md) {

    const defaultRenderer = md.renderer.rules.fence.bind(md.renderer.rules);

    md.renderer.rules.fence = (tokens, idx, mdOptions, env, self) => {
        const token = tokens[idx];
        if (token.info.startsWith('plantuml')) {
            let code = token.content.replace(/^\n|\n$/g, '');
            if (!/^\s*@start/.test(code)) {
                code = `@startuml\n${code}\n@enduml`;
            }

            let title = '';
            const spc = token.info.indexOf(' ', 8);
            if (spc > 0) {
                title = token.info.slice(spc + 1);
            }
            const Tcaption = title !== ''
                ? ` caption="${encode(title)}"`
                : '';

            // The diagram text is entity-encoded so that
            // characters like < and > survive the trip
            // through the HTML parser - $element.text()
            // decodes them.
            return `<diagrams-plantuml tsvg${Tcaption}>
${encode(code)}
</diagrams-plantuml>
`;
        }
        return defaultRenderer(tokens, idx, mdOptions, env, self);
    }
}
