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
        const code = token.content.trim();
        // console.log(`MermaidPlugin rules.fence ${token.info} ${code}`, opts);
        if (token.info.startsWith('mermaid')) {
            let title;
            const spc = token.info.indexOf(' ', 7);
            if (spc > 0) {
                title = token.info.slice(spc + 1);
            }

        
            const uniqueId = "render" + Murmur(code, 4242).toString();

            const mmdFileName = path.join(
                prefix, `${uniqueId}.mermaid`
            );
            const svgFileName = path.join(
                prefix, `${uniqueId}.svg`
            );

            fs.mkdirSync(path.join(
                fspath, path.dirname(mmdFileName)
            ), {
                recursive: true
            });
            fs.writeFileSync(path.join(
                fspath, mmdFileName
            ), code, 'utf8');

            return `<diagrams-mermaid
                        input-file='${mmdFileName}'
                        output-file='${svgFileName}'/>
            `;

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
