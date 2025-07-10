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
import { run as runMermaid } from "@mermaid-js/mermaid-cli";
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
        config.addMahabhuta(mahabhutaArray(options, config, this.akasha, this));
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
        // if (typeof fspathIn === 'string') {
        //     if (typeof code === 'string'
        //      && code.length >= 1
        //     ) {
        //         throw new Error(`diagrams-mermaid - either specify input-file OR a diagram body, not both`);
        //     }
        //     code = await fsp.readFile(fspathIn, 'utf-8');
        // }
        // console.log(`MermaidLocal ${inf} ${vpathIn} ${fspathIn} read code ${code}`);
        if (typeof outputFN !== 'string'
            || outputFN.length < 1) {
            throw new Error(`diagrams-mermaid must have output-file`);
        }
        if (!outputFN.endsWith('.svg') && !outputFN.endsWith('.png')) {
            throw new Error(`diagrams-mermaid must have output-file for .svg or .png extension`);
        }
        const fspathOut = path.join(this.config.renderDestination, outputFN);
        // console.log(`MermaidLocal runMermaid ${this.config.configDir} ${this.config.renderDestination} ${fspathIn} ${outputFN} ${fspathOut}`);
        await fsp.mkdir(path.dirname(fspathOut), {
            recursive: true
        });
        await runMermaid(fspathIn, fspathOut, {
            // Controls the debugging output from Mermaid CLI,
            // including:
            //      Generating single mermaid chart
            quiet: true
        });
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
            ? `id="${encode(id)}`
            : '';
        const Tclazz = typeof clazz === 'string'
            ? `class="${encode(clazz)}`
            : '';
        const Twidth = typeof width === 'number'
            ? `width="${width.toString()}"`
            : '';
        const ret = `
        <figure ${Tid} ${Tclazz}>
        <img src="${encode(outputFN)}" ${Talt} ${Ttitle} ${Twidth}/>
        ${cap}
        </figure>
        `;
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
            ? `id="${encode(id)}`
            : '';
        const Tclazz = typeof clazz === 'string'
            ? `class="${encode(clazz)}`
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9saWIvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBRUEsT0FBTyxJQUFJLE1BQU0sV0FBVyxDQUFDO0FBQzdCLE9BQU8sRUFBRSxFQUFFLEVBQUUsUUFBUSxJQUFJLEdBQUcsRUFBRSxNQUFNLFNBQVMsQ0FBQztBQUM5QyxPQUFPLElBQUksTUFBTSxXQUFXLENBQUM7QUFDN0IsT0FBTyxFQUF1QixLQUFLLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUNoRSxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQ3JDLE9BQU8sRUFBRSxNQUFNLEVBQWlCLE1BQU0sY0FBYyxDQUFBO0FBRXBELE9BQU8sRUFDSCx1QkFBdUIsRUFFMUIsTUFBTSxrQkFBa0IsQ0FBQztBQUUxQixNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQztBQUV0QywrQ0FBK0M7QUFDL0MsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FDYixTQUFTLEVBQ1QsSUFBSSxFQUNKLFFBQVEsRUFDUixVQUFVLEVBQ1YsMkJBQTJCLENBQUMsQ0FBQztBQUU3QyxNQUFNLFVBQVUsR0FBRyw2QkFBNkIsQ0FBQztBQUVqRCxPQUFPLEtBQUssTUFBTSxNQUFNLGNBQWMsQ0FBQztBQUN2QyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDckQsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQztBQUVuQyxPQUFPLEVBQUUsR0FBRyxJQUFJLFVBQVUsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBRTVELE1BQU0sT0FBTyxjQUFlLFNBQVEsTUFBTTtJQUl0QztRQUNJLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUh0Qix5Q0FBUTtJQUlSLENBQUM7SUFFRCxTQUFTLENBQUMsTUFBTSxFQUFFLE9BQU87UUFDckIs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LEtBQUssUUFBUTtlQUNqQyxFQUFFLEtBQUssU0FBUyxJQUFJLEVBQUUsS0FBSyxVQUFVO2VBQ3JDLEVBQUUsS0FBSyxTQUFTLElBQUksRUFBRSxLQUFLLFVBQVU7ZUFDckMsRUFBRSxLQUFLLE9BQU8sSUFBSSxFQUFFLEtBQUssUUFBUTtlQUNqQyxFQUFFLEtBQUssU0FBUyxJQUFJLEVBQUUsS0FBSyxVQUFVLENBQUMsRUFDM0MsQ0FBQztRQUNDLE9BQU8sS0FBSyxDQUFDO0lBQ2pCLENBQUM7SUFDRCxPQUFPLElBQUksQ0FBQztBQUNoQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiXG5cbmltcG9ydCBwYXRoIGZyb20gJ25vZGU6cGF0aCc7XG5pbXBvcnQgZnMsIHsgcHJvbWlzZXMgYXMgZnNwIH0gZnJvbSAnbm9kZTpmcyc7XG5pbXBvcnQgdXRpbCBmcm9tICdub2RlOnV0aWwnO1xuaW1wb3J0IHsgZXhlY1N5bmMsIHNwYXduU3luYywgc3Bhd24gfSBmcm9tICdub2RlOmNoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHtlbmNvZGV9IGZyb20gJ2h0bWwtZW50aXRpZXMnO1xuaW1wb3J0IHsgcmVuZGVyLCBQaW50b3JhQ29uZmlnIH0gZnJvbSAnQHBpbnRvcmEvY2xpJ1xuXG5leHBvcnQge1xuICAgIE1hcmtkb3duSVRNZXJtYWlkUGx1Z2luLFxuICAgIE1lcm1haWRQbHVnaW5PcHRpb25zXG59IGZyb20gJy4vbWFya2Rvd24taXQuanMnO1xuXG5jb25zdCBfX2Rpcm5hbWUgPSBpbXBvcnQubWV0YS5kaXJuYW1lO1xuXG4vLyBQYXRoIG5hbWUgZm9yIHRoZSBsb2NhbCBjb3B5IG9mIHBsYW50dW1sLmphclxuY29uc3QgcGxhbnR1bWxKYXIgPSBwYXRoLmpvaW4oXG4gICAgICAgICAgICAgICAgX19kaXJuYW1lLFxuICAgICAgICAgICAgICAgICcuLicsXG4gICAgICAgICAgICAgICAgJ3ZlbmRvcicsXG4gICAgICAgICAgICAgICAgJ3BsYW50dW1sJyxcbiAgICAgICAgICAgICAgICAncGxhbnR1bWwtbWl0LTEuMjAyNS4wLmphcicpO1xuXG5jb25zdCBwbHVnaW5OYW1lID0gJ0Bha2FzaGFjbXMvcGx1Z2lucy1kaWFncmFtcyc7XG5cbmltcG9ydCAqIGFzIGFrYXNoYSBmcm9tICdha2FzaGFyZW5kZXInO1xuaW1wb3J0IHsgUGx1Z2luIH0gZnJvbSAnYWthc2hhcmVuZGVyL2Rpc3QvUGx1Z2luLmpzJztcbmNvbnN0IG1haGFiaHV0YSA9IGFrYXNoYS5tYWhhYmh1dGE7XG5cbmltcG9ydCB7IHJ1biBhcyBydW5NZXJtYWlkIH0gZnJvbSBcIkBtZXJtYWlkLWpzL21lcm1haWQtY2xpXCI7XG5cbmV4cG9ydCBjbGFzcyBEaWFncmFtc1BsdWdpbiBleHRlbmRzIFBsdWdpbiB7XG5cbiAgICAjY29uZmlnO1xuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKHBsdWdpbk5hbWUpO1xuICAgIH1cblxuICAgIGNvbmZpZ3VyZShjb25maWcsIG9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy4jY29uZmlnID0gY29uZmlnO1xuICAgICAgICAvLyB0aGlzLmNvbmZpZyA9IGNvbmZpZztcbiAgICAgICAgdGhpcy5ha2FzaGEgPSBjb25maWcuYWthc2hhO1xuICAgICAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zID8gb3B0aW9ucyA6IHt9O1xuICAgICAgICB0aGlzLm9wdGlvbnMuY29uZmlnID0gY29uZmlnO1xuICAgICAgICBjb25maWcuYWRkTWFoYWJodXRhKG1haGFiaHV0YUFycmF5KG9wdGlvbnMsIGNvbmZpZywgdGhpcy5ha2FzaGEsIHRoaXMpKTtcbiAgICB9XG5cbiAgICBnZXQgY29uZmlnKCkgeyByZXR1cm4gdGhpcy4jY29uZmlnOyB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtYWhhYmh1dGFBcnJheShcbiAgICBvcHRpb25zLFxuICAgIGNvbmZpZz86IGFrYXNoYS5Db25maWd1cmF0aW9uLFxuICAgIGFrYXNoYT86IGFueSxcbiAgICBwbHVnaW4/OiBQbHVnaW5cbikge1xuICAgIGxldCByZXQgPSBuZXcgbWFoYWJodXRhLk1haGFmdW5jQXJyYXkocGx1Z2luTmFtZSwgb3B0aW9ucyk7XG4gICAgcmV0LmFkZE1haGFmdW5jKG5ldyBNZXJtYWlkTG9jYWwoY29uZmlnLCBha2FzaGEsIHBsdWdpbikpO1xuICAgIHJldC5hZGRNYWhhZnVuYyhuZXcgUGxhbnRVTUxMb2NhbChjb25maWcsIGFrYXNoYSwgcGx1Z2luKSk7XG4gICAgcmV0LmFkZE1haGFmdW5jKG5ldyBQaW50b3JhTG9jYWwoY29uZmlnLCBha2FzaGEsIHBsdWdpbikpO1xuICAgIHJldHVybiByZXQ7XG59O1xuXG5jbGFzcyBNZXJtYWlkTG9jYWwgZXh0ZW5kcyBha2FzaGEuQ3VzdG9tRWxlbWVudCB7XG5cdGdldCBlbGVtZW50TmFtZSgpIHsgcmV0dXJuIFwiZGlhZ3JhbXMtbWVybWFpZFwiOyB9XG5cbiAgICBhc3luYyBwcm9jZXNzKCRlbGVtZW50LCBtZXRhZGF0YSwgZGlydHk6IEZ1bmN0aW9uKSB7XG5cbiAgICAgICAgbGV0IGNvZGUgPSAkZWxlbWVudC50ZXh0KCk7XG4gICAgICAgIGNvbnN0IG91dHB1dEZOID0gJGVsZW1lbnQuYXR0cignb3V0cHV0LWZpbGUnKTtcbiAgICAgICAgY29uc3QgaW5mID0gICRlbGVtZW50LmF0dHIoJ2lucHV0LWZpbGUnKTtcblxuICAgICAgICAvLyBjb25zb2xlLmxvZyhgTWVybWFpZExvY2FsICR7aW5mfSA9PT4gJHtvdXRwdXRGTn1gKTtcblxuICAgICAgICBsZXQgdnBhdGhJbjtcbiAgICAgICAgbGV0IGZzcGF0aEluO1xuICAgICAgICBpZiAodHlwZW9mIGluZiA9PT0gJ3N0cmluZydcbiAgICAgICAgICYmIGluZi5sZW5ndGggPj0gMVxuICAgICAgICApIHtcbiAgICAgICAgICAgIGlmIChwYXRoLmlzQWJzb2x1dGUoaW5mKSkge1xuICAgICAgICAgICAgICAgIHZwYXRoSW4gPSBpbmY7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGxldCBkaXIgPSBwYXRoLmRpcm5hbWUobWV0YWRhdGEuZG9jdW1lbnQucGF0aCk7XG4gICAgICAgICAgICAgICAgdnBhdGhJbiA9IHBhdGgubm9ybWFsaXplKFxuICAgICAgICAgICAgICAgICAgICBwYXRoLmpvaW4oJy8nLCBkaXIsIGluZilcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGRvY3VtZW50cyA9IHRoaXMuY29uZmlnLmFrYXNoYS5maWxlY2FjaGUuZG9jdW1lbnRzQ2FjaGU7XG4gICAgICAgIGNvbnN0IGFzc2V0cyA9IHRoaXMuYWthc2hhLmZpbGVjYWNoZS5hc3NldHNDYWNoZTtcblxuICAgICAgICAvLyBjb25zb2xlLmxvZyhgTWVybWFpZExvY2FsICR7aW5mfSAke3ZwYXRoSW59YCk7XG5cbiAgICAgICAgY29uc3QgZG9jID0gdnBhdGhJblxuICAgICAgICAgICAgPyBhd2FpdCBkb2N1bWVudHMuZmluZCh2cGF0aEluKVxuICAgICAgICAgICAgOiB1bmRlZmluZWQ7XG5cbiAgICAgICAgbGV0IGFzc2V0O1xuICAgICAgICBpZiAoIWRvYykgYXNzZXQgPSB2cGF0aEluXG4gICAgICAgICAgICA/IGF3YWl0IGFzc2V0cy5maW5kKHZwYXRoSW4pXG4gICAgICAgICAgICA6IHVuZGVmaW5lZDtcbiAgIFxuICAgICAgICBpZiAoZG9jKSBmc3BhdGhJbiA9IGRvYy5mc3BhdGg7XG4gICAgICAgIGVsc2UgaWYgKGFzc2V0KSBmc3BhdGhJbiA9IGFzc2V0LmZzcGF0aDtcblxuICAgICAgICAvLyBjb25zb2xlLmxvZyhgTWVybWFpZExvY2FsICR7aW5mfSAke3ZwYXRoSW59ICR7ZnNwYXRoSW59YCk7XG5cbiAgICAgICAgLy8gaWYgKHR5cGVvZiBmc3BhdGhJbiA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgLy8gICAgIGlmICh0eXBlb2YgY29kZSA9PT0gJ3N0cmluZydcbiAgICAgICAgLy8gICAgICAmJiBjb2RlLmxlbmd0aCA+PSAxXG4gICAgICAgIC8vICAgICApIHtcbiAgICAgICAgLy8gICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGRpYWdyYW1zLW1lcm1haWQgLSBlaXRoZXIgc3BlY2lmeSBpbnB1dC1maWxlIE9SIGEgZGlhZ3JhbSBib2R5LCBub3QgYm90aGApO1xuICAgICAgICAvLyAgICAgfVxuICAgICAgICAvLyAgICAgY29kZSA9IGF3YWl0IGZzcC5yZWFkRmlsZShmc3BhdGhJbiwgJ3V0Zi04Jyk7XG4gICAgICAgIC8vIH1cblxuICAgICAgICAvLyBjb25zb2xlLmxvZyhgTWVybWFpZExvY2FsICR7aW5mfSAke3ZwYXRoSW59ICR7ZnNwYXRoSW59IHJlYWQgY29kZSAke2NvZGV9YCk7XG5cbiAgICAgICAgaWYgKHR5cGVvZiBvdXRwdXRGTiAhPT0gJ3N0cmluZydcbiAgICAgICAgIHx8IG91dHB1dEZOLmxlbmd0aCA8IDFcbiAgICAgICAgKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGRpYWdyYW1zLW1lcm1haWQgbXVzdCBoYXZlIG91dHB1dC1maWxlYCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIW91dHB1dEZOLmVuZHNXaXRoKCcuc3ZnJykgJiYgIW91dHB1dEZOLmVuZHNXaXRoKCcucG5nJykpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgZGlhZ3JhbXMtbWVybWFpZCBtdXN0IGhhdmUgb3V0cHV0LWZpbGUgZm9yIC5zdmcgb3IgLnBuZyBleHRlbnNpb25gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGZzcGF0aE91dCA9IHBhdGguam9pbihcbiAgICAgICAgICAgIHRoaXMuY29uZmlnLnJlbmRlckRlc3RpbmF0aW9uLCBvdXRwdXRGTlxuICAgICAgICApO1xuXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGBNZXJtYWlkTG9jYWwgcnVuTWVybWFpZCAke3RoaXMuY29uZmlnLmNvbmZpZ0Rpcn0gJHt0aGlzLmNvbmZpZy5yZW5kZXJEZXN0aW5hdGlvbn0gJHtmc3BhdGhJbn0gJHtvdXRwdXRGTn0gJHtmc3BhdGhPdXR9YCk7XG5cbiAgICAgICAgYXdhaXQgZnNwLm1rZGlyKHBhdGguZGlybmFtZShmc3BhdGhPdXQpLCB7XG4gICAgICAgICAgICByZWN1cnNpdmU6IHRydWVcbiAgICAgICAgfSk7XG5cbiAgICAgICAgYXdhaXQgcnVuTWVybWFpZChmc3BhdGhJbixcbiAgICAgICAgICAgIGZzcGF0aE91dCBhcyBgJHtzdHJpbmd9LnBuZ2AgfCBgJHtzdHJpbmd9LnN2Z2AsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgLy8gQ29udHJvbHMgdGhlIGRlYnVnZ2luZyBvdXRwdXQgZnJvbSBNZXJtYWlkIENMSSxcbiAgICAgICAgICAgICAgICAvLyBpbmNsdWRpbmc6XG4gICAgICAgICAgICAgICAgLy8gICAgICBHZW5lcmF0aW5nIHNpbmdsZSBtZXJtYWlkIGNoYXJ0XG4gICAgICAgICAgICAgICAgcXVpZXQ6IHRydWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcblxuICAgICAgICBsZXQgd2lkdGggPSAkZWxlbWVudC5hdHRyKCd3aWR0aCcpO1xuICAgICAgICBpZiAodHlwZW9mIHdpZHRoID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgd2lkdGggPSBOdW1iZXIucGFyc2VGbG9hdCh3aWR0aCk7XG4gICAgICAgICAgICBpZiAoaXNOYU4od2lkdGgpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBkaWFncmFtcy1tZXJtYWlkOiB3aWR0aCBpcyBub3QgYSBudW1iZXIgJHt3aWR0aH1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGlkID0gJGVsZW1lbnQuYXR0cignaWQnKTtcbiAgICAgICAgY29uc3QgY2xhenogPSAkZWxlbWVudC5hdHRyKCdjbGFzcycpO1xuICAgICAgICBjb25zdCBhbHQgPSAkZWxlbWVudC5hdHRyKCdhbHQnKTtcbiAgICAgICAgY29uc3QgdGl0bGUgPSAkZWxlbWVudC5hdHRyKCd0aXRsZScpO1xuICAgICAgICBjb25zdCBjYXB0aW9uID0gJGVsZW1lbnQuYXR0cignY2FwdGlvbicpO1xuXG4gICAgICAgIGNvbnN0IGNhcCA9IHR5cGVvZiBjYXB0aW9uID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgPyBgPGZpZ2NhcHRpb24+JHtlbmNvZGUoY2FwdGlvbil9PC9maWdjYXB0aW9uPmBcbiAgICAgICAgICAgIDogJyc7XG4gICAgICAgIGNvbnN0IFRhbHQgPSB0eXBlb2YgYWx0ID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgPyBgYWx0PVwiJHtlbmNvZGUoYWx0KX1cImBcbiAgICAgICAgICAgIDogJyc7XG4gICAgICAgIGNvbnN0IFR0aXRsZSA9IHR5cGVvZiB0aXRsZSA9PT0gJ3N0cmluZydcbiAgICAgICAgICAgID8gYHRpdGxlPVwiJHtlbmNvZGUodGl0bGUpfVwiYFxuICAgICAgICAgICAgOiAnJztcbiAgICAgICAgY29uc3QgVGlkID0gdHlwZW9mIGlkID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgPyBgaWQ9XCIke2VuY29kZShpZCl9YFxuICAgICAgICAgICAgOiAnJztcbiAgICAgICAgY29uc3QgVGNsYXp6ID0gdHlwZW9mIGNsYXp6ID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgPyBgY2xhc3M9XCIke2VuY29kZShjbGF6eil9YFxuICAgICAgICAgICAgOiAnJztcbiAgICAgICAgY29uc3QgVHdpZHRoID0gdHlwZW9mIHdpZHRoID09PSAnbnVtYmVyJ1xuICAgICAgICAgICAgPyBgd2lkdGg9XCIke3dpZHRoLnRvU3RyaW5nKCl9XCJgXG4gICAgICAgICAgICA6ICcnO1xuXG4gICAgICAgIGNvbnN0IHJldCA9IGBcbiAgICAgICAgPGZpZ3VyZSAke1RpZH0gJHtUY2xhenp9PlxuICAgICAgICA8aW1nIHNyYz1cIiR7ZW5jb2RlKG91dHB1dEZOKX1cIiAke1RhbHR9ICR7VHRpdGxlfSAke1R3aWR0aH0vPlxuICAgICAgICAke2NhcH1cbiAgICAgICAgPC9maWd1cmU+XG4gICAgICAgIGA7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGBNZXJtYWlkTG9jYWwgcmV0dXJuaW5nICR7cmV0fWApO1xuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH1cbn1cblxuZXhwb3J0IHR5cGUgUGludG9yYVJlbmRlck9wdGlvbnMgPSB7XG4gICAgLyoqXG4gICAgICogcGludG9yYSBEU0wgY29kZSB0byByZW5kZXJcbiAgICAgKi9cbiAgICBjb2RlOiBzdHJpbmdcbiAgICBkZXZpY2VQaXhlbFJhdGlvPzogbnVtYmVyIHwgbnVsbFxuICAgIC8qKlxuICAgICAqIFR5cGUgZm9yIHRoZSBvdXRwdXQgZmlsZVxuICAgICAqIFxuICAgIC8vIGltYWdlL3N2Zyt4bWxcbiAgICAvLyBpbWFnZS9qcGVnXG4gICAgLy8gaW1hZ2UvcG5nXG4gICAgICovXG4gICAgbWltZVR5cGU/OiBzdHJpbmdcbiAgICAvKipcbiAgICAgKiBBc3NpZ24gZXh0cmEgYmFja2dyb3VuZCBjb2xvclxuICAgICAqL1xuICAgIGJhY2tncm91bmRDb2xvcj86IHN0cmluZ1xuICAgIHBpbnRvcmFDb25maWc/OiBQYXJ0aWFsPFBpbnRvcmFDb25maWc+XG4gICAgLyoqXG4gICAgICogd2lkdGggb2YgdGhlIG91dHB1dCwgaGVpZ2h0IHdpbGwgYmUgY2FsY3VsYXRlZCBhY2NvcmRpbmcgdG8gdGhlIGRpYWdyYW0gY29udGVudCByYXRpb1xuICAgICAqL1xuICAgIHdpZHRoPzogbnVtYmVyXG4gICAgLyoqXG4gICAgICogV2hldGhlciB3ZSBzaG91bGQgcnVuIHJlbmRlciBpbiBhIHN1YnByb2Nlc3MgcmF0aGVyIGluIGN1cnJlbnQgcHJvY2Vzcy5cbiAgICAgKiBJZiB5b3UgY2FsbCB0aGUgYHJlbmRlcmAgZnVuY3Rpb24sIGJ5IGRlZmF1bHQgdGhpcyBpcyB0cnVlLCB0byBhdm9pZCBwb2xsdXRpbmcgdGhlIGdsb2JhbCBlbnZpcm9ubWVudC5cbiAgICAgKi9cbiAgICByZW5kZXJJblN1YnByb2Nlc3M/OiBib29sZWFuXG5cbiAgICBvdXRwdXRGTjogc3RyaW5nO1xufTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRvUGludG9yYShcbiAgICBvcHRpb25zOiBQaW50b3JhUmVuZGVyT3B0aW9uc1xuKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgcmVuZGVyT3B0cyA9IHN0cnVjdHVyZWRDbG9uZShvcHRpb25zKTtcbiAgICBkZWxldGUgcmVuZGVyT3B0cy5vdXRwdXRGTjtcblxuICAgIGNvbnN0IGJ1ZiA9IGF3YWl0IHJlbmRlcihyZW5kZXJPcHRzKTtcblxuICAgIGlmIChvcHRpb25zLm91dHB1dEZOKSB7XG4gICAgICAgIGF3YWl0IGZzcC53cml0ZUZpbGUob3B0aW9ucy5vdXRwdXRGTiwgYnVmKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIG91dHB1dCBmaWxlIEZOICR7dXRpbC5pbnNwZWN0KG9wdGlvbnMpfWApO1xuICAgIH1cbn1cblxuY2xhc3MgUGludG9yYUxvY2FsIGV4dGVuZHMgYWthc2hhLkN1c3RvbUVsZW1lbnQge1xuXHRnZXQgZWxlbWVudE5hbWUoKSB7IHJldHVybiBcImRpYWdyYW1zLXBpbnRvcmFcIjsgfVxuXG4gICAgYXN5bmMgcHJvY2VzcygkZWxlbWVudCwgbWV0YWRhdGEsIGRpcnR5OiBGdW5jdGlvbikge1xuICAgICAgICBjb25zdCBvcHRpb25zOiBQaW50b3JhUmVuZGVyT3B0aW9ucyA9IHtcbiAgICAgICAgICAgIGNvZGU6ICRlbGVtZW50LnRleHQoKSxcbiAgICAgICAgICAgIG91dHB1dEZOOiAkZWxlbWVudC5hdHRyKCdvdXRwdXQtZmlsZScpXG4gICAgICAgIH07XG5cbiAgICAgICAgbGV0IHZwYXRoSW47XG4gICAgICAgIGxldCBmc3BhdGhJbjtcbiAgICAgICAgY29uc3QgaW5mID0gICRlbGVtZW50LmF0dHIoJ2lucHV0LWZpbGUnKTtcbiAgICAgICAgaWYgKHR5cGVvZiBpbmYgPT09ICdzdHJpbmcnXG4gICAgICAgICAmJiBpbmYubGVuZ3RoID49IDFcbiAgICAgICAgKSB7XG4gICAgICAgICAgICBpZiAocGF0aC5pc0Fic29sdXRlKGluZikpIHtcbiAgICAgICAgICAgICAgICB2cGF0aEluID0gaW5mO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBsZXQgZGlyID0gcGF0aC5kaXJuYW1lKG1ldGFkYXRhLmRvY3VtZW50LnBhdGgpO1xuICAgICAgICAgICAgICAgIHZwYXRoSW4gPSBwYXRoLm5vcm1hbGl6ZShcbiAgICAgICAgICAgICAgICAgICAgcGF0aC5qb2luKCcvJywgZGlyLCBpbmYpXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGBQaW50b3JhTG9jYWwgaW5wdXQtZmlsZSAke3V0aWwuaW5zcGVjdChpbmYpfSB2cGF0aEluICR7dXRpbC5pbnNwZWN0KHZwYXRoSW4pfWApO1xuXG4gICAgICAgIGNvbnN0IGRvY3VtZW50cyA9IHRoaXMuY29uZmlnLmFrYXNoYS5maWxlY2FjaGUuZG9jdW1lbnRzQ2FjaGU7XG4gICAgICAgIGNvbnN0IGFzc2V0cyA9IHRoaXMuYWthc2hhLmZpbGVjYWNoZS5hc3NldHNDYWNoZTtcbiAgICAgICAgY29uc3QgZG9jID0gdnBhdGhJblxuICAgICAgICAgICAgPyBhd2FpdCBkb2N1bWVudHMuZmluZCh2cGF0aEluKVxuICAgICAgICAgICAgOiB1bmRlZmluZWQ7XG4gICAgICAgIGxldCBhc3NldDtcblxuICAgICAgICBpZiAoIWRvYykgYXNzZXQgPSB2cGF0aEluXG4gICAgICAgICAgICA/IGF3YWl0IGFzc2V0cy5maW5kKHZwYXRoSW4pXG4gICAgICAgICAgICA6IHVuZGVmaW5lZDtcbiAgIFxuICAgICAgICBpZiAoZG9jKSBmc3BhdGhJbiA9IGRvYy5mc3BhdGg7XG4gICAgICAgIGVsc2UgaWYgKGFzc2V0KSBmc3BhdGhJbiA9IGFzc2V0LmZzcGF0aDtcblxuICAgICAgICBpZiAodHlwZW9mIGZzcGF0aEluID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLmNvZGUgPT09ICdzdHJpbmcnXG4gICAgICAgICAgICAgJiYgb3B0aW9ucy5jb2RlLmxlbmd0aCA+PSAxXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGRpYWdyYW1zLXBpbnRvcmEgLSBlaXRoZXIgc3BlY2lmeSBpbnB1dC1maWxlIE9SIGEgZGlhZ3JhbSBib2R5LCBub3QgYm90aGApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3B0aW9ucy5jb2RlID0gYXdhaXQgZnNwLnJlYWRGaWxlKGZzcGF0aEluLCAndXRmLTgnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5vdXRwdXRGTiAhPT0gJ3N0cmluZydcbiAgICAgICAgIHx8IG9wdGlvbnMub3V0cHV0Rk4ubGVuZ3RoIDwgMVxuICAgICAgICApIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgZGlhZ3JhbXMtcGludG9yYSBtdXN0IGhhdmUgb3V0cHV0LWZpbGVgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHB4ciA9ICRlbGVtZW50LmF0dHIoJ3BpeGVsLXJhdGlvJyk7XG4gICAgICAgIGlmICh0eXBlb2YgcHhyID09PSAnc3RyaW5nJ1xuICAgICAgICAgJiYgcHhyLmxlbmd0aCA+PSAxXG4gICAgICAgICkge1xuICAgICAgICAgICAgY29uc3QgciA9IE51bWJlci5wYXJzZUZsb2F0KHB4cik7XG4gICAgICAgICAgICBpZiAoaXNOYU4ocikpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGRpYWdyYW1zLXBpbnRvcmE6IHBpeGVsLXJhdGlvIGlzIG5vdCBhIG51bWJlciAke3B4cn1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG9wdGlvbnMuZGV2aWNlUGl4ZWxSYXRpbyA9IHI7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBtaW1lID0gJGVsZW1lbnQuYXR0cignbWltZS10eXBlJyk7XG4gICAgICAgIGlmICh0eXBlb2YgbWltZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgICBtaW1lID09PSAnaW1hZ2Uvc3ZnK3htbCdcbiAgICAgICAgICAgICB8fCBtaW1lID09PSAnaW1hZ2UvanBlZydcbiAgICAgICAgICAgICB8fCBtaW1lID09PSAnaW1hZ2UvcG5nJ1xuICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9ucy5taW1lVHlwZSA9IG1pbWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBNSU1FIHR5cGUgJHt1dGlsLmluc3BlY3QobWltZSl9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBiZ0NvbG9yID0gJGVsZW1lbnQuYXR0cignYmctY29sb3InKTtcbiAgICAgICAgaWYgKHR5cGVvZiBiZ0NvbG9yID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgb3B0aW9ucy5iYWNrZ3JvdW5kQ29sb3IgPSBiZ0NvbG9yO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgd2lkdGggPSAkZWxlbWVudC5hdHRyKCd3aWR0aCcpO1xuICAgICAgICBpZiAodHlwZW9mIHdpZHRoID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgb3B0aW9ucy53aWR0aCA9IE51bWJlci5wYXJzZUZsb2F0KHdpZHRoKTtcbiAgICAgICAgICAgIGlmIChpc05hTihvcHRpb25zLndpZHRoKSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgZGlhZ3JhbXMtcGludG9yYTogd2lkdGggaXMgbm90IGEgbnVtYmVyICR7d2lkdGh9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBvcHRpb25zLnJlbmRlckluU3VicHJvY2VzcyA9IGZhbHNlO1xuXG4gICAgICAgIGNvbnN0IGJ1ZiA9IGF3YWl0IHJlbmRlcihvcHRpb25zKTtcblxuICAgICAgICBjb25zdCBpZCA9ICRlbGVtZW50LmF0dHIoJ2lkJyk7XG4gICAgICAgIGNvbnN0IGNsYXp6ID0gJGVsZW1lbnQuYXR0cignY2xhc3MnKTtcbiAgICAgICAgY29uc3QgYWx0ID0gJGVsZW1lbnQuYXR0cignYWx0Jyk7XG4gICAgICAgIGNvbnN0IHRpdGxlID0gJGVsZW1lbnQuYXR0cigndGl0bGUnKTtcbiAgICAgICAgY29uc3QgY2FwdGlvbiA9ICRlbGVtZW50LmF0dHIoJ2NhcHRpb24nKTtcblxuICAgICAgICBjb25zdCBjYXAgPSB0eXBlb2YgY2FwdGlvbiA9PT0gJ3N0cmluZydcbiAgICAgICAgICAgID8gYDxmaWdjYXB0aW9uPiR7ZW5jb2RlKGNhcHRpb24pfTwvZmlnY2FwdGlvbj5gXG4gICAgICAgICAgICA6ICcnO1xuICAgICAgICBjb25zdCBUYWx0ID0gdHlwZW9mIGFsdCA9PT0gJ3N0cmluZydcbiAgICAgICAgICAgID8gYGFsdD1cIiR7ZW5jb2RlKGFsdCl9XCJgXG4gICAgICAgICAgICA6ICcnO1xuICAgICAgICBjb25zdCBUdGl0bGUgPSB0eXBlb2YgdGl0bGUgPT09ICdzdHJpbmcnXG4gICAgICAgICAgICA/IGB0aXRsZT1cIiR7ZW5jb2RlKHRpdGxlKX1cImBcbiAgICAgICAgICAgIDogJyc7XG4gICAgICAgIGNvbnN0IFRpZCA9IHR5cGVvZiBpZCA9PT0gJ3N0cmluZydcbiAgICAgICAgICAgID8gYGlkPVwiJHtlbmNvZGUoaWQpfWBcbiAgICAgICAgICAgIDogJyc7XG4gICAgICAgIGNvbnN0IFRjbGF6eiA9IHR5cGVvZiBjbGF6eiA9PT0gJ3N0cmluZydcbiAgICAgICAgICAgID8gYGNsYXNzPVwiJHtlbmNvZGUoY2xhenopfWBcbiAgICAgICAgICAgIDogJyc7XG4gICAgICAgIGNvbnN0IFR3aWR0aCA9IHR5cGVvZiBvcHRpb25zLndpZHRoID09PSAnbnVtYmVyJ1xuICAgICAgICAgICAgPyBgd2lkdGg9XCIke29wdGlvbnMud2lkdGgudG9TdHJpbmcoKX1cImBcbiAgICAgICAgICAgIDogJyc7XG5cbiAgICAgICAgLy8gb3B0aW9ucy5vdXRwdXRGTiB3YXMgc2V0IGZyb20gb3V0cHV0LWZpbGVcbiAgICAgICAgLy8gVGhpcyBjcmVhdGVzIHZwYXRoT3V0IGZyb20gdGhhdCB2YWx1ZVxuICAgICAgICAvLyBUaGlzIGNvbXB1dHMgZnNwYXRoT3V0LCB3aGljaCBpcyB0aGVuXG4gICAgICAgIC8vIGFzc2lnbmVkIGJhY2sgaW50byBvcHRpb25zLm91dHB1dEZOXG5cbiAgICAgICAgbGV0IHZwYXRoT3V0O1xuICAgICAgICBpZiAoISBwYXRoLmlzQWJzb2x1dGUob3B0aW9ucy5vdXRwdXRGTikpIHtcbiAgICAgICAgICAgIGxldCBkaXIgPSBwYXRoLmRpcm5hbWUobWV0YWRhdGEuZG9jdW1lbnQucGF0aCk7XG4gICAgICAgICAgICB2cGF0aE91dCA9IHBhdGgubm9ybWFsaXplKFxuICAgICAgICAgICAgICAgIHBhdGguam9pbignLycsIGRpciwgb3B0aW9ucy5vdXRwdXRGTilcbiAgICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2cGF0aE91dCA9IG9wdGlvbnMub3V0cHV0Rk47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDb21wdXRlIGZzcGF0aCBmb3IgdnBhdGhPdXRcbiAgICAgICAgY29uc3QgZnNwYXRoT3V0ID0gcGF0aC5ub3JtYWxpemUocGF0aC5qb2luKFxuICAgICAgICAgICAgdGhpcy5jb25maWcucmVuZGVyRGVzdGluYXRpb24sIHZwYXRoT3V0XG4gICAgICAgICkpO1xuICAgICAgICBvcHRpb25zLm91dHB1dEZOID0gZnNwYXRoT3V0O1xuXG4gICAgICAgIGlmIChvcHRpb25zLm91dHB1dEZOKSB7XG4gICAgICAgICAgICBhd2FpdCBmc3Aud3JpdGVGaWxlKG9wdGlvbnMub3V0cHV0Rk4sIGJ1Zik7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmV0ID0gYFxuICAgICAgICA8ZmlndXJlICR7VGlkfSAke1RjbGF6en0+XG4gICAgICAgIDxpbWcgc3JjPVwiJHtlbmNvZGUodnBhdGhPdXQpfVwiICR7VGFsdH0gJHtUdGl0bGV9ICR7VHdpZHRofS8+XG4gICAgICAgICR7Y2FwfVxuICAgICAgICA8L2ZpZ3VyZT5cbiAgICAgICAgYDtcbiAgICAgICAgLy8gY29uc29sZS5sb2cocmV0KTtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG59XG5cbi8qKlxuICogT3B0aW9ucyBvYmplY3QgdGhhdCBpcyBjb252ZXJ0ZWQgaW50byBwbGFudHVtbC5qYXIgb3B0aW9ucy5cbiAqL1xuZXhwb3J0IHR5cGUgZG9QbGFudFVNTE9wdGlvbnMgPSB7XG4gICAgLyoqXG4gICAgICogVGhlIFBsYW50VU1MIGRpYWdyYW0gdGV4dCB0byB1c2VcbiAgICAgKi9cbiAgICBpbnB1dEJvZHk/OiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBaZXJvIG9yIG1vcmUgZmlsZSBuYW1lcyBmb3IgZmlsZXMgdG8gcmVuZGVyXG4gICAgICovXG4gICAgaW5wdXRGTnM/OiBzdHJpbmdbXTtcblxuICAgIC8qKlxuICAgICAqIFBvc3NpYmxlIGZpbGUgdG8gd3JpdGUgb3V0cHV0IGludG9cbiAgICAgKi9cbiAgICBvdXRwdXRGTj86IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIFRvIHVzZSBhIHNwZWNpZmljIGNoYXJhY3RlciBzZXQuIERlZmF1bHQ6IFVURi04XG4gICAgICovXG4gICAgY2hhcnNldD86IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIFRvIHVzZSBkYXJrIG1vZGUgZm9yIGRpYWdyYW1zXG4gICAgICovXG4gICAgZGFya21vZGU/OiBib29sZWFuO1xuXG4gICAgLyoqXG4gICAgICogVG8gZ2VuZXJhdGUgaW50ZXJtZWRpYXRlIHN2ZWsgZmlsZXNcbiAgICAgKi9cbiAgICBkZWJ1Z3N2ZWs/OiBib29sZWFuO1xuXG4gICAgLyoqXG4gICAgICogXCJleGFtcGxlLnB1bWxcIiBUbyBvdmVycmlkZSAlZmlsZW5hbWUlIHZhcmlhYmxlXG4gICAgICovXG4gICAgZmlsZU5hbWVPdmVycmlkZT86IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIFRvIHVzZSAoTikgdGhyZWFkcyBmb3IgcHJvY2Vzc2luZy4gIFVzZSBcImF1dG9cIiBmb3IgNCB0aHJlYWRzLlxuICAgICAqL1xuICAgIG5idGhyZWFkPzogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogVG8gTk9UIGV4cG9ydCBtZXRhZGF0YSBpbiBQTkcvU1ZHIGdlbmVyYXRlZCBmaWxlc1xuICAgICAqL1xuICAgIG5vbWV0YWRhdGE/OiBib29sZWFuO1xuXG4gICAgLyoqXG4gICAgICogVG8gZ2VuZXJhdGUgaW1hZ2VzIGluIHRoZSBzcGVjaWZpZWQgZGlyZWN0b3J5XG4gICAgICovXG4gICAgb3V0cHV0RGlyPzogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogVG8gZ2VuZXJhdGUgaW1hZ2VzIHVzaW5nIEVQUyBmb3JtYXRcbiAgICAgKi9cbiAgICB0ZXBzPzogYm9vbGVhbjtcblxuICAgIC8qKlxuICAgICAqIFRvIGdlbmVyYXRlIEhUTUwgZmlsZSBmb3IgY2xhc3MgZGlhZ3JhbVxuICAgICAqL1xuICAgIHRodG1sPzogYm9vbGVhbjtcblxuICAgIC8qKlxuICAgICAqIFRvIGdlbmVyYXRlIGltYWdlcyB1c2luZyBMYVRlWC9UaWt6IGZvcm1hdFxuICAgICAqL1xuICAgIHRsYXRleD86IGJvb2xlYW47XG5cbiAgICAvKipcbiAgICAgKiBUbyBnZW5lcmF0ZSBpbWFnZXMgdXNpbmcgUERGIGZvcm1hdFxuICAgICAqL1xuICAgIHRwZGY/OiBib29sZWFuO1xuXG4gICAgLyoqXG4gICAgICogVG8gZ2VuZXJhdGUgaW1hZ2VzIHVzaW5nIFBORyBmb3JtYXQgKGRlZmF1bHQpXG4gICAgICovXG4gICAgdHBuZz86IGJvb2xlYW47XG5cbiAgICAvKipcbiAgICAgKiBUbyBnZW5lcmF0ZSBTQ1hNTCBmaWxlIGZvciBzdGF0ZSBkaWFncmFtXG4gICAgICovXG4gICAgdHNjeG1sPzogYm9vbGVhbjtcblxuICAgIC8qKlxuICAgICAqIFRvIGdlbmVyYXRlIGltYWdlcyB1c2luZyBTVkcgZm9ybWF0XG4gICAgICovXG4gICAgdHN2Zz86IGJvb2xlYW47XG5cbiAgICAvKipcbiAgICAgKiBUbyBnZW5lcmF0ZSBpbWFnZXMgd2l0aCBBU0NJSSBhcnRcbiAgICAgKi9cbiAgICB0dHh0PzogYm9vbGVhbjtcblxuICAgIC8qKlxuICAgICAqIFRvIGdlbmVyYXRlIGltYWdlcyB3aXRoIEFTQ0lJIGFydCB1c2luZyBVbmljb2RlIGNoYXJhY3RlcnNcbiAgICAgKi9cbiAgICB0dXR4dD86IGJvb2xlYW47XG5cbiAgICAvKipcbiAgICAgKiBUbyBnZW5lcmF0ZSBpbWFnZXMgdXNpbmcgVkRYIGZvcm1hdFxuICAgICAqL1xuICAgIHR2ZHg/OiBib29sZWFuO1xuXG4gICAgLyoqXG4gICAgICogVG8gZ2VuZXJhdGUgWE1JIGZpbGUgZm9yIGNsYXNzIGRpYWdyYW1cbiAgICAgKi9cbiAgICB0eG1pPzogYm9vbGVhbjtcblxuICAgIC8qKlxuICAgICAqIFRvIGhhdmUgbG9nIGluZm9ybWF0aW9uXG4gICAgICovXG4gICAgdmVyYm9zZT86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkb1BsYW50VU1MTG9jYWwob3B0aW9ucykge1xuXG4gICAgY29uc3QgYXJncyA9IFtcbiAgICAgICAgLy8gJ2phdmEnLFxuICAgICAgICAnLWphcicsXG4gICAgICAgICctRGphdmEuYXd0LmhlYWRsZXNzPXRydWUnLFxuICAgICAgICAnLS1hZGQtb3BlbnM9amF2YS54bWwvY29tLnN1bi5vcmcuYXBhY2hlLnhhbGFuLmludGVybmFsLnhzbHRjLnRyYXg9QUxMLVVOTkFNRUQnLFxuICAgICAgICBwbGFudHVtbEphcixcbiAgICBdO1xuICAgIGlmIChvcHRpb25zLmNoYXJzZXQpIHtcbiAgICAgICAgYXJncy5wdXNoKCctY2hhcnNldCcpO1xuICAgICAgICBhcmdzLnB1c2gob3B0aW9ucy5jaGFyc2V0KTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMuZGFya21vZGUpIHtcbiAgICAgICAgYXJncy5wdXNoKCctZGFya21vZGUnKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMuZGVidWdzdmVrKSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLWRlYnVnc3ZlaycpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy5maWxlTmFtZU92ZXJyaWRlKSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLWZpbGVuYW1lJyk7XG4gICAgICAgIGFyZ3MucHVzaChvcHRpb25zLmZpbGVOYW1lT3ZlcnJpZGUpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy5uYnRocmVhZCkge1xuICAgICAgICBhcmdzLnB1c2goJy1uYnRocmVhZCcpO1xuICAgICAgICBhcmdzLnB1c2gob3B0aW9ucy5uYnRocmVhZCk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLm5vbWV0YWRhdGEpIHtcbiAgICAgICAgYXJncy5wdXNoKCctbm9tZXRhZGF0YScpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy50ZXBzKSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLXRlcHMnKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMudGh0bWwpIHtcbiAgICAgICAgYXJncy5wdXNoKCctdGh0bWwnKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMudGxhdGV4KSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLXRsYXRleCcpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy50cGRmKSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLXRwZGYnKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMudHBuZykge1xuICAgICAgICBhcmdzLnB1c2goJy10cG5nJyk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnRzY3htbCkge1xuICAgICAgICBhcmdzLnB1c2goJy10c2N4bWwnKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMudHN2Zykge1xuICAgICAgICBhcmdzLnB1c2goJy10c3ZnJyk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnR0eHQpIHtcbiAgICAgICAgYXJncy5wdXNoKCctdHR4dCcpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy50dXR4dCkge1xuICAgICAgICBhcmdzLnB1c2goJy10dXR4dCcpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy50dmR4KSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLXR2ZHgnKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMudHhtaSkge1xuICAgICAgICBhcmdzLnB1c2goJy10eG1pJyk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnZlcmJvc2UpIHtcbiAgICAgICAgYXJncy5wdXNoKCctdmVyYm9zZScpO1xuICAgIH1cblxuICAgIC8vIDAgaW5wdXRGTnMgcmVxdWlyZXMgaW5wdXRCb2R5LCByZXF1aXJlcyBvdXRwdXRGTlxuICAgIC8vIGNoaWxkLnN0ZGluLndyaXRlL2VuZCB3aXRoIGlucHV0Qm9keVxuICAgIC8vIGNoaWxkLnN0ZG91dC5waXBlKGZzLmNyZWF0ZVdyaXRlU3RyZWFtKG91dHB1dEZOKSlcbiAgICAvLyAtcGlwZVxuICAgIC8vXG4gICAgLy8gMSBpbnB1dEZOLCBuby9pZ25vcmUgaW5wdXRCb2R5LCByZXF1aXJlcyBvdXRwdXRGTlxuICAgIC8vIGZzLmNyZWF0ZVJlYWRTdHJlYW0oaW5wdXRGTikucGlwZShjaGlsZC5zdGRpbikgPz9cbiAgICAvLyBjaGlsZC5zdGRvdXQucGlwZShmcy5jcmVhdGVXcml0ZVN0cmVhbShvdXRwdXRGTikpXG4gICAgLy8gLXBpcGVcbiAgICAvL1xuICAgIC8vIElHTk9SRVxuICAgIC8vIElHTk9SRSBlaXRoZXIgMCBpbnB1dCBGTnMgJiBpbnB1dEJvZHksIG9yIDEgaW5wdXRGTlxuICAgIC8vIElHTk9SRSBubyBvdXRwdXRGTlxuICAgIC8vIElHTk9SRSAtdHN2ZyBzZXRcbiAgICAvLyBJR05PUkUgUmVhZCBzdGRvdXQgaW50byBhIEJ1ZmZlciwgdGhhdCdzIGNvbnZlcnRlZCB0byBzdHJpbmdcbiAgICAvLyBJR05PUkUgLXBpcGVcbiAgICAvLyBJR05PUkUgUmV0dXJuIHRoZSBzdHJpbmdcbiAgICAvLyBTRUUgaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTQyNjkyMzMvbm9kZS1qcy1ob3ctdG8tcmVhZC1hLXN0cmVhbS1pbnRvLWEtYnVmZmVyXG4gICAgLy9cbiAgICAvLyBtdWx0aXBsZSBpbnB1dEZOcyAuLiBvcHRpb25hbCBvdXRwdXQtZGlyJ3NcbiAgICAvLyBCb3RoIGdvIG9uIHRoZSBjb21tYW5kLWxpbmVcbiAgICAvL1xuXG4gICAgbGV0IHNwYXdub3B0cyA9IHt9IGFzIGFueTtcblxuICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5pbnB1dEZOcyA9PT0gJ3VuZGVmaW5lZCdcbiAgICAgJiYgIUFycmF5LmlzQXJyYXkob3B0aW9ucy5pbnB1dEZOcylcbiAgICAgJiYgdHlwZW9mIG9wdGlvbnMuaW5wdXRCb2R5ICE9PSAnc3RyaW5nJ1xuICAgICkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sIC0gbm8gaW5wdXQgc291cmNlc2ApO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIG9wdGlvbnMuaW5wdXRGTnMgPT09ICd1bmRlZmluZWQnXG4gICAgICYmICFBcnJheS5pc0FycmF5KG9wdGlvbnMuaW5wdXRGTnMpXG4gICAgICYmIHR5cGVvZiBvcHRpb25zLmlucHV0Qm9keSA9PT0gJ3N0cmluZydcbiAgICAgJiYgdHlwZW9mIG9wdGlvbnMub3V0cHV0Rk4gIT09ICdzdHJpbmcnXG4gICAgKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgcGxhbnR1bWwgLSB3aXRoIGlucHV0Qm9keSwgbm8gb3V0cHV0IGRlc3RpbmF0aW9uYCk7XG4gICAgfVxuICAgIC8vIE5vIGZpbGUgbmFtZXMsIGJ1dCBhbiBpbnB1dEJvZHksIGFuZCBhbiBvdXRwdXQgZmlsZSxcbiAgICAvLyBtZWFucyB3ZSdyZSBwaXBpbmdcbiAgICBpZiAodHlwZW9mIG9wdGlvbnMuaW5wdXRGTnMgPT09ICd1bmRlZmluZWQnXG4gICAgICYmICFBcnJheS5pc0FycmF5KG9wdGlvbnMuaW5wdXRGTnMpXG4gICAgICYmIHR5cGVvZiBvcHRpb25zLmlucHV0Qm9keSA9PT0gJ3N0cmluZydcbiAgICAgJiYgdHlwZW9mIG9wdGlvbnMub3V0cHV0Rk4gPT09ICdzdHJpbmcnXG4gICAgKSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLXBpcGUnKTtcbiAgICB9XG4gICAgaWYgKEFycmF5LmlzQXJyYXkob3B0aW9ucy5pbnB1dEZOcylcbiAgICAgJiYgb3B0aW9ucy5pbnB1dEZOcy5sZW5ndGggPT09IDFcbiAgICAgJiYgdHlwZW9mIG9wdGlvbnMub3V0cHV0Rk4gIT09ICdzdHJpbmcnXG4gICAgKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgcGxhbnR1bWwgLSB3aXRoIG9uZSBpbnB1dCBmaWxlICR7b3B0aW9ucy5pbnB1dEZOc1swXX0gbm8gb3V0cHV0IGZpbGVgKTtcbiAgICB9XG4gICAgLy8gT25lIGZpbGUgbmFtZXMsIGlnbm9yZSBpbnB1dEJvZHksIGFuZCBhbiBvdXRwdXQgZmlsZSxcbiAgICAvLyBtZWFucyB3ZSdyZSBwaXBpbmdcbiAgICBpZiAoQXJyYXkuaXNBcnJheShvcHRpb25zLmlucHV0Rk5zKVxuICAgICAmJiBvcHRpb25zLmlucHV0Rk5zLmxlbmd0aCA9PT0gMVxuICAgICAmJiB0eXBlb2Ygb3B0aW9ucy5vdXRwdXRGTiA9PT0gJ3N0cmluZydcbiAgICApIHtcbiAgICAgICAgYXJncy5wdXNoKCctcGlwZScpO1xuICAgIH1cblxuICAgIGlmIChBcnJheS5pc0FycmF5KG9wdGlvbnMuaW5wdXRGTnMpXG4gICAgICYmIG9wdGlvbnMuaW5wdXRGTnMubGVuZ3RoID4gMVxuICAgICAmJiB0eXBlb2Ygb3B0aW9ucy5vdXRwdXRGTiA9PT0gJ3N0cmluZydcbiAgICApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBwbGFudHVtbCAtIHdpdGggbXVsdGlwbGUgaW5wdXQgZmlsZXMsIG91dHB1dCBmaWxlIG5vdCBhbGxvd2VkYClcbiAgICB9XG5cbiAgICAvLyBtdWx0aXBsZSBmaWxlIG5hbWVzLCBwdXNoIG9udG8gYXJnc1xuICAgIGlmIChBcnJheS5pc0FycmF5KG9wdGlvbnMuaW5wdXRGTnMpXG4gICAgICYmIG9wdGlvbnMuaW5wdXRGTnMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKGNvbnN0IGlucHV0Rk4gb2Ygb3B0aW9ucy5pbnB1dEZOcykge1xuICAgICAgICAgICAgYXJncy5wdXNoKGlucHV0Rk4pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBvcHRpb25zLm91dHB1dERpciA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgYXJncy5wdXNoKCctb3V0cHV0Jyk7XG4gICAgICAgIGFyZ3MucHVzaChvcHRpb25zLm91dHB1dERpcik7XG4gICAgfVxuXG4gICAgLy8gTm93IHRoYXQgdGhlIGNvbW1hbmQgYXJncyBhbmQgc3Bhd25vcHRzIGFyZSBzZXQgdXBcbiAgICAvLyBydW4gdGhlIGNvbW1hbmRcbiAgICAvLyBjb25zb2xlLmxvZyh7XG4gICAgLy8gICAgIHNwYXdub3B0cywgYXJnc1xuICAgIC8vIH0pO1xuICAgIGNvbnN0IGNoaWxkID0gc3Bhd24oJ2phdmEnLCBhcmdzLCBzcGF3bm9wdHMpO1xuXG4gICAgLy8gTmV4dCwgc2V0IHVwIHN0ZGluL3N0ZG91dCBwaXBlcyBpbiBjYXNlXG4gICAgLy8gb2YgdXNpbmcgLXBpcGUgbW9kZVxuXG4gICAgLy8gTm8gaW5wdXQgZmlsZXMsIHdpdGggaW5wdXRCb2R5LCBhbmQgb3V0cHV0Rk4sXG4gICAgLy8gc2V0IHVwIHRoZSBwaXBpbmcgZnJvbSBpbnB1dCB0byBvdXRwdXRcbiAgICBpZiAodHlwZW9mIG9wdGlvbnMuaW5wdXRGTnMgPT09ICd1bmRlZmluZWQnXG4gICAgICYmICFBcnJheS5pc0FycmF5KG9wdGlvbnMuaW5wdXRGTnMpXG4gICAgICYmIHR5cGVvZiBvcHRpb25zLmlucHV0Qm9keSA9PT0gJ3N0cmluZydcbiAgICAgJiYgdHlwZW9mIG9wdGlvbnMub3V0cHV0Rk4gPT09ICdzdHJpbmcnXG4gICAgKSB7XG4gICAgICAgIGNoaWxkLnN0ZGluLndyaXRlKG9wdGlvbnMuaW5wdXRCb2R5KTtcbiAgICAgICAgY2hpbGQuc3Rkb3V0LnBpcGUoZnMuY3JlYXRlV3JpdGVTdHJlYW0ob3B0aW9ucy5vdXRwdXRGTikpO1xuICAgICAgICBjaGlsZC5zdGRpbi5lbmQoKTtcbiAgICB9XG5cbiAgICAvLyBPbmUgZmlsZSBuYW1lcywgaWdub3JlIGlucHV0Qm9keSwgYW5kIGFuIG91dHB1dCBmaWxlLFxuICAgIC8vIHNldCB1cCB0aGUgcGlwaW5nIGZyb20gaW5wdXQgdG8gb3V0cHV0XG4gICAgaWYgKEFycmF5LmlzQXJyYXkob3B0aW9ucy5pbnB1dEZOcylcbiAgICAgJiYgb3B0aW9ucy5pbnB1dEZOcy5sZW5ndGggPT09IDFcbiAgICAgJiYgdHlwZW9mIG9wdGlvbnMub3V0cHV0Rk4gPT09ICdzdHJpbmcnXG4gICAgKSB7XG4gICAgICAgIC8vIGNvbnN0IGlucCA9IGF3YWl0IGZzcC5yZWFkRmlsZShvcHRpb25zLmlucHV0Rk5zWzBdLCAndXRmLTgnKTtcbiAgICAgICAgLy8gY2hpbGQuc3RkaW4ud3JpdGUoaW5wKTtcbiAgICAgICAgZnMuY3JlYXRlUmVhZFN0cmVhbShvcHRpb25zLmlucHV0Rk5zWzBdKS5waXBlKGNoaWxkLnN0ZGluKTtcbiAgICAgICAgY2hpbGQuc3Rkb3V0LnBpcGUoZnMuY3JlYXRlV3JpdGVTdHJlYW0ob3B0aW9ucy5vdXRwdXRGTikpO1xuICAgICAgICAvLyBjaGlsZC5zdGRpbi5lbmQoKTtcbiAgICB9XG5cbiAgICAvLyBGaW5hbGx5LCB3YWl0IGZvciB0aGUgY2hpbGQgdG8gZmluaXNoXG5cbiAgICBjaGlsZC5vbignZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYHBsYW50dW1sIEVSUk9SIGluIGNoaWxkIHByb2Nlc3MgJHtlcnIubWVzc2FnZX1gKTtcbiAgICB9KTtcblxuICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgY2hpbGQub24oJ2Nsb3NlJywgKGNvZGUpID0+IHtcbiAgICAgICAgICAgIGlmIChjb2RlID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh1bmRlZmluZWQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKGBwbGFudHVtbCBmYWlsIHdpdGggY29kZSAke2NvZGV9YCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcblxufVxuXG4vKipcbiAqIEhhbmRsZSBjb252ZXJ0aW5nIGEgc2luZ2xlIFBsYW50VU1MIGRpYWdyYW0gZm9yXG4gKiBkaXNwbGF5IGluIGEgZG9jdW1lbnQuXG4gKiBcbiAqIFRoZSBkb2N1bWVudCBkZXNjcmlwdGlvbiBpcyBlaXRoZXIgaW5saW5lXG4gKiB0byB0aGUgPGRpYWdyYW1zLXBsYW50dW1sPiB0YWcsIG9yIGVsc2UgYSBzaW5nbGVcbiAqIGlucHV0IGZpbGUgaW4gdGhlIGlucHV0LWZpbGUgYXR0cmlidXRlLlxuICogXG4gKiBUaGVyZSBpcyBhIHNpbmdsZSBvdXRwdXQtZmlsZSBhdHRyaWJ1dGUgdG9cbiAqIGZvciBhIGZpbGUgdG8gcmVjZWl2ZSBhcyBvdXRwdXQuICBUaGlzIGZpbGVcbiAqIGlzIHdyaXR0ZW4gZGlyZWN0bHkgdG8gdGhlIHJlbmRlcmluZ091dHB1dCBkaXJlY3RvcnkuXG4gKiBcbiAqIFRoaXMgd2lsbCBzdXBwb3J0IG9ubHkgUE5HIGFuZCBTVkcgb3V0cHV0IGZvcm1hdHMuXG4gKiBcbiAqIFRoZSBvdXRwdXQtZmlsZSBpcyBhIFZQYXRoIHNwZWNpZnlpbmcgYW5cbiAqIG91dHB1dCBkaXJlY3RvcnkgbG9jYXRpb24uXG4gKiBcbiAqIGlzQWJzb2x1dGUob3V0cHV0LWZpbGUpIC0gbWVhbnMgaXQgaXMgcm9vdGVkXG4gKiB0byB0aGUgb3V0cHV0IGRpcmVjdG9yeS4gIE90aGVyd2lzZSBpdCBpcyByZWxhdGl2ZVxuICogdG8gdGhlIGRpcm5hbWUobWV0YWRhdGEuZG9jdW1lbnQucGF0aCkuXG4gKi9cbmNsYXNzIFBsYW50VU1MTG9jYWwgZXh0ZW5kcyBha2FzaGEuQ3VzdG9tRWxlbWVudCB7XG5cblx0Z2V0IGVsZW1lbnROYW1lKCkgeyByZXR1cm4gXCJkaWFncmFtcy1wbGFudHVtbFwiOyB9XG4gICAgYXN5bmMgcHJvY2VzcygkZWxlbWVudCwgbWV0YWRhdGEsIGRpcnR5OiBGdW5jdGlvbikge1xuXG4gICAgICAgIGNvbnN0IG9wdGlvbnM6IGRvUGxhbnRVTUxPcHRpb25zID0ge1xuICAgICAgICAgICAgLy8gVXNpbmcgLnRleHQoKSBlbGltaW5hdGVzIEhUTUwgZm9ybWF0dGluZy5cbiAgICAgICAgICAgIGlucHV0Qm9keTogJGVsZW1lbnQudGV4dCgpLFxuICAgICAgICAgICAgaW5wdXRGTnM6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIG91dHB1dEZOOiAkZWxlbWVudC5hdHRyKCdvdXRwdXQtZmlsZScpXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gRW5zdXJlIHRoZXJlIGlzIGVpdGhlciBhbiBpbnB1dC1maWxlXG4gICAgICAgIC8vIG9yIGFuIGlucHV0IGJvZHlcblxuICAgICAgICBjb25zdCBpbmYgPSAgJGVsZW1lbnQuYXR0cignaW5wdXQtZmlsZScpO1xuICAgICAgICBpZiAodHlwZW9mIGluZiA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIG9wdGlvbnMuaW5wdXRGTnMgPSBbIGluZiBdO1xuICAgICAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoaW5mKSAmJiBpbmYubGVuZ3RoID49IDEpIHtcbiAgICAgICAgICAgIG9wdGlvbnMuaW5wdXRGTnMgPSBbIGluZlswXSBdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3B0aW9ucy5pbnB1dEZOcyA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMuaW5wdXRCb2R5ICE9PSAnc3RyaW5nJ1xuICAgICAgICAgJiYgKFxuICAgICAgICAgICAgIUFycmF5LmlzQXJyYXkob3B0aW9ucy5pbnB1dEZOcylcbiAgICAgICAgIHx8IG9wdGlvbnMuaW5wdXRGTnMubGVuZ3RoIDw9IDBcbiAgICAgICAgKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQbGFudFVNTExvY2FsIG9uZSBpbnB1dCBmaWxlIG9yIGlubGluZSBkaWFncmFtIGlzIHJlcXVpcmVkYCk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgdnBhdGhJbjtcbiAgICAgICAgbGV0IGZzcGF0aEluO1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShvcHRpb25zLmlucHV0Rk5zKSAmJiBvcHRpb25zLmlucHV0Rk5zLmxlbmd0aCA9PT0gMSkge1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMuaW5wdXRGTnNbMF0gIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQbGFudFVNTExvY2FsIG5vIGlucHV0IGZpbGUgRk4gZ2l2ZW4gaW4gJHt1dGlsLmluc3BlY3Qob3B0aW9ucy5pbnB1dEZOcyl9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBpbkZOID0gb3B0aW9ucy5pbnB1dEZOc1swXTtcbiAgICAgICAgICAgIGlmIChwYXRoLmlzQWJzb2x1dGUoaW5GTikpIHtcbiAgICAgICAgICAgICAgICB2cGF0aEluID0gaW5GTjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbGV0IGRpciA9IHBhdGguZGlybmFtZShtZXRhZGF0YS5kb2N1bWVudC5wYXRoKTtcbiAgICAgICAgICAgICAgICB2cGF0aEluID0gcGF0aC5ub3JtYWxpemUoXG4gICAgICAgICAgICAgICAgICAgIHBhdGguam9pbignLycsIGRpciwgaW5GTilcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBkb2N1bWVudHMgPSB0aGlzLmNvbmZpZy5ha2FzaGEuZmlsZWNhY2hlLmRvY3VtZW50c0NhY2hlO1xuICAgICAgICAgICAgY29uc3QgYXNzZXRzID0gdGhpcy5jb25maWcuYWthc2hhLmZpbGVjYWNoZS5hc3NldHNDYWNoZTtcbiAgICAgICAgICAgIGNvbnN0IGRvYyA9IGF3YWl0IGRvY3VtZW50cy5maW5kKHZwYXRoSW4pO1xuICAgICAgICAgICAgbGV0IGFzc2V0O1xuXG4gICAgICAgICAgICBpZiAoIWRvYykgYXNzZXQgPSBhd2FpdCBhc3NldHMuZmluZCh2cGF0aEluKTtcbiAgIFxuICAgICAgICAgICAgaWYgKCFkb2MgJiYgIWFzc2V0KSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQbGFudFVNTExvY2FsIG5vIHBsYW50dW1sIGFzc2V0IG9yIGRvY3VtZW50IGZpbGUgIGZvdW5kIGZvciAke3ZwYXRoSW59YCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChkb2MpIGZzcGF0aEluID0gZG9jLmZzcGF0aDtcbiAgICAgICAgICAgIGVsc2UgaWYgKGFzc2V0KSBmc3BhdGhJbiA9IGFzc2V0LmZzcGF0aDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElmIHRoZXJlIHdhcyBhbiBpbnB1dCBmaWxlLCByZWNvcmQgaXRzIGZ1bGwgcGF0aG5hbWVcbiAgICAgICAgLy8gYXMgdGhlIGlucHV0Rk5zIGVudHJ5XG4gICAgICAgIGlmIChmc3BhdGhJbikgb3B0aW9ucy5pbnB1dEZOcyA9IFsgZnNwYXRoSW4gXTtcblxuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMub3V0cHV0Rk4gIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFBsYW50VU1MTG9jYWwgbm8gb3V0cHV0IGZpbGUgbmFtZSB3YXMgc3VwcGxpZWRgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCB2cGF0aE91dDtcbiAgICAgICAgaWYgKCEgcGF0aC5pc0Fic29sdXRlKG9wdGlvbnMub3V0cHV0Rk4pKSB7XG4gICAgICAgICAgICBsZXQgZGlyID0gcGF0aC5kaXJuYW1lKG1ldGFkYXRhLmRvY3VtZW50LnBhdGgpO1xuICAgICAgICAgICAgdnBhdGhPdXQgPSBwYXRoLm5vcm1hbGl6ZShcbiAgICAgICAgICAgICAgICBwYXRoLmpvaW4oJy8nLCBkaXIsIG9wdGlvbnMub3V0cHV0Rk4pXG4gICAgICAgICAgICApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdnBhdGhPdXQgPSBvcHRpb25zLm91dHB1dEZOO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ29tcHV0ZSBmc3BhdGggZm9yIHZwYXRoT3V0XG4gICAgICAgIGNvbnN0IGZzcGF0aE91dCA9IHBhdGgubm9ybWFsaXplKHBhdGguam9pbihcbiAgICAgICAgICAgIHRoaXMuYXJyYXkub3B0aW9ucy5jb25maWcucmVuZGVyRGVzdGluYXRpb24sIHZwYXRoT3V0XG4gICAgICAgICkpO1xuICAgICAgICBvcHRpb25zLm91dHB1dEZOID0gZnNwYXRoT3V0O1xuXG4gICAgICAgIGxldCB3aWR0aCA9ICRlbGVtZW50LmF0dHIoJ3dpZHRoJyk7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGB3aWR0aD0ke3dpZHRofWApO1xuICAgICAgICBpZiAodHlwZW9mIHdpZHRoID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgd2lkdGggPSBOdW1iZXIucGFyc2VGbG9hdCh3aWR0aCk7XG4gICAgICAgICAgICBpZiAoaXNOYU4od2lkdGgpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQbGFudFVNTExvY2FsOiB3aWR0aCBpcyBub3QgYSBudW1iZXIgJHt3aWR0aH1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICg8YW55Pm9wdGlvbnMpLndpZHRoID0gd2lkdGg7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBjb25zb2xlLmxvZyhvcHRpb25zKTtcblxuICAgICAgICBjb25zdCBpZCA9ICRlbGVtZW50LmF0dHIoJ2lkJyk7XG4gICAgICAgIGNvbnN0IGNsYXp6ID0gJGVsZW1lbnQuYXR0cignY2xhc3MnKTtcbiAgICAgICAgY29uc3QgYWx0ID0gJGVsZW1lbnQuYXR0cignYWx0Jyk7XG4gICAgICAgIGNvbnN0IHRpdGxlID0gJGVsZW1lbnQuYXR0cigndGl0bGUnKTtcbiAgICAgICAgY29uc3QgY2FwdGlvbiA9ICRlbGVtZW50LmF0dHIoJ2NhcHRpb24nKTtcbiAgICAgICAgY29uc3QgY3MgPSAkZWxlbWVudC5hdHRyKCdjaGFyc2V0Jyk7XG4gICAgICAgIGlmIChpc1ZhbGlkQ2hhcnNldChjcykpIG9wdGlvbnMuY2hhcnNldCA9IGNzO1xuICAgICAgICBvcHRpb25zLmRhcmttb2RlID0gdHlwZW9mICRlbGVtZW50LnByb3AoJ2Rhcmttb2RlJykgIT09ICd1bmRlZmluZWQnO1xuICAgICAgICAvLyBvcHRpb25zLmRlYnVnc3ZlayA9ICRlbGVtZW50LnByb3AoJ2RlYnVnc3ZlaycpO1xuICAgICAgICAvLyBvcHRpb25zLmZpbGVOYW1lT3ZlcnJpZGUgPSAkZWxlbWVudC5hdHRyKCdmaWxlbmFtZScpO1xuICAgICAgICBjb25zdCBuYnRocmVhZCA9ICRlbGVtZW50LmF0dHIoJ25idGhyZWFkJyk7XG4gICAgICAgIGlmICh0eXBlb2YgbmJ0aHJlYWQgPT09ICdzdHJpbmcnKSBvcHRpb25zLm5idGhyZWFkID0gbmJ0aHJlYWQ7XG4gICAgICAgIG9wdGlvbnMubm9tZXRhZGF0YSA9IHR5cGVvZiAkZWxlbWVudC5wcm9wKCdub21ldGFkYXRhJykgIT09ICd1bmRlZmluZWQnO1xuICAgICAgICAvLyBvcHRpb25zLnRlcHMgPSAkZWxlbWVudC5wcm9wKCd0ZXBzJyk7XG4gICAgICAgIC8vIG9wdGlvbnMudGh0bWwgPSAkZWxlbWVudC5wcm9wKCd0aHRtbCcpO1xuICAgICAgICAvLyBvcHRpb25zLnRsYXRleCA9ICRlbGVtZW50LnByb3AoJ3RsYXRleCcpO1xuICAgICAgICAvLyBvcHRpb25zLnRwZGYgPSAkZWxlbWVudC5wcm9wKCd0cGRmJyk7XG4gICAgICAgIG9wdGlvbnMudHBuZyA9IHR5cGVvZiAkZWxlbWVudC5wcm9wKCd0cG5nJykgIT09ICd1bmRlZmluZWQnO1xuICAgICAgICAvLyBvcHRpb25zLnRzY3htbCA9ICRlbGVtZW50LnByb3AoJ3RzY3htbCcpO1xuICAgICAgICBvcHRpb25zLnRzdmcgPSB0eXBlb2YgJGVsZW1lbnQucHJvcCgndHN2ZycpICE9PSAndW5kZWZpbmVkJztcbiAgICAgICAgLy8gb3B0aW9ucy50dHh0ID0gJGVsZW1lbnQucHJvcCgndHR4dCcpO1xuICAgICAgICAvLyBvcHRpb25zLnR1dHh0ID0gJGVsZW1lbnQucHJvcCgndHV0eHQnKTtcbiAgICAgICAgLy8gb3B0aW9ucy50dmR4ID0gJGVsZW1lbnQucHJvcCgndHZkeCcpO1xuICAgICAgICAvLyBvcHRpb25zLnR4bWkgPSAkZWxlbWVudC5wcm9wKCd0eG1pJyk7XG4gICAgICAgIC8vIG9wdGlvbnMudmVyYm9zZSA9ICRlbGVtZW50LnByb3AoJ3ZlcmJvc2UnKTtcblxuICAgICAgICBpZiAob3B0aW9ucy50cG5nICYmIG9wdGlvbnMudHN2Zykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQbGFudFVNTExvY2FsIGNhbm5vdCB1c2UgYm90aCB0cG5nIGFuZCB0c3ZnYCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFvcHRpb25zLnRwbmcgJiYgIW9wdGlvbnMudHN2Zykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQbGFudFVNTExvY2FsIG11c3QgdXNlIG9uZSBvZiB0cG5nIG9yIHRzdmdgKTtcbiAgICAgICAgfVxuICAgICAgICBhd2FpdCBkb1BsYW50VU1MTG9jYWwob3B0aW9ucyk7XG5cbiAgICAgICAgY29uc3QgY2FwID0gdHlwZW9mIGNhcHRpb24gPT09ICdzdHJpbmcnXG4gICAgICAgICAgICA/IGA8ZmlnY2FwdGlvbj4ke2VuY29kZShjYXB0aW9uKX08L2ZpZ2NhcHRpb24+YFxuICAgICAgICAgICAgOiAnJztcbiAgICAgICAgY29uc3QgVGFsdCA9IHR5cGVvZiBhbHQgPT09ICdzdHJpbmcnXG4gICAgICAgICAgICA/IGBhbHQ9XCIke2VuY29kZShhbHQpfVwiYFxuICAgICAgICAgICAgOiAnJztcbiAgICAgICAgY29uc3QgVHRpdGxlID0gdHlwZW9mIHRpdGxlID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgPyBgdGl0bGU9XCIke2VuY29kZSh0aXRsZSl9XCJgXG4gICAgICAgICAgICA6ICcnO1xuICAgICAgICBjb25zdCBUaWQgPSB0eXBlb2YgaWQgPT09ICdzdHJpbmcnXG4gICAgICAgICAgICA/IGBpZD1cIiR7ZW5jb2RlKGlkKX1gXG4gICAgICAgICAgICA6ICcnO1xuICAgICAgICBjb25zdCBUY2xhenogPSB0eXBlb2YgY2xhenogPT09ICdzdHJpbmcnXG4gICAgICAgICAgICA/IGBjbGFzcz1cIiR7ZW5jb2RlKGNsYXp6KX1gXG4gICAgICAgICAgICA6ICcnO1xuICAgICAgICBjb25zdCBUd2lkdGggPSB0eXBlb2Ygd2lkdGggPT09ICdudW1iZXInXG4gICAgICAgICAgICA/IGB3aWR0aD1cIiR7d2lkdGgudG9TdHJpbmcoKX1cImBcbiAgICAgICAgICAgIDogJyc7XG5cbiAgICAgICAgY29uc3QgcmV0ID0gYFxuICAgICAgICA8ZmlndXJlICR7VGlkfSAke1RjbGF6en0+XG4gICAgICAgIDxpbWcgc3JjPVwiJHtlbmNvZGUodnBhdGhPdXQpfVwiICR7VGFsdH0gJHtUdGl0bGV9ICR7VHdpZHRofS8+XG4gICAgICAgICR7Y2FwfVxuICAgICAgICA8L2ZpZ3VyZT5cbiAgICAgICAgYDtcbiAgICAgICAgLy8gY29uc29sZS5sb2cocmV0KTtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1ZhbGlkQ2hhcnNldChjaGFyc2V0KSB7XG4gICAgaWYgKHR5cGVvZiBjaGFyc2V0ICE9PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGNvbnN0IGNzID0gY2hhcnNldC50b0xvd2VyQ2FzZSgpO1xuXG4gICAgaWYgKHR5cGVvZiBjcyAhPT0gJ3N0cmluZydcbiAgICAgICAgfHwgKGNzICE9PSAndXRmOCcgJiYgY3MgIT09ICd1dGYtOCdcbiAgICAgICAgJiYgY3MgIT09ICd1dGYxNicgJiYgY3MgIT09ICd1dGYtMTYnXG4gICAgICAgICYmIGNzICE9PSAndXRmMTZiZScgJiYgY3MgIT09ICd1dGYtMTZiZSdcbiAgICAgICAgJiYgY3MgIT09ICd1dGYxNmxlJyAmJiBjcyAhPT0gJ3V0Zi0xNmxlJ1xuICAgICAgICAmJiBjcyAhPT0gJ3V0ZjMyJyAmJiBjcyAhPT0gJ3V0Zi0zMidcbiAgICAgICAgJiYgY3MgIT09ICd1dGYzMmxlJyAmJiBjcyAhPT0gJ3V0Zi0zMmxlJylcbiAgICApIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn1cbiJdfQ==