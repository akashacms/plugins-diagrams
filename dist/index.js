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
import { spawn } from 'node:child_process';
import { encode } from 'html-entities';
import { render } from '@pintora/cli';
export { MarkdownITMermaidPlugin } from './markdown-it.js';
const __dirname = import.meta.dirname;
// Path name for the local copy of plantuml.jar
const plantumlJar = path.join(__dirname, '..', 'vendor', 'plantuml', 'plantuml-mit-1.2025.0.jar');
const pluginName = '@akashacms/plugins-diagrams';
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
            href: '/vendor/@akashacms/diagrams-maker/style.css'
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
export async function doPlantUMLLocal(options) {
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
        await doPlantUMLLocal(options);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9saWIvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBRUEsT0FBTyxJQUFJLE1BQU0sV0FBVyxDQUFDO0FBQzdCLE9BQU8sRUFBRSxFQUFFLEVBQUUsUUFBUSxJQUFJLEdBQUcsRUFBRSxNQUFNLFNBQVMsQ0FBQztBQUM5QyxPQUFPLElBQUksTUFBTSxXQUFXLENBQUM7QUFDN0IsT0FBTyxFQUF1QixLQUFLLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUNoRSxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQ3JDLE9BQU8sRUFBRSxNQUFNLEVBQWlCLE1BQU0sY0FBYyxDQUFBO0FBRXBELE9BQU8sRUFDSCx1QkFBdUIsRUFFMUIsTUFBTSxrQkFBa0IsQ0FBQztBQUUxQixNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQztBQUV0QywrQ0FBK0M7QUFDL0MsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FDYixTQUFTLEVBQ1QsSUFBSSxFQUNKLFFBQVEsRUFDUixVQUFVLEVBQ1YsMkJBQTJCLENBQUMsQ0FBQztBQUU3QyxNQUFNLFVBQVUsR0FBRyw2QkFBNkIsQ0FBQztBQUVqRCxPQUFPLEtBQUssTUFBTSxNQUFNLGNBQWMsQ0FBQztBQUN2QyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDckQsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQztBQUVuQyxPQUFPLEVBQ0gsY0FBYyxFQUNkLFNBQVMsRUFDVCxvQkFBb0IsRUFDcEIsZ0JBQWdCLEVBQ25CLE1BQU0scUJBQXFCLENBQUM7QUFFN0IsT0FBTyxFQUVILFNBQVMsRUFDVCxnQkFBZ0IsRUFDaEIsb0JBQW9CLEVBQ3ZCLE1BQU0scUJBQXFCLENBQUM7QUFrQzdCLE1BQU0sT0FBTyxjQUFlLFNBQVEsTUFB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LEtBQUssTUFBTSxJQUFJLEVBQUUsS0FBSyxPQUFPO2VBQ2hDLEVBQUUsS0FBSyxPQUFPLElBQUksRUFBRSxLQUFLLFFBQVE7ZUFDakMsRUFBRSxLQUFLLFNBQVMsSUFBSSxFQUFFLEtBQUssVUFBVTtlQUNyQyxFQUFFLEtBQUssU0FBUyxJQUFJLEVBQUUsS0FBSyxVQUFVO2VBQ3JDLEVBQUUsS0FBSyxPQUFPLElBQUksRUFBRSxLQUFLLFFBQVE7ZUFDakMsRUFBRSxLQUFLLFNBQVMsSUFBSSxFQUFFLEtBQUssVUFBVSxDQUFDLEVBQzNDLENBQUM7UUFDQyxPQUFPLEtBQUssQ0FBQztJQUNqQixDQUFDO0lBQ0QsT0FBTyxJQUFJLENBQUM7QUFDaEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIlxuXG5pbXBvcnQgcGF0aCBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IGZzLCB7IHByb21pc2VzIGFzIGZzcCB9IGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHV0aWwgZnJvbSAnbm9kZTp1dGlsJztcbmltcG9ydCB7IGV4ZWNTeW5jLCBzcGF3blN5bmMsIHNwYXduIH0gZnJvbSAnbm9kZTpjaGlsZF9wcm9jZXNzJztcbmltcG9ydCB7ZW5jb2RlfSBmcm9tICdodG1sLWVudGl0aWVzJztcbmltcG9ydCB7IHJlbmRlciwgUGludG9yYUNvbmZpZyB9IGZyb20gJ0BwaW50b3JhL2NsaSdcblxuZXhwb3J0IHtcbiAgICBNYXJrZG93bklUTWVybWFpZFBsdWdpbixcbiAgICBNZXJtYWlkUGx1Z2luT3B0aW9uc1xufSBmcm9tICcuL21hcmtkb3duLWl0LmpzJztcblxuY29uc3QgX19kaXJuYW1lID0gaW1wb3J0Lm1ldGEuZGlybmFtZTtcblxuLy8gUGF0aCBuYW1lIGZvciB0aGUgbG9jYWwgY29weSBvZiBwbGFudHVtbC5qYXJcbmNvbnN0IHBsYW50dW1sSmFyID0gcGF0aC5qb2luKFxuICAgICAgICAgICAgICAgIF9fZGlybmFtZSxcbiAgICAgICAgICAgICAgICAnLi4nLFxuICAgICAgICAgICAgICAgICd2ZW5kb3InLFxuICAgICAgICAgICAgICAgICdwbGFudHVtbCcsXG4gICAgICAgICAgICAgICAgJ3BsYW50dW1sLW1pdC0xLjIwMjUuMC5qYXInKTtcblxuY29uc3QgcGx1Z2luTmFtZSA9ICdAYWthc2hhY21zL3BsdWdpbnMtZGlhZ3JhbXMnO1xuXG5pbXBvcnQgKiBhcyBha2FzaGEgZnJvbSAnYWthc2hhcmVuZGVyJztcbmltcG9ydCB7IFBsdWdpbiB9IGZyb20gJ2FrYXNoYXJlbmRlci9kaXN0L1BsdWdpbi5qcyc7XG5jb25zdCBtYWhhYmh1dGEgPSBha2FzaGEubWFoYWJodXRhO1xuXG5pbXBvcnQge1xuICAgIGFkYXB0SW5saW5lU3ZnLFxuICAgIGRvTWVybWFpZCxcbiAgICByZWdpc3Rlck1lcm1haWRGb250cyxcbiAgICByZW5kZXJNZXJtYWlkU3ZnXG59IGZyb20gJy4vcmVuZGVyLW1lcm1haWQuanMnO1xuXG5leHBvcnQge1xuICAgIE1lcm1haWRSZW5kZXJPcHRpb25zLFxuICAgIGRvTWVybWFpZCxcbiAgICByZW5kZXJNZXJtYWlkU3ZnLFxuICAgIHJlZ2lzdGVyTWVybWFpZEZvbnRzXG59IGZyb20gJy4vcmVuZGVyLW1lcm1haWQuanMnO1xuXG5leHBvcnQgdHlwZSBEaWFncmFtc1BsdWdpbk9wdGlvbnMgPSB7XG4gICAgLyoqXG4gICAgICogT3B0aW9ucyBmb3IgcmVuZGVyaW5nIDxkaWFncmFtcy1tZXJtYWlkPiBlbGVtZW50c1xuICAgICAqL1xuICAgIG1lcm1haWQ/OiB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGaWxlIG5hbWUgb2YgYSBKU09OIGNvbmZpZ3VyYXRpb24gZmlsZSB1c2luZyB0aGUgc2FtZVxuICAgICAgICAgKiBzY2hlbWEgYXMgdGhlIG1tZHIgLS1jb25maWcgZmlsZSAodGhlbWUsIHRoZW1lVmFyaWFibGVzLFxuICAgICAgICAgKiBmbG93Y2hhcnQsIC4uLikuICBSZWFkIG9uY2UgYXQgY29uZmlndXJhdGlvbiB0aW1lLlxuICAgICAgICAgKi9cbiAgICAgICAgY29uZmlnRk4/OiBzdHJpbmc7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEpTT04gY29uZmlndXJhdGlvbiBzdHJpbmcgd2l0aCB0aGUgc2FtZSBzY2hlbWEuICBUYWtlc1xuICAgICAgICAgKiBwcmVjZWRlbmNlIG92ZXIgY29uZmlnRk4uXG4gICAgICAgICAqL1xuICAgICAgICBjb25maWdKU09OPzogc3RyaW5nO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUaGVtZSBwcmVzZXQgbmFtZTogZGVmYXVsdCwgZGFyaywgZm9yZXN0LCBuZXV0cmFsLCBtb2Rlcm4uXG4gICAgICAgICAqIFRha2VzIHByZWNlZGVuY2Ugb3ZlciB0aGUgY29uZmlnJ3MgdGhlbWUgbmFtZS5cbiAgICAgICAgICovXG4gICAgICAgIHRoZW1lUHJlc2V0Pzogc3RyaW5nO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUVEYvT1RGIGZvbnQgZmlsZXMgdG8gcmVnaXN0ZXIgZm9yIHRleHQgbWVhc3VyZW1lbnQuXG4gICAgICAgICAqIFdoZW4gb21pdHRlZCwgYSBjb21tb24gc3lzdGVtIGZvbnQgaXMgdXNlZCBpZiBmb3VuZC5cbiAgICAgICAgICovXG4gICAgICAgIGZvbnRGTnM/OiBzdHJpbmdbXTtcbiAgICB9O1xufTtcblxuZXhwb3J0IGNsYXNzIERpYWdyYW1zUGx1Z2luIGV4dGVuZHMgUGx1Z2luIHtcblxuICAgICNjb25maWc7XG5cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIocGx1Z2luTmFtZSk7XG4gICAgfVxuXG4gICAgY29uZmlndXJlKGNvbmZpZywgb3B0aW9ucz86IERpYWdyYW1zUGx1Z2luT3B0aW9ucykge1xuICAgICAgICB0aGlzLiNjb25maWcgPSBjb25maWc7XG4gICAgICAgIC8vIHRoaXMuY29uZmlnID0gY29uZmlnO1xuICAgICAgICB0aGlzLmFrYXNoYSA9IGNvbmZpZy5ha2FzaGE7XG4gICAgICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnMgPyBvcHRpb25zIDoge307XG4gICAgICAgIHRoaXMub3B0aW9ucy5jb25maWcgPSBjb25maWc7XG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMubWVybWFpZD8uY29uZmlnRk5cbiAgICAgICAgICYmICF0aGlzLm9wdGlvbnMubWVybWFpZC5jb25maWdKU09OXG4gICAgICAgICkge1xuICAgICAgICAgICAgdGhpcy5vcHRpb25zLm1lcm1haWQuY29uZmlnSlNPTiA9IGZzLnJlYWRGaWxlU3luYyhcbiAgICAgICAgICAgICAgICB0aGlzLm9wdGlvbnMubWVybWFpZC5jb25maWdGTiwgJ3V0Zi04Jyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uZmlnLmFkZE1haGFiaHV0YShtYWhhYmh1dGFBcnJheSh0aGlzLm9wdGlvbnMsIGNvbmZpZywgdGhpcy5ha2FzaGEsIHRoaXMpKTtcbiAgICAgICAgbGV0IG1vZHVsZURpcm5hbWUgPSBpbXBvcnQubWV0YS5kaXJuYW1lO1xuICAgICAgICBjb25maWcuYWRkQXNzZXRzRGlyKHBhdGguam9pbihtb2R1bGVEaXJuYW1lLCAnLi4nLCAnYXNzZXRzJykpO1xuICAgICAgICBjb25maWcuYWRkU3R5bGVzaGVldCh7XG4gICAgICAgICAgICBocmVmOiAnL3ZlbmRvci9AYWthc2hhY21zL2RpYWdyYW1zLW1ha2VyL3N0eWxlLmNzcydcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZ2V0IGNvbmZpZygpIHsgcmV0dXJuIHRoaXMuI2NvbmZpZzsgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gbWFoYWJodXRhQXJyYXkoXG4gICAgb3B0aW9ucyxcbiAgICBjb25maWc/OiBha2FzaGEuQ29uZmlndXJhdGlvbixcbiAgICBha2FzaGE/OiBhbnksXG4gICAgcGx1Z2luPzogUGx1Z2luXG4pIHtcbiAgICBsZXQgcmV0ID0gbmV3IG1haGFiaHV0YS5NYWhhZnVuY0FycmF5KHBsdWdpbk5hbWUsIG9wdGlvbnMpO1xuICAgIHJldC5hZGRNYWhhZnVuYyhuZXcgTWVybWFpZExvY2FsKGNvbmZpZywgYWthc2hhLCBwbHVnaW4pKTtcbiAgICByZXQuYWRkTWFoYWZ1bmMobmV3IFBsYW50VU1MTG9jYWwoY29uZmlnLCBha2FzaGEsIHBsdWdpbikpO1xuICAgIHJldC5hZGRNYWhhZnVuYyhuZXcgUGludG9yYUxvY2FsKGNvbmZpZywgYWthc2hhLCBwbHVnaW4pKTtcbiAgICByZXR1cm4gcmV0O1xufTtcblxuY2xhc3MgTWVybWFpZExvY2FsIGV4dGVuZHMgYWthc2hhLkN1c3RvbUVsZW1lbnQge1xuXHRnZXQgZWxlbWVudE5hbWUoKSB7IHJldHVybiBcImRpYWdyYW1zLW1lcm1haWRcIjsgfVxuXG4gICAgYXN5bmMgcHJvY2VzcygkZWxlbWVudCwgbWV0YWRhdGEsIGRpcnR5OiBGdW5jdGlvbikge1xuXG4gICAgICAgIGxldCBjb2RlID0gJGVsZW1lbnQudGV4dCgpO1xuICAgICAgICBjb25zdCBvdXRwdXRGTiA9ICRlbGVtZW50LmF0dHIoJ291dHB1dC1maWxlJyk7XG4gICAgICAgIGNvbnN0IGluZiA9ICAkZWxlbWVudC5hdHRyKCdpbnB1dC1maWxlJyk7XG5cbiAgICAgICAgLy8gY29uc29sZS5sb2coYE1lcm1haWRMb2NhbCAke2luZn0gPT0+ICR7b3V0cHV0Rk59YCk7XG5cbiAgICAgICAgbGV0IHZwYXRoSW47XG4gICAgICAgIGxldCBmc3BhdGhJbjtcbiAgICAgICAgaWYgKHR5cGVvZiBpbmYgPT09ICdzdHJpbmcnXG4gICAgICAgICAmJiBpbmYubGVuZ3RoID49IDFcbiAgICAgICAgKSB7XG4gICAgICAgICAgICBpZiAocGF0aC5pc0Fic29sdXRlKGluZikpIHtcbiAgICAgICAgICAgICAgICB2cGF0aEluID0gaW5mO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBsZXQgZGlyID0gcGF0aC5kaXJuYW1lKG1ldGFkYXRhLmRvY3VtZW50LnBhdGgpO1xuICAgICAgICAgICAgICAgIHZwYXRoSW4gPSBwYXRoLm5vcm1hbGl6ZShcbiAgICAgICAgICAgICAgICAgICAgcGF0aC5qb2luKCcvJywgZGlyLCBpbmYpXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjb25zdCBkb2N1bWVudHMgPSB0aGlzLmNvbmZpZy5ha2FzaGEuZmlsZWNhY2hlLmRvY3VtZW50c0NhY2hlO1xuICAgICAgICBjb25zdCBhc3NldHMgPSB0aGlzLmFrYXNoYS5maWxlY2FjaGUuYXNzZXRzQ2FjaGU7XG5cbiAgICAgICAgLy8gY29uc29sZS5sb2coYE1lcm1haWRMb2NhbCAke2luZn0gJHt2cGF0aElufWApO1xuXG4gICAgICAgIGNvbnN0IGRvYyA9IHZwYXRoSW5cbiAgICAgICAgICAgID8gYXdhaXQgZG9jdW1lbnRzLmZpbmQodnBhdGhJbilcbiAgICAgICAgICAgIDogdW5kZWZpbmVkO1xuXG4gICAgICAgIGxldCBhc3NldDtcbiAgICAgICAgaWYgKCFkb2MpIGFzc2V0ID0gdnBhdGhJblxuICAgICAgICAgICAgPyBhd2FpdCBhc3NldHMuZmluZCh2cGF0aEluKVxuICAgICAgICAgICAgOiB1bmRlZmluZWQ7XG4gICBcbiAgICAgICAgaWYgKGRvYykgZnNwYXRoSW4gPSBkb2MuZnNwYXRoO1xuICAgICAgICBlbHNlIGlmIChhc3NldCkgZnNwYXRoSW4gPSBhc3NldC5mc3BhdGg7XG5cbiAgICAgICAgLy8gY29uc29sZS5sb2coYE1lcm1haWRMb2NhbCAke2luZn0gJHt2cGF0aElufSAke2ZzcGF0aElufWApO1xuXG4gICAgICAgIGlmICh0eXBlb2YgZnNwYXRoSW4gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBjb2RlID0gYXdhaXQgZnNwLnJlYWRGaWxlKGZzcGF0aEluLCAndXRmLTgnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgY29kZSAhPT0gJ3N0cmluZycgfHwgY29kZS5sZW5ndGggPCAxKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGRpYWdyYW1zLW1lcm1haWQgcmVxdWlyZXMgYW4gaW5wdXQtZmlsZSBvciBhbiBpbmxpbmUgZGlhZ3JhbSBib2R5YCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBjb25zb2xlLmxvZyhgTWVybWFpZExvY2FsICR7aW5mfSAke3ZwYXRoSW59ICR7ZnNwYXRoSW59IHJlYWQgY29kZSAke2NvZGV9YCk7XG5cbiAgICAgICAgY29uc3QgbWVybWFpZE9wdGlvbnMgPSB0aGlzLmFycmF5Lm9wdGlvbnM/Lm1lcm1haWQgPz8ge307XG5cbiAgICAgICAgLy8gV2l0aCBubyBvdXRwdXQtZmlsZSBhdHRyaWJ1dGUsIHRoZSByZW5kZXJlZCBTVkcgaXNcbiAgICAgICAgLy8gaW5zZXJ0ZWQgaW5saW5lIGluIHRoZSBnZW5lcmF0ZWQgSFRNTCByYXRoZXIgdGhhblxuICAgICAgICAvLyB3cml0dGVuIHRvIGEgZmlsZSBhbmQgcmVmZXJlbmNlZCB3aXRoIDxpbWc+LlxuICAgICAgICBjb25zdCBpbmxpbmVNb2RlID0gdHlwZW9mIG91dHB1dEZOICE9PSAnc3RyaW5nJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfHwgb3V0cHV0Rk4ubGVuZ3RoIDwgMTtcblxuICAgICAgICBsZXQgc3ZnO1xuICAgICAgICBsZXQgZnNwYXRoT3V0O1xuICAgICAgICBpZiAoIWlubGluZU1vZGUpIHtcbiAgICAgICAgICAgIGlmICghb3V0cHV0Rk4uZW5kc1dpdGgoJy5zdmcnKSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgZGlhZ3JhbXMtbWVybWFpZCBtdXN0IGhhdmUgb3V0cHV0LWZpbGUgd2l0aCAuc3ZnIGV4dGVuc2lvbiAtIG1lcm1haWQtd2FzbS1yZW5kZXJlciBkb2VzIG5vdCBzdXBwb3J0IC5wbmdgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZnNwYXRoT3V0ID0gcGF0aC5qb2luKFxuICAgICAgICAgICAgICAgIHRoaXMuY29uZmlnLnJlbmRlckRlc3RpbmF0aW9uLCBvdXRwdXRGTlxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgYXdhaXQgZnNwLm1rZGlyKHBhdGguZGlybmFtZShmc3BhdGhPdXQpLCB7XG4gICAgICAgICAgICAgICAgcmVjdXJzaXZlOiB0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAoaW5saW5lTW9kZSkge1xuICAgICAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KG1lcm1haWRPcHRpb25zLmZvbnRGTnMpXG4gICAgICAgICAgICAgICAgICYmIG1lcm1haWRPcHRpb25zLmZvbnRGTnMubGVuZ3RoID49IDFcbiAgICAgICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICAgICAgcmVnaXN0ZXJNZXJtYWlkRm9udHMobWVybWFpZE9wdGlvbnMuZm9udEZOcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN2ZyA9IHJlbmRlck1lcm1haWRTdmcoY29kZSxcbiAgICAgICAgICAgICAgICAgICAgbWVybWFpZE9wdGlvbnMuY29uZmlnSlNPTixcbiAgICAgICAgICAgICAgICAgICAgbWVybWFpZE9wdGlvbnMudGhlbWVQcmVzZXQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhd2FpdCBkb01lcm1haWQoe1xuICAgICAgICAgICAgICAgICAgICBjb2RlLFxuICAgICAgICAgICAgICAgICAgICBvdXRwdXRGTjogZnNwYXRoT3V0LFxuICAgICAgICAgICAgICAgICAgICBjb25maWdKU09OOiBtZXJtYWlkT3B0aW9ucy5jb25maWdKU09OLFxuICAgICAgICAgICAgICAgICAgICB0aGVtZVByZXNldDogbWVybWFpZE9wdGlvbnMudGhlbWVQcmVzZXQsXG4gICAgICAgICAgICAgICAgICAgIGZvbnRGTnM6IG1lcm1haWRPcHRpb25zLmZvbnRGTnNcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGBNZXJtYWlkIHRocmV3IGVycm9yICR7ZXJyLm1lc3NhZ2V9XG5JbnB1dDogJHtpbmZ9ICR7ZnNwYXRoSW59IE91dHB1dDogJHtvdXRwdXRGTn0gJHtmc3BhdGhPdXR9XG4ke2NvZGV9XG5gKTtcbiAgICAgICAgICAgIHJldHVybiBgXG48ZGl2IGNsYXNzPVwiZGlhZ3JhbXMtcmVuZGVyLWVycm9yXCI+XG48c3BhbiBjbGFzcz1cImRpYWdyYW1zLXRpdGxlXCI+TWVybWFpZCB0aHJldyBlcnJvciAke2VuY29kZShlcnIubWVzc2FnZSl9PC9zcGFuPlxuPHNwYW4gY2xhc3M9XCJkaWFncmFtcy1lcnJvci1maWxlc1wiPlxuPGI+SW5wdXQ6PC9iPiAke2luZn0gJHtmc3BhdGhJbn08YnIvPlxuPGI+T3V0cHV0OjwvYj4gJHtvdXRwdXRGTn0gJHtmc3BhdGhPdXR9PC9zcGFuPlxuPGNvZGUgY2xhc3M9XCJkaWFncmFtcy1lcnJvci1pbnB1dFwiPjxwcmU+JHtlbmNvZGUoY29kZSl9PC9wcmU+PC9jb2RlPlxuPC9kaXY+XG5gO1xuICAgICAgICAgICAgLy8gdGhyb3cgbmV3IEVycm9yKGBNZXJtYWlkIHRocmV3IGVycm9yICR7ZXJyLm1lc3NhZ2V9YCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBlbHNlXG4gICAgICAgIGxldCB3aWR0aCA9ICRlbGVtZW50LmF0dHIoJ3dpZHRoJyk7XG4gICAgICAgIGlmICh0eXBlb2Ygd2lkdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICB3aWR0aCA9IE51bWJlci5wYXJzZUZsb2F0KHdpZHRoKTtcbiAgICAgICAgICAgIGlmIChpc05hTih3aWR0aCkpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGRpYWdyYW1zLW1lcm1haWQ6IHdpZHRoIGlzIG5vdCBhIG51bWJlciAke3dpZHRofWApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgaWQgPSAkZWxlbWVudC5hdHRyKCdpZCcpO1xuICAgICAgICBjb25zdCBjbGF6eiA9ICRlbGVtZW50LmF0dHIoJ2NsYXNzJyk7XG4gICAgICAgIGNvbnN0IGFsdCA9ICRlbGVtZW50LmF0dHIoJ2FsdCcpO1xuICAgICAgICBjb25zdCB0aXRsZSA9ICRlbGVtZW50LmF0dHIoJ3RpdGxlJyk7XG4gICAgICAgIGNvbnN0IGNhcHRpb24gPSAkZWxlbWVudC5hdHRyKCdjYXB0aW9uJyk7XG5cbiAgICAgICAgY29uc3QgY2FwID0gdHlwZW9mIGNhcHRpb24gPT09ICdzdHJpbmcnXG4gICAgICAgICAgICA/IGA8ZmlnY2FwdGlvbj4ke2VuY29kZShjYXB0aW9uKX08L2ZpZ2NhcHRpb24+YFxuICAgICAgICAgICAgOiAnJztcbiAgICAgICAgY29uc3QgVGFsdCA9IHR5cGVvZiBhbHQgPT09ICdzdHJpbmcnXG4gICAgICAgICAgICA/IGBhbHQ9XCIke2VuY29kZShhbHQpfVwiYFxuICAgICAgICAgICAgOiAnJztcbiAgICAgICAgY29uc3QgVHRpdGxlID0gdHlwZW9mIHRpdGxlID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgPyBgdGl0bGU9XCIke2VuY29kZSh0aXRsZSl9XCJgXG4gICAgICAgICAgICA6ICcnO1xuICAgICAgICBjb25zdCBUaWQgPSB0eXBlb2YgaWQgPT09ICdzdHJpbmcnXG4gICAgICAgICAgICA/IGBpZD1cIiR7ZW5jb2RlKGlkKX1cImBcbiAgICAgICAgICAgIDogJyc7XG4gICAgICAgIC8vIFRoZSBkaWFncmFtcy1tZXJtYWlkIGNsYXNzIGNhcnJpZXMgdGhlIHN0eWxlc2hlZXQgcnVsZXNcbiAgICAgICAgLy8gY29uc3RyYWluaW5nIHRoZSBkaWFncmFtIHRvIGl0cyBjb250YWluZXIgKGlzc3VlICMxOSkuXG4gICAgICAgIGNvbnN0IFRjbGF6eiA9IHR5cGVvZiBjbGF6eiA9PT0gJ3N0cmluZydcbiAgICAgICAgICAgID8gYGNsYXNzPVwiZGlhZ3JhbXMtbWVybWFpZCAke2VuY29kZShjbGF6eil9XCJgXG4gICAgICAgICAgICA6IGBjbGFzcz1cImRpYWdyYW1zLW1lcm1haWRcImA7XG4gICAgICAgIGNvbnN0IFR3aWR0aCA9IHR5cGVvZiB3aWR0aCA9PT0gJ251bWJlcidcbiAgICAgICAgICAgID8gYHdpZHRoPVwiJHt3aWR0aC50b1N0cmluZygpfVwiYFxuICAgICAgICAgICAgOiAnJztcblxuICAgICAgICAvLyBJbiBpbmxpbmUgbW9kZSB0aGVyZSBpcyBubyA8aW1nPiB0byBjYXJyeSB0aGUgYWx0LCB0aXRsZSxcbiAgICAgICAgLy8gYW5kIHdpZHRoIGF0dHJpYnV0ZXMuICBUaGUgYWx0IHRleHQgYmVjb21lcyBhbiBhcmlhLWxhYmVsXG4gICAgICAgIC8vIG9uIHRoZSBTVkcgcm9vdCwgdGhlIHdpZHRoIGJlY29tZXMgYSB3aWR0aCBzdHlsZSBvbiB0aGVcbiAgICAgICAgLy8gU1ZHIHJvb3QsIGFuZCB0aGUgdGl0bGUgbGFuZHMgb24gdGhlIDxmaWd1cmU+LlxuICAgICAgICBjb25zdCByZXQgPSBpbmxpbmVNb2RlXG4gICAgICAgICAgICA/IGBcbiAgICAgICAgPGZpZ3VyZSAke1RpZH0gJHtUY2xhenp9ICR7VHRpdGxlfT5cbiAgICAgICAgJHthZGFwdElubGluZVN2ZyhzdmcsXG4gICAgICAgICAgICB0eXBlb2Ygd2lkdGggPT09ICdudW1iZXInID8gd2lkdGggOiB1bmRlZmluZWQsXG4gICAgICAgICAgICB0eXBlb2YgYWx0ID09PSAnc3RyaW5nJyA/IGFsdCA6IHVuZGVmaW5lZCl9XG4gICAgICAgICR7Y2FwfVxuICAgICAgICA8L2ZpZ3VyZT5cbiAgICAgICAgYFxuICAgICAgICAgICAgOiBgXG4gICAgICAgIDxmaWd1cmUgJHtUaWR9ICR7VGNsYXp6fT5cbiAgICAgICAgPGltZyBzcmM9XCIke2VuY29kZShvdXRwdXRGTil9XCIgJHtUYWx0fSAke1R0aXRsZX0gJHtUd2lkdGh9Lz5cbiAgICAgICAgJHtjYXB9XG4gICAgICAgIDwvZmlndXJlPlxuICAgICAgICBgO1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhgTWVybWFpZExvY2FsIHJldHVybmluZyBgLCB7XG4gICAgICAgIC8vICAgICBpZDogaWQsXG4gICAgICAgIC8vICAgICBUaWQ6IFRpZCxcbiAgICAgICAgLy8gICAgIGlucHV0RmlsZTogaW5mLFxuICAgICAgICAvLyAgICAgb3V0cHV0Rk46IG91dHB1dEZOLFxuICAgICAgICAvLyAgICAgcmV0OiByZXRcbiAgICAgICAgLy8gfSk7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGBNZXJtYWlkTG9jYWwgcmV0dXJuaW5nICR7cmV0fWApO1xuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH1cbn1cblxuXG5cbmV4cG9ydCB0eXBlIFBpbnRvcmFSZW5kZXJPcHRpb25zID0ge1xuICAgIC8qKlxuICAgICAqIHBpbnRvcmEgRFNMIGNvZGUgdG8gcmVuZGVyXG4gICAgICovXG4gICAgY29kZTogc3RyaW5nXG4gICAgZGV2aWNlUGl4ZWxSYXRpbz86IG51bWJlciB8IG51bGxcbiAgICAvKipcbiAgICAgKiBUeXBlIGZvciB0aGUgb3V0cHV0IGZpbGVcbiAgICAgKiBcbiAgICAvLyBpbWFnZS9zdmcreG1sXG4gICAgLy8gaW1hZ2UvanBlZ1xuICAgIC8vIGltYWdlL3BuZ1xuICAgICAqL1xuICAgIG1pbWVUeXBlPzogc3RyaW5nXG4gICAgLyoqXG4gICAgICogQXNzaWduIGV4dHJhIGJhY2tncm91bmQgY29sb3JcbiAgICAgKi9cbiAgICBiYWNrZ3JvdW5kQ29sb3I/OiBzdHJpbmdcbiAgICBwaW50b3JhQ29uZmlnPzogUGFydGlhbDxQaW50b3JhQ29uZmlnPlxuICAgIC8qKlxuICAgICAqIHdpZHRoIG9mIHRoZSBvdXRwdXQsIGhlaWdodCB3aWxsIGJlIGNhbGN1bGF0ZWQgYWNjb3JkaW5nIHRvIHRoZSBkaWFncmFtIGNvbnRlbnQgcmF0aW9cbiAgICAgKi9cbiAgICB3aWR0aD86IG51bWJlclxuICAgIC8qKlxuICAgICAqIFdoZXRoZXIgd2Ugc2hvdWxkIHJ1biByZW5kZXIgaW4gYSBzdWJwcm9jZXNzIHJhdGhlciBpbiBjdXJyZW50IHByb2Nlc3MuXG4gICAgICogSWYgeW91IGNhbGwgdGhlIGByZW5kZXJgIGZ1bmN0aW9uLCBieSBkZWZhdWx0IHRoaXMgaXMgdHJ1ZSwgdG8gYXZvaWQgcG9sbHV0aW5nIHRoZSBnbG9iYWwgZW52aXJvbm1lbnQuXG4gICAgICovXG4gICAgcmVuZGVySW5TdWJwcm9jZXNzPzogYm9vbGVhblxuXG4gICAgb3V0cHV0Rk46IHN0cmluZztcbn07XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkb1BpbnRvcmEoXG4gICAgb3B0aW9uczogUGludG9yYVJlbmRlck9wdGlvbnNcbik6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHJlbmRlck9wdHMgPSBzdHJ1Y3R1cmVkQ2xvbmUob3B0aW9ucyk7XG4gICAgZGVsZXRlIHJlbmRlck9wdHMub3V0cHV0Rk47XG5cbiAgICBjb25zdCBidWYgPSBhd2FpdCByZW5kZXIocmVuZGVyT3B0cyk7XG5cbiAgICBpZiAob3B0aW9ucy5vdXRwdXRGTikge1xuICAgICAgICBhd2FpdCBmc3Aud3JpdGVGaWxlKG9wdGlvbnMub3V0cHV0Rk4sIGJ1Zik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyBvdXRwdXQgZmlsZSBGTiAke3V0aWwuaW5zcGVjdChvcHRpb25zKX1gKTtcbiAgICB9XG59XG5cbmNsYXNzIFBpbnRvcmFMb2NhbCBleHRlbmRzIGFrYXNoYS5DdXN0b21FbGVtZW50IHtcblx0Z2V0IGVsZW1lbnROYW1lKCkgeyByZXR1cm4gXCJkaWFncmFtcy1waW50b3JhXCI7IH1cblxuICAgIGFzeW5jIHByb2Nlc3MoJGVsZW1lbnQsIG1ldGFkYXRhLCBkaXJ0eTogRnVuY3Rpb24pIHtcbiAgICAgICAgY29uc3Qgb3B0aW9uczogUGludG9yYVJlbmRlck9wdGlvbnMgPSB7XG4gICAgICAgICAgICBjb2RlOiAkZWxlbWVudC50ZXh0KCksXG4gICAgICAgICAgICBvdXRwdXRGTjogJGVsZW1lbnQuYXR0cignb3V0cHV0LWZpbGUnKVxuICAgICAgICB9O1xuXG4gICAgICAgIGxldCB2cGF0aEluO1xuICAgICAgICBsZXQgZnNwYXRoSW47XG4gICAgICAgIGNvbnN0IGluZiA9ICAkZWxlbWVudC5hdHRyKCdpbnB1dC1maWxlJyk7XG4gICAgICAgIGlmICh0eXBlb2YgaW5mID09PSAnc3RyaW5nJ1xuICAgICAgICAgJiYgaW5mLmxlbmd0aCA+PSAxXG4gICAgICAgICkge1xuICAgICAgICAgICAgaWYgKHBhdGguaXNBYnNvbHV0ZShpbmYpKSB7XG4gICAgICAgICAgICAgICAgdnBhdGhJbiA9IGluZjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbGV0IGRpciA9IHBhdGguZGlybmFtZShtZXRhZGF0YS5kb2N1bWVudC5wYXRoKTtcbiAgICAgICAgICAgICAgICB2cGF0aEluID0gcGF0aC5ub3JtYWxpemUoXG4gICAgICAgICAgICAgICAgICAgIHBhdGguam9pbignLycsIGRpciwgaW5mKVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBjb25zb2xlLmxvZyhgUGludG9yYUxvY2FsIGlucHV0LWZpbGUgJHt1dGlsLmluc3BlY3QoaW5mKX0gdnBhdGhJbiAke3V0aWwuaW5zcGVjdCh2cGF0aEluKX1gKTtcblxuICAgICAgICBjb25zdCBkb2N1bWVudHMgPSB0aGlzLmNvbmZpZy5ha2FzaGEuZmlsZWNhY2hlLmRvY3VtZW50c0NhY2hlO1xuICAgICAgICBjb25zdCBhc3NldHMgPSB0aGlzLmFrYXNoYS5maWxlY2FjaGUuYXNzZXRzQ2FjaGU7XG4gICAgICAgIGNvbnN0IGRvYyA9IHZwYXRoSW5cbiAgICAgICAgICAgID8gYXdhaXQgZG9jdW1lbnRzLmZpbmQodnBhdGhJbilcbiAgICAgICAgICAgIDogdW5kZWZpbmVkO1xuICAgICAgICBsZXQgYXNzZXQ7XG5cbiAgICAgICAgaWYgKCFkb2MpIGFzc2V0ID0gdnBhdGhJblxuICAgICAgICAgICAgPyBhd2FpdCBhc3NldHMuZmluZCh2cGF0aEluKVxuICAgICAgICAgICAgOiB1bmRlZmluZWQ7XG4gICBcbiAgICAgICAgaWYgKGRvYykgZnNwYXRoSW4gPSBkb2MuZnNwYXRoO1xuICAgICAgICBlbHNlIGlmIChhc3NldCkgZnNwYXRoSW4gPSBhc3NldC5mc3BhdGg7XG5cbiAgICAgICAgaWYgKHR5cGVvZiBmc3BhdGhJbiA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5jb2RlID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgICYmIG9wdGlvbnMuY29kZS5sZW5ndGggPj0gMVxuICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBkaWFncmFtcy1waW50b3JhIC0gZWl0aGVyIHNwZWNpZnkgaW5wdXQtZmlsZSBPUiBhIGRpYWdyYW0gYm9keSwgbm90IGJvdGhgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG9wdGlvbnMuY29kZSA9IGF3YWl0IGZzcC5yZWFkRmlsZShmc3BhdGhJbiwgJ3V0Zi04Jyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMub3V0cHV0Rk4gIT09ICdzdHJpbmcnXG4gICAgICAgICB8fCBvcHRpb25zLm91dHB1dEZOLmxlbmd0aCA8IDFcbiAgICAgICAgKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGRpYWdyYW1zLXBpbnRvcmEgbXVzdCBoYXZlIG91dHB1dC1maWxlYCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBweHIgPSAkZWxlbWVudC5hdHRyKCdwaXhlbC1yYXRpbycpO1xuICAgICAgICBpZiAodHlwZW9mIHB4ciA9PT0gJ3N0cmluZydcbiAgICAgICAgICYmIHB4ci5sZW5ndGggPj0gMVxuICAgICAgICApIHtcbiAgICAgICAgICAgIGNvbnN0IHIgPSBOdW1iZXIucGFyc2VGbG9hdChweHIpO1xuICAgICAgICAgICAgaWYgKGlzTmFOKHIpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBkaWFncmFtcy1waW50b3JhOiBwaXhlbC1yYXRpbyBpcyBub3QgYSBudW1iZXIgJHtweHJ9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvcHRpb25zLmRldmljZVBpeGVsUmF0aW8gPSByO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbWltZSA9ICRlbGVtZW50LmF0dHIoJ21pbWUtdHlwZScpO1xuICAgICAgICBpZiAodHlwZW9mIG1pbWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgbWltZSA9PT0gJ2ltYWdlL3N2Zyt4bWwnXG4gICAgICAgICAgICAgfHwgbWltZSA9PT0gJ2ltYWdlL2pwZWcnXG4gICAgICAgICAgICAgfHwgbWltZSA9PT0gJ2ltYWdlL3BuZydcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgIG9wdGlvbnMubWltZVR5cGUgPSBtaW1lO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgTUlNRSB0eXBlICR7dXRpbC5pbnNwZWN0KG1pbWUpfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgYmdDb2xvciA9ICRlbGVtZW50LmF0dHIoJ2JnLWNvbG9yJyk7XG4gICAgICAgIGlmICh0eXBlb2YgYmdDb2xvciA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIG9wdGlvbnMuYmFja2dyb3VuZENvbG9yID0gYmdDb2xvcjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHdpZHRoID0gJGVsZW1lbnQuYXR0cignd2lkdGgnKTtcbiAgICAgICAgaWYgKHR5cGVvZiB3aWR0aCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIG9wdGlvbnMud2lkdGggPSBOdW1iZXIucGFyc2VGbG9hdCh3aWR0aCk7XG4gICAgICAgICAgICBpZiAoaXNOYU4ob3B0aW9ucy53aWR0aCkpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGRpYWdyYW1zLXBpbnRvcmE6IHdpZHRoIGlzIG5vdCBhIG51bWJlciAke3dpZHRofWApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgb3B0aW9ucy5yZW5kZXJJblN1YnByb2Nlc3MgPSBmYWxzZTtcblxuICAgICAgICBjb25zdCBidWYgPSBhd2FpdCByZW5kZXIob3B0aW9ucyk7XG5cbiAgICAgICAgY29uc3QgaWQgPSAkZWxlbWVudC5hdHRyKCdpZCcpO1xuICAgICAgICBjb25zdCBjbGF6eiA9ICRlbGVtZW50LmF0dHIoJ2NsYXNzJyk7XG4gICAgICAgIGNvbnN0IGFsdCA9ICRlbGVtZW50LmF0dHIoJ2FsdCcpO1xuICAgICAgICBjb25zdCB0aXRsZSA9ICRlbGVtZW50LmF0dHIoJ3RpdGxlJyk7XG4gICAgICAgIGNvbnN0IGNhcHRpb24gPSAkZWxlbWVudC5hdHRyKCdjYXB0aW9uJyk7XG5cbiAgICAgICAgY29uc3QgY2FwID0gdHlwZW9mIGNhcHRpb24gPT09ICdzdHJpbmcnXG4gICAgICAgICAgICA/IGA8ZmlnY2FwdGlvbj4ke2VuY29kZShjYXB0aW9uKX08L2ZpZ2NhcHRpb24+YFxuICAgICAgICAgICAgOiAnJztcbiAgICAgICAgY29uc3QgVGFsdCA9IHR5cGVvZiBhbHQgPT09ICdzdHJpbmcnXG4gICAgICAgICAgICA/IGBhbHQ9XCIke2VuY29kZShhbHQpfVwiYFxuICAgICAgICAgICAgOiAnJztcbiAgICAgICAgY29uc3QgVHRpdGxlID0gdHlwZW9mIHRpdGxlID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgPyBgdGl0bGU9XCIke2VuY29kZSh0aXRsZSl9XCJgXG4gICAgICAgICAgICA6ICcnO1xuICAgICAgICBjb25zdCBUaWQgPSB0eXBlb2YgaWQgPT09ICdzdHJpbmcnXG4gICAgICAgICAgICA/IGBpZD1cIiR7ZW5jb2RlKGlkKX1gXG4gICAgICAgICAgICA6ICcnO1xuICAgICAgICBjb25zdCBUY2xhenogPSB0eXBlb2YgY2xhenogPT09ICdzdHJpbmcnXG4gICAgICAgICAgICA/IGBjbGFzcz1cIiR7ZW5jb2RlKGNsYXp6KX1gXG4gICAgICAgICAgICA6ICcnO1xuICAgICAgICBjb25zdCBUd2lkdGggPSB0eXBlb2Ygb3B0aW9ucy53aWR0aCA9PT0gJ251bWJlcidcbiAgICAgICAgICAgID8gYHdpZHRoPVwiJHtvcHRpb25zLndpZHRoLnRvU3RyaW5nKCl9XCJgXG4gICAgICAgICAgICA6ICcnO1xuXG4gICAgICAgIC8vIG9wdGlvbnMub3V0cHV0Rk4gd2FzIHNldCBmcm9tIG91dHB1dC1maWxlXG4gICAgICAgIC8vIFRoaXMgY3JlYXRlcyB2cGF0aE91dCBmcm9tIHRoYXQgdmFsdWVcbiAgICAgICAgLy8gVGhpcyBjb21wdXRzIGZzcGF0aE91dCwgd2hpY2ggaXMgdGhlblxuICAgICAgICAvLyBhc3NpZ25lZCBiYWNrIGludG8gb3B0aW9ucy5vdXRwdXRGTlxuXG4gICAgICAgIGxldCB2cGF0aE91dDtcbiAgICAgICAgaWYgKCEgcGF0aC5pc0Fic29sdXRlKG9wdGlvbnMub3V0cHV0Rk4pKSB7XG4gICAgICAgICAgICBsZXQgZGlyID0gcGF0aC5kaXJuYW1lKG1ldGFkYXRhLmRvY3VtZW50LnBhdGgpO1xuICAgICAgICAgICAgdnBhdGhPdXQgPSBwYXRoLm5vcm1hbGl6ZShcbiAgICAgICAgICAgICAgICBwYXRoLmpvaW4oJy8nLCBkaXIsIG9wdGlvbnMub3V0cHV0Rk4pXG4gICAgICAgICAgICApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdnBhdGhPdXQgPSBvcHRpb25zLm91dHB1dEZOO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ29tcHV0ZSBmc3BhdGggZm9yIHZwYXRoT3V0XG4gICAgICAgIGNvbnN0IGZzcGF0aE91dCA9IHBhdGgubm9ybWFsaXplKHBhdGguam9pbihcbiAgICAgICAgICAgIHRoaXMuY29uZmlnLnJlbmRlckRlc3RpbmF0aW9uLCB2cGF0aE91dFxuICAgICAgICApKTtcbiAgICAgICAgb3B0aW9ucy5vdXRwdXRGTiA9IGZzcGF0aE91dDtcblxuICAgICAgICBpZiAob3B0aW9ucy5vdXRwdXRGTikge1xuICAgICAgICAgICAgYXdhaXQgZnNwLndyaXRlRmlsZShvcHRpb25zLm91dHB1dEZOLCBidWYpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJldCA9IGBcbiAgICAgICAgPGZpZ3VyZSAke1RpZH0gJHtUY2xhenp9PlxuICAgICAgICA8aW1nIHNyYz1cIiR7ZW5jb2RlKHZwYXRoT3V0KX1cIiAke1RhbHR9ICR7VHRpdGxlfSAke1R3aWR0aH0vPlxuICAgICAgICAke2NhcH1cbiAgICAgICAgPC9maWd1cmU+XG4gICAgICAgIGA7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKHJldCk7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfVxufVxuXG4vKipcbiAqIE9wdGlvbnMgb2JqZWN0IHRoYXQgaXMgY29udmVydGVkIGludG8gcGxhbnR1bWwuamFyIG9wdGlvbnMuXG4gKi9cbmV4cG9ydCB0eXBlIGRvUGxhbnRVTUxPcHRpb25zID0ge1xuICAgIC8qKlxuICAgICAqIFRoZSBQbGFudFVNTCBkaWFncmFtIHRleHQgdG8gdXNlXG4gICAgICovXG4gICAgaW5wdXRCb2R5Pzogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogWmVybyBvciBtb3JlIGZpbGUgbmFtZXMgZm9yIGZpbGVzIHRvIHJlbmRlclxuICAgICAqL1xuICAgIGlucHV0Rk5zPzogc3RyaW5nW107XG5cbiAgICAvKipcbiAgICAgKiBQb3NzaWJsZSBmaWxlIHRvIHdyaXRlIG91dHB1dCBpbnRvXG4gICAgICovXG4gICAgb3V0cHV0Rk4/OiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBUbyB1c2UgYSBzcGVjaWZpYyBjaGFyYWN0ZXIgc2V0LiBEZWZhdWx0OiBVVEYtOFxuICAgICAqL1xuICAgIGNoYXJzZXQ/OiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBUbyB1c2UgZGFyayBtb2RlIGZvciBkaWFncmFtc1xuICAgICAqL1xuICAgIGRhcmttb2RlPzogYm9vbGVhbjtcblxuICAgIC8qKlxuICAgICAqIFRvIGdlbmVyYXRlIGludGVybWVkaWF0ZSBzdmVrIGZpbGVzXG4gICAgICovXG4gICAgZGVidWdzdmVrPzogYm9vbGVhbjtcblxuICAgIC8qKlxuICAgICAqIFwiZXhhbXBsZS5wdW1sXCIgVG8gb3ZlcnJpZGUgJWZpbGVuYW1lJSB2YXJpYWJsZVxuICAgICAqL1xuICAgIGZpbGVOYW1lT3ZlcnJpZGU/OiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBUbyB1c2UgKE4pIHRocmVhZHMgZm9yIHByb2Nlc3NpbmcuICBVc2UgXCJhdXRvXCIgZm9yIDQgdGhyZWFkcy5cbiAgICAgKi9cbiAgICBuYnRocmVhZD86IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIFRvIE5PVCBleHBvcnQgbWV0YWRhdGEgaW4gUE5HL1NWRyBnZW5lcmF0ZWQgZmlsZXNcbiAgICAgKi9cbiAgICBub21ldGFkYXRhPzogYm9vbGVhbjtcblxuICAgIC8qKlxuICAgICAqIFRvIGdlbmVyYXRlIGltYWdlcyBpbiB0aGUgc3BlY2lmaWVkIGRpcmVjdG9yeVxuICAgICAqL1xuICAgIG91dHB1dERpcj86IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIFRvIGdlbmVyYXRlIGltYWdlcyB1c2luZyBFUFMgZm9ybWF0XG4gICAgICovXG4gICAgdGVwcz86IGJvb2xlYW47XG5cbiAgICAvKipcbiAgICAgKiBUbyBnZW5lcmF0ZSBIVE1MIGZpbGUgZm9yIGNsYXNzIGRpYWdyYW1cbiAgICAgKi9cbiAgICB0aHRtbD86IGJvb2xlYW47XG5cbiAgICAvKipcbiAgICAgKiBUbyBnZW5lcmF0ZSBpbWFnZXMgdXNpbmcgTGFUZVgvVGlreiBmb3JtYXRcbiAgICAgKi9cbiAgICB0bGF0ZXg/OiBib29sZWFuO1xuXG4gICAgLyoqXG4gICAgICogVG8gZ2VuZXJhdGUgaW1hZ2VzIHVzaW5nIFBERiBmb3JtYXRcbiAgICAgKi9cbiAgICB0cGRmPzogYm9vbGVhbjtcblxuICAgIC8qKlxuICAgICAqIFRvIGdlbmVyYXRlIGltYWdlcyB1c2luZyBQTkcgZm9ybWF0IChkZWZhdWx0KVxuICAgICAqL1xuICAgIHRwbmc/OiBib29sZWFuO1xuXG4gICAgLyoqXG4gICAgICogVG8gZ2VuZXJhdGUgU0NYTUwgZmlsZSBmb3Igc3RhdGUgZGlhZ3JhbVxuICAgICAqL1xuICAgIHRzY3htbD86IGJvb2xlYW47XG5cbiAgICAvKipcbiAgICAgKiBUbyBnZW5lcmF0ZSBpbWFnZXMgdXNpbmcgU1ZHIGZvcm1hdFxuICAgICAqL1xuICAgIHRzdmc/OiBib29sZWFuO1xuXG4gICAgLyoqXG4gICAgICogVG8gZ2VuZXJhdGUgaW1hZ2VzIHdpdGggQVNDSUkgYXJ0XG4gICAgICovXG4gICAgdHR4dD86IGJvb2xlYW47XG5cbiAgICAvKipcbiAgICAgKiBUbyBnZW5lcmF0ZSBpbWFnZXMgd2l0aCBBU0NJSSBhcnQgdXNpbmcgVW5pY29kZSBjaGFyYWN0ZXJzXG4gICAgICovXG4gICAgdHV0eHQ/OiBib29sZWFuO1xuXG4gICAgLyoqXG4gICAgICogVG8gZ2VuZXJhdGUgaW1hZ2VzIHVzaW5nIFZEWCBmb3JtYXRcbiAgICAgKi9cbiAgICB0dmR4PzogYm9vbGVhbjtcblxuICAgIC8qKlxuICAgICAqIFRvIGdlbmVyYXRlIFhNSSBmaWxlIGZvciBjbGFzcyBkaWFncmFtXG4gICAgICovXG4gICAgdHhtaT86IGJvb2xlYW47XG5cbiAgICAvKipcbiAgICAgKiBUbyBoYXZlIGxvZyBpbmZvcm1hdGlvblxuICAgICAqL1xuICAgIHZlcmJvc2U/OiBib29sZWFuO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZG9QbGFudFVNTExvY2FsKG9wdGlvbnMpIHtcblxuICAgIGNvbnN0IGFyZ3MgPSBbXG4gICAgICAgIC8vICdqYXZhJyxcbiAgICAgICAgJy1qYXInLFxuICAgICAgICAnLURqYXZhLmF3dC5oZWFkbGVzcz10cnVlJyxcbiAgICAgICAgJy0tYWRkLW9wZW5zPWphdmEueG1sL2NvbS5zdW4ub3JnLmFwYWNoZS54YWxhbi5pbnRlcm5hbC54c2x0Yy50cmF4PUFMTC1VTk5BTUVEJyxcbiAgICAgICAgcGxhbnR1bWxKYXIsXG4gICAgXTtcbiAgICBpZiAob3B0aW9ucy5jaGFyc2V0KSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLWNoYXJzZXQnKTtcbiAgICAgICAgYXJncy5wdXNoKG9wdGlvbnMuY2hhcnNldCk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLmRhcmttb2RlKSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLWRhcmttb2RlJyk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLmRlYnVnc3Zlaykge1xuICAgICAgICBhcmdzLnB1c2goJy1kZWJ1Z3N2ZWsnKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMuZmlsZU5hbWVPdmVycmlkZSkge1xuICAgICAgICBhcmdzLnB1c2goJy1maWxlbmFtZScpO1xuICAgICAgICBhcmdzLnB1c2gob3B0aW9ucy5maWxlTmFtZU92ZXJyaWRlKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMubmJ0aHJlYWQpIHtcbiAgICAgICAgYXJncy5wdXNoKCctbmJ0aHJlYWQnKTtcbiAgICAgICAgYXJncy5wdXNoKG9wdGlvbnMubmJ0aHJlYWQpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy5ub21ldGFkYXRhKSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLW5vbWV0YWRhdGEnKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMudGVwcykge1xuICAgICAgICBhcmdzLnB1c2goJy10ZXBzJyk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnRodG1sKSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLXRodG1sJyk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnRsYXRleCkge1xuICAgICAgICBhcmdzLnB1c2goJy10bGF0ZXgnKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMudHBkZikge1xuICAgICAgICBhcmdzLnB1c2goJy10cGRmJyk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnRwbmcpIHtcbiAgICAgICAgYXJncy5wdXNoKCctdHBuZycpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy50c2N4bWwpIHtcbiAgICAgICAgYXJncy5wdXNoKCctdHNjeG1sJyk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnRzdmcpIHtcbiAgICAgICAgYXJncy5wdXNoKCctdHN2ZycpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy50dHh0KSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLXR0eHQnKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMudHV0eHQpIHtcbiAgICAgICAgYXJncy5wdXNoKCctdHV0eHQnKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMudHZkeCkge1xuICAgICAgICBhcmdzLnB1c2goJy10dmR4Jyk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnR4bWkpIHtcbiAgICAgICAgYXJncy5wdXNoKCctdHhtaScpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy52ZXJib3NlKSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLXZlcmJvc2UnKTtcbiAgICB9XG5cbiAgICAvLyAwIGlucHV0Rk5zIHJlcXVpcmVzIGlucHV0Qm9keSwgcmVxdWlyZXMgb3V0cHV0Rk5cbiAgICAvLyBjaGlsZC5zdGRpbi53cml0ZS9lbmQgd2l0aCBpbnB1dEJvZHlcbiAgICAvLyBjaGlsZC5zdGRvdXQucGlwZShmcy5jcmVhdGVXcml0ZVN0cmVhbShvdXRwdXRGTikpXG4gICAgLy8gLXBpcGVcbiAgICAvL1xuICAgIC8vIDEgaW5wdXRGTiwgbm8vaWdub3JlIGlucHV0Qm9keSwgcmVxdWlyZXMgb3V0cHV0Rk5cbiAgICAvLyBmcy5jcmVhdGVSZWFkU3RyZWFtKGlucHV0Rk4pLnBpcGUoY2hpbGQuc3RkaW4pID8/XG4gICAgLy8gY2hpbGQuc3Rkb3V0LnBpcGUoZnMuY3JlYXRlV3JpdGVTdHJlYW0ob3V0cHV0Rk4pKVxuICAgIC8vIC1waXBlXG4gICAgLy9cbiAgICAvLyBJR05PUkVcbiAgICAvLyBJR05PUkUgZWl0aGVyIDAgaW5wdXQgRk5zICYgaW5wdXRCb2R5LCBvciAxIGlucHV0Rk5cbiAgICAvLyBJR05PUkUgbm8gb3V0cHV0Rk5cbiAgICAvLyBJR05PUkUgLXRzdmcgc2V0XG4gICAgLy8gSUdOT1JFIFJlYWQgc3Rkb3V0IGludG8gYSBCdWZmZXIsIHRoYXQncyBjb252ZXJ0ZWQgdG8gc3RyaW5nXG4gICAgLy8gSUdOT1JFIC1waXBlXG4gICAgLy8gSUdOT1JFIFJldHVybiB0aGUgc3RyaW5nXG4gICAgLy8gU0VFIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzE0MjY5MjMzL25vZGUtanMtaG93LXRvLXJlYWQtYS1zdHJlYW0taW50by1hLWJ1ZmZlclxuICAgIC8vXG4gICAgLy8gbXVsdGlwbGUgaW5wdXRGTnMgLi4gb3B0aW9uYWwgb3V0cHV0LWRpcidzXG4gICAgLy8gQm90aCBnbyBvbiB0aGUgY29tbWFuZC1saW5lXG4gICAgLy9cblxuICAgIGxldCBzcGF3bm9wdHMgPSB7fSBhcyBhbnk7XG5cbiAgICBpZiAodHlwZW9mIG9wdGlvbnMuaW5wdXRGTnMgPT09ICd1bmRlZmluZWQnXG4gICAgICYmICFBcnJheS5pc0FycmF5KG9wdGlvbnMuaW5wdXRGTnMpXG4gICAgICYmIHR5cGVvZiBvcHRpb25zLmlucHV0Qm9keSAhPT0gJ3N0cmluZydcbiAgICApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBwbGFudHVtbCAtIG5vIGlucHV0IHNvdXJjZXNgKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBvcHRpb25zLmlucHV0Rk5zID09PSAndW5kZWZpbmVkJ1xuICAgICAmJiAhQXJyYXkuaXNBcnJheShvcHRpb25zLmlucHV0Rk5zKVxuICAgICAmJiB0eXBlb2Ygb3B0aW9ucy5pbnB1dEJvZHkgPT09ICdzdHJpbmcnXG4gICAgICYmIHR5cGVvZiBvcHRpb25zLm91dHB1dEZOICE9PSAnc3RyaW5nJ1xuICAgICkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sIC0gd2l0aCBpbnB1dEJvZHksIG5vIG91dHB1dCBkZXN0aW5hdGlvbmApO1xuICAgIH1cbiAgICAvLyBObyBmaWxlIG5hbWVzLCBidXQgYW4gaW5wdXRCb2R5LCBhbmQgYW4gb3V0cHV0IGZpbGUsXG4gICAgLy8gbWVhbnMgd2UncmUgcGlwaW5nXG4gICAgaWYgKHR5cGVvZiBvcHRpb25zLmlucHV0Rk5zID09PSAndW5kZWZpbmVkJ1xuICAgICAmJiAhQXJyYXkuaXNBcnJheShvcHRpb25zLmlucHV0Rk5zKVxuICAgICAmJiB0eXBlb2Ygb3B0aW9ucy5pbnB1dEJvZHkgPT09ICdzdHJpbmcnXG4gICAgICYmIHR5cGVvZiBvcHRpb25zLm91dHB1dEZOID09PSAnc3RyaW5nJ1xuICAgICkge1xuICAgICAgICBhcmdzLnB1c2goJy1waXBlJyk7XG4gICAgfVxuICAgIGlmIChBcnJheS5pc0FycmF5KG9wdGlvbnMuaW5wdXRGTnMpXG4gICAgICYmIG9wdGlvbnMuaW5wdXRGTnMubGVuZ3RoID09PSAxXG4gICAgICYmIHR5cGVvZiBvcHRpb25zLm91dHB1dEZOICE9PSAnc3RyaW5nJ1xuICAgICkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sIC0gd2l0aCBvbmUgaW5wdXQgZmlsZSAke29wdGlvbnMuaW5wdXRGTnNbMF19IG5vIG91dHB1dCBmaWxlYCk7XG4gICAgfVxuICAgIC8vIE9uZSBmaWxlIG5hbWVzLCBpZ25vcmUgaW5wdXRCb2R5LCBhbmQgYW4gb3V0cHV0IGZpbGUsXG4gICAgLy8gbWVhbnMgd2UncmUgcGlwaW5nXG4gICAgaWYgKEFycmF5LmlzQXJyYXkob3B0aW9ucy5pbnB1dEZOcylcbiAgICAgJiYgb3B0aW9ucy5pbnB1dEZOcy5sZW5ndGggPT09IDFcbiAgICAgJiYgdHlwZW9mIG9wdGlvbnMub3V0cHV0Rk4gPT09ICdzdHJpbmcnXG4gICAgKSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLXBpcGUnKTtcbiAgICB9XG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheShvcHRpb25zLmlucHV0Rk5zKVxuICAgICAmJiBvcHRpb25zLmlucHV0Rk5zLmxlbmd0aCA+IDFcbiAgICAgJiYgdHlwZW9mIG9wdGlvbnMub3V0cHV0Rk4gPT09ICdzdHJpbmcnXG4gICAgKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgcGxhbnR1bWwgLSB3aXRoIG11bHRpcGxlIGlucHV0IGZpbGVzLCBvdXRwdXQgZmlsZSBub3QgYWxsb3dlZGApXG4gICAgfVxuXG4gICAgLy8gbXVsdGlwbGUgZmlsZSBuYW1lcywgcHVzaCBvbnRvIGFyZ3NcbiAgICBpZiAoQXJyYXkuaXNBcnJheShvcHRpb25zLmlucHV0Rk5zKVxuICAgICAmJiBvcHRpb25zLmlucHV0Rk5zLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yIChjb25zdCBpbnB1dEZOIG9mIG9wdGlvbnMuaW5wdXRGTnMpIHtcbiAgICAgICAgICAgIGFyZ3MucHVzaChpbnB1dEZOKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5vdXRwdXREaXIgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLW91dHB1dCcpO1xuICAgICAgICBhcmdzLnB1c2gob3B0aW9ucy5vdXRwdXREaXIpO1xuICAgIH1cblxuICAgIC8vIE5vdyB0aGF0IHRoZSBjb21tYW5kIGFyZ3MgYW5kIHNwYXdub3B0cyBhcmUgc2V0IHVwXG4gICAgLy8gcnVuIHRoZSBjb21tYW5kXG4gICAgLy8gY29uc29sZS5sb2coe1xuICAgIC8vICAgICBzcGF3bm9wdHMsIGFyZ3NcbiAgICAvLyB9KTtcbiAgICBjb25zdCBjaGlsZCA9IHNwYXduKCdqYXZhJywgYXJncywgc3Bhd25vcHRzKTtcblxuICAgIC8vIE5leHQsIHNldCB1cCBzdGRpbi9zdGRvdXQgcGlwZXMgaW4gY2FzZVxuICAgIC8vIG9mIHVzaW5nIC1waXBlIG1vZGVcblxuICAgIC8vIE5vIGlucHV0IGZpbGVzLCB3aXRoIGlucHV0Qm9keSwgYW5kIG91dHB1dEZOLFxuICAgIC8vIHNldCB1cCB0aGUgcGlwaW5nIGZyb20gaW5wdXQgdG8gb3V0cHV0XG4gICAgaWYgKHR5cGVvZiBvcHRpb25zLmlucHV0Rk5zID09PSAndW5kZWZpbmVkJ1xuICAgICAmJiAhQXJyYXkuaXNBcnJheShvcHRpb25zLmlucHV0Rk5zKVxuICAgICAmJiB0eXBlb2Ygb3B0aW9ucy5pbnB1dEJvZHkgPT09ICdzdHJpbmcnXG4gICAgICYmIHR5cGVvZiBvcHRpb25zLm91dHB1dEZOID09PSAnc3RyaW5nJ1xuICAgICkge1xuICAgICAgICBjaGlsZC5zdGRpbi53cml0ZShvcHRpb25zLmlucHV0Qm9keSk7XG4gICAgICAgIGNoaWxkLnN0ZG91dC5waXBlKGZzLmNyZWF0ZVdyaXRlU3RyZWFtKG9wdGlvbnMub3V0cHV0Rk4pKTtcbiAgICAgICAgY2hpbGQuc3RkaW4uZW5kKCk7XG4gICAgfVxuXG4gICAgLy8gT25lIGZpbGUgbmFtZXMsIGlnbm9yZSBpbnB1dEJvZHksIGFuZCBhbiBvdXRwdXQgZmlsZSxcbiAgICAvLyBzZXQgdXAgdGhlIHBpcGluZyBmcm9tIGlucHV0IHRvIG91dHB1dFxuICAgIGlmIChBcnJheS5pc0FycmF5KG9wdGlvbnMuaW5wdXRGTnMpXG4gICAgICYmIG9wdGlvbnMuaW5wdXRGTnMubGVuZ3RoID09PSAxXG4gICAgICYmIHR5cGVvZiBvcHRpb25zLm91dHB1dEZOID09PSAnc3RyaW5nJ1xuICAgICkge1xuICAgICAgICAvLyBjb25zdCBpbnAgPSBhd2FpdCBmc3AucmVhZEZpbGUob3B0aW9ucy5pbnB1dEZOc1swXSwgJ3V0Zi04Jyk7XG4gICAgICAgIC8vIGNoaWxkLnN0ZGluLndyaXRlKGlucCk7XG4gICAgICAgIGZzLmNyZWF0ZVJlYWRTdHJlYW0ob3B0aW9ucy5pbnB1dEZOc1swXSkucGlwZShjaGlsZC5zdGRpbik7XG4gICAgICAgIGNoaWxkLnN0ZG91dC5waXBlKGZzLmNyZWF0ZVdyaXRlU3RyZWFtKG9wdGlvbnMub3V0cHV0Rk4pKTtcbiAgICAgICAgLy8gY2hpbGQuc3RkaW4uZW5kKCk7XG4gICAgfVxuXG4gICAgLy8gRmluYWxseSwgd2FpdCBmb3IgdGhlIGNoaWxkIHRvIGZpbmlzaFxuXG4gICAgY2hpbGQub24oJ2Vycm9yJywgKGVycikgPT4ge1xuICAgICAgICBjb25zb2xlLmVycm9yKGBwbGFudHVtbCBFUlJPUiBpbiBjaGlsZCBwcm9jZXNzICR7ZXJyLm1lc3NhZ2V9YCk7XG4gICAgfSk7XG5cbiAgICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGNoaWxkLm9uKCdjbG9zZScsIChjb2RlKSA9PiB7XG4gICAgICAgICAgICBpZiAoY29kZSA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUodW5kZWZpbmVkKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihgcGxhbnR1bWwgZmFpbCB3aXRoIGNvZGUgJHtjb2RlfWApKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbn1cblxuLyoqXG4gKiBIYW5kbGUgY29udmVydGluZyBhIHNpbmdsZSBQbGFudFVNTCBkaWFncmFtIGZvclxuICogZGlzcGxheSBpbiBhIGRvY3VtZW50LlxuICogXG4gKiBUaGUgZG9jdW1lbnQgZGVzY3JpcHRpb24gaXMgZWl0aGVyIGlubGluZVxuICogdG8gdGhlIDxkaWFncmFtcy1wbGFudHVtbD4gdGFnLCBvciBlbHNlIGEgc2luZ2xlXG4gKiBpbnB1dCBmaWxlIGluIHRoZSBpbnB1dC1maWxlIGF0dHJpYnV0ZS5cbiAqIFxuICogVGhlcmUgaXMgYSBzaW5nbGUgb3V0cHV0LWZpbGUgYXR0cmlidXRlIHRvXG4gKiBmb3IgYSBmaWxlIHRvIHJlY2VpdmUgYXMgb3V0cHV0LiAgVGhpcyBmaWxlXG4gKiBpcyB3cml0dGVuIGRpcmVjdGx5IHRvIHRoZSByZW5kZXJpbmdPdXRwdXQgZGlyZWN0b3J5LlxuICogXG4gKiBUaGlzIHdpbGwgc3VwcG9ydCBvbmx5IFBORyBhbmQgU1ZHIG91dHB1dCBmb3JtYXRzLlxuICogXG4gKiBUaGUgb3V0cHV0LWZpbGUgaXMgYSBWUGF0aCBzcGVjaWZ5aW5nIGFuXG4gKiBvdXRwdXQgZGlyZWN0b3J5IGxvY2F0aW9uLlxuICogXG4gKiBpc0Fic29sdXRlKG91dHB1dC1maWxlKSAtIG1lYW5zIGl0IGlzIHJvb3RlZFxuICogdG8gdGhlIG91dHB1dCBkaXJlY3RvcnkuICBPdGhlcndpc2UgaXQgaXMgcmVsYXRpdmVcbiAqIHRvIHRoZSBkaXJuYW1lKG1ldGFkYXRhLmRvY3VtZW50LnBhdGgpLlxuICovXG5jbGFzcyBQbGFudFVNTExvY2FsIGV4dGVuZHMgYWthc2hhLkN1c3RvbUVsZW1lbnQge1xuXG5cdGdldCBlbGVtZW50TmFtZSgpIHsgcmV0dXJuIFwiZGlhZ3JhbXMtcGxhbnR1bWxcIjsgfVxuICAgIGFzeW5jIHByb2Nlc3MoJGVsZW1lbnQsIG1ldGFkYXRhLCBkaXJ0eTogRnVuY3Rpb24pIHtcblxuICAgICAgICBjb25zdCBvcHRpb25zOiBkb1BsYW50VU1MT3B0aW9ucyA9IHtcbiAgICAgICAgICAgIC8vIFVzaW5nIC50ZXh0KCkgZWxpbWluYXRlcyBIVE1MIGZvcm1hdHRpbmcuXG4gICAgICAgICAgICBpbnB1dEJvZHk6ICRlbGVtZW50LnRleHQoKSxcbiAgICAgICAgICAgIGlucHV0Rk5zOiB1bmRlZmluZWQsXG4gICAgICAgICAgICBvdXRwdXRGTjogJGVsZW1lbnQuYXR0cignb3V0cHV0LWZpbGUnKVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEVuc3VyZSB0aGVyZSBpcyBlaXRoZXIgYW4gaW5wdXQtZmlsZVxuICAgICAgICAvLyBvciBhbiBpbnB1dCBib2R5XG5cbiAgICAgICAgY29uc3QgaW5mID0gICRlbGVtZW50LmF0dHIoJ2lucHV0LWZpbGUnKTtcbiAgICAgICAgaWYgKHR5cGVvZiBpbmYgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBvcHRpb25zLmlucHV0Rk5zID0gWyBpbmYgXTtcbiAgICAgICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGluZikgJiYgaW5mLmxlbmd0aCA+PSAxKSB7XG4gICAgICAgICAgICBvcHRpb25zLmlucHV0Rk5zID0gWyBpbmZbMF0gXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9wdGlvbnMuaW5wdXRGTnMgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLmlucHV0Qm9keSAhPT0gJ3N0cmluZydcbiAgICAgICAgICYmIChcbiAgICAgICAgICAgICFBcnJheS5pc0FycmF5KG9wdGlvbnMuaW5wdXRGTnMpXG4gICAgICAgICB8fCBvcHRpb25zLmlucHV0Rk5zLmxlbmd0aCA8PSAwXG4gICAgICAgICkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgUGxhbnRVTUxMb2NhbCBvbmUgaW5wdXQgZmlsZSBvciBpbmxpbmUgZGlhZ3JhbSBpcyByZXF1aXJlZGApO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IHZwYXRoSW47XG4gICAgICAgIGxldCBmc3BhdGhJbjtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkob3B0aW9ucy5pbnB1dEZOcykgJiYgb3B0aW9ucy5pbnB1dEZOcy5sZW5ndGggPT09IDEpIHtcblxuICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLmlucHV0Rk5zWzBdICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgUGxhbnRVTUxMb2NhbCBubyBpbnB1dCBmaWxlIEZOIGdpdmVuIGluICR7dXRpbC5pbnNwZWN0KG9wdGlvbnMuaW5wdXRGTnMpfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgaW5GTiA9IG9wdGlvbnMuaW5wdXRGTnNbMF07XG4gICAgICAgICAgICBpZiAocGF0aC5pc0Fic29sdXRlKGluRk4pKSB7XG4gICAgICAgICAgICAgICAgdnBhdGhJbiA9IGluRk47XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGxldCBkaXIgPSBwYXRoLmRpcm5hbWUobWV0YWRhdGEuZG9jdW1lbnQucGF0aCk7XG4gICAgICAgICAgICAgICAgdnBhdGhJbiA9IHBhdGgubm9ybWFsaXplKFxuICAgICAgICAgICAgICAgICAgICBwYXRoLmpvaW4oJy8nLCBkaXIsIGluRk4pXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgZG9jdW1lbnRzID0gdGhpcy5jb25maWcuYWthc2hhLmZpbGVjYWNoZS5kb2N1bWVudHNDYWNoZTtcbiAgICAgICAgICAgIGNvbnN0IGFzc2V0cyA9IHRoaXMuY29uZmlnLmFrYXNoYS5maWxlY2FjaGUuYXNzZXRzQ2FjaGU7XG4gICAgICAgICAgICBjb25zdCBkb2MgPSBhd2FpdCBkb2N1bWVudHMuZmluZCh2cGF0aEluKTtcbiAgICAgICAgICAgIGxldCBhc3NldDtcblxuICAgICAgICAgICAgaWYgKCFkb2MpIGFzc2V0ID0gYXdhaXQgYXNzZXRzLmZpbmQodnBhdGhJbik7XG4gICBcbiAgICAgICAgICAgIGlmICghZG9jICYmICFhc3NldCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgUGxhbnRVTUxMb2NhbCBubyBwbGFudHVtbCBhc3NldCBvciBkb2N1bWVudCBmaWxlICBmb3VuZCBmb3IgJHt2cGF0aElufWApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZG9jKSBmc3BhdGhJbiA9IGRvYy5mc3BhdGg7XG4gICAgICAgICAgICBlbHNlIGlmIChhc3NldCkgZnNwYXRoSW4gPSBhc3NldC5mc3BhdGg7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJZiB0aGVyZSB3YXMgYW4gaW5wdXQgZmlsZSwgcmVjb3JkIGl0cyBmdWxsIHBhdGhuYW1lXG4gICAgICAgIC8vIGFzIHRoZSBpbnB1dEZOcyBlbnRyeVxuICAgICAgICBpZiAoZnNwYXRoSW4pIG9wdGlvbnMuaW5wdXRGTnMgPSBbIGZzcGF0aEluIF07XG5cbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLm91dHB1dEZOICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQbGFudFVNTExvY2FsIG5vIG91dHB1dCBmaWxlIG5hbWUgd2FzIHN1cHBsaWVkYCk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgdnBhdGhPdXQ7XG4gICAgICAgIGlmICghIHBhdGguaXNBYnNvbHV0ZShvcHRpb25zLm91dHB1dEZOKSkge1xuICAgICAgICAgICAgbGV0IGRpciA9IHBhdGguZGlybmFtZShtZXRhZGF0YS5kb2N1bWVudC5wYXRoKTtcbiAgICAgICAgICAgIHZwYXRoT3V0ID0gcGF0aC5ub3JtYWxpemUoXG4gICAgICAgICAgICAgICAgcGF0aC5qb2luKCcvJywgZGlyLCBvcHRpb25zLm91dHB1dEZOKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZwYXRoT3V0ID0gb3B0aW9ucy5vdXRwdXRGTjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENvbXB1dGUgZnNwYXRoIGZvciB2cGF0aE91dFxuICAgICAgICBjb25zdCBmc3BhdGhPdXQgPSBwYXRoLm5vcm1hbGl6ZShwYXRoLmpvaW4oXG4gICAgICAgICAgICB0aGlzLmFycmF5Lm9wdGlvbnMuY29uZmlnLnJlbmRlckRlc3RpbmF0aW9uLCB2cGF0aE91dFxuICAgICAgICApKTtcbiAgICAgICAgb3B0aW9ucy5vdXRwdXRGTiA9IGZzcGF0aE91dDtcblxuICAgICAgICBsZXQgd2lkdGggPSAkZWxlbWVudC5hdHRyKCd3aWR0aCcpO1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhgd2lkdGg9JHt3aWR0aH1gKTtcbiAgICAgICAgaWYgKHR5cGVvZiB3aWR0aCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHdpZHRoID0gTnVtYmVyLnBhcnNlRmxvYXQod2lkdGgpO1xuICAgICAgICAgICAgaWYgKGlzTmFOKHdpZHRoKSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgUGxhbnRVTUxMb2NhbDogd2lkdGggaXMgbm90IGEgbnVtYmVyICR7d2lkdGh9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAoPGFueT5vcHRpb25zKS53aWR0aCA9IHdpZHRoO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gY29uc29sZS5sb2cob3B0aW9ucyk7XG5cbiAgICAgICAgY29uc3QgaWQgPSAkZWxlbWVudC5hdHRyKCdpZCcpO1xuICAgICAgICBjb25zdCBjbGF6eiA9ICRlbGVtZW50LmF0dHIoJ2NsYXNzJyk7XG4gICAgICAgIGNvbnN0IGFsdCA9ICRlbGVtZW50LmF0dHIoJ2FsdCcpO1xuICAgICAgICBjb25zdCB0aXRsZSA9ICRlbGVtZW50LmF0dHIoJ3RpdGxlJyk7XG4gICAgICAgIGNvbnN0IGNhcHRpb24gPSAkZWxlbWVudC5hdHRyKCdjYXB0aW9uJyk7XG4gICAgICAgIGNvbnN0IGNzID0gJGVsZW1lbnQuYXR0cignY2hhcnNldCcpO1xuICAgICAgICBpZiAoaXNWYWxpZENoYXJzZXQoY3MpKSBvcHRpb25zLmNoYXJzZXQgPSBjcztcbiAgICAgICAgb3B0aW9ucy5kYXJrbW9kZSA9IHR5cGVvZiAkZWxlbWVudC5wcm9wKCdkYXJrbW9kZScpICE9PSAndW5kZWZpbmVkJztcbiAgICAgICAgLy8gb3B0aW9ucy5kZWJ1Z3N2ZWsgPSAkZWxlbWVudC5wcm9wKCdkZWJ1Z3N2ZWsnKTtcbiAgICAgICAgLy8gb3B0aW9ucy5maWxlTmFtZU92ZXJyaWRlID0gJGVsZW1lbnQuYXR0cignZmlsZW5hbWUnKTtcbiAgICAgICAgY29uc3QgbmJ0aHJlYWQgPSAkZWxlbWVudC5hdHRyKCduYnRocmVhZCcpO1xuICAgICAgICBpZiAodHlwZW9mIG5idGhyZWFkID09PSAnc3RyaW5nJykgb3B0aW9ucy5uYnRocmVhZCA9IG5idGhyZWFkO1xuICAgICAgICBvcHRpb25zLm5vbWV0YWRhdGEgPSB0eXBlb2YgJGVsZW1lbnQucHJvcCgnbm9tZXRhZGF0YScpICE9PSAndW5kZWZpbmVkJztcbiAgICAgICAgLy8gb3B0aW9ucy50ZXBzID0gJGVsZW1lbnQucHJvcCgndGVwcycpO1xuICAgICAgICAvLyBvcHRpb25zLnRodG1sID0gJGVsZW1lbnQucHJvcCgndGh0bWwnKTtcbiAgICAgICAgLy8gb3B0aW9ucy50bGF0ZXggPSAkZWxlbWVudC5wcm9wKCd0bGF0ZXgnKTtcbiAgICAgICAgLy8gb3B0aW9ucy50cGRmID0gJGVsZW1lbnQucHJvcCgndHBkZicpO1xuICAgICAgICBvcHRpb25zLnRwbmcgPSB0eXBlb2YgJGVsZW1lbnQucHJvcCgndHBuZycpICE9PSAndW5kZWZpbmVkJztcbiAgICAgICAgLy8gb3B0aW9ucy50c2N4bWwgPSAkZWxlbWVudC5wcm9wKCd0c2N4bWwnKTtcbiAgICAgICAgb3B0aW9ucy50c3ZnID0gdHlwZW9mICRlbGVtZW50LnByb3AoJ3RzdmcnKSAhPT0gJ3VuZGVmaW5lZCc7XG4gICAgICAgIC8vIG9wdGlvbnMudHR4dCA9ICRlbGVtZW50LnByb3AoJ3R0eHQnKTtcbiAgICAgICAgLy8gb3B0aW9ucy50dXR4dCA9ICRlbGVtZW50LnByb3AoJ3R1dHh0Jyk7XG4gICAgICAgIC8vIG9wdGlvbnMudHZkeCA9ICRlbGVtZW50LnByb3AoJ3R2ZHgnKTtcbiAgICAgICAgLy8gb3B0aW9ucy50eG1pID0gJGVsZW1lbnQucHJvcCgndHhtaScpO1xuICAgICAgICAvLyBvcHRpb25zLnZlcmJvc2UgPSAkZWxlbWVudC5wcm9wKCd2ZXJib3NlJyk7XG5cbiAgICAgICAgaWYgKG9wdGlvbnMudHBuZyAmJiBvcHRpb25zLnRzdmcpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgUGxhbnRVTUxMb2NhbCBjYW5ub3QgdXNlIGJvdGggdHBuZyBhbmQgdHN2Z2ApO1xuICAgICAgICB9XG4gICAgICAgIGlmICghb3B0aW9ucy50cG5nICYmICFvcHRpb25zLnRzdmcpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgUGxhbnRVTUxMb2NhbCBtdXN0IHVzZSBvbmUgb2YgdHBuZyBvciB0c3ZnYCk7XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgZG9QbGFudFVNTExvY2FsKG9wdGlvbnMpO1xuXG4gICAgICAgIGNvbnN0IGNhcCA9IHR5cGVvZiBjYXB0aW9uID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgPyBgPGZpZ2NhcHRpb24+JHtlbmNvZGUoY2FwdGlvbil9PC9maWdjYXB0aW9uPmBcbiAgICAgICAgICAgIDogJyc7XG4gICAgICAgIGNvbnN0IFRhbHQgPSB0eXBlb2YgYWx0ID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgPyBgYWx0PVwiJHtlbmNvZGUoYWx0KX1cImBcbiAgICAgICAgICAgIDogJyc7XG4gICAgICAgIGNvbnN0IFR0aXRsZSA9IHR5cGVvZiB0aXRsZSA9PT0gJ3N0cmluZydcbiAgICAgICAgICAgID8gYHRpdGxlPVwiJHtlbmNvZGUodGl0bGUpfVwiYFxuICAgICAgICAgICAgOiAnJztcbiAgICAgICAgY29uc3QgVGlkID0gdHlwZW9mIGlkID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgPyBgaWQ9XCIke2VuY29kZShpZCl9XCJgXG4gICAgICAgICAgICA6ICcnO1xuICAgICAgICBjb25zdCBUY2xhenogPSB0eXBlb2YgY2xhenogPT09ICdzdHJpbmcnXG4gICAgICAgICAgICA/IGBjbGFzcz1cIiR7ZW5jb2RlKGNsYXp6KX1cImBcbiAgICAgICAgICAgIDogJyc7XG4gICAgICAgIGNvbnN0IFR3aWR0aCA9IHR5cGVvZiB3aWR0aCA9PT0gJ251bWJlcidcbiAgICAgICAgICAgID8gYHdpZHRoPVwiJHt3aWR0aC50b1N0cmluZygpfVwiYFxuICAgICAgICAgICAgOiAnJztcblxuICAgICAgICBjb25zdCByZXQgPSBgXG4gICAgICAgIDxmaWd1cmUgJHtUaWR9ICR7VGNsYXp6fT5cbiAgICAgICAgPGltZyBzcmM9XCIke2VuY29kZSh2cGF0aE91dCl9XCIgJHtUYWx0fSAke1R0aXRsZX0gJHtUd2lkdGh9Lz5cbiAgICAgICAgJHtjYXB9XG4gICAgICAgIDwvZmlndXJlPlxuICAgICAgICBgO1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhyZXQpO1xuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzVmFsaWRDaGFyc2V0KGNoYXJzZXQpIHtcbiAgICBpZiAodHlwZW9mIGNoYXJzZXQgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgY29uc3QgY3MgPSBjaGFyc2V0LnRvTG93ZXJDYXNlKCk7XG5cbiAgICBpZiAodHlwZW9mIGNzICE9PSAnc3RyaW5nJ1xuICAgICAgICB8fCAoY3MgIT09ICd1dGY4JyAmJiBjcyAhPT0gJ3V0Zi04J1xuICAgICAgICAmJiBjcyAhPT0gJ3V0ZjE2JyAmJiBjcyAhPT0gJ3V0Zi0xNidcbiAgICAgICAgJiYgY3MgIT09ICd1dGYxNmJlJyAmJiBjcyAhPT0gJ3V0Zi0xNmJlJ1xuICAgICAgICAmJiBjcyAhPT0gJ3V0ZjE2bGUnICYmIGNzICE9PSAndXRmLTE2bGUnXG4gICAgICAgICYmIGNzICE9PSAndXRmMzInICYmIGNzICE9PSAndXRmLTMyJ1xuICAgICAgICAmJiBjcyAhPT0gJ3V0ZjMybGUnICYmIGNzICE9PSAndXRmLTMybGUnKVxuICAgICkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufVxuIl19