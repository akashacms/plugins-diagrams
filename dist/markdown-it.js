import { encode } from 'html-entities';
import { adaptInlineSvg, registerMermaidFonts, renderMermaidSvg } from './render-mermaid.js';
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd24taXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9saWIvbWFya2Rvd24taXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUN2QyxPQUFPLEVBQ0gsY0FBYyxFQUNkLG9CQUFvQixFQUNwQixnQkFBZ0IsRUFDbkIsTUFBTSxxQkFBcUIsQ0FBQztBQXNCN0I7Ozs7Ozs7Ozs7R0FVRztBQUNILE1BQU0sVUFBVSx1QkFBdUIsQ0FBQyxFQUFFLEVBQUUsSUFBMkI7SUFFbkUsTUFBTSxPQUFPLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztJQUUzQixJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQztXQUM5QixPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQzdCLENBQUM7UUFDQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDMUMsQ0FBQztJQUVELE1BQU0sZUFBZSxHQUFHLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUV4RSxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUU7UUFDNUQsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzFCLGtFQUFrRTtRQUNsRSxrRUFBa0U7UUFDbEUsZ0VBQWdFO1FBQ2hFLHlEQUF5RDtRQUN6RCxFQUFFO1FBQ0YsNkRBQTZEO1FBQzdELGtCQUFrQjtRQUNsQix1R0FBdUc7UUFDdkcsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFF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LEtBQUssQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDdEMsQ0FBQztZQUNELE1BQU0sUUFBUSxHQUFHLEtBQUssS0FBSyxFQUFFO2dCQUN6QixDQUFDLENBQUMsYUFBYSxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUc7Z0JBQy9CLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFFVCw2Q0FBNkM7WUFDN0MsMkNBQTJDO1lBQzNDLDRDQUE0QztZQUM1QyxnQkFBZ0I7WUFDaEIsT0FBTywwQkFBMEIsUUFBUTtFQUNuRCxNQUFNLENBQUMsSUFBSSxDQUFDOztDQUViLENBQUM7UUFDTSxDQUFDO1FBQ0QsT0FBTyxlQUFlLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzlELENBQUMsQ0FBQTtBQUNMLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBlbmNvZGUgfSBmcm9tICdodG1sLWVudGl0aWVzJztcbmltcG9ydCB7XG4gICAgYWRhcHRJbmxpbmVTdmcsXG4gICAgcmVnaXN0ZXJNZXJtYWlkRm9udHMsXG4gICAgcmVuZGVyTWVybWFpZFN2Z1xufSBmcm9tICcuL3JlbmRlci1tZXJtYWlkLmpzJztcblxuZXhwb3J0IHR5cGUgTWVybWFpZFBsdWdpbk9wdGlvbnMgPSB7XG4gICAgLyoqXG4gICAgICogVFRGL09URiBmb250IGZpbGVzIHRvIHJlZ2lzdGVyIGZvciB0ZXh0IG1lYXN1cmVtZW50LlxuICAgICAqIFdoZW4gb21pdHRlZCwgYSBjb21tb24gc3lzdGVtIGZvbnQgaXMgdXNlZCBpZiBmb3VuZC5cbiAgICAgKi9cbiAgICBmb250Rk5zPzogc3RyaW5nW107XG5cbiAgICAvKipcbiAgICAgKiBKU09OIGNvbmZpZ3VyYXRpb24gc3RyaW5nIHVzaW5nIHRoZSBzYW1lIHNjaGVtYSBhcyB0aGVcbiAgICAgKiBtbWRyIC0tY29uZmlnIGZpbGUgKHRoZW1lLCB0aGVtZVZhcmlhYmxlcywgZmxvd2NoYXJ0LCAuLi4pXG4gICAgICovXG4gICAgY29uZmlnSlNPTj86IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIFRoZW1lIHByZXNldCBuYW1lOiBkZWZhdWx0LCBkYXJrLCBmb3Jlc3QsIG5ldXRyYWwsIG1vZGVybi5cbiAgICAgKiBUYWtlcyBwcmVjZWRlbmNlIG92ZXIgdGhlIGNvbmZpZydzIHRoZW1lIG5hbWUuXG4gICAgICovXG4gICAgdGhlbWVQcmVzZXQ/OiBzdHJpbmc7XG59O1xuXG4vKipcbiAqIEFkZCBNZXJtYWlkIHN1cHBvcnQgdG8gTWFya2Rvd24tSVQgc3VjaCB0aGF0IGBgYG1lcm1haWQgLi4gYGBgIGlzXG4gKiByZW5kZXJlZCB0byBpbmxpbmUgU1ZHIHVzaW5nIG1lcm1haWQtd2FzbS1yZW5kZXJlci5cbiAqXG4gKiBSZW5kZXJpbmcgaXMgc3luY2hyb25vdXMgYW5kIGhhcHBlbnMgaW4tcHJvY2Vzcywgc28gdGhlIFNWRyBpc1xuICogZW1iZWRkZWQgZGlyZWN0bHkgaW4gdGhlIGdlbmVyYXRlZCBIVE1MLiAgTm8gaW50ZXJtZWRpYXRlIGZpbGVzXG4gKiBhcmUgcHJvZHVjZWQuXG4gKlxuICogQHBhcmFtIG1kXG4gKiBAcGFyYW0gb3B0c1xuICovXG5leHBvcnQgZnVuY3Rpb24gTWFya2Rvd25JVE1lcm1haWRQbHVnaW4obWQsIG9wdHM/OiBNZXJtYWlkUGx1Z2luT3B0aW9ucykge1xuXG4gICAgY29uc3Qgb3B0aW9ucyA9IG9wdHMgPz8ge307XG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheShvcHRpb25zLmZvbnRGTnMpXG4gICAgICYmIG9wdGlvbnMuZm9udEZOcy5sZW5ndGggPj0gMVxuICAgICkge1xuICAgICAgICByZWdpc3Rlck1lcm1haWRGb250cyhvcHRpb25zLmZvbnRGTnMpO1xuICAgIH1cblxuICAgIGNvbnN0IGRlZmF1bHRSZW5kZXJlciA9IG1kLnJlbmRlcmVyLnJ1bGVzLmZlbmNlLmJpbmQobWQucmVuZGVyZXIucnVsZXMpO1xuXG4gICAgbWQucmVuZGVyZXIucnVsZXMuZmVuY2UgPSAodG9rZW5zLCBpZHgsIG1kT3B0aW9ucywgZW52LCBzZWxmKSA9PiB7XG4gICAgICAgIGNvbnN0IHRva2VuID0gdG9rZW5zW2lkeF07XG4gICAgICAgIC8vIFRoZSBpZGVhIGlzIHRyaW1taW5nIG9mZiBleGNlc3Mgd2hpdGVzcGFjZSBmcm9tIHRoZSBjb2RlIGJsb2NrLlxuICAgICAgICAvLyBCdXQsIHVzaW5nIHRoZSAudHJpbSBmdW5jdGlvbiByZW1vdmVzIGJvdGggbmV3bGluZXMgYW5kIHNwYWNlcy5cbiAgICAgICAgLy8gRm9yIHNvbWUgTWVybWFpZCBkaWFncmFtcywgdHJhaWxpbmcgc3BhY2VzIGFyZSBpbXBvcnRhbnQsIGFuZFxuICAgICAgICAvLyBpZiB0aGUgdHJhaWxpbmcgc3BhY2VzIGFyZSBtaXNzaW5nIGFuIGVycm9yIGlzIHRocm93bi5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gVGhpcyByZXBsYWNlIGNhbGwgcmVtb3ZlcyBvbmx5IHRoZSBuZXdsaW5lcyBsZWF2aW5nIGJlaGluZFxuICAgICAgICAvLyBhbnkgd2hpdGVzcGFjZS5cbiAgICAgICAgLy8gU291cmNlOiBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xNDU3MjQxMy9yZW1vdmUtbGluZS1icmVha3MtZnJvbS1zdGFydC1hbmQtZW5kLW9mLXN0cmluZ1xuICAgICAgICBjb25zdCBjb2RlID0gdG9rZW4uY29udGVudC5yZXBsYWNlKC9eXFxufFxcbiQvZywgJycpOyAvLy50cmltKCk7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGBNZXJtYWlkUGx1Z2luIHJ1bGVzLmZlbmNlICR7dG9rZW4uaW5mb30gJHtjb2RlfWAsIG9wdHMpO1xuICAgICAgICBpZiAodG9rZW4uaW5mby5zdGFydHNXaXRoKCdtZXJtYWlkJykpIHtcbiAgICAgICAgICAgIGxldCB0aXRsZTtcbiAgICAgICAgICAgIGNvbnN0IHNwYyA9IHRva2VuLmluZm8uaW5kZXhPZignICcsIDcpO1xuICAgICAgICAgICAgaWYgKHNwYyA+IDApIHtcbiAgICAgICAgICAgICAgICB0aXRsZSA9IHRva2VuLmluZm8uc2xpY2Uoc3BjICsgMSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRpdGxlID0gJyc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3ZnID0gcmVuZGVyTWVybWFpZFN2ZyhcbiAgICAgICAgICAgICAgICAgICAgY29kZSwgb3B0aW9ucy5jb25maWdKU09OLCBvcHRpb25zLnRoZW1lUHJlc2V0KTtcbiAgICAgICAgICAgICAgICBjb25zdCBjYXAgPSB0aXRsZSAhPT0gJydcbiAgICAgICAgICAgICAgICAgICAgPyBgPGZpZ2NhcHRpb24+JHtlbmNvZGUodGl0bGUpfTwvZmlnY2FwdGlvbj5gXG4gICAgICAgICAgICAgICAgICAgIDogJyc7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGA8ZmlndXJlIGNsYXNzPVwiZGlhZ3JhbXMtbWVybWFpZFwiPlxuJHthZGFwdElubGluZVN2ZyhzdmcpfVxuJHtjYXB9XG48L2ZpZ3VyZT5cbmA7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGBNZXJtYWlkIHRocmV3IGVycm9yICR7ZXJyLm1lc3NhZ2V9XG4ke2NvZGV9XG5gKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gYFxuPGRpdiBjbGFzcz1cImRpYWdyYW1zLXJlbmRlci1lcnJvclwiPlxuPHNwYW4gY2xhc3M9XCJkaWFncmFtcy10aXRsZVwiPk1lcm1haWQgdGhyZXcgZXJyb3IgJHtlbmNvZGUoZXJyLm1lc3NhZ2UpfTwvc3Bhbj5cbjxjb2RlIGNsYXNzPVwiZGlhZ3JhbXMtZXJyb3ItaW5wdXRcIj48cHJlPiR7ZW5jb2RlKGNvZGUpfTwvcHJlPjwvY29kZT5cbjwvZGl2PlxuYDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGVmYXVsdFJlbmRlcmVyKHRva2VucywgaWR4LCBtZE9wdGlvbnMsIGVudiwgc2VsZik7XG4gICAgfVxufVxuXG4vKipcbiAqIEFkZCBQaW50b3JhIHN1cHBvcnQgdG8gTWFya2Rvd24tSVQgc3VjaCB0aGF0IGBgYHBpbnRvcmEgLi4gYGBgXG4gKiBpcyByZW5kZXJlZCB0byBpbmxpbmUgU1ZHLlxuICpcbiAqIFBpbnRvcmEgcmVuZGVyaW5nIGlzIGFzeW5jaHJvbm91cywgd2hpbGUgTWFya2Rvd24tSVQgcmVuZGVyZXJcbiAqIHJ1bGVzIGFyZSBzeW5jaHJvbm91cy4gIFRoZXJlZm9yZSB0aGUgZmVuY2UgaXMgbm90IHJlbmRlcmVkXG4gKiBoZXJlLiAgSW5zdGVhZCBpdCBpcyBjb252ZXJ0ZWQgaW50byBhIDxkaWFncmFtcy1waW50b3JhPlxuICogZWxlbWVudCB3aXRoIG5vIG91dHB1dC1maWxlLCB3aGljaCB0aGUgRGlhZ3JhbXNQbHVnaW4gTWFoYWZ1bmNcbiAqIHJlbmRlcnMgdG8gaW5saW5lIFNWRyBkdXJpbmcgTWFoYWJodXRhIHByb2Nlc3NpbmcuXG4gKiBDb25zZXF1ZW50bHkgdGhpcyBwbHVnaW4gcmVxdWlyZXMgdGhlIEFrYXNoYUNNUyByZW5kZXJpbmdcbiAqIHBpcGVsaW5lIHdpdGggRGlhZ3JhbXNQbHVnaW4gY29uZmlndXJlZCAtIGl0IGRvZXMgbm90IHdvcmtcbiAqIHdpdGggc3RhbmRhbG9uZSBNYXJrZG93bi1JVC5cbiAqXG4gKiBBcyB3aXRoIHRoZSBNZXJtYWlkIHBsdWdpbiwgdGV4dCBmb2xsb3dpbmcgdGhlIGxhbmd1YWdlIG5hbWVcbiAqIChgYGBwaW50b3JhIEEgdGl0bGUpIGJlY29tZXMgdGhlIGZpZ3VyZSBjYXB0aW9uLlxuICpcbiAqIEBwYXJhbSBtZFxuICovXG5leHBvcnQgZnVuY3Rpb24gTWFya2Rvd25JVFBpbnRvcmFQbHVnaW4obWQpIHtcblxuICAgIGNvbnN0IGRlZmF1bHRSZW5kZXJlciA9IG1kLnJlbmRlcmVyLnJ1bGVzLmZlbmNlLmJpbmQobWQucmVuZGVyZXIucnVsZXMpO1xuXG4gICAgbWQucmVuZGVyZXIucnVsZXMuZmVuY2UgPSAodG9rZW5zLCBpZHgsIG1kT3B0aW9ucywgZW52LCBzZWxmKSA9PiB7XG4gICAgICAgIGNvbnN0IHRva2VuID0gdG9rZW5zW2lkeF07XG4gICAgICAgIGlmICh0b2tlbi5pbmZvLnN0YXJ0c1dpdGgoJ3BpbnRvcmEnKSkge1xuICAgICAgICAgICAgY29uc3QgY29kZSA9IHRva2VuLmNvbnRlbnQucmVwbGFjZSgvXlxcbnxcXG4kL2csICcnKTtcblxuICAgICAgICAgICAgbGV0IHRpdGxlID0gJyc7XG4gICAgICAgICAgICBjb25zdCBzcGMgPSB0b2tlbi5pbmZvLmluZGV4T2YoJyAnLCA3KTtcbiAgICAgICAgICAgIGlmIChzcGMgPiAwKSB7XG4gICAgICAgICAgICAgICAgdGl0bGUgPSB0b2tlbi5pbmZvLnNsaWNlKHNwYyArIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgVGNhcHRpb24gPSB0aXRsZSAhPT0gJydcbiAgICAgICAgICAgICAgICA/IGAgY2FwdGlvbj1cIiR7ZW5jb2RlKHRpdGxlKX1cImBcbiAgICAgICAgICAgICAgICA6ICcnO1xuXG4gICAgICAgICAgICAvLyBUaGUgZGlhZ3JhbSB0ZXh0IGlzIGVudGl0eS1lbmNvZGVkIHNvIHRoYXRcbiAgICAgICAgICAgIC8vIGNoYXJhY3RlcnMgbGlrZSA8IGFuZCA+IHN1cnZpdmUgdGhlIHRyaXBcbiAgICAgICAgICAgIC8vIHRocm91Z2ggdGhlIEhUTUwgcGFyc2VyIC0gJGVsZW1lbnQudGV4dCgpXG4gICAgICAgICAgICAvLyBkZWNvZGVzIHRoZW0uXG4gICAgICAgICAgICByZXR1cm4gYDxkaWFncmFtcy1waW50b3JhJHtUY2FwdGlvbn0+XG4ke2VuY29kZShjb2RlKX1cbjwvZGlhZ3JhbXMtcGludG9yYT5cbmA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRlZmF1bHRSZW5kZXJlcih0b2tlbnMsIGlkeCwgbWRPcHRpb25zLCBlbnYsIHNlbGYpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBBZGQgUGxhbnRVTUwgc3VwcG9ydCB0byBNYXJrZG93bi1JVCBzdWNoIHRoYXQgYGBgcGxhbnR1bWwgLi4gYGBgXG4gKiBpcyByZW5kZXJlZCB0byBpbmxpbmUgU1ZHLlxuICpcbiAqIFBsYW50VU1MIHJlbmRlcmluZyBpcyBhc3luY2hyb25vdXMgKGEgUGxhbnRVTUwgc2VydmVyIHJlcXVlc3RcbiAqIG9yIGEgY2hpbGQgSmF2YSBwcm9jZXNzKSwgd2hpbGUgTWFya2Rvd24tSVQgcmVuZGVyZXIgcnVsZXMgYXJlXG4gKiBzeW5jaHJvbm91cy4gIFRoZXJlZm9yZSB0aGUgZmVuY2UgaXMgbm90IHJlbmRlcmVkIGhlcmUuXG4gKiBJbnN0ZWFkIGl0IGlzIGNvbnZlcnRlZCBpbnRvIGEgPGRpYWdyYW1zLXBsYW50dW1sIHRzdmc+XG4gKiBlbGVtZW50LCB3aGljaCB0aGUgRGlhZ3JhbXNQbHVnaW4gTWFoYWZ1bmMgcmVuZGVycyB0byBpbmxpbmVcbiAqIFNWRyBkdXJpbmcgTWFoYWJodXRhIHByb2Nlc3NpbmcuICBDb25zZXF1ZW50bHkgdGhpcyBwbHVnaW5cbiAqIHJlcXVpcmVzIHRoZSBBa2FzaGFDTVMgcmVuZGVyaW5nIHBpcGVsaW5lIHdpdGggRGlhZ3JhbXNQbHVnaW5cbiAqIGNvbmZpZ3VyZWQgLSBpdCBkb2VzIG5vdCB3b3JrIHdpdGggc3RhbmRhbG9uZSBNYXJrZG93bi1JVC5cbiAqXG4gKiBBcyB3aXRoIHRoZSBNZXJtYWlkIHBsdWdpbiwgdGV4dCBmb2xsb3dpbmcgdGhlIGxhbmd1YWdlIG5hbWVcbiAqIChgYGBwbGFudHVtbCBBIHRpdGxlKSBiZWNvbWVzIHRoZSBmaWd1cmUgY2FwdGlvbi5cbiAqXG4gKiBXaGVuIHRoZSBkaWFncmFtIHRleHQgZG9lcyBub3QgYmVnaW4gd2l0aCBhIEBzdGFydCBsaW5lLCBpdFxuICogaXMgd3JhcHBlZCBpbiBAc3RhcnR1bWwvQGVuZHVtbCwgc28gc2ltcGxlIGRpYWdyYW1zIG5lZWQgbm90XG4gKiBzcGVsbCB0aG9zZSBvdXQuXG4gKlxuICogQHBhcmFtIG1kXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBNYXJrZG93bklUUGxhbnRVTUxQbHVnaW4obWQpIHtcblxuICAgIGNvbnN0IGRlZmF1bHRSZW5kZXJlciA9IG1kLnJlbmRlcmVyLnJ1bGVzLmZlbmNlLmJpbmQobWQucmVuZGVyZXIucnVsZXMpO1xuXG4gICAgbWQucmVuZGVyZXIucnVsZXMuZmVuY2UgPSAodG9rZW5zLCBpZHgsIG1kT3B0aW9ucywgZW52LCBzZWxmKSA9PiB7XG4gICAgICAgIGNvbnN0IHRva2VuID0gdG9rZW5zW2lkeF07XG4gICAgICAgIGlmICh0b2tlbi5pbmZvLnN0YXJ0c1dpdGgoJ3BsYW50dW1sJykpIHtcbiAgICAgICAgICAgIGxldCBjb2RlID0gdG9rZW4uY29udGVudC5yZXBsYWNlKC9eXFxufFxcbiQvZywgJycpO1xuICAgICAgICAgICAgaWYgKCEvXlxccypAc3RhcnQvLnRlc3QoY29kZSkpIHtcbiAgICAgICAgICAgICAgICBjb2RlID0gYEBzdGFydHVtbFxcbiR7Y29kZX1cXG5AZW5kdW1sYDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbGV0IHRpdGxlID0gJyc7XG4gICAgICAgICAgICBjb25zdCBzcGMgPSB0b2tlbi5pbmZvLmluZGV4T2YoJyAnLCA4KTtcbiAgICAgICAgICAgIGlmIChzcGMgPiAwKSB7XG4gICAgICAgICAgICAgICAgdGl0bGUgPSB0b2tlbi5pbmZvLnNsaWNlKHNwYyArIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgVGNhcHRpb24gPSB0aXRsZSAhPT0gJydcbiAgICAgICAgICAgICAgICA/IGAgY2FwdGlvbj1cIiR7ZW5jb2RlKHRpdGxlKX1cImBcbiAgICAgICAgICAgICAgICA6ICcnO1xuXG4gICAgICAgICAgICAvLyBUaGUgZGlhZ3JhbSB0ZXh0IGlzIGVudGl0eS1lbmNvZGVkIHNvIHRoYXRcbiAgICAgICAgICAgIC8vIGNoYXJhY3RlcnMgbGlrZSA8IGFuZCA+IHN1cnZpdmUgdGhlIHRyaXBcbiAgICAgICAgICAgIC8vIHRocm91Z2ggdGhlIEhUTUwgcGFyc2VyIC0gJGVsZW1lbnQudGV4dCgpXG4gICAgICAgICAgICAvLyBkZWNvZGVzIHRoZW0uXG4gICAgICAgICAgICByZXR1cm4gYDxkaWFncmFtcy1wbGFudHVtbCB0c3ZnJHtUY2FwdGlvbn0+XG4ke2VuY29kZShjb2RlKX1cbjwvZGlhZ3JhbXMtcGxhbnR1bWw+XG5gO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkZWZhdWx0UmVuZGVyZXIodG9rZW5zLCBpZHgsIG1kT3B0aW9ucywgZW52LCBzZWxmKTtcbiAgICB9XG59XG4iXX0=