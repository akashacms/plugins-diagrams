import { encode } from 'html-entities';
import { adaptInlineSvg, registerMermaidFonts, renderMermaidSvg } from './render-mermaid.js';
import { renderKaTeXHtml } from './render-katex.js';
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
export function MarkdownITMermaidPlugin(md, opts) {
    const options = opts ?? {};
    if (Array.isArray(options.fontFNs)
        && options.fontFNs.length >= 1) {
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
            }
            else {
                title = '';
            }
            try {
                const svg = renderMermaidSvg(code, options.configJSON, options.themePreset);
                const cap = title !== ''
                    ? `<figcaption>${encode(title)}</figcaption>`
                    : '';
                return `<figure class="diagrams-mermaid">
${adaptInlineSvg(svg)}
${cap}
</figure>
`;
            }
            catch (err) {
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
    };
}
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
export function MarkdownITKaTeXPlugin(md, opts) {
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
            }
            catch (err) {
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
    };
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
    };
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
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd24taXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9saWIvbWFya2Rvd24taXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUN2QyxPQUFPLEVBQ0gsY0FBYyxFQUNkLG9CQUFvQixFQUNwQixnQkFBZ0IsRUFDbkIsTUFBTSxxQkFBcUIsQ0FBQztBQUM3QixPQUFPLEVBRUgsZUFBZSxFQUNsQixNQUFNLG1CQUFtQixDQUFDO0FBc0IzQjs7Ozs7Ozs7OztHQVVHO0FBQ0gsTUFBTSxVQUFVLHVCQUF1QixDQUFDLEVBQUUsRUFBRSxJQUEyQjtJQUVuRSxNQUFNLE9BQU8sR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO0lBRTNCLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDO1dBQzlCLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxJQUFJLENBQUMsRUFDN0IsQ0FBQztRQUNDLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBRUQsTUFBTSxlQUFlLEdBQUcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBRXhFLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsRUFBRTtRQUM1RCxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDMUIsa0VBQWtFO1FBQ2xFLGtFQUFrRTtRQUNsRSxnRUFBZ0U7UUFDaEUseURBQXlEO1FBQ3pELEVBQUU7UUFDRiw2REFBNkQ7UUFDN0Qsa0JBQWtCO1FBQ2xCLHVHQUF1RztRQUN2RyxNQUFNLElBQUks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cm9tICdodG1sLWVudGl0aWVzJztcbmltcG9ydCB7XG4gICAgYWRhcHRJbmxpbmVTdmcsXG4gICAgcmVnaXN0ZXJNZXJtYWlkRm9udHMsXG4gICAgcmVuZGVyTWVybWFpZFN2Z1xufSBmcm9tICcuL3JlbmRlci1tZXJtYWlkLmpzJztcbmltcG9ydCB7XG4gICAgS2FUZVhPcHRpb25zLFxuICAgIHJlbmRlckthVGVYSHRtbFxufSBmcm9tICcuL3JlbmRlci1rYXRleC5qcyc7XG5cbmV4cG9ydCB0eXBlIE1lcm1haWRQbHVnaW5PcHRpb25zID0ge1xuICAgIC8qKlxuICAgICAqIFRURi9PVEYgZm9udCBmaWxlcyB0byByZWdpc3RlciBmb3IgdGV4dCBtZWFzdXJlbWVudC5cbiAgICAgKiBXaGVuIG9taXR0ZWQsIGEgY29tbW9uIHN5c3RlbSBmb250IGlzIHVzZWQgaWYgZm91bmQuXG4gICAgICovXG4gICAgZm9udEZOcz86IHN0cmluZ1tdO1xuXG4gICAgLyoqXG4gICAgICogSlNPTiBjb25maWd1cmF0aW9uIHN0cmluZyB1c2luZyB0aGUgc2FtZSBzY2hlbWEgYXMgdGhlXG4gICAgICogbW1kciAtLWNvbmZpZyBmaWxlICh0aGVtZSwgdGhlbWVWYXJpYWJsZXMsIGZsb3djaGFydCwgLi4uKVxuICAgICAqL1xuICAgIGNvbmZpZ0pTT04/OiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBUaGVtZSBwcmVzZXQgbmFtZTogZGVmYXVsdCwgZGFyaywgZm9yZXN0LCBuZXV0cmFsLCBtb2Rlcm4uXG4gICAgICogVGFrZXMgcHJlY2VkZW5jZSBvdmVyIHRoZSBjb25maWcncyB0aGVtZSBuYW1lLlxuICAgICAqL1xuICAgIHRoZW1lUHJlc2V0Pzogc3RyaW5nO1xufTtcblxuLyoqXG4gKiBBZGQgTWVybWFpZCBzdXBwb3J0IHRvIE1hcmtkb3duLUlUIHN1Y2ggdGhhdCBgYGBtZXJtYWlkIC4uIGBgYCBpc1xuICogcmVuZGVyZWQgdG8gaW5saW5lIFNWRyB1c2luZyBtZXJtYWlkLXdhc20tcmVuZGVyZXIuXG4gKlxuICogUmVuZGVyaW5nIGlzIHN5bmNocm9ub3VzIGFuZCBoYXBwZW5zIGluLXByb2Nlc3MsIHNvIHRoZSBTVkcgaXNcbiAqIGVtYmVkZGVkIGRpcmVjdGx5IGluIHRoZSBnZW5lcmF0ZWQgSFRNTC4gIE5vIGludGVybWVkaWF0ZSBmaWxlc1xuICogYXJlIHByb2R1Y2VkLlxuICpcbiAqIEBwYXJhbSBtZFxuICogQHBhcmFtIG9wdHNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIE1hcmtkb3duSVRNZXJtYWlkUGx1Z2luKG1kLCBvcHRzPzogTWVybWFpZFBsdWdpbk9wdGlvbnMpIHtcblxuICAgIGNvbnN0IG9wdGlvbnMgPSBvcHRzID8/IHt9O1xuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkob3B0aW9ucy5mb250Rk5zKVxuICAgICAmJiBvcHRpb25zLmZvbnRGTnMubGVuZ3RoID49IDFcbiAgICApIHtcbiAgICAgICAgcmVnaXN0ZXJNZXJtYWlkRm9udHMob3B0aW9ucy5mb250Rk5zKTtcbiAgICB9XG5cbiAgICBjb25zdCBkZWZhdWx0UmVuZGVyZXIgPSBtZC5yZW5kZXJlci5ydWxlcy5mZW5jZS5iaW5kKG1kLnJlbmRlcmVyLnJ1bGVzKTtcblxuICAgIG1kLnJlbmRlcmVyLnJ1bGVzLmZlbmNlID0gKHRva2VucywgaWR4LCBtZE9wdGlvbnMsIGVudiwgc2VsZikgPT4ge1xuICAgICAgICBjb25zdCB0b2tlbiA9IHRva2Vuc1tpZHhdO1xuICAgICAgICAvLyBUaGUgaWRlYSBpcyB0cmltbWluZyBvZmYgZXhjZXNzIHdoaXRlc3BhY2UgZnJvbSB0aGUgY29kZSBibG9jay5cbiAgICAgICAgLy8gQnV0LCB1c2luZyB0aGUgLnRyaW0gZnVuY3Rpb24gcmVtb3ZlcyBib3RoIG5ld2xpbmVzIGFuZCBzcGFjZXMuXG4gICAgICAgIC8vIEZvciBzb21lIE1lcm1haWQgZGlhZ3JhbXMsIHRyYWlsaW5nIHNwYWNlcyBhcmUgaW1wb3J0YW50LCBhbmRcbiAgICAgICAgLy8gaWYgdGhlIHRyYWlsaW5nIHNwYWNlcyBhcmUgbWlzc2luZyBhbiBlcnJvciBpcyB0aHJvd24uXG4gICAgICAgIC8vXG4gICAgICAgIC8vIFRoaXMgcmVwbGFjZSBjYWxsIHJlbW92ZXMgb25seSB0aGUgbmV3bGluZXMgbGVhdmluZyBiZWhpbmRcbiAgICAgICAgLy8gYW55IHdoaXRlc3BhY2UuXG4gICAgICAgIC8vIFNvdXJjZTogaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTQ1NzI0MTMvcmVtb3ZlLWxpbmUtYnJlYWtzLWZyb20tc3RhcnQtYW5kLWVuZC1vZi1zdHJpbmdcbiAgICAgICAgY29uc3QgY29kZSA9IHRva2VuLmNvbnRlbnQucmVwbGFjZSgvXlxcbnxcXG4kL2csICcnKTsgLy8udHJpbSgpO1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhgTWVybWFpZFBsdWdpbiBydWxlcy5mZW5jZSAke3Rva2VuLmluZm99ICR7Y29kZX1gLCBvcHRzKTtcbiAgICAgICAgaWYgKHRva2VuLmluZm8uc3RhcnRzV2l0aCgnbWVybWFpZCcpKSB7XG4gICAgICAgICAgICBsZXQgdGl0bGU7XG4gICAgICAgICAgICBjb25zdCBzcGMgPSB0b2tlbi5pbmZvLmluZGV4T2YoJyAnLCA3KTtcbiAgICAgICAgICAgIGlmIChzcGMgPiAwKSB7XG4gICAgICAgICAgICAgICAgdGl0bGUgPSB0b2tlbi5pbmZvLnNsaWNlKHNwYyArIDEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aXRsZSA9ICcnO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHN2ZyA9IHJlbmRlck1lcm1haWRTdmcoXG4gICAgICAgICAgICAgICAgICAgIGNvZGUsIG9wdGlvbnMuY29uZmlnSlNPTiwgb3B0aW9ucy50aGVtZVByZXNldCk7XG4gICAgICAgICAgICAgICAgY29uc3QgY2FwID0gdGl0bGUgIT09ICcnXG4gICAgICAgICAgICAgICAgICAgID8gYDxmaWdjYXB0aW9uPiR7ZW5jb2RlKHRpdGxlKX08L2ZpZ2NhcHRpb24+YFxuICAgICAgICAgICAgICAgICAgICA6ICcnO1xuICAgICAgICAgICAgICAgIHJldHVybiBgPGZpZ3VyZSBjbGFzcz1cImRpYWdyYW1zLW1lcm1haWRcIj5cbiR7YWRhcHRJbmxpbmVTdmcoc3ZnKX1cbiR7Y2FwfVxuPC9maWd1cmU+XG5gO1xuICAgICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgTWVybWFpZCB0aHJldyBlcnJvciAke2Vyci5tZXNzYWdlfVxuJHtjb2RlfVxuYCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGBcbjxkaXYgY2xhc3M9XCJkaWFncmFtcy1yZW5kZXItZXJyb3JcIj5cbjxzcGFuIGNsYXNzPVwiZGlhZ3JhbXMtdGl0bGVcIj5NZXJtYWlkIHRocmV3IGVycm9yICR7ZW5jb2RlKGVyci5tZXNzYWdlKX08L3NwYW4+XG48Y29kZSBjbGFzcz1cImRpYWdyYW1zLWVycm9yLWlucHV0XCI+PHByZT4ke2VuY29kZShjb2RlKX08L3ByZT48L2NvZGU+XG48L2Rpdj5cbmA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRlZmF1bHRSZW5kZXJlcih0b2tlbnMsIGlkeCwgbWRPcHRpb25zLCBlbnYsIHNlbGYpO1xuICAgIH1cbn1cblxuZXhwb3J0IHR5cGUgS2FUZVhQbHVnaW5PcHRpb25zID0gS2FUZVhPcHRpb25zO1xuXG4vKipcbiAqIEFkZCBLYVRlWCBzdXBwb3J0IHRvIE1hcmtkb3duLUlUIHN1Y2ggdGhhdCBgYGBtYXRoIC4uIGBgYCAob3JcbiAqIGBgYGthdGV4IC4uIGBgYCkgaXMgcmVuZGVyZWQgdG8gaW5saW5lIEhUTUwgbWFya3VwIHVzaW5nIHRoZVxuICogS2FUZVggcmVuZGVyVG9TdHJpbmcgZnVuY3Rpb24uXG4gKlxuICogUmVuZGVyaW5nIGlzIHN5bmNocm9ub3VzIGFuZCBoYXBwZW5zIGluLXByb2Nlc3MsIHNvIHRoZSBtYXJrdXBcbiAqIGlzIGVtYmVkZGVkIGRpcmVjdGx5IGluIHRoZSBnZW5lcmF0ZWQgSFRNTC4gIE5vIGludGVybWVkaWF0ZVxuICogZmlsZXMgYXJlIHByb2R1Y2VkLiAgVGhlIG1hdGggaXMgcmVuZGVyZWQgaW4gZGlzcGxheSAoYmxvY2spXG4gKiBtb2RlLlxuICpcbiAqIFRoZSBnZW5lcmF0ZWQgbWFya3VwIHJlcXVpcmVzIHRoZSBLYVRlWCBzdHlsZXNoZWV0LiAgVGhlXG4gKiBEaWFncmFtc1BsdWdpbiBhZGRzIGl0IHRvIEFrYXNoYUNNUyBwcm9qZWN0cyB3aGVuIGNvbmZpZ3VyZWRcbiAqIHdpdGggYSBrYXRleCBvcHRpb25zIG9iamVjdDsgb3V0c2lkZSBBa2FzaGFDTVMgaW5jbHVkZVxuICoga2F0ZXgvZGlzdC9rYXRleC5taW4uY3NzIGluIHRoZSBwYWdlIHlvdXJzZWxmLlxuICpcbiAqIEFzIHdpdGggdGhlIE1lcm1haWQgcGx1Z2luLCB0ZXh0IGZvbGxvd2luZyB0aGUgbGFuZ3VhZ2UgbmFtZVxuICogKGBgYG1hdGggQSBjYXB0aW9uKSBiZWNvbWVzIHRoZSBmaWd1cmUgY2FwdGlvbi5cbiAqXG4gKiBAcGFyYW0gbWRcbiAqIEBwYXJhbSBvcHRzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBNYXJrZG93bklUS2FUZVhQbHVnaW4obWQsIG9wdHM/OiBLYVRlWFBsdWdpbk9wdGlvbnMpIHtcblxuICAgIGNvbnN0IG9wdGlvbnMgPSBvcHRzID8/IHt9O1xuXG4gICAgY29uc3QgZGVmYXVsdFJlbmRlcmVyID0gbWQucmVuZGVyZXIucnVsZXMuZmVuY2UuYmluZChtZC5yZW5kZXJlci5ydWxlcyk7XG5cbiAgICBtZC5yZW5kZXJlci5ydWxlcy5mZW5jZSA9ICh0b2tlbnMsIGlkeCwgbWRPcHRpb25zLCBlbnYsIHNlbGYpID0+IHtcbiAgICAgICAgY29uc3QgdG9rZW4gPSB0b2tlbnNbaWR4XTtcbiAgICAgICAgY29uc3QgbGFuZyA9IHRva2VuLmluZm8udHJpbSgpLnNwbGl0KC9cXHMrLylbMF07XG4gICAgICAgIGlmIChsYW5nID09PSAnbWF0aCcgfHwgbGFuZyA9PT0gJ2thdGV4Jykge1xuICAgICAgICAgICAgY29uc3QgY29kZSA9IHRva2VuLmNvbnRlbnQucmVwbGFjZSgvXlxcbnxcXG4kL2csICcnKTtcbiAgICAgICAgICAgIGNvbnN0IHRpdGxlID0gdG9rZW4uaW5mby50cmltKClcbiAgICAgICAgICAgICAgICAgICAgLnNsaWNlKGxhbmcubGVuZ3RoKS50cmltKCk7XG5cbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaHRtbCA9IHJlbmRlckthVGVYSHRtbChjb2RlLCB7XG4gICAgICAgICAgICAgICAgICAgIGRpc3BsYXlNb2RlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBvdXRwdXQ6IG9wdGlvbnMub3V0cHV0LFxuICAgICAgICAgICAgICAgICAgICBtYWNyb3M6IG9wdGlvbnMubWFjcm9zXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgY29uc3QgY2FwID0gdGl0bGUgIT09ICcnXG4gICAgICAgICAgICAgICAgICAgID8gYDxmaWdjYXB0aW9uPiR7ZW5jb2RlKHRpdGxlKX08L2ZpZ2NhcHRpb24+YFxuICAgICAgICAgICAgICAgICAgICA6ICcnO1xuICAgICAgICAgICAgICAgIHJldHVybiBgPGZpZ3VyZSBjbGFzcz1cImRpYWdyYW1zLWthdGV4XCI+XG4ke2h0bWx9XG4ke2NhcH1cbjwvZmlndXJlPlxuYDtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEthVGVYIHRocmV3IGVycm9yICR7ZXJyLm1lc3NhZ2V9XG4ke2NvZGV9XG5gKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gYFxuPGRpdiBjbGFzcz1cImRpYWdyYW1zLXJlbmRlci1lcnJvclwiPlxuPHNwYW4gY2xhc3M9XCJkaWFncmFtcy10aXRsZVwiPkthVGVYIHRocmV3IGVycm9yICR7ZW5jb2RlKGVyci5tZXNzYWdlKX08L3NwYW4+XG48Y29kZSBjbGFzcz1cImRpYWdyYW1zLWVycm9yLWlucHV0XCI+PHByZT4ke2VuY29kZShjb2RlKX08L3ByZT48L2NvZGU+XG48L2Rpdj5cbmA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRlZmF1bHRSZW5kZXJlcih0b2tlbnMsIGlkeCwgbWRPcHRpb25zLCBlbnYsIHNlbGYpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBBZGQgUGludG9yYSBzdXBwb3J0IHRvIE1hcmtkb3duLUlUIHN1Y2ggdGhhdCBgYGBwaW50b3JhIC4uIGBgYFxuICogaXMgcmVuZGVyZWQgdG8gaW5saW5lIFNWRy5cbiAqXG4gKiBQaW50b3JhIHJlbmRlcmluZyBpcyBhc3luY2hyb25vdXMsIHdoaWxlIE1hcmtkb3duLUlUIHJlbmRlcmVyXG4gKiBydWxlcyBhcmUgc3luY2hyb25vdXMuICBUaGVyZWZvcmUgdGhlIGZlbmNlIGlzIG5vdCByZW5kZXJlZFxuICogaGVyZS4gIEluc3RlYWQgaXQgaXMgY29udmVydGVkIGludG8gYSA8ZGlhZ3JhbXMtcGludG9yYT5cbiAqIGVsZW1lbnQgd2l0aCBubyBvdXRwdXQtZmlsZSwgd2hpY2ggdGhlIERpYWdyYW1zUGx1Z2luIE1haGFmdW5jXG4gKiByZW5kZXJzIHRvIGlubGluZSBTVkcgZHVyaW5nIE1haGFiaHV0YSBwcm9jZXNzaW5nLlxuICogQ29uc2VxdWVudGx5IHRoaXMgcGx1Z2luIHJlcXVpcmVzIHRoZSBBa2FzaGFDTVMgcmVuZGVyaW5nXG4gKiBwaXBlbGluZSB3aXRoIERpYWdyYW1zUGx1Z2luIGNvbmZpZ3VyZWQgLSBpdCBkb2VzIG5vdCB3b3JrXG4gKiB3aXRoIHN0YW5kYWxvbmUgTWFya2Rvd24tSVQuXG4gKlxuICogQXMgd2l0aCB0aGUgTWVybWFpZCBwbHVnaW4sIHRleHQgZm9sbG93aW5nIHRoZSBsYW5ndWFnZSBuYW1lXG4gKiAoYGBgcGludG9yYSBBIHRpdGxlKSBiZWNvbWVzIHRoZSBmaWd1cmUgY2FwdGlvbi5cbiAqXG4gKiBAcGFyYW0gbWRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIE1hcmtkb3duSVRQaW50b3JhUGx1Z2luKG1kKSB7XG5cbiAgICBjb25zdCBkZWZhdWx0UmVuZGVyZXIgPSBtZC5yZW5kZXJlci5ydWxlcy5mZW5jZS5iaW5kKG1kLnJlbmRlcmVyLnJ1bGVzKTtcblxuICAgIG1kLnJlbmRlcmVyLnJ1bGVzLmZlbmNlID0gKHRva2VucywgaWR4LCBtZE9wdGlvbnMsIGVudiwgc2VsZikgPT4ge1xuICAgICAgICBjb25zdCB0b2tlbiA9IHRva2Vuc1tpZHhdO1xuICAgICAgICBpZiAodG9rZW4uaW5mby5zdGFydHNXaXRoKCdwaW50b3JhJykpIHtcbiAgICAgICAgICAgIGNvbnN0IGNvZGUgPSB0b2tlbi5jb250ZW50LnJlcGxhY2UoL15cXG58XFxuJC9nLCAnJyk7XG5cbiAgICAgICAgICAgIGxldCB0aXRsZSA9ICcnO1xuICAgICAgICAgICAgY29uc3Qgc3BjID0gdG9rZW4uaW5mby5pbmRleE9mKCcgJywgNyk7XG4gICAgICAgICAgICBpZiAoc3BjID4gMCkge1xuICAgICAgICAgICAgICAgIHRpdGxlID0gdG9rZW4uaW5mby5zbGljZShzcGMgKyAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IFRjYXB0aW9uID0gdGl0bGUgIT09ICcnXG4gICAgICAgICAgICAgICAgPyBgIGNhcHRpb249XCIke2VuY29kZSh0aXRsZSl9XCJgXG4gICAgICAgICAgICAgICAgOiAnJztcblxuICAgICAgICAgICAgLy8gVGhlIGRpYWdyYW0gdGV4dCBpcyBlbnRpdHktZW5jb2RlZCBzbyB0aGF0XG4gICAgICAgICAgICAvLyBjaGFyYWN0ZXJzIGxpa2UgPCBhbmQgPiBzdXJ2aXZlIHRoZSB0cmlwXG4gICAgICAgICAgICAvLyB0aHJvdWdoIHRoZSBIVE1MIHBhcnNlciAtICRlbGVtZW50LnRleHQoKVxuICAgICAgICAgICAgLy8gZGVjb2RlcyB0aGVtLlxuICAgICAgICAgICAgcmV0dXJuIGA8ZGlhZ3JhbXMtcGludG9yYSR7VGNhcHRpb259PlxuJHtlbmNvZGUoY29kZSl9XG48L2RpYWdyYW1zLXBpbnRvcmE+XG5gO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkZWZhdWx0UmVuZGVyZXIodG9rZW5zLCBpZHgsIG1kT3B0aW9ucywgZW52LCBzZWxmKTtcbiAgICB9XG59XG5cbi8qKlxuICogQWRkIFBsYW50VU1MIHN1cHBvcnQgdG8gTWFya2Rvd24tSVQgc3VjaCB0aGF0IGBgYHBsYW50dW1sIC4uIGBgYFxuICogaXMgcmVuZGVyZWQgdG8gaW5saW5lIFNWRy5cbiAqXG4gKiBQbGFudFVNTCByZW5kZXJpbmcgaXMgYXN5bmNocm9ub3VzIChhIFBsYW50VU1MIHNlcnZlciByZXF1ZXN0XG4gKiBvciBhIGNoaWxkIEphdmEgcHJvY2VzcyksIHdoaWxlIE1hcmtkb3duLUlUIHJlbmRlcmVyIHJ1bGVzIGFyZVxuICogc3luY2hyb25vdXMuICBUaGVyZWZvcmUgdGhlIGZlbmNlIGlzIG5vdCByZW5kZXJlZCBoZXJlLlxuICogSW5zdGVhZCBpdCBpcyBjb252ZXJ0ZWQgaW50byBhIDxkaWFncmFtcy1wbGFudHVtbCB0c3ZnPlxuICogZWxlbWVudCwgd2hpY2ggdGhlIERpYWdyYW1zUGx1Z2luIE1haGFmdW5jIHJlbmRlcnMgdG8gaW5saW5lXG4gKiBTVkcgZHVyaW5nIE1haGFiaHV0YSBwcm9jZXNzaW5nLiAgQ29uc2VxdWVudGx5IHRoaXMgcGx1Z2luXG4gKiByZXF1aXJlcyB0aGUgQWthc2hhQ01TIHJlbmRlcmluZyBwaXBlbGluZSB3aXRoIERpYWdyYW1zUGx1Z2luXG4gKiBjb25maWd1cmVkIC0gaXQgZG9lcyBub3Qgd29yayB3aXRoIHN0YW5kYWxvbmUgTWFya2Rvd24tSVQuXG4gKlxuICogQXMgd2l0aCB0aGUgTWVybWFpZCBwbHVnaW4sIHRleHQgZm9sbG93aW5nIHRoZSBsYW5ndWFnZSBuYW1lXG4gKiAoYGBgcGxhbnR1bWwgQSB0aXRsZSkgYmVjb21lcyB0aGUgZmlndXJlIGNhcHRpb24uXG4gKlxuICogV2hlbiB0aGUgZGlhZ3JhbSB0ZXh0IGRvZXMgbm90IGJlZ2luIHdpdGggYSBAc3RhcnQgbGluZSwgaXRcbiAqIGlzIHdyYXBwZWQgaW4gQHN0YXJ0dW1sL0BlbmR1bWwsIHNvIHNpbXBsZSBkaWFncmFtcyBuZWVkIG5vdFxuICogc3BlbGwgdGhvc2Ugb3V0LlxuICpcbiAqIEBwYXJhbSBtZFxuICovXG5leHBvcnQgZnVuY3Rpb24gTWFya2Rvd25JVFBsYW50VU1MUGx1Z2luKG1kKSB7XG5cbiAgICBjb25zdCBkZWZhdWx0UmVuZGVyZXIgPSBtZC5yZW5kZXJlci5ydWxlcy5mZW5jZS5iaW5kKG1kLnJlbmRlcmVyLnJ1bGVzKTtcblxuICAgIG1kLnJlbmRlcmVyLnJ1bGVzLmZlbmNlID0gKHRva2VucywgaWR4LCBtZE9wdGlvbnMsIGVudiwgc2VsZikgPT4ge1xuICAgICAgICBjb25zdCB0b2tlbiA9IHRva2Vuc1tpZHhdO1xuICAgICAgICBpZiAodG9rZW4uaW5mby5zdGFydHNXaXRoKCdwbGFudHVtbCcpKSB7XG4gICAgICAgICAgICBsZXQgY29kZSA9IHRva2VuLmNvbnRlbnQucmVwbGFjZSgvXlxcbnxcXG4kL2csICcnKTtcbiAgICAgICAgICAgIGlmICghL15cXHMqQHN0YXJ0Ly50ZXN0KGNvZGUpKSB7XG4gICAgICAgICAgICAgICAgY29kZSA9IGBAc3RhcnR1bWxcXG4ke2NvZGV9XFxuQGVuZHVtbGA7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGxldCB0aXRsZSA9ICcnO1xuICAgICAgICAgICAgY29uc3Qgc3BjID0gdG9rZW4uaW5mby5pbmRleE9mKCcgJywgOCk7XG4gICAgICAgICAgICBpZiAoc3BjID4gMCkge1xuICAgICAgICAgICAgICAgIHRpdGxlID0gdG9rZW4uaW5mby5zbGljZShzcGMgKyAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IFRjYXB0aW9uID0gdGl0bGUgIT09ICcnXG4gICAgICAgICAgICAgICAgPyBgIGNhcHRpb249XCIke2VuY29kZSh0aXRsZSl9XCJgXG4gICAgICAgICAgICAgICAgOiAnJztcblxuICAgICAgICAgICAgLy8gVGhlIGRpYWdyYW0gdGV4dCBpcyBlbnRpdHktZW5jb2RlZCBzbyB0aGF0XG4gICAgICAgICAgICAvLyBjaGFyYWN0ZXJzIGxpa2UgPCBhbmQgPiBzdXJ2aXZlIHRoZSB0cmlwXG4gICAgICAgICAgICAvLyB0aHJvdWdoIHRoZSBIVE1MIHBhcnNlciAtICRlbGVtZW50LnRleHQoKVxuICAgICAgICAgICAgLy8gZGVjb2RlcyB0aGVtLlxuICAgICAgICAgICAgcmV0dXJuIGA8ZGlhZ3JhbXMtcGxhbnR1bWwgdHN2ZyR7VGNhcHRpb259PlxuJHtlbmNvZGUoY29kZSl9XG48L2RpYWdyYW1zLXBsYW50dW1sPlxuYDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGVmYXVsdFJlbmRlcmVyKHRva2VucywgaWR4LCBtZE9wdGlvbnMsIGVudiwgc2VsZik7XG4gICAgfVxufVxuIl19