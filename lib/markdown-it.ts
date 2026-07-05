import { encode } from 'html-entities';
import {
    adaptInlineSvg,
    registerMermaidFonts,
    renderMermaidSvg
} from './render-mermaid.js';

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
