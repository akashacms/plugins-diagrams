import path from 'node:path';
import fs, { promises as fsp } from 'node:fs';
import { encode } from 'html-entities';
import { renderSvg, renderSvgWithConfig, registerFont } from 'mermaid-wasm-renderer';
import * as akasha from 'akasharender';
// The WASM renderer cannot see the filesystem, so for exact text
// measurement fonts are read here and passed in as bytes.
let mermaidFontRegistered = false;
const registeredFontFNs = new Set();
/**
 * Register the named TTF/OTF font files for text measurement.
 * Suppresses the automatic system font registration - the
 * user-supplied fonts take priority.  Each file is registered
 * at most once, so this is safe to call for every render.
 */
export function registerMermaidFonts(fontFNs) {
    for (const fontFN of fontFNs) {
        if (registeredFontFNs.has(fontFN))
            continue;
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
    if (mermaidFontRegistered)
        return;
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
        }
        catch (err) {
            // Try the next candidate.
        }
    }
}
/**
 * Render Mermaid diagram text to an SVG string.
 */
export function renderMermaidSvg(code, configJSON, themePreset) {
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
export function adaptInlineSvg(svg, width, alt) {
    return svg.replace(/<svg([^>]*)>/, (_m, attrs) => {
        // The width attribute may carry a unit suffix,
        // such as PlantUML's width="123px".
        const naturalWidth = Number.parseFloat(attrs.match(/\swidth="([^"]*)"/)?.[1]);
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
        }
        else if (!Number.isNaN(naturalWidth)) {
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
export async function doMermaid(options) {
    if (Array.isArray(options.fontFNs)
        && options.fontFNs.length >= 1) {
        registerMermaidFonts(options.fontFNs);
    }
    const svg = renderMermaidSvg(options.code, options.configJSON, options.themePreset);
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
    async process($element, metadata, dirty) {
        let code = $element.text();
        const outputFN = $element.attr('output-file');
        const inf = $element.attr('input-file');
        // console.log(`MermaidLocal ${inf} ==> ${outputFN}`);
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
        // console.log(`MermaidLocal ${inf} ${vpathIn}`);
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
            fspathOut = path.join(this.config.renderDestination, outputFN);
            await fsp.mkdir(path.dirname(fspathOut), {
                recursive: true
            });
        }
        try {
            if (inlineMode) {
                if (Array.isArray(mermaidOptions.fontFNs)
                    && mermaidOptions.fontFNs.length >= 1) {
                    registerMermaidFonts(mermaidOptions.fontFNs);
                }
                svg = renderMermaidSvg(code, mermaidOptions.configJSON, mermaidOptions.themePreset);
            }
            else {
                await doMermaid({
                    code,
                    outputFN: fspathOut,
                    configJSON: mermaidOptions.configJSON,
                    themePreset: mermaidOptions.themePreset,
                    fontFNs: mermaidOptions.fontFNs
                });
            }
        }
        catch (err) {
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
        ${adaptInlineSvg(svg, typeof width === 'number' ? width : undefined, typeof alt === 'string' ? alt : undefined)}
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuZGVyLW1lcm1haWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9saWIvcmVuZGVyLW1lcm1haWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxJQUFJLE1BQU0sV0FBVyxDQUFDO0FBQzdCLE9BQU8sRUFBRSxFQUFFLEVBQUUsUUFBUSxJQUFJLEdBQUcsRUFBRSxNQUFNLFNBQVMsQ0FBQztBQUM5QyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3ZDLE9BQU8sRUFBRSxTQUFTLEVBQUUsbUJBQW1CLEVBQUUsWUFBWSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDckYsT0FBTyxLQUFLLE1BQU0sTUFBTSxjQUFjLENBQUM7QUFFdkMsaUVBQWlFO0FBQ2pFLDBEQUEwRDtBQUUxRCxJQUFJLHFCQUFxQixHQUFHLEtBQUssQ0FBQztBQUVsQyxNQUFNLGlCQUFpQixHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7QUFFNUM7Ozs7O0dBS0c7QUFDSCxNQUFNLFVBQVUsb0JBQW9CLENBQUMsT0FBaUI7SUFDbEQsS0FBSyxNQUFNLE1BQU0sSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUMzQixJQUFJLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUM7WUFBRSxTQUFTO1FBQzVDLFlBQVksQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDdEMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ2xDLENBQUM7SUFDRCxxQkFBcUIsR0FBRyxJQUFJLENBQUM7QUFDakMsQ0FBQztBQUVEOzs7OztHQUtHO0FBQ0gsTUFBTSxVQUFVLG1CQUFtQjtJQUMvQixJQUFJLHFCQUFxQjtRQUFFLE9BQU87SUFDbEMscUJBQXFCLEdBQUcsSUFBSSxDQUFDO0lBQzdCLE1BQU0sVUFBVSxHQUFHO1FBQ2YsaURBQWlEO1FBQ2pELGlFQUFpRTtRQUNqRSxxQ0FBcUM7UUFDckMs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QyxDQUFDO2tCQUNJLEdBQUcsSUFBSSxNQUFNLElBQUksTUFBTTtVQUMvQixjQUFjLENBQUMsR0FBRyxFQUNoQixPQUFPLEtBQUssS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUM3QyxPQUFPLEdBQUcsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1VBQzVDLEdBQUc7O1NBRUo7WUFDRyxDQUFDLENBQUM7a0JBQ0ksR0FBRyxJQUFJLE1BQU07b0JBQ1gsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLElBQUksSUFBSSxNQUFNLElBQUksTUFBTTtVQUN2RCxHQUFHOztTQUVKLENBQUM7UUFDRiwyQ0FBMkM7UUFDM0MsY0FBYztRQUNkLGdCQUFnQjtRQUNoQixzQkFBc0I7UUFDdEIsMEJBQTBCO1FBQzFCLGVBQWU7UUFDZixNQUFNO1FBQ04sZ0RBQWdEO1FBQ2hELE9BQU8sR0FBRyxDQUFDO0lBQ2YsQ0FBQztDQUNKIiwic291cmNlc0NvbnRlbnQiOlsiXG5pbXBvcnQgcGF0aCBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IGZzLCB7IHByb21pc2VzIGFzIGZzcCB9IGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHsgZW5jb2RlIH0gZnJvbSAnaHRtbC1lbnRpdGllcyc7XG5pbXBvcnQgeyByZW5kZXJTdmcsIHJlbmRlclN2Z1dpdGhDb25maWcsIHJlZ2lzdGVyRm9udCB9IGZyb20gJ21lcm1haWQtd2FzbS1yZW5kZXJlcic7XG5pbXBvcnQgKiBhcyBha2FzaGEgZnJvbSAnYWthc2hhcmVuZGVyJztcblxuLy8gVGhlIFdBU00gcmVuZGVyZXIgY2Fubm90IHNlZSB0aGUgZmlsZXN5c3RlbSwgc28gZm9yIGV4YWN0IHRleHRcbi8vIG1lYXN1cmVtZW50IGZvbnRzIGFyZSByZWFkIGhlcmUgYW5kIHBhc3NlZCBpbiBhcyBieXRlcy5cblxubGV0IG1lcm1haWRGb250UmVnaXN0ZXJlZCA9IGZhbHNlO1xuXG5jb25zdCByZWdpc3RlcmVkRm9udEZOcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4vKipcbiAqIFJlZ2lzdGVyIHRoZSBuYW1lZCBUVEYvT1RGIGZvbnQgZmlsZXMgZm9yIHRleHQgbWVhc3VyZW1lbnQuXG4gKiBTdXBwcmVzc2VzIHRoZSBhdXRvbWF0aWMgc3lzdGVtIGZvbnQgcmVnaXN0cmF0aW9uIC0gdGhlXG4gKiB1c2VyLXN1cHBsaWVkIGZvbnRzIHRha2UgcHJpb3JpdHkuICBFYWNoIGZpbGUgaXMgcmVnaXN0ZXJlZFxuICogYXQgbW9zdCBvbmNlLCBzbyB0aGlzIGlzIHNhZmUgdG8gY2FsbCBmb3IgZXZlcnkgcmVuZGVyLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVnaXN0ZXJNZXJtYWlkRm9udHMoZm9udEZOczogc3RyaW5nW10pIHtcbiAgICBmb3IgKGNvbnN0IGZvbnRGTiBvZiBmb250Rk5zKSB7XG4gICAgICAgIGlmIChyZWdpc3RlcmVkRm9udEZOcy5oYXMoZm9udEZOKSkgY29udGludWU7XG4gICAgICAgIHJlZ2lzdGVyRm9udChmcy5yZWFkRmlsZVN5bmMoZm9udEZOKSk7XG4gICAgICAgIHJlZ2lzdGVyZWRGb250Rk5zLmFkZChmb250Rk4pO1xuICAgIH1cbiAgICBtZXJtYWlkRm9udFJlZ2lzdGVyZWQgPSB0cnVlO1xufVxuXG4vKipcbiAqIFJlZ2lzdGVyIGEgY29tbW9uIHN5c3RlbSBmb250LCBpZiBvbmUgaXMgZm91bmQuICBJZiBub25lIG9mXG4gKiB0aGUgY2FuZGlkYXRlcyBleGlzdCwgdGhlIHJlbmRlcmVyIHVzZXMgY2FsaWJyYXRlZCBmYWxsYmFja1xuICogbWV0cmljcy4gIFJ1bnMgYXQgbW9zdCBvbmNlOyBkb2VzIG5vdGhpbmcgaWYgZm9udHMgd2VyZVxuICogYWxyZWFkeSByZWdpc3RlcmVkIHdpdGggcmVnaXN0ZXJNZXJtYWlkRm9udHMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWdpc3Rlck1lcm1haWRGb250KCkge1xuICAgIGlmIChtZXJtYWlkRm9udFJlZ2lzdGVyZWQpIHJldHVybjtcbiAgICBtZXJtYWlkRm9udFJlZ2lzdGVyZWQgPSB0cnVlO1xuICAgIGNvbnN0IGNhbmRpZGF0ZXMgPSBbXG4gICAgICAgICcvdXNyL3NoYXJlL2ZvbnRzL3RydWV0eXBlL2RlamF2dS9EZWphVnVTYW5zLnR0ZicsXG4gICAgICAgICcvdXNyL3NoYXJlL2ZvbnRzL3RydWV0eXBlL2xpYmVyYXRpb24vTGliZXJhdGlvblNhbnMtUmVndWxhci50dGYnLFxuICAgICAgICAnL3Vzci9zaGFyZS9mb250cy9UVEYvRGVqYVZ1U2Fucy50dGYnLFxuICAgICAgICAnL1N5c3RlbS9MaWJyYXJ5L0ZvbnRzL0hlbHZldGljYS50dGMnLFxuICAgICAgICAnQzpcXFxcV2luZG93c1xcXFxGb250c1xcXFxhcmlhbC50dGYnLFxuICAgIF07XG4gICAgZm9yIChjb25zdCBmb250Rk4gb2YgY2FuZGlkYXRlcykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmVnaXN0ZXJGb250KGZzLnJlYWRGaWxlU3luYyhmb250Rk4pKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAvLyBUcnkgdGhlIG5leHQgY2FuZGlkYXRlLlxuICAgICAgICB9XG4gICAgfVxufVxuXG4vKipcbiAqIFJlbmRlciBNZXJtYWlkIGRpYWdyYW0gdGV4dCB0byBhbiBTVkcgc3RyaW5nLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyTWVybWFpZFN2ZyhcbiAgICBjb2RlOiBzdHJpbmcsXG4gICAgY29uZmlnSlNPTj86IHN0cmluZyxcbiAgICB0aGVtZVByZXNldD86IHN0cmluZ1xuKTogc3RyaW5nIHtcbiAgICByZWdpc3Rlck1lcm1haWRGb250KCk7XG4gICAgcmV0dXJuIChjb25maWdKU09OIHx8IHRoZW1lUHJlc2V0KVxuICAgICAgICA/IHJlbmRlclN2Z1dpdGhDb25maWcoY29kZSwgY29uZmlnSlNPTiwgdGhlbWVQcmVzZXQpXG4gICAgICAgIDogcmVuZGVyU3ZnKGNvZGUpO1xufVxuXG4vKipcbiAqIEFkanVzdCB0aGUgcm9vdCBlbGVtZW50IG9mIGEgcmVuZGVyZWQgU1ZHIGZvciBpbmxpbmUgZW1iZWRkaW5nXG4gKiBpbiBhIHdlYiBwYWdlLlxuICpcbiAqIFRoZSByZW5kZXJlciBlbWl0cyBmaXhlZCBwaXhlbCB3aWR0aD0gYW5kIGhlaWdodD0gYXR0cmlidXRlcyxcbiAqIHdoaWNoIG92ZXJmbG93IG5hcnJvdyBjb250YWluZXJzLiAgVGhvc2UgYXR0cmlidXRlcyBhcmUgcmVtb3ZlZFxuICogKHRoZSB2aWV3Qm94IHByZXNlcnZlcyB0aGUgYXNwZWN0IHJhdGlvKSBhbmQgcmVwbGFjZWQgd2l0aCBhXG4gKiBtYXgtd2lkdGggc3R5bGUgaG9sZGluZyB0aGUgZGlhZ3JhbSdzIG5hdHVyYWwgd2lkdGgsIHNvIHRoYXRcbiAqIHN0eWxlc2hlZXQgcnVsZXMgbGlrZSBgd2lkdGg6IDEwMCU7IGhlaWdodDogYXV0b2AgY29uc3RyYWluIHRoZVxuICogZGlhZ3JhbSB0byBpdHMgY29udGFpbmVyIHdpdGhvdXQgdXBzY2FsaW5nIHNtYWxsIGRpYWdyYW1zLlxuICpcbiAqIFdoZW4gYW4gZXhwbGljaXQgd2lkdGggaXMgZ2l2ZW4sIGl0IGJlY29tZXMgYSB3aWR0aCBzdHlsZVxuICogaW5zdGVhZCwgb3ZlcnJpZGluZyBhbnkgc3R5bGVzaGVldCBzaXppbmcuXG4gKlxuICogQW4gZXhpc3Rpbmcgc3R5bGUgYXR0cmlidXRlIG9uIHRoZSBTVkcgcm9vdCAoUGxhbnRVTUwgZW1pdHNcbiAqIG9uZSBjYXJyeWluZyB3aWR0aCwgaGVpZ2h0LCBhbmQgYmFja2dyb3VuZCkgaXMgbWVyZ2VkOiBpdHNcbiAqIHdpZHRoIGFuZCBoZWlnaHQgZGVjbGFyYXRpb25zIGFyZSBzdXBlcnNlZGVkIGJ5IHRoZSBzaXppbmdcbiAqIGNvbXB1dGVkIGhlcmUsIHdoaWxlIG90aGVyIGRlY2xhcmF0aW9ucyBzdWNoIGFzIGJhY2tncm91bmRcbiAqIHN1cnZpdmUuXG4gKlxuICogVGhlIGFsdCB0ZXh0LCB3aGVuIGdpdmVuLCBiZWNvbWVzIGFuIGFyaWEtbGFiZWw7IHRoZSBTVkcgaXNcbiAqIG1hcmtlZCByb2xlPVwiaW1nXCIgZm9yIGFjY2Vzc2liaWxpdHkgZWl0aGVyIHdheS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFkYXB0SW5saW5lU3ZnKFxuICAgIHN2Zzogc3RyaW5nLCB3aWR0aD86IG51bWJlciwgYWx0Pzogc3RyaW5nXG4pOiBzdHJpbmcge1xuICAgIHJldHVybiBzdmcucmVwbGFjZSgvPHN2ZyhbXj5dKik+LywgKF9tLCBhdHRycykgPT4ge1xuICAgICAgICAvLyBUaGUgd2lkdGggYXR0cmlidXRlIG1heSBjYXJyeSBhIHVuaXQgc3VmZml4LFxuICAgICAgICAvLyBzdWNoIGFzIFBsYW50VU1MJ3Mgd2lkdGg9XCIxMjNweFwiLlxuICAgICAgICBjb25zdCBuYXR1cmFsV2lkdGggPSBOdW1iZXIucGFyc2VGbG9hdChcbiAgICAgICAgICAgIGF0dHJzLm1hdGNoKC9cXHN3aWR0aD1cIihbXlwiXSopXCIvKT8uWzFdKTtcbiAgICAgICAgY29uc3Qgc3R5bGUgPSAoYXR0cnMubWF0Y2goL1xcc3N0eWxlPVwiKFteXCJdKilcIi8pPy5bMV0gPz8gJycpXG4gICAgICAgICAgICAuc3BsaXQoJzsnKVxuICAgICAgICAgICAgLm1hcChkZWNsID0+IGRlY2wudHJpbSgpKVxuICAgICAgICAgICAgLmZpbHRlcihkZWNsID0+IGRlY2wubGVuZ3RoID49IDFcbiAgICAgICAgICAgICAgICAmJiAhL14od2lkdGh8aGVpZ2h0KVxccyo6Ly50ZXN0KGRlY2wpKTtcbiAgICAgICAgbGV0IGFkanVzdGVkID0gYXR0cnNcbiAgICAgICAgICAgIC5yZXBsYWNlKC9cXHN3aWR0aD1cIlteXCJdKlwiLywgJycpXG4gICAgICAgICAgICAucmVwbGFjZSgvXFxzaGVpZ2h0PVwiW15cIl0qXCIvLCAnJylcbiAgICAgICAgICAgIC5yZXBsYWNlKC9cXHNzdHlsZT1cIlteXCJdKlwiLywgJycpO1xuICAgICAgICBpZiAodHlwZW9mIHdpZHRoID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgc3R5bGUucHVzaChgd2lkdGg6ICR7d2lkdGh9cHhgKTtcbiAgICAgICAgfSBlbHNlIGlmICghTnVtYmVyLmlzTmFOKG5hdHVyYWxXaWR0aCkpIHtcbiAgICAgICAgICAgIHN0eWxlLnB1c2goYG1heC13aWR0aDogJHtuYXR1cmFsV2lkdGh9cHhgKTtcbiAgICAgICAgfVxuICAgICAgICBsZXQgZXh0cmEgPSBzdHlsZS5sZW5ndGggPj0gMVxuICAgICAgICAgICAgPyBgIHN0eWxlPVwiJHtzdHlsZS5qb2luKCc7ICcpfVwiYFxuICAgICAgICAgICAgOiAnJztcbiAgICAgICAgZXh0cmEgKz0gJyByb2xlPVwiaW1nXCInO1xuICAgICAgICBpZiAodHlwZW9mIGFsdCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIGV4dHJhICs9IGAgYXJpYS1sYWJlbD1cIiR7ZW5jb2RlKGFsdCl9XCJgO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBgPHN2ZyR7YWRqdXN0ZWR9JHtleHRyYX0+YDtcbiAgICB9KTtcbn1cblxuZXhwb3J0IHR5cGUgTWVybWFpZFJlbmRlck9wdGlvbnMgPSB7XG4gICAgLyoqXG4gICAgICogTWVybWFpZCBkaWFncmFtIHRleHQgdG8gcmVuZGVyXG4gICAgICovXG4gICAgY29kZTogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogRmlsZSB0byB3cml0ZSB0aGUgU1ZHIGludG9cbiAgICAgKi9cbiAgICBvdXRwdXRGTjogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogSlNPTiBjb25maWd1cmF0aW9uIHN0cmluZyB1c2luZyB0aGUgc2FtZSBzY2hlbWEgYXMgdGhlXG4gICAgICogbW1kciAtLWNvbmZpZyBmaWxlICh0aGVtZSwgdGhlbWVWYXJpYWJsZXMsIGZsb3djaGFydCwgLi4uKVxuICAgICAqL1xuICAgIGNvbmZpZ0pTT04/OiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBUaGVtZSBwcmVzZXQgbmFtZTogZGVmYXVsdCwgZGFyaywgZm9yZXN0LCBuZXV0cmFsLCBtb2Rlcm4uXG4gICAgICogVGFrZXMgcHJlY2VkZW5jZSBvdmVyIHRoZSBjb25maWcncyB0aGVtZSBuYW1lLlxuICAgICAqL1xuICAgIHRoZW1lUHJlc2V0Pzogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogVFRGL09URiBmb250IGZpbGVzIHRvIHJlZ2lzdGVyIGZvciB0ZXh0IG1lYXN1cmVtZW50LlxuICAgICAqIFdoZW4gb21pdHRlZCwgYSBjb21tb24gc3lzdGVtIGZvbnQgaXMgdXNlZCBpZiBmb3VuZC5cbiAgICAgKi9cbiAgICBmb250Rk5zPzogc3RyaW5nW107XG59O1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZG9NZXJtYWlkKFxuICAgIG9wdGlvbnM6IE1lcm1haWRSZW5kZXJPcHRpb25zXG4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShvcHRpb25zLmZvbnRGTnMpXG4gICAgICYmIG9wdGlvbnMuZm9udEZOcy5sZW5ndGggPj0gMVxuICAgICkge1xuICAgICAgICByZWdpc3Rlck1lcm1haWRGb250cyhvcHRpb25zLmZvbnRGTnMpO1xuICAgIH1cblxuICAgIGNvbnN0IHN2ZyA9IHJlbmRlck1lcm1haWRTdmcoXG4gICAgICAgIG9wdGlvbnMuY29kZSwgb3B0aW9ucy5jb25maWdKU09OLCBvcHRpb25zLnRoZW1lUHJlc2V0KTtcblxuICAgIGF3YWl0IGZzcC53cml0ZUZpbGUob3B0aW9ucy5vdXRwdXRGTiwgc3ZnLCAndXRmLTgnKTtcbn1cblxuLyoqXG4gKiBIYW5kbGUgY29udmVydGluZyBhIHNpbmdsZSBNZXJtYWlkIGRpYWdyYW0gZm9yIGRpc3BsYXlcbiAqIGluIGEgZG9jdW1lbnQsIGZyb20gdGhlIDxkaWFncmFtcy1tZXJtYWlkPiBlbGVtZW50LlxuICpcbiAqIFRoZSBkaWFncmFtIGlzIGVpdGhlciBpbmxpbmUgaW4gdGhlIGVsZW1lbnQgYm9keSBvciBpblxuICogdGhlIGZpbGUgbmFtZWQgYnkgdGhlIGlucHV0LWZpbGUgYXR0cmlidXRlLiAgV2l0aCBhblxuICogb3V0cHV0LWZpbGUgYXR0cmlidXRlIHRoZSBTVkcgaXMgd3JpdHRlbiB0byB0aGF0IGZpbGVcbiAqIGFuZCByZWZlcmVuY2VkIHdpdGggPGltZz47IHdpdGhvdXQgaXQgdGhlIFNWRyBpc1xuICogZW1iZWRkZWQgaW5saW5lIGluIHRoZSBnZW5lcmF0ZWQgSFRNTC5cbiAqL1xuZXhwb3J0IGNsYXNzIE1lcm1haWRMb2NhbCBleHRlbmRzIGFrYXNoYS5DdXN0b21FbGVtZW50IHtcblx0Z2V0IGVsZW1lbnROYW1lKCkgeyByZXR1cm4gXCJkaWFncmFtcy1tZXJtYWlkXCI7IH1cblxuICAgIGFzeW5jIHByb2Nlc3MoJGVsZW1lbnQsIG1ldGFkYXRhLCBkaXJ0eTogRnVuY3Rpb24pIHtcblxuICAgICAgICBsZXQgY29kZSA9ICRlbGVtZW50LnRleHQoKTtcbiAgICAgICAgY29uc3Qgb3V0cHV0Rk4gPSAkZWxlbWVudC5hdHRyKCdvdXRwdXQtZmlsZScpO1xuICAgICAgICBjb25zdCBpbmYgPSAgJGVsZW1lbnQuYXR0cignaW5wdXQtZmlsZScpO1xuXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGBNZXJtYWlkTG9jYWwgJHtpbmZ9ID09PiAke291dHB1dEZOfWApO1xuXG4gICAgICAgIGxldCB2cGF0aEluO1xuICAgICAgICBsZXQgZnNwYXRoSW47XG4gICAgICAgIGlmICh0eXBlb2YgaW5mID09PSAnc3RyaW5nJ1xuICAgICAgICAgJiYgaW5mLmxlbmd0aCA+PSAxXG4gICAgICAgICkge1xuICAgICAgICAgICAgaWYgKHBhdGguaXNBYnNvbHV0ZShpbmYpKSB7XG4gICAgICAgICAgICAgICAgdnBhdGhJbiA9IGluZjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbGV0IGRpciA9IHBhdGguZGlybmFtZShtZXRhZGF0YS5kb2N1bWVudC5wYXRoKTtcbiAgICAgICAgICAgICAgICB2cGF0aEluID0gcGF0aC5ub3JtYWxpemUoXG4gICAgICAgICAgICAgICAgICAgIHBhdGguam9pbignLycsIGRpciwgaW5mKVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZG9jdW1lbnRzID0gdGhpcy5jb25maWcuYWthc2hhLmZpbGVjYWNoZS5kb2N1bWVudHNDYWNoZTtcbiAgICAgICAgY29uc3QgYXNzZXRzID0gdGhpcy5ha2FzaGEuZmlsZWNhY2hlLmFzc2V0c0NhY2hlO1xuXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGBNZXJtYWlkTG9jYWwgJHtpbmZ9ICR7dnBhdGhJbn1gKTtcblxuICAgICAgICBjb25zdCBkb2MgPSB2cGF0aEluXG4gICAgICAgICAgICA/IGF3YWl0IGRvY3VtZW50cy5maW5kKHZwYXRoSW4pXG4gICAgICAgICAgICA6IHVuZGVmaW5lZDtcblxuICAgICAgICBsZXQgYXNzZXQ7XG4gICAgICAgIGlmICghZG9jKSBhc3NldCA9IHZwYXRoSW5cbiAgICAgICAgICAgID8gYXdhaXQgYXNzZXRzLmZpbmQodnBhdGhJbilcbiAgICAgICAgICAgIDogdW5kZWZpbmVkO1xuICAgXG4gICAgICAgIGlmIChkb2MpIGZzcGF0aEluID0gZG9jLmZzcGF0aDtcbiAgICAgICAgZWxzZSBpZiAoYXNzZXQpIGZzcGF0aEluID0gYXNzZXQuZnNwYXRoO1xuXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGBNZXJtYWlkTG9jYWwgJHtpbmZ9ICR7dnBhdGhJbn0gJHtmc3BhdGhJbn1gKTtcblxuICAgICAgICBpZiAodHlwZW9mIGZzcGF0aEluID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgY29kZSA9IGF3YWl0IGZzcC5yZWFkRmlsZShmc3BhdGhJbiwgJ3V0Zi04Jyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGNvZGUgIT09ICdzdHJpbmcnIHx8IGNvZGUubGVuZ3RoIDwgMSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBkaWFncmFtcy1tZXJtYWlkIHJlcXVpcmVzIGFuIGlucHV0LWZpbGUgb3IgYW4gaW5saW5lIGRpYWdyYW0gYm9keWApO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gY29uc29sZS5sb2coYE1lcm1haWRMb2NhbCAke2luZn0gJHt2cGF0aElufSAke2ZzcGF0aElufSByZWFkIGNvZGUgJHtjb2RlfWApO1xuXG4gICAgICAgIGNvbnN0IG1lcm1haWRPcHRpb25zID0gdGhpcy5hcnJheS5vcHRpb25zPy5tZXJtYWlkID8/IHt9O1xuXG4gICAgICAgIC8vIFdpdGggbm8gb3V0cHV0LWZpbGUgYXR0cmlidXRlLCB0aGUgcmVuZGVyZWQgU1ZHIGlzXG4gICAgICAgIC8vIGluc2VydGVkIGlubGluZSBpbiB0aGUgZ2VuZXJhdGVkIEhUTUwgcmF0aGVyIHRoYW5cbiAgICAgICAgLy8gd3JpdHRlbiB0byBhIGZpbGUgYW5kIHJlZmVyZW5jZWQgd2l0aCA8aW1nPi5cbiAgICAgICAgY29uc3QgaW5saW5lTW9kZSA9IHR5cGVvZiBvdXRwdXRGTiAhPT0gJ3N0cmluZydcbiAgICAgICAgICAgICAgICAgICAgICAgIHx8IG91dHB1dEZOLmxlbmd0aCA8IDE7XG5cbiAgICAgICAgbGV0IHN2ZztcbiAgICAgICAgbGV0IGZzcGF0aE91dDtcbiAgICAgICAgaWYgKCFpbmxpbmVNb2RlKSB7XG4gICAgICAgICAgICBpZiAoIW91dHB1dEZOLmVuZHNXaXRoKCcuc3ZnJykpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGRpYWdyYW1zLW1lcm1haWQgbXVzdCBoYXZlIG91dHB1dC1maWxlIHdpdGggLnN2ZyBleHRlbnNpb24gLSBtZXJtYWlkLXdhc20tcmVuZGVyZXIgZG9lcyBub3Qgc3VwcG9ydCAucG5nYCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZzcGF0aE91dCA9IHBhdGguam9pbihcbiAgICAgICAgICAgICAgICB0aGlzLmNvbmZpZy5yZW5kZXJEZXN0aW5hdGlvbiwgb3V0cHV0Rk5cbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIGF3YWl0IGZzcC5ta2RpcihwYXRoLmRpcm5hbWUoZnNwYXRoT3V0KSwge1xuICAgICAgICAgICAgICAgIHJlY3Vyc2l2ZTogdHJ1ZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKGlubGluZU1vZGUpIHtcbiAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShtZXJtYWlkT3B0aW9ucy5mb250Rk5zKVxuICAgICAgICAgICAgICAgICAmJiBtZXJtYWlkT3B0aW9ucy5mb250Rk5zLmxlbmd0aCA+PSAxXG4gICAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlZ2lzdGVyTWVybWFpZEZvbnRzKG1lcm1haWRPcHRpb25zLmZvbnRGTnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzdmcgPSByZW5kZXJNZXJtYWlkU3ZnKGNvZGUsXG4gICAgICAgICAgICAgICAgICAgIG1lcm1haWRPcHRpb25zLmNvbmZpZ0pTT04sXG4gICAgICAgICAgICAgICAgICAgIG1lcm1haWRPcHRpb25zLnRoZW1lUHJlc2V0KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgZG9NZXJtYWlkKHtcbiAgICAgICAgICAgICAgICAgICAgY29kZSxcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0Rk46IGZzcGF0aE91dCxcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnSlNPTjogbWVybWFpZE9wdGlvbnMuY29uZmlnSlNPTixcbiAgICAgICAgICAgICAgICAgICAgdGhlbWVQcmVzZXQ6IG1lcm1haWRPcHRpb25zLnRoZW1lUHJlc2V0LFxuICAgICAgICAgICAgICAgICAgICBmb250Rk5zOiBtZXJtYWlkT3B0aW9ucy5mb250Rk5zXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihgTWVybWFpZCB0aHJldyBlcnJvciAke2Vyci5tZXNzYWdlfVxuSW5wdXQ6ICR7aW5mfSAke2ZzcGF0aElufSBPdXRwdXQ6ICR7b3V0cHV0Rk59ICR7ZnNwYXRoT3V0fVxuJHtjb2RlfVxuYCk7XG4gICAgICAgICAgICByZXR1cm4gYFxuPGRpdiBjbGFzcz1cImRpYWdyYW1zLXJlbmRlci1lcnJvclwiPlxuPHNwYW4gY2xhc3M9XCJkaWFncmFtcy10aXRsZVwiPk1lcm1haWQgdGhyZXcgZXJyb3IgJHtlbmNvZGUoZXJyLm1lc3NhZ2UpfTwvc3Bhbj5cbjxzcGFuIGNsYXNzPVwiZGlhZ3JhbXMtZXJyb3ItZmlsZXNcIj5cbjxiPklucHV0OjwvYj4gJHtpbmZ9ICR7ZnNwYXRoSW59PGJyLz5cbjxiPk91dHB1dDo8L2I+ICR7b3V0cHV0Rk59ICR7ZnNwYXRoT3V0fTwvc3Bhbj5cbjxjb2RlIGNsYXNzPVwiZGlhZ3JhbXMtZXJyb3ItaW5wdXRcIj48cHJlPiR7ZW5jb2RlKGNvZGUpfTwvcHJlPjwvY29kZT5cbjwvZGl2PlxuYDtcbiAgICAgICAgICAgIC8vIHRocm93IG5ldyBFcnJvcihgTWVybWFpZCB0aHJldyBlcnJvciAke2Vyci5tZXNzYWdlfWApO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gZWxzZVxuICAgICAgICBsZXQgd2lkdGggPSAkZWxlbWVudC5hdHRyKCd3aWR0aCcpO1xuICAgICAgICBpZiAodHlwZW9mIHdpZHRoID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgd2lkdGggPSBOdW1iZXIucGFyc2VGbG9hdCh3aWR0aCk7XG4gICAgICAgICAgICBpZiAoaXNOYU4od2lkdGgpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBkaWFncmFtcy1tZXJtYWlkOiB3aWR0aCBpcyBub3QgYSBudW1iZXIgJHt3aWR0aH1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGlkID0gJGVsZW1lbnQuYXR0cignaWQnKTtcbiAgICAgICAgY29uc3QgY2xhenogPSAkZWxlbWVudC5hdHRyKCdjbGFzcycpO1xuICAgICAgICBjb25zdCBhbHQgPSAkZWxlbWVudC5hdHRyKCdhbHQnKTtcbiAgICAgICAgY29uc3QgdGl0bGUgPSAkZWxlbWVudC5hdHRyKCd0aXRsZScpO1xuICAgICAgICBjb25zdCBjYXB0aW9uID0gJGVsZW1lbnQuYXR0cignY2FwdGlvbicpO1xuXG4gICAgICAgIGNvbnN0IGNhcCA9IHR5cGVvZiBjYXB0aW9uID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgPyBgPGZpZ2NhcHRpb24+JHtlbmNvZGUoY2FwdGlvbil9PC9maWdjYXB0aW9uPmBcbiAgICAgICAgICAgIDogJyc7XG4gICAgICAgIGNvbnN0IFRhbHQgPSB0eXBlb2YgYWx0ID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgPyBgYWx0PVwiJHtlbmNvZGUoYWx0KX1cImBcbiAgICAgICAgICAgIDogJyc7XG4gICAgICAgIGNvbnN0IFR0aXRsZSA9IHR5cGVvZiB0aXRsZSA9PT0gJ3N0cmluZydcbiAgICAgICAgICAgID8gYHRpdGxlPVwiJHtlbmNvZGUodGl0bGUpfVwiYFxuICAgICAgICAgICAgOiAnJztcbiAgICAgICAgY29uc3QgVGlkID0gdHlwZW9mIGlkID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgPyBgaWQ9XCIke2VuY29kZShpZCl9XCJgXG4gICAgICAgICAgICA6ICcnO1xuICAgICAgICAvLyBUaGUgZGlhZ3JhbXMtbWVybWFpZCBjbGFzcyBjYXJyaWVzIHRoZSBzdHlsZXNoZWV0IHJ1bGVzXG4gICAgICAgIC8vIGNvbnN0cmFpbmluZyB0aGUgZGlhZ3JhbSB0byBpdHMgY29udGFpbmVyIChpc3N1ZSAjMTkpLlxuICAgICAgICBjb25zdCBUY2xhenogPSB0eXBlb2YgY2xhenogPT09ICdzdHJpbmcnXG4gICAgICAgICAgICA/IGBjbGFzcz1cImRpYWdyYW1zLW1lcm1haWQgJHtlbmNvZGUoY2xhenopfVwiYFxuICAgICAgICAgICAgOiBgY2xhc3M9XCJkaWFncmFtcy1tZXJtYWlkXCJgO1xuICAgICAgICBjb25zdCBUd2lkdGggPSB0eXBlb2Ygd2lkdGggPT09ICdudW1iZXInXG4gICAgICAgICAgICA/IGB3aWR0aD1cIiR7d2lkdGgudG9TdHJpbmcoKX1cImBcbiAgICAgICAgICAgIDogJyc7XG5cbiAgICAgICAgLy8gSW4gaW5saW5lIG1vZGUgdGhlcmUgaXMgbm8gPGltZz4gdG8gY2FycnkgdGhlIGFsdCwgdGl0bGUsXG4gICAgICAgIC8vIGFuZCB3aWR0aCBhdHRyaWJ1dGVzLiAgVGhlIGFsdCB0ZXh0IGJlY29tZXMgYW4gYXJpYS1sYWJlbFxuICAgICAgICAvLyBvbiB0aGUgU1ZHIHJvb3QsIHRoZSB3aWR0aCBiZWNvbWVzIGEgd2lkdGggc3R5bGUgb24gdGhlXG4gICAgICAgIC8vIFNWRyByb290LCBhbmQgdGhlIHRpdGxlIGxhbmRzIG9uIHRoZSA8ZmlndXJlPi5cbiAgICAgICAgY29uc3QgcmV0ID0gaW5saW5lTW9kZVxuICAgICAgICAgICAgPyBgXG4gICAgICAgIDxmaWd1cmUgJHtUaWR9ICR7VGNsYXp6fSAke1R0aXRsZX0+XG4gICAgICAgICR7YWRhcHRJbmxpbmVTdmcoc3ZnLFxuICAgICAgICAgICAgdHlwZW9mIHdpZHRoID09PSAnbnVtYmVyJyA/IHdpZHRoIDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgdHlwZW9mIGFsdCA9PT0gJ3N0cmluZycgPyBhbHQgOiB1bmRlZmluZWQpfVxuICAgICAgICAke2NhcH1cbiAgICAgICAgPC9maWd1cmU+XG4gICAgICAgIGBcbiAgICAgICAgICAgIDogYFxuICAgICAgICA8ZmlndXJlICR7VGlkfSAke1RjbGF6en0+XG4gICAgICAgIDxpbWcgc3JjPVwiJHtlbmNvZGUob3V0cHV0Rk4pfVwiICR7VGFsdH0gJHtUdGl0bGV9ICR7VHdpZHRofS8+XG4gICAgICAgICR7Y2FwfVxuICAgICAgICA8L2ZpZ3VyZT5cbiAgICAgICAgYDtcbiAgICAgICAgLy8gY29uc29sZS5sb2coYE1lcm1haWRMb2NhbCByZXR1cm5pbmcgYCwge1xuICAgICAgICAvLyAgICAgaWQ6IGlkLFxuICAgICAgICAvLyAgICAgVGlkOiBUaWQsXG4gICAgICAgIC8vICAgICBpbnB1dEZpbGU6IGluZixcbiAgICAgICAgLy8gICAgIG91dHB1dEZOOiBvdXRwdXRGTixcbiAgICAgICAgLy8gICAgIHJldDogcmV0XG4gICAgICAgIC8vIH0pO1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhgTWVybWFpZExvY2FsIHJldHVybmluZyAke3JldH1gKTtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG59XG4iXX0=