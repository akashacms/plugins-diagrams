import path from 'node:path';
import { promises as fsp } from 'node:fs';
import { encode } from 'html-entities';
import katex from 'katex';
import * as akasha from 'akasharender';
/**
 * Render TeX math text to a KaTeX HTML string using the KaTeX
 * renderToString function.  Rendering is synchronous and happens
 * in-process.  Invalid TeX throws katex.ParseError.
 *
 * The generated markup requires the KaTeX stylesheet
 * (katex/dist/katex.min.css) to display correctly.
 */
export function renderKaTeXHtml(code, options) {
    return katex.renderToString(code, {
        displayMode: options?.displayMode ?? true,
        output: options?.output,
        macros: options?.macros,
        throwOnError: true
    });
}
export async function doKaTeX(options) {
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
    async process($element, metadata, dirty) {
        let code = $element.text();
        const inf = $element.attr('input-file');
        if (typeof $element.attr('output-file') === 'string') {
            throw new Error(`diagrams-katex renders inline HTML markup - output-file is not supported`);
        }
        let vpathIn;
        let fspathIn;
        if (typeof inf === 'string'
            && inf.length >= 1) {
            if (path.isAbsolute(inf)) {
                vpathIn = inf;
            }
            else {
                let dir = path.dirname(metadata.document.path);
                vpathIn = path.normalize(path.join('/', dir, inf));
            }
        }
        const documents = this.config.akasha.filecache.documentsCache;
        const assets = this.akasha.filecache.assetsCache;
        const doc = vpathIn
            ? await documents.find(vpathIn)
            : undefined;
        let asset;
        if (!doc)
            asset = vpathIn
                ? await assets.find(vpathIn)
                : undefined;
        if (doc)
            fspathIn = doc.fspath;
        else if (asset)
            fspathIn = asset.fspath;
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
        }
        catch (err) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuZGVyLWthdGV4LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vbGliL3JlbmRlci1rYXRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLElBQUksTUFBTSxXQUFXLENBQUM7QUFDN0IsT0FBTyxFQUFFLFFBQVEsSUFBSSxHQUFHLEVBQUUsTUFBTSxTQUFTLENBQUM7QUFDMUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUN2QyxPQUFPLEtBQUssTUFBTSxPQUFPLENBQUM7QUFDMUIsT0FBTyxLQUFLLE1BQU0sTUFBTSxjQUFjLENBQUM7QUE2QnZDOzs7Ozs7O0dBT0c7QUFDSCxNQUFNLFVBQVUsZUFBZSxDQUMzQixJQUFZLEVBQUUsT0FBc0I7SUFFcEMsT0FBTyxLQUFLLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRTtRQUM5QixXQUFXLEVBQUUsT0FBTyxFQUFFLFdBQVcsSUFBSSxJQUFJO1FBQ3pDLE1BQU0sRUFBRSxPQUFPLEVBQUUsTUFBTTtRQUN2QixNQUFNLEVBQUUsT0FBTyxFQUFFLE1BQU07UUFDdkIsWUFBWSxFQUFFLElBQUk7S0FDckIsQ0FBQyxDQUFDO0FBQ1AsQ0FBQztBQWNELE1BQU0sQ0FBQyxLQUFLLFVBQVUsT0FBTyxDQUN6QixPQUEyQjtJQUUzQixNQUFNLElBQUksR0FBRyxlQUFlLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNwRCxNQUFNLEdBQUcsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDekQsQ0FBQztBQUVEOzs7Ozs7Ozs7Ozs7Ozs7R0FlRztBQUNILE1BQU0sT0FBTyxVQUFXLFNBQVEsTUFBTSxDQUFDLGFBQWE7SUFDbkQsSUFBSSxXQUFXLEtBQUssT0FBTyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7SUFFM0MsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsUUFB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TSxJQUFJLElBQUksU0FBUztZQUNuRCxDQUFDLENBQUM7a0JBQ0ksR0FBRyxJQUFJLE1BQU0sSUFBSSxNQUFNO1VBQy9CLElBQUk7VUFDSixHQUFHOztTQUVKLENBQUM7SUFDTixDQUFDO0NBQ0oiLCJzb3VyY2VzQ29udGVudCI6WyJcbmltcG9ydCBwYXRoIGZyb20gJ25vZGU6cGF0aCc7XG5pbXBvcnQgeyBwcm9taXNlcyBhcyBmc3AgfSBmcm9tICdub2RlOmZzJztcbmltcG9ydCB7IGVuY29kZSB9IGZyb20gJ2h0bWwtZW50aXRpZXMnO1xuaW1wb3J0IGthdGV4IGZyb20gJ2thdGV4JztcbmltcG9ydCAqIGFzIGFrYXNoYSBmcm9tICdha2FzaGFyZW5kZXInO1xuXG4vKipcbiAqIE9wdGlvbnMgc2hhcmVkIGJ5IGV2ZXJ5IEthVGVYIHJlbmRlcmluZyBlbnRyeSBwb2ludC5cbiAqIFRoZXkgYXJlIGEgc3Vic2V0IG9mIHRoZSBvcHRpb25zIGFjY2VwdGVkIGJ5IHRoZSBLYVRlWFxuICogcmVuZGVyVG9TdHJpbmcgZnVuY3Rpb24uXG4gKi9cbmV4cG9ydCB0eXBlIEthVGVYT3B0aW9ucyA9IHtcbiAgICAvKipcbiAgICAgKiBSZW5kZXIgaW4gZGlzcGxheSAoYmxvY2spIG1vZGUgcmF0aGVyIHRoYW4gaW5saW5lIG1vZGUuXG4gICAgICogRGlzcGxheSBtb2RlIGNlbnRlcnMgdGhlIG1hdGggb24gaXRzIG93biBsaW5lLlxuICAgICAqIERlZmF1bHQ6IHRydWUuXG4gICAgICovXG4gICAgZGlzcGxheU1vZGU/OiBib29sZWFuO1xuXG4gICAgLyoqXG4gICAgICogTWFya3VwIHRvIGVtaXQ6IGh0bWxBbmRNYXRobWwgKHRoZSBkZWZhdWx0KSwgaHRtbCwgb3JcbiAgICAgKiBtYXRobWwuICBUaGUgZGVmYXVsdCBpbmNsdWRlcyBNYXRoTUwgYWxvbmdzaWRlIHRoZSBIVE1MXG4gICAgICogZm9yIGFjY2Vzc2liaWxpdHkuXG4gICAgICovXG4gICAgb3V0cHV0PzogJ2h0bWwnIHwgJ21hdGhtbCcgfCAnaHRtbEFuZE1hdGhtbCc7XG5cbiAgICAvKipcbiAgICAgKiBBIGNvbGxlY3Rpb24gb2YgY3VzdG9tIG1hY3JvcywgbWFwcGluZyBtYWNybyBuYW1lcyB0b1xuICAgICAqIHRoZWlyIGV4cGFuc2lvbnMsIHN1Y2ggYXMgeyBcIlxcXFxSUlwiOiBcIlxcXFxtYXRoYmJ7Un1cIiB9LlxuICAgICAqL1xuICAgIG1hY3Jvcz86IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG59O1xuXG4vKipcbiAqIFJlbmRlciBUZVggbWF0aCB0ZXh0IHRvIGEgS2FUZVggSFRNTCBzdHJpbmcgdXNpbmcgdGhlIEthVGVYXG4gKiByZW5kZXJUb1N0cmluZyBmdW5jdGlvbi4gIFJlbmRlcmluZyBpcyBzeW5jaHJvbm91cyBhbmQgaGFwcGVuc1xuICogaW4tcHJvY2Vzcy4gIEludmFsaWQgVGVYIHRocm93cyBrYXRleC5QYXJzZUVycm9yLlxuICpcbiAqIFRoZSBnZW5lcmF0ZWQgbWFya3VwIHJlcXVpcmVzIHRoZSBLYVRlWCBzdHlsZXNoZWV0XG4gKiAoa2F0ZXgvZGlzdC9rYXRleC5taW4uY3NzKSB0byBkaXNwbGF5IGNvcnJlY3RseS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlckthVGVYSHRtbChcbiAgICBjb2RlOiBzdHJpbmcsIG9wdGlvbnM/OiBLYVRlWE9wdGlvbnNcbik6IHN0cmluZyB7XG4gICAgcmV0dXJuIGthdGV4LnJlbmRlclRvU3RyaW5nKGNvZGUsIHtcbiAgICAgICAgZGlzcGxheU1vZGU6IG9wdGlvbnM/LmRpc3BsYXlNb2RlID8/IHRydWUsXG4gICAgICAgIG91dHB1dDogb3B0aW9ucz8ub3V0cHV0LFxuICAgICAgICBtYWNyb3M6IG9wdGlvbnM/Lm1hY3JvcyxcbiAgICAgICAgdGhyb3dPbkVycm9yOiB0cnVlXG4gICAgfSk7XG59XG5cbmV4cG9ydCB0eXBlIEthVGVYUmVuZGVyT3B0aW9ucyA9IEthVGVYT3B0aW9ucyAmIHtcbiAgICAvKipcbiAgICAgKiBUZVggbWF0aCB0ZXh0IHRvIHJlbmRlclxuICAgICAqL1xuICAgIGNvZGU6IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIEZpbGUgdG8gd3JpdGUgdGhlIEhUTUwgZnJhZ21lbnQgaW50b1xuICAgICAqL1xuICAgIG91dHB1dEZOOiBzdHJpbmc7XG59O1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZG9LYVRlWChcbiAgICBvcHRpb25zOiBLYVRlWFJlbmRlck9wdGlvbnNcbik6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGh0bWwgPSByZW5kZXJLYVRlWEh0bWwob3B0aW9ucy5jb2RlLCBvcHRpb25zKTtcbiAgICBhd2FpdCBmc3Aud3JpdGVGaWxlKG9wdGlvbnMub3V0cHV0Rk4sIGh0bWwsICd1dGYtOCcpO1xufVxuXG4vKipcbiAqIEhhbmRsZSBjb252ZXJ0aW5nIGEgc2luZ2xlIFRlWCBtYXRoIGV4cHJlc3Npb24gZm9yIGRpc3BsYXlcbiAqIGluIGEgZG9jdW1lbnQsIGZyb20gdGhlIDxkaWFncmFtcy1rYXRleD4gZWxlbWVudC5cbiAqXG4gKiBUaGUgbWF0aCB0ZXh0IGlzIGVpdGhlciBpbmxpbmUgaW4gdGhlIGVsZW1lbnQgYm9keSBvciBpblxuICogdGhlIGZpbGUgbmFtZWQgYnkgdGhlIGlucHV0LWZpbGUgYXR0cmlidXRlLiAgVGhlIHJlbmRlcmVkXG4gKiBLYVRlWCBtYXJrdXAgaXMgYWx3YXlzIGVtYmVkZGVkIGlubGluZSBpbiB0aGUgZ2VuZXJhdGVkXG4gKiBIVE1MIC0gdW5saWtlIHRoZSBkaWFncmFtIGVsZW1lbnRzIHRoZXJlIGlzIG5vIG91dHB1dC1maWxlXG4gKiBtb2RlLCBiZWNhdXNlIHRoZSBvdXRwdXQgaXMgSFRNTCBtYXJrdXAgcmF0aGVyIHRoYW4gYW5cbiAqIGltYWdlIHRoYXQgY291bGQgYmUgcmVmZXJlbmNlZCB3aXRoIDxpbWc+LlxuICpcbiAqIEJ5IGRlZmF1bHQgdGhlIG1hdGggaXMgcmVuZGVyZWQgaW4gZGlzcGxheSAoYmxvY2spIG1vZGVcbiAqIGFuZCB3cmFwcGVkIGluIGEgPGZpZ3VyZT4uICBXaXRoIHRoZSBpbmxpbmUgcHJvcGVydHkgdGhlXG4gKiBtYXRoIGlzIHJlbmRlcmVkIGluIGlubGluZSBtb2RlIGFuZCB3cmFwcGVkIGluIGEgPHNwYW4+LFxuICogc3VpdGFibGUgZm9yIHVzZSB3aXRoaW4gYSBwYXJhZ3JhcGguXG4gKi9cbmV4cG9ydCBjbGFzcyBLYVRlWExvY2FsIGV4dGVuZHMgYWthc2hhLkN1c3RvbUVsZW1lbnQge1xuXHRnZXQgZWxlbWVudE5hbWUoKSB7IHJldHVybiBcImRpYWdyYW1zLWthdGV4XCI7IH1cblxuICAgIGFzeW5jIHByb2Nlc3MoJGVsZW1lbnQsIG1ldGFkYXRhLCBkaXJ0eTogRnVuY3Rpb24pIHtcblxuICAgICAgICBsZXQgY29kZSA9ICRlbGVtZW50LnRleHQoKTtcbiAgICAgICAgY29uc3QgaW5mID0gICRlbGVtZW50LmF0dHIoJ2lucHV0LWZpbGUnKTtcblxuICAgICAgICBpZiAodHlwZW9mICRlbGVtZW50LmF0dHIoJ291dHB1dC1maWxlJykgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGRpYWdyYW1zLWthdGV4IHJlbmRlcnMgaW5saW5lIEhUTUwgbWFya3VwIC0gb3V0cHV0LWZpbGUgaXMgbm90IHN1cHBvcnRlZGApO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IHZwYXRoSW47XG4gICAgICAgIGxldCBmc3BhdGhJbjtcbiAgICAgICAgaWYgKHR5cGVvZiBpbmYgPT09ICdzdHJpbmcnXG4gICAgICAgICAmJiBpbmYubGVuZ3RoID49IDFcbiAgICAgICAgKSB7XG4gICAgICAgICAgICBpZiAocGF0aC5pc0Fic29sdXRlKGluZikpIHtcbiAgICAgICAgICAgICAgICB2cGF0aEluID0gaW5mO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBsZXQgZGlyID0gcGF0aC5kaXJuYW1lKG1ldGFkYXRhLmRvY3VtZW50LnBhdGgpO1xuICAgICAgICAgICAgICAgIHZwYXRoSW4gPSBwYXRoLm5vcm1hbGl6ZShcbiAgICAgICAgICAgICAgICAgICAgcGF0aC5qb2luKCcvJywgZGlyLCBpbmYpXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjb25zdCBkb2N1bWVudHMgPSB0aGlzLmNvbmZpZy5ha2FzaGEuZmlsZWNhY2hlLmRvY3VtZW50c0NhY2hlO1xuICAgICAgICBjb25zdCBhc3NldHMgPSB0aGlzLmFrYXNoYS5maWxlY2FjaGUuYXNzZXRzQ2FjaGU7XG5cbiAgICAgICAgY29uc3QgZG9jID0gdnBhdGhJblxuICAgICAgICAgICAgPyBhd2FpdCBkb2N1bWVudHMuZmluZCh2cGF0aEluKVxuICAgICAgICAgICAgOiB1bmRlZmluZWQ7XG5cbiAgICAgICAgbGV0IGFzc2V0O1xuICAgICAgICBpZiAoIWRvYykgYXNzZXQgPSB2cGF0aEluXG4gICAgICAgICAgICA/IGF3YWl0IGFzc2V0cy5maW5kKHZwYXRoSW4pXG4gICAgICAgICAgICA6IHVuZGVmaW5lZDtcblxuICAgICAgICBpZiAoZG9jKSBmc3BhdGhJbiA9IGRvYy5mc3BhdGg7XG4gICAgICAgIGVsc2UgaWYgKGFzc2V0KSBmc3BhdGhJbiA9IGFzc2V0LmZzcGF0aDtcblxuICAgICAgICBpZiAodHlwZW9mIGZzcGF0aEluID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgY29kZSA9IGF3YWl0IGZzcC5yZWFkRmlsZShmc3BhdGhJbiwgJ3V0Zi04Jyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGNvZGUgIT09ICdzdHJpbmcnIHx8IGNvZGUudHJpbSgpLmxlbmd0aCA8IDEpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgZGlhZ3JhbXMta2F0ZXggcmVxdWlyZXMgYW4gaW5wdXQtZmlsZSBvciBhbiBpbmxpbmUgbWF0aCBib2R5YCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBrYXRleE9wdGlvbnMgPSB0aGlzLmFycmF5Lm9wdGlvbnM/LmthdGV4ID8/IHt9O1xuXG4gICAgICAgIGNvbnN0IGlubGluZSA9IHR5cGVvZiAkZWxlbWVudC5wcm9wKCdpbmxpbmUnKSAhPT0gJ3VuZGVmaW5lZCc7XG5cbiAgICAgICAgbGV0IGh0bWw7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBodG1sID0gcmVuZGVyS2FUZVhIdG1sKGNvZGUsIHtcbiAgICAgICAgICAgICAgICBkaXNwbGF5TW9kZTogIWlubGluZSxcbiAgICAgICAgICAgICAgICBvdXRwdXQ6IGthdGV4T3B0aW9ucy5vdXRwdXQsXG4gICAgICAgICAgICAgICAgbWFjcm9zOiBrYXRleE9wdGlvbnMubWFjcm9zXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGBLYVRlWCB0aHJldyBlcnJvciAke2Vyci5tZXNzYWdlfVxuSW5wdXQ6ICR7aW5mfSAke2ZzcGF0aElufVxuJHtjb2RlfVxuYCk7XG4gICAgICAgICAgICByZXR1cm4gYFxuPGRpdiBjbGFzcz1cImRpYWdyYW1zLXJlbmRlci1lcnJvclwiPlxuPHNwYW4gY2xhc3M9XCJkaWFncmFtcy10aXRsZVwiPkthVGVYIHRocmV3IGVycm9yICR7ZW5jb2RlKGVyci5tZXNzYWdlKX08L3NwYW4+XG48c3BhbiBjbGFzcz1cImRpYWdyYW1zLWVycm9yLWZpbGVzXCI+XG48Yj5JbnB1dDo8L2I+ICR7aW5mfSAke2ZzcGF0aElufTwvc3Bhbj5cbjxjb2RlIGNsYXNzPVwiZGlhZ3JhbXMtZXJyb3ItaW5wdXRcIj48cHJlPiR7ZW5jb2RlKGNvZGUpfTwvcHJlPjwvY29kZT5cbjwvZGl2PlxuYDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGlkID0gJGVsZW1lbnQuYXR0cignaWQnKTtcbiAgICAgICAgY29uc3QgY2xhenogPSAkZWxlbWVudC5hdHRyKCdjbGFzcycpO1xuICAgICAgICBjb25zdCB0aXRsZSA9ICRlbGVtZW50LmF0dHIoJ3RpdGxlJyk7XG4gICAgICAgIGNvbnN0IGNhcHRpb24gPSAkZWxlbWVudC5hdHRyKCdjYXB0aW9uJyk7XG5cbiAgICAgICAgY29uc3QgY2FwID0gdHlwZW9mIGNhcHRpb24gPT09ICdzdHJpbmcnXG4gICAgICAgICAgICA/IGA8ZmlnY2FwdGlvbj4ke2VuY29kZShjYXB0aW9uKX08L2ZpZ2NhcHRpb24+YFxuICAgICAgICAgICAgOiAnJztcbiAgICAgICAgY29uc3QgVHRpdGxlID0gdHlwZW9mIHRpdGxlID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgPyBgdGl0bGU9XCIke2VuY29kZSh0aXRsZSl9XCJgXG4gICAgICAgICAgICA6ICcnO1xuICAgICAgICBjb25zdCBUaWQgPSB0eXBlb2YgaWQgPT09ICdzdHJpbmcnXG4gICAgICAgICAgICA/IGBpZD1cIiR7ZW5jb2RlKGlkKX1cImBcbiAgICAgICAgICAgIDogJyc7XG4gICAgICAgIC8vIFRoZSBkaWFncmFtcy1rYXRleCBjbGFzcyBjYXJyaWVzIHRoZSBzdHlsZXNoZWV0IHJ1bGVzXG4gICAgICAgIC8vIGNvbnN0cmFpbmluZyB3aWRlIGVxdWF0aW9ucyB0byB0aGVpciBjb250YWluZXIuXG4gICAgICAgIGNvbnN0IFRjbGF6eiA9IHR5cGVvZiBjbGF6eiA9PT0gJ3N0cmluZydcbiAgICAgICAgICAgID8gYGNsYXNzPVwiZGlhZ3JhbXMta2F0ZXggJHtlbmNvZGUoY2xhenopfVwiYFxuICAgICAgICAgICAgOiBgY2xhc3M9XCJkaWFncmFtcy1rYXRleFwiYDtcblxuICAgICAgICByZXR1cm4gaW5saW5lXG4gICAgICAgICAgICA/IGA8c3BhbiAke1RpZH0gJHtUY2xhenp9ICR7VHRpdGxlfT4ke2h0bWx9PC9zcGFuPmBcbiAgICAgICAgICAgIDogYFxuICAgICAgICA8ZmlndXJlICR7VGlkfSAke1RjbGF6en0gJHtUdGl0bGV9PlxuICAgICAgICAke2h0bWx9XG4gICAgICAgICR7Y2FwfVxuICAgICAgICA8L2ZpZ3VyZT5cbiAgICAgICAgYDtcbiAgICB9XG59XG4iXX0=