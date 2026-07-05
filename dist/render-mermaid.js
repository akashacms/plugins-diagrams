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
 * The alt text, when given, becomes an aria-label; the SVG is
 * marked role="img" for accessibility either way.
 */
export function adaptInlineSvg(svg, width, alt) {
    return svg.replace(/^<svg([^>]*)>/, (_m, attrs) => {
        const naturalWidth = attrs.match(/\swidth="([^"]*)"/)?.[1];
        let adjusted = attrs
            .replace(/\swidth="[^"]*"/, '')
            .replace(/\sheight="[^"]*"/, '');
        let extra = '';
        if (typeof width === 'number') {
            extra += ` style="width: ${width}px"`;
        }
        else if (naturalWidth) {
            extra += ` style="max-width: ${naturalWidth}px"`;
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuZGVyLW1lcm1haWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9saWIvcmVuZGVyLW1lcm1haWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxFQUFFLEVBQUUsRUFBRSxRQUFRLElBQUksR0FBRyxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBQzlDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDdkMsT0FBTyxFQUFFLFNBQVMsRUFBRSxtQkFBbUIsRUFBRSxZQUFZLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUVyRixpRUFBaUU7QUFDakUsMERBQTBEO0FBRTFELElBQUkscUJBQXFCLEdBQUcsS0FBSyxDQUFDO0FBRWxDLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztBQUU1Qzs7Ozs7R0FLRztBQUNILE1BQU0sVUFBVSxvQkFBb0IsQ0FBQyxPQUFpQjtJQUNsRCxLQUFLLE1BQU0sTUFBTSxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQzNCLElBQUksaUJBQWlCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQztZQUFFLFNBQVM7UUFDNUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUN0QyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUNELHFCQUFxQixHQUFHLElBQUksQ0FBQztBQUNqQyxDQUFDO0FBRUQ7Ozs7O0dBS0c7QUFDSCxNQUFNLFVBQVUsbUJBQW1CO0lBQy9CLElBQUkscUJBQXFCO1FBQUUsT0FBTztJQUNsQyxxQkFBcUIsR0FBRyxJQUFJLENBQUM7SUFDN0IsTUFBTSxVQUFVLEdBQUc7UUFDZixpREFBaUQ7UUFDakQsaUVBQWlFO1FBQ2pFLHFDQUFxQztRQUNyQyxxQ0FBcUM7UUFDckMsK0JBQStCO0tBQ2xDLENBQUM7SUFDRixLQUFLLE1BQU0sTUFBTSxJQUFJLFVBQVUsRUFBRSxDQUFDO1FBQzlCLElBQUksQ0FBQztZQUNELFlBQVksQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDdEMsT0FBTztRQUNYLENBQUM7UUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1lBQ1gsMEJBQTBCO1FBQzlCLENBQUM7SUFDTCxDQUFDO0FBQ0wsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLGdCQUFnQixDQUM1QixJQUFZLEVBQ1osVUFBbUIsRUFDbkIsV0FBb0I7SUFFcEIsbUJBQW1CLEVBQUUsQ0FBQztJQUN0QixPQUFPLENBQUMsVUFBVSxJQUFJLFdBQVcsQ0FBQztRQUM5QixDQUFDLENBQUMsbUJBQW1CLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRSxXQUFXLENBQUM7UUFDcEQsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMxQixDQUFDO0FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7R0FnQkc7QUFDSCxNQUFNLFVBQVUsY0FBYyxDQUMxQixHQUFXLEVBQUUsS0FBYyxFQUFFLEdBQVk7SUFFekMsT0FBTyxHQUFHLENBQUMsT0FBTyxDQUFDLGVBQWUsRUFBRSxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsRUFBRTtRQUM5QyxNQUFNLFlBQVksR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzRCxJQUFJLFFBQVEsR0FBRyxLQUFLO2FBQ2YsT0FBTyxDQUFDLGlCQUFpQixFQUFFLEVBQUUsQ0FBQzthQUM5QixPQUFPLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDckMsSUFBSSxLQUFLLEdBQUcsRUFBRSxDQUFDO1FBQ2YsSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUM1QixLQUFLLElBQUksa0JBQWtCLEtBQUssS0FBSyxDQUFDO1FBQzFDLENBQUM7YUFBTSxJQUFJLFlBQVksRUFBRSxDQUFDO1lBQ3RCLEtBQUssSUFBSSxzQkFBc0IsWUFBWSxLQUFLLENBQUM7UUFDckQsQ0FBQztRQUNELEtBQUssSUFBSSxhQUFhLENBQUM7UUFDdkIsSUFBSSxPQUFPLEdBQUcsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUMxQixLQUFLLElBQUksZ0JBQWdCLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDO1FBQzVDLENBQUM7UUFDRCxPQUFPLE9BQU8sUUFBUSxHQUFHLEtBQUssR0FBRyxDQUFDO0lBQ3RDLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQztBQWdDRCxNQUFNLENBQUMsS0FBSyxVQUFVLFNBQVMsQ0FDM0IsT0FBNkI7SUFFN0IsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUM7V0FDOUIsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUM3QixDQUFDO1FBQ0Msb0JBQW9CLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFFRCxNQUFNLEdBQUcsR0FBRyxnQkFBZ0IsQ0FDeEIsT0FBTyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUUzRCxNQUFNLEdBQUcsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDeEQsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIlxuaW1wb3J0IGZzLCB7IHByb21pc2VzIGFzIGZzcCB9IGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHsgZW5jb2RlIH0gZnJvbSAnaHRtbC1lbnRpdGllcyc7XG5pbXBvcnQgeyByZW5kZXJTdmcsIHJlbmRlclN2Z1dpdGhDb25maWcsIHJlZ2lzdGVyRm9udCB9IGZyb20gJ21lcm1haWQtd2FzbS1yZW5kZXJlcic7XG5cbi8vIFRoZSBXQVNNIHJlbmRlcmVyIGNhbm5vdCBzZWUgdGhlIGZpbGVzeXN0ZW0sIHNvIGZvciBleGFjdCB0ZXh0XG4vLyBtZWFzdXJlbWVudCBmb250cyBhcmUgcmVhZCBoZXJlIGFuZCBwYXNzZWQgaW4gYXMgYnl0ZXMuXG5cbmxldCBtZXJtYWlkRm9udFJlZ2lzdGVyZWQgPSBmYWxzZTtcblxuY29uc3QgcmVnaXN0ZXJlZEZvbnRGTnMgPSBuZXcgU2V0PHN0cmluZz4oKTtcblxuLyoqXG4gKiBSZWdpc3RlciB0aGUgbmFtZWQgVFRGL09URiBmb250IGZpbGVzIGZvciB0ZXh0IG1lYXN1cmVtZW50LlxuICogU3VwcHJlc3NlcyB0aGUgYXV0b21hdGljIHN5c3RlbSBmb250IHJlZ2lzdHJhdGlvbiAtIHRoZVxuICogdXNlci1zdXBwbGllZCBmb250cyB0YWtlIHByaW9yaXR5LiAgRWFjaCBmaWxlIGlzIHJlZ2lzdGVyZWRcbiAqIGF0IG1vc3Qgb25jZSwgc28gdGhpcyBpcyBzYWZlIHRvIGNhbGwgZm9yIGV2ZXJ5IHJlbmRlci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyTWVybWFpZEZvbnRzKGZvbnRGTnM6IHN0cmluZ1tdKSB7XG4gICAgZm9yIChjb25zdCBmb250Rk4gb2YgZm9udEZOcykge1xuICAgICAgICBpZiAocmVnaXN0ZXJlZEZvbnRGTnMuaGFzKGZvbnRGTikpIGNvbnRpbnVlO1xuICAgICAgICByZWdpc3RlckZvbnQoZnMucmVhZEZpbGVTeW5jKGZvbnRGTikpO1xuICAgICAgICByZWdpc3RlcmVkRm9udEZOcy5hZGQoZm9udEZOKTtcbiAgICB9XG4gICAgbWVybWFpZEZvbnRSZWdpc3RlcmVkID0gdHJ1ZTtcbn1cblxuLyoqXG4gKiBSZWdpc3RlciBhIGNvbW1vbiBzeXN0ZW0gZm9udCwgaWYgb25lIGlzIGZvdW5kLiAgSWYgbm9uZSBvZlxuICogdGhlIGNhbmRpZGF0ZXMgZXhpc3QsIHRoZSByZW5kZXJlciB1c2VzIGNhbGlicmF0ZWQgZmFsbGJhY2tcbiAqIG1ldHJpY3MuICBSdW5zIGF0IG1vc3Qgb25jZTsgZG9lcyBub3RoaW5nIGlmIGZvbnRzIHdlcmVcbiAqIGFscmVhZHkgcmVnaXN0ZXJlZCB3aXRoIHJlZ2lzdGVyTWVybWFpZEZvbnRzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVnaXN0ZXJNZXJtYWlkRm9udCgpIHtcbiAgICBpZiAobWVybWFpZEZvbnRSZWdpc3RlcmVkKSByZXR1cm47XG4gICAgbWVybWFpZEZvbnRSZWdpc3RlcmVkID0gdHJ1ZTtcbiAgICBjb25zdCBjYW5kaWRhdGVzID0gW1xuICAgICAgICAnL3Vzci9zaGFyZS9mb250cy90cnVldHlwZS9kZWphdnUvRGVqYVZ1U2Fucy50dGYnLFxuICAgICAgICAnL3Vzci9zaGFyZS9mb250cy90cnVldHlwZS9saWJlcmF0aW9uL0xpYmVyYXRpb25TYW5zLVJlZ3VsYXIudHRmJyxcbiAgICAgICAgJy91c3Ivc2hhcmUvZm9udHMvVFRGL0RlamFWdVNhbnMudHRmJyxcbiAgICAgICAgJy9TeXN0ZW0vTGlicmFyeS9Gb250cy9IZWx2ZXRpY2EudHRjJyxcbiAgICAgICAgJ0M6XFxcXFdpbmRvd3NcXFxcRm9udHNcXFxcYXJpYWwudHRmJyxcbiAgICBdO1xuICAgIGZvciAoY29uc3QgZm9udEZOIG9mIGNhbmRpZGF0ZXMpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJlZ2lzdGVyRm9udChmcy5yZWFkRmlsZVN5bmMoZm9udEZOKSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgLy8gVHJ5IHRoZSBuZXh0IGNhbmRpZGF0ZS5cbiAgICAgICAgfVxuICAgIH1cbn1cblxuLyoqXG4gKiBSZW5kZXIgTWVybWFpZCBkaWFncmFtIHRleHQgdG8gYW4gU1ZHIHN0cmluZy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlck1lcm1haWRTdmcoXG4gICAgY29kZTogc3RyaW5nLFxuICAgIGNvbmZpZ0pTT04/OiBzdHJpbmcsXG4gICAgdGhlbWVQcmVzZXQ/OiBzdHJpbmdcbik6IHN0cmluZyB7XG4gICAgcmVnaXN0ZXJNZXJtYWlkRm9udCgpO1xuICAgIHJldHVybiAoY29uZmlnSlNPTiB8fCB0aGVtZVByZXNldClcbiAgICAgICAgPyByZW5kZXJTdmdXaXRoQ29uZmlnKGNvZGUsIGNvbmZpZ0pTT04sIHRoZW1lUHJlc2V0KVxuICAgICAgICA6IHJlbmRlclN2Zyhjb2RlKTtcbn1cblxuLyoqXG4gKiBBZGp1c3QgdGhlIHJvb3QgZWxlbWVudCBvZiBhIHJlbmRlcmVkIFNWRyBmb3IgaW5saW5lIGVtYmVkZGluZ1xuICogaW4gYSB3ZWIgcGFnZS5cbiAqXG4gKiBUaGUgcmVuZGVyZXIgZW1pdHMgZml4ZWQgcGl4ZWwgd2lkdGg9IGFuZCBoZWlnaHQ9IGF0dHJpYnV0ZXMsXG4gKiB3aGljaCBvdmVyZmxvdyBuYXJyb3cgY29udGFpbmVycy4gIFRob3NlIGF0dHJpYnV0ZXMgYXJlIHJlbW92ZWRcbiAqICh0aGUgdmlld0JveCBwcmVzZXJ2ZXMgdGhlIGFzcGVjdCByYXRpbykgYW5kIHJlcGxhY2VkIHdpdGggYVxuICogbWF4LXdpZHRoIHN0eWxlIGhvbGRpbmcgdGhlIGRpYWdyYW0ncyBuYXR1cmFsIHdpZHRoLCBzbyB0aGF0XG4gKiBzdHlsZXNoZWV0IHJ1bGVzIGxpa2UgYHdpZHRoOiAxMDAlOyBoZWlnaHQ6IGF1dG9gIGNvbnN0cmFpbiB0aGVcbiAqIGRpYWdyYW0gdG8gaXRzIGNvbnRhaW5lciB3aXRob3V0IHVwc2NhbGluZyBzbWFsbCBkaWFncmFtcy5cbiAqXG4gKiBXaGVuIGFuIGV4cGxpY2l0IHdpZHRoIGlzIGdpdmVuLCBpdCBiZWNvbWVzIGEgd2lkdGggc3R5bGVcbiAqIGluc3RlYWQsIG92ZXJyaWRpbmcgYW55IHN0eWxlc2hlZXQgc2l6aW5nLlxuICpcbiAqIFRoZSBhbHQgdGV4dCwgd2hlbiBnaXZlbiwgYmVjb21lcyBhbiBhcmlhLWxhYmVsOyB0aGUgU1ZHIGlzXG4gKiBtYXJrZWQgcm9sZT1cImltZ1wiIGZvciBhY2Nlc3NpYmlsaXR5IGVpdGhlciB3YXkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhZGFwdElubGluZVN2ZyhcbiAgICBzdmc6IHN0cmluZywgd2lkdGg/OiBudW1iZXIsIGFsdD86IHN0cmluZ1xuKTogc3RyaW5nIHtcbiAgICByZXR1cm4gc3ZnLnJlcGxhY2UoL148c3ZnKFtePl0qKT4vLCAoX20sIGF0dHJzKSA9PiB7XG4gICAgICAgIGNvbnN0IG5hdHVyYWxXaWR0aCA9IGF0dHJzLm1hdGNoKC9cXHN3aWR0aD1cIihbXlwiXSopXCIvKT8uWzFdO1xuICAgICAgICBsZXQgYWRqdXN0ZWQgPSBhdHRyc1xuICAgICAgICAgICAgLnJlcGxhY2UoL1xcc3dpZHRoPVwiW15cIl0qXCIvLCAnJylcbiAgICAgICAgICAgIC5yZXBsYWNlKC9cXHNoZWlnaHQ9XCJbXlwiXSpcIi8sICcnKTtcbiAgICAgICAgbGV0IGV4dHJhID0gJyc7XG4gICAgICAgIGlmICh0eXBlb2Ygd2lkdGggPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICBleHRyYSArPSBgIHN0eWxlPVwid2lkdGg6ICR7d2lkdGh9cHhcImA7XG4gICAgICAgIH0gZWxzZSBpZiAobmF0dXJhbFdpZHRoKSB7XG4gICAgICAgICAgICBleHRyYSArPSBgIHN0eWxlPVwibWF4LXdpZHRoOiAke25hdHVyYWxXaWR0aH1weFwiYDtcbiAgICAgICAgfVxuICAgICAgICBleHRyYSArPSAnIHJvbGU9XCJpbWdcIic7XG4gICAgICAgIGlmICh0eXBlb2YgYWx0ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgZXh0cmEgKz0gYCBhcmlhLWxhYmVsPVwiJHtlbmNvZGUoYWx0KX1cImA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGA8c3ZnJHthZGp1c3RlZH0ke2V4dHJhfT5gO1xuICAgIH0pO1xufVxuXG5leHBvcnQgdHlwZSBNZXJtYWlkUmVuZGVyT3B0aW9ucyA9IHtcbiAgICAvKipcbiAgICAgKiBNZXJtYWlkIGRpYWdyYW0gdGV4dCB0byByZW5kZXJcbiAgICAgKi9cbiAgICBjb2RlOiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBGaWxlIHRvIHdyaXRlIHRoZSBTVkcgaW50b1xuICAgICAqL1xuICAgIG91dHB1dEZOOiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBKU09OIGNvbmZpZ3VyYXRpb24gc3RyaW5nIHVzaW5nIHRoZSBzYW1lIHNjaGVtYSBhcyB0aGVcbiAgICAgKiBtbWRyIC0tY29uZmlnIGZpbGUgKHRoZW1lLCB0aGVtZVZhcmlhYmxlcywgZmxvd2NoYXJ0LCAuLi4pXG4gICAgICovXG4gICAgY29uZmlnSlNPTj86IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIFRoZW1lIHByZXNldCBuYW1lOiBkZWZhdWx0LCBkYXJrLCBmb3Jlc3QsIG5ldXRyYWwsIG1vZGVybi5cbiAgICAgKiBUYWtlcyBwcmVjZWRlbmNlIG92ZXIgdGhlIGNvbmZpZydzIHRoZW1lIG5hbWUuXG4gICAgICovXG4gICAgdGhlbWVQcmVzZXQ/OiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBUVEYvT1RGIGZvbnQgZmlsZXMgdG8gcmVnaXN0ZXIgZm9yIHRleHQgbWVhc3VyZW1lbnQuXG4gICAgICogV2hlbiBvbWl0dGVkLCBhIGNvbW1vbiBzeXN0ZW0gZm9udCBpcyB1c2VkIGlmIGZvdW5kLlxuICAgICAqL1xuICAgIGZvbnRGTnM/OiBzdHJpbmdbXTtcbn07XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkb01lcm1haWQoXG4gICAgb3B0aW9uczogTWVybWFpZFJlbmRlck9wdGlvbnNcbik6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmIChBcnJheS5pc0FycmF5KG9wdGlvbnMuZm9udEZOcylcbiAgICAgJiYgb3B0aW9ucy5mb250Rk5zLmxlbmd0aCA+PSAxXG4gICAgKSB7XG4gICAgICAgIHJlZ2lzdGVyTWVybWFpZEZvbnRzKG9wdGlvbnMuZm9udEZOcyk7XG4gICAgfVxuXG4gICAgY29uc3Qgc3ZnID0gcmVuZGVyTWVybWFpZFN2ZyhcbiAgICAgICAgb3B0aW9ucy5jb2RlLCBvcHRpb25zLmNvbmZpZ0pTT04sIG9wdGlvbnMudGhlbWVQcmVzZXQpO1xuXG4gICAgYXdhaXQgZnNwLndyaXRlRmlsZShvcHRpb25zLm91dHB1dEZOLCBzdmcsICd1dGYtOCcpO1xufVxuIl19