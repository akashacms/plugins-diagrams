import path from 'node:path';
import util from 'node:util';
import fs   from 'node:fs';
import Murmur from './murmurhash3_gc.js';

export type MermaidPluginOptions = {
    /**
     * File-system path of directory where .mermaid file
     * will land
     */
    fspath: string,

    /**
     * Prefix string to use on generated file names
     * for .mermaid and .svg files
     */
    prefix: string,

    // ... These are for mermaid-cli
    // They are not yet supported
    //  puppeteerConfig?: any, // import("puppeteer").LaunchOptions,
    //  outputFormat?: "png" | "svg".
    //  artefacts?: string // - path to the artefacts directory,
};

/**
 * Add Mermaid support to Markdown-IT such that ```mermaid .. ``` will
 * in turn call the Mermaid CLI function `run` to render the Mermaid document.
 * 
 * @param md 
 * @param opts 
 */
export function MarkdownITMermaidPlugin(md, opts: MermaidPluginOptions) {

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
            } else {
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

            const mmdFileName = path.join(
                prefix, `${uniqueId}.mermaid`
            );
            const svgFileName = path.join(
                prefix, `${uniqueId}.png`
                // prefix, `${uniqueId}.svg`
            );

            fs.mkdirSync(path.join(
                fspath, path.dirname(mmdFileName)
            ), {
                recursive: true
            });
            fs.writeFileSync(path.join(
                fspath, mmdFileName
            ), code, 'utf8');

            const ret = `<diagrams-mermaid
                        caption="${title}"
                        input-file='${mmdFileName}'
                        output-file='${svgFileName}'/>
            `;
            // console.log(`MarkdownITMermaidPlugin ${code} ==> ${ret}`);
            return ret;

        }
        return defaultRenderer(tokens, idx, opts, env, self);
    }
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
