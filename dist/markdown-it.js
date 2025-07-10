import path from 'node:path';
import fs from 'node:fs';
import Murmur from './murmurhash3_gc.js';
/**
 * Add Mermaid support to Markdown-IT such that ```mermaid .. ``` will
 * in turn call the Mermaid CLI function `run` to render the Mermaid document.
 *
 * @param md
 * @param opts
 */
export function MarkdownITMermaidPlugin(md, opts) {
    if (typeof opts !== 'object') {
        throw new Error(`Options object required`);
    }
    if (typeof opts.fspath !== 'string') {
        throw new Error(`fspath required`);
    }
    if (typeof opts.prefix !== 'string') {
        throw new Error(`prefix required`);
    }
    const fspath = opts.fspath;
    const prefix = opts.prefix;
    // opts = Object.assign(MermaidPlugInDefaultOptions, opts);
    const defaultRenderer = md.renderer.rules.fence.bind(md.renderer.rules);
    md.renderer.rules.fence = (tokens, idx, opts, env, self) => {
        const token = tokens[idx];
        const code = token.content.trim();
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
            // Markdown-IT rules functions like this are SYNCHRONOUS.
            // The fence rules handle the code block using
            // three backticks and a language identifier.
            // Hence, the token.info is the langauge tag, and
            // this function is triggered for mermaid code blocks.
            //
            // Because it is SYNCHRONOUS we cannot call
            // the Mermaid CLI 'run' function, which is
            // inherently asynchronous.
            //
            // Therefore, what we're left with is to generate
            // a custom tag thad will trigger a function capable
            // of asynchronously invoking runMermaid.
            //
            // We take the content of the code block, and
            // store it into a file.  Which means we must have
            // a place to put that file.
            //
            // That place MUST be a Documents directory so that
            // AkashaCMS code will see and render the document.
            //
            // To support that, there are two required options.
            //
            //  * fspath is the file-system path for a directory
            //  * prefix is the prefix to use for the generated file name
            //
            // For the custom tag to work, the `fspath` directory
            // must be mounted using config.addDocumentsDir.
            //
            const uniqueId = "render" + Murmur(code, 4242).toString();
            const mmdFileName = path.join(prefix, `${uniqueId}.mermaid`);
            const svgFileName = path.join(prefix, `${uniqueId}.png`
            // prefix, `${uniqueId}.svg`
            );
            fs.mkdirSync(path.join(fspath, path.dirname(mmdFileName)), {
                recursive: true
            });
            fs.writeFileSync(path.join(fspath, mmdFileName), code, 'utf8');
            const ret = `<diagrams-mermaid
                        caption="${title}"
                        input-file='${mmdFileName}'
                        output-file='${svgFileName}'/>
            `;
            // console.log(`MarkdownITMermaidPlugin ${code} ==> ${ret}`);
            return ret;
        }
        return defaultRenderer(tokens, idx, opts, env, self);
    };
}
// MermaidPlugInDefaultOptions = {
//     startOnLoad: false,
//     securityLevel: 'true',
//     theme: "default",
//     flowchart:{
//         htmlLabels: false,
//         useMaxWidth: true,
//     }
// };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd24taXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9saWIvbWFya2Rvd24taXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxJQUFJLE1BQU0sV0FBVyxDQUFDO0FBRTdCLE9BQU8sRUFBRSxNQUFRLFNBQVMsQ0FBQztBQUMzQixPQUFPLE1BQU0sTUFBTSxxQkFBcUIsQ0FBQztBQXNCekM7Ozs7OztHQU1HO0FBQ0gsTUFBTSxVQUFVLHVCQUF1QixDQUFDLEVBQUUsRUFBRSxJQUEwQjtJQUVsRSxJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQzNCLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBQ0QsSUFBSSxPQUFPLElBQUksQ0FBQyxNQUFNLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDbEMsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7SUFDRCxJQUFJLE9BQU8sSUFBSSxDQUFDLE1BQU0sS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUNsQyxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDdkMsQ0FBQztJQUNELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDM0IsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUUzQiwyREFBMkQ7SUFFM0QsTUFBTSxlQUFlLEdBQUcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBRXhFLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsRUFBRTtRQUN2RCxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDMUIsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNsQyx3RUFBd0U7UUFDeEUsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQ25DLElBQUksS0FBSyxDQUFDO1lBQ1YsTUFBTSxHQUFHLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3ZDLElBQUksR0FBRyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUNWLEtBQUssR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDdEMsQ0FBQztpQkFBTSxDQUFDO2dCQUNKLEtBQUssR0FBRyxFQUFFLENBQUM7WUFDZixDQUFDO1lBRUQseURBQXlEO1lBQ3pELDhDQUE4QztZQUM5Qyw2Q0FBNkM7WUFDN0MsaURBQWlEO1lBQ2pELHNEQUFzRDtZQUN0RCxFQUFFO1lBQ0YsMkNBQTJDO1lBQzNDLDJDQUEyQztZQUMzQywyQkFBMkI7WUFDM0IsRUFBRTtZQUNGLGlEQUFpRDtZQUNqRCxvREFBb0Q7WUFDcEQseUNBQXlDO1lBQ3pDLEVBQUU7WUFDRiw2Q0FBNkM7WUFDN0Msa0RBQWtEO1lBQ2xELDRCQUE0QjtZQUM1QixFQUFFO1lBQ0YsbURBQW1EO1lBQ25ELG1EQUFtRDtZQUNuRCxFQUFFO1lBQ0YsbURBQW1EO1lBQ25ELEVBQUU7WUFDRixvREFBb0Q7WUFDcEQsNkRBQTZEO1lBQzdELEVBQUU7WUFDRixxREFBcUQ7WUFDckQsZ0RBQWdEO1lBQ2hELEVBQUU7WUFFRixNQUFNLFFBQVEsR0FBRyxRQUFRLEdBQUcsTUFBTSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUUxRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUN6QixNQUFNLEVBQUUsR0FBRyxRQUFRLFVBQVUsQ0FDaEMsQ0FBQztZQUNGLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQ3pCLE1BQU0sRUFBRSxHQUFHLFFBQVEsTUFBTTtZQUN6Qiw0QkFBNEI7YUFDL0IsQ0FBQztZQUVGLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FDbEIsTUFBTSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQ3BDLEVBQUU7Z0JBQ0MsU0FBUyxFQUFFLElBQUk7YUFDbEIsQ0FBQyxDQUFDO1lBQ0gsRUFBRSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUN0QixNQUFNLEVBQUUsV0FBVyxDQUN0QixFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztZQUVqQixNQUFNLEdBQUcsR0FBRzttQ0FDVyxLQUFLO3NDQUNGLFdBQVc7dUNBQ1YsV0FBVzthQUNyQyxDQUFDO1lBQ0YsNkRBQTZEO1lBQzdELE9BQU8sR0FBRyxDQUFDO1FBRWYsQ0FBQztRQUNELE9BQU8sZUFBZSxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUN6RCxDQUFDLENBQUE7QUFDTCxDQUFDO0FBR0Qsa0NBQWtDO0FBQ2xDLDBCQUEwQjtBQUMxQiw2QkFBNkI7QUFDN0Isd0JBQXdCO0FBQ3hCLGtCQUFrQjtBQUNsQiw2QkFBNkI7QUFDN0IsNkJBQTZCO0FBQzdCLFFBQVE7QUFDUixLQUFLIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHBhdGggZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCB1dGlsIGZyb20gJ25vZGU6dXRpbCc7XG5pbXBvcnQgZnMgICBmcm9tICdub2RlOmZzJztcbmltcG9ydCBNdXJtdXIgZnJvbSAnLi9tdXJtdXJoYXNoM19nYy5qcyc7XG5cbmV4cG9ydCB0eXBlIE1lcm1haWRQbHVnaW5PcHRpb25zID0ge1xuICAgIC8qKlxuICAgICAqIEZpbGUtc3lzdGVtIHBhdGggb2YgZGlyZWN0b3J5IHdoZXJlIC5tZXJtYWlkIGZpbGVcbiAgICAgKiB3aWxsIGxhbmRcbiAgICAgKi9cbiAgICBmc3BhdGg6IHN0cmluZyxcblxuICAgIC8qKlxuICAgICAqIFByZWZpeCBzdHJpbmcgdG8gdXNlIG9uIGdlbmVyYXRlZCBmaWxlIG5hbWVzXG4gICAgICogZm9yIC5tZXJtYWlkIGFuZCAuc3ZnIGZpbGVzXG4gICAgICovXG4gICAgcHJlZml4OiBzdHJpbmcsXG5cbiAgICAvLyAuLi4gVGhlc2UgYXJlIGZvciBtZXJtYWlkLWNsaVxuICAgIC8vIFRoZXkgYXJlIG5vdCB5ZXQgc3VwcG9ydGVkXG4gICAgLy8gIHB1cHBldGVlckNvbmZpZz86IGFueSwgLy8gaW1wb3J0KFwicHVwcGV0ZWVyXCIpLkxhdW5jaE9wdGlvbnMsXG4gICAgLy8gIG91dHB1dEZvcm1hdD86IFwicG5nXCIgfCBcInN2Z1wiLlxuICAgIC8vICBhcnRlZmFjdHM/OiBzdHJpbmcgLy8gLSBwYXRoIHRvIHRoZSBhcnRlZmFjdHMgZGlyZWN0b3J5LFxufTtcblxuLyoqXG4gKiBBZGQgTWVybWFpZCBzdXBwb3J0IHRvIE1hcmtkb3duLUlUIHN1Y2ggdGhhdCBgYGBtZXJtYWlkIC4uIGBgYCB3aWxsXG4gKiBpbiB0dXJuIGNhbGwgdGhlIE1lcm1haWQgQ0xJIGZ1bmN0aW9uIGBydW5gIHRvIHJlbmRlciB0aGUgTWVybWFpZCBkb2N1bWVudC5cbiAqIFxuICogQHBhcmFtIG1kIFxuICogQHBhcmFtIG9wdHMgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBNYXJrZG93bklUTWVybWFpZFBsdWdpbihtZCwgb3B0czogTWVybWFpZFBsdWdpbk9wdGlvbnMpIHtcblxuICAgIGlmICh0eXBlb2Ygb3B0cyAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBPcHRpb25zIG9iamVjdCByZXF1aXJlZGApO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIG9wdHMuZnNwYXRoICE9PSAnc3RyaW5nJykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGZzcGF0aCByZXF1aXJlZGApO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIG9wdHMucHJlZml4ICE9PSAnc3RyaW5nJykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHByZWZpeCByZXF1aXJlZGApO1xuICAgIH1cbiAgICBjb25zdCBmc3BhdGggPSBvcHRzLmZzcGF0aDtcbiAgICBjb25zdCBwcmVmaXggPSBvcHRzLnByZWZpeDtcbiAgICBcbiAgICAvLyBvcHRzID0gT2JqZWN0LmFzc2lnbihNZXJtYWlkUGx1Z0luRGVmYXVsdE9wdGlvbnMsIG9wdHMpO1xuXG4gICAgY29uc3QgZGVmYXVsdFJlbmRlcmVyID0gbWQucmVuZGVyZXIucnVsZXMuZmVuY2UuYmluZChtZC5yZW5kZXJlci5ydWxlcyk7XG5cbiAgICBtZC5yZW5kZXJlci5ydWxlcy5mZW5jZSA9ICh0b2tlbnMsIGlkeCwgb3B0cywgZW52LCBzZWxmKSA9PiB7XG4gICAgICAgIGNvbnN0IHRva2VuID0gdG9rZW5zW2lkeF07XG4gICAgICAgIGNvbnN0IGNvZGUgPSB0b2tlbi5jb250ZW50LnRyaW0oKTtcbiAgICAgICAgLy8gY29uc29sZS5sb2coYE1lcm1haWRQbHVnaW4gcnVsZXMuZmVuY2UgJHt0b2tlbi5pbmZvfSAke2NvZGV9YCwgb3B0cyk7XG4gICAgICAgIGlmICh0b2tlbi5pbmZvLnN0YXJ0c1dpdGgoJ21lcm1haWQnKSkge1xuICAgICAgICAgICAgbGV0IHRpdGxlO1xuICAgICAgICAgICAgY29uc3Qgc3BjID0gdG9rZW4uaW5mby5pbmRleE9mKCcgJywgNyk7XG4gICAgICAgICAgICBpZiAoc3BjID4gMCkge1xuICAgICAgICAgICAgICAgIHRpdGxlID0gdG9rZW4uaW5mby5zbGljZShzcGMgKyAxKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGl0bGUgPSAnJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTWFya2Rvd24tSVQgcnVsZXMgZnVuY3Rpb25zIGxpa2UgdGhpcyBhcmUgU1lOQ0hST05PVVMuXG4gICAgICAgICAgICAvLyBUaGUgZmVuY2UgcnVsZXMgaGFuZGxlIHRoZSBjb2RlIGJsb2NrIHVzaW5nXG4gICAgICAgICAgICAvLyB0aHJlZSBiYWNrdGlja3MgYW5kIGEgbGFuZ3VhZ2UgaWRlbnRpZmllci5cbiAgICAgICAgICAgIC8vIEhlbmNlLCB0aGUgdG9rZW4uaW5mbyBpcyB0aGUgbGFuZ2F1Z2UgdGFnLCBhbmRcbiAgICAgICAgICAgIC8vIHRoaXMgZnVuY3Rpb24gaXMgdHJpZ2dlcmVkIGZvciBtZXJtYWlkIGNvZGUgYmxvY2tzLlxuICAgICAgICAgICAgLy9cbiAgICAgICAgICAgIC8vIEJlY2F1c2UgaXQgaXMgU1lOQ0hST05PVVMgd2UgY2Fubm90IGNhbGxcbiAgICAgICAgICAgIC8vIHRoZSBNZXJtYWlkIENMSSAncnVuJyBmdW5jdGlvbiwgd2hpY2ggaXNcbiAgICAgICAgICAgIC8vIGluaGVyZW50bHkgYXN5bmNocm9ub3VzLlxuICAgICAgICAgICAgLy9cbiAgICAgICAgICAgIC8vIFRoZXJlZm9yZSwgd2hhdCB3ZSdyZSBsZWZ0IHdpdGggaXMgdG8gZ2VuZXJhdGVcbiAgICAgICAgICAgIC8vIGEgY3VzdG9tIHRhZyB0aGFkIHdpbGwgdHJpZ2dlciBhIGZ1bmN0aW9uIGNhcGFibGVcbiAgICAgICAgICAgIC8vIG9mIGFzeW5jaHJvbm91c2x5IGludm9raW5nIHJ1bk1lcm1haWQuXG4gICAgICAgICAgICAvL1xuICAgICAgICAgICAgLy8gV2UgdGFrZSB0aGUgY29udGVudCBvZiB0aGUgY29kZSBibG9jaywgYW5kXG4gICAgICAgICAgICAvLyBzdG9yZSBpdCBpbnRvIGEgZmlsZS4gIFdoaWNoIG1lYW5zIHdlIG11c3QgaGF2ZVxuICAgICAgICAgICAgLy8gYSBwbGFjZSB0byBwdXQgdGhhdCBmaWxlLlxuICAgICAgICAgICAgLy9cbiAgICAgICAgICAgIC8vIFRoYXQgcGxhY2UgTVVTVCBiZSBhIERvY3VtZW50cyBkaXJlY3Rvcnkgc28gdGhhdFxuICAgICAgICAgICAgLy8gQWthc2hhQ01TIGNvZGUgd2lsbCBzZWUgYW5kIHJlbmRlciB0aGUgZG9jdW1lbnQuXG4gICAgICAgICAgICAvL1xuICAgICAgICAgICAgLy8gVG8gc3VwcG9ydCB0aGF0LCB0aGVyZSBhcmUgdHdvIHJlcXVpcmVkIG9wdGlvbnMuXG4gICAgICAgICAgICAvL1xuICAgICAgICAgICAgLy8gICogZnNwYXRoIGlzIHRoZSBmaWxlLXN5c3RlbSBwYXRoIGZvciBhIGRpcmVjdG9yeVxuICAgICAgICAgICAgLy8gICogcHJlZml4IGlzIHRoZSBwcmVmaXggdG8gdXNlIGZvciB0aGUgZ2VuZXJhdGVkIGZpbGUgbmFtZVxuICAgICAgICAgICAgLy9cbiAgICAgICAgICAgIC8vIEZvciB0aGUgY3VzdG9tIHRhZyB0byB3b3JrLCB0aGUgYGZzcGF0aGAgZGlyZWN0b3J5XG4gICAgICAgICAgICAvLyBtdXN0IGJlIG1vdW50ZWQgdXNpbmcgY29uZmlnLmFkZERvY3VtZW50c0Rpci5cbiAgICAgICAgICAgIC8vXG4gICAgICAgIFxuICAgICAgICAgICAgY29uc3QgdW5pcXVlSWQgPSBcInJlbmRlclwiICsgTXVybXVyKGNvZGUsIDQyNDIpLnRvU3RyaW5nKCk7XG5cbiAgICAgICAgICAgIGNvbnN0IG1tZEZpbGVOYW1lID0gcGF0aC5qb2luKFxuICAgICAgICAgICAgICAgIHByZWZpeCwgYCR7dW5pcXVlSWR9Lm1lcm1haWRgXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgY29uc3Qgc3ZnRmlsZU5hbWUgPSBwYXRoLmpvaW4oXG4gICAgICAgICAgICAgICAgcHJlZml4LCBgJHt1bmlxdWVJZH0ucG5nYFxuICAgICAgICAgICAgICAgIC8vIHByZWZpeCwgYCR7dW5pcXVlSWR9LnN2Z2BcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIGZzLm1rZGlyU3luYyhwYXRoLmpvaW4oXG4gICAgICAgICAgICAgICAgZnNwYXRoLCBwYXRoLmRpcm5hbWUobW1kRmlsZU5hbWUpXG4gICAgICAgICAgICApLCB7XG4gICAgICAgICAgICAgICAgcmVjdXJzaXZlOiB0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGZzLndyaXRlRmlsZVN5bmMocGF0aC5qb2luKFxuICAgICAgICAgICAgICAgIGZzcGF0aCwgbW1kRmlsZU5hbWVcbiAgICAgICAgICAgICksIGNvZGUsICd1dGY4Jyk7XG5cbiAgICAgICAgICAgIGNvbnN0IHJldCA9IGA8ZGlhZ3JhbXMtbWVybWFpZFxuICAgICAgICAgICAgICAgICAgICAgICAgY2FwdGlvbj1cIiR7dGl0bGV9XCJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0LWZpbGU9JyR7bW1kRmlsZU5hbWV9J1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0cHV0LWZpbGU9JyR7c3ZnRmlsZU5hbWV9Jy8+XG4gICAgICAgICAgICBgO1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coYE1hcmtkb3duSVRNZXJtYWlkUGx1Z2luICR7Y29kZX0gPT0+ICR7cmV0fWApO1xuICAgICAgICAgICAgcmV0dXJuIHJldDtcblxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkZWZhdWx0UmVuZGVyZXIodG9rZW5zLCBpZHgsIG9wdHMsIGVudiwgc2VsZik7XG4gICAgfVxufVxuXG5cbi8vIE1lcm1haWRQbHVnSW5EZWZhdWx0T3B0aW9ucyA9IHtcbi8vICAgICBzdGFydE9uTG9hZDogZmFsc2UsXG4vLyAgICAgc2VjdXJpdHlMZXZlbDogJ3RydWUnLFxuLy8gICAgIHRoZW1lOiBcImRlZmF1bHRcIixcbi8vICAgICBmbG93Y2hhcnQ6e1xuLy8gICAgICAgICBodG1sTGFiZWxzOiBmYWxzZSxcbi8vICAgICAgICAgdXNlTWF4V2lkdGg6IHRydWUsXG4vLyAgICAgfVxuLy8gfTtcbiJdfQ==