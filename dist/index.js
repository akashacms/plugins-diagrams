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
export { MarkdownITMermaidPlugin } from './markdown-it.js';
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
 * or a single entry in inputFNs, and outputFN is
 * required.  Options that only make sense for the JAR
 * (darkmode, charset, nbthread, outputDir, and the other
 * output formats) are not supported.
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
    if (typeof options.outputFN !== 'string'
        || options.outputFN.length < 1) {
        throw new Error(`plantuml server - no output file`);
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
    await fsp.writeFile(options.outputFN, buf);
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
    // 0 inputFNs requires inputBody, requires outputFN
    // child.stdin.write/end with inputBody
    // child.stdout.pipe(fs.createWriteStream(outputFN))
    // -pipe
    //
    // 1 inputFN, no/ignore inputBody, requires outputFN
    // fs.createReadStream(inputFN).pipe(child.stdin) ??
    // child.stdout.pipe(fs.createWriteStream(outputFN))
    // -pipe
    //
    // IGNORE
    // IGNORE either 0 input FNs & inputBody, or 1 inputFN
    // IGNORE no outputFN
    // IGNORE -tsvg set
    // IGNORE Read stdout into a Buffer, that's converted to string
    // IGNORE -pipe
    // IGNORE Return the string
    // SEE https://stackoverflow.com/questions/14269233/node-js-how-to-read-a-stream-into-a-buffer
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
    if (typeof options.inputFNs === 'undefined'
        && !Array.isArray(options.inputFNs)
        && typeof options.inputBody === 'string'
        && typeof options.outputFN !== 'string') {
        throw new Error(`plantuml - with inputBody, no output destination`);
    }
    // No file names, but an inputBody, and an output file,
    // means we're piping
    if (typeof options.inputFNs === 'undefined'
        && !Array.isArray(options.inputFNs)
        && typeof options.inputBody === 'string'
        && typeof options.outputFN === 'string') {
        args.push('-pipe');
    }
    if (Array.isArray(options.inputFNs)
        && options.inputFNs.length === 1
        && typeof options.outputFN !== 'string') {
        throw new Error(`plantuml - with one input file ${options.inputFNs[0]} no output file`);
    }
    // One file names, ignore inputBody, and an output file,
    // means we're piping
    if (Array.isArray(options.inputFNs)
        && options.inputFNs.length === 1
        && typeof options.outputFN === 'string') {
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
    // No input files, with inputBody, and outputFN,
    // set up the piping from input to output
    if (typeof options.inputFNs === 'undefined'
        && !Array.isArray(options.inputFNs)
        && typeof options.inputBody === 'string'
        && typeof options.outputFN === 'string') {
        child.stdin.write(options.inputBody);
        child.stdout.pipe(fs.createWriteStream(options.outputFN));
        child.stdin.end();
    }
    // One file names, ignore inputBody, and an output file,
    // set up the piping from input to output
    if (Array.isArray(options.inputFNs)
        && options.inputFNs.length === 1
        && typeof options.outputFN === 'string') {
        // const inp = await fsp.readFile(options.inputFNs[0], 'utf-8');
        // child.stdin.write(inp);
        fs.createReadStream(options.inputFNs[0]).pipe(child.stdin);
        child.stdout.pipe(fs.createWriteStream(options.outputFN));
        // child.stdin.end();
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
        if (typeof options.outputFN !== 'string') {
            throw new Error(`PlantUMLLocal no output file name was supplied`);
        }
        let vpathOut;
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
        await doPlantUML(options);
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
        const Tclazz = typeof clazz === 'string'
            ? `class="${encode(clazz)}"`
            : '';
        const Twidth = typeof width === 'number'
            ? `width="${width.toString()}"`
            : '';
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9saWIvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBRUEsT0FBTyxJQUFJLE1BQU0sV0FBVyxDQUFDO0FBQzdCLE9BQU8sRUFBRSxFQUFFLEVBQUUsUUFBUSxJQUFJLEdBQUcsRUFBRSxNQUFNLFNBQVMsQ0FBQztBQUM5QyxPQUFPLElBQUksTUFBTSxXQUFXLENBQUM7QUFDN0IsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUMzQyxPQUFPLEVBQXVCLEtBQUssRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ2hFLE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDckMsT0FBTyxFQUFFLE1BQU0sRUFBaUIsTUFBTSxjQUFjLENBQUE7QUFFcEQsT0FBTyxFQUNILHVCQUF1QixFQUUxQixNQUFNLGtCQUFrQixDQUFDO0FBRTFCLE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO0FBRXRDLCtEQUErRDtBQUMvRCxnRUFBZ0U7QUFDaEUsbUVBQW1FO0FBQ25FLDBEQUEwRDtBQUUxRCxNQUFNLGlCQUFpQixHQUNuQixzS0FBc0ssQ0FBQztBQUUzSyxNQUFNLFVBQVUsR0FBRywyQkFBMkIsQ0FBQztBQUUvQyxPQUFPLEtBQUssTUFBTSxNQUFNLGNBQWMsQ0FBQztBQUN2QyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDckQsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQztBQUVuQyxPQUFPLEVBQ0gsY0FBYyxFQUNkLFNBQVMsRUFDVCxvQkFBb0IsRUFDcEIsZ0JBQWdCLEVBQ25CLE1BQU0scUJBQXFCLENBQUM7QUFFN0IsT0FBTyxFQUVILFNBQVMsRUFDVCxnQkFBZ0IsRUFDaEIsb0JBQW9CLEVBQ3ZCLE1BQU0scUJBQXFCLENBQUM7QUFrQzdCLE1BQU0s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TSxNQUFNLEdBQUcsT0FBTyxLQUFLLEtBQUssUUFBUTtZQUNwQyxDQUFDLENBQUMsVUFBVSxLQUFLLENBQUMsUUFBUSxFQUFFLEdBQUc7WUFDL0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUVULE1BQU0sR0FBRyxHQUFHO2tCQUNGLEdBQUcsSUFBSSxNQUFNO29CQUNYLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxJQUFJLElBQUksTUFBTSxJQUFJLE1BQU07VUFDdkQsR0FBRzs7U0FFSixDQUFDO1FBQ0Ysb0JBQW9CO1FBQ3BCLE9BQU8sR0FBRyxDQUFDO0lBQ2YsQ0FBQztDQUNKO0FBRUQsTUFBTSxVQUFVLGNBQWMsQ0FBQyxPQUFPO0lBQ2xDLElBQUksT0FBTyxPQUFPLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDOUIsT0FBTyxLQUFLLENBQUM7SUFDakIsQ0FBQztJQUNELE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQztJQUVqQyxJQUFJLE9BQU8sRUFBRSxLQUFLLFFBQVE7V0FDbkIsQ0FBQyxFQUFFLEtBQUssTUFBTSxJQUFJLEVBQUUsS0FBSyxPQUFPO2VBQ2hDLEVBQUUsS0FBSyxPQUFPLElBQUksRUFBRSxLQUFLLFFBQVE7ZUFDakMsRUFBRSxLQUFLLFNBQVMsSUFBSSxFQUFFLEtBQUssVUFBVTtlQUNyQyxFQUFFLEtBQUssU0FBUyxJQUFJLEVBQUUsS0FBSyxVQUFVO2VBQ3JDLEVBQUUsS0FBSyxPQUFPLElBQUksRUFBRSxLQUFLLFFBQVE7ZUFDakMsRUFBRSxLQUFLLFNBQVMsSUFBSSxFQUFFLEtBQUssVUFBVSxDQUFDLEVBQzNDLENBQUM7UUFDQyxPQUFPLEtBQUssQ0FBQztJQUNqQixDQUFDO0lBQ0QsT0FBTyxJQUFJLENBQUM7QUFDaEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIlxuXG5pbXBvcnQgcGF0aCBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IGZzLCB7IHByb21pc2VzIGFzIGZzcCB9IGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHV0aWwgZnJvbSAnbm9kZTp1dGlsJztcbmltcG9ydCB7IGRlZmxhdGVSYXdTeW5jIH0gZnJvbSAnbm9kZTp6bGliJztcbmltcG9ydCB7IGV4ZWNTeW5jLCBzcGF3blN5bmMsIHNwYXduIH0gZnJvbSAnbm9kZTpjaGlsZF9wcm9jZXNzJztcbmltcG9ydCB7ZW5jb2RlfSBmcm9tICdodG1sLWVudGl0aWVzJztcbmltcG9ydCB7IHJlbmRlciwgUGludG9yYUNvbmZpZyB9IGZyb20gJ0BwaW50b3JhL2NsaSdcblxuZXhwb3J0IHtcbiAgICBNYXJrZG93bklUTWVybWFpZFBsdWdpbixcbiAgICBNZXJtYWlkUGx1Z2luT3B0aW9uc1xufSBmcm9tICcuL21hcmtkb3duLWl0LmpzJztcblxuY29uc3QgX19kaXJuYW1lID0gaW1wb3J0Lm1ldGEuZGlybmFtZTtcblxuLy8gVGhlIFBsYW50VU1MIEpBUiBpcyBubyBsb25nZXIgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHBhY2thZ2UuXG4vLyBSZW5kZXJpbmcgUGxhbnRVTUwgcmVxdWlyZXMgdGhlIHVzZXIgdG8gZWl0aGVyIHJ1biBhIFBsYW50VU1MXG4vLyBzZXJ2ZXIgKFBMQU5UVU1MX1NFUlZFUl9VUkwpIG9yIGRvd25sb2FkIHRoZSBKQVIgKFBMQU5UVU1MX0pBUikuXG4vLyBTZWUgdGhlIFJFQURNRSBzZWN0aW9uIFwiU2V0dGluZyB1cCBQbGFudFVNTCByZW5kZXJpbmdcIi5cblxuY29uc3QgcGxhbnR1bWxTZXR1cEhlbHAgPVxuICAgIGBTZWUgdGhlIFwiU2V0dGluZyB1cCBQbGFudFVNTCByZW5kZXJpbmdcIiBzZWN0aW9uIG9mIHRoZSBAYWthc2hhY21zL2RpYWdyYW0tbWFrZXJzIFJFQURNRTogaHR0cHM6Ly9naXRodWIuY29tL2FrYXNoYWNtcy9wbHVnaW5zLWRpYWdyYW1zI3NldHRpbmctdXAtcGxhbnR1bWwtcmVuZGVyaW5nYDtcblxuY29uc3QgcGx1Z2luTmFtZSA9ICdAYWthc2hhY21zL2RpYWdyYW0tbWFrZXJzJztcblxuaW1wb3J0ICogYXMgYWthc2hhIGZyb20gJ2FrYXNoYXJlbmRlcic7XG5pbXBvcnQgeyBQbHVnaW4gfSBmcm9tICdha2FzaGFyZW5kZXIvZGlzdC9QbHVnaW4uanMnO1xuY29uc3QgbWFoYWJodXRhID0gYWthc2hhLm1haGFiaHV0YTtcblxuaW1wb3J0IHtcbiAgICBhZGFwdElubGluZVN2ZyxcbiAgICBkb01lcm1haWQsXG4gICAgcmVnaXN0ZXJNZXJtYWlkRm9udHMsXG4gICAgcmVuZGVyTWVybWFpZFN2Z1xufSBmcm9tICcuL3JlbmRlci1tZXJtYWlkLmpzJztcblxuZXhwb3J0IHtcbiAgICBNZXJtYWlkUmVuZGVyT3B0aW9ucyxcbiAgICBkb01lcm1haWQsXG4gICAgcmVuZGVyTWVybWFpZFN2ZyxcbiAgICByZWdpc3Rlck1lcm1haWRGb250c1xufSBmcm9tICcuL3JlbmRlci1tZXJtYWlkLmpzJztcblxuZXhwb3J0IHR5cGUgRGlhZ3JhbXNQbHVnaW5PcHRpb25zID0ge1xuICAgIC8qKlxuICAgICAqIE9wdGlvbnMgZm9yIHJlbmRlcmluZyA8ZGlhZ3JhbXMtbWVybWFpZD4gZWxlbWVudHNcbiAgICAgKi9cbiAgICBtZXJtYWlkPzoge1xuICAgICAgICAvKipcbiAgICAgICAgICogRmlsZSBuYW1lIG9mIGEgSlNPTiBjb25maWd1cmF0aW9uIGZpbGUgdXNpbmcgdGhlIHNhbWVcbiAgICAgICAgICogc2NoZW1hIGFzIHRoZSBtbWRyIC0tY29uZmlnIGZpbGUgKHRoZW1lLCB0aGVtZVZhcmlhYmxlcyxcbiAgICAgICAgICogZmxvd2NoYXJ0LCAuLi4pLiAgUmVhZCBvbmNlIGF0IGNvbmZpZ3VyYXRpb24gdGltZS5cbiAgICAgICAgICovXG4gICAgICAgIGNvbmZpZ0ZOPzogc3RyaW5nO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBKU09OIGNvbmZpZ3VyYXRpb24gc3RyaW5nIHdpdGggdGhlIHNhbWUgc2NoZW1hLiAgVGFrZXNcbiAgICAgICAgICogcHJlY2VkZW5jZSBvdmVyIGNvbmZpZ0ZOLlxuICAgICAgICAgKi9cbiAgICAgICAgY29uZmlnSlNPTj86IHN0cmluZztcblxuICAgICAgICAvKipcbiAgICAgICAgICogVGhlbWUgcHJlc2V0IG5hbWU6IGRlZmF1bHQsIGRhcmssIGZvcmVzdCwgbmV1dHJhbCwgbW9kZXJuLlxuICAgICAgICAgKiBUYWtlcyBwcmVjZWRlbmNlIG92ZXIgdGhlIGNvbmZpZydzIHRoZW1lIG5hbWUuXG4gICAgICAgICAqL1xuICAgICAgICB0aGVtZVByZXNldD86IHN0cmluZztcblxuICAgICAgICAvKipcbiAgICAgICAgICogVFRGL09URiBmb250IGZpbGVzIHRvIHJlZ2lzdGVyIGZvciB0ZXh0IG1lYXN1cmVtZW50LlxuICAgICAgICAgKiBXaGVuIG9taXR0ZWQsIGEgY29tbW9uIHN5c3RlbSBmb250IGlzIHVzZWQgaWYgZm91bmQuXG4gICAgICAgICAqL1xuICAgICAgICBmb250Rk5zPzogc3RyaW5nW107XG4gICAgfTtcbn07XG5cbmV4cG9ydCBjbGFzcyBEaWFncmFtc1BsdWdpbiBleHRlbmRzIFBsdWdpbiB7XG5cbiAgICAjY29uZmlnO1xuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKHBsdWdpbk5hbWUpO1xuICAgIH1cblxuICAgIGNvbmZpZ3VyZShjb25maWcsIG9wdGlvbnM/OiBEaWFncmFtc1BsdWdpbk9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy4jY29uZmlnID0gY29uZmlnO1xuICAgICAgICAvLyB0aGlzLmNvbmZpZyA9IGNvbmZpZztcbiAgICAgICAgdGhpcy5ha2FzaGEgPSBjb25maWcuYWthc2hhO1xuICAgICAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zID8gb3B0aW9ucyA6IHt9O1xuICAgICAgICB0aGlzLm9wdGlvbnMuY29uZmlnID0gY29uZmlnO1xuICAgICAgICBpZiAodGhpcy5vcHRpb25zLm1lcm1haWQ/LmNvbmZpZ0ZOXG4gICAgICAgICAmJiAhdGhpcy5vcHRpb25zLm1lcm1haWQuY29uZmlnSlNPTlxuICAgICAgICApIHtcbiAgICAgICAgICAgIHRoaXMub3B0aW9ucy5tZXJtYWlkLmNvbmZpZ0pTT04gPSBmcy5yZWFkRmlsZVN5bmMoXG4gICAgICAgICAgICAgICAgdGhpcy5vcHRpb25zLm1lcm1haWQuY29uZmlnRk4sICd1dGYtOCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbmZpZy5hZGRNYWhhYmh1dGEobWFoYWJodXRhQXJyYXkodGhpcy5vcHRpb25zLCBjb25maWcsIHRoaXMuYWthc2hhLCB0aGlzKSk7XG4gICAgICAgIGxldCBtb2R1bGVEaXJuYW1lID0gaW1wb3J0Lm1ldGEuZGlybmFtZTtcbiAgICAgICAgY29uZmlnLmFkZEFzc2V0c0RpcihwYXRoLmpvaW4obW9kdWxlRGlybmFtZSwgJy4uJywgJ2Fzc2V0cycpKTtcbiAgICAgICAgY29uZmlnLmFkZFN0eWxlc2hlZXQoe1xuICAgICAgICAgICAgaHJlZjogJy92ZW5kb3IvQGFrYXNoYWNtcy9kaWFncmFtLW1ha2Vycy9zdHlsZS5jc3MnXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGdldCBjb25maWcoKSB7IHJldHVybiB0aGlzLiNjb25maWc7IH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1haGFiaHV0YUFycmF5KFxuICAgIG9wdGlvbnMsXG4gICAgY29uZmlnPzogYWthc2hhLkNvbmZpZ3VyYXRpb24sXG4gICAgYWthc2hhPzogYW55LFxuICAgIHBsdWdpbj86IFBsdWdpblxuKSB7XG4gICAgbGV0IHJldCA9IG5ldyBtYWhhYmh1dGEuTWFoYWZ1bmNBcnJheShwbHVnaW5OYW1lLCBvcHRpb25zKTtcbiAgICByZXQuYWRkTWFoYWZ1bmMobmV3IE1lcm1haWRMb2NhbChjb25maWcsIGFrYXNoYSwgcGx1Z2luKSk7XG4gICAgcmV0LmFkZE1haGFmdW5jKG5ldyBQbGFudFVNTExvY2FsKGNvbmZpZywgYWthc2hhLCBwbHVnaW4pKTtcbiAgICByZXQuYWRkTWFoYWZ1bmMobmV3IFBpbnRvcmFMb2NhbChjb25maWcsIGFrYXNoYSwgcGx1Z2luKSk7XG4gICAgcmV0dXJuIHJldDtcbn07XG5cbmNsYXNzIE1lcm1haWRMb2NhbCBleHRlbmRzIGFrYXNoYS5DdXN0b21FbGVtZW50IHtcblx0Z2V0IGVsZW1lbnROYW1lKCkgeyByZXR1cm4gXCJkaWFncmFtcy1tZXJtYWlkXCI7IH1cblxuICAgIGFzeW5jIHByb2Nlc3MoJGVsZW1lbnQsIG1ldGFkYXRhLCBkaXJ0eTogRnVuY3Rpb24pIHtcblxuICAgICAgICBsZXQgY29kZSA9ICRlbGVtZW50LnRleHQoKTtcbiAgICAgICAgY29uc3Qgb3V0cHV0Rk4gPSAkZWxlbWVudC5hdHRyKCdvdXRwdXQtZmlsZScpO1xuICAgICAgICBjb25zdCBpbmYgPSAgJGVsZW1lbnQuYXR0cignaW5wdXQtZmlsZScpO1xuXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGBNZXJtYWlkTG9jYWwgJHtpbmZ9ID09PiAke291dHB1dEZOfWApO1xuXG4gICAgICAgIGxldCB2cGF0aEluO1xuICAgICAgICBsZXQgZnNwYXRoSW47XG4gICAgICAgIGlmICh0eXBlb2YgaW5mID09PSAnc3RyaW5nJ1xuICAgICAgICAgJiYgaW5mLmxlbmd0aCA+PSAxXG4gICAgICAgICkge1xuICAgICAgICAgICAgaWYgKHBhdGguaXNBYnNvbHV0ZShpbmYpKSB7XG4gICAgICAgICAgICAgICAgdnBhdGhJbiA9IGluZjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbGV0IGRpciA9IHBhdGguZGlybmFtZShtZXRhZGF0YS5kb2N1bWVudC5wYXRoKTtcbiAgICAgICAgICAgICAgICB2cGF0aEluID0gcGF0aC5ub3JtYWxpemUoXG4gICAgICAgICAgICAgICAgICAgIHBhdGguam9pbignLycsIGRpciwgaW5mKVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZG9jdW1lbnRzID0gdGhpcy5jb25maWcuYWthc2hhLmZpbGVjYWNoZS5kb2N1bWVudHNDYWNoZTtcbiAgICAgICAgY29uc3QgYXNzZXRzID0gdGhpcy5ha2FzaGEuZmlsZWNhY2hlLmFzc2V0c0NhY2hlO1xuXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGBNZXJtYWlkTG9jYWwgJHtpbmZ9ICR7dnBhdGhJbn1gKTtcblxuICAgICAgICBjb25zdCBkb2MgPSB2cGF0aEluXG4gICAgICAgICAgICA/IGF3YWl0IGRvY3VtZW50cy5maW5kKHZwYXRoSW4pXG4gICAgICAgICAgICA6IHVuZGVmaW5lZDtcblxuICAgICAgICBsZXQgYXNzZXQ7XG4gICAgICAgIGlmICghZG9jKSBhc3NldCA9IHZwYXRoSW5cbiAgICAgICAgICAgID8gYXdhaXQgYXNzZXRzLmZpbmQodnBhdGhJbilcbiAgICAgICAgICAgIDogdW5kZWZpbmVkO1xuICAgXG4gICAgICAgIGlmIChkb2MpIGZzcGF0aEluID0gZG9jLmZzcGF0aDtcbiAgICAgICAgZWxzZSBpZiAoYXNzZXQpIGZzcGF0aEluID0gYXNzZXQuZnNwYXRoO1xuXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGBNZXJtYWlkTG9jYWwgJHtpbmZ9ICR7dnBhdGhJbn0gJHtmc3BhdGhJbn1gKTtcblxuICAgICAgICBpZiAodHlwZW9mIGZzcGF0aEluID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgY29kZSA9IGF3YWl0IGZzcC5yZWFkRmlsZShmc3BhdGhJbiwgJ3V0Zi04Jyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGNvZGUgIT09ICdzdHJpbmcnIHx8IGNvZGUubGVuZ3RoIDwgMSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBkaWFncmFtcy1tZXJtYWlkIHJlcXVpcmVzIGFuIGlucHV0LWZpbGUgb3IgYW4gaW5saW5lIGRpYWdyYW0gYm9keWApO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gY29uc29sZS5sb2coYE1lcm1haWRMb2NhbCAke2luZn0gJHt2cGF0aElufSAke2ZzcGF0aElufSByZWFkIGNvZGUgJHtjb2RlfWApO1xuXG4gICAgICAgIGNvbnN0IG1lcm1haWRPcHRpb25zID0gdGhpcy5hcnJheS5vcHRpb25zPy5tZXJtYWlkID8/IHt9O1xuXG4gICAgICAgIC8vIFdpdGggbm8gb3V0cHV0LWZpbGUgYXR0cmlidXRlLCB0aGUgcmVuZGVyZWQgU1ZHIGlzXG4gICAgICAgIC8vIGluc2VydGVkIGlubGluZSBpbiB0aGUgZ2VuZXJhdGVkIEhUTUwgcmF0aGVyIHRoYW5cbiAgICAgICAgLy8gd3JpdHRlbiB0byBhIGZpbGUgYW5kIHJlZmVyZW5jZWQgd2l0aCA8aW1nPi5cbiAgICAgICAgY29uc3QgaW5saW5lTW9kZSA9IHR5cGVvZiBvdXRwdXRGTiAhPT0gJ3N0cmluZydcbiAgICAgICAgICAgICAgICAgICAgICAgIHx8IG91dHB1dEZOLmxlbmd0aCA8IDE7XG5cbiAgICAgICAgbGV0IHN2ZztcbiAgICAgICAgbGV0IGZzcGF0aE91dDtcbiAgICAgICAgaWYgKCFpbmxpbmVNb2RlKSB7XG4gICAgICAgICAgICBpZiAoIW91dHB1dEZOLmVuZHNXaXRoKCcuc3ZnJykpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGRpYWdyYW1zLW1lcm1haWQgbXVzdCBoYXZlIG91dHB1dC1maWxlIHdpdGggLnN2ZyBleHRlbnNpb24gLSBtZXJtYWlkLXdhc20tcmVuZGVyZXIgZG9lcyBub3Qgc3VwcG9ydCAucG5nYCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZzcGF0aE91dCA9IHBhdGguam9pbihcbiAgICAgICAgICAgICAgICB0aGlzLmNvbmZpZy5yZW5kZXJEZXN0aW5hdGlvbiwgb3V0cHV0Rk5cbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIGF3YWl0IGZzcC5ta2RpcihwYXRoLmRpcm5hbWUoZnNwYXRoT3V0KSwge1xuICAgICAgICAgICAgICAgIHJlY3Vyc2l2ZTogdHJ1ZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKGlubGluZU1vZGUpIHtcbiAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShtZXJtYWlkT3B0aW9ucy5mb250Rk5zKVxuICAgICAgICAgICAgICAgICAmJiBtZXJtYWlkT3B0aW9ucy5mb250Rk5zLmxlbmd0aCA+PSAxXG4gICAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlZ2lzdGVyTWVybWFpZEZvbnRzKG1lcm1haWRPcHRpb25zLmZvbnRGTnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzdmcgPSByZW5kZXJNZXJtYWlkU3ZnKGNvZGUsXG4gICAgICAgICAgICAgICAgICAgIG1lcm1haWRPcHRpb25zLmNvbmZpZ0pTT04sXG4gICAgICAgICAgICAgICAgICAgIG1lcm1haWRPcHRpb25zLnRoZW1lUHJlc2V0KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgZG9NZXJtYWlkKHtcbiAgICAgICAgICAgICAgICAgICAgY29kZSxcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0Rk46IGZzcGF0aE91dCxcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnSlNPTjogbWVybWFpZE9wdGlvbnMuY29uZmlnSlNPTixcbiAgICAgICAgICAgICAgICAgICAgdGhlbWVQcmVzZXQ6IG1lcm1haWRPcHRpb25zLnRoZW1lUHJlc2V0LFxuICAgICAgICAgICAgICAgICAgICBmb250Rk5zOiBtZXJtYWlkT3B0aW9ucy5mb250Rk5zXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihgTWVybWFpZCB0aHJldyBlcnJvciAke2Vyci5tZXNzYWdlfVxuSW5wdXQ6ICR7aW5mfSAke2ZzcGF0aElufSBPdXRwdXQ6ICR7b3V0cHV0Rk59ICR7ZnNwYXRoT3V0fVxuJHtjb2RlfVxuYCk7XG4gICAgICAgICAgICByZXR1cm4gYFxuPGRpdiBjbGFzcz1cImRpYWdyYW1zLXJlbmRlci1lcnJvclwiPlxuPHNwYW4gY2xhc3M9XCJkaWFncmFtcy10aXRsZVwiPk1lcm1haWQgdGhyZXcgZXJyb3IgJHtlbmNvZGUoZXJyLm1lc3NhZ2UpfTwvc3Bhbj5cbjxzcGFuIGNsYXNzPVwiZGlhZ3JhbXMtZXJyb3ItZmlsZXNcIj5cbjxiPklucHV0OjwvYj4gJHtpbmZ9ICR7ZnNwYXRoSW59PGJyLz5cbjxiPk91dHB1dDo8L2I+ICR7b3V0cHV0Rk59ICR7ZnNwYXRoT3V0fTwvc3Bhbj5cbjxjb2RlIGNsYXNzPVwiZGlhZ3JhbXMtZXJyb3ItaW5wdXRcIj48cHJlPiR7ZW5jb2RlKGNvZGUpfTwvcHJlPjwvY29kZT5cbjwvZGl2PlxuYDtcbiAgICAgICAgICAgIC8vIHRocm93IG5ldyBFcnJvcihgTWVybWFpZCB0aHJldyBlcnJvciAke2Vyci5tZXNzYWdlfWApO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gZWxzZVxuICAgICAgICBsZXQgd2lkdGggPSAkZWxlbWVudC5hdHRyKCd3aWR0aCcpO1xuICAgICAgICBpZiAodHlwZW9mIHdpZHRoID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgd2lkdGggPSBOdW1iZXIucGFyc2VGbG9hdCh3aWR0aCk7XG4gICAgICAgICAgICBpZiAoaXNOYU4od2lkdGgpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBkaWFncmFtcy1tZXJtYWlkOiB3aWR0aCBpcyBub3QgYSBudW1iZXIgJHt3aWR0aH1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGlkID0gJGVsZW1lbnQuYXR0cignaWQnKTtcbiAgICAgICAgY29uc3QgY2xhenogPSAkZWxlbWVudC5hdHRyKCdjbGFzcycpO1xuICAgICAgICBjb25zdCBhbHQgPSAkZWxlbWVudC5hdHRyKCdhbHQnKTtcbiAgICAgICAgY29uc3QgdGl0bGUgPSAkZWxlbWVudC5hdHRyKCd0aXRsZScpO1xuICAgICAgICBjb25zdCBjYXB0aW9uID0gJGVsZW1lbnQuYXR0cignY2FwdGlvbicpO1xuXG4gICAgICAgIGNvbnN0IGNhcCA9IHR5cGVvZiBjYXB0aW9uID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgPyBgPGZpZ2NhcHRpb24+JHtlbmNvZGUoY2FwdGlvbil9PC9maWdjYXB0aW9uPmBcbiAgICAgICAgICAgIDogJyc7XG4gICAgICAgIGNvbnN0IFRhbHQgPSB0eXBlb2YgYWx0ID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgPyBgYWx0PVwiJHtlbmNvZGUoYWx0KX1cImBcbiAgICAgICAgICAgIDogJyc7XG4gICAgICAgIGNvbnN0IFR0aXRsZSA9IHR5cGVvZiB0aXRsZSA9PT0gJ3N0cmluZydcbiAgICAgICAgICAgID8gYHRpdGxlPVwiJHtlbmNvZGUodGl0bGUpfVwiYFxuICAgICAgICAgICAgOiAnJztcbiAgICAgICAgY29uc3QgVGlkID0gdHlwZW9mIGlkID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgPyBgaWQ9XCIke2VuY29kZShpZCl9XCJgXG4gICAgICAgICAgICA6ICcnO1xuICAgICAgICAvLyBUaGUgZGlhZ3JhbXMtbWVybWFpZCBjbGFzcyBjYXJyaWVzIHRoZSBzdHlsZXNoZWV0IHJ1bGVzXG4gICAgICAgIC8vIGNvbnN0cmFpbmluZyB0aGUgZGlhZ3JhbSB0byBpdHMgY29udGFpbmVyIChpc3N1ZSAjMTkpLlxuICAgICAgICBjb25zdCBUY2xhenogPSB0eXBlb2YgY2xhenogPT09ICdzdHJpbmcnXG4gICAgICAgICAgICA/IGBjbGFzcz1cImRpYWdyYW1zLW1lcm1haWQgJHtlbmNvZGUoY2xhenopfVwiYFxuICAgICAgICAgICAgOiBgY2xhc3M9XCJkaWFncmFtcy1tZXJtYWlkXCJgO1xuICAgICAgICBjb25zdCBUd2lkdGggPSB0eXBlb2Ygd2lkdGggPT09ICdudW1iZXInXG4gICAgICAgICAgICA/IGB3aWR0aD1cIiR7d2lkdGgudG9TdHJpbmcoKX1cImBcbiAgICAgICAgICAgIDogJyc7XG5cbiAgICAgICAgLy8gSW4gaW5saW5lIG1vZGUgdGhlcmUgaXMgbm8gPGltZz4gdG8gY2FycnkgdGhlIGFsdCwgdGl0bGUsXG4gICAgICAgIC8vIGFuZCB3aWR0aCBhdHRyaWJ1dGVzLiAgVGhlIGFsdCB0ZXh0IGJlY29tZXMgYW4gYXJpYS1sYWJlbFxuICAgICAgICAvLyBvbiB0aGUgU1ZHIHJvb3QsIHRoZSB3aWR0aCBiZWNvbWVzIGEgd2lkdGggc3R5bGUgb24gdGhlXG4gICAgICAgIC8vIFNWRyByb290LCBhbmQgdGhlIHRpdGxlIGxhbmRzIG9uIHRoZSA8ZmlndXJlPi5cbiAgICAgICAgY29uc3QgcmV0ID0gaW5saW5lTW9kZVxuICAgICAgICAgICAgPyBgXG4gICAgICAgIDxmaWd1cmUgJHtUaWR9ICR7VGNsYXp6fSAke1R0aXRsZX0+XG4gICAgICAgICR7YWRhcHRJbmxpbmVTdmcoc3ZnLFxuICAgICAgICAgICAgdHlwZW9mIHdpZHRoID09PSAnbnVtYmVyJyA/IHdpZHRoIDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgdHlwZW9mIGFsdCA9PT0gJ3N0cmluZycgPyBhbHQgOiB1bmRlZmluZWQpfVxuICAgICAgICAke2NhcH1cbiAgICAgICAgPC9maWd1cmU+XG4gICAgICAgIGBcbiAgICAgICAgICAgIDogYFxuICAgICAgICA8ZmlndXJlICR7VGlkfSAke1RjbGF6en0+XG4gICAgICAgIDxpbWcgc3JjPVwiJHtlbmNvZGUob3V0cHV0Rk4pfVwiICR7VGFsdH0gJHtUdGl0bGV9ICR7VHdpZHRofS8+XG4gICAgICAgICR7Y2FwfVxuICAgICAgICA8L2ZpZ3VyZT5cbiAgICAgICAgYDtcbiAgICAgICAgLy8gY29uc29sZS5sb2coYE1lcm1haWRMb2NhbCByZXR1cm5pbmcgYCwge1xuICAgICAgICAvLyAgICAgaWQ6IGlkLFxuICAgICAgICAvLyAgICAgVGlkOiBUaWQsXG4gICAgICAgIC8vICAgICBpbnB1dEZpbGU6IGluZixcbiAgICAgICAgLy8gICAgIG91dHB1dEZOOiBvdXRwdXRGTixcbiAgICAgICAgLy8gICAgIHJldDogcmV0XG4gICAgICAgIC8vIH0pO1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhgTWVybWFpZExvY2FsIHJldHVybmluZyAke3JldH1gKTtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG59XG5cblxuXG5leHBvcnQgdHlwZSBQaW50b3JhUmVuZGVyT3B0aW9ucyA9IHtcbiAgICAvKipcbiAgICAgKiBwaW50b3JhIERTTCBjb2RlIHRvIHJlbmRlclxuICAgICAqL1xuICAgIGNvZGU6IHN0cmluZ1xuICAgIGRldmljZVBpeGVsUmF0aW8/OiBudW1iZXIgfCBudWxsXG4gICAgLyoqXG4gICAgICogVHlwZSBmb3IgdGhlIG91dHB1dCBmaWxlXG4gICAgICogXG4gICAgLy8gaW1hZ2Uvc3ZnK3htbFxuICAgIC8vIGltYWdlL2pwZWdcbiAgICAvLyBpbWFnZS9wbmdcbiAgICAgKi9cbiAgICBtaW1lVHlwZT86IHN0cmluZ1xuICAgIC8qKlxuICAgICAqIEFzc2lnbiBleHRyYSBiYWNrZ3JvdW5kIGNvbG9yXG4gICAgICovXG4gICAgYmFja2dyb3VuZENvbG9yPzogc3RyaW5nXG4gICAgcGludG9yYUNvbmZpZz86IFBhcnRpYWw8UGludG9yYUNvbmZpZz5cbiAgICAvKipcbiAgICAgKiB3aWR0aCBvZiB0aGUgb3V0cHV0LCBoZWlnaHQgd2lsbCBiZSBjYWxjdWxhdGVkIGFjY29yZGluZyB0byB0aGUgZGlhZ3JhbSBjb250ZW50IHJhdGlvXG4gICAgICovXG4gICAgd2lkdGg/OiBudW1iZXJcbiAgICAvKipcbiAgICAgKiBXaGV0aGVyIHdlIHNob3VsZCBydW4gcmVuZGVyIGluIGEgc3VicHJvY2VzcyByYXRoZXIgaW4gY3VycmVudCBwcm9jZXNzLlxuICAgICAqIElmIHlvdSBjYWxsIHRoZSBgcmVuZGVyYCBmdW5jdGlvbiwgYnkgZGVmYXVsdCB0aGlzIGlzIHRydWUsIHRvIGF2b2lkIHBvbGx1dGluZyB0aGUgZ2xvYmFsIGVudmlyb25tZW50LlxuICAgICAqL1xuICAgIHJlbmRlckluU3VicHJvY2Vzcz86IGJvb2xlYW5cblxuICAgIG91dHB1dEZOOiBzdHJpbmc7XG59O1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZG9QaW50b3JhKFxuICAgIG9wdGlvbnM6IFBpbnRvcmFSZW5kZXJPcHRpb25zXG4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCByZW5kZXJPcHRzID0gc3RydWN0dXJlZENsb25lKG9wdGlvbnMpO1xuICAgIGRlbGV0ZSByZW5kZXJPcHRzLm91dHB1dEZOO1xuXG4gICAgY29uc3QgYnVmID0gYXdhaXQgcmVuZGVyKHJlbmRlck9wdHMpO1xuXG4gICAgaWYgKG9wdGlvbnMub3V0cHV0Rk4pIHtcbiAgICAgICAgYXdhaXQgZnNwLndyaXRlRmlsZShvcHRpb25zLm91dHB1dEZOLCBidWYpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gb3V0cHV0IGZpbGUgRk4gJHt1dGlsLmluc3BlY3Qob3B0aW9ucyl9YCk7XG4gICAgfVxufVxuXG5jbGFzcyBQaW50b3JhTG9jYWwgZXh0ZW5kcyBha2FzaGEuQ3VzdG9tRWxlbWVudCB7XG5cdGdldCBlbGVtZW50TmFtZSgpIHsgcmV0dXJuIFwiZGlhZ3JhbXMtcGludG9yYVwiOyB9XG5cbiAgICBhc3luYyBwcm9jZXNzKCRlbGVtZW50LCBtZXRhZGF0YSwgZGlydHk6IEZ1bmN0aW9uKSB7XG4gICAgICAgIGNvbnN0IG9wdGlvbnM6IFBpbnRvcmFSZW5kZXJPcHRpb25zID0ge1xuICAgICAgICAgICAgY29kZTogJGVsZW1lbnQudGV4dCgpLFxuICAgICAgICAgICAgb3V0cHV0Rk46ICRlbGVtZW50LmF0dHIoJ291dHB1dC1maWxlJylcbiAgICAgICAgfTtcblxuICAgICAgICBsZXQgdnBhdGhJbjtcbiAgICAgICAgbGV0IGZzcGF0aEluO1xuICAgICAgICBjb25zdCBpbmYgPSAgJGVsZW1lbnQuYXR0cignaW5wdXQtZmlsZScpO1xuICAgICAgICBpZiAodHlwZW9mIGluZiA9PT0gJ3N0cmluZydcbiAgICAgICAgICYmIGluZi5sZW5ndGggPj0gMVxuICAgICAgICApIHtcbiAgICAgICAgICAgIGlmIChwYXRoLmlzQWJzb2x1dGUoaW5mKSkge1xuICAgICAgICAgICAgICAgIHZwYXRoSW4gPSBpbmY7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGxldCBkaXIgPSBwYXRoLmRpcm5hbWUobWV0YWRhdGEuZG9jdW1lbnQucGF0aCk7XG4gICAgICAgICAgICAgICAgdnBhdGhJbiA9IHBhdGgubm9ybWFsaXplKFxuICAgICAgICAgICAgICAgICAgICBwYXRoLmpvaW4oJy8nLCBkaXIsIGluZilcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gY29uc29sZS5sb2coYFBpbnRvcmFMb2NhbCBpbnB1dC1maWxlICR7dXRpbC5pbnNwZWN0KGluZil9IHZwYXRoSW4gJHt1dGlsLmluc3BlY3QodnBhdGhJbil9YCk7XG5cbiAgICAgICAgY29uc3QgZG9jdW1lbnRzID0gdGhpcy5jb25maWcuYWthc2hhLmZpbGVjYWNoZS5kb2N1bWVudHNDYWNoZTtcbiAgICAgICAgY29uc3QgYXNzZXRzID0gdGhpcy5ha2FzaGEuZmlsZWNhY2hlLmFzc2V0c0NhY2hlO1xuICAgICAgICBjb25zdCBkb2MgPSB2cGF0aEluXG4gICAgICAgICAgICA/IGF3YWl0IGRvY3VtZW50cy5maW5kKHZwYXRoSW4pXG4gICAgICAgICAgICA6IHVuZGVmaW5lZDtcbiAgICAgICAgbGV0IGFzc2V0O1xuXG4gICAgICAgIGlmICghZG9jKSBhc3NldCA9IHZwYXRoSW5cbiAgICAgICAgICAgID8gYXdhaXQgYXNzZXRzLmZpbmQodnBhdGhJbilcbiAgICAgICAgICAgIDogdW5kZWZpbmVkO1xuICAgXG4gICAgICAgIGlmIChkb2MpIGZzcGF0aEluID0gZG9jLmZzcGF0aDtcbiAgICAgICAgZWxzZSBpZiAoYXNzZXQpIGZzcGF0aEluID0gYXNzZXQuZnNwYXRoO1xuXG4gICAgICAgIGlmICh0eXBlb2YgZnNwYXRoSW4gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMuY29kZSA9PT0gJ3N0cmluZydcbiAgICAgICAgICAgICAmJiBvcHRpb25zLmNvZGUubGVuZ3RoID49IDFcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgZGlhZ3JhbXMtcGludG9yYSAtIGVpdGhlciBzcGVjaWZ5IGlucHV0LWZpbGUgT1IgYSBkaWFncmFtIGJvZHksIG5vdCBib3RoYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvcHRpb25zLmNvZGUgPSBhd2FpdCBmc3AucmVhZEZpbGUoZnNwYXRoSW4sICd1dGYtOCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLm91dHB1dEZOICE9PSAnc3RyaW5nJ1xuICAgICAgICAgfHwgb3B0aW9ucy5vdXRwdXRGTi5sZW5ndGggPCAxXG4gICAgICAgICkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBkaWFncmFtcy1waW50b3JhIG11c3QgaGF2ZSBvdXRwdXQtZmlsZWApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcHhyID0gJGVsZW1lbnQuYXR0cigncGl4ZWwtcmF0aW8nKTtcbiAgICAgICAgaWYgKHR5cGVvZiBweHIgPT09ICdzdHJpbmcnXG4gICAgICAgICAmJiBweHIubGVuZ3RoID49IDFcbiAgICAgICAgKSB7XG4gICAgICAgICAgICBjb25zdCByID0gTnVtYmVyLnBhcnNlRmxvYXQocHhyKTtcbiAgICAgICAgICAgIGlmIChpc05hTihyKSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgZGlhZ3JhbXMtcGludG9yYTogcGl4ZWwtcmF0aW8gaXMgbm90IGEgbnVtYmVyICR7cHhyfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3B0aW9ucy5kZXZpY2VQaXhlbFJhdGlvID0gcjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG1pbWUgPSAkZWxlbWVudC5hdHRyKCdtaW1lLXR5cGUnKTtcbiAgICAgICAgaWYgKHR5cGVvZiBtaW1lID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICAgIG1pbWUgPT09ICdpbWFnZS9zdmcreG1sJ1xuICAgICAgICAgICAgIHx8IG1pbWUgPT09ICdpbWFnZS9qcGVnJ1xuICAgICAgICAgICAgIHx8IG1pbWUgPT09ICdpbWFnZS9wbmcnXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICBvcHRpb25zLm1pbWVUeXBlID0gbWltZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIE1JTUUgdHlwZSAke3V0aWwuaW5zcGVjdChtaW1lKX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGJnQ29sb3IgPSAkZWxlbWVudC5hdHRyKCdiZy1jb2xvcicpO1xuICAgICAgICBpZiAodHlwZW9mIGJnQ29sb3IgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBvcHRpb25zLmJhY2tncm91bmRDb2xvciA9IGJnQ29sb3I7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB3aWR0aCA9ICRlbGVtZW50LmF0dHIoJ3dpZHRoJyk7XG4gICAgICAgIGlmICh0eXBlb2Ygd2lkdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBvcHRpb25zLndpZHRoID0gTnVtYmVyLnBhcnNlRmxvYXQod2lkdGgpO1xuICAgICAgICAgICAgaWYgKGlzTmFOKG9wdGlvbnMud2lkdGgpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBkaWFncmFtcy1waW50b3JhOiB3aWR0aCBpcyBub3QgYSBudW1iZXIgJHt3aWR0aH1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIG9wdGlvbnMucmVuZGVySW5TdWJwcm9jZXNzID0gZmFsc2U7XG5cbiAgICAgICAgY29uc3QgYnVmID0gYXdhaXQgcmVuZGVyKG9wdGlvbnMpO1xuXG4gICAgICAgIGNvbnN0IGlkID0gJGVsZW1lbnQuYXR0cignaWQnKTtcbiAgICAgICAgY29uc3QgY2xhenogPSAkZWxlbWVudC5hdHRyKCdjbGFzcycpO1xuICAgICAgICBjb25zdCBhbHQgPSAkZWxlbWVudC5hdHRyKCdhbHQnKTtcbiAgICAgICAgY29uc3QgdGl0bGUgPSAkZWxlbWVudC5hdHRyKCd0aXRsZScpO1xuICAgICAgICBjb25zdCBjYXB0aW9uID0gJGVsZW1lbnQuYXR0cignY2FwdGlvbicpO1xuXG4gICAgICAgIGNvbnN0IGNhcCA9IHR5cGVvZiBjYXB0aW9uID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgPyBgPGZpZ2NhcHRpb24+JHtlbmNvZGUoY2FwdGlvbil9PC9maWdjYXB0aW9uPmBcbiAgICAgICAgICAgIDogJyc7XG4gICAgICAgIGNvbnN0IFRhbHQgPSB0eXBlb2YgYWx0ID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgPyBgYWx0PVwiJHtlbmNvZGUoYWx0KX1cImBcbiAgICAgICAgICAgIDogJyc7XG4gICAgICAgIGNvbnN0IFR0aXRsZSA9IHR5cGVvZiB0aXRsZSA9PT0gJ3N0cmluZydcbiAgICAgICAgICAgID8gYHRpdGxlPVwiJHtlbmNvZGUodGl0bGUpfVwiYFxuICAgICAgICAgICAgOiAnJztcbiAgICAgICAgY29uc3QgVGlkID0gdHlwZW9mIGlkID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgPyBgaWQ9XCIke2VuY29kZShpZCl9YFxuICAgICAgICAgICAgOiAnJztcbiAgICAgICAgY29uc3QgVGNsYXp6ID0gdHlwZW9mIGNsYXp6ID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgPyBgY2xhc3M9XCIke2VuY29kZShjbGF6eil9YFxuICAgICAgICAgICAgOiAnJztcbiAgICAgICAgY29uc3QgVHdpZHRoID0gdHlwZW9mIG9wdGlvbnMud2lkdGggPT09ICdudW1iZXInXG4gICAgICAgICAgICA/IGB3aWR0aD1cIiR7b3B0aW9ucy53aWR0aC50b1N0cmluZygpfVwiYFxuICAgICAgICAgICAgOiAnJztcblxuICAgICAgICAvLyBvcHRpb25zLm91dHB1dEZOIHdhcyBzZXQgZnJvbSBvdXRwdXQtZmlsZVxuICAgICAgICAvLyBUaGlzIGNyZWF0ZXMgdnBhdGhPdXQgZnJvbSB0aGF0IHZhbHVlXG4gICAgICAgIC8vIFRoaXMgY29tcHV0cyBmc3BhdGhPdXQsIHdoaWNoIGlzIHRoZW5cbiAgICAgICAgLy8gYXNzaWduZWQgYmFjayBpbnRvIG9wdGlvbnMub3V0cHV0Rk5cblxuICAgICAgICBsZXQgdnBhdGhPdXQ7XG4gICAgICAgIGlmICghIHBhdGguaXNBYnNvbHV0ZShvcHRpb25zLm91dHB1dEZOKSkge1xuICAgICAgICAgICAgbGV0IGRpciA9IHBhdGguZGlybmFtZShtZXRhZGF0YS5kb2N1bWVudC5wYXRoKTtcbiAgICAgICAgICAgIHZwYXRoT3V0ID0gcGF0aC5ub3JtYWxpemUoXG4gICAgICAgICAgICAgICAgcGF0aC5qb2luKCcvJywgZGlyLCBvcHRpb25zLm91dHB1dEZOKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZwYXRoT3V0ID0gb3B0aW9ucy5vdXRwdXRGTjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENvbXB1dGUgZnNwYXRoIGZvciB2cGF0aE91dFxuICAgICAgICBjb25zdCBmc3BhdGhPdXQgPSBwYXRoLm5vcm1hbGl6ZShwYXRoLmpvaW4oXG4gICAgICAgICAgICB0aGlzLmNvbmZpZy5yZW5kZXJEZXN0aW5hdGlvbiwgdnBhdGhPdXRcbiAgICAgICAgKSk7XG4gICAgICAgIG9wdGlvbnMub3V0cHV0Rk4gPSBmc3BhdGhPdXQ7XG5cbiAgICAgICAgaWYgKG9wdGlvbnMub3V0cHV0Rk4pIHtcbiAgICAgICAgICAgIGF3YWl0IGZzcC53cml0ZUZpbGUob3B0aW9ucy5vdXRwdXRGTiwgYnVmKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXQgPSBgXG4gICAgICAgIDxmaWd1cmUgJHtUaWR9ICR7VGNsYXp6fT5cbiAgICAgICAgPGltZyBzcmM9XCIke2VuY29kZSh2cGF0aE91dCl9XCIgJHtUYWx0fSAke1R0aXRsZX0gJHtUd2lkdGh9Lz5cbiAgICAgICAgJHtjYXB9XG4gICAgICAgIDwvZmlndXJlPlxuICAgICAgICBgO1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhyZXQpO1xuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH1cbn1cblxuLyoqXG4gKiBPcHRpb25zIG9iamVjdCB0aGF0IGlzIGNvbnZlcnRlZCBpbnRvIHBsYW50dW1sLmphciBvcHRpb25zLlxuICovXG5leHBvcnQgdHlwZSBkb1BsYW50VU1MT3B0aW9ucyA9IHtcbiAgICAvKipcbiAgICAgKiBUaGUgUGxhbnRVTUwgZGlhZ3JhbSB0ZXh0IHRvIHVzZVxuICAgICAqL1xuICAgIGlucHV0Qm9keT86IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIFplcm8gb3IgbW9yZSBmaWxlIG5hbWVzIGZvciBmaWxlcyB0byByZW5kZXJcbiAgICAgKi9cbiAgICBpbnB1dEZOcz86IHN0cmluZ1tdO1xuXG4gICAgLyoqXG4gICAgICogUG9zc2libGUgZmlsZSB0byB3cml0ZSBvdXRwdXQgaW50b1xuICAgICAqL1xuICAgIG91dHB1dEZOPzogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogVG8gdXNlIGEgc3BlY2lmaWMgY2hhcmFjdGVyIHNldC4gRGVmYXVsdDogVVRGLThcbiAgICAgKi9cbiAgICBjaGFyc2V0Pzogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogVG8gdXNlIGRhcmsgbW9kZSBmb3IgZGlhZ3JhbXNcbiAgICAgKi9cbiAgICBkYXJrbW9kZT86IGJvb2xlYW47XG5cbiAgICAvKipcbiAgICAgKiBUbyBnZW5lcmF0ZSBpbnRlcm1lZGlhdGUgc3ZlayBmaWxlc1xuICAgICAqL1xuICAgIGRlYnVnc3Zlaz86IGJvb2xlYW47XG5cbiAgICAvKipcbiAgICAgKiBcImV4YW1wbGUucHVtbFwiIFRvIG92ZXJyaWRlICVmaWxlbmFtZSUgdmFyaWFibGVcbiAgICAgKi9cbiAgICBmaWxlTmFtZU92ZXJyaWRlPzogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogVG8gdXNlIChOKSB0aHJlYWRzIGZvciBwcm9jZXNzaW5nLiAgVXNlIFwiYXV0b1wiIGZvciA0IHRocmVhZHMuXG4gICAgICovXG4gICAgbmJ0aHJlYWQ/OiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBUbyBOT1QgZXhwb3J0IG1ldGFkYXRhIGluIFBORy9TVkcgZ2VuZXJhdGVkIGZpbGVzXG4gICAgICovXG4gICAgbm9tZXRhZGF0YT86IGJvb2xlYW47XG5cbiAgICAvKipcbiAgICAgKiBUbyBnZW5lcmF0ZSBpbWFnZXMgaW4gdGhlIHNwZWNpZmllZCBkaXJlY3RvcnlcbiAgICAgKi9cbiAgICBvdXRwdXREaXI/OiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBUbyBnZW5lcmF0ZSBpbWFnZXMgdXNpbmcgRVBTIGZvcm1hdFxuICAgICAqL1xuICAgIHRlcHM/OiBib29sZWFuO1xuXG4gICAgLyoqXG4gICAgICogVG8gZ2VuZXJhdGUgSFRNTCBmaWxlIGZvciBjbGFzcyBkaWFncmFtXG4gICAgICovXG4gICAgdGh0bWw/OiBib29sZWFuO1xuXG4gICAgLyoqXG4gICAgICogVG8gZ2VuZXJhdGUgaW1hZ2VzIHVzaW5nIExhVGVYL1Rpa3ogZm9ybWF0XG4gICAgICovXG4gICAgdGxhdGV4PzogYm9vbGVhbjtcblxuICAgIC8qKlxuICAgICAqIFRvIGdlbmVyYXRlIGltYWdlcyB1c2luZyBQREYgZm9ybWF0XG4gICAgICovXG4gICAgdHBkZj86IGJvb2xlYW47XG5cbiAgICAvKipcbiAgICAgKiBUbyBnZW5lcmF0ZSBpbWFnZXMgdXNpbmcgUE5HIGZvcm1hdCAoZGVmYXVsdClcbiAgICAgKi9cbiAgICB0cG5nPzogYm9vbGVhbjtcblxuICAgIC8qKlxuICAgICAqIFRvIGdlbmVyYXRlIFNDWE1MIGZpbGUgZm9yIHN0YXRlIGRpYWdyYW1cbiAgICAgKi9cbiAgICB0c2N4bWw/OiBib29sZWFuO1xuXG4gICAgLyoqXG4gICAgICogVG8gZ2VuZXJhdGUgaW1hZ2VzIHVzaW5nIFNWRyBmb3JtYXRcbiAgICAgKi9cbiAgICB0c3ZnPzogYm9vbGVhbjtcblxuICAgIC8qKlxuICAgICAqIFRvIGdlbmVyYXRlIGltYWdlcyB3aXRoIEFTQ0lJIGFydFxuICAgICAqL1xuICAgIHR0eHQ/OiBib29sZWFuO1xuXG4gICAgLyoqXG4gICAgICogVG8gZ2VuZXJhdGUgaW1hZ2VzIHdpdGggQVNDSUkgYXJ0IHVzaW5nIFVuaWNvZGUgY2hhcmFjdGVyc1xuICAgICAqL1xuICAgIHR1dHh0PzogYm9vbGVhbjtcblxuICAgIC8qKlxuICAgICAqIFRvIGdlbmVyYXRlIGltYWdlcyB1c2luZyBWRFggZm9ybWF0XG4gICAgICovXG4gICAgdHZkeD86IGJvb2xlYW47XG5cbiAgICAvKipcbiAgICAgKiBUbyBnZW5lcmF0ZSBYTUkgZmlsZSBmb3IgY2xhc3MgZGlhZ3JhbVxuICAgICAqL1xuICAgIHR4bWk/OiBib29sZWFuO1xuXG4gICAgLyoqXG4gICAgICogVG8gaGF2ZSBsb2cgaW5mb3JtYXRpb25cbiAgICAgKi9cbiAgICB2ZXJib3NlPzogYm9vbGVhbjtcblxuICAgIC8qKlxuICAgICAqIFVSTCBmb3IgYSBQbGFudFVNTCBzZXJ2ZXIsIHN1Y2ggYXNcbiAgICAgKiBodHRwOi8vbG9jYWxob3N0OjgwODAuICBPdmVycmlkZXMgdGhlXG4gICAgICogUExBTlRVTUxfU0VSVkVSX1VSTCBlbnZpcm9ubWVudCB2YXJpYWJsZS5cbiAgICAgKi9cbiAgICBzZXJ2ZXJVUkw/OiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBGaWxlc3lzdGVtIHBhdGggZm9yIGEgcGxhbnR1bWwuamFyIGZpbGUuXG4gICAgICogT3ZlcnJpZGVzIHRoZSBQTEFOVFVNTF9KQVIgZW52aXJvbm1lbnQgdmFyaWFibGUuXG4gICAgICovXG4gICAgamFyUGF0aD86IHN0cmluZztcbn1cblxuLyoqXG4gKiBSZW5kZXIgYSBQbGFudFVNTCBkaWFncmFtIHVzaW5nIHdoaWNoZXZlciByZW5kZXJpbmdcbiAqIGJhY2tlbmQgaXMgY29uZmlndXJlZC4gIElmIGEgc2VydmVyIFVSTCBpcyBhdmFpbGFibGVcbiAqICh0aGUgc2VydmVyVVJMIG9wdGlvbiBvciB0aGUgUExBTlRVTUxfU0VSVkVSX1VSTFxuICogZW52aXJvbm1lbnQgdmFyaWFibGUpLCB0aGUgZGlhZ3JhbSBpcyBzZW50IHRvIHRoYXRcbiAqIFBsYW50VU1MIHNlcnZlci4gIE90aGVyd2lzZSwgaWYgYSBKQVIgcGF0aCBpcyBhdmFpbGFibGVcbiAqICh0aGUgamFyUGF0aCBvcHRpb24gb3IgdGhlIFBMQU5UVU1MX0pBUiBlbnZpcm9ubWVudFxuICogdmFyaWFibGUpLCB0aGUgZGlhZ3JhbSBpcyByZW5kZXJlZCBsb2NhbGx5IGJ5IHJ1bm5pbmdcbiAqIHRoZSBKQVIgd2l0aCBKYXZhLiAgSWYgbmVpdGhlciBpcyBhdmFpbGFibGUsIGFuIGVycm9yXG4gKiBpcyB0aHJvd24gZGlyZWN0aW5nIHRoZSB1c2VyIHRvIHRoZSBSRUFETUUuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkb1BsYW50VU1MKG9wdGlvbnM6IGRvUGxhbnRVTUxPcHRpb25zKSB7XG4gICAgY29uc3Qgc2VydmVyVVJMID0gb3B0aW9ucy5zZXJ2ZXJVUkxcbiAgICAgICAgICAgID8/IHByb2Nlc3MuZW52LlBMQU5UVU1MX1NFUlZFUl9VUkw7XG4gICAgY29uc3QgamFyUGF0aCA9IG9wdGlvbnMuamFyUGF0aFxuICAgICAgICAgICAgPz8gcHJvY2Vzcy5lbnYuUExBTlRVTUxfSkFSO1xuICAgIGlmICh0eXBlb2Ygc2VydmVyVVJMID09PSAnc3RyaW5nJyAmJiBzZXJ2ZXJVUkwubGVuZ3RoID49IDEpIHtcbiAgICAgICAgcmV0dXJuIGRvUGxhbnRVTUxTZXJ2ZXIob3B0aW9ucyk7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgamFyUGF0aCA9PT0gJ3N0cmluZycgJiYgamFyUGF0aC5sZW5ndGggPj0gMSkge1xuICAgICAgICByZXR1cm4gZG9QbGFudFVNTExvY2FsKG9wdGlvbnMpO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoYFBsYW50VU1MIHJlbmRlcmluZyBpcyBub3QgY29uZmlndXJlZC4gIEVpdGhlciBydW4gYSBQbGFudFVNTCBzZXJ2ZXIgYW5kIHNldCB0aGUgUExBTlRVTUxfU0VSVkVSX1VSTCBlbnZpcm9ubWVudCB2YXJpYWJsZSwgb3IgZG93bmxvYWQgcGxhbnR1bWwuamFyIChucHggZGlhZ3JhbS1tYWtlcnMgcGxhbnR1bWwtZG93bmxvYWQpIGFuZCBzZXQgdGhlIFBMQU5UVU1MX0pBUiBlbnZpcm9ubWVudCB2YXJpYWJsZS4gICR7cGxhbnR1bWxTZXR1cEhlbHB9YCk7XG59XG5cbi8vIFRoZSBhbHBoYWJldCB1c2VkIGJ5IFBsYW50VU1MIHNlcnZlcnMgZm9yIGVuY29kZWRcbi8vIGRpYWdyYW0gdGV4dC4gIEl0IHJlc2VtYmxlcyBiYXNlNjQsIGJ1dCB3aXRoIGFcbi8vIGRpZmZlcmVudCBjaGFyYWN0ZXIgc2V0IGFuZCBvcmRlcmluZy5cbmNvbnN0IHBsYW50dW1sQWxwaGFiZXQgPVxuICAgICcwMTIzNDU2Nzg5QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ei1fJztcblxuLyoqXG4gKiBFbmNvZGUgUGxhbnRVTUwgZGlhZ3JhbSB0ZXh0IGZvciB1c2UgaW4gYSBQbGFudFVNTFxuICogc2VydmVyIFVSTCwgYXMgZG9jdW1lbnRlZCBhdFxuICogaHR0cHM6Ly9wbGFudHVtbC5jb20vdGV4dC1lbmNvZGluZyAtLSB0aGUgdGV4dCBpc1xuICogZGVmbGF0ZWQsIHRoZW4gZW5jb2RlZCB3aXRoIGEgYmFzZTY0LWxpa2UgYWxwaGFiZXQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwbGFudHVtbEVuY29kZShkaWFncmFtOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGNvbnN0IGRlZmxhdGVkID0gZGVmbGF0ZVJhd1N5bmMoXG4gICAgICAgIEJ1ZmZlci5mcm9tKGRpYWdyYW0sICd1dGYtOCcpLCB7IGxldmVsOiA5IH0pO1xuICAgIGxldCByZXQgPSAnJztcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGRlZmxhdGVkLmxlbmd0aDsgaSArPSAzKSB7XG4gICAgICAgIGNvbnN0IGIxID0gZGVmbGF0ZWRbaV07XG4gICAgICAgIGNvbnN0IGIyID0gaSArIDEgPCBkZWZsYXRlZC5sZW5ndGggPyBkZWZsYXRlZFtpICsgMV0gOiAwO1xuICAgICAgICBjb25zdCBiMyA9IGkgKyAyIDwgZGVmbGF0ZWQubGVuZ3RoID8gZGVmbGF0ZWRbaSArIDJdIDogMDtcbiAgICAgICAgcmV0ICs9IHBsYW50dW1sQWxwaGFiZXRbYjEgPj4gMl1cbiAgICAgICAgICAgICArIHBsYW50dW1sQWxwaGFiZXRbKChiMSAmIDB4MDMpIDw8IDQpIHwgKGIyID4+IDQpXVxuICAgICAgICAgICAgICsgcGxhbnR1bWxBbHBoYWJldFsoKGIyICYgMHgwRikgPDwgMikgfCAoYjMgPj4gNildXG4gICAgICAgICAgICAgKyBwbGFudHVtbEFscGhhYmV0W2IzICYgMHgzRl07XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG59XG5cbi8qKlxuICogUmVuZGVyIGEgUGxhbnRVTUwgZGlhZ3JhbSBieSBzZW5kaW5nIGl0IHRvIGEgUGxhbnRVTUxcbiAqIHNlcnZlci4gIFRoZSBzZXJ2ZXIgVVJMIGNvbWVzIGZyb20gdGhlIHNlcnZlclVSTCBvcHRpb25cbiAqIG9yIHRoZSBQTEFOVFVNTF9TRVJWRVJfVVJMIGVudmlyb25tZW50IHZhcmlhYmxlLlxuICpcbiAqIFRoZSBzZXJ2ZXIgc3VwcG9ydHMgYSBzdWJzZXQgb2YgdGhlIEpBUidzIGZlYXR1cmVzOlxuICogUE5HICh0cG5nLCB0aGUgZGVmYXVsdCksIFNWRyAodHN2ZyksIGFuZCBBU0NJSSBhcnRcbiAqICh0dHh0KSBvdXRwdXQgZm9ybWF0cy4gIFRoZSBpbnB1dCBpcyBlaXRoZXIgaW5wdXRCb2R5XG4gKiBvciBhIHNpbmdsZSBlbnRyeSBpbiBpbnB1dEZOcywgYW5kIG91dHB1dEZOIGlzXG4gKiByZXF1aXJlZC4gIE9wdGlvbnMgdGhhdCBvbmx5IG1ha2Ugc2Vuc2UgZm9yIHRoZSBKQVJcbiAqIChkYXJrbW9kZSwgY2hhcnNldCwgbmJ0aHJlYWQsIG91dHB1dERpciwgYW5kIHRoZSBvdGhlclxuICogb3V0cHV0IGZvcm1hdHMpIGFyZSBub3Qgc3VwcG9ydGVkLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZG9QbGFudFVNTFNlcnZlcihvcHRpb25zOiBkb1BsYW50VU1MT3B0aW9ucykge1xuICAgIGNvbnN0IHNlcnZlclVSTCA9IG9wdGlvbnMuc2VydmVyVVJMXG4gICAgICAgICAgICA/PyBwcm9jZXNzLmVudi5QTEFOVFVNTF9TRVJWRVJfVVJMO1xuICAgIGlmICh0eXBlb2Ygc2VydmVyVVJMICE9PSAnc3RyaW5nJyB8fCBzZXJ2ZXJVUkwubGVuZ3RoIDwgMSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sIHNlcnZlciAtIG5vIHNlcnZlciBVUkwuICBTZXQgdGhlIFBMQU5UVU1MX1NFUlZFUl9VUkwgZW52aXJvbm1lbnQgdmFyaWFibGUuICAke3BsYW50dW1sU2V0dXBIZWxwfWApO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgdW5zdXBwb3J0ZWQgb2YgW1xuICAgICAgICAndGVwcycsICd0aHRtbCcsICd0bGF0ZXgnLCAndHBkZicsICd0c2N4bWwnLFxuICAgICAgICAndHZkeCcsICd0eG1pJywgJ3R1dHh0J1xuICAgIF0pIHtcbiAgICAgICAgaWYgKG9wdGlvbnNbdW5zdXBwb3J0ZWRdKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sIHNlcnZlciAtIHRoZSAke3Vuc3VwcG9ydGVkfSBvdXRwdXQgZm9ybWF0IGlzIG5vdCBzdXBwb3J0ZWQgYnkgUGxhbnRVTUwgc2VydmVyIHJlbmRlcmluZyAtIHVzZSB0aGUgSkFSIGluc3RlYWQgKFBMQU5UVU1MX0pBUilgKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAob3B0aW9ucy5kYXJrbW9kZSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sIHNlcnZlciAtIGRhcmttb2RlIGlzIG5vdCBzdXBwb3J0ZWQgYnkgUGxhbnRVTUwgc2VydmVyIHJlbmRlcmluZyAtIHVzZSB0aGUgSkFSIGluc3RlYWQgKFBMQU5UVU1MX0pBUilgKTtcbiAgICB9XG5cbiAgICBsZXQgZm9ybWF0O1xuICAgIGlmIChvcHRpb25zLnRzdmcpIGZvcm1hdCA9ICdzdmcnO1xuICAgIGVsc2UgaWYgKG9wdGlvbnMudHR4dCkgZm9ybWF0ID0gJ3R4dCc7XG4gICAgZWxzZSBmb3JtYXQgPSAncG5nJztcblxuICAgIGxldCBkaWFncmFtO1xuICAgIGlmIChBcnJheS5pc0FycmF5KG9wdGlvbnMuaW5wdXRGTnMpXG4gICAgICYmIG9wdGlvbnMuaW5wdXRGTnMubGVuZ3RoID4gMVxuICAgICkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sIHNlcnZlciAtIG9ubHkgb25lIGlucHV0IGZpbGUgaXMgc3VwcG9ydGVkIGJ5IFBsYW50VU1MIHNlcnZlciByZW5kZXJpbmcgLSB1c2UgdGhlIEpBUiBpbnN0ZWFkIChQTEFOVFVNTF9KQVIpYCk7XG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KG9wdGlvbnMuaW5wdXRGTnMpXG4gICAgICYmIG9wdGlvbnMuaW5wdXRGTnMubGVuZ3RoID09PSAxXG4gICAgKSB7XG4gICAgICAgIGRpYWdyYW0gPSBhd2FpdCBmc3AucmVhZEZpbGUob3B0aW9ucy5pbnB1dEZOc1swXSwgJ3V0Zi04Jyk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2Ygb3B0aW9ucy5pbnB1dEJvZHkgPT09ICdzdHJpbmcnXG4gICAgICYmIG9wdGlvbnMuaW5wdXRCb2R5Lmxlbmd0aCA+PSAxXG4gICAgKSB7XG4gICAgICAgIGRpYWdyYW0gPSBvcHRpb25zLmlucHV0Qm9keTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sIHNlcnZlciAtIG5vIGlucHV0IHNvdXJjZXNgKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIG9wdGlvbnMub3V0cHV0Rk4gIT09ICdzdHJpbmcnXG4gICAgIHx8IG9wdGlvbnMub3V0cHV0Rk4ubGVuZ3RoIDwgMVxuICAgICkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sIHNlcnZlciAtIG5vIG91dHB1dCBmaWxlYCk7XG4gICAgfVxuXG4gICAgY29uc3QgdXJsID0gYCR7c2VydmVyVVJMLnJlcGxhY2UoL1xcLyskLywgJycpfS8ke2Zvcm1hdH0vJHtwbGFudHVtbEVuY29kZShkaWFncmFtKX1gO1xuXG4gICAgbGV0IHJlcztcbiAgICB0cnkge1xuICAgICAgICByZXMgPSBhd2FpdCBmZXRjaCh1cmwpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sIHNlcnZlciAtIGNvdWxkIG5vdCByZWFjaCBQbGFudFVNTCBzZXJ2ZXIgYXQgJHtzZXJ2ZXJVUkx9IC0gJHtlcnIubWVzc2FnZX0uICAke3BsYW50dW1sU2V0dXBIZWxwfWApO1xuICAgIH1cbiAgICBpZiAoIXJlcy5vaykge1xuICAgICAgICAvLyBGb3IgZGlhZ3JhbSBlcnJvcnMgdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFcbiAgICAgICAgLy8gNHh4IHN0YXR1cywgYnV0IHRoZSBib2R5IGlzIHN0aWxsIGEgcmVuZGVyZWRcbiAgICAgICAgLy8gaW1hZ2UgZGVzY3JpYmluZyB0aGUgZXJyb3IuICBSZXBvcnQgdGhlIHN0YXR1c1xuICAgICAgICAvLyBhbmQgbGV0IHRoZSB1c2VyIGluc3BlY3QgdGhlIGRpYWdyYW0uXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgcGxhbnR1bWwgc2VydmVyIC0gJHtzZXJ2ZXJVUkx9IHJlc3BvbmRlZCB3aXRoICR7cmVzLnN0YXR1c30gJHtyZXMuc3RhdHVzVGV4dH0gZm9yIHRoZSBkaWFncmFtYCk7XG4gICAgfVxuXG4gICAgY29uc3QgYnVmID0gQnVmZmVyLmZyb20oYXdhaXQgcmVzLmFycmF5QnVmZmVyKCkpO1xuICAgIGF3YWl0IGZzcC53cml0ZUZpbGUob3B0aW9ucy5vdXRwdXRGTiwgYnVmKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRvUGxhbnRVTUxMb2NhbChvcHRpb25zKSB7XG5cbiAgICBjb25zdCBwbGFudHVtbEphciA9IG9wdGlvbnMuamFyUGF0aFxuICAgICAgICAgICAgPz8gcHJvY2Vzcy5lbnYuUExBTlRVTUxfSkFSO1xuICAgIGlmICh0eXBlb2YgcGxhbnR1bWxKYXIgIT09ICdzdHJpbmcnXG4gICAgIHx8IHBsYW50dW1sSmFyLmxlbmd0aCA8IDFcbiAgICApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBwbGFudHVtbCAtIG5vIEpBUiBmaWxlIGNvbmZpZ3VyZWQuICBEb3dubG9hZCBwbGFudHVtbC5qYXIgKG5weCBkaWFncmFtLW1ha2VycyBwbGFudHVtbC1kb3dubG9hZCkgYW5kIHNldCB0aGUgUExBTlRVTUxfSkFSIGVudmlyb25tZW50IHZhcmlhYmxlLiAgJHtwbGFudHVtbFNldHVwSGVscH1gKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgZnNwLmFjY2VzcyhwbGFudHVtbEphciwgZnMuY29uc3RhbnRzLlJfT0spO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sIC0gdGhlIEpBUiBmaWxlICR7cGxhbnR1bWxKYXJ9IGRvZXMgbm90IGV4aXN0IG9yIGlzIG5vdCByZWFkYWJsZS4gICR7cGxhbnR1bWxTZXR1cEhlbHB9YCk7XG4gICAgfVxuXG4gICAgY29uc3QgYXJncyA9IFtcbiAgICAgICAgLy8gJ2phdmEnLFxuICAgICAgICAnLWphcicsXG4gICAgICAgICctRGphdmEuYXd0LmhlYWRsZXNzPXRydWUnLFxuICAgICAgICAnLS1hZGQtb3BlbnM9amF2YS54bWwvY29tLnN1bi5vcmcuYXBhY2hlLnhhbGFuLmludGVybmFsLnhzbHRjLnRyYXg9QUxMLVVOTkFNRUQnLFxuICAgICAgICBwbGFudHVtbEphcixcbiAgICBdO1xuICAgIGlmIChvcHRpb25zLmNoYXJzZXQpIHtcbiAgICAgICAgYXJncy5wdXNoKCctY2hhcnNldCcpO1xuICAgICAgICBhcmdzLnB1c2gob3B0aW9ucy5jaGFyc2V0KTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMuZGFya21vZGUpIHtcbiAgICAgICAgYXJncy5wdXNoKCctZGFya21vZGUnKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMuZGVidWdzdmVrKSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLWRlYnVnc3ZlaycpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy5maWxlTmFtZU92ZXJyaWRlKSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLWZpbGVuYW1lJyk7XG4gICAgICAgIGFyZ3MucHVzaChvcHRpb25zLmZpbGVOYW1lT3ZlcnJpZGUpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy5uYnRocmVhZCkge1xuICAgICAgICBhcmdzLnB1c2goJy1uYnRocmVhZCcpO1xuICAgICAgICBhcmdzLnB1c2gob3B0aW9ucy5uYnRocmVhZCk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLm5vbWV0YWRhdGEpIHtcbiAgICAgICAgYXJncy5wdXNoKCctbm9tZXRhZGF0YScpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy50ZXBzKSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLXRlcHMnKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMudGh0bWwpIHtcbiAgICAgICAgYXJncy5wdXNoKCctdGh0bWwnKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMudGxhdGV4KSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLXRsYXRleCcpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy50cGRmKSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLXRwZGYnKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMudHBuZykge1xuICAgICAgICBhcmdzLnB1c2goJy10cG5nJyk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnRzY3htbCkge1xuICAgICAgICBhcmdzLnB1c2goJy10c2N4bWwnKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMudHN2Zykge1xuICAgICAgICBhcmdzLnB1c2goJy10c3ZnJyk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnR0eHQpIHtcbiAgICAgICAgYXJncy5wdXNoKCctdHR4dCcpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy50dXR4dCkge1xuICAgICAgICBhcmdzLnB1c2goJy10dXR4dCcpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy50dmR4KSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLXR2ZHgnKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMudHhtaSkge1xuICAgICAgICBhcmdzLnB1c2goJy10eG1pJyk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnZlcmJvc2UpIHtcbiAgICAgICAgYXJncy5wdXNoKCctdmVyYm9zZScpO1xuICAgIH1cblxuICAgIC8vIDAgaW5wdXRGTnMgcmVxdWlyZXMgaW5wdXRCb2R5LCByZXF1aXJlcyBvdXRwdXRGTlxuICAgIC8vIGNoaWxkLnN0ZGluLndyaXRlL2VuZCB3aXRoIGlucHV0Qm9keVxuICAgIC8vIGNoaWxkLnN0ZG91dC5waXBlKGZzLmNyZWF0ZVdyaXRlU3RyZWFtKG91dHB1dEZOKSlcbiAgICAvLyAtcGlwZVxuICAgIC8vXG4gICAgLy8gMSBpbnB1dEZOLCBuby9pZ25vcmUgaW5wdXRCb2R5LCByZXF1aXJlcyBvdXRwdXRGTlxuICAgIC8vIGZzLmNyZWF0ZVJlYWRTdHJlYW0oaW5wdXRGTikucGlwZShjaGlsZC5zdGRpbikgPz9cbiAgICAvLyBjaGlsZC5zdGRvdXQucGlwZShmcy5jcmVhdGVXcml0ZVN0cmVhbShvdXRwdXRGTikpXG4gICAgLy8gLXBpcGVcbiAgICAvL1xuICAgIC8vIElHTk9SRVxuICAgIC8vIElHTk9SRSBlaXRoZXIgMCBpbnB1dCBGTnMgJiBpbnB1dEJvZHksIG9yIDEgaW5wdXRGTlxuICAgIC8vIElHTk9SRSBubyBvdXRwdXRGTlxuICAgIC8vIElHTk9SRSAtdHN2ZyBzZXRcbiAgICAvLyBJR05PUkUgUmVhZCBzdGRvdXQgaW50byBhIEJ1ZmZlciwgdGhhdCdzIGNvbnZlcnRlZCB0byBzdHJpbmdcbiAgICAvLyBJR05PUkUgLXBpcGVcbiAgICAvLyBJR05PUkUgUmV0dXJuIHRoZSBzdHJpbmdcbiAgICAvLyBTRUUgaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTQyNjkyMzMvbm9kZS1qcy1ob3ctdG8tcmVhZC1hLXN0cmVhbS1pbnRvLWEtYnVmZmVyXG4gICAgLy9cbiAgICAvLyBtdWx0aXBsZSBpbnB1dEZOcyAuLiBvcHRpb25hbCBvdXRwdXQtZGlyJ3NcbiAgICAvLyBCb3RoIGdvIG9uIHRoZSBjb21tYW5kLWxpbmVcbiAgICAvL1xuXG4gICAgbGV0IHNwYXdub3B0cyA9IHt9IGFzIGFueTtcblxuICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5pbnB1dEZOcyA9PT0gJ3VuZGVmaW5lZCdcbiAgICAgJiYgIUFycmF5LmlzQXJyYXkob3B0aW9ucy5pbnB1dEZOcylcbiAgICAgJiYgdHlwZW9mIG9wdGlvbnMuaW5wdXRCb2R5ICE9PSAnc3RyaW5nJ1xuICAgICkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sIC0gbm8gaW5wdXQgc291cmNlc2ApO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIG9wdGlvbnMuaW5wdXRGTnMgPT09ICd1bmRlZmluZWQnXG4gICAgICYmICFBcnJheS5pc0FycmF5KG9wdGlvbnMuaW5wdXRGTnMpXG4gICAgICYmIHR5cGVvZiBvcHRpb25zLmlucHV0Qm9keSA9PT0gJ3N0cmluZydcbiAgICAgJiYgdHlwZW9mIG9wdGlvbnMub3V0cHV0Rk4gIT09ICdzdHJpbmcnXG4gICAgKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgcGxhbnR1bWwgLSB3aXRoIGlucHV0Qm9keSwgbm8gb3V0cHV0IGRlc3RpbmF0aW9uYCk7XG4gICAgfVxuICAgIC8vIE5vIGZpbGUgbmFtZXMsIGJ1dCBhbiBpbnB1dEJvZHksIGFuZCBhbiBvdXRwdXQgZmlsZSxcbiAgICAvLyBtZWFucyB3ZSdyZSBwaXBpbmdcbiAgICBpZiAodHlwZW9mIG9wdGlvbnMuaW5wdXRGTnMgPT09ICd1bmRlZmluZWQnXG4gICAgICYmICFBcnJheS5pc0FycmF5KG9wdGlvbnMuaW5wdXRGTnMpXG4gICAgICYmIHR5cGVvZiBvcHRpb25zLmlucHV0Qm9keSA9PT0gJ3N0cmluZydcbiAgICAgJiYgdHlwZW9mIG9wdGlvbnMub3V0cHV0Rk4gPT09ICdzdHJpbmcnXG4gICAgKSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLXBpcGUnKTtcbiAgICB9XG4gICAgaWYgKEFycmF5LmlzQXJyYXkob3B0aW9ucy5pbnB1dEZOcylcbiAgICAgJiYgb3B0aW9ucy5pbnB1dEZOcy5sZW5ndGggPT09IDFcbiAgICAgJiYgdHlwZW9mIG9wdGlvbnMub3V0cHV0Rk4gIT09ICdzdHJpbmcnXG4gICAgKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgcGxhbnR1bWwgLSB3aXRoIG9uZSBpbnB1dCBmaWxlICR7b3B0aW9ucy5pbnB1dEZOc1swXX0gbm8gb3V0cHV0IGZpbGVgKTtcbiAgICB9XG4gICAgLy8gT25lIGZpbGUgbmFtZXMsIGlnbm9yZSBpbnB1dEJvZHksIGFuZCBhbiBvdXRwdXQgZmlsZSxcbiAgICAvLyBtZWFucyB3ZSdyZSBwaXBpbmdcbiAgICBpZiAoQXJyYXkuaXNBcnJheShvcHRpb25zLmlucHV0Rk5zKVxuICAgICAmJiBvcHRpb25zLmlucHV0Rk5zLmxlbmd0aCA9PT0gMVxuICAgICAmJiB0eXBlb2Ygb3B0aW9ucy5vdXRwdXRGTiA9PT0gJ3N0cmluZydcbiAgICApIHtcbiAgICAgICAgYXJncy5wdXNoKCctcGlwZScpO1xuICAgIH1cblxuICAgIGlmIChBcnJheS5pc0FycmF5KG9wdGlvbnMuaW5wdXRGTnMpXG4gICAgICYmIG9wdGlvbnMuaW5wdXRGTnMubGVuZ3RoID4gMVxuICAgICAmJiB0eXBlb2Ygb3B0aW9ucy5vdXRwdXRGTiA9PT0gJ3N0cmluZydcbiAgICApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBwbGFudHVtbCAtIHdpdGggbXVsdGlwbGUgaW5wdXQgZmlsZXMsIG91dHB1dCBmaWxlIG5vdCBhbGxvd2VkYClcbiAgICB9XG5cbiAgICAvLyBtdWx0aXBsZSBmaWxlIG5hbWVzLCBwdXNoIG9udG8gYXJnc1xuICAgIGlmIChBcnJheS5pc0FycmF5KG9wdGlvbnMuaW5wdXRGTnMpXG4gICAgICYmIG9wdGlvbnMuaW5wdXRGTnMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKGNvbnN0IGlucHV0Rk4gb2Ygb3B0aW9ucy5pbnB1dEZOcykge1xuICAgICAgICAgICAgYXJncy5wdXNoKGlucHV0Rk4pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBvcHRpb25zLm91dHB1dERpciA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgYXJncy5wdXNoKCctb3V0cHV0Jyk7XG4gICAgICAgIGFyZ3MucHVzaChvcHRpb25zLm91dHB1dERpcik7XG4gICAgfVxuXG4gICAgLy8gTm93IHRoYXQgdGhlIGNvbW1hbmQgYXJncyBhbmQgc3Bhd25vcHRzIGFyZSBzZXQgdXBcbiAgICAvLyBydW4gdGhlIGNvbW1hbmRcbiAgICAvLyBjb25zb2xlLmxvZyh7XG4gICAgLy8gICAgIHNwYXdub3B0cywgYXJnc1xuICAgIC8vIH0pO1xuICAgIGNvbnN0IGNoaWxkID0gc3Bhd24oJ2phdmEnLCBhcmdzLCBzcGF3bm9wdHMpO1xuXG4gICAgLy8gTmV4dCwgc2V0IHVwIHN0ZGluL3N0ZG91dCBwaXBlcyBpbiBjYXNlXG4gICAgLy8gb2YgdXNpbmcgLXBpcGUgbW9kZVxuXG4gICAgLy8gTm8gaW5wdXQgZmlsZXMsIHdpdGggaW5wdXRCb2R5LCBhbmQgb3V0cHV0Rk4sXG4gICAgLy8gc2V0IHVwIHRoZSBwaXBpbmcgZnJvbSBpbnB1dCB0byBvdXRwdXRcbiAgICBpZiAodHlwZW9mIG9wdGlvbnMuaW5wdXRGTnMgPT09ICd1bmRlZmluZWQnXG4gICAgICYmICFBcnJheS5pc0FycmF5KG9wdGlvbnMuaW5wdXRGTnMpXG4gICAgICYmIHR5cGVvZiBvcHRpb25zLmlucHV0Qm9keSA9PT0gJ3N0cmluZydcbiAgICAgJiYgdHlwZW9mIG9wdGlvbnMub3V0cHV0Rk4gPT09ICdzdHJpbmcnXG4gICAgKSB7XG4gICAgICAgIGNoaWxkLnN0ZGluLndyaXRlKG9wdGlvbnMuaW5wdXRCb2R5KTtcbiAgICAgICAgY2hpbGQuc3Rkb3V0LnBpcGUoZnMuY3JlYXRlV3JpdGVTdHJlYW0ob3B0aW9ucy5vdXRwdXRGTikpO1xuICAgICAgICBjaGlsZC5zdGRpbi5lbmQoKTtcbiAgICB9XG5cbiAgICAvLyBPbmUgZmlsZSBuYW1lcywgaWdub3JlIGlucHV0Qm9keSwgYW5kIGFuIG91dHB1dCBmaWxlLFxuICAgIC8vIHNldCB1cCB0aGUgcGlwaW5nIGZyb20gaW5wdXQgdG8gb3V0cHV0XG4gICAgaWYgKEFycmF5LmlzQXJyYXkob3B0aW9ucy5pbnB1dEZOcylcbiAgICAgJiYgb3B0aW9ucy5pbnB1dEZOcy5sZW5ndGggPT09IDFcbiAgICAgJiYgdHlwZW9mIG9wdGlvbnMub3V0cHV0Rk4gPT09ICdzdHJpbmcnXG4gICAgKSB7XG4gICAgICAgIC8vIGNvbnN0IGlucCA9IGF3YWl0IGZzcC5yZWFkRmlsZShvcHRpb25zLmlucHV0Rk5zWzBdLCAndXRmLTgnKTtcbiAgICAgICAgLy8gY2hpbGQuc3RkaW4ud3JpdGUoaW5wKTtcbiAgICAgICAgZnMuY3JlYXRlUmVhZFN0cmVhbShvcHRpb25zLmlucHV0Rk5zWzBdKS5waXBlKGNoaWxkLnN0ZGluKTtcbiAgICAgICAgY2hpbGQuc3Rkb3V0LnBpcGUoZnMuY3JlYXRlV3JpdGVTdHJlYW0ob3B0aW9ucy5vdXRwdXRGTikpO1xuICAgICAgICAvLyBjaGlsZC5zdGRpbi5lbmQoKTtcbiAgICB9XG5cbiAgICAvLyBGaW5hbGx5LCB3YWl0IGZvciB0aGUgY2hpbGQgdG8gZmluaXNoXG5cbiAgICBjaGlsZC5vbignZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYHBsYW50dW1sIEVSUk9SIGluIGNoaWxkIHByb2Nlc3MgJHtlcnIubWVzc2FnZX1gKTtcbiAgICB9KTtcblxuICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgY2hpbGQub24oJ2Nsb3NlJywgKGNvZGUpID0+IHtcbiAgICAgICAgICAgIGlmIChjb2RlID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh1bmRlZmluZWQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKGBwbGFudHVtbCBmYWlsIHdpdGggY29kZSAke2NvZGV9YCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcblxufVxuXG4vKipcbiAqIEhhbmRsZSBjb252ZXJ0aW5nIGEgc2luZ2xlIFBsYW50VU1MIGRpYWdyYW0gZm9yXG4gKiBkaXNwbGF5IGluIGEgZG9jdW1lbnQuXG4gKiBcbiAqIFRoZSBkb2N1bWVudCBkZXNjcmlwdGlvbiBpcyBlaXRoZXIgaW5saW5lXG4gKiB0byB0aGUgPGRpYWdyYW1zLXBsYW50dW1sPiB0YWcsIG9yIGVsc2UgYSBzaW5nbGVcbiAqIGlucHV0IGZpbGUgaW4gdGhlIGlucHV0LWZpbGUgYXR0cmlidXRlLlxuICogXG4gKiBUaGVyZSBpcyBhIHNpbmdsZSBvdXRwdXQtZmlsZSBhdHRyaWJ1dGUgdG9cbiAqIGZvciBhIGZpbGUgdG8gcmVjZWl2ZSBhcyBvdXRwdXQuICBUaGlzIGZpbGVcbiAqIGlzIHdyaXR0ZW4gZGlyZWN0bHkgdG8gdGhlIHJlbmRlcmluZ091dHB1dCBkaXJlY3RvcnkuXG4gKiBcbiAqIFRoaXMgd2lsbCBzdXBwb3J0IG9ubHkgUE5HIGFuZCBTVkcgb3V0cHV0IGZvcm1hdHMuXG4gKiBcbiAqIFRoZSBvdXRwdXQtZmlsZSBpcyBhIFZQYXRoIHNwZWNpZnlpbmcgYW5cbiAqIG91dHB1dCBkaXJlY3RvcnkgbG9jYXRpb24uXG4gKiBcbiAqIGlzQWJzb2x1dGUob3V0cHV0LWZpbGUpIC0gbWVhbnMgaXQgaXMgcm9vdGVkXG4gKiB0byB0aGUgb3V0cHV0IGRpcmVjdG9yeS4gIE90aGVyd2lzZSBpdCBpcyByZWxhdGl2ZVxuICogdG8gdGhlIGRpcm5hbWUobWV0YWRhdGEuZG9jdW1lbnQucGF0aCkuXG4gKi9cbmNsYXNzIFBsYW50VU1MTG9jYWwgZXh0ZW5kcyBha2FzaGEuQ3VzdG9tRWxlbWVudCB7XG5cblx0Z2V0IGVsZW1lbnROYW1lKCkgeyByZXR1cm4gXCJkaWFncmFtcy1wbGFudHVtbFwiOyB9XG4gICAgYXN5bmMgcHJvY2VzcygkZWxlbWVudCwgbWV0YWRhdGEsIGRpcnR5OiBGdW5jdGlvbikge1xuXG4gICAgICAgIGNvbnN0IG9wdGlvbnM6IGRvUGxhbnRVTUxPcHRpb25zID0ge1xuICAgICAgICAgICAgLy8gVXNpbmcgLnRleHQoKSBlbGltaW5hdGVzIEhUTUwgZm9ybWF0dGluZy5cbiAgICAgICAgICAgIGlucHV0Qm9keTogJGVsZW1lbnQudGV4dCgpLFxuICAgICAgICAgICAgaW5wdXRGTnM6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIG91dHB1dEZOOiAkZWxlbWVudC5hdHRyKCdvdXRwdXQtZmlsZScpXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gRW5zdXJlIHRoZXJlIGlzIGVpdGhlciBhbiBpbnB1dC1maWxlXG4gICAgICAgIC8vIG9yIGFuIGlucHV0IGJvZHlcblxuICAgICAgICBjb25zdCBpbmYgPSAgJGVsZW1lbnQuYXR0cignaW5wdXQtZmlsZScpO1xuICAgICAgICBpZiAodHlwZW9mIGluZiA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIG9wdGlvbnMuaW5wdXRGTnMgPSBbIGluZiBdO1xuICAgICAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoaW5mKSAmJiBpbmYubGVuZ3RoID49IDEpIHtcbiAgICAgICAgICAgIG9wdGlvbnMuaW5wdXRGTnMgPSBbIGluZlswXSBdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3B0aW9ucy5pbnB1dEZOcyA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMuaW5wdXRCb2R5ICE9PSAnc3RyaW5nJ1xuICAgICAgICAgJiYgKFxuICAgICAgICAgICAgIUFycmF5LmlzQXJyYXkob3B0aW9ucy5pbnB1dEZOcylcbiAgICAgICAgIHx8IG9wdGlvbnMuaW5wdXRGTnMubGVuZ3RoIDw9IDBcbiAgICAgICAgKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQbGFudFVNTExvY2FsIG9uZSBpbnB1dCBmaWxlIG9yIGlubGluZSBkaWFncmFtIGlzIHJlcXVpcmVkYCk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgdnBhdGhJbjtcbiAgICAgICAgbGV0IGZzcGF0aEluO1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShvcHRpb25zLmlucHV0Rk5zKSAmJiBvcHRpb25zLmlucHV0Rk5zLmxlbmd0aCA9PT0gMSkge1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMuaW5wdXRGTnNbMF0gIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQbGFudFVNTExvY2FsIG5vIGlucHV0IGZpbGUgRk4gZ2l2ZW4gaW4gJHt1dGlsLmluc3BlY3Qob3B0aW9ucy5pbnB1dEZOcyl9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBpbkZOID0gb3B0aW9ucy5pbnB1dEZOc1swXTtcbiAgICAgICAgICAgIGlmIChwYXRoLmlzQWJzb2x1dGUoaW5GTikpIHtcbiAgICAgICAgICAgICAgICB2cGF0aEluID0gaW5GTjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbGV0IGRpciA9IHBhdGguZGlybmFtZShtZXRhZGF0YS5kb2N1bWVudC5wYXRoKTtcbiAgICAgICAgICAgICAgICB2cGF0aEluID0gcGF0aC5ub3JtYWxpemUoXG4gICAgICAgICAgICAgICAgICAgIHBhdGguam9pbignLycsIGRpciwgaW5GTilcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBkb2N1bWVudHMgPSB0aGlzLmNvbmZpZy5ha2FzaGEuZmlsZWNhY2hlLmRvY3VtZW50c0NhY2hlO1xuICAgICAgICAgICAgY29uc3QgYXNzZXRzID0gdGhpcy5jb25maWcuYWthc2hhLmZpbGVjYWNoZS5hc3NldHNDYWNoZTtcbiAgICAgICAgICAgIGNvbnN0IGRvYyA9IGF3YWl0IGRvY3VtZW50cy5maW5kKHZwYXRoSW4pO1xuICAgICAgICAgICAgbGV0IGFzc2V0O1xuXG4gICAgICAgICAgICBpZiAoIWRvYykgYXNzZXQgPSBhd2FpdCBhc3NldHMuZmluZCh2cGF0aEluKTtcbiAgIFxuICAgICAgICAgICAgaWYgKCFkb2MgJiYgIWFzc2V0KSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQbGFudFVNTExvY2FsIG5vIHBsYW50dW1sIGFzc2V0IG9yIGRvY3VtZW50IGZpbGUgIGZvdW5kIGZvciAke3ZwYXRoSW59YCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChkb2MpIGZzcGF0aEluID0gZG9jLmZzcGF0aDtcbiAgICAgICAgICAgIGVsc2UgaWYgKGFzc2V0KSBmc3BhdGhJbiA9IGFzc2V0LmZzcGF0aDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElmIHRoZXJlIHdhcyBhbiBpbnB1dCBmaWxlLCByZWNvcmQgaXRzIGZ1bGwgcGF0aG5hbWVcbiAgICAgICAgLy8gYXMgdGhlIGlucHV0Rk5zIGVudHJ5XG4gICAgICAgIGlmIChmc3BhdGhJbikgb3B0aW9ucy5pbnB1dEZOcyA9IFsgZnNwYXRoSW4gXTtcblxuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMub3V0cHV0Rk4gIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFBsYW50VU1MTG9jYWwgbm8gb3V0cHV0IGZpbGUgbmFtZSB3YXMgc3VwcGxpZWRgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCB2cGF0aE91dDtcbiAgICAgICAgaWYgKCEgcGF0aC5pc0Fic29sdXRlKG9wdGlvbnMub3V0cHV0Rk4pKSB7XG4gICAgICAgICAgICBsZXQgZGlyID0gcGF0aC5kaXJuYW1lKG1ldGFkYXRhLmRvY3VtZW50LnBhdGgpO1xuICAgICAgICAgICAgdnBhdGhPdXQgPSBwYXRoLm5vcm1hbGl6ZShcbiAgICAgICAgICAgICAgICBwYXRoLmpvaW4oJy8nLCBkaXIsIG9wdGlvbnMub3V0cHV0Rk4pXG4gICAgICAgICAgICApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdnBhdGhPdXQgPSBvcHRpb25zLm91dHB1dEZOO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ29tcHV0ZSBmc3BhdGggZm9yIHZwYXRoT3V0XG4gICAgICAgIGNvbnN0IGZzcGF0aE91dCA9IHBhdGgubm9ybWFsaXplKHBhdGguam9pbihcbiAgICAgICAgICAgIHRoaXMuYXJyYXkub3B0aW9ucy5jb25maWcucmVuZGVyRGVzdGluYXRpb24sIHZwYXRoT3V0XG4gICAgICAgICkpO1xuICAgICAgICBvcHRpb25zLm91dHB1dEZOID0gZnNwYXRoT3V0O1xuXG4gICAgICAgIGxldCB3aWR0aCA9ICRlbGVtZW50LmF0dHIoJ3dpZHRoJyk7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGB3aWR0aD0ke3dpZHRofWApO1xuICAgICAgICBpZiAodHlwZW9mIHdpZHRoID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgd2lkdGggPSBOdW1iZXIucGFyc2VGbG9hdCh3aWR0aCk7XG4gICAgICAgICAgICBpZiAoaXNOYU4od2lkdGgpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQbGFudFVNTExvY2FsOiB3aWR0aCBpcyBub3QgYSBudW1iZXIgJHt3aWR0aH1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICg8YW55Pm9wdGlvbnMpLndpZHRoID0gd2lkdGg7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBjb25zb2xlLmxvZyhvcHRpb25zKTtcblxuICAgICAgICBjb25zdCBpZCA9ICRlbGVtZW50LmF0dHIoJ2lkJyk7XG4gICAgICAgIGNvbnN0IGNsYXp6ID0gJGVsZW1lbnQuYXR0cignY2xhc3MnKTtcbiAgICAgICAgY29uc3QgYWx0ID0gJGVsZW1lbnQuYXR0cignYWx0Jyk7XG4gICAgICAgIGNvbnN0IHRpdGxlID0gJGVsZW1lbnQuYXR0cigndGl0bGUnKTtcbiAgICAgICAgY29uc3QgY2FwdGlvbiA9ICRlbGVtZW50LmF0dHIoJ2NhcHRpb24nKTtcbiAgICAgICAgY29uc3QgY3MgPSAkZWxlbWVudC5hdHRyKCdjaGFyc2V0Jyk7XG4gICAgICAgIGlmIChpc1ZhbGlkQ2hhcnNldChjcykpIG9wdGlvbnMuY2hhcnNldCA9IGNzO1xuICAgICAgICBvcHRpb25zLmRhcmttb2RlID0gdHlwZW9mICRlbGVtZW50LnByb3AoJ2Rhcmttb2RlJykgIT09ICd1bmRlZmluZWQnO1xuICAgICAgICAvLyBvcHRpb25zLmRlYnVnc3ZlayA9ICRlbGVtZW50LnByb3AoJ2RlYnVnc3ZlaycpO1xuICAgICAgICAvLyBvcHRpb25zLmZpbGVOYW1lT3ZlcnJpZGUgPSAkZWxlbWVudC5hdHRyKCdmaWxlbmFtZScpO1xuICAgICAgICBjb25zdCBuYnRocmVhZCA9ICRlbGVtZW50LmF0dHIoJ25idGhyZWFkJyk7XG4gICAgICAgIGlmICh0eXBlb2YgbmJ0aHJlYWQgPT09ICdzdHJpbmcnKSBvcHRpb25zLm5idGhyZWFkID0gbmJ0aHJlYWQ7XG4gICAgICAgIG9wdGlvbnMubm9tZXRhZGF0YSA9IHR5cGVvZiAkZWxlbWVudC5wcm9wKCdub21ldGFkYXRhJykgIT09ICd1bmRlZmluZWQnO1xuICAgICAgICAvLyBvcHRpb25zLnRlcHMgPSAkZWxlbWVudC5wcm9wKCd0ZXBzJyk7XG4gICAgICAgIC8vIG9wdGlvbnMudGh0bWwgPSAkZWxlbWVudC5wcm9wKCd0aHRtbCcpO1xuICAgICAgICAvLyBvcHRpb25zLnRsYXRleCA9ICRlbGVtZW50LnByb3AoJ3RsYXRleCcpO1xuICAgICAgICAvLyBvcHRpb25zLnRwZGYgPSAkZWxlbWVudC5wcm9wKCd0cGRmJyk7XG4gICAgICAgIG9wdGlvbnMudHBuZyA9IHR5cGVvZiAkZWxlbWVudC5wcm9wKCd0cG5nJykgIT09ICd1bmRlZmluZWQnO1xuICAgICAgICAvLyBvcHRpb25zLnRzY3htbCA9ICRlbGVtZW50LnByb3AoJ3RzY3htbCcpO1xuICAgICAgICBvcHRpb25zLnRzdmcgPSB0eXBlb2YgJGVsZW1lbnQucHJvcCgndHN2ZycpICE9PSAndW5kZWZpbmVkJztcbiAgICAgICAgLy8gb3B0aW9ucy50dHh0ID0gJGVsZW1lbnQucHJvcCgndHR4dCcpO1xuICAgICAgICAvLyBvcHRpb25zLnR1dHh0ID0gJGVsZW1lbnQucHJvcCgndHV0eHQnKTtcbiAgICAgICAgLy8gb3B0aW9ucy50dmR4ID0gJGVsZW1lbnQucHJvcCgndHZkeCcpO1xuICAgICAgICAvLyBvcHRpb25zLnR4bWkgPSAkZWxlbWVudC5wcm9wKCd0eG1pJyk7XG4gICAgICAgIC8vIG9wdGlvbnMudmVyYm9zZSA9ICRlbGVtZW50LnByb3AoJ3ZlcmJvc2UnKTtcblxuICAgICAgICBpZiAob3B0aW9ucy50cG5nICYmIG9wdGlvbnMudHN2Zykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQbGFudFVNTExvY2FsIGNhbm5vdCB1c2UgYm90aCB0cG5nIGFuZCB0c3ZnYCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFvcHRpb25zLnRwbmcgJiYgIW9wdGlvbnMudHN2Zykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQbGFudFVNTExvY2FsIG11c3QgdXNlIG9uZSBvZiB0cG5nIG9yIHRzdmdgKTtcbiAgICAgICAgfVxuICAgICAgICBhd2FpdCBkb1BsYW50VU1MKG9wdGlvbnMpO1xuXG4gICAgICAgIGNvbnN0IGNhcCA9IHR5cGVvZiBjYXB0aW9uID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgPyBgPGZpZ2NhcHRpb24+JHtlbmNvZGUoY2FwdGlvbil9PC9maWdjYXB0aW9uPmBcbiAgICAgICAgICAgIDogJyc7XG4gICAgICAgIGNvbnN0IFRhbHQgPSB0eXBlb2YgYWx0ID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgPyBgYWx0PVwiJHtlbmNvZGUoYWx0KX1cImBcbiAgICAgICAgICAgIDogJyc7XG4gICAgICAgIGNvbnN0IFR0aXRsZSA9IHR5cGVvZiB0aXRsZSA9PT0gJ3N0cmluZydcbiAgICAgICAgICAgID8gYHRpdGxlPVwiJHtlbmNvZGUodGl0bGUpfVwiYFxuICAgICAgICAgICAgOiAnJztcbiAgICAgICAgY29uc3QgVGlkID0gdHlwZW9mIGlkID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgPyBgaWQ9XCIke2VuY29kZShpZCl9XCJgXG4gICAgICAgICAgICA6ICcnO1xuICAgICAgICBjb25zdCBUY2xhenogPSB0eXBlb2YgY2xhenogPT09ICdzdHJpbmcnXG4gICAgICAgICAgICA/IGBjbGFzcz1cIiR7ZW5jb2RlKGNsYXp6KX1cImBcbiAgICAgICAgICAgIDogJyc7XG4gICAgICAgIGNvbnN0IFR3aWR0aCA9IHR5cGVvZiB3aWR0aCA9PT0gJ251bWJlcidcbiAgICAgICAgICAgID8gYHdpZHRoPVwiJHt3aWR0aC50b1N0cmluZygpfVwiYFxuICAgICAgICAgICAgOiAnJztcblxuICAgICAgICBjb25zdCByZXQgPSBgXG4gICAgICAgIDxmaWd1cmUgJHtUaWR9ICR7VGNsYXp6fT5cbiAgICAgICAgPGltZyBzcmM9XCIke2VuY29kZSh2cGF0aE91dCl9XCIgJHtUYWx0fSAke1R0aXRsZX0gJHtUd2lkdGh9Lz5cbiAgICAgICAgJHtjYXB9XG4gICAgICAgIDwvZmlndXJlPlxuICAgICAgICBgO1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhyZXQpO1xuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzVmFsaWRDaGFyc2V0KGNoYXJzZXQpIHtcbiAgICBpZiAodHlwZW9mIGNoYXJzZXQgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgY29uc3QgY3MgPSBjaGFyc2V0LnRvTG93ZXJDYXNlKCk7XG5cbiAgICBpZiAodHlwZW9mIGNzICE9PSAnc3RyaW5nJ1xuICAgICAgICB8fCAoY3MgIT09ICd1dGY4JyAmJiBjcyAhPT0gJ3V0Zi04J1xuICAgICAgICAmJiBjcyAhPT0gJ3V0ZjE2JyAmJiBjcyAhPT0gJ3V0Zi0xNidcbiAgICAgICAgJiYgY3MgIT09ICd1dGYxNmJlJyAmJiBjcyAhPT0gJ3V0Zi0xNmJlJ1xuICAgICAgICAmJiBjcyAhPT0gJ3V0ZjE2bGUnICYmIGNzICE9PSAndXRmLTE2bGUnXG4gICAgICAgICYmIGNzICE9PSAndXRmMzInICYmIGNzICE9PSAndXRmLTMyJ1xuICAgICAgICAmJiBjcyAhPT0gJ3V0ZjMybGUnICYmIGNzICE9PSAndXRmLTMybGUnKVxuICAgICkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufVxuIl19