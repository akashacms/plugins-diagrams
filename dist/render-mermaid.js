import fs, { promises as fsp } from 'node:fs';
import { encode } from 'html-entities';
import { renderSvg, renderSvgWithConfig, registerFont } from 'mermaid-wasm-renderer';
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuZGVyLW1lcm1haWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9saWIvcmVuZGVyLW1lcm1haWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxFQUFFLEVBQUUsRUFBRSxRQUFRLElBQUksR0FBRyxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBQzlDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDdkMsT0FBTyxFQUFFLFNBQVMsRUFBRSxtQkFBbUIsRUFBRSxZQUFZLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUVyRixpRUFBaUU7QUFDakUsMERBQTBEO0FBRTFELElBQUkscUJBQXFCLEdBQUcsS0FBSyxDQUFDO0FBRWxDLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztBQUU1Qzs7Ozs7R0FLRztBQUNILE1BQU0sVUFBVSxvQkFBb0IsQ0FBQyxPQUFpQjtJQUNsRCxLQUFLLE1BQU0sTUFBTSxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQzNCLElBQUksaUJBQWlCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQztZQUFFLFNBQVM7UUFDNUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUN0QyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUNELHFCQUFxQixHQUFHLElBQUksQ0FBQztBQUNqQyxDQUFDO0FBRUQ7Ozs7O0dBS0c7QUFDSCxNQUFNLFVBQVUsbUJBQW1CO0lBQy9CLElBQUkscUJBQXFCO1FBQUUsT0FBTztJQUNsQyxxQkFBcUIsR0FBRyxJQUFJLENBQUM7SUFDN0IsTUFBTSxVQUFVLEdBQUc7UUFDZixpREFBaUQ7UUFDakQsaUVBQWlFO1FBQ2pFLHFDQUFxQztRQUNyQyxxQ0FBcUM7UUFDckMsK0JBQStCO0tBQ2xDLENBQUM7SUFDRixLQUFLLE1BQU0sTUFBTSxJQUFJLFVBQVUsRUFBRSxD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QUFDLEVBQzdCLENBQUM7UUFDQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDMUMsQ0FBQztJQUVELE1BQU0sR0FBRyxHQUFHLGdCQUFnQixDQUN4QixPQUFPLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBRTNELE1BQU0sR0FBRyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztBQUN4RCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiXG5pbXBvcnQgZnMsIHsgcHJvbWlzZXMgYXMgZnNwIH0gZnJvbSAnbm9kZTpmcyc7XG5pbXBvcnQgeyBlbmNvZGUgfSBmcm9tICdodG1sLWVudGl0aWVzJztcbmltcG9ydCB7IHJlbmRlclN2ZywgcmVuZGVyU3ZnV2l0aENvbmZpZywgcmVnaXN0ZXJGb250IH0gZnJvbSAnbWVybWFpZC13YXNtLXJlbmRlcmVyJztcblxuLy8gVGhlIFdBU00gcmVuZGVyZXIgY2Fubm90IHNlZSB0aGUgZmlsZXN5c3RlbSwgc28gZm9yIGV4YWN0IHRleHRcbi8vIG1lYXN1cmVtZW50IGZvbnRzIGFyZSByZWFkIGhlcmUgYW5kIHBhc3NlZCBpbiBhcyBieXRlcy5cblxubGV0IG1lcm1haWRGb250UmVnaXN0ZXJlZCA9IGZhbHNlO1xuXG5jb25zdCByZWdpc3RlcmVkRm9udEZOcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4vKipcbiAqIFJlZ2lzdGVyIHRoZSBuYW1lZCBUVEYvT1RGIGZvbnQgZmlsZXMgZm9yIHRleHQgbWVhc3VyZW1lbnQuXG4gKiBTdXBwcmVzc2VzIHRoZSBhdXRvbWF0aWMgc3lzdGVtIGZvbnQgcmVnaXN0cmF0aW9uIC0gdGhlXG4gKiB1c2VyLXN1cHBsaWVkIGZvbnRzIHRha2UgcHJpb3JpdHkuICBFYWNoIGZpbGUgaXMgcmVnaXN0ZXJlZFxuICogYXQgbW9zdCBvbmNlLCBzbyB0aGlzIGlzIHNhZmUgdG8gY2FsbCBmb3IgZXZlcnkgcmVuZGVyLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVnaXN0ZXJNZXJtYWlkRm9udHMoZm9udEZOczogc3RyaW5nW10pIHtcbiAgICBmb3IgKGNvbnN0IGZvbnRGTiBvZiBmb250Rk5zKSB7XG4gICAgICAgIGlmIChyZWdpc3RlcmVkRm9udEZOcy5oYXMoZm9udEZOKSkgY29udGludWU7XG4gICAgICAgIHJlZ2lzdGVyRm9udChmcy5yZWFkRmlsZVN5bmMoZm9udEZOKSk7XG4gICAgICAgIHJlZ2lzdGVyZWRGb250Rk5zLmFkZChmb250Rk4pO1xuICAgIH1cbiAgICBtZXJtYWlkRm9udFJlZ2lzdGVyZWQgPSB0cnVlO1xufVxuXG4vKipcbiAqIFJlZ2lzdGVyIGEgY29tbW9uIHN5c3RlbSBmb250LCBpZiBvbmUgaXMgZm91bmQuICBJZiBub25lIG9mXG4gKiB0aGUgY2FuZGlkYXRlcyBleGlzdCwgdGhlIHJlbmRlcmVyIHVzZXMgY2FsaWJyYXRlZCBmYWxsYmFja1xuICogbWV0cmljcy4gIFJ1bnMgYXQgbW9zdCBvbmNlOyBkb2VzIG5vdGhpbmcgaWYgZm9udHMgd2VyZVxuICogYWxyZWFkeSByZWdpc3RlcmVkIHdpdGggcmVnaXN0ZXJNZXJtYWlkRm9udHMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWdpc3Rlck1lcm1haWRGb250KCkge1xuICAgIGlmIChtZXJtYWlkRm9udFJlZ2lzdGVyZWQpIHJldHVybjtcbiAgICBtZXJtYWlkRm9udFJlZ2lzdGVyZWQgPSB0cnVlO1xuICAgIGNvbnN0IGNhbmRpZGF0ZXMgPSBbXG4gICAgICAgICcvdXNyL3NoYXJlL2ZvbnRzL3RydWV0eXBlL2RlamF2dS9EZWphVnVTYW5zLnR0ZicsXG4gICAgICAgICcvdXNyL3NoYXJlL2ZvbnRzL3RydWV0eXBlL2xpYmVyYXRpb24vTGliZXJhdGlvblNhbnMtUmVndWxhci50dGYnLFxuICAgICAgICAnL3Vzci9zaGFyZS9mb250cy9UVEYvRGVqYVZ1U2Fucy50dGYnLFxuICAgICAgICAnL1N5c3RlbS9MaWJyYXJ5L0ZvbnRzL0hlbHZldGljYS50dGMnLFxuICAgICAgICAnQzpcXFxcV2luZG93c1xcXFxGb250c1xcXFxhcmlhbC50dGYnLFxuICAgIF07XG4gICAgZm9yIChjb25zdCBmb250Rk4gb2YgY2FuZGlkYXRlcykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmVnaXN0ZXJGb250KGZzLnJlYWRGaWxlU3luYyhmb250Rk4pKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAvLyBUcnkgdGhlIG5leHQgY2FuZGlkYXRlLlxuICAgICAgICB9XG4gICAgfVxufVxuXG4vKipcbiAqIFJlbmRlciBNZXJtYWlkIGRpYWdyYW0gdGV4dCB0byBhbiBTVkcgc3RyaW5nLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyTWVybWFpZFN2ZyhcbiAgICBjb2RlOiBzdHJpbmcsXG4gICAgY29uZmlnSlNPTj86IHN0cmluZyxcbiAgICB0aGVtZVByZXNldD86IHN0cmluZ1xuKTogc3RyaW5nIHtcbiAgICByZWdpc3Rlck1lcm1haWRGb250KCk7XG4gICAgcmV0dXJuIChjb25maWdKU09OIHx8IHRoZW1lUHJlc2V0KVxuICAgICAgICA/IHJlbmRlclN2Z1dpdGhDb25maWcoY29kZSwgY29uZmlnSlNPTiwgdGhlbWVQcmVzZXQpXG4gICAgICAgIDogcmVuZGVyU3ZnKGNvZGUpO1xufVxuXG4vKipcbiAqIEFkanVzdCB0aGUgcm9vdCBlbGVtZW50IG9mIGEgcmVuZGVyZWQgU1ZHIGZvciBpbmxpbmUgZW1iZWRkaW5nXG4gKiBpbiBhIHdlYiBwYWdlLlxuICpcbiAqIFRoZSByZW5kZXJlciBlbWl0cyBmaXhlZCBwaXhlbCB3aWR0aD0gYW5kIGhlaWdodD0gYXR0cmlidXRlcyxcbiAqIHdoaWNoIG92ZXJmbG93IG5hcnJvdyBjb250YWluZXJzLiAgVGhvc2UgYXR0cmlidXRlcyBhcmUgcmVtb3ZlZFxuICogKHRoZSB2aWV3Qm94IHByZXNlcnZlcyB0aGUgYXNwZWN0IHJhdGlvKSBhbmQgcmVwbGFjZWQgd2l0aCBhXG4gKiBtYXgtd2lkdGggc3R5bGUgaG9sZGluZyB0aGUgZGlhZ3JhbSdzIG5hdHVyYWwgd2lkdGgsIHNvIHRoYXRcbiAqIHN0eWxlc2hlZXQgcnVsZXMgbGlrZSBgd2lkdGg6IDEwMCU7IGhlaWdodDogYXV0b2AgY29uc3RyYWluIHRoZVxuICogZGlhZ3JhbSB0byBpdHMgY29udGFpbmVyIHdpdGhvdXQgdXBzY2FsaW5nIHNtYWxsIGRpYWdyYW1zLlxuICpcbiAqIFdoZW4gYW4gZXhwbGljaXQgd2lkdGggaXMgZ2l2ZW4sIGl0IGJlY29tZXMgYSB3aWR0aCBzdHlsZVxuICogaW5zdGVhZCwgb3ZlcnJpZGluZyBhbnkgc3R5bGVzaGVldCBzaXppbmcuXG4gKlxuICogQW4gZXhpc3Rpbmcgc3R5bGUgYXR0cmlidXRlIG9uIHRoZSBTVkcgcm9vdCAoUGxhbnRVTUwgZW1pdHNcbiAqIG9uZSBjYXJyeWluZyB3aWR0aCwgaGVpZ2h0LCBhbmQgYmFja2dyb3VuZCkgaXMgbWVyZ2VkOiBpdHNcbiAqIHdpZHRoIGFuZCBoZWlnaHQgZGVjbGFyYXRpb25zIGFyZSBzdXBlcnNlZGVkIGJ5IHRoZSBzaXppbmdcbiAqIGNvbXB1dGVkIGhlcmUsIHdoaWxlIG90aGVyIGRlY2xhcmF0aW9ucyBzdWNoIGFzIGJhY2tncm91bmRcbiAqIHN1cnZpdmUuXG4gKlxuICogVGhlIGFsdCB0ZXh0LCB3aGVuIGdpdmVuLCBiZWNvbWVzIGFuIGFyaWEtbGFiZWw7IHRoZSBTVkcgaXNcbiAqIG1hcmtlZCByb2xlPVwiaW1nXCIgZm9yIGFjY2Vzc2liaWxpdHkgZWl0aGVyIHdheS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFkYXB0SW5saW5lU3ZnKFxuICAgIHN2Zzogc3RyaW5nLCB3aWR0aD86IG51bWJlciwgYWx0Pzogc3RyaW5nXG4pOiBzdHJpbmcge1xuICAgIHJldHVybiBzdmcucmVwbGFjZSgvPHN2ZyhbXj5dKik+LywgKF9tLCBhdHRycykgPT4ge1xuICAgICAgICAvLyBUaGUgd2lkdGggYXR0cmlidXRlIG1heSBjYXJyeSBhIHVuaXQgc3VmZml4LFxuICAgICAgICAvLyBzdWNoIGFzIFBsYW50VU1MJ3Mgd2lkdGg9XCIxMjNweFwiLlxuICAgICAgICBjb25zdCBuYXR1cmFsV2lkdGggPSBOdW1iZXIucGFyc2VGbG9hdChcbiAgICAgICAgICAgIGF0dHJzLm1hdGNoKC9cXHN3aWR0aD1cIihbXlwiXSopXCIvKT8uWzFdKTtcbiAgICAgICAgY29uc3Qgc3R5bGUgPSAoYXR0cnMubWF0Y2goL1xcc3N0eWxlPVwiKFteXCJdKilcIi8pPy5bMV0gPz8gJycpXG4gICAgICAgICAgICAuc3BsaXQoJzsnKVxuICAgICAgICAgICAgLm1hcChkZWNsID0+IGRlY2wudHJpbSgpKVxuICAgICAgICAgICAgLmZpbHRlcihkZWNsID0+IGRlY2wubGVuZ3RoID49IDFcbiAgICAgICAgICAgICAgICAmJiAhL14od2lkdGh8aGVpZ2h0KVxccyo6Ly50ZXN0KGRlY2wpKTtcbiAgICAgICAgbGV0IGFkanVzdGVkID0gYXR0cnNcbiAgICAgICAgICAgIC5yZXBsYWNlKC9cXHN3aWR0aD1cIlteXCJdKlwiLywgJycpXG4gICAgICAgICAgICAucmVwbGFjZSgvXFxzaGVpZ2h0PVwiW15cIl0qXCIvLCAnJylcbiAgICAgICAgICAgIC5yZXBsYWNlKC9cXHNzdHlsZT1cIlteXCJdKlwiLywgJycpO1xuICAgICAgICBpZiAodHlwZW9mIHdpZHRoID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgc3R5bGUucHVzaChgd2lkdGg6ICR7d2lkdGh9cHhgKTtcbiAgICAgICAgfSBlbHNlIGlmICghTnVtYmVyLmlzTmFOKG5hdHVyYWxXaWR0aCkpIHtcbiAgICAgICAgICAgIHN0eWxlLnB1c2goYG1heC13aWR0aDogJHtuYXR1cmFsV2lkdGh9cHhgKTtcbiAgICAgICAgfVxuICAgICAgICBsZXQgZXh0cmEgPSBzdHlsZS5sZW5ndGggPj0gMVxuICAgICAgICAgICAgPyBgIHN0eWxlPVwiJHtzdHlsZS5qb2luKCc7ICcpfVwiYFxuICAgICAgICAgICAgOiAnJztcbiAgICAgICAgZXh0cmEgKz0gJyByb2xlPVwiaW1nXCInO1xuICAgICAgICBpZiAodHlwZW9mIGFsdCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIGV4dHJhICs9IGAgYXJpYS1sYWJlbD1cIiR7ZW5jb2RlKGFsdCl9XCJgO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBgPHN2ZyR7YWRqdXN0ZWR9JHtleHRyYX0+YDtcbiAgICB9KTtcbn1cblxuZXhwb3J0IHR5cGUgTWVybWFpZFJlbmRlck9wdGlvbnMgPSB7XG4gICAgLyoqXG4gICAgICogTWVybWFpZCBkaWFncmFtIHRleHQgdG8gcmVuZGVyXG4gICAgICovXG4gICAgY29kZTogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogRmlsZSB0byB3cml0ZSB0aGUgU1ZHIGludG9cbiAgICAgKi9cbiAgICBvdXRwdXRGTjogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogSlNPTiBjb25maWd1cmF0aW9uIHN0cmluZyB1c2luZyB0aGUgc2FtZSBzY2hlbWEgYXMgdGhlXG4gICAgICogbW1kciAtLWNvbmZpZyBmaWxlICh0aGVtZSwgdGhlbWVWYXJpYWJsZXMsIGZsb3djaGFydCwgLi4uKVxuICAgICAqL1xuICAgIGNvbmZpZ0pTT04/OiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBUaGVtZSBwcmVzZXQgbmFtZTogZGVmYXVsdCwgZGFyaywgZm9yZXN0LCBuZXV0cmFsLCBtb2Rlcm4uXG4gICAgICogVGFrZXMgcHJlY2VkZW5jZSBvdmVyIHRoZSBjb25maWcncyB0aGVtZSBuYW1lLlxuICAgICAqL1xuICAgIHRoZW1lUHJlc2V0Pzogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogVFRGL09URiBmb250IGZpbGVzIHRvIHJlZ2lzdGVyIGZvciB0ZXh0IG1lYXN1cmVtZW50LlxuICAgICAqIFdoZW4gb21pdHRlZCwgYSBjb21tb24gc3lzdGVtIGZvbnQgaXMgdXNlZCBpZiBmb3VuZC5cbiAgICAgKi9cbiAgICBmb250Rk5zPzogc3RyaW5nW107XG59O1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZG9NZXJtYWlkKFxuICAgIG9wdGlvbnM6IE1lcm1haWRSZW5kZXJPcHRpb25zXG4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShvcHRpb25zLmZvbnRGTnMpXG4gICAgICYmIG9wdGlvbnMuZm9udEZOcy5sZW5ndGggPj0gMVxuICAgICkge1xuICAgICAgICByZWdpc3Rlck1lcm1haWRGb250cyhvcHRpb25zLmZvbnRGTnMpO1xuICAgIH1cblxuICAgIGNvbnN0IHN2ZyA9IHJlbmRlck1lcm1haWRTdmcoXG4gICAgICAgIG9wdGlvbnMuY29kZSwgb3B0aW9ucy5jb25maWdKU09OLCBvcHRpb25zLnRoZW1lUHJlc2V0KTtcblxuICAgIGF3YWl0IGZzcC53cml0ZUZpbGUob3B0aW9ucy5vdXRwdXRGTiwgc3ZnLCAndXRmLTgnKTtcbn1cbiJdfQ==