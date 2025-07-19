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
        // The idea is trimming off excess whitespace from the code block.
        // But, using the .trim function removes both newlines and spaces.
        // For some Mermaid diagrams, trailing spaces are important, and
        // if the trailing spaces are missing an error is thrown.
        //
        // If trailing newlines are left in the string, for some
        // reason the Mermaid call "never" finishes.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd24taXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9saWIvbWFya2Rvd24taXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxJQUFJLE1BQU0sV0FBVyxDQUFDO0FBRTdCLE9BQU8sRUFBRSxNQUFRLFNBQVMsQ0FBQztBQUMzQixPQUFPLE1BQU0sTUFBTSxxQkFBcUIsQ0FBQztBQXNCekM7Ozs7OztHQU1HO0FBQ0gsTUFBTSxVQUFVLHVCQUF1QixDQUFDLEVBQUUsRUFBRSxJQUEwQjtJQUVsRSxJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQzNCLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBQ0QsSUFBSSxPQUFPLElBQUksQ0FBQyxNQUFNLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDbEMsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7SUFDRCxJQUFJLE9BQU8sSUFBSSxDQUFDLE1BQU0sS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUNsQyxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDdkMsQ0FBQztJQUNELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDM0IsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUUzQiwyREFBMkQ7SUFFM0QsTUFBTSxlQUFlLEdBQUcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBRXhFLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsRUFBRTtRQUN2RCxNQUFNLEtBQUssR0FBRyxNQUFN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bm9kZTp1dGlsJztcbmltcG9ydCBmcyAgIGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IE11cm11ciBmcm9tICcuL211cm11cmhhc2gzX2djLmpzJztcblxuZXhwb3J0IHR5cGUgTWVybWFpZFBsdWdpbk9wdGlvbnMgPSB7XG4gICAgLyoqXG4gICAgICogRmlsZS1zeXN0ZW0gcGF0aCBvZiBkaXJlY3Rvcnkgd2hlcmUgLm1lcm1haWQgZmlsZVxuICAgICAqIHdpbGwgbGFuZFxuICAgICAqL1xuICAgIGZzcGF0aDogc3RyaW5nLFxuXG4gICAgLyoqXG4gICAgICogUHJlZml4IHN0cmluZyB0byB1c2Ugb24gZ2VuZXJhdGVkIGZpbGUgbmFtZXNcbiAgICAgKiBmb3IgLm1lcm1haWQgYW5kIC5zdmcgZmlsZXNcbiAgICAgKi9cbiAgICBwcmVmaXg6IHN0cmluZyxcblxuICAgIC8vIC4uLiBUaGVzZSBhcmUgZm9yIG1lcm1haWQtY2xpXG4gICAgLy8gVGhleSBhcmUgbm90IHlldCBzdXBwb3J0ZWRcbiAgICAvLyAgcHVwcGV0ZWVyQ29uZmlnPzogYW55LCAvLyBpbXBvcnQoXCJwdXBwZXRlZXJcIikuTGF1bmNoT3B0aW9ucyxcbiAgICAvLyAgb3V0cHV0Rm9ybWF0PzogXCJwbmdcIiB8IFwic3ZnXCIuXG4gICAgLy8gIGFydGVmYWN0cz86IHN0cmluZyAvLyAtIHBhdGggdG8gdGhlIGFydGVmYWN0cyBkaXJlY3RvcnksXG59O1xuXG4vKipcbiAqIEFkZCBNZXJtYWlkIHN1cHBvcnQgdG8gTWFya2Rvd24tSVQgc3VjaCB0aGF0IGBgYG1lcm1haWQgLi4gYGBgIHdpbGxcbiAqIGluIHR1cm4gY2FsbCB0aGUgTWVybWFpZCBDTEkgZnVuY3Rpb24gYHJ1bmAgdG8gcmVuZGVyIHRoZSBNZXJtYWlkIGRvY3VtZW50LlxuICogXG4gKiBAcGFyYW0gbWQgXG4gKiBAcGFyYW0gb3B0cyBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIE1hcmtkb3duSVRNZXJtYWlkUGx1Z2luKG1kLCBvcHRzOiBNZXJtYWlkUGx1Z2luT3B0aW9ucykge1xuXG4gICAgaWYgKHR5cGVvZiBvcHRzICE9PSAnb2JqZWN0Jykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE9wdGlvbnMgb2JqZWN0IHJlcXVpcmVkYCk7XG4gICAgfVxuICAgIGlmICh0eXBlb2Ygb3B0cy5mc3BhdGggIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgZnNwYXRoIHJlcXVpcmVkYCk7XG4gICAgfVxuICAgIGlmICh0eXBlb2Ygb3B0cy5wcmVmaXggIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgcHJlZml4IHJlcXVpcmVkYCk7XG4gICAgfVxuICAgIGNvbnN0IGZzcGF0aCA9IG9wdHMuZnNwYXRoO1xuICAgIGNvbnN0IHByZWZpeCA9IG9wdHMucHJlZml4O1xuICAgIFxuICAgIC8vIG9wdHMgPSBPYmplY3QuYXNzaWduKE1lcm1haWRQbHVnSW5EZWZhdWx0T3B0aW9ucywgb3B0cyk7XG5cbiAgICBjb25zdCBkZWZhdWx0UmVuZGVyZXIgPSBtZC5yZW5kZXJlci5ydWxlcy5mZW5jZS5iaW5kKG1kLnJlbmRlcmVyLnJ1bGVzKTtcblxuICAgIG1kLnJlbmRlcmVyLnJ1bGVzLmZlbmNlID0gKHRva2VucywgaWR4LCBvcHRzLCBlbnYsIHNlbGYpID0+IHtcbiAgICAgICAgY29uc3QgdG9rZW4gPSB0b2tlbnNbaWR4XTtcbiAgICAgICAgLy8gVGhlIGlkZWEgaXMgdHJpbW1pbmcgb2ZmIGV4Y2VzcyB3aGl0ZXNwYWNlIGZyb20gdGhlIGNvZGUgYmxvY2suXG4gICAgICAgIC8vIEJ1dCwgdXNpbmcgdGhlIC50cmltIGZ1bmN0aW9uIHJlbW92ZXMgYm90aCBuZXdsaW5lcyBhbmQgc3BhY2VzLlxuICAgICAgICAvLyBGb3Igc29tZSBNZXJtYWlkIGRpYWdyYW1zLCB0cmFpbGluZyBzcGFjZXMgYXJlIGltcG9ydGFudCwgYW5kXG4gICAgICAgIC8vIGlmIHRoZSB0cmFpbGluZyBzcGFjZXMgYXJlIG1pc3NpbmcgYW4gZXJyb3IgaXMgdGhyb3duLlxuICAgICAgICAvL1xuICAgICAgICAvLyBJZiB0cmFpbGluZyBuZXdsaW5lcyBhcmUgbGVmdCBpbiB0aGUgc3RyaW5nLCBmb3Igc29tZVxuICAgICAgICAvLyByZWFzb24gdGhlIE1lcm1haWQgY2FsbCBcIm5ldmVyXCIgZmluaXNoZXMuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIFRoaXMgcmVwbGFjZSBjYWxsIHJlbW92ZXMgb25seSB0aGUgbmV3bGluZXMgbGVhdmluZyBiZWhpbmRcbiAgICAgICAgLy8gYW55IHdoaXRlc3BhY2UuXG4gICAgICAgIC8vIFNvdXJjZTogaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTQ1NzI0MTMvcmVtb3ZlLWxpbmUtYnJlYWtzLWZyb20tc3RhcnQtYW5kLWVuZC1vZi1zdHJpbmdcbiAgICAgICAgY29uc3QgY29kZSA9IHRva2VuLmNvbnRlbnQucmVwbGFjZSgvXlxcbnxcXG4kL2csICcnKTsgLy8udHJpbSgpO1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhgTWVybWFpZFBsdWdpbiBydWxlcy5mZW5jZSAke3Rva2VuLmluZm99ICR7Y29kZX1gLCBvcHRzKTtcbiAgICAgICAgaWYgKHRva2VuLmluZm8uc3RhcnRzV2l0aCgnbWVybWFpZCcpKSB7XG4gICAgICAgICAgICBsZXQgdGl0bGU7XG4gICAgICAgICAgICBjb25zdCBzcGMgPSB0b2tlbi5pbmZvLmluZGV4T2YoJyAnLCA3KTtcbiAgICAgICAgICAgIGlmIChzcGMgPiAwKSB7XG4gICAgICAgICAgICAgICAgdGl0bGUgPSB0b2tlbi5pbmZvLnNsaWNlKHNwYyArIDEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aXRsZSA9ICcnO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBNYXJrZG93bi1JVCBydWxlcyBmdW5jdGlvbnMgbGlrZSB0aGlzIGFyZSBTWU5DSFJPTk9VUy5cbiAgICAgICAgICAgIC8vIFRoZSBmZW5jZSBydWxlcyBoYW5kbGUgdGhlIGNvZGUgYmxvY2sgdXNpbmdcbiAgICAgICAgICAgIC8vIHRocmVlIGJhY2t0aWNrcyBhbmQgYSBsYW5ndWFnZSBpZGVudGlmaWVyLlxuICAgICAgICAgICAgLy8gSGVuY2UsIHRoZSB0b2tlbi5pbmZvIGlzIHRoZSBsYW5nYXVnZSB0YWcsIGFuZFxuICAgICAgICAgICAgLy8gdGhpcyBmdW5jdGlvbiBpcyB0cmlnZ2VyZWQgZm9yIG1lcm1haWQgY29kZSBibG9ja3MuXG4gICAgICAgICAgICAvL1xuICAgICAgICAgICAgLy8gQmVjYXVzZSBpdCBpcyBTWU5DSFJPTk9VUyB3ZSBjYW5ub3QgY2FsbFxuICAgICAgICAgICAgLy8gdGhlIE1lcm1haWQgQ0xJICdydW4nIGZ1bmN0aW9uLCB3aGljaCBpc1xuICAgICAgICAgICAgLy8gaW5oZXJlbnRseSBhc3luY2hyb25vdXMuXG4gICAgICAgICAgICAvL1xuICAgICAgICAgICAgLy8gVGhlcmVmb3JlLCB3aGF0IHdlJ3JlIGxlZnQgd2l0aCBpcyB0byBnZW5lcmF0ZVxuICAgICAgICAgICAgLy8gYSBjdXN0b20gdGFnIHRoYWQgd2lsbCB0cmlnZ2VyIGEgZnVuY3Rpb24gY2FwYWJsZVxuICAgICAgICAgICAgLy8gb2YgYXN5bmNocm9ub3VzbHkgaW52b2tpbmcgcnVuTWVybWFpZC5cbiAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAvLyBXZSB0YWtlIHRoZSBjb250ZW50IG9mIHRoZSBjb2RlIGJsb2NrLCBhbmRcbiAgICAgICAgICAgIC8vIHN0b3JlIGl0IGludG8gYSBmaWxlLiAgV2hpY2ggbWVhbnMgd2UgbXVzdCBoYXZlXG4gICAgICAgICAgICAvLyBhIHBsYWNlIHRvIHB1dCB0aGF0IGZpbGUuXG4gICAgICAgICAgICAvL1xuICAgICAgICAgICAgLy8gVGhhdCBwbGFjZSBNVVNUIGJlIGEgRG9jdW1lbnRzIGRpcmVjdG9yeSBzbyB0aGF0XG4gICAgICAgICAgICAvLyBBa2FzaGFDTVMgY29kZSB3aWxsIHNlZSBhbmQgcmVuZGVyIHRoZSBkb2N1bWVudC5cbiAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAvLyBUbyBzdXBwb3J0IHRoYXQsIHRoZXJlIGFyZSB0d28gcmVxdWlyZWQgb3B0aW9ucy5cbiAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAvLyAgKiBmc3BhdGggaXMgdGhlIGZpbGUtc3lzdGVtIHBhdGggZm9yIGEgZGlyZWN0b3J5XG4gICAgICAgICAgICAvLyAgKiBwcmVmaXggaXMgdGhlIHByZWZpeCB0byB1c2UgZm9yIHRoZSBnZW5lcmF0ZWQgZmlsZSBuYW1lXG4gICAgICAgICAgICAvL1xuICAgICAgICAgICAgLy8gRm9yIHRoZSBjdXN0b20gdGFnIHRvIHdvcmssIHRoZSBgZnNwYXRoYCBkaXJlY3RvcnlcbiAgICAgICAgICAgIC8vIG11c3QgYmUgbW91bnRlZCB1c2luZyBjb25maWcuYWRkRG9jdW1lbnRzRGlyLlxuICAgICAgICAgICAgLy9cbiAgICAgICAgXG4gICAgICAgICAgICBjb25zdCB1bmlxdWVJZCA9IFwicmVuZGVyXCIgKyBNdXJtdXIoY29kZSwgNDI0MikudG9TdHJpbmcoKTtcblxuICAgICAgICAgICAgY29uc3QgbW1kRmlsZU5hbWUgPSBwYXRoLmpvaW4oXG4gICAgICAgICAgICAgICAgcHJlZml4LCBgJHt1bmlxdWVJZH0ubWVybWFpZGBcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBjb25zdCBzdmdGaWxlTmFtZSA9IHBhdGguam9pbihcbiAgICAgICAgICAgICAgICBwcmVmaXgsIGAke3VuaXF1ZUlkfS5wbmdgXG4gICAgICAgICAgICAgICAgLy8gcHJlZml4LCBgJHt1bmlxdWVJZH0uc3ZnYFxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgZnMubWtkaXJTeW5jKHBhdGguam9pbihcbiAgICAgICAgICAgICAgICBmc3BhdGgsIHBhdGguZGlybmFtZShtbWRGaWxlTmFtZSlcbiAgICAgICAgICAgICksIHtcbiAgICAgICAgICAgICAgICByZWN1cnNpdmU6IHRydWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgZnMud3JpdGVGaWxlU3luYyhwYXRoLmpvaW4oXG4gICAgICAgICAgICAgICAgZnNwYXRoLCBtbWRGaWxlTmFtZVxuICAgICAgICAgICAgKSwgY29kZSwgJ3V0ZjgnKTtcblxuICAgICAgICAgICAgY29uc3QgcmV0ID0gYDxkaWFncmFtcy1tZXJtYWlkXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXB0aW9uPVwiJHt0aXRsZX1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXQtZmlsZT0nJHttbWRGaWxlTmFtZX0nXG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRwdXQtZmlsZT0nJHtzdmdGaWxlTmFtZX0nLz5cbiAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhgTWFya2Rvd25JVE1lcm1haWRQbHVnaW4gJHtjb2RlfSA9PT4gJHtyZXR9YCk7XG4gICAgICAgICAgICByZXR1cm4gcmV0O1xuXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRlZmF1bHRSZW5kZXJlcih0b2tlbnMsIGlkeCwgb3B0cywgZW52LCBzZWxmKTtcbiAgICB9XG59XG5cblxuLy8gTWVybWFpZFBsdWdJbkRlZmF1bHRPcHRpb25zID0ge1xuLy8gICAgIHN0YXJ0T25Mb2FkOiBmYWxzZSxcbi8vICAgICBzZWN1cml0eUxldmVsOiAndHJ1ZScsXG4vLyAgICAgdGhlbWU6IFwiZGVmYXVsdFwiLFxuLy8gICAgIGZsb3djaGFydDp7XG4vLyAgICAgICAgIGh0bWxMYWJlbHM6IGZhbHNlLFxuLy8gICAgICAgICB1c2VNYXhXaWR0aDogdHJ1ZSxcbi8vICAgICB9XG4vLyB9O1xuIl19