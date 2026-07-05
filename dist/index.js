var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _DiagramsPlugin_config;
import path from 'node:path';
import fs, { promises as fsp } from 'node:fs';
import util from 'node:util';
import { deflateRawSync } from 'node:zlib';
import { spawn } from 'node:child_process';
import { encode } from 'html-entities';
import { render } from '@pintora/cli';
export { MarkdownITMermaidPlugin, MarkdownITPlantUMLPlugin } from './markdown-it.js';
const __dirname = import.meta.dirname;
// The PlantUML JAR is no longer distributed with this package.
// Rendering PlantUML requires the user to either run a PlantUML
// server (PLANTUML_SERVER_URL) or download the JAR (PLANTUML_JAR).
// See the README section "Setting up PlantUML rendering".
const plantumlSetupHelp = `See the "Setting up PlantUML rendering" section of the @akashacms/diagram-makers README: https://github.com/akashacms/plugins-diagrams#setting-up-plantuml-rendering`;
const pluginName = '@akashacms/diagram-makers';
import * as akasha from 'akasharender';
import { Plugin } from 'akasharender/dist/Plugin.js';
const mahabhuta = akasha.mahabhuta;
import { adaptInlineSvg, doMermaid, registerMermaidFonts, renderMermaidSvg } from './render-mermaid.js';
export { doMermaid, renderMermaidSvg, registerMermaidFonts } from './render-mermaid.js';
export class DiagramsPlugin extends Plugin {
    constructor() {
        super(pluginName);
        _DiagramsPlugin_config.set(this, void 0);
    }
    configure(config, options) {
        __classPrivateFieldSet(this, _DiagramsPlugin_config, config, "f");
        // this.config = config;
        this.akasha = config.akasha;
        this.options = options ? options : {};
        this.options.config = config;
        if (this.options.mermaid?.configFN
            && !this.options.mermaid.configJSON) {
            this.options.mermaid.configJSON = fs.readFileSync(this.options.mermaid.configFN, 'utf-8');
        }
        config.addMahabhuta(mahabhutaArray(this.options, config, this.akasha, this));
        let moduleDirname = import.meta.dirname;
        config.addAssetsDir(path.join(moduleDirname, '..', 'assets'));
        config.addStylesheet({
            href: '/vendor/@akashacms/diagram-makers/style.css'
        });
    }
    get config() { return __classPrivateFieldGet(this, _DiagramsPlugin_config, "f"); }
}
_DiagramsPlugin_config = new WeakMap();
export function mahabhutaArray(options, config, akasha, plugin) {
    let ret = new mahabhuta.MahafuncArray(pluginName, options);
    ret.addMahafunc(new MermaidLocal(config, akasha, plugin));
    ret.addMahafunc(new PlantUMLLocal(config, akasha, plugin));
    ret.addMahafunc(new PintoraLocal(config, akasha, plugin));
    return ret;
}
;
class MermaidLocal extends akasha.CustomElement {
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
export async function doPintora(options) {
    const renderOpts = structuredClone(options);
    delete renderOpts.outputFN;
    const buf = await render(renderOpts);
    if (options.outputFN) {
        await fsp.writeFile(options.outputFN, buf);
    }
    else {
        throw new Error(`No output file FN ${util.inspect(options)}`);
    }
}
class PintoraLocal extends akasha.CustomElement {
    get elementName() { return "diagrams-pintora"; }
    async process($element, metadata, dirty) {
        const options = {
            code: $element.text(),
            outputFN: $element.attr('output-file')
        };
        let vpathIn;
        let fspathIn;
        const inf = $element.attr('input-file');
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
        // console.log(`PintoraLocal input-file ${util.inspect(inf)} vpathIn ${util.inspect(vpathIn)}`);
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
            if (typeof options.code === 'string'
                && options.code.length >= 1) {
                throw new Error(`diagrams-pintora - either specify input-file OR a diagram body, not both`);
            }
            options.code = await fsp.readFile(fspathIn, 'utf-8');
        }
        if (typeof options.outputFN !== 'string'
            || options.outputFN.length < 1) {
            throw new Error(`diagrams-pintora must have output-file`);
        }
        const pxr = $element.attr('pixel-ratio');
        if (typeof pxr === 'string'
            && pxr.length >= 1) {
            const r = Number.parseFloat(pxr);
            if (isNaN(r)) {
                throw new Error(`diagrams-pintora: pixel-ratio is not a number ${pxr}`);
            }
            options.devicePixelRatio = r;
        }
        const mime = $element.attr('mime-type');
        if (typeof mime === 'string') {
            if (mime === 'image/svg+xml'
                || mime === 'image/jpeg'
                || mime === 'image/png') {
                options.mimeType = mime;
            }
            else {
                throw new Error(`Invalid MIME type ${util.inspect(mime)}`);
            }
        }
        const bgColor = $element.attr('bg-color');
        if (typeof bgColor === 'string') {
            options.backgroundColor = bgColor;
        }
        const width = $element.attr('width');
        if (typeof width === 'string') {
            options.width = Number.parseFloat(width);
            if (isNaN(options.width)) {
                throw new Error(`diagrams-pintora: width is not a number ${width}`);
            }
        }
        options.renderInSubprocess = false;
        const buf = await render(options);
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
            ? `id="${encode(id)}`
            : '';
        const Tclazz = typeof clazz === 'string'
            ? `class="${encode(clazz)}`
            : '';
        const Twidth = typeof options.width === 'number'
            ? `width="${options.width.toString()}"`
            : '';
        // options.outputFN was set from output-file
        // This creates vpathOut from that value
        // This computs fspathOut, which is then
        // assigned back into options.outputFN
        let vpathOut;
        if (!path.isAbsolute(options.outputFN)) {
            let dir = path.dirname(metadata.document.path);
            vpathOut = path.normalize(path.join('/', dir, options.outputFN));
        }
        else {
            vpathOut = options.outputFN;
        }
        // Compute fspath for vpathOut
        const fspathOut = path.normalize(path.join(this.config.renderDestination, vpathOut));
        options.outputFN = fspathOut;
        if (options.outputFN) {
            await fsp.writeFile(options.outputFN, buf);
        }
        const ret = `
        <figure ${Tid} ${Tclazz}>
        <img src="${encode(vpathOut)}" ${Talt} ${Ttitle} ${Twidth}/>
        ${cap}
        </figure>
        `;
        // console.log(ret);
        return ret;
    }
}
/**
 * Render a PlantUML diagram using whichever rendering
 * backend is configured.  If a server URL is available
 * (the serverURL option or the PLANTUML_SERVER_URL
 * environment variable), the diagram is sent to that
 * PlantUML server.  Otherwise, if a JAR path is available
 * (the jarPath option or the PLANTUML_JAR environment
 * variable), the diagram is rendered locally by running
 * the JAR with Java.  If neither is available, an error
 * is thrown directing the user to the README.
 *
 * In the single-input modes (inputBody or one entry in
 * inputFNs), when no outputFN is given the rendered
 * output is returned as a Buffer instead of being
 * written to a file.
 */
export async function doPlantUML(options) {
    const serverURL = options.serverURL
        ?? process.env.PLANTUML_SERVER_URL;
    const jarPath = options.jarPath
        ?? process.env.PLANTUML_JAR;
    if (typeof serverURL === 'string' && serverURL.length >= 1) {
        return doPlantUMLServer(options);
    }
    if (typeof jarPath === 'string' && jarPath.length >= 1) {
        return doPlantUMLLocal(options);
    }
    throw new Error(`PlantUML rendering is not configured.  Either run a PlantUML server and set the PLANTUML_SERVER_URL environment variable, or download plantuml.jar (npx diagram-makers plantuml-download) and set the PLANTUML_JAR environment variable.  ${plantumlSetupHelp}`);
}
// The alphabet used by PlantUML servers for encoded
// diagram text.  It resembles base64, but with a
// different character set and ordering.
const plantumlAlphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';
/**
 * Encode PlantUML diagram text for use in a PlantUML
 * server URL, as documented at
 * https://plantuml.com/text-encoding -- the text is
 * deflated, then encoded with a base64-like alphabet.
 */
export function plantumlEncode(diagram) {
    const deflated = deflateRawSync(Buffer.from(diagram, 'utf-8'), { level: 9 });
    let ret = '';
    for (let i = 0; i < deflated.length; i += 3) {
        const b1 = deflated[i];
        const b2 = i + 1 < deflated.length ? deflated[i + 1] : 0;
        const b3 = i + 2 < deflated.length ? deflated[i + 2] : 0;
        ret += plantumlAlphabet[b1 >> 2]
            + plantumlAlphabet[((b1 & 0x03) << 4) | (b2 >> 4)]
            + plantumlAlphabet[((b2 & 0x0F) << 2) | (b3 >> 6)]
            + plantumlAlphabet[b3 & 0x3F];
    }
    return ret;
}
/**
 * Render a PlantUML diagram by sending it to a PlantUML
 * server.  The server URL comes from the serverURL option
 * or the PLANTUML_SERVER_URL environment variable.
 *
 * The server supports a subset of the JAR's features:
 * PNG (tpng, the default), SVG (tsvg), and ASCII art
 * (ttxt) output formats.  The input is either inputBody
 * or a single entry in inputFNs.  The rendered output is
 * written to outputFN when given, and returned as a
 * Buffer otherwise.  Options that only make sense for
 * the JAR (darkmode, charset, nbthread, outputDir, and
 * the other output formats) are not supported.
 */
export async function doPlantUMLServer(options) {
    const serverURL = options.serverURL
        ?? process.env.PLANTUML_SERVER_URL;
    if (typeof serverURL !== 'string' || serverURL.length < 1) {
        throw new Error(`plantuml server - no server URL.  Set the PLANTUML_SERVER_URL environment variable.  ${plantumlSetupHelp}`);
    }
    for (const unsupported of [
        'teps', 'thtml', 'tlatex', 'tpdf', 'tscxml',
        'tvdx', 'txmi', 'tutxt'
    ]) {
        if (options[unsupported]) {
            throw new Error(`plantuml server - the ${unsupported} output format is not supported by PlantUML server rendering - use the JAR instead (PLANTUML_JAR)`);
        }
    }
    if (options.darkmode) {
        throw new Error(`plantuml server - darkmode is not supported by PlantUML server rendering - use the JAR instead (PLANTUML_JAR)`);
    }
    let format;
    if (options.tsvg)
        format = 'svg';
    else if (options.ttxt)
        format = 'txt';
    else
        format = 'png';
    let diagram;
    if (Array.isArray(options.inputFNs)
        && options.inputFNs.length > 1) {
        throw new Error(`plantuml server - only one input file is supported by PlantUML server rendering - use the JAR instead (PLANTUML_JAR)`);
    }
    else if (Array.isArray(options.inputFNs)
        && options.inputFNs.length === 1) {
        diagram = await fsp.readFile(options.inputFNs[0], 'utf-8');
    }
    else if (typeof options.inputBody === 'string'
        && options.inputBody.length >= 1) {
        diagram = options.inputBody;
    }
    else {
        throw new Error(`plantuml server - no input sources`);
    }
    const url = `${serverURL.replace(/\/+$/, '')}/${format}/${plantumlEncode(diagram)}`;
    let res;
    try {
        res = await fetch(url);
    }
    catch (err) {
        throw new Error(`plantuml server - could not reach PlantUML server at ${serverURL} - ${err.message}.  ${plantumlSetupHelp}`);
    }
    if (!res.ok) {
        // For diagram errors the server responds with a
        // 4xx status, but the body is still a rendered
        // image describing the error.  Report the status
        // and let the user inspect the diagram.
        throw new Error(`plantuml server - ${serverURL} responded with ${res.status} ${res.statusText} for the diagram`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (typeof options.outputFN === 'string'
        && options.outputFN.length >= 1) {
        await fsp.writeFile(options.outputFN, buf);
        return undefined;
    }
    return buf;
}
export async function doPlantUMLLocal(options) {
    const plantumlJar = options.jarPath
        ?? process.env.PLANTUML_JAR;
    if (typeof plantumlJar !== 'string'
        || plantumlJar.length < 1) {
        throw new Error(`plantuml - no JAR file configured.  Download plantuml.jar (npx diagram-makers plantuml-download) and set the PLANTUML_JAR environment variable.  ${plantumlSetupHelp}`);
    }
    try {
        await fsp.access(plantumlJar, fs.constants.R_OK);
    }
    catch (err) {
        throw new Error(`plantuml - the JAR file ${plantumlJar} does not exist or is not readable.  ${plantumlSetupHelp}`);
    }
    const args = [
        // 'java',
        '-jar',
        '-Djava.awt.headless=true',
        '--add-opens=java.xml/com.sun.org.apache.xalan.internal.xsltc.trax=ALL-UNNAMED',
        plantumlJar,
    ];
    if (options.charset) {
        args.push('-charset');
        args.push(options.charset);
    }
    if (options.darkmode) {
        args.push('-darkmode');
    }
    if (options.debugsvek) {
        args.push('-debugsvek');
    }
    if (options.fileNameOverride) {
        args.push('-filename');
        args.push(options.fileNameOverride);
    }
    if (options.nbthread) {
        args.push('-nbthread');
        args.push(options.nbthread);
    }
    if (options.nometadata) {
        args.push('-nometadata');
    }
    if (options.teps) {
        args.push('-teps');
    }
    if (options.thtml) {
        args.push('-thtml');
    }
    if (options.tlatex) {
        args.push('-tlatex');
    }
    if (options.tpdf) {
        args.push('-tpdf');
    }
    if (options.tpng) {
        args.push('-tpng');
    }
    if (options.tscxml) {
        args.push('-tscxml');
    }
    if (options.tsvg) {
        args.push('-tsvg');
    }
    if (options.ttxt) {
        args.push('-ttxt');
    }
    if (options.tutxt) {
        args.push('-tutxt');
    }
    if (options.tvdx) {
        args.push('-tvdx');
    }
    if (options.txmi) {
        args.push('-txmi');
    }
    if (options.verbose) {
        args.push('-verbose');
    }
    // 0 inputFNs requires inputBody
    // child.stdin.write/end with inputBody
    // -pipe
    //
    // 1 inputFN, no/ignore inputBody
    // fs.createReadStream(inputFN).pipe(child.stdin)
    // -pipe
    //
    // In both -pipe cases, child.stdout goes to
    // fs.createWriteStream(outputFN) when outputFN is
    // given, and is otherwise collected into a Buffer
    // that is returned.
    //
    // multiple inputFNs .. optional output-dir's
    // Both go on the command-line
    //
    let spawnopts = {};
    if (typeof options.inputFNs === 'undefined'
        && !Array.isArray(options.inputFNs)
        && typeof options.inputBody !== 'string') {
        throw new Error(`plantuml - no input sources`);
    }
    // An inputBody with no file names, or a single file
    // name, means we're piping
    const pipeMode = (typeof options.inputFNs === 'undefined'
        && !Array.isArray(options.inputFNs)
        && typeof options.inputBody === 'string')
        || (Array.isArray(options.inputFNs)
            && options.inputFNs.length === 1);
    if (pipeMode) {
        args.push('-pipe');
    }
    if (Array.isArray(options.inputFNs)
        && options.inputFNs.length > 1
        && typeof options.outputFN === 'string') {
        throw new Error(`plantuml - with multiple input files, output file not allowed`);
    }
    // multiple file names, push onto args
    if (Array.isArray(options.inputFNs)
        && options.inputFNs.length > 1) {
        for (const inputFN of options.inputFNs) {
            args.push(inputFN);
        }
    }
    if (typeof options.outputDir === 'string') {
        args.push('-output');
        args.push(options.outputDir);
    }
    // Now that the command args and spawnopts are set up
    // run the command
    // console.log({
    //     spawnopts, args
    // });
    const child = spawn('java', args, spawnopts);
    // Next, set up stdin/stdout pipes in case
    // of using -pipe mode
    let chunks;
    if (pipeMode) {
        // The input is either the inputBody or the
        // single named input file
        if (Array.isArray(options.inputFNs)
            && options.inputFNs.length === 1) {
            fs.createReadStream(options.inputFNs[0]).pipe(child.stdin);
        }
        else {
            child.stdin.write(options.inputBody);
            child.stdin.end();
        }
        // The output goes either to the named output
        // file or into a Buffer that is returned
        if (typeof options.outputFN === 'string'
            && options.outputFN.length >= 1) {
            child.stdout.pipe(fs.createWriteStream(options.outputFN));
        }
        else {
            chunks = [];
            child.stdout.on('data', (chunk) => {
                chunks.push(chunk);
            });
        }
    }
    // Finally, wait for the child to finish
    child.on('error', (err) => {
        console.error(`plantuml ERROR in child process ${err.message}`);
    });
    await new Promise((resolve, reject) => {
        child.on('close', (code) => {
            if (code === 0) {
                resolve(undefined);
            }
            else {
                reject(new Error(`plantuml fail with code ${code}`));
            }
        });
    });
    return chunks ? Buffer.concat(chunks) : undefined;
}
/**
 * Handle converting a single PlantUML diagram for
 * display in a document.
 *
 * The document description is either inline
 * to the <diagrams-plantuml> tag, or else a single
 * input file in the input-file attribute.
 *
 * There is a single output-file attribute to
 * for a file to receive as output.  This file
 * is written directly to the renderingOutput directory.
 *
 * This will support only PNG and SVG output formats.
 *
 * The output-file is a VPath specifying an
 * output directory location.
 *
 * isAbsolute(output-file) - means it is rooted
 * to the output directory.  Otherwise it is relative
 * to the dirname(metadata.document.path).
 *
 * When there is no output-file attribute, the diagram
 * is rendered as inline SVG embedded in the generated
 * HTML.  This mode requires the tsvg output format.
 */
class PlantUMLLocal extends akasha.CustomElement {
    get elementName() { return "diagrams-plantuml"; }
    async process($element, metadata, dirty) {
        const options = {
            // Using .text() eliminates HTML formatting.
            inputBody: $element.text(),
            inputFNs: undefined,
            outputFN: $element.attr('output-file')
        };
        // Ensure there is either an input-file
        // or an input body
        const inf = $element.attr('input-file');
        if (typeof inf === 'string') {
            options.inputFNs = [inf];
        }
        else if (Array.isArray(inf) && inf.length >= 1) {
            options.inputFNs = [inf[0]];
        }
        else {
            options.inputFNs = undefined;
        }
        if (typeof options.inputBody !== 'string'
            && (!Array.isArray(options.inputFNs)
                || options.inputFNs.length <= 0)) {
            throw new Error(`PlantUMLLocal one input file or inline diagram is required`);
        }
        let vpathIn;
        let fspathIn;
        if (Array.isArray(options.inputFNs) && options.inputFNs.length === 1) {
            if (typeof options.inputFNs[0] !== 'string') {
                throw new Error(`PlantUMLLocal no input file FN given in ${util.inspect(options.inputFNs)}`);
            }
            const inFN = options.inputFNs[0];
            if (path.isAbsolute(inFN)) {
                vpathIn = inFN;
            }
            else {
                let dir = path.dirname(metadata.document.path);
                vpathIn = path.normalize(path.join('/', dir, inFN));
            }
            const documents = this.config.akasha.filecache.documentsCache;
            const assets = this.config.akasha.filecache.assetsCache;
            const doc = await documents.find(vpathIn);
            let asset;
            if (!doc)
                asset = await assets.find(vpathIn);
            if (!doc && !asset) {
                throw new Error(`PlantUMLLocal no plantuml asset or document file  found for ${vpathIn}`);
            }
            if (doc)
                fspathIn = doc.fspath;
            else if (asset)
                fspathIn = asset.fspath;
        }
        // If there was an input file, record its full pathname
        // as the inputFNs entry
        if (fspathIn)
            options.inputFNs = [fspathIn];
        // With no output-file attribute, the rendered SVG is
        // inserted inline in the generated HTML rather than
        // written to a file and referenced with <img>.
        const inlineMode = typeof options.outputFN !== 'string'
            || options.outputFN.length < 1;
        let vpathOut;
        if (!inlineMode) {
            if (!path.isAbsolute(options.outputFN)) {
                let dir = path.dirname(metadata.document.path);
                vpathOut = path.normalize(path.join('/', dir, options.outputFN));
            }
            else {
                vpathOut = options.outputFN;
            }
            // Compute fspath for vpathOut
            const fspathOut = path.normalize(path.join(this.array.options.config.renderDestination, vpathOut));
            options.outputFN = fspathOut;
        }
        else {
            options.outputFN = undefined;
        }
        let width = $element.attr('width');
        // console.log(`width=${width}`);
        if (typeof width === 'string') {
            width = Number.parseFloat(width);
            if (isNaN(width)) {
                throw new Error(`PlantUMLLocal: width is not a number ${width}`);
            }
            options.width = width;
        }
        // console.log(options);
        const id = $element.attr('id');
        const clazz = $element.attr('class');
        const alt = $element.attr('alt');
        const title = $element.attr('title');
        const caption = $element.attr('caption');
        const cs = $element.attr('charset');
        if (isValidCharset(cs))
            options.charset = cs;
        options.darkmode = typeof $element.prop('darkmode') !== 'undefined';
        // options.debugsvek = $element.prop('debugsvek');
        // options.fileNameOverride = $element.attr('filename');
        const nbthread = $element.attr('nbthread');
        if (typeof nbthread === 'string')
            options.nbthread = nbthread;
        options.nometadata = typeof $element.prop('nometadata') !== 'undefined';
        // options.teps = $element.prop('teps');
        // options.thtml = $element.prop('thtml');
        // options.tlatex = $element.prop('tlatex');
        // options.tpdf = $element.prop('tpdf');
        options.tpng = typeof $element.prop('tpng') !== 'undefined';
        // options.tscxml = $element.prop('tscxml');
        options.tsvg = typeof $element.prop('tsvg') !== 'undefined';
        // options.ttxt = $element.prop('ttxt');
        // options.tutxt = $element.prop('tutxt');
        // options.tvdx = $element.prop('tvdx');
        // options.txmi = $element.prop('txmi');
        // options.verbose = $element.prop('verbose');
        if (options.tpng && options.tsvg) {
            throw new Error(`PlantUMLLocal cannot use both tpng and tsvg`);
        }
        if (!options.tpng && !options.tsvg) {
            throw new Error(`PlantUMLLocal must use one of tpng or tsvg`);
        }
        if (inlineMode && !options.tsvg) {
            throw new Error(`PlantUMLLocal without output-file renders inline SVG, which requires tsvg`);
        }
        const buf = await doPlantUML(options);
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
        // The diagrams-plantuml class carries the stylesheet
        // rules constraining the diagram to its container.
        const Tclazz = typeof clazz === 'string'
            ? `class="diagrams-plantuml ${encode(clazz)}"`
            : `class="diagrams-plantuml"`;
        const Twidth = typeof width === 'number'
            ? `width="${width.toString()}"`
            : '';
        // In inline mode there is no <img> to carry the alt,
        // title, and width attributes.  The alt text becomes
        // an aria-label on the SVG root, the width becomes a
        // width style on the SVG root, and the title lands on
        // the <figure>.  The XML prologue emitted by PlantUML
        // is stripped for embedding in HTML.
        const ret = inlineMode
            ? `
        <figure ${Tid} ${Tclazz} ${Ttitle}>
        ${adaptInlineSvg(buf.toString('utf-8').replace(/^\s*<\?xml[^>]*\?>\s*/, ''), typeof width === 'number' ? width : undefined, typeof alt === 'string' ? alt : undefined)}
        ${cap}
        </figure>
        `
            : `
        <figure ${Tid} ${Tclazz}>
        <img src="${encode(vpathOut)}" ${Talt} ${Ttitle} ${Twidth}/>
        ${cap}
        </figure>
        `;
        // console.log(ret);
        return ret;
    }
}
export function isValidCharset(charset) {
    if (typeof charset !== 'string') {
        return false;
    }
    const cs = charset.toLowerCase();
    if (typeof cs !== 'string'
        || (cs !== 'utf8' && cs !== 'utf-8'
            && cs !== 'utf16' && cs !== 'utf-16'
            && cs !== 'utf16be' && cs !== 'utf-16be'
            && cs !== 'utf16le' && cs !== 'utf-16le'
            && cs !== 'utf32' && cs !== 'utf-32'
            && cs !== 'utf32le' && cs !== 'utf-32le')) {
        return false;
    }
    return true;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9saWIvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBRUEsT0FBTyxJQUFJLE1BQU0sV0FBVyxDQUFDO0FBQzdCLE9BQU8sRUFBRSxFQUFFLEVBQUUsUUFBUSxJQUFJLEdBQUcsRUFBRSxNQUFNLFNBQVMsQ0FBQztBQUM5QyxPQUFPLElBQUksTUFBTSxXQUFXLENBQUM7QUFDN0IsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUMzQyxPQUFPLEVBQXVCLEtBQUssRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ2hFLE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDckMsT0FBTyxFQUFFLE1BQU0sRUFBaUIsTUFBTSxjQUFjLENBQUE7QUFFcEQsT0FBTyxFQUNILHVCQUF1QixFQUN2Qix3QkFBd0IsRUFFM0IsTUFBTSxrQkFBa0IsQ0FBQztBQUUxQixNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQztBQUV0QywrREFBK0Q7QUFDL0QsZ0VBQWdFO0FBQ2hFLG1FQUFtRTtBQUNuRSwwREFBMEQ7QUFFMUQsTUFBTSxpQkFBaUIsR0FDbkIsc0tBQXNLLENBQUM7QUFFM0ssTUFBTSxVQUFVLEdBQUcsMkJBQTJCLENBQUM7QUFFL0MsT0FBTyxLQUFLLE1BQU0sTUFBTSxjQUFjLENBQUM7QUFDdkMsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3JELE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUM7QUFFbkMsT0FBTyxFQUNILGNBQWMsRUFDZCxTQUFTLEVBQ1Qsb0JBQW9CLEVBQ3BCLGdCQUFnQixFQUNuQixNQUFNLHFCQUFxQixDQUFDO0FBRTdCLE9BQU8sRUFFSCxTQUFTLEVBQ1QsZ0JBQWdCLEVBQ2hCLG9CQUFvQixFQUN2QixNQUFNLHFCQUFxQixDQUFD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SSxDQUFDO0FBQ2hCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJcblxuaW1wb3J0IHBhdGggZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCBmcywgeyBwcm9taXNlcyBhcyBmc3AgfSBmcm9tICdub2RlOmZzJztcbmltcG9ydCB1dGlsIGZyb20gJ25vZGU6dXRpbCc7XG5pbXBvcnQgeyBkZWZsYXRlUmF3U3luYyB9IGZyb20gJ25vZGU6emxpYic7XG5pbXBvcnQgeyBleGVjU3luYywgc3Bhd25TeW5jLCBzcGF3biB9IGZyb20gJ25vZGU6Y2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQge2VuY29kZX0gZnJvbSAnaHRtbC1lbnRpdGllcyc7XG5pbXBvcnQgeyByZW5kZXIsIFBpbnRvcmFDb25maWcgfSBmcm9tICdAcGludG9yYS9jbGknXG5cbmV4cG9ydCB7XG4gICAgTWFya2Rvd25JVE1lcm1haWRQbHVnaW4sXG4gICAgTWFya2Rvd25JVFBsYW50VU1MUGx1Z2luLFxuICAgIE1lcm1haWRQbHVnaW5PcHRpb25zXG59IGZyb20gJy4vbWFya2Rvd24taXQuanMnO1xuXG5jb25zdCBfX2Rpcm5hbWUgPSBpbXBvcnQubWV0YS5kaXJuYW1lO1xuXG4vLyBUaGUgUGxhbnRVTUwgSkFSIGlzIG5vIGxvbmdlciBkaXN0cmlidXRlZCB3aXRoIHRoaXMgcGFja2FnZS5cbi8vIFJlbmRlcmluZyBQbGFudFVNTCByZXF1aXJlcyB0aGUgdXNlciB0byBlaXRoZXIgcnVuIGEgUGxhbnRVTUxcbi8vIHNlcnZlciAoUExBTlRVTUxfU0VSVkVSX1VSTCkgb3IgZG93bmxvYWQgdGhlIEpBUiAoUExBTlRVTUxfSkFSKS5cbi8vIFNlZSB0aGUgUkVBRE1FIHNlY3Rpb24gXCJTZXR0aW5nIHVwIFBsYW50VU1MIHJlbmRlcmluZ1wiLlxuXG5jb25zdCBwbGFudHVtbFNldHVwSGVscCA9XG4gICAgYFNlZSB0aGUgXCJTZXR0aW5nIHVwIFBsYW50VU1MIHJlbmRlcmluZ1wiIHNlY3Rpb24gb2YgdGhlIEBha2FzaGFjbXMvZGlhZ3JhbS1tYWtlcnMgUkVBRE1FOiBodHRwczovL2dpdGh1Yi5jb20vYWthc2hhY21zL3BsdWdpbnMtZGlhZ3JhbXMjc2V0dGluZy11cC1wbGFudHVtbC1yZW5kZXJpbmdgO1xuXG5jb25zdCBwbHVnaW5OYW1lID0gJ0Bha2FzaGFjbXMvZGlhZ3JhbS1tYWtlcnMnO1xuXG5pbXBvcnQgKiBhcyBha2FzaGEgZnJvbSAnYWthc2hhcmVuZGVyJztcbmltcG9ydCB7IFBsdWdpbiB9IGZyb20gJ2FrYXNoYXJlbmRlci9kaXN0L1BsdWdpbi5qcyc7XG5jb25zdCBtYWhhYmh1dGEgPSBha2FzaGEubWFoYWJodXRhO1xuXG5pbXBvcnQge1xuICAgIGFkYXB0SW5saW5lU3ZnLFxuICAgIGRvTWVybWFpZCxcbiAgICByZWdpc3Rlck1lcm1haWRGb250cyxcbiAgICByZW5kZXJNZXJtYWlkU3ZnXG59IGZyb20gJy4vcmVuZGVyLW1lcm1haWQuanMnO1xuXG5leHBvcnQge1xuICAgIE1lcm1haWRSZW5kZXJPcHRpb25zLFxuICAgIGRvTWVybWFpZCxcbiAgICByZW5kZXJNZXJtYWlkU3ZnLFxuICAgIHJlZ2lzdGVyTWVybWFpZEZvbnRzXG59IGZyb20gJy4vcmVuZGVyLW1lcm1haWQuanMnO1xuXG5leHBvcnQgdHlwZSBEaWFncmFtc1BsdWdpbk9wdGlvbnMgPSB7XG4gICAgLyoqXG4gICAgICogT3B0aW9ucyBmb3IgcmVuZGVyaW5nIDxkaWFncmFtcy1tZXJtYWlkPiBlbGVtZW50c1xuICAgICAqL1xuICAgIG1lcm1haWQ/OiB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGaWxlIG5hbWUgb2YgYSBKU09OIGNvbmZpZ3VyYXRpb24gZmlsZSB1c2luZyB0aGUgc2FtZVxuICAgICAgICAgKiBzY2hlbWEgYXMgdGhlIG1tZHIgLS1jb25maWcgZmlsZSAodGhlbWUsIHRoZW1lVmFyaWFibGVzLFxuICAgICAgICAgKiBmbG93Y2hhcnQsIC4uLikuICBSZWFkIG9uY2UgYXQgY29uZmlndXJhdGlvbiB0aW1lLlxuICAgICAgICAgKi9cbiAgICAgICAgY29uZmlnRk4/OiBzdHJpbmc7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEpTT04gY29uZmlndXJhdGlvbiBzdHJpbmcgd2l0aCB0aGUgc2FtZSBzY2hlbWEuICBUYWtlc1xuICAgICAgICAgKiBwcmVjZWRlbmNlIG92ZXIgY29uZmlnRk4uXG4gICAgICAgICAqL1xuICAgICAgICBjb25maWdKU09OPzogc3RyaW5nO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUaGVtZSBwcmVzZXQgbmFtZTogZGVmYXVsdCwgZGFyaywgZm9yZXN0LCBuZXV0cmFsLCBtb2Rlcm4uXG4gICAgICAgICAqIFRha2VzIHByZWNlZGVuY2Ugb3ZlciB0aGUgY29uZmlnJ3MgdGhlbWUgbmFtZS5cbiAgICAgICAgICovXG4gICAgICAgIHRoZW1lUHJlc2V0Pzogc3RyaW5nO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUVEYvT1RGIGZvbnQgZmlsZXMgdG8gcmVnaXN0ZXIgZm9yIHRleHQgbWVhc3VyZW1lbnQuXG4gICAgICAgICAqIFdoZW4gb21pdHRlZCwgYSBjb21tb24gc3lzdGVtIGZvbnQgaXMgdXNlZCBpZiBmb3VuZC5cbiAgICAgICAgICovXG4gICAgICAgIGZvbnRGTnM/OiBzdHJpbmdbXTtcbiAgICB9O1xufTtcblxuZXhwb3J0IGNsYXNzIERpYWdyYW1zUGx1Z2luIGV4dGVuZHMgUGx1Z2luIHtcblxuICAgICNjb25maWc7XG5cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIocGx1Z2luTmFtZSk7XG4gICAgfVxuXG4gICAgY29uZmlndXJlKGNvbmZpZywgb3B0aW9ucz86IERpYWdyYW1zUGx1Z2luT3B0aW9ucykge1xuICAgICAgICB0aGlzLiNjb25maWcgPSBjb25maWc7XG4gICAgICAgIC8vIHRoaXMuY29uZmlnID0gY29uZmlnO1xuICAgICAgICB0aGlzLmFrYXNoYSA9IGNvbmZpZy5ha2FzaGE7XG4gICAgICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnMgPyBvcHRpb25zIDoge307XG4gICAgICAgIHRoaXMub3B0aW9ucy5jb25maWcgPSBjb25maWc7XG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMubWVybWFpZD8uY29uZmlnRk5cbiAgICAgICAgICYmICF0aGlzLm9wdGlvbnMubWVybWFpZC5jb25maWdKU09OXG4gICAgICAgICkge1xuICAgICAgICAgICAgdGhpcy5vcHRpb25zLm1lcm1haWQuY29uZmlnSlNPTiA9IGZzLnJlYWRGaWxlU3luYyhcbiAgICAgICAgICAgICAgICB0aGlzLm9wdGlvbnMubWVybWFpZC5jb25maWdGTiwgJ3V0Zi04Jyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uZmlnLmFkZE1haGFiaHV0YShtYWhhYmh1dGFBcnJheSh0aGlzLm9wdGlvbnMsIGNvbmZpZywgdGhpcy5ha2FzaGEsIHRoaXMpKTtcbiAgICAgICAgbGV0IG1vZHVsZURpcm5hbWUgPSBpbXBvcnQubWV0YS5kaXJuYW1lO1xuICAgICAgICBjb25maWcuYWRkQXNzZXRzRGlyKHBhdGguam9pbihtb2R1bGVEaXJuYW1lLCAnLi4nLCAnYXNzZXRzJykpO1xuICAgICAgICBjb25maWcuYWRkU3R5bGVzaGVldCh7XG4gICAgICAgICAgICBocmVmOiAnL3ZlbmRvci9AYWthc2hhY21zL2RpYWdyYW0tbWFrZXJzL3N0eWxlLmNzcydcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZ2V0IGNvbmZpZygpIHsgcmV0dXJuIHRoaXMuI2NvbmZpZzsgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gbWFoYWJodXRhQXJyYXkoXG4gICAgb3B0aW9ucyxcbiAgICBjb25maWc/OiBha2FzaGEuQ29uZmlndXJhdGlvbixcbiAgICBha2FzaGE/OiBhbnksXG4gICAgcGx1Z2luPzogUGx1Z2luXG4pIHtcbiAgICBsZXQgcmV0ID0gbmV3IG1haGFiaHV0YS5NYWhhZnVuY0FycmF5KHBsdWdpbk5hbWUsIG9wdGlvbnMpO1xuICAgIHJldC5hZGRNYWhhZnVuYyhuZXcgTWVybWFpZExvY2FsKGNvbmZpZywgYWthc2hhLCBwbHVnaW4pKTtcbiAgICByZXQuYWRkTWFoYWZ1bmMobmV3IFBsYW50VU1MTG9jYWwoY29uZmlnLCBha2FzaGEsIHBsdWdpbikpO1xuICAgIHJldC5hZGRNYWhhZnVuYyhuZXcgUGludG9yYUxvY2FsKGNvbmZpZywgYWthc2hhLCBwbHVnaW4pKTtcbiAgICByZXR1cm4gcmV0O1xufTtcblxuY2xhc3MgTWVybWFpZExvY2FsIGV4dGVuZHMgYWthc2hhLkN1c3RvbUVsZW1lbnQge1xuXHRnZXQgZWxlbWVudE5hbWUoKSB7IHJldHVybiBcImRpYWdyYW1zLW1lcm1haWRcIjsgfVxuXG4gICAgYXN5bmMgcHJvY2VzcygkZWxlbWVudCwgbWV0YWRhdGEsIGRpcnR5OiBGdW5jdGlvbikge1xuXG4gICAgICAgIGxldCBjb2RlID0gJGVsZW1lbnQudGV4dCgpO1xuICAgICAgICBjb25zdCBvdXRwdXRGTiA9ICRlbGVtZW50LmF0dHIoJ291dHB1dC1maWxlJyk7XG4gICAgICAgIGNvbnN0IGluZiA9ICAkZWxlbWVudC5hdHRyKCdpbnB1dC1maWxlJyk7XG5cbiAgICAgICAgLy8gY29uc29sZS5sb2coYE1lcm1haWRMb2NhbCAke2luZn0gPT0+ICR7b3V0cHV0Rk59YCk7XG5cbiAgICAgICAgbGV0IHZwYXRoSW47XG4gICAgICAgIGxldCBmc3BhdGhJbjtcbiAgICAgICAgaWYgKHR5cGVvZiBpbmYgPT09ICdzdHJpbmcnXG4gICAgICAgICAmJiBpbmYubGVuZ3RoID49IDFcbiAgICAgICAgKSB7XG4gICAgICAgICAgICBpZiAocGF0aC5pc0Fic29sdXRlKGluZikpIHtcbiAgICAgICAgICAgICAgICB2cGF0aEluID0gaW5mO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBsZXQgZGlyID0gcGF0aC5kaXJuYW1lKG1ldGFkYXRhLmRvY3VtZW50LnBhdGgpO1xuICAgICAgICAgICAgICAgIHZwYXRoSW4gPSBwYXRoLm5vcm1hbGl6ZShcbiAgICAgICAgICAgICAgICAgICAgcGF0aC5qb2luKCcvJywgZGlyLCBpbmYpXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjb25zdCBkb2N1bWVudHMgPSB0aGlzLmNvbmZpZy5ha2FzaGEuZmlsZWNhY2hlLmRvY3VtZW50c0NhY2hlO1xuICAgICAgICBjb25zdCBhc3NldHMgPSB0aGlzLmFrYXNoYS5maWxlY2FjaGUuYXNzZXRzQ2FjaGU7XG5cbiAgICAgICAgLy8gY29uc29sZS5sb2coYE1lcm1haWRMb2NhbCAke2luZn0gJHt2cGF0aElufWApO1xuXG4gICAgICAgIGNvbnN0IGRvYyA9IHZwYXRoSW5cbiAgICAgICAgICAgID8gYXdhaXQgZG9jdW1lbnRzLmZpbmQodnBhdGhJbilcbiAgICAgICAgICAgIDogdW5kZWZpbmVkO1xuXG4gICAgICAgIGxldCBhc3NldDtcbiAgICAgICAgaWYgKCFkb2MpIGFzc2V0ID0gdnBhdGhJblxuICAgICAgICAgICAgPyBhd2FpdCBhc3NldHMuZmluZCh2cGF0aEluKVxuICAgICAgICAgICAgOiB1bmRlZmluZWQ7XG4gICBcbiAgICAgICAgaWYgKGRvYykgZnNwYXRoSW4gPSBkb2MuZnNwYXRoO1xuICAgICAgICBlbHNlIGlmIChhc3NldCkgZnNwYXRoSW4gPSBhc3NldC5mc3BhdGg7XG5cbiAgICAgICAgLy8gY29uc29sZS5sb2coYE1lcm1haWRMb2NhbCAke2luZn0gJHt2cGF0aElufSAke2ZzcGF0aElufWApO1xuXG4gICAgICAgIGlmICh0eXBlb2YgZnNwYXRoSW4gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBjb2RlID0gYXdhaXQgZnNwLnJlYWRGaWxlKGZzcGF0aEluLCAndXRmLTgnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgY29kZSAhPT0gJ3N0cmluZycgfHwgY29kZS5sZW5ndGggPCAxKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGRpYWdyYW1zLW1lcm1haWQgcmVxdWlyZXMgYW4gaW5wdXQtZmlsZSBvciBhbiBpbmxpbmUgZGlhZ3JhbSBib2R5YCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBjb25zb2xlLmxvZyhgTWVybWFpZExvY2FsICR7aW5mfSAke3ZwYXRoSW59ICR7ZnNwYXRoSW59IHJlYWQgY29kZSAke2NvZGV9YCk7XG5cbiAgICAgICAgY29uc3QgbWVybWFpZE9wdGlvbnMgPSB0aGlzLmFycmF5Lm9wdGlvbnM/Lm1lcm1haWQgPz8ge307XG5cbiAgICAgICAgLy8gV2l0aCBubyBvdXRwdXQtZmlsZSBhdHRyaWJ1dGUsIHRoZSByZW5kZXJlZCBTVkcgaXNcbiAgICAgICAgLy8gaW5zZXJ0ZWQgaW5saW5lIGluIHRoZSBnZW5lcmF0ZWQgSFRNTCByYXRoZXIgdGhhblxuICAgICAgICAvLyB3cml0dGVuIHRvIGEgZmlsZSBhbmQgcmVmZXJlbmNlZCB3aXRoIDxpbWc+LlxuICAgICAgICBjb25zdCBpbmxpbmVNb2RlID0gdHlwZW9mIG91dHB1dEZOICE9PSAnc3RyaW5nJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfHwgb3V0cHV0Rk4ubGVuZ3RoIDwgMTtcblxuICAgICAgICBsZXQgc3ZnO1xuICAgICAgICBsZXQgZnNwYXRoT3V0O1xuICAgICAgICBpZiAoIWlubGluZU1vZGUpIHtcbiAgICAgICAgICAgIGlmICghb3V0cHV0Rk4uZW5kc1dpdGgoJy5zdmcnKSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgZGlhZ3JhbXMtbWVybWFpZCBtdXN0IGhhdmUgb3V0cHV0LWZpbGUgd2l0aCAuc3ZnIGV4dGVuc2lvbiAtIG1lcm1haWQtd2FzbS1yZW5kZXJlciBkb2VzIG5vdCBzdXBwb3J0IC5wbmdgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZnNwYXRoT3V0ID0gcGF0aC5qb2luKFxuICAgICAgICAgICAgICAgIHRoaXMuY29uZmlnLnJlbmRlckRlc3RpbmF0aW9uLCBvdXRwdXRGTlxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgYXdhaXQgZnNwLm1rZGlyKHBhdGguZGlybmFtZShmc3BhdGhPdXQpLCB7XG4gICAgICAgICAgICAgICAgcmVjdXJzaXZlOiB0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAoaW5saW5lTW9kZSkge1xuICAgICAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KG1lcm1haWRPcHRpb25zLmZvbnRGTnMpXG4gICAgICAgICAgICAgICAgICYmIG1lcm1haWRPcHRpb25zLmZvbnRGTnMubGVuZ3RoID49IDFcbiAgICAgICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICAgICAgcmVnaXN0ZXJNZXJtYWlkRm9udHMobWVybWFpZE9wdGlvbnMuZm9udEZOcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN2ZyA9IHJlbmRlck1lcm1haWRTdmcoY29kZSxcbiAgICAgICAgICAgICAgICAgICAgbWVybWFpZE9wdGlvbnMuY29uZmlnSlNPTixcbiAgICAgICAgICAgICAgICAgICAgbWVybWFpZE9wdGlvbnMudGhlbWVQcmVzZXQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhd2FpdCBkb01lcm1haWQoe1xuICAgICAgICAgICAgICAgICAgICBjb2RlLFxuICAgICAgICAgICAgICAgICAgICBvdXRwdXRGTjogZnNwYXRoT3V0LFxuICAgICAgICAgICAgICAgICAgICBjb25maWdKU09OOiBtZXJtYWlkT3B0aW9ucy5jb25maWdKU09OLFxuICAgICAgICAgICAgICAgICAgICB0aGVtZVByZXNldDogbWVybWFpZE9wdGlvbnMudGhlbWVQcmVzZXQsXG4gICAgICAgICAgICAgICAgICAgIGZvbnRGTnM6IG1lcm1haWRPcHRpb25zLmZvbnRGTnNcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGBNZXJtYWlkIHRocmV3IGVycm9yICR7ZXJyLm1lc3NhZ2V9XG5JbnB1dDogJHtpbmZ9ICR7ZnNwYXRoSW59IE91dHB1dDogJHtvdXRwdXRGTn0gJHtmc3BhdGhPdXR9XG4ke2NvZGV9XG5gKTtcbiAgICAgICAgICAgIHJldHVybiBgXG48ZGl2IGNsYXNzPVwiZGlhZ3JhbXMtcmVuZGVyLWVycm9yXCI+XG48c3BhbiBjbGFzcz1cImRpYWdyYW1zLXRpdGxlXCI+TWVybWFpZCB0aHJldyBlcnJvciAke2VuY29kZShlcnIubWVzc2FnZSl9PC9zcGFuPlxuPHNwYW4gY2xhc3M9XCJkaWFncmFtcy1lcnJvci1maWxlc1wiPlxuPGI+SW5wdXQ6PC9iPiAke2luZn0gJHtmc3BhdGhJbn08YnIvPlxuPGI+T3V0cHV0OjwvYj4gJHtvdXRwdXRGTn0gJHtmc3BhdGhPdXR9PC9zcGFuPlxuPGNvZGUgY2xhc3M9XCJkaWFncmFtcy1lcnJvci1pbnB1dFwiPjxwcmU+JHtlbmNvZGUoY29kZSl9PC9wcmU+PC9jb2RlPlxuPC9kaXY+XG5gO1xuICAgICAgICAgICAgLy8gdGhyb3cgbmV3IEVycm9yKGBNZXJtYWlkIHRocmV3IGVycm9yICR7ZXJyLm1lc3NhZ2V9YCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBlbHNlXG4gICAgICAgIGxldCB3aWR0aCA9ICRlbGVtZW50LmF0dHIoJ3dpZHRoJyk7XG4gICAgICAgIGlmICh0eXBlb2Ygd2lkdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICB3aWR0aCA9IE51bWJlci5wYXJzZUZsb2F0KHdpZHRoKTtcbiAgICAgICAgICAgIGlmIChpc05hTih3aWR0aCkpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGRpYWdyYW1zLW1lcm1haWQ6IHdpZHRoIGlzIG5vdCBhIG51bWJlciAke3dpZHRofWApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgaWQgPSAkZWxlbWVudC5hdHRyKCdpZCcpO1xuICAgICAgICBjb25zdCBjbGF6eiA9ICRlbGVtZW50LmF0dHIoJ2NsYXNzJyk7XG4gICAgICAgIGNvbnN0IGFsdCA9ICRlbGVtZW50LmF0dHIoJ2FsdCcpO1xuICAgICAgICBjb25zdCB0aXRsZSA9ICRlbGVtZW50LmF0dHIoJ3RpdGxlJyk7XG4gICAgICAgIGNvbnN0IGNhcHRpb24gPSAkZWxlbWVudC5hdHRyKCdjYXB0aW9uJyk7XG5cbiAgICAgICAgY29uc3QgY2FwID0gdHlwZW9mIGNhcHRpb24gPT09ICdzdHJpbmcnXG4gICAgICAgICAgICA/IGA8ZmlnY2FwdGlvbj4ke2VuY29kZShjYXB0aW9uKX08L2ZpZ2NhcHRpb24+YFxuICAgICAgICAgICAgOiAnJztcbiAgICAgICAgY29uc3QgVGFsdCA9IHR5cGVvZiBhbHQgPT09ICdzdHJpbmcnXG4gICAgICAgICAgICA/IGBhbHQ9XCIke2VuY29kZShhbHQpfVwiYFxuICAgICAgICAgICAgOiAnJztcbiAgICAgICAgY29uc3QgVHRpdGxlID0gdHlwZW9mIHRpdGxlID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgPyBgdGl0bGU9XCIke2VuY29kZSh0aXRsZSl9XCJgXG4gICAgICAgICAgICA6ICcnO1xuICAgICAgICBjb25zdCBUaWQgPSB0eXBlb2YgaWQgPT09ICdzdHJpbmcnXG4gICAgICAgICAgICA/IGBpZD1cIiR7ZW5jb2RlKGlkKX1cImBcbiAgICAgICAgICAgIDogJyc7XG4gICAgICAgIC8vIFRoZSBkaWFncmFtcy1tZXJtYWlkIGNsYXNzIGNhcnJpZXMgdGhlIHN0eWxlc2hlZXQgcnVsZXNcbiAgICAgICAgLy8gY29uc3RyYWluaW5nIHRoZSBkaWFncmFtIHRvIGl0cyBjb250YWluZXIgKGlzc3VlICMxOSkuXG4gICAgICAgIGNvbnN0IFRjbGF6eiA9IHR5cGVvZiBjbGF6eiA9PT0gJ3N0cmluZydcbiAgICAgICAgICAgID8gYGNsYXNzPVwiZGlhZ3JhbXMtbWVybWFpZCAke2VuY29kZShjbGF6eil9XCJgXG4gICAgICAgICAgICA6IGBjbGFzcz1cImRpYWdyYW1zLW1lcm1haWRcImA7XG4gICAgICAgIGNvbnN0IFR3aWR0aCA9IHR5cGVvZiB3aWR0aCA9PT0gJ251bWJlcidcbiAgICAgICAgICAgID8gYHdpZHRoPVwiJHt3aWR0aC50b1N0cmluZygpfVwiYFxuICAgICAgICAgICAgOiAnJztcblxuICAgICAgICAvLyBJbiBpbmxpbmUgbW9kZSB0aGVyZSBpcyBubyA8aW1nPiB0byBjYXJyeSB0aGUgYWx0LCB0aXRsZSxcbiAgICAgICAgLy8gYW5kIHdpZHRoIGF0dHJpYnV0ZXMuICBUaGUgYWx0IHRleHQgYmVjb21lcyBhbiBhcmlhLWxhYmVsXG4gICAgICAgIC8vIG9uIHRoZSBTVkcgcm9vdCwgdGhlIHdpZHRoIGJlY29tZXMgYSB3aWR0aCBzdHlsZSBvbiB0aGVcbiAgICAgICAgLy8gU1ZHIHJvb3QsIGFuZCB0aGUgdGl0bGUgbGFuZHMgb24gdGhlIDxmaWd1cmU+LlxuICAgICAgICBjb25zdCByZXQgPSBpbmxpbmVNb2RlXG4gICAgICAgICAgICA/IGBcbiAgICAgICAgPGZpZ3VyZSAke1RpZH0gJHtUY2xhenp9ICR7VHRpdGxlfT5cbiAgICAgICAgJHthZGFwdElubGluZVN2ZyhzdmcsXG4gICAgICAgICAgICB0eXBlb2Ygd2lkdGggPT09ICdudW1iZXInID8gd2lkdGggOiB1bmRlZmluZWQsXG4gICAgICAgICAgICB0eXBlb2YgYWx0ID09PSAnc3RyaW5nJyA/IGFsdCA6IHVuZGVmaW5lZCl9XG4gICAgICAgICR7Y2FwfVxuICAgICAgICA8L2ZpZ3VyZT5cbiAgICAgICAgYFxuICAgICAgICAgICAgOiBgXG4gICAgICAgIDxmaWd1cmUgJHtUaWR9ICR7VGNsYXp6fT5cbiAgICAgICAgPGltZyBzcmM9XCIke2VuY29kZShvdXRwdXRGTil9XCIgJHtUYWx0fSAke1R0aXRsZX0gJHtUd2lkdGh9Lz5cbiAgICAgICAgJHtjYXB9XG4gICAgICAgIDwvZmlndXJlPlxuICAgICAgICBgO1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhgTWVybWFpZExvY2FsIHJldHVybmluZyBgLCB7XG4gICAgICAgIC8vICAgICBpZDogaWQsXG4gICAgICAgIC8vICAgICBUaWQ6IFRpZCxcbiAgICAgICAgLy8gICAgIGlucHV0RmlsZTogaW5mLFxuICAgICAgICAvLyAgICAgb3V0cHV0Rk46IG91dHB1dEZOLFxuICAgICAgICAvLyAgICAgcmV0OiByZXRcbiAgICAgICAgLy8gfSk7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGBNZXJtYWlkTG9jYWwgcmV0dXJuaW5nICR7cmV0fWApO1xuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH1cbn1cblxuXG5cbmV4cG9ydCB0eXBlIFBpbnRvcmFSZW5kZXJPcHRpb25zID0ge1xuICAgIC8qKlxuICAgICAqIHBpbnRvcmEgRFNMIGNvZGUgdG8gcmVuZGVyXG4gICAgICovXG4gICAgY29kZTogc3RyaW5nXG4gICAgZGV2aWNlUGl4ZWxSYXRpbz86IG51bWJlciB8IG51bGxcbiAgICAvKipcbiAgICAgKiBUeXBlIGZvciB0aGUgb3V0cHV0IGZpbGVcbiAgICAgKiBcbiAgICAvLyBpbWFnZS9zdmcreG1sXG4gICAgLy8gaW1hZ2UvanBlZ1xuICAgIC8vIGltYWdlL3BuZ1xuICAgICAqL1xuICAgIG1pbWVUeXBlPzogc3RyaW5nXG4gICAgLyoqXG4gICAgICogQXNzaWduIGV4dHJhIGJhY2tncm91bmQgY29sb3JcbiAgICAgKi9cbiAgICBiYWNrZ3JvdW5kQ29sb3I/OiBzdHJpbmdcbiAgICBwaW50b3JhQ29uZmlnPzogUGFydGlhbDxQaW50b3JhQ29uZmlnPlxuICAgIC8qKlxuICAgICAqIHdpZHRoIG9mIHRoZSBvdXRwdXQsIGhlaWdodCB3aWxsIGJlIGNhbGN1bGF0ZWQgYWNjb3JkaW5nIHRvIHRoZSBkaWFncmFtIGNvbnRlbnQgcmF0aW9cbiAgICAgKi9cbiAgICB3aWR0aD86IG51bWJlclxuICAgIC8qKlxuICAgICAqIFdoZXRoZXIgd2Ugc2hvdWxkIHJ1biByZW5kZXIgaW4gYSBzdWJwcm9jZXNzIHJhdGhlciBpbiBjdXJyZW50IHByb2Nlc3MuXG4gICAgICogSWYgeW91IGNhbGwgdGhlIGByZW5kZXJgIGZ1bmN0aW9uLCBieSBkZWZhdWx0IHRoaXMgaXMgdHJ1ZSwgdG8gYXZvaWQgcG9sbHV0aW5nIHRoZSBnbG9iYWwgZW52aXJvbm1lbnQuXG4gICAgICovXG4gICAgcmVuZGVySW5TdWJwcm9jZXNzPzogYm9vbGVhblxuXG4gICAgb3V0cHV0Rk46IHN0cmluZztcbn07XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkb1BpbnRvcmEoXG4gICAgb3B0aW9uczogUGludG9yYVJlbmRlck9wdGlvbnNcbik6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHJlbmRlck9wdHMgPSBzdHJ1Y3R1cmVkQ2xvbmUob3B0aW9ucyk7XG4gICAgZGVsZXRlIHJlbmRlck9wdHMub3V0cHV0Rk47XG5cbiAgICBjb25zdCBidWYgPSBhd2FpdCByZW5kZXIocmVuZGVyT3B0cyk7XG5cbiAgICBpZiAob3B0aW9ucy5vdXRwdXRGTikge1xuICAgICAgICBhd2FpdCBmc3Aud3JpdGVGaWxlKG9wdGlvbnMub3V0cHV0Rk4sIGJ1Zik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyBvdXRwdXQgZmlsZSBGTiAke3V0aWwuaW5zcGVjdChvcHRpb25zKX1gKTtcbiAgICB9XG59XG5cbmNsYXNzIFBpbnRvcmFMb2NhbCBleHRlbmRzIGFrYXNoYS5DdXN0b21FbGVtZW50IHtcblx0Z2V0IGVsZW1lbnROYW1lKCkgeyByZXR1cm4gXCJkaWFncmFtcy1waW50b3JhXCI7IH1cblxuICAgIGFzeW5jIHByb2Nlc3MoJGVsZW1lbnQsIG1ldGFkYXRhLCBkaXJ0eTogRnVuY3Rpb24pIHtcbiAgICAgICAgY29uc3Qgb3B0aW9uczogUGludG9yYVJlbmRlck9wdGlvbnMgPSB7XG4gICAgICAgICAgICBjb2RlOiAkZWxlbWVudC50ZXh0KCksXG4gICAgICAgICAgICBvdXRwdXRGTjogJGVsZW1lbnQuYXR0cignb3V0cHV0LWZpbGUnKVxuICAgICAgICB9O1xuXG4gICAgICAgIGxldCB2cGF0aEluO1xuICAgICAgICBsZXQgZnNwYXRoSW47XG4gICAgICAgIGNvbnN0IGluZiA9ICAkZWxlbWVudC5hdHRyKCdpbnB1dC1maWxlJyk7XG4gICAgICAgIGlmICh0eXBlb2YgaW5mID09PSAnc3RyaW5nJ1xuICAgICAgICAgJiYgaW5mLmxlbmd0aCA+PSAxXG4gICAgICAgICkge1xuICAgICAgICAgICAgaWYgKHBhdGguaXNBYnNvbHV0ZShpbmYpKSB7XG4gICAgICAgICAgICAgICAgdnBhdGhJbiA9IGluZjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbGV0IGRpciA9IHBhdGguZGlybmFtZShtZXRhZGF0YS5kb2N1bWVudC5wYXRoKTtcbiAgICAgICAgICAgICAgICB2cGF0aEluID0gcGF0aC5ub3JtYWxpemUoXG4gICAgICAgICAgICAgICAgICAgIHBhdGguam9pbignLycsIGRpciwgaW5mKVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBjb25zb2xlLmxvZyhgUGludG9yYUxvY2FsIGlucHV0LWZpbGUgJHt1dGlsLmluc3BlY3QoaW5mKX0gdnBhdGhJbiAke3V0aWwuaW5zcGVjdCh2cGF0aEluKX1gKTtcblxuICAgICAgICBjb25zdCBkb2N1bWVudHMgPSB0aGlzLmNvbmZpZy5ha2FzaGEuZmlsZWNhY2hlLmRvY3VtZW50c0NhY2hlO1xuICAgICAgICBjb25zdCBhc3NldHMgPSB0aGlzLmFrYXNoYS5maWxlY2FjaGUuYXNzZXRzQ2FjaGU7XG4gICAgICAgIGNvbnN0IGRvYyA9IHZwYXRoSW5cbiAgICAgICAgICAgID8gYXdhaXQgZG9jdW1lbnRzLmZpbmQodnBhdGhJbilcbiAgICAgICAgICAgIDogdW5kZWZpbmVkO1xuICAgICAgICBsZXQgYXNzZXQ7XG5cbiAgICAgICAgaWYgKCFkb2MpIGFzc2V0ID0gdnBhdGhJblxuICAgICAgICAgICAgPyBhd2FpdCBhc3NldHMuZmluZCh2cGF0aEluKVxuICAgICAgICAgICAgOiB1bmRlZmluZWQ7XG4gICBcbiAgICAgICAgaWYgKGRvYykgZnNwYXRoSW4gPSBkb2MuZnNwYXRoO1xuICAgICAgICBlbHNlIGlmIChhc3NldCkgZnNwYXRoSW4gPSBhc3NldC5mc3BhdGg7XG5cbiAgICAgICAgaWYgKHR5cGVvZiBmc3BhdGhJbiA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5jb2RlID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgICYmIG9wdGlvbnMuY29kZS5sZW5ndGggPj0gMVxuICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBkaWFncmFtcy1waW50b3JhIC0gZWl0aGVyIHNwZWNpZnkgaW5wdXQtZmlsZSBPUiBhIGRpYWdyYW0gYm9keSwgbm90IGJvdGhgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG9wdGlvbnMuY29kZSA9IGF3YWl0IGZzcC5yZWFkRmlsZShmc3BhdGhJbiwgJ3V0Zi04Jyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMub3V0cHV0Rk4gIT09ICdzdHJpbmcnXG4gICAgICAgICB8fCBvcHRpb25zLm91dHB1dEZOLmxlbmd0aCA8IDFcbiAgICAgICAgKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGRpYWdyYW1zLXBpbnRvcmEgbXVzdCBoYXZlIG91dHB1dC1maWxlYCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBweHIgPSAkZWxlbWVudC5hdHRyKCdwaXhlbC1yYXRpbycpO1xuICAgICAgICBpZiAodHlwZW9mIHB4ciA9PT0gJ3N0cmluZydcbiAgICAgICAgICYmIHB4ci5sZW5ndGggPj0gMVxuICAgICAgICApIHtcbiAgICAgICAgICAgIGNvbnN0IHIgPSBOdW1iZXIucGFyc2VGbG9hdChweHIpO1xuICAgICAgICAgICAgaWYgKGlzTmFOKHIpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBkaWFncmFtcy1waW50b3JhOiBwaXhlbC1yYXRpbyBpcyBub3QgYSBudW1iZXIgJHtweHJ9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvcHRpb25zLmRldmljZVBpeGVsUmF0aW8gPSByO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbWltZSA9ICRlbGVtZW50LmF0dHIoJ21pbWUtdHlwZScpO1xuICAgICAgICBpZiAodHlwZW9mIG1pbWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgbWltZSA9PT0gJ2ltYWdlL3N2Zyt4bWwnXG4gICAgICAgICAgICAgfHwgbWltZSA9PT0gJ2ltYWdlL2pwZWcnXG4gICAgICAgICAgICAgfHwgbWltZSA9PT0gJ2ltYWdlL3BuZydcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgIG9wdGlvbnMubWltZVR5cGUgPSBtaW1lO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgTUlNRSB0eXBlICR7dXRpbC5pbnNwZWN0KG1pbWUpfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgYmdDb2xvciA9ICRlbGVtZW50LmF0dHIoJ2JnLWNvbG9yJyk7XG4gICAgICAgIGlmICh0eXBlb2YgYmdDb2xvciA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIG9wdGlvbnMuYmFja2dyb3VuZENvbG9yID0gYmdDb2xvcjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHdpZHRoID0gJGVsZW1lbnQuYXR0cignd2lkdGgnKTtcbiAgICAgICAgaWYgKHR5cGVvZiB3aWR0aCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIG9wdGlvbnMud2lkdGggPSBOdW1iZXIucGFyc2VGbG9hdCh3aWR0aCk7XG4gICAgICAgICAgICBpZiAoaXNOYU4ob3B0aW9ucy53aWR0aCkpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGRpYWdyYW1zLXBpbnRvcmE6IHdpZHRoIGlzIG5vdCBhIG51bWJlciAke3dpZHRofWApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgb3B0aW9ucy5yZW5kZXJJblN1YnByb2Nlc3MgPSBmYWxzZTtcblxuICAgICAgICBjb25zdCBidWYgPSBhd2FpdCByZW5kZXIob3B0aW9ucyk7XG5cbiAgICAgICAgY29uc3QgaWQgPSAkZWxlbWVudC5hdHRyKCdpZCcpO1xuICAgICAgICBjb25zdCBjbGF6eiA9ICRlbGVtZW50LmF0dHIoJ2NsYXNzJyk7XG4gICAgICAgIGNvbnN0IGFsdCA9ICRlbGVtZW50LmF0dHIoJ2FsdCcpO1xuICAgICAgICBjb25zdCB0aXRsZSA9ICRlbGVtZW50LmF0dHIoJ3RpdGxlJyk7XG4gICAgICAgIGNvbnN0IGNhcHRpb24gPSAkZWxlbWVudC5hdHRyKCdjYXB0aW9uJyk7XG5cbiAgICAgICAgY29uc3QgY2FwID0gdHlwZW9mIGNhcHRpb24gPT09ICdzdHJpbmcnXG4gICAgICAgICAgICA/IGA8ZmlnY2FwdGlvbj4ke2VuY29kZShjYXB0aW9uKX08L2ZpZ2NhcHRpb24+YFxuICAgICAgICAgICAgOiAnJztcbiAgICAgICAgY29uc3QgVGFsdCA9IHR5cGVvZiBhbHQgPT09ICdzdHJpbmcnXG4gICAgICAgICAgICA/IGBhbHQ9XCIke2VuY29kZShhbHQpfVwiYFxuICAgICAgICAgICAgOiAnJztcbiAgICAgICAgY29uc3QgVHRpdGxlID0gdHlwZW9mIHRpdGxlID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgPyBgdGl0bGU9XCIke2VuY29kZSh0aXRsZSl9XCJgXG4gICAgICAgICAgICA6ICcnO1xuICAgICAgICBjb25zdCBUaWQgPSB0eXBlb2YgaWQgPT09ICdzdHJpbmcnXG4gICAgICAgICAgICA/IGBpZD1cIiR7ZW5jb2RlKGlkKX1gXG4gICAgICAgICAgICA6ICcnO1xuICAgICAgICBjb25zdCBUY2xhenogPSB0eXBlb2YgY2xhenogPT09ICdzdHJpbmcnXG4gICAgICAgICAgICA/IGBjbGFzcz1cIiR7ZW5jb2RlKGNsYXp6KX1gXG4gICAgICAgICAgICA6ICcnO1xuICAgICAgICBjb25zdCBUd2lkdGggPSB0eXBlb2Ygb3B0aW9ucy53aWR0aCA9PT0gJ251bWJlcidcbiAgICAgICAgICAgID8gYHdpZHRoPVwiJHtvcHRpb25zLndpZHRoLnRvU3RyaW5nKCl9XCJgXG4gICAgICAgICAgICA6ICcnO1xuXG4gICAgICAgIC8vIG9wdGlvbnMub3V0cHV0Rk4gd2FzIHNldCBmcm9tIG91dHB1dC1maWxlXG4gICAgICAgIC8vIFRoaXMgY3JlYXRlcyB2cGF0aE91dCBmcm9tIHRoYXQgdmFsdWVcbiAgICAgICAgLy8gVGhpcyBjb21wdXRzIGZzcGF0aE91dCwgd2hpY2ggaXMgdGhlblxuICAgICAgICAvLyBhc3NpZ25lZCBiYWNrIGludG8gb3B0aW9ucy5vdXRwdXRGTlxuXG4gICAgICAgIGxldCB2cGF0aE91dDtcbiAgICAgICAgaWYgKCEgcGF0aC5pc0Fic29sdXRlKG9wdGlvbnMub3V0cHV0Rk4pKSB7XG4gICAgICAgICAgICBsZXQgZGlyID0gcGF0aC5kaXJuYW1lKG1ldGFkYXRhLmRvY3VtZW50LnBhdGgpO1xuICAgICAgICAgICAgdnBhdGhPdXQgPSBwYXRoLm5vcm1hbGl6ZShcbiAgICAgICAgICAgICAgICBwYXRoLmpvaW4oJy8nLCBkaXIsIG9wdGlvbnMub3V0cHV0Rk4pXG4gICAgICAgICAgICApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdnBhdGhPdXQgPSBvcHRpb25zLm91dHB1dEZOO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ29tcHV0ZSBmc3BhdGggZm9yIHZwYXRoT3V0XG4gICAgICAgIGNvbnN0IGZzcGF0aE91dCA9IHBhdGgubm9ybWFsaXplKHBhdGguam9pbihcbiAgICAgICAgICAgIHRoaXMuY29uZmlnLnJlbmRlckRlc3RpbmF0aW9uLCB2cGF0aE91dFxuICAgICAgICApKTtcbiAgICAgICAgb3B0aW9ucy5vdXRwdXRGTiA9IGZzcGF0aE91dDtcblxuICAgICAgICBpZiAob3B0aW9ucy5vdXRwdXRGTikge1xuICAgICAgICAgICAgYXdhaXQgZnNwLndyaXRlRmlsZShvcHRpb25zLm91dHB1dEZOLCBidWYpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJldCA9IGBcbiAgICAgICAgPGZpZ3VyZSAke1RpZH0gJHtUY2xhenp9PlxuICAgICAgICA8aW1nIHNyYz1cIiR7ZW5jb2RlKHZwYXRoT3V0KX1cIiAke1RhbHR9ICR7VHRpdGxlfSAke1R3aWR0aH0vPlxuICAgICAgICAke2NhcH1cbiAgICAgICAgPC9maWd1cmU+XG4gICAgICAgIGA7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKHJldCk7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfVxufVxuXG4vKipcbiAqIE9wdGlvbnMgb2JqZWN0IHRoYXQgaXMgY29udmVydGVkIGludG8gcGxhbnR1bWwuamFyIG9wdGlvbnMuXG4gKi9cbmV4cG9ydCB0eXBlIGRvUGxhbnRVTUxPcHRpb25zID0ge1xuICAgIC8qKlxuICAgICAqIFRoZSBQbGFudFVNTCBkaWFncmFtIHRleHQgdG8gdXNlXG4gICAgICovXG4gICAgaW5wdXRCb2R5Pzogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogWmVybyBvciBtb3JlIGZpbGUgbmFtZXMgZm9yIGZpbGVzIHRvIHJlbmRlclxuICAgICAqL1xuICAgIGlucHV0Rk5zPzogc3RyaW5nW107XG5cbiAgICAvKipcbiAgICAgKiBQb3NzaWJsZSBmaWxlIHRvIHdyaXRlIG91dHB1dCBpbnRvXG4gICAgICovXG4gICAgb3V0cHV0Rk4/OiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBUbyB1c2UgYSBzcGVjaWZpYyBjaGFyYWN0ZXIgc2V0LiBEZWZhdWx0OiBVVEYtOFxuICAgICAqL1xuICAgIGNoYXJzZXQ/OiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBUbyB1c2UgZGFyayBtb2RlIGZvciBkaWFncmFtc1xuICAgICAqL1xuICAgIGRhcmttb2RlPzogYm9vbGVhbjtcblxuICAgIC8qKlxuICAgICAqIFRvIGdlbmVyYXRlIGludGVybWVkaWF0ZSBzdmVrIGZpbGVzXG4gICAgICovXG4gICAgZGVidWdzdmVrPzogYm9vbGVhbjtcblxuICAgIC8qKlxuICAgICAqIFwiZXhhbXBsZS5wdW1sXCIgVG8gb3ZlcnJpZGUgJWZpbGVuYW1lJSB2YXJpYWJsZVxuICAgICAqL1xuICAgIGZpbGVOYW1lT3ZlcnJpZGU/OiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBUbyB1c2UgKE4pIHRocmVhZHMgZm9yIHByb2Nlc3NpbmcuICBVc2UgXCJhdXRvXCIgZm9yIDQgdGhyZWFkcy5cbiAgICAgKi9cbiAgICBuYnRocmVhZD86IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIFRvIE5PVCBleHBvcnQgbWV0YWRhdGEgaW4gUE5HL1NWRyBnZW5lcmF0ZWQgZmlsZXNcbiAgICAgKi9cbiAgICBub21ldGFkYXRhPzogYm9vbGVhbjtcblxuICAgIC8qKlxuICAgICAqIFRvIGdlbmVyYXRlIGltYWdlcyBpbiB0aGUgc3BlY2lmaWVkIGRpcmVjdG9yeVxuICAgICAqL1xuICAgIG91dHB1dERpcj86IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIFRvIGdlbmVyYXRlIGltYWdlcyB1c2luZyBFUFMgZm9ybWF0XG4gICAgICovXG4gICAgdGVwcz86IGJvb2xlYW47XG5cbiAgICAvKipcbiAgICAgKiBUbyBnZW5lcmF0ZSBIVE1MIGZpbGUgZm9yIGNsYXNzIGRpYWdyYW1cbiAgICAgKi9cbiAgICB0aHRtbD86IGJvb2xlYW47XG5cbiAgICAvKipcbiAgICAgKiBUbyBnZW5lcmF0ZSBpbWFnZXMgdXNpbmcgTGFUZVgvVGlreiBmb3JtYXRcbiAgICAgKi9cbiAgICB0bGF0ZXg/OiBib29sZWFuO1xuXG4gICAgLyoqXG4gICAgICogVG8gZ2VuZXJhdGUgaW1hZ2VzIHVzaW5nIFBERiBmb3JtYXRcbiAgICAgKi9cbiAgICB0cGRmPzogYm9vbGVhbjtcblxuICAgIC8qKlxuICAgICAqIFRvIGdlbmVyYXRlIGltYWdlcyB1c2luZyBQTkcgZm9ybWF0IChkZWZhdWx0KVxuICAgICAqL1xuICAgIHRwbmc/OiBib29sZWFuO1xuXG4gICAgLyoqXG4gICAgICogVG8gZ2VuZXJhdGUgU0NYTUwgZmlsZSBmb3Igc3RhdGUgZGlhZ3JhbVxuICAgICAqL1xuICAgIHRzY3htbD86IGJvb2xlYW47XG5cbiAgICAvKipcbiAgICAgKiBUbyBnZW5lcmF0ZSBpbWFnZXMgdXNpbmcgU1ZHIGZvcm1hdFxuICAgICAqL1xuICAgIHRzdmc/OiBib29sZWFuO1xuXG4gICAgLyoqXG4gICAgICogVG8gZ2VuZXJhdGUgaW1hZ2VzIHdpdGggQVNDSUkgYXJ0XG4gICAgICovXG4gICAgdHR4dD86IGJvb2xlYW47XG5cbiAgICAvKipcbiAgICAgKiBUbyBnZW5lcmF0ZSBpbWFnZXMgd2l0aCBBU0NJSSBhcnQgdXNpbmcgVW5pY29kZSBjaGFyYWN0ZXJzXG4gICAgICovXG4gICAgdHV0eHQ/OiBib29sZWFuO1xuXG4gICAgLyoqXG4gICAgICogVG8gZ2VuZXJhdGUgaW1hZ2VzIHVzaW5nIFZEWCBmb3JtYXRcbiAgICAgKi9cbiAgICB0dmR4PzogYm9vbGVhbjtcblxuICAgIC8qKlxuICAgICAqIFRvIGdlbmVyYXRlIFhNSSBmaWxlIGZvciBjbGFzcyBkaWFncmFtXG4gICAgICovXG4gICAgdHhtaT86IGJvb2xlYW47XG5cbiAgICAvKipcbiAgICAgKiBUbyBoYXZlIGxvZyBpbmZvcm1hdGlvblxuICAgICAqL1xuICAgIHZlcmJvc2U/OiBib29sZWFuO1xuXG4gICAgLyoqXG4gICAgICogVVJMIGZvciBhIFBsYW50VU1MIHNlcnZlciwgc3VjaCBhc1xuICAgICAqIGh0dHA6Ly9sb2NhbGhvc3Q6ODA4MC4gIE92ZXJyaWRlcyB0aGVcbiAgICAgKiBQTEFOVFVNTF9TRVJWRVJfVVJMIGVudmlyb25tZW50IHZhcmlhYmxlLlxuICAgICAqL1xuICAgIHNlcnZlclVSTD86IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIEZpbGVzeXN0ZW0gcGF0aCBmb3IgYSBwbGFudHVtbC5qYXIgZmlsZS5cbiAgICAgKiBPdmVycmlkZXMgdGhlIFBMQU5UVU1MX0pBUiBlbnZpcm9ubWVudCB2YXJpYWJsZS5cbiAgICAgKi9cbiAgICBqYXJQYXRoPzogc3RyaW5nO1xufVxuXG4vKipcbiAqIFJlbmRlciBhIFBsYW50VU1MIGRpYWdyYW0gdXNpbmcgd2hpY2hldmVyIHJlbmRlcmluZ1xuICogYmFja2VuZCBpcyBjb25maWd1cmVkLiAgSWYgYSBzZXJ2ZXIgVVJMIGlzIGF2YWlsYWJsZVxuICogKHRoZSBzZXJ2ZXJVUkwgb3B0aW9uIG9yIHRoZSBQTEFOVFVNTF9TRVJWRVJfVVJMXG4gKiBlbnZpcm9ubWVudCB2YXJpYWJsZSksIHRoZSBkaWFncmFtIGlzIHNlbnQgdG8gdGhhdFxuICogUGxhbnRVTUwgc2VydmVyLiAgT3RoZXJ3aXNlLCBpZiBhIEpBUiBwYXRoIGlzIGF2YWlsYWJsZVxuICogKHRoZSBqYXJQYXRoIG9wdGlvbiBvciB0aGUgUExBTlRVTUxfSkFSIGVudmlyb25tZW50XG4gKiB2YXJpYWJsZSksIHRoZSBkaWFncmFtIGlzIHJlbmRlcmVkIGxvY2FsbHkgYnkgcnVubmluZ1xuICogdGhlIEpBUiB3aXRoIEphdmEuICBJZiBuZWl0aGVyIGlzIGF2YWlsYWJsZSwgYW4gZXJyb3JcbiAqIGlzIHRocm93biBkaXJlY3RpbmcgdGhlIHVzZXIgdG8gdGhlIFJFQURNRS5cbiAqXG4gKiBJbiB0aGUgc2luZ2xlLWlucHV0IG1vZGVzIChpbnB1dEJvZHkgb3Igb25lIGVudHJ5IGluXG4gKiBpbnB1dEZOcyksIHdoZW4gbm8gb3V0cHV0Rk4gaXMgZ2l2ZW4gdGhlIHJlbmRlcmVkXG4gKiBvdXRwdXQgaXMgcmV0dXJuZWQgYXMgYSBCdWZmZXIgaW5zdGVhZCBvZiBiZWluZ1xuICogd3JpdHRlbiB0byBhIGZpbGUuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkb1BsYW50VU1MKFxuICAgIG9wdGlvbnM6IGRvUGxhbnRVTUxPcHRpb25zXG4pOiBQcm9taXNlPEJ1ZmZlciB8IHVuZGVmaW5lZD4ge1xuICAgIGNvbnN0IHNlcnZlclVSTCA9IG9wdGlvbnMuc2VydmVyVVJMXG4gICAgICAgICAgICA/PyBwcm9jZXNzLmVudi5QTEFOVFVNTF9TRVJWRVJfVVJMO1xuICAgIGNvbnN0IGphclBhdGggPSBvcHRpb25zLmphclBhdGhcbiAgICAgICAgICAgID8/IHByb2Nlc3MuZW52LlBMQU5UVU1MX0pBUjtcbiAgICBpZiAodHlwZW9mIHNlcnZlclVSTCA9PT0gJ3N0cmluZycgJiYgc2VydmVyVVJMLmxlbmd0aCA+PSAxKSB7XG4gICAgICAgIHJldHVybiBkb1BsYW50VU1MU2VydmVyKG9wdGlvbnMpO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIGphclBhdGggPT09ICdzdHJpbmcnICYmIGphclBhdGgubGVuZ3RoID49IDEpIHtcbiAgICAgICAgcmV0dXJuIGRvUGxhbnRVTUxMb2NhbChvcHRpb25zKTtcbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKGBQbGFudFVNTCByZW5kZXJpbmcgaXMgbm90IGNvbmZpZ3VyZWQuICBFaXRoZXIgcnVuIGEgUGxhbnRVTUwgc2VydmVyIGFuZCBzZXQgdGhlIFBMQU5UVU1MX1NFUlZFUl9VUkwgZW52aXJvbm1lbnQgdmFyaWFibGUsIG9yIGRvd25sb2FkIHBsYW50dW1sLmphciAobnB4IGRpYWdyYW0tbWFrZXJzIHBsYW50dW1sLWRvd25sb2FkKSBhbmQgc2V0IHRoZSBQTEFOVFVNTF9KQVIgZW52aXJvbm1lbnQgdmFyaWFibGUuICAke3BsYW50dW1sU2V0dXBIZWxwfWApO1xufVxuXG4vLyBUaGUgYWxwaGFiZXQgdXNlZCBieSBQbGFudFVNTCBzZXJ2ZXJzIGZvciBlbmNvZGVkXG4vLyBkaWFncmFtIHRleHQuICBJdCByZXNlbWJsZXMgYmFzZTY0LCBidXQgd2l0aCBhXG4vLyBkaWZmZXJlbnQgY2hhcmFjdGVyIHNldCBhbmQgb3JkZXJpbmcuXG5jb25zdCBwbGFudHVtbEFscGhhYmV0ID1cbiAgICAnMDEyMzQ1Njc4OUFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXotXyc7XG5cbi8qKlxuICogRW5jb2RlIFBsYW50VU1MIGRpYWdyYW0gdGV4dCBmb3IgdXNlIGluIGEgUGxhbnRVTUxcbiAqIHNlcnZlciBVUkwsIGFzIGRvY3VtZW50ZWQgYXRcbiAqIGh0dHBzOi8vcGxhbnR1bWwuY29tL3RleHQtZW5jb2RpbmcgLS0gdGhlIHRleHQgaXNcbiAqIGRlZmxhdGVkLCB0aGVuIGVuY29kZWQgd2l0aCBhIGJhc2U2NC1saWtlIGFscGhhYmV0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gcGxhbnR1bWxFbmNvZGUoZGlhZ3JhbTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBjb25zdCBkZWZsYXRlZCA9IGRlZmxhdGVSYXdTeW5jKFxuICAgICAgICBCdWZmZXIuZnJvbShkaWFncmFtLCAndXRmLTgnKSwgeyBsZXZlbDogOSB9KTtcbiAgICBsZXQgcmV0ID0gJyc7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkZWZsYXRlZC5sZW5ndGg7IGkgKz0gMykge1xuICAgICAgICBjb25zdCBiMSA9IGRlZmxhdGVkW2ldO1xuICAgICAgICBjb25zdCBiMiA9IGkgKyAxIDwgZGVmbGF0ZWQubGVuZ3RoID8gZGVmbGF0ZWRbaSArIDFdIDogMDtcbiAgICAgICAgY29uc3QgYjMgPSBpICsgMiA8IGRlZmxhdGVkLmxlbmd0aCA/IGRlZmxhdGVkW2kgKyAyXSA6IDA7XG4gICAgICAgIHJldCArPSBwbGFudHVtbEFscGhhYmV0W2IxID4+IDJdXG4gICAgICAgICAgICAgKyBwbGFudHVtbEFscGhhYmV0WygoYjEgJiAweDAzKSA8PCA0KSB8IChiMiA+PiA0KV1cbiAgICAgICAgICAgICArIHBsYW50dW1sQWxwaGFiZXRbKChiMiAmIDB4MEYpIDw8IDIpIHwgKGIzID4+IDYpXVxuICAgICAgICAgICAgICsgcGxhbnR1bWxBbHBoYWJldFtiMyAmIDB4M0ZdO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xufVxuXG4vKipcbiAqIFJlbmRlciBhIFBsYW50VU1MIGRpYWdyYW0gYnkgc2VuZGluZyBpdCB0byBhIFBsYW50VU1MXG4gKiBzZXJ2ZXIuICBUaGUgc2VydmVyIFVSTCBjb21lcyBmcm9tIHRoZSBzZXJ2ZXJVUkwgb3B0aW9uXG4gKiBvciB0aGUgUExBTlRVTUxfU0VSVkVSX1VSTCBlbnZpcm9ubWVudCB2YXJpYWJsZS5cbiAqXG4gKiBUaGUgc2VydmVyIHN1cHBvcnRzIGEgc3Vic2V0IG9mIHRoZSBKQVIncyBmZWF0dXJlczpcbiAqIFBORyAodHBuZywgdGhlIGRlZmF1bHQpLCBTVkcgKHRzdmcpLCBhbmQgQVNDSUkgYXJ0XG4gKiAodHR4dCkgb3V0cHV0IGZvcm1hdHMuICBUaGUgaW5wdXQgaXMgZWl0aGVyIGlucHV0Qm9keVxuICogb3IgYSBzaW5nbGUgZW50cnkgaW4gaW5wdXRGTnMuICBUaGUgcmVuZGVyZWQgb3V0cHV0IGlzXG4gKiB3cml0dGVuIHRvIG91dHB1dEZOIHdoZW4gZ2l2ZW4sIGFuZCByZXR1cm5lZCBhcyBhXG4gKiBCdWZmZXIgb3RoZXJ3aXNlLiAgT3B0aW9ucyB0aGF0IG9ubHkgbWFrZSBzZW5zZSBmb3JcbiAqIHRoZSBKQVIgKGRhcmttb2RlLCBjaGFyc2V0LCBuYnRocmVhZCwgb3V0cHV0RGlyLCBhbmRcbiAqIHRoZSBvdGhlciBvdXRwdXQgZm9ybWF0cykgYXJlIG5vdCBzdXBwb3J0ZWQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkb1BsYW50VU1MU2VydmVyKFxuICAgIG9wdGlvbnM6IGRvUGxhbnRVTUxPcHRpb25zXG4pOiBQcm9taXNlPEJ1ZmZlciB8IHVuZGVmaW5lZD4ge1xuICAgIGNvbnN0IHNlcnZlclVSTCA9IG9wdGlvbnMuc2VydmVyVVJMXG4gICAgICAgICAgICA/PyBwcm9jZXNzLmVudi5QTEFOVFVNTF9TRVJWRVJfVVJMO1xuICAgIGlmICh0eXBlb2Ygc2VydmVyVVJMICE9PSAnc3RyaW5nJyB8fCBzZXJ2ZXJVUkwubGVuZ3RoIDwgMSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sIHNlcnZlciAtIG5vIHNlcnZlciBVUkwuICBTZXQgdGhlIFBMQU5UVU1MX1NFUlZFUl9VUkwgZW52aXJvbm1lbnQgdmFyaWFibGUuICAke3BsYW50dW1sU2V0dXBIZWxwfWApO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgdW5zdXBwb3J0ZWQgb2YgW1xuICAgICAgICAndGVwcycsICd0aHRtbCcsICd0bGF0ZXgnLCAndHBkZicsICd0c2N4bWwnLFxuICAgICAgICAndHZkeCcsICd0eG1pJywgJ3R1dHh0J1xuICAgIF0pIHtcbiAgICAgICAgaWYgKG9wdGlvbnNbdW5zdXBwb3J0ZWRdKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sIHNlcnZlciAtIHRoZSAke3Vuc3VwcG9ydGVkfSBvdXRwdXQgZm9ybWF0IGlzIG5vdCBzdXBwb3J0ZWQgYnkgUGxhbnRVTUwgc2VydmVyIHJlbmRlcmluZyAtIHVzZSB0aGUgSkFSIGluc3RlYWQgKFBMQU5UVU1MX0pBUilgKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAob3B0aW9ucy5kYXJrbW9kZSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sIHNlcnZlciAtIGRhcmttb2RlIGlzIG5vdCBzdXBwb3J0ZWQgYnkgUGxhbnRVTUwgc2VydmVyIHJlbmRlcmluZyAtIHVzZSB0aGUgSkFSIGluc3RlYWQgKFBMQU5UVU1MX0pBUilgKTtcbiAgICB9XG5cbiAgICBsZXQgZm9ybWF0O1xuICAgIGlmIChvcHRpb25zLnRzdmcpIGZvcm1hdCA9ICdzdmcnO1xuICAgIGVsc2UgaWYgKG9wdGlvbnMudHR4dCkgZm9ybWF0ID0gJ3R4dCc7XG4gICAgZWxzZSBmb3JtYXQgPSAncG5nJztcblxuICAgIGxldCBkaWFncmFtO1xuICAgIGlmIChBcnJheS5pc0FycmF5KG9wdGlvbnMuaW5wdXRGTnMpXG4gICAgICYmIG9wdGlvbnMuaW5wdXRGTnMubGVuZ3RoID4gMVxuICAgICkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sIHNlcnZlciAtIG9ubHkgb25lIGlucHV0IGZpbGUgaXMgc3VwcG9ydGVkIGJ5IFBsYW50VU1MIHNlcnZlciByZW5kZXJpbmcgLSB1c2UgdGhlIEpBUiBpbnN0ZWFkIChQTEFOVFVNTF9KQVIpYCk7XG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KG9wdGlvbnMuaW5wdXRGTnMpXG4gICAgICYmIG9wdGlvbnMuaW5wdXRGTnMubGVuZ3RoID09PSAxXG4gICAgKSB7XG4gICAgICAgIGRpYWdyYW0gPSBhd2FpdCBmc3AucmVhZEZpbGUob3B0aW9ucy5pbnB1dEZOc1swXSwgJ3V0Zi04Jyk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2Ygb3B0aW9ucy5pbnB1dEJvZHkgPT09ICdzdHJpbmcnXG4gICAgICYmIG9wdGlvbnMuaW5wdXRCb2R5Lmxlbmd0aCA+PSAxXG4gICAgKSB7XG4gICAgICAgIGRpYWdyYW0gPSBvcHRpb25zLmlucHV0Qm9keTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sIHNlcnZlciAtIG5vIGlucHV0IHNvdXJjZXNgKTtcbiAgICB9XG5cbiAgICBjb25zdCB1cmwgPSBgJHtzZXJ2ZXJVUkwucmVwbGFjZSgvXFwvKyQvLCAnJyl9LyR7Zm9ybWF0fS8ke3BsYW50dW1sRW5jb2RlKGRpYWdyYW0pfWA7XG5cbiAgICBsZXQgcmVzO1xuICAgIHRyeSB7XG4gICAgICAgIHJlcyA9IGF3YWl0IGZldGNoKHVybCk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgcGxhbnR1bWwgc2VydmVyIC0gY291bGQgbm90IHJlYWNoIFBsYW50VU1MIHNlcnZlciBhdCAke3NlcnZlclVSTH0gLSAke2Vyci5tZXNzYWdlfS4gICR7cGxhbnR1bWxTZXR1cEhlbHB9YCk7XG4gICAgfVxuICAgIGlmICghcmVzLm9rKSB7XG4gICAgICAgIC8vIEZvciBkaWFncmFtIGVycm9ycyB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYVxuICAgICAgICAvLyA0eHggc3RhdHVzLCBidXQgdGhlIGJvZHkgaXMgc3RpbGwgYSByZW5kZXJlZFxuICAgICAgICAvLyBpbWFnZSBkZXNjcmliaW5nIHRoZSBlcnJvci4gIFJlcG9ydCB0aGUgc3RhdHVzXG4gICAgICAgIC8vIGFuZCBsZXQgdGhlIHVzZXIgaW5zcGVjdCB0aGUgZGlhZ3JhbS5cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBwbGFudHVtbCBzZXJ2ZXIgLSAke3NlcnZlclVSTH0gcmVzcG9uZGVkIHdpdGggJHtyZXMuc3RhdHVzfSAke3Jlcy5zdGF0dXNUZXh0fSBmb3IgdGhlIGRpYWdyYW1gKTtcbiAgICB9XG5cbiAgICBjb25zdCBidWYgPSBCdWZmZXIuZnJvbShhd2FpdCByZXMuYXJyYXlCdWZmZXIoKSk7XG4gICAgaWYgKHR5cGVvZiBvcHRpb25zLm91dHB1dEZOID09PSAnc3RyaW5nJ1xuICAgICAmJiBvcHRpb25zLm91dHB1dEZOLmxlbmd0aCA+PSAxXG4gICAgKSB7XG4gICAgICAgIGF3YWl0IGZzcC53cml0ZUZpbGUob3B0aW9ucy5vdXRwdXRGTiwgYnVmKTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgcmV0dXJuIGJ1Zjtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRvUGxhbnRVTUxMb2NhbChcbiAgICBvcHRpb25zOiBkb1BsYW50VU1MT3B0aW9uc1xuKTogUHJvbWlzZTxCdWZmZXIgfCB1bmRlZmluZWQ+IHtcblxuICAgIGNvbnN0IHBsYW50dW1sSmFyID0gb3B0aW9ucy5qYXJQYXRoXG4gICAgICAgICAgICA/PyBwcm9jZXNzLmVudi5QTEFOVFVNTF9KQVI7XG4gICAgaWYgKHR5cGVvZiBwbGFudHVtbEphciAhPT0gJ3N0cmluZydcbiAgICAgfHwgcGxhbnR1bWxKYXIubGVuZ3RoIDwgMVxuICAgICkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sIC0gbm8gSkFSIGZpbGUgY29uZmlndXJlZC4gIERvd25sb2FkIHBsYW50dW1sLmphciAobnB4IGRpYWdyYW0tbWFrZXJzIHBsYW50dW1sLWRvd25sb2FkKSBhbmQgc2V0IHRoZSBQTEFOVFVNTF9KQVIgZW52aXJvbm1lbnQgdmFyaWFibGUuICAke3BsYW50dW1sU2V0dXBIZWxwfWApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICBhd2FpdCBmc3AuYWNjZXNzKHBsYW50dW1sSmFyLCBmcy5jb25zdGFudHMuUl9PSyk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgcGxhbnR1bWwgLSB0aGUgSkFSIGZpbGUgJHtwbGFudHVtbEphcn0gZG9lcyBub3QgZXhpc3Qgb3IgaXMgbm90IHJlYWRhYmxlLiAgJHtwbGFudHVtbFNldHVwSGVscH1gKTtcbiAgICB9XG5cbiAgICBjb25zdCBhcmdzID0gW1xuICAgICAgICAvLyAnamF2YScsXG4gICAgICAgICctamFyJyxcbiAgICAgICAgJy1EamF2YS5hd3QuaGVhZGxlc3M9dHJ1ZScsXG4gICAgICAgICctLWFkZC1vcGVucz1qYXZhLnhtbC9jb20uc3VuLm9yZy5hcGFjaGUueGFsYW4uaW50ZXJuYWwueHNsdGMudHJheD1BTEwtVU5OQU1FRCcsXG4gICAgICAgIHBsYW50dW1sSmFyLFxuICAgIF07XG4gICAgaWYgKG9wdGlvbnMuY2hhcnNldCkge1xuICAgICAgICBhcmdzLnB1c2goJy1jaGFyc2V0Jyk7XG4gICAgICAgIGFyZ3MucHVzaChvcHRpb25zLmNoYXJzZXQpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy5kYXJrbW9kZSkge1xuICAgICAgICBhcmdzLnB1c2goJy1kYXJrbW9kZScpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy5kZWJ1Z3N2ZWspIHtcbiAgICAgICAgYXJncy5wdXNoKCctZGVidWdzdmVrJyk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLmZpbGVOYW1lT3ZlcnJpZGUpIHtcbiAgICAgICAgYXJncy5wdXNoKCctZmlsZW5hbWUnKTtcbiAgICAgICAgYXJncy5wdXNoKG9wdGlvbnMuZmlsZU5hbWVPdmVycmlkZSk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLm5idGhyZWFkKSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLW5idGhyZWFkJyk7XG4gICAgICAgIGFyZ3MucHVzaChvcHRpb25zLm5idGhyZWFkKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMubm9tZXRhZGF0YSkge1xuICAgICAgICBhcmdzLnB1c2goJy1ub21ldGFkYXRhJyk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnRlcHMpIHtcbiAgICAgICAgYXJncy5wdXNoKCctdGVwcycpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy50aHRtbCkge1xuICAgICAgICBhcmdzLnB1c2goJy10aHRtbCcpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy50bGF0ZXgpIHtcbiAgICAgICAgYXJncy5wdXNoKCctdGxhdGV4Jyk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnRwZGYpIHtcbiAgICAgICAgYXJncy5wdXNoKCctdHBkZicpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy50cG5nKSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLXRwbmcnKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMudHNjeG1sKSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLXRzY3htbCcpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy50c3ZnKSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLXRzdmcnKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMudHR4dCkge1xuICAgICAgICBhcmdzLnB1c2goJy10dHh0Jyk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnR1dHh0KSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLXR1dHh0Jyk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnR2ZHgpIHtcbiAgICAgICAgYXJncy5wdXNoKCctdHZkeCcpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy50eG1pKSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLXR4bWknKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMudmVyYm9zZSkge1xuICAgICAgICBhcmdzLnB1c2goJy12ZXJib3NlJyk7XG4gICAgfVxuXG4gICAgLy8gMCBpbnB1dEZOcyByZXF1aXJlcyBpbnB1dEJvZHlcbiAgICAvLyBjaGlsZC5zdGRpbi53cml0ZS9lbmQgd2l0aCBpbnB1dEJvZHlcbiAgICAvLyAtcGlwZVxuICAgIC8vXG4gICAgLy8gMSBpbnB1dEZOLCBuby9pZ25vcmUgaW5wdXRCb2R5XG4gICAgLy8gZnMuY3JlYXRlUmVhZFN0cmVhbShpbnB1dEZOKS5waXBlKGNoaWxkLnN0ZGluKVxuICAgIC8vIC1waXBlXG4gICAgLy9cbiAgICAvLyBJbiBib3RoIC1waXBlIGNhc2VzLCBjaGlsZC5zdGRvdXQgZ29lcyB0b1xuICAgIC8vIGZzLmNyZWF0ZVdyaXRlU3RyZWFtKG91dHB1dEZOKSB3aGVuIG91dHB1dEZOIGlzXG4gICAgLy8gZ2l2ZW4sIGFuZCBpcyBvdGhlcndpc2UgY29sbGVjdGVkIGludG8gYSBCdWZmZXJcbiAgICAvLyB0aGF0IGlzIHJldHVybmVkLlxuICAgIC8vXG4gICAgLy8gbXVsdGlwbGUgaW5wdXRGTnMgLi4gb3B0aW9uYWwgb3V0cHV0LWRpcidzXG4gICAgLy8gQm90aCBnbyBvbiB0aGUgY29tbWFuZC1saW5lXG4gICAgLy9cblxuICAgIGxldCBzcGF3bm9wdHMgPSB7fSBhcyBhbnk7XG5cbiAgICBpZiAodHlwZW9mIG9wdGlvbnMuaW5wdXRGTnMgPT09ICd1bmRlZmluZWQnXG4gICAgICYmICFBcnJheS5pc0FycmF5KG9wdGlvbnMuaW5wdXRGTnMpXG4gICAgICYmIHR5cGVvZiBvcHRpb25zLmlucHV0Qm9keSAhPT0gJ3N0cmluZydcbiAgICApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBwbGFudHVtbCAtIG5vIGlucHV0IHNvdXJjZXNgKTtcbiAgICB9XG4gICAgLy8gQW4gaW5wdXRCb2R5IHdpdGggbm8gZmlsZSBuYW1lcywgb3IgYSBzaW5nbGUgZmlsZVxuICAgIC8vIG5hbWUsIG1lYW5zIHdlJ3JlIHBpcGluZ1xuICAgIGNvbnN0IHBpcGVNb2RlID1cbiAgICAgICAgKHR5cGVvZiBvcHRpb25zLmlucHV0Rk5zID09PSAndW5kZWZpbmVkJ1xuICAgICAgJiYgIUFycmF5LmlzQXJyYXkob3B0aW9ucy5pbnB1dEZOcylcbiAgICAgICYmIHR5cGVvZiBvcHRpb25zLmlucHV0Qm9keSA9PT0gJ3N0cmluZycpXG4gICAgIHx8IChBcnJheS5pc0FycmF5KG9wdGlvbnMuaW5wdXRGTnMpXG4gICAgICAmJiBvcHRpb25zLmlucHV0Rk5zLmxlbmd0aCA9PT0gMSk7XG4gICAgaWYgKHBpcGVNb2RlKSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLXBpcGUnKTtcbiAgICB9XG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheShvcHRpb25zLmlucHV0Rk5zKVxuICAgICAmJiBvcHRpb25zLmlucHV0Rk5zLmxlbmd0aCA+IDFcbiAgICAgJiYgdHlwZW9mIG9wdGlvbnMub3V0cHV0Rk4gPT09ICdzdHJpbmcnXG4gICAgKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgcGxhbnR1bWwgLSB3aXRoIG11bHRpcGxlIGlucHV0IGZpbGVzLCBvdXRwdXQgZmlsZSBub3QgYWxsb3dlZGApXG4gICAgfVxuXG4gICAgLy8gbXVsdGlwbGUgZmlsZSBuYW1lcywgcHVzaCBvbnRvIGFyZ3NcbiAgICBpZiAoQXJyYXkuaXNBcnJheShvcHRpb25zLmlucHV0Rk5zKVxuICAgICAmJiBvcHRpb25zLmlucHV0Rk5zLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yIChjb25zdCBpbnB1dEZOIG9mIG9wdGlvbnMuaW5wdXRGTnMpIHtcbiAgICAgICAgICAgIGFyZ3MucHVzaChpbnB1dEZOKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5vdXRwdXREaXIgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLW91dHB1dCcpO1xuICAgICAgICBhcmdzLnB1c2gob3B0aW9ucy5vdXRwdXREaXIpO1xuICAgIH1cblxuICAgIC8vIE5vdyB0aGF0IHRoZSBjb21tYW5kIGFyZ3MgYW5kIHNwYXdub3B0cyBhcmUgc2V0IHVwXG4gICAgLy8gcnVuIHRoZSBjb21tYW5kXG4gICAgLy8gY29uc29sZS5sb2coe1xuICAgIC8vICAgICBzcGF3bm9wdHMsIGFyZ3NcbiAgICAvLyB9KTtcbiAgICBjb25zdCBjaGlsZCA9IHNwYXduKCdqYXZhJywgYXJncywgc3Bhd25vcHRzKTtcblxuICAgIC8vIE5leHQsIHNldCB1cCBzdGRpbi9zdGRvdXQgcGlwZXMgaW4gY2FzZVxuICAgIC8vIG9mIHVzaW5nIC1waXBlIG1vZGVcblxuICAgIGxldCBjaHVua3M6IEJ1ZmZlcltdIHwgdW5kZWZpbmVkO1xuICAgIGlmIChwaXBlTW9kZSkge1xuICAgICAgICAvLyBUaGUgaW5wdXQgaXMgZWl0aGVyIHRoZSBpbnB1dEJvZHkgb3IgdGhlXG4gICAgICAgIC8vIHNpbmdsZSBuYW1lZCBpbnB1dCBmaWxlXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KG9wdGlvbnMuaW5wdXRGTnMpXG4gICAgICAgICAmJiBvcHRpb25zLmlucHV0Rk5zLmxlbmd0aCA9PT0gMVxuICAgICAgICApIHtcbiAgICAgICAgICAgIGZzLmNyZWF0ZVJlYWRTdHJlYW0ob3B0aW9ucy5pbnB1dEZOc1swXSkucGlwZShjaGlsZC5zdGRpbik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjaGlsZC5zdGRpbi53cml0ZShvcHRpb25zLmlucHV0Qm9keSk7XG4gICAgICAgICAgICBjaGlsZC5zdGRpbi5lbmQoKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBUaGUgb3V0cHV0IGdvZXMgZWl0aGVyIHRvIHRoZSBuYW1lZCBvdXRwdXRcbiAgICAgICAgLy8gZmlsZSBvciBpbnRvIGEgQnVmZmVyIHRoYXQgaXMgcmV0dXJuZWRcbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLm91dHB1dEZOID09PSAnc3RyaW5nJ1xuICAgICAgICAgJiYgb3B0aW9ucy5vdXRwdXRGTi5sZW5ndGggPj0gMVxuICAgICAgICApIHtcbiAgICAgICAgICAgIGNoaWxkLnN0ZG91dC5waXBlKGZzLmNyZWF0ZVdyaXRlU3RyZWFtKG9wdGlvbnMub3V0cHV0Rk4pKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNodW5rcyA9IFtdO1xuICAgICAgICAgICAgY2hpbGQuc3Rkb3V0Lm9uKCdkYXRhJywgKGNodW5rKSA9PiB7XG4gICAgICAgICAgICAgICAgY2h1bmtzLnB1c2goY2h1bmspO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBGaW5hbGx5LCB3YWl0IGZvciB0aGUgY2hpbGQgdG8gZmluaXNoXG5cbiAgICBjaGlsZC5vbignZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYHBsYW50dW1sIEVSUk9SIGluIGNoaWxkIHByb2Nlc3MgJHtlcnIubWVzc2FnZX1gKTtcbiAgICB9KTtcblxuICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgY2hpbGQub24oJ2Nsb3NlJywgKGNvZGUpID0+IHtcbiAgICAgICAgICAgIGlmIChjb2RlID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh1bmRlZmluZWQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKGBwbGFudHVtbCBmYWlsIHdpdGggY29kZSAke2NvZGV9YCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiBjaHVua3MgPyBCdWZmZXIuY29uY2F0KGNodW5rcykgOiB1bmRlZmluZWQ7XG59XG5cbi8qKlxuICogSGFuZGxlIGNvbnZlcnRpbmcgYSBzaW5nbGUgUGxhbnRVTUwgZGlhZ3JhbSBmb3JcbiAqIGRpc3BsYXkgaW4gYSBkb2N1bWVudC5cbiAqIFxuICogVGhlIGRvY3VtZW50IGRlc2NyaXB0aW9uIGlzIGVpdGhlciBpbmxpbmVcbiAqIHRvIHRoZSA8ZGlhZ3JhbXMtcGxhbnR1bWw+IHRhZywgb3IgZWxzZSBhIHNpbmdsZVxuICogaW5wdXQgZmlsZSBpbiB0aGUgaW5wdXQtZmlsZSBhdHRyaWJ1dGUuXG4gKiBcbiAqIFRoZXJlIGlzIGEgc2luZ2xlIG91dHB1dC1maWxlIGF0dHJpYnV0ZSB0b1xuICogZm9yIGEgZmlsZSB0byByZWNlaXZlIGFzIG91dHB1dC4gIFRoaXMgZmlsZVxuICogaXMgd3JpdHRlbiBkaXJlY3RseSB0byB0aGUgcmVuZGVyaW5nT3V0cHV0IGRpcmVjdG9yeS5cbiAqIFxuICogVGhpcyB3aWxsIHN1cHBvcnQgb25seSBQTkcgYW5kIFNWRyBvdXRwdXQgZm9ybWF0cy5cbiAqIFxuICogVGhlIG91dHB1dC1maWxlIGlzIGEgVlBhdGggc3BlY2lmeWluZyBhblxuICogb3V0cHV0IGRpcmVjdG9yeSBsb2NhdGlvbi5cbiAqIFxuICogaXNBYnNvbHV0ZShvdXRwdXQtZmlsZSkgLSBtZWFucyBpdCBpcyByb290ZWRcbiAqIHRvIHRoZSBvdXRwdXQgZGlyZWN0b3J5LiAgT3RoZXJ3aXNlIGl0IGlzIHJlbGF0aXZlXG4gKiB0byB0aGUgZGlybmFtZShtZXRhZGF0YS5kb2N1bWVudC5wYXRoKS5cbiAqIFxuICogV2hlbiB0aGVyZSBpcyBubyBvdXRwdXQtZmlsZSBhdHRyaWJ1dGUsIHRoZSBkaWFncmFtXG4gKiBpcyByZW5kZXJlZCBhcyBpbmxpbmUgU1ZHIGVtYmVkZGVkIGluIHRoZSBnZW5lcmF0ZWRcbiAqIEhUTUwuICBUaGlzIG1vZGUgcmVxdWlyZXMgdGhlIHRzdmcgb3V0cHV0IGZvcm1hdC5cbiAqL1xuY2xhc3MgUGxhbnRVTUxMb2NhbCBleHRlbmRzIGFrYXNoYS5DdXN0b21FbGVtZW50IHtcblxuXHRnZXQgZWxlbWVudE5hbWUoKSB7IHJldHVybiBcImRpYWdyYW1zLXBsYW50dW1sXCI7IH1cbiAgICBhc3luYyBwcm9jZXNzKCRlbGVtZW50LCBtZXRhZGF0YSwgZGlydHk6IEZ1bmN0aW9uKSB7XG5cbiAgICAgICAgY29uc3Qgb3B0aW9uczogZG9QbGFudFVNTE9wdGlvbnMgPSB7XG4gICAgICAgICAgICAvLyBVc2luZyAudGV4dCgpIGVsaW1pbmF0ZXMgSFRNTCBmb3JtYXR0aW5nLlxuICAgICAgICAgICAgaW5wdXRCb2R5OiAkZWxlbWVudC50ZXh0KCksXG4gICAgICAgICAgICBpbnB1dEZOczogdW5kZWZpbmVkLFxuICAgICAgICAgICAgb3V0cHV0Rk46ICRlbGVtZW50LmF0dHIoJ291dHB1dC1maWxlJylcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBFbnN1cmUgdGhlcmUgaXMgZWl0aGVyIGFuIGlucHV0LWZpbGVcbiAgICAgICAgLy8gb3IgYW4gaW5wdXQgYm9keVxuXG4gICAgICAgIGNvbnN0IGluZiA9ICAkZWxlbWVudC5hdHRyKCdpbnB1dC1maWxlJyk7XG4gICAgICAgIGlmICh0eXBlb2YgaW5mID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgb3B0aW9ucy5pbnB1dEZOcyA9IFsgaW5mIF07XG4gICAgICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShpbmYpICYmIGluZi5sZW5ndGggPj0gMSkge1xuICAgICAgICAgICAgb3B0aW9ucy5pbnB1dEZOcyA9IFsgaW5mWzBdIF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvcHRpb25zLmlucHV0Rk5zID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5pbnB1dEJvZHkgIT09ICdzdHJpbmcnXG4gICAgICAgICAmJiAoXG4gICAgICAgICAgICAhQXJyYXkuaXNBcnJheShvcHRpb25zLmlucHV0Rk5zKVxuICAgICAgICAgfHwgb3B0aW9ucy5pbnB1dEZOcy5sZW5ndGggPD0gMFxuICAgICAgICApKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFBsYW50VU1MTG9jYWwgb25lIGlucHV0IGZpbGUgb3IgaW5saW5lIGRpYWdyYW0gaXMgcmVxdWlyZWRgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCB2cGF0aEluO1xuICAgICAgICBsZXQgZnNwYXRoSW47XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KG9wdGlvbnMuaW5wdXRGTnMpICYmIG9wdGlvbnMuaW5wdXRGTnMubGVuZ3RoID09PSAxKSB7XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5pbnB1dEZOc1swXSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFBsYW50VU1MTG9jYWwgbm8gaW5wdXQgZmlsZSBGTiBnaXZlbiBpbiAke3V0aWwuaW5zcGVjdChvcHRpb25zLmlucHV0Rk5zKX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGluRk4gPSBvcHRpb25zLmlucHV0Rk5zWzBdO1xuICAgICAgICAgICAgaWYgKHBhdGguaXNBYnNvbHV0ZShpbkZOKSkge1xuICAgICAgICAgICAgICAgIHZwYXRoSW4gPSBpbkZOO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBsZXQgZGlyID0gcGF0aC5kaXJuYW1lKG1ldGFkYXRhLmRvY3VtZW50LnBhdGgpO1xuICAgICAgICAgICAgICAgIHZwYXRoSW4gPSBwYXRoLm5vcm1hbGl6ZShcbiAgICAgICAgICAgICAgICAgICAgcGF0aC5qb2luKCcvJywgZGlyLCBpbkZOKVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGRvY3VtZW50cyA9IHRoaXMuY29uZmlnLmFrYXNoYS5maWxlY2FjaGUuZG9jdW1lbnRzQ2FjaGU7XG4gICAgICAgICAgICBjb25zdCBhc3NldHMgPSB0aGlzLmNvbmZpZy5ha2FzaGEuZmlsZWNhY2hlLmFzc2V0c0NhY2hlO1xuICAgICAgICAgICAgY29uc3QgZG9jID0gYXdhaXQgZG9jdW1lbnRzLmZpbmQodnBhdGhJbik7XG4gICAgICAgICAgICBsZXQgYXNzZXQ7XG5cbiAgICAgICAgICAgIGlmICghZG9jKSBhc3NldCA9IGF3YWl0IGFzc2V0cy5maW5kKHZwYXRoSW4pO1xuICAgXG4gICAgICAgICAgICBpZiAoIWRvYyAmJiAhYXNzZXQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFBsYW50VU1MTG9jYWwgbm8gcGxhbnR1bWwgYXNzZXQgb3IgZG9jdW1lbnQgZmlsZSAgZm91bmQgZm9yICR7dnBhdGhJbn1gKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGRvYykgZnNwYXRoSW4gPSBkb2MuZnNwYXRoO1xuICAgICAgICAgICAgZWxzZSBpZiAoYXNzZXQpIGZzcGF0aEluID0gYXNzZXQuZnNwYXRoO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSWYgdGhlcmUgd2FzIGFuIGlucHV0IGZpbGUsIHJlY29yZCBpdHMgZnVsbCBwYXRobmFtZVxuICAgICAgICAvLyBhcyB0aGUgaW5wdXRGTnMgZW50cnlcbiAgICAgICAgaWYgKGZzcGF0aEluKSBvcHRpb25zLmlucHV0Rk5zID0gWyBmc3BhdGhJbiBdO1xuXG4gICAgICAgIC8vIFdpdGggbm8gb3V0cHV0LWZpbGUgYXR0cmlidXRlLCB0aGUgcmVuZGVyZWQgU1ZHIGlzXG4gICAgICAgIC8vIGluc2VydGVkIGlubGluZSBpbiB0aGUgZ2VuZXJhdGVkIEhUTUwgcmF0aGVyIHRoYW5cbiAgICAgICAgLy8gd3JpdHRlbiB0byBhIGZpbGUgYW5kIHJlZmVyZW5jZWQgd2l0aCA8aW1nPi5cbiAgICAgICAgY29uc3QgaW5saW5lTW9kZSA9IHR5cGVvZiBvcHRpb25zLm91dHB1dEZOICE9PSAnc3RyaW5nJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfHwgb3B0aW9ucy5vdXRwdXRGTi5sZW5ndGggPCAxO1xuXG4gICAgICAgIGxldCB2cGF0aE91dDtcbiAgICAgICAgaWYgKCFpbmxpbmVNb2RlKSB7XG4gICAgICAgICAgICBpZiAoISBwYXRoLmlzQWJzb2x1dGUob3B0aW9ucy5vdXRwdXRGTikpIHtcbiAgICAgICAgICAgICAgICBsZXQgZGlyID0gcGF0aC5kaXJuYW1lKG1ldGFkYXRhLmRvY3VtZW50LnBhdGgpO1xuICAgICAgICAgICAgICAgIHZwYXRoT3V0ID0gcGF0aC5ub3JtYWxpemUoXG4gICAgICAgICAgICAgICAgICAgIHBhdGguam9pbignLycsIGRpciwgb3B0aW9ucy5vdXRwdXRGTilcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2cGF0aE91dCA9IG9wdGlvbnMub3V0cHV0Rk47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENvbXB1dGUgZnNwYXRoIGZvciB2cGF0aE91dFxuICAgICAgICAgICAgY29uc3QgZnNwYXRoT3V0ID0gcGF0aC5ub3JtYWxpemUocGF0aC5qb2luKFxuICAgICAgICAgICAgICAgIHRoaXMuYXJyYXkub3B0aW9ucy5jb25maWcucmVuZGVyRGVzdGluYXRpb24sIHZwYXRoT3V0XG4gICAgICAgICAgICApKTtcbiAgICAgICAgICAgIG9wdGlvbnMub3V0cHV0Rk4gPSBmc3BhdGhPdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvcHRpb25zLm91dHB1dEZOID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IHdpZHRoID0gJGVsZW1lbnQuYXR0cignd2lkdGgnKTtcbiAgICAgICAgLy8gY29uc29sZS5sb2coYHdpZHRoPSR7d2lkdGh9YCk7XG4gICAgICAgIGlmICh0eXBlb2Ygd2lkdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICB3aWR0aCA9IE51bWJlci5wYXJzZUZsb2F0KHdpZHRoKTtcbiAgICAgICAgICAgIGlmIChpc05hTih3aWR0aCkpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFBsYW50VU1MTG9jYWw6IHdpZHRoIGlzIG5vdCBhIG51bWJlciAke3dpZHRofWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgKDxhbnk+b3B0aW9ucykud2lkdGggPSB3aWR0aDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKG9wdGlvbnMpO1xuXG4gICAgICAgIGNvbnN0IGlkID0gJGVsZW1lbnQuYXR0cignaWQnKTtcbiAgICAgICAgY29uc3QgY2xhenogPSAkZWxlbWVudC5hdHRyKCdjbGFzcycpO1xuICAgICAgICBjb25zdCBhbHQgPSAkZWxlbWVudC5hdHRyKCdhbHQnKTtcbiAgICAgICAgY29uc3QgdGl0bGUgPSAkZWxlbWVudC5hdHRyKCd0aXRsZScpO1xuICAgICAgICBjb25zdCBjYXB0aW9uID0gJGVsZW1lbnQuYXR0cignY2FwdGlvbicpO1xuICAgICAgICBjb25zdCBjcyA9ICRlbGVtZW50LmF0dHIoJ2NoYXJzZXQnKTtcbiAgICAgICAgaWYgKGlzVmFsaWRDaGFyc2V0KGNzKSkgb3B0aW9ucy5jaGFyc2V0ID0gY3M7XG4gICAgICAgIG9wdGlvbnMuZGFya21vZGUgPSB0eXBlb2YgJGVsZW1lbnQucHJvcCgnZGFya21vZGUnKSAhPT0gJ3VuZGVmaW5lZCc7XG4gICAgICAgIC8vIG9wdGlvbnMuZGVidWdzdmVrID0gJGVsZW1lbnQucHJvcCgnZGVidWdzdmVrJyk7XG4gICAgICAgIC8vIG9wdGlvbnMuZmlsZU5hbWVPdmVycmlkZSA9ICRlbGVtZW50LmF0dHIoJ2ZpbGVuYW1lJyk7XG4gICAgICAgIGNvbnN0IG5idGhyZWFkID0gJGVsZW1lbnQuYXR0cignbmJ0aHJlYWQnKTtcbiAgICAgICAgaWYgKHR5cGVvZiBuYnRocmVhZCA9PT0gJ3N0cmluZycpIG9wdGlvbnMubmJ0aHJlYWQgPSBuYnRocmVhZDtcbiAgICAgICAgb3B0aW9ucy5ub21ldGFkYXRhID0gdHlwZW9mICRlbGVtZW50LnByb3AoJ25vbWV0YWRhdGEnKSAhPT0gJ3VuZGVmaW5lZCc7XG4gICAgICAgIC8vIG9wdGlvbnMudGVwcyA9ICRlbGVtZW50LnByb3AoJ3RlcHMnKTtcbiAgICAgICAgLy8gb3B0aW9ucy50aHRtbCA9ICRlbGVtZW50LnByb3AoJ3RodG1sJyk7XG4gICAgICAgIC8vIG9wdGlvbnMudGxhdGV4ID0gJGVsZW1lbnQucHJvcCgndGxhdGV4Jyk7XG4gICAgICAgIC8vIG9wdGlvbnMudHBkZiA9ICRlbGVtZW50LnByb3AoJ3RwZGYnKTtcbiAgICAgICAgb3B0aW9ucy50cG5nID0gdHlwZW9mICRlbGVtZW50LnByb3AoJ3RwbmcnKSAhPT0gJ3VuZGVmaW5lZCc7XG4gICAgICAgIC8vIG9wdGlvbnMudHNjeG1sID0gJGVsZW1lbnQucHJvcCgndHNjeG1sJyk7XG4gICAgICAgIG9wdGlvbnMudHN2ZyA9IHR5cGVvZiAkZWxlbWVudC5wcm9wKCd0c3ZnJykgIT09ICd1bmRlZmluZWQnO1xuICAgICAgICAvLyBvcHRpb25zLnR0eHQgPSAkZWxlbWVudC5wcm9wKCd0dHh0Jyk7XG4gICAgICAgIC8vIG9wdGlvbnMudHV0eHQgPSAkZWxlbWVudC5wcm9wKCd0dXR4dCcpO1xuICAgICAgICAvLyBvcHRpb25zLnR2ZHggPSAkZWxlbWVudC5wcm9wKCd0dmR4Jyk7XG4gICAgICAgIC8vIG9wdGlvbnMudHhtaSA9ICRlbGVtZW50LnByb3AoJ3R4bWknKTtcbiAgICAgICAgLy8gb3B0aW9ucy52ZXJib3NlID0gJGVsZW1lbnQucHJvcCgndmVyYm9zZScpO1xuXG4gICAgICAgIGlmIChvcHRpb25zLnRwbmcgJiYgb3B0aW9ucy50c3ZnKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFBsYW50VU1MTG9jYWwgY2Fubm90IHVzZSBib3RoIHRwbmcgYW5kIHRzdmdgKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIW9wdGlvbnMudHBuZyAmJiAhb3B0aW9ucy50c3ZnKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFBsYW50VU1MTG9jYWwgbXVzdCB1c2Ugb25lIG9mIHRwbmcgb3IgdHN2Z2ApO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpbmxpbmVNb2RlICYmICFvcHRpb25zLnRzdmcpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgUGxhbnRVTUxMb2NhbCB3aXRob3V0IG91dHB1dC1maWxlIHJlbmRlcnMgaW5saW5lIFNWRywgd2hpY2ggcmVxdWlyZXMgdHN2Z2ApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgYnVmID0gYXdhaXQgZG9QbGFudFVNTChvcHRpb25zKTtcblxuICAgICAgICBjb25zdCBjYXAgPSB0eXBlb2YgY2FwdGlvbiA9PT0gJ3N0cmluZydcbiAgICAgICAgICAgID8gYDxmaWdjYXB0aW9uPiR7ZW5jb2RlKGNhcHRpb24pfTwvZmlnY2FwdGlvbj5gXG4gICAgICAgICAgICA6ICcnO1xuICAgICAgICBjb25zdCBUYWx0ID0gdHlwZW9mIGFsdCA9PT0gJ3N0cmluZydcbiAgICAgICAgICAgID8gYGFsdD1cIiR7ZW5jb2RlKGFsdCl9XCJgXG4gICAgICAgICAgICA6ICcnO1xuICAgICAgICBjb25zdCBUdGl0bGUgPSB0eXBlb2YgdGl0bGUgPT09ICdzdHJpbmcnXG4gICAgICAgICAgICA/IGB0aXRsZT1cIiR7ZW5jb2RlKHRpdGxlKX1cImBcbiAgICAgICAgICAgIDogJyc7XG4gICAgICAgIGNvbnN0IFRpZCA9IHR5cGVvZiBpZCA9PT0gJ3N0cmluZydcbiAgICAgICAgICAgID8gYGlkPVwiJHtlbmNvZGUoaWQpfVwiYFxuICAgICAgICAgICAgOiAnJztcbiAgICAgICAgLy8gVGhlIGRpYWdyYW1zLXBsYW50dW1sIGNsYXNzIGNhcnJpZXMgdGhlIHN0eWxlc2hlZXRcbiAgICAgICAgLy8gcnVsZXMgY29uc3RyYWluaW5nIHRoZSBkaWFncmFtIHRvIGl0cyBjb250YWluZXIuXG4gICAgICAgIGNvbnN0IFRjbGF6eiA9IHR5cGVvZiBjbGF6eiA9PT0gJ3N0cmluZydcbiAgICAgICAgICAgID8gYGNsYXNzPVwiZGlhZ3JhbXMtcGxhbnR1bWwgJHtlbmNvZGUoY2xhenopfVwiYFxuICAgICAgICAgICAgOiBgY2xhc3M9XCJkaWFncmFtcy1wbGFudHVtbFwiYDtcbiAgICAgICAgY29uc3QgVHdpZHRoID0gdHlwZW9mIHdpZHRoID09PSAnbnVtYmVyJ1xuICAgICAgICAgICAgPyBgd2lkdGg9XCIke3dpZHRoLnRvU3RyaW5nKCl9XCJgXG4gICAgICAgICAgICA6ICcnO1xuXG4gICAgICAgIC8vIEluIGlubGluZSBtb2RlIHRoZXJlIGlzIG5vIDxpbWc+IHRvIGNhcnJ5IHRoZSBhbHQsXG4gICAgICAgIC8vIHRpdGxlLCBhbmQgd2lkdGggYXR0cmlidXRlcy4gIFRoZSBhbHQgdGV4dCBiZWNvbWVzXG4gICAgICAgIC8vIGFuIGFyaWEtbGFiZWwgb24gdGhlIFNWRyByb290LCB0aGUgd2lkdGggYmVjb21lcyBhXG4gICAgICAgIC8vIHdpZHRoIHN0eWxlIG9uIHRoZSBTVkcgcm9vdCwgYW5kIHRoZSB0aXRsZSBsYW5kcyBvblxuICAgICAgICAvLyB0aGUgPGZpZ3VyZT4uICBUaGUgWE1MIHByb2xvZ3VlIGVtaXR0ZWQgYnkgUGxhbnRVTUxcbiAgICAgICAgLy8gaXMgc3RyaXBwZWQgZm9yIGVtYmVkZGluZyBpbiBIVE1MLlxuICAgICAgICBjb25zdCByZXQgPSBpbmxpbmVNb2RlXG4gICAgICAgICAgICA/IGBcbiAgICAgICAgPGZpZ3VyZSAke1RpZH0gJHtUY2xhenp9ICR7VHRpdGxlfT5cbiAgICAgICAgJHthZGFwdElubGluZVN2ZyhcbiAgICAgICAgICAgIGJ1Zi50b1N0cmluZygndXRmLTgnKS5yZXBsYWNlKC9eXFxzKjxcXD94bWxbXj5dKlxcPz5cXHMqLywgJycpLFxuICAgICAgICAgICAgdHlwZW9mIHdpZHRoID09PSAnbnVtYmVyJyA/IHdpZHRoIDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgdHlwZW9mIGFsdCA9PT0gJ3N0cmluZycgPyBhbHQgOiB1bmRlZmluZWQpfVxuICAgICAgICAke2NhcH1cbiAgICAgICAgPC9maWd1cmU+XG4gICAgICAgIGBcbiAgICAgICAgICAgIDogYFxuICAgICAgICA8ZmlndXJlICR7VGlkfSAke1RjbGF6en0+XG4gICAgICAgIDxpbWcgc3JjPVwiJHtlbmNvZGUodnBhdGhPdXQpfVwiICR7VGFsdH0gJHtUdGl0bGV9ICR7VHdpZHRofS8+XG4gICAgICAgICR7Y2FwfVxuICAgICAgICA8L2ZpZ3VyZT5cbiAgICAgICAgYDtcbiAgICAgICAgLy8gY29uc29sZS5sb2cocmV0KTtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1ZhbGlkQ2hhcnNldChjaGFyc2V0KSB7XG4gICAgaWYgKHR5cGVvZiBjaGFyc2V0ICE9PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGNvbnN0IGNzID0gY2hhcnNldC50b0xvd2VyQ2FzZSgpO1xuXG4gICAgaWYgKHR5cGVvZiBjcyAhPT0gJ3N0cmluZydcbiAgICAgICAgfHwgKGNzICE9PSAndXRmOCcgJiYgY3MgIT09ICd1dGYtOCdcbiAgICAgICAgJiYgY3MgIT09ICd1dGYxNicgJiYgY3MgIT09ICd1dGYtMTYnXG4gICAgICAgICYmIGNzICE9PSAndXRmMTZiZScgJiYgY3MgIT09ICd1dGYtMTZiZSdcbiAgICAgICAgJiYgY3MgIT09ICd1dGYxNmxlJyAmJiBjcyAhPT0gJ3V0Zi0xNmxlJ1xuICAgICAgICAmJiBjcyAhPT0gJ3V0ZjMyJyAmJiBjcyAhPT0gJ3V0Zi0zMidcbiAgICAgICAgJiYgY3MgIT09ICd1dGYzMmxlJyAmJiBjcyAhPT0gJ3V0Zi0zMmxlJylcbiAgICApIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn1cbiJdfQ==