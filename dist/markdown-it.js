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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd24taXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9saWIvbWFya2Rvd24taXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUN2QyxPQUFPLEVBQ0gsY0FBYyxFQUNkLG9CQUFvQixFQUNwQixnQkFBZ0IsRUFDbkIsTUFBTSxxQkFBcUIsQ0FBQztBQXNCN0I7Ozs7Ozs7Ozs7R0FVRztBQUNILE1BQU0sVUFBVSx1QkFBdUIsQ0FBQyxFQUFFLEVBQUUsSUFBMkI7SUFFbkUsTUFBTSxPQUFPLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztJQUUzQixJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQztXQUM5QixPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQzdCLENBQUM7UUFDQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDMUMsQ0FBQztJQUVELE1BQU0sZUFBZSxHQUFHLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUV4RSxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUU7UUFDNUQsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzFCLGtFQUFrRTtRQUNsRSxrRUFBa0U7UUFDbEUsZ0VBQWdFO1FBQ2hFLHlEQUF5RDtRQUN6RCxFQUFFO1FBQ0YsNkRBQTZEO1FBQzdELGtCQUFrQjtRQUNsQix1R0FBdUc7UUFDdkcsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVTtRQUM5RCx3RUFBd0U7UUFDeEUsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQ25DLElBQUksS0FBSyxDQUFDO1lBQ1YsTUFBTSxHQUFHLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3ZDLElBQUksR0FBRyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUNWLEtBQUssR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDdEMsQ0FBQztpQkFBTSxDQUFDO2dCQUNKLEtBQUssR0FBRyxFQUFFLENBQUM7WUFDZixDQUFDO1lBRUQsSUFBSSxDQUFDO2dCQUNELE1BQU0sR0FBRyxHQUFHLGdCQUFnQixDQUN4QixJQUFJLEVBQUUsT0FBTyxDQUFDLFVBQVUsRUFBRSxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7Z0JBQ25ELE1BQU0sR0FBRyxHQUFHLEtBQUssS0FBSyxFQUFFO29CQUNwQixDQUFDLENBQUMsZUFBZSxNQUFNLENBQUMsS0FBSyxDQUFDLGVBQWU7b0JBQzdDLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ1QsT0FBTztFQUNyQixjQUFjLENBQUMsR0FBRyxDQUFDO0VBQ25CLEdBQUc7O0NBRUosQ0FBQztZQUNVLENBQUM7WUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO2dCQUNYLE9BQU8sQ0FBQyxLQUFLLENBQUMsdUJBQXVCLEdBQUcsQ0FBQyxPQUFPO0VBQzlELElBQUk7Q0FDTCxDQUFDLENBQUM7Z0JBQ2EsT0FBTzs7bURBRTRCLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDOzBDQUM1QixNQUFNLENBQUMsSUFBSSxDQUFDOztDQUVyRCxDQUFDO1lBQ1UsQ0FBQztRQUNMLENBQUM7UUFDRCxPQUFPLGVBQWUsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDOUQsQ0FBQyxDQUFBO0FBQ0wsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGVuY29kZSB9IGZyb20gJ2h0bWwtZW50aXRpZXMnO1xuaW1wb3J0IHtcbiAgICBhZGFwdElubGluZVN2ZyxcbiAgICByZWdpc3Rlck1lcm1haWRGb250cyxcbiAgICByZW5kZXJNZXJtYWlkU3ZnXG59IGZyb20gJy4vcmVuZGVyLW1lcm1haWQuanMnO1xuXG5leHBvcnQgdHlwZSBNZXJtYWlkUGx1Z2luT3B0aW9ucyA9IHtcbiAgICAvKipcbiAgICAgKiBUVEYvT1RGIGZvbnQgZmlsZXMgdG8gcmVnaXN0ZXIgZm9yIHRleHQgbWVhc3VyZW1lbnQuXG4gICAgICogV2hlbiBvbWl0dGVkLCBhIGNvbW1vbiBzeXN0ZW0gZm9udCBpcyB1c2VkIGlmIGZvdW5kLlxuICAgICAqL1xuICAgIGZvbnRGTnM/OiBzdHJpbmdbXTtcblxuICAgIC8qKlxuICAgICAqIEpTT04gY29uZmlndXJhdGlvbiBzdHJpbmcgdXNpbmcgdGhlIHNhbWUgc2NoZW1hIGFzIHRoZVxuICAgICAqIG1tZHIgLS1jb25maWcgZmlsZSAodGhlbWUsIHRoZW1lVmFyaWFibGVzLCBmbG93Y2hhcnQsIC4uLilcbiAgICAgKi9cbiAgICBjb25maWdKU09OPzogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogVGhlbWUgcHJlc2V0IG5hbWU6IGRlZmF1bHQsIGRhcmssIGZvcmVzdCwgbmV1dHJhbCwgbW9kZXJuLlxuICAgICAqIFRha2VzIHByZWNlZGVuY2Ugb3ZlciB0aGUgY29uZmlnJ3MgdGhlbWUgbmFtZS5cbiAgICAgKi9cbiAgICB0aGVtZVByZXNldD86IHN0cmluZztcbn07XG5cbi8qKlxuICogQWRkIE1lcm1haWQgc3VwcG9ydCB0byBNYXJrZG93bi1JVCBzdWNoIHRoYXQgYGBgbWVybWFpZCAuLiBgYGAgaXNcbiAqIHJlbmRlcmVkIHRvIGlubGluZSBTVkcgdXNpbmcgbWVybWFpZC13YXNtLXJlbmRlcmVyLlxuICpcbiAqIFJlbmRlcmluZyBpcyBzeW5jaHJvbm91cyBhbmQgaGFwcGVucyBpbi1wcm9jZXNzLCBzbyB0aGUgU1ZHIGlzXG4gKiBlbWJlZGRlZCBkaXJlY3RseSBpbiB0aGUgZ2VuZXJhdGVkIEhUTUwuICBObyBpbnRlcm1lZGlhdGUgZmlsZXNcbiAqIGFyZSBwcm9kdWNlZC5cbiAqXG4gKiBAcGFyYW0gbWRcbiAqIEBwYXJhbSBvcHRzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBNYXJrZG93bklUTWVybWFpZFBsdWdpbihtZCwgb3B0cz86IE1lcm1haWRQbHVnaW5PcHRpb25zKSB7XG5cbiAgICBjb25zdCBvcHRpb25zID0gb3B0cyA/PyB7fTtcblxuICAgIGlmIChBcnJheS5pc0FycmF5KG9wdGlvbnMuZm9udEZOcylcbiAgICAgJiYgb3B0aW9ucy5mb250Rk5zLmxlbmd0aCA+PSAxXG4gICAgKSB7XG4gICAgICAgIHJlZ2lzdGVyTWVybWFpZEZvbnRzKG9wdGlvbnMuZm9udEZOcyk7XG4gICAgfVxuXG4gICAgY29uc3QgZGVmYXVsdFJlbmRlcmVyID0gbWQucmVuZGVyZXIucnVsZXMuZmVuY2UuYmluZChtZC5yZW5kZXJlci5ydWxlcyk7XG5cbiAgICBtZC5yZW5kZXJlci5ydWxlcy5mZW5jZSA9ICh0b2tlbnMsIGlkeCwgbWRPcHRpb25zLCBlbnYsIHNlbGYpID0+IHtcbiAgICAgICAgY29uc3QgdG9rZW4gPSB0b2tlbnNbaWR4XTtcbiAgICAgICAgLy8gVGhlIGlkZWEgaXMgdHJpbW1pbmcgb2ZmIGV4Y2VzcyB3aGl0ZXNwYWNlIGZyb20gdGhlIGNvZGUgYmxvY2suXG4gICAgICAgIC8vIEJ1dCwgdXNpbmcgdGhlIC50cmltIGZ1bmN0aW9uIHJlbW92ZXMgYm90aCBuZXdsaW5lcyBhbmQgc3BhY2VzLlxuICAgICAgICAvLyBGb3Igc29tZSBNZXJtYWlkIGRpYWdyYW1zLCB0cmFpbGluZyBzcGFjZXMgYXJlIGltcG9ydGFudCwgYW5kXG4gICAgICAgIC8vIGlmIHRoZSB0cmFpbGluZyBzcGFjZXMgYXJlIG1pc3NpbmcgYW4gZXJyb3IgaXMgdGhyb3duLlxuICAgICAgICAvL1xuICAgICAgICAvLyBUaGlzIHJlcGxhY2UgY2FsbCByZW1vdmVzIG9ubHkgdGhlIG5ld2xpbmVzIGxlYXZpbmcgYmVoaW5kXG4gICAgICAgIC8vIGFueSB3aGl0ZXNwYWNlLlxuICAgICAgICAvLyBTb3VyY2U6IGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzE0NTcyNDEzL3JlbW92ZS1saW5lLWJyZWFrcy1mcm9tLXN0YXJ0LWFuZC1lbmQtb2Ytc3RyaW5nXG4gICAgICAgIGNvbnN0IGNvZGUgPSB0b2tlbi5jb250ZW50LnJlcGxhY2UoL15cXG58XFxuJC9nLCAnJyk7IC8vLnRyaW0oKTtcbiAgICAgICAgLy8gY29uc29sZS5sb2coYE1lcm1haWRQbHVnaW4gcnVsZXMuZmVuY2UgJHt0b2tlbi5pbmZvfSAke2NvZGV9YCwgb3B0cyk7XG4gICAgICAgIGlmICh0b2tlbi5pbmZvLnN0YXJ0c1dpdGgoJ21lcm1haWQnKSkge1xuICAgICAgICAgICAgbGV0IHRpdGxlO1xuICAgICAgICAgICAgY29uc3Qgc3BjID0gdG9rZW4uaW5mby5pbmRleE9mKCcgJywgNyk7XG4gICAgICAgICAgICBpZiAoc3BjID4gMCkge1xuICAgICAgICAgICAgICAgIHRpdGxlID0gdG9rZW4uaW5mby5zbGljZShzcGMgKyAxKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGl0bGUgPSAnJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCBzdmcgPSByZW5kZXJNZXJtYWlkU3ZnKFxuICAgICAgICAgICAgICAgICAgICBjb2RlLCBvcHRpb25zLmNvbmZpZ0pTT04sIG9wdGlvbnMudGhlbWVQcmVzZXQpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGNhcCA9IHRpdGxlICE9PSAnJ1xuICAgICAgICAgICAgICAgICAgICA/IGA8ZmlnY2FwdGlvbj4ke2VuY29kZSh0aXRsZSl9PC9maWdjYXB0aW9uPmBcbiAgICAgICAgICAgICAgICAgICAgOiAnJztcbiAgICAgICAgICAgICAgICByZXR1cm4gYDxmaWd1cmUgY2xhc3M9XCJkaWFncmFtcy1tZXJtYWlkXCI+XG4ke2FkYXB0SW5saW5lU3ZnKHN2Zyl9XG4ke2NhcH1cbjwvZmlndXJlPlxuYDtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYE1lcm1haWQgdGhyZXcgZXJyb3IgJHtlcnIubWVzc2FnZX1cbiR7Y29kZX1cbmApO1xuICAgICAgICAgICAgICAgIHJldHVybiBgXG48ZGl2IGNsYXNzPVwiZGlhZ3JhbXMtcmVuZGVyLWVycm9yXCI+XG48c3BhbiBjbGFzcz1cImRpYWdyYW1zLXRpdGxlXCI+TWVybWFpZCB0aHJldyBlcnJvciAke2VuY29kZShlcnIubWVzc2FnZSl9PC9zcGFuPlxuPGNvZGUgY2xhc3M9XCJkaWFncmFtcy1lcnJvci1pbnB1dFwiPjxwcmU+JHtlbmNvZGUoY29kZSl9PC9wcmU+PC9jb2RlPlxuPC9kaXY+XG5gO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkZWZhdWx0UmVuZGVyZXIodG9rZW5zLCBpZHgsIG1kT3B0aW9ucywgZW52LCBzZWxmKTtcbiAgICB9XG59XG4iXX0=