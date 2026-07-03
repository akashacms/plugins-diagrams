import { encode } from 'html-entities';
import { registerMermaidFonts, renderMermaidSvg } from './render-mermaid.js';
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
${svg}
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd24taXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9saWIvbWFya2Rvd24taXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUN2QyxPQUFPLEVBQ0gsb0JBQW9CLEVBQ3BCLGdCQUFnQixFQUNuQixNQUFNLHFCQUFxQixDQUFDO0FBc0I3Qjs7Ozs7Ozs7OztHQVVHO0FBQ0gsTUFBTSxVQUFVLHVCQUF1QixDQUFDLEVBQUUsRUFBRSxJQUEyQjtJQUVuRSxNQUFNLE9BQU8sR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO0lBRTNCLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDO1dBQzlCLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxJQUFJLENBQUMsRUFDN0IsQ0FBQztRQUNDLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBRUQsTUFBTSxlQUFlLEdBQUcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBRXhFLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsRUFBRTtRQUM1RCxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDMUIsa0VBQWtFO1FBQ2xFLGtFQUFrRTtRQUNsRSxnRUFBZ0U7UUFDaEUseURBQXlEO1FBQ3pELEVBQUU7UUFDRiw2REFBNkQ7UUFDN0Qsa0JBQWtCO1FBQ2xCLHVHQUF1RztRQUN2RyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVO1FBQzlELHdFQUF3RTtRQUN4RSxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7WUFDbkMsSUFBSSxLQUFLLENBQUM7WUFDVixNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDdkMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ1YsS0FBSyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUN0QyxDQUFDO2lCQUFNLENBQUM7Z0JBQ0osS0FBSyxHQUFHLEVBQUUsQ0FBQztZQUNmLENBQUM7WUFFRCxJQUFJLENBQUM7Z0JBQ0QsTUFBTSxHQUFHLEdBQUcsZ0JBQWdCLENBQ3hCLElBQUksRUFBRSxPQUFPLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztnQkFDbkQsTUFBTSxHQUFHLEdBQUcsS0FBSyxLQUFLLEVBQUU7b0JBQ3BCLENBQUMsQ0FBQyxlQUFlLE1BQU0sQ0FBQyxLQUFLLENBQUMsZUFBZTtvQkFDN0MsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDVCxPQUFPO0VBQ3JCLEdBQUc7RUFDSCxHQUFHOztDQUVKLENBQUM7WUFDVSxDQUFDO1lBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztnQkFDWCxPQUFPLENBQUMsS0FBSyxDQUFDLHVCQUF1QixHQUFHLENBQUMsT0FBTztFQUM5RCxJQUFJO0NBQ0wsQ0FBQyxDQUFDO2dCQUNhLE9BQU87O21EQUU0QixNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQzswQ0FDNUIsTUFBTSxDQUFDLElBQUksQ0FBQzs7Q0FFckQsQ0FBQztZQUNVLENBQUM7UUFDTCxDQUFDO1FBQ0QsT0FBTyxlQUFlLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzlELENBQUMsQ0FBQTtBQUNMLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBlbmNvZGUgfSBmcm9tICdodG1sLWVudGl0aWVzJztcbmltcG9ydCB7XG4gICAgcmVnaXN0ZXJNZXJtYWlkRm9udHMsXG4gICAgcmVuZGVyTWVybWFpZFN2Z1xufSBmcm9tICcuL3JlbmRlci1tZXJtYWlkLmpzJztcblxuZXhwb3J0IHR5cGUgTWVybWFpZFBsdWdpbk9wdGlvbnMgPSB7XG4gICAgLyoqXG4gICAgICogVFRGL09URiBmb250IGZpbGVzIHRvIHJlZ2lzdGVyIGZvciB0ZXh0IG1lYXN1cmVtZW50LlxuICAgICAqIFdoZW4gb21pdHRlZCwgYSBjb21tb24gc3lzdGVtIGZvbnQgaXMgdXNlZCBpZiBmb3VuZC5cbiAgICAgKi9cbiAgICBmb250Rk5zPzogc3RyaW5nW107XG5cbiAgICAvKipcbiAgICAgKiBKU09OIGNvbmZpZ3VyYXRpb24gc3RyaW5nIHVzaW5nIHRoZSBzYW1lIHNjaGVtYSBhcyB0aGVcbiAgICAgKiBtbWRyIC0tY29uZmlnIGZpbGUgKHRoZW1lLCB0aGVtZVZhcmlhYmxlcywgZmxvd2NoYXJ0LCAuLi4pXG4gICAgICovXG4gICAgY29uZmlnSlNPTj86IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIFRoZW1lIHByZXNldCBuYW1lOiBkZWZhdWx0LCBkYXJrLCBmb3Jlc3QsIG5ldXRyYWwsIG1vZGVybi5cbiAgICAgKiBUYWtlcyBwcmVjZWRlbmNlIG92ZXIgdGhlIGNvbmZpZydzIHRoZW1lIG5hbWUuXG4gICAgICovXG4gICAgdGhlbWVQcmVzZXQ/OiBzdHJpbmc7XG59O1xuXG4vKipcbiAqIEFkZCBNZXJtYWlkIHN1cHBvcnQgdG8gTWFya2Rvd24tSVQgc3VjaCB0aGF0IGBgYG1lcm1haWQgLi4gYGBgIGlzXG4gKiByZW5kZXJlZCB0byBpbmxpbmUgU1ZHIHVzaW5nIG1lcm1haWQtd2FzbS1yZW5kZXJlci5cbiAqXG4gKiBSZW5kZXJpbmcgaXMgc3luY2hyb25vdXMgYW5kIGhhcHBlbnMgaW4tcHJvY2Vzcywgc28gdGhlIFNWRyBpc1xuICogZW1iZWRkZWQgZGlyZWN0bHkgaW4gdGhlIGdlbmVyYXRlZCBIVE1MLiAgTm8gaW50ZXJtZWRpYXRlIGZpbGVzXG4gKiBhcmUgcHJvZHVjZWQuXG4gKlxuICogQHBhcmFtIG1kXG4gKiBAcGFyYW0gb3B0c1xuICovXG5leHBvcnQgZnVuY3Rpb24gTWFya2Rvd25JVE1lcm1haWRQbHVnaW4obWQsIG9wdHM/OiBNZXJtYWlkUGx1Z2luT3B0aW9ucykge1xuXG4gICAgY29uc3Qgb3B0aW9ucyA9IG9wdHMgPz8ge307XG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheShvcHRpb25zLmZvbnRGTnMpXG4gICAgICYmIG9wdGlvbnMuZm9udEZOcy5sZW5ndGggPj0gMVxuICAgICkge1xuICAgICAgICByZWdpc3Rlck1lcm1haWRGb250cyhvcHRpb25zLmZvbnRGTnMpO1xuICAgIH1cblxuICAgIGNvbnN0IGRlZmF1bHRSZW5kZXJlciA9IG1kLnJlbmRlcmVyLnJ1bGVzLmZlbmNlLmJpbmQobWQucmVuZGVyZXIucnVsZXMpO1xuXG4gICAgbWQucmVuZGVyZXIucnVsZXMuZmVuY2UgPSAodG9rZW5zLCBpZHgsIG1kT3B0aW9ucywgZW52LCBzZWxmKSA9PiB7XG4gICAgICAgIGNvbnN0IHRva2VuID0gdG9rZW5zW2lkeF07XG4gICAgICAgIC8vIFRoZSBpZGVhIGlzIHRyaW1taW5nIG9mZiBleGNlc3Mgd2hpdGVzcGFjZSBmcm9tIHRoZSBjb2RlIGJsb2NrLlxuICAgICAgICAvLyBCdXQsIHVzaW5nIHRoZSAudHJpbSBmdW5jdGlvbiByZW1vdmVzIGJvdGggbmV3bGluZXMgYW5kIHNwYWNlcy5cbiAgICAgICAgLy8gRm9yIHNvbWUgTWVybWFpZCBkaWFncmFtcywgdHJhaWxpbmcgc3BhY2VzIGFyZSBpbXBvcnRhbnQsIGFuZFxuICAgICAgICAvLyBpZiB0aGUgdHJhaWxpbmcgc3BhY2VzIGFyZSBtaXNzaW5nIGFuIGVycm9yIGlzIHRocm93bi5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gVGhpcyByZXBsYWNlIGNhbGwgcmVtb3ZlcyBvbmx5IHRoZSBuZXdsaW5lcyBsZWF2aW5nIGJlaGluZFxuICAgICAgICAvLyBhbnkgd2hpdGVzcGFjZS5cbiAgICAgICAgLy8gU291cmNlOiBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xNDU3MjQxMy9yZW1vdmUtbGluZS1icmVha3MtZnJvbS1zdGFydC1hbmQtZW5kLW9mLXN0cmluZ1xuICAgICAgICBjb25zdCBjb2RlID0gdG9rZW4uY29udGVudC5yZXBsYWNlKC9eXFxufFxcbiQvZywgJycpOyAvLy50cmltKCk7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGBNZXJtYWlkUGx1Z2luIHJ1bGVzLmZlbmNlICR7dG9rZW4uaW5mb30gJHtjb2RlfWAsIG9wdHMpO1xuICAgICAgICBpZiAodG9rZW4uaW5mby5zdGFydHNXaXRoKCdtZXJtYWlkJykpIHtcbiAgICAgICAgICAgIGxldCB0aXRsZTtcbiAgICAgICAgICAgIGNvbnN0IHNwYyA9IHRva2VuLmluZm8uaW5kZXhPZignICcsIDcpO1xuICAgICAgICAgICAgaWYgKHNwYyA+IDApIHtcbiAgICAgICAgICAgICAgICB0aXRsZSA9IHRva2VuLmluZm8uc2xpY2Uoc3BjICsgMSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRpdGxlID0gJyc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3ZnID0gcmVuZGVyTWVybWFpZFN2ZyhcbiAgICAgICAgICAgICAgICAgICAgY29kZSwgb3B0aW9ucy5jb25maWdKU09OLCBvcHRpb25zLnRoZW1lUHJlc2V0KTtcbiAgICAgICAgICAgICAgICBjb25zdCBjYXAgPSB0aXRsZSAhPT0gJydcbiAgICAgICAgICAgICAgICAgICAgPyBgPGZpZ2NhcHRpb24+JHtlbmNvZGUodGl0bGUpfTwvZmlnY2FwdGlvbj5gXG4gICAgICAgICAgICAgICAgICAgIDogJyc7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGA8ZmlndXJlIGNsYXNzPVwiZGlhZ3JhbXMtbWVybWFpZFwiPlxuJHtzdmd9XG4ke2NhcH1cbjwvZmlndXJlPlxuYDtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYE1lcm1haWQgdGhyZXcgZXJyb3IgJHtlcnIubWVzc2FnZX1cbiR7Y29kZX1cbmApO1xuICAgICAgICAgICAgICAgIHJldHVybiBgXG48ZGl2IGNsYXNzPVwiZGlhZ3JhbXMtcmVuZGVyLWVycm9yXCI+XG48c3BhbiBjbGFzcz1cImRpYWdyYW1zLXRpdGxlXCI+TWVybWFpZCB0aHJldyBlcnJvciAke2VuY29kZShlcnIubWVzc2FnZSl9PC9zcGFuPlxuPGNvZGUgY2xhc3M9XCJkaWFncmFtcy1lcnJvci1pbnB1dFwiPjxwcmU+JHtlbmNvZGUoY29kZSl9PC9wcmU+PC9jb2RlPlxuPC9kaXY+XG5gO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkZWZhdWx0UmVuZGVyZXIodG9rZW5zLCBpZHgsIG1kT3B0aW9ucywgZW52LCBzZWxmKTtcbiAgICB9XG59XG4iXX0=