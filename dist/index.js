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
const __dirname = import.meta.dirname;
// Path name for the local copy of plantuml.jar
const plantumlJar = path.join(__dirname, '..', 'vendor', 'plantuml', 'plantuml-mit-1.2025.0.jar');
const pluginName = '@akashacms/plugins-diagrams';
import * as akasha from 'akasharender';
import { Plugin } from 'akasharender/dist/Plugin.js';
const mahabhuta = akasha.mahabhuta;
export class DiagramsPlugin extends Plugin {
    constructor() {
        super(pluginName);
        _DiagramsPlugin_config.set(this, void 0);
    }
    configure(config, options) {
        __classPrivateFieldSet(this, _DiagramsPlugin_config, config, "f");
        super.options = options; // ? options : {};
        options.config = config;
        config.addMahabhuta(mahabhutaArray(options));
    }
    get config() { return __classPrivateFieldGet(this, _DiagramsPlugin_config, "f"); }
}
_DiagramsPlugin_config = new WeakMap();
export function mahabhutaArray(options) {
    let ret = new mahabhuta.MahafuncArray(pluginName, options);
    ret.addMahafunc(new PlantUMLLocal());
    ret.addMahafunc(new PintoraLocal());
    return ret;
}
;
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
class PintoraLocal extends mahabhuta.CustomElement {
    get elementName() { return "diagrams-pintora"; }
    async process($element, metadata, dirty) {
        const options = {
            code: $element.text(),
            outputFN: $element.attr('output-file')
        };
        const inf = $element.attr('input-file');
        if (typeof inf === 'string') {
            if (typeof options.code === 'string'
                && options.code.length >= 1) {
                throw new Error(`diagrams-pintora - either specify input-file OR a diagram body, not both`);
            }
            options.code = await fsp.readFile(inf, 'utf-8');
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
        const fspathOut = path.normalize(path.join(this.array.options.config.renderDestination, vpathOut));
        options.outputFN = fspathOut;
        if (options.outputFN) {
            await fsp.writeFile(options.outputFN, buf);
        }
        return `
        <figure ${Tid} ${Tclazz}>
        <img src="${encode(vpathOut)}" ${Talt} ${Ttitle}/>
        ${cap}
        </figure>
        `;
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
class PlantUMLLocal extends mahabhuta.CustomElement {
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
            const documents = this.array.options.config.akasha.filecache.documentsCache;
            const assets = this.array.options.config.akasha.filecache.assetsCache;
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
        return `
        <figure ${Tid} ${Tclazz}>
        <img src="${encode(vpathOut)}" ${Talt} ${Ttitle}/>
        ${cap}
        </figure>
        `;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9saWIvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBRUEsT0FBTyxJQUFJLE1BQU0sV0FBVyxDQUFDO0FBQzdCLE9BQU8sRUFBRSxFQUFFLEVBQUUsUUFBUSxJQUFJLEdBQUcsRUFBRSxNQUFNLFNBQVMsQ0FBQztBQUM5QyxPQUFPLElBQUksTUFBTSxXQUFXLENBQUM7QUFDN0IsT0FBTyxFQUF1QixLQUFLLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUNoRSxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQ3JDLE9BQU8sRUFBRSxNQUFNLEVBQWlCLE1BQU0sY0FBYyxDQUFBO0FBRXBELE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO0FBRXRDLCtDQUErQztBQUMvQyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUNiLFNBQVMsRUFDVCxJQUFJLEVBQ0osUUFBUSxFQUNSLFVBQVUsRUFDViwyQkFBMkIsQ0FBQyxDQUFDO0FBRTdDLE1BQU0sVUFBVSxHQUFHLDZCQUE2QixDQUFDO0FBRWpELE9BQU8sS0FBSyxNQUFNLE1BQU0sY0FBYyxDQUFDO0FBQ3ZDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNyRCxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDO0FBRW5DLE1BQU0sT0FBTyxjQUFlLFNBQVEsTUFBTTtJQUl0QztRQUNJLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUh0Qix5Q0FBUTtJQUlSLENBQUM7SUFFRCxTQUFTLENBQUMsTUFBTSxFQUFFLE9BQU87UUFDckIsdUJBQUEsSUFBSSwwQkFBVyxNQUFNLE1BQUEsQ0FBQztRQUN0QixLQUFLLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQyxDQUFDLGtCQUFrQjtRQUMzQyxPQUFPLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUN4QixNQUFNLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQ2pELENBQUM7SUFFRCxJQUFJLE1BQU0sS0FBSyxPQUFPLHVCQUFBLElBQUksOEJBQVEsQ0FBQyxDQUFDLENBQUM7Q0FDeEM7O0FBRUQsTUFBTSxVQUFVLGNBQWMsQ0FBQyxPQUFPO0lBQ2xDLElBQUksR0FBRyxHQUFHLElBQUksU0FBUyxDQUFDLGFBQWEsQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDM0QsR0FBRyxDQUFDLFdBQVcsQ0FBQyxJQUFJLGFBQWEsRUFBRSxDQUFDLENBQUM7SUFDckMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxJQUFJLFlBQVksRUFBRSxDQUFDLENBQUM7SUFDcEMsT0FBTyxHQUFHLENBQUM7QUFDZixDQUFDO0FBQUEsQ0FBQztBQWtDRixNQUFNLENBQUMsS0FBSyxVQUFVLFNBQVMsQ0FDM0IsT0FBNkI7SUFFN0IsTUFBTSxVQUFVLEdBQUcsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzVDLE9BQU8sVUFBVSxDQUFDLFFBQVEsQ0FBQztJQUUzQixNQUFNLEdBQUcsR0FBRyxNQUFNLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUVyQyxJQUFJLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNuQixNQUFNLEdBQUcsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUMvQyxDQUFDO1NBQU0sQ0FBQztRQUNKLE1BQU0sSUFBSSxLQUFLLENBQUMscUJBQXFCLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ2xFLENBQUM7QUFDTCxDQUFDO0FBRUQsTUFBTSxZQUFhLFNBQVEsU0FBUyxDQUFDLGFBQWE7SUFDakQsSUFBSSxXQUFXLEtBQUssT0FBTyxrQkFBa0IsQ0FBQyxDQUFDLENBQUM7SUFFN0MsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLEtBQWU7UUFDN0MsTUFBTSxPQUFPLEdBQXlCO1lBQ2xDLElBQUksRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFO1lBQ3JCLFFBQVEsRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQztTQUN6QyxDQUFDO1FBRUYsTUFBTSxHQUFHLEdBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUN6QyxJQUFJLE9BQU8sR0FBRyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzFCLElBQUksT0FBTyxPQUFPLENBQUMsSUFBSSxLQUFLLFFBQVE7bUJBQ2hDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsRUFDMUIsQ0FBQztnQkFDQyxNQUFNLElBQUksS0FBSyxDQUFDLDBFQUEwRSxDQUFDLENBQUM7WUFDaEcsQ0FBQztZQUNELE9BQU8sQ0FBQyxJQUFJLEdBQUcsTUFBTSxHQUFHLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNwRCxDQUFDO1FBRUQsSUFBSSxPQUFPLE9BQU8sQ0FBQyxRQUFRLEtBQUssUUFBUTtlQUNwQyxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQzdCLENBQUM7WUFDQyxNQUFNLElBQUksS0FBSyxDQUFDLHdDQUF3QyxDQUFDLENBQUM7UUFDOUQsQ0FBQztRQUVELE1BQU0sR0FBRyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDekMsSUFBSSxPQUFPLEdBQUcsS0FBSyxRQUFRO2VBQ3ZCLEdBQUcsQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUNqQixDQUFDO1lBQ0MsTUFBTSxDQUFDLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNqQyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUNYLE1BQU0sSUFBSSxLQUFLLENBQUMsaURBQWlELEdBQUcsRUFBRSxDQUFDLENBQUM7WUFDNUUsQ0FBQztZQUNELE9BQU8sQ0FBQyxnQkFBZ0IsR0FBRyxDQUFDLENBQUM7UUFDakMsQ0FBQztRQUVELE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDeEMsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUMzQixJQUNJLElBQUksS0FBSyxlQUFlO21CQUN4QixJQUFJLEtBQUssWUFBWTttQkFDckIsSUFBSSxLQUFLLFdBQVcsRUFDdEIsQ0FBQztnQkFDQyxPQUFPLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztZQUM1QixDQUFDO2lCQUFNLENBQUM7Z0JBQ0osTUFBTSxJQUFJLEtBQUssQ0FBQyxxQkFBcUIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDL0QsQ0FBQztRQUNMLENBQUM7UUFFRCxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzFDLElBQUksT0FBTyxPQUFPLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDOUIsT0FBTyxDQUFDLGVBQWUsR0FBRyxPQUFPLENBQUM7UUFDdEMsQ0FBQztRQUVELE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDckMsSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUM1QixPQUFPLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDekMsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ3ZCLE1BQU0sSUFBSSxLQUFLLENBQUMsMkNBQTJDLEtBQUssRUFBRSxDQUFDLENBQUM7WUFDeEUsQ0FBQztRQUNMLENBQUM7UUFFRCxPQUFPLENBQUMsa0JBQWtCLEdBQUcsS0FBSyxDQUFDO1FBRW5DLE1BQU0sR0FBRyxHQUFHLE1BQU0sTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRWxDLE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDL0IsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNyQyxNQUFNLEdBQUcsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2pDLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDckMsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUV6QyxNQUFNLEdBQUcsR0FBRyxPQUFPLE9BQU8sS0FBSyxRQUFRO1lBQ25DLENBQUMsQ0FBQyxlQUFlLE1BQU0sQ0FBQyxPQUFPLENBQUMsZUFBZTtZQUMvQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ1QsTUFBTSxJQUFJLEdBQUcsT0FBTyxHQUFHLEtBQUssUUFBUTtZQUNoQyxDQUFDLENBQUMsUUFBUSxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUc7WUFDeEIsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNULE1BQU0sTUFBTSxHQUFHLE9BQU8sS0FBSyxLQUFLLFFBQVE7WUFDcEMsQ0FBQyxDQUFDLFVBQVUsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHO1lBQzVCLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDVCxNQUFNLEdBQUcsR0FBRyxPQUFPLEVBQUUsS0FBSyxRQUFRO1lBQzlCLENBQUMsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRTtZQUNyQixDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ1QsTUFBTSxNQUFNLEdBQUcsT0FBTyxLQUFLLEtBQUssUUFBUTtZQUNwQyxDQUFDLENBQUMsVUFBVSxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDM0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUVULDRDQUE0QztRQUM1Qyx3Q0FBd0M7UUFDeEMsd0NBQXdDO1FBQ3hDLHNDQUFzQztRQUV0QyxJQUFJLFFBQVEsQ0FBQztRQUNiLElBQUksQ0FBRSxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQ3RDLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMvQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDckIsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FDeEMsQ0FBQztRQUNOLENBQUM7YUFBTSxDQUFDO1lBQ0osUUFBUSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUM7UUFDaEMsQ0FBQztRQUVELDhCQUE4QjtRQUM5QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQ3RDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxRQUFRLENBQ3hELENBQUMsQ0FBQztRQUNILE9BQU8sQ0FBQyxRQUFRLEdBQUcsU0FBUyxDQUFDO1FBRTdCLElBQUksT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ25CLE1BQU0sR0FBRyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQy9DLENBQUM7UUFDRCxPQUFPO2tCQUNHLEdBQUcsSUFBSSxNQUFNO29CQUNYLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxJQUFJLElBQUksTUFBTTtVQUM3QyxHQUFHOztTQUVKLENBQUM7SUFDTixDQUFDO0NBQ0o7QUFxSEQsTUFBTSxDQUFDLEtBQUssVUFBVSxlQUFlLENBQUMsT0FBTztJQUV6QyxNQUFNLElBQUksR0FBRztRQUNULFVBQVU7UUFDVixNQUFNO1FBQ04sMEJBQTBCO1FBQzFCLCtFQUErRTtRQUMvRSxXQUFXO0tBQ2QsQ0FBQztJQUNGLElBQUksT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2xCLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDdEIsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDL0IsQ0FBQztJQUNELElBQUksT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ25CLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDM0IsQ0FBQztJQUNELElBQUksT0FBTyxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ3BCLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDNUIsQ0FBQztJQUNELElBQUksT0FBTyxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFDM0IsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUN2QixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ3hDLENBQUM7SUFDRCxJQUFJLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNuQixJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ2hDLENBQUM7SUFDRCxJQUFJLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUNyQixJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQzdCLENBQUM7SUFDRCxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNmLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDdkIsQ0FBQztJQUNELElBQUksT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ2hCLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDeEIsQ0FBQztJQUNELElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2pCLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDekIsQ0FBQztJQUNELElBQUksT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ2YsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN2QixDQUFDO0lBQ0QsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDZixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3ZCLENBQUM7SUFDRCxJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNqQixJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3pCLENBQUM7SUFDRCxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNmLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDdkIsQ0FBQztJQUNELElBQUksT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ2YsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN2QixDQUFDO0lBQ0QsSUFBSSxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDaEIsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUN4QixDQUFDO0lBQ0QsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDZixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3ZCLENBQUM7SUFDRCxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNmLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDdkIsQ0FBQztJQUNELElBQUksT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2xCLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDMUIsQ0FBQztJQUVELG1EQUFtRDtJQUNuRCx1Q0FBdUM7SUFDdkMsb0RBQW9EO0lBQ3BELFFBQVE7SUFDUixFQUFFO0lBQ0Ysb0RBQW9EO0lBQ3BELG9EQUFvRDtJQUNwRCxvREFBb0Q7SUFDcEQsUUFBUTtJQUNSLEVBQUU7SUFDRixTQUFTO0lBQ1Qsc0RBQXNEO0lBQ3RELHFCQUFxQjtJQUNyQixtQkFBbUI7SUFDbkIsK0RBQStEO0lBQy9ELGVBQWU7SUFDZiwyQkFBMkI7SUFDM0IsOEZBQThGO0lBQzlGLEVBQUU7SUFDRiw2Q0FBNkM7SUFDN0MsOEJBQThCO0lBQzlCLEVBQUU7SUFFRixJQUFJLFNBQVMsR0FBRyxFQUFTLENBQUM7SUFFMUIsSUFBSSxPQUFPLE9BQU8sQ0FBQyxRQUFRLEtBQUssV0FBVztXQUN2QyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQztXQUNoQyxPQUFPLE9BQU8sQ0FBQyxTQUFTLEtBQUssUUFBUSxFQUN2QyxDQUFDO1FBQ0MsTUFBTSxJQUFJLEtBQUssQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO0lBQ25ELENBQUM7SUFDRCxJQUFJLE9BQU8sT0FBTyxDQUFDLFFBQVEsS0FBSyxXQUFXO1dBQ3ZDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDO1dBQ2hDLE9BQU8sT0FBTyxDQUFDLFNBQVMsS0FBSyxRQUFRO1dBQ3JDLE9BQU8sT0FBTyxDQUFDLFFBQVEsS0FBSyxRQUFRLEVBQ3RDLENBQUM7UUFDQyxNQUFNLElBQUksS0FBSyxDQUFDLGtEQUFrRCxDQUFDLENBQUM7SUFDeEUsQ0FBQztJQUNELHVEQUF1RDtJQUN2RCxxQkFBcUI7SUFDckIsSUFBSSxPQUFPLE9BQU8sQ0FBQyxRQUFRLEtBQUssV0FBVztXQUN2QyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQztXQUNoQyxPQUFPLE9BQU8sQ0FBQyxTQUFTLEtBQUssUUFBUTtXQUNyQyxPQUFPLE9BQU8sQ0FBQyxRQUFRLEtBQUssUUFBUSxFQUN0QyxDQUFDO1FBQ0MsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN2QixDQUFDO0lBQ0QsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUM7V0FDL0IsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQztXQUM3QixPQUFPLE9BQU8sQ0FBQyxRQUFRLEtBQUssUUFBUSxFQUN0QyxDQUFDO1FBQ0MsTUFBTSxJQUFJLEtBQUssQ0FBQyxrQ0FBa0MsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUM1RixDQUFDO0lBQ0Qsd0RBQXdEO0lBQ3hELHFCQUFxQjtJQUNyQixJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQztXQUMvQixPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDO1dBQzdCLE9BQU8sT0FBTyxDQUFDLFFBQVEsS0FBSyxRQUFRLEVBQ3RDLENBQUM7UUFDQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3ZCLENBQUM7SUFFRCxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQztXQUMvQixPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDO1dBQzNCLE9BQU8sT0FBTyxDQUFDLFFBQVEsS0FBSyxRQUFRLEVBQ3RDLENBQUM7UUFDQyxNQUFNLElBQUksS0FBSyxDQUFDLCtEQUErRCxDQUFDLENBQUE7SUFDcEYsQ0FBQztJQUVELHNDQUFzQztJQUN0QyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQztXQUMvQixPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUM5QixLQUFLLE1BQU0sT0FBTyxJQUFJLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNyQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3ZCLENBQUM7SUFDTCxDQUFDO0lBRUQsSUFBSSxPQUFPLE9BQU8sQ0FBQyxTQUFTLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDeEMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNyQixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNqQyxDQUFDO0lBRUQscURBQXFEO0lBQ3JELGtCQUFrQjtJQUNsQixnQkFBZ0I7SUFDaEIsc0JBQXNCO0lBQ3RCLE1BQU07SUFDTixNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztJQUU3QywwQ0FBMEM7SUFDMUMsc0JBQXNCO0lBRXRCLGdEQUFnRDtJQUNoRCx5Q0FBeUM7SUFDekMsSUFBSSxPQUFPLE9BQU8sQ0FBQyxRQUFRLEtBQUssV0FBVztXQUN2QyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQztXQUNoQyxPQUFPLE9BQU8sQ0FBQyxTQUFTLEtBQUssUUFBUTtXQUNyQyxPQUFPLE9BQU8sQ0FBQyxRQUFRLEtBQUssUUFBUSxFQUN0QyxDQUFDO1FBQ0MsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3JDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUMxRCxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQ3RCLENBQUM7SUFFRCx3REFBd0Q7SUFDeEQseUNBQXlDO0lBQ3pDLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDO1dBQy9CLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUM7V0FDN0IsT0FBTyxPQUFPLENBQUMsUUFBUSxLQUFLLFFBQVEsRUFDdEMsQ0FBQztRQUNDLGdFQUFnRTtRQUNoRSwwQkFBMEI7UUFDMUIsRUFBRSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzNELEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUMxRCxxQkFBcUI7SUFDekIsQ0FBQztJQUVELHdDQUF3QztJQUV4QyxLQUFLLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO1FBQ3RCLE9BQU8sQ0FBQyxLQUFLLENBQUMsbUNBQW1DLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO0lBQ3BFLENBQUMsQ0FBQyxDQUFDO0lBRUgsTUFBTSxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUNsQyxLQUFLLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO1lBQ3ZCLElBQUksSUFBSSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNiLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUN2QixDQUFDO2lCQUFNLENBQUM7Z0JBQ0osTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLDJCQUEyQixJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDekQsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQyxDQUFDLENBQUM7QUFFUCxDQUFDO0FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBb0JHO0FBQ0gsTUFBTSxhQUFjLFNBQVEsU0FBUyxDQUFDLGFBQWE7SUFFbEQsSUFBSSxXQUFXLEtBQUssT0FBTyxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7SUFDOUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLEtBQWU7UUFFN0MsTUFBTSxPQUFPLEdBQXNCO1lBQy9CLDRDQUE0QztZQUM1QyxTQUFTLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRTtZQUMxQixRQUFRLEVBQUUsU0FBUztZQUNuQixRQUFRLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUM7U0FDekMsQ0FBQztRQUVGLHVDQUF1QztRQUN2QyxtQkFBbUI7UUFFbkIsTUFBTSxHQUFHLEdBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUN6QyxJQUFJLE9BQU8sR0FBRyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzFCLE9BQU8sQ0FBQyxRQUFRLEdBQUcsQ0FBRSxHQUFHLENBQUUsQ0FBQztRQUMvQixDQUFDO2FBQU0sSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDL0MsT0FBTyxDQUFDLFFBQVEsR0FBRyxDQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBRSxDQUFDO1FBQ2xDLENBQUM7YUFBTSxDQUFDO1lBQ0osT0FBTyxDQUFDLFFBQVEsR0FBRyxTQUFTLENBQUM7UUFDakMsQ0FBQztRQUNELElBQUksT0FBTyxPQUFPLENBQUMsU0FBUyxLQUFLLFFBQVE7ZUFDckMsQ0FDQSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQzttQkFDaEMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUMvQixFQUFFLENBQUM7WUFDQSxNQUFNLElBQUksS0FBSyxDQUFDLDREQUE0RCxDQUFDLENBQUM7UUFDbEYsQ0FBQztRQUVELElBQUksT0FBTyxDQUFDO1FBQ1osSUFBSSxRQUFRLENBQUM7UUFDYixJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBRW5FLElBQUksT0FBTyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUMxQyxNQUFNLElBQUksS0FBSyxDQUFDLDJDQUEyQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDakcsQ0FBQztZQUNELE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDakMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQ3hCLE9BQU8sR0FBRyxJQUFJLENBQUM7WUFDbkIsQ0FBQztpQkFBTSxDQUFDO2dCQUNKLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDL0MsT0FBTyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQ3BCLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FDNUIsQ0FBQztZQUNOLENBQUM7WUFFRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUM7WUFDNUUsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDO1lBQ3RFLE1BQU0sR0FBRyxHQUFHLE1BQU0sU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUMxQyxJQUFJLEtBQUssQ0FBQztZQUVWLElBQUksQ0FBQyxHQUFHO2dCQUFFLEtBQUssR0FBRyxNQUFNLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFN0MsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNqQixNQUFNLElBQUksS0FBSyxDQUFDLCtEQUErRCxPQUFPLEVBQUUsQ0FBQyxDQUFDO1lBQzlGLENBQUM7WUFFRCxJQUFJLEdBQUc7Z0JBQUUsUUFBUSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUM7aUJBQzFCLElBQUksS0FBSztnQkFBRSxRQUFRLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQztRQUM1QyxDQUFDO1FBRUQsdURBQXVEO1FBQ3ZELHdCQUF3QjtRQUN4QixJQUFJLFFBQVE7WUFBRSxPQUFPLENBQUMsUUFBUSxHQUFHLENBQUUsUUFBUSxDQUFFLENBQUM7UUFFOUMsSUFBSSxPQUFPLE9BQU8sQ0FBQyxRQUFRLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDdkMsTUFBTSxJQUFJLEtBQUssQ0FBQyxnREFBZ0QsQ0FBQyxDQUFDO1FBQ3RFLENBQUM7UUFFRCxJQUFJLFFBQVEsQ0FBQztRQUNiLElBQUksQ0FBRSxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQ3RDLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMvQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDckIsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FDeEMsQ0FBQztRQUNOLENBQUM7YUFBTSxDQUFDO1lBQ0osUUFBUSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUM7UUFDaEMsQ0FBQztRQUVELDhCQUE4QjtRQUM5QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQ3RDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxRQUFRLENBQ3hELENBQUMsQ0FBQztRQUNILE9BQU8sQ0FBQyxRQUFRLEdBQUcsU0FBUyxDQUFDO1FBRTdCLE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDL0IsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNyQyxNQUFNLEdBQUcsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2pDLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDckMsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN6QyxNQUFNLEVBQUUsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3BDLElBQUksY0FBYyxDQUFDLEVBQUUsQ0FBQztZQUFFLE9BQU8sQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1FBQzdDLE9BQU8sQ0FBQyxRQUFRLEdBQUcsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLFdBQVcsQ0FBQztRQUNwRSxrREFBa0Q7UUFDbEQsd0RBQXdEO1FBQ3hELE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDM0MsSUFBSSxPQUFPLFFBQVEsS0FBSyxRQUFRO1lBQUUsT0FBTyxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFDOUQsT0FBTyxDQUFDLFVBQVUsR0FBRyxPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssV0FBVyxDQUFDO1FBQ3hFLHdDQUF3QztRQUN4QywwQ0FBMEM7UUFDMUMsNENBQTRDO1FBQzVDLHdDQUF3QztRQUN4QyxPQUFPLENBQUMsSUFBSSxHQUFHLE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxXQUFXLENBQUM7UUFDNUQsNENBQTRDO1FBQzVDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLFdBQVcsQ0FBQztRQUM1RCx3Q0FBd0M7UUFDeEMsMENBQTBDO1FBQzFDLHdDQUF3QztRQUN4Qyx3Q0FBd0M7UUFDeEMsOENBQThDO1FBRTlDLElBQUksT0FBTyxDQUFDLElBQUksSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDL0IsTUFBTSxJQUFJLEtBQUssQ0FBQyw2Q0FBNkMsQ0FBQyxDQUFDO1FBQ25FLENBQUM7UUFDRCxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNqQyxNQUFNLElBQUksS0FBSyxDQUFDLDRDQUE0QyxDQUFDLENBQUM7UUFDbEUsQ0FBQztRQUNELE1BQU0sZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRS9CLE1BQU0sR0FBRyxHQUFHLE9BQU8sT0FBTyxLQUFLLFFBQVE7WUFDbkMsQ0FBQyxDQUFDLGVBQWUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxlQUFlO1lBQy9DLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDVCxNQUFNLElBQUksR0FBRyxPQUFPLEdBQUcsS0FBSyxRQUFRO1lBQ2hDLENBQUMsQ0FBQyxRQUFRLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRztZQUN4QixDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ1QsTUFBTSxNQUFNLEdBQUcsT0FBTyxLQUFLLEtBQUssUUFBUTtZQUNwQyxDQUFDLENBQUMsVUFBVSxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUc7WUFDNUIsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNULE1BQU0sR0FBRyxHQUFHLE9BQU8sRUFBRSxLQUFLLFFBQVE7WUFDOUIsQ0FBQyxDQUFDLE9BQU8sTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFO1lBQ3JCLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDVCxNQUFNLE1BQU0sR0FBRyxPQUFPLEtBQUssS0FBSyxRQUFRO1lBQ3BDLENBQUMsQ0FBQyxVQUFVLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUMzQixDQUFDLENBQUMsRUFBRSxDQUFDO1FBRVQsT0FBTztrQkFDRyxHQUFHLElBQUksTUFBTTtvQkFDWCxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssSUFBSSxJQUFJLE1BQU07VUFDN0MsR0FBRzs7U0FFSixDQUFDO0lBQ04sQ0FBQztDQUNKO0FBRUQsTUFBTSxVQUFVLGNBQWMsQ0FBQyxPQUFPO0lBQ2xDLElBQUksT0FBTyxPQUFPLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDOUIsT0FBTyxLQUFLLENBQUM7SUFDakIsQ0FBQztJQUNELE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQztJQUVqQyxJQUFJLE9BQU8sRUFBRSxLQUFLLFFBQVE7V0FDbkIsQ0FBQyxFQUFFLEtBQUssTUFBTSxJQUFJLEVBQUUsS0FBSyxPQUFPO2VBQ2hDLEVBQUUsS0FBSyxPQUFPLElBQUksRUFBRSxLQUFLLFFBQVE7ZUFDakMsRUFBRSxLQUFLLFNBQVMsSUFBSSxFQUFFLEtBQUssVUFBVTtlQUNyQyxFQUFFLEtBQUssU0FBUyxJQUFJLEVBQUUsS0FBSyxVQUFVO2VBQ3JDLEVBQUUsS0FBSyxPQUFPLElBQUksRUFBRSxLQUFLLFFBQVE7ZUFDakMsRUFBRSxLQUFLLFNBQVMsSUFBSSxFQUFFLEtBQUssVUFBVSxDQUFDLEVBQzNDLENBQUM7UUFDQyxPQUFPLEtBQUssQ0FBQztJQUNqQixDQUFDO0lBQ0QsT0FBTyxJQUFJLENBQUM7QUFDaEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIlxuXG5pbXBvcnQgcGF0aCBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IGZzLCB7IHByb21pc2VzIGFzIGZzcCB9IGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHV0aWwgZnJvbSAnbm9kZTp1dGlsJztcbmltcG9ydCB7IGV4ZWNTeW5jLCBzcGF3blN5bmMsIHNwYXduIH0gZnJvbSAnbm9kZTpjaGlsZF9wcm9jZXNzJztcbmltcG9ydCB7ZW5jb2RlfSBmcm9tICdodG1sLWVudGl0aWVzJztcbmltcG9ydCB7IHJlbmRlciwgUGludG9yYUNvbmZpZyB9IGZyb20gJ0BwaW50b3JhL2NsaSdcblxuY29uc3QgX19kaXJuYW1lID0gaW1wb3J0Lm1ldGEuZGlybmFtZTtcblxuLy8gUGF0aCBuYW1lIGZvciB0aGUgbG9jYWwgY29weSBvZiBwbGFudHVtbC5qYXJcbmNvbnN0IHBsYW50dW1sSmFyID0gcGF0aC5qb2luKFxuICAgICAgICAgICAgICAgIF9fZGlybmFtZSxcbiAgICAgICAgICAgICAgICAnLi4nLFxuICAgICAgICAgICAgICAgICd2ZW5kb3InLFxuICAgICAgICAgICAgICAgICdwbGFudHVtbCcsXG4gICAgICAgICAgICAgICAgJ3BsYW50dW1sLW1pdC0xLjIwMjUuMC5qYXInKTtcblxuY29uc3QgcGx1Z2luTmFtZSA9ICdAYWthc2hhY21zL3BsdWdpbnMtZGlhZ3JhbXMnO1xuXG5pbXBvcnQgKiBhcyBha2FzaGEgZnJvbSAnYWthc2hhcmVuZGVyJztcbmltcG9ydCB7IFBsdWdpbiB9IGZyb20gJ2FrYXNoYXJlbmRlci9kaXN0L1BsdWdpbi5qcyc7XG5jb25zdCBtYWhhYmh1dGEgPSBha2FzaGEubWFoYWJodXRhO1xuXG5leHBvcnQgY2xhc3MgRGlhZ3JhbXNQbHVnaW4gZXh0ZW5kcyBQbHVnaW4ge1xuXG4gICAgI2NvbmZpZztcblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcihwbHVnaW5OYW1lKTtcbiAgICB9XG5cbiAgICBjb25maWd1cmUoY29uZmlnLCBvcHRpb25zKSB7XG4gICAgICAgIHRoaXMuI2NvbmZpZyA9IGNvbmZpZztcbiAgICAgICAgc3VwZXIub3B0aW9ucyA9IG9wdGlvbnM7IC8vID8gb3B0aW9ucyA6IHt9O1xuICAgICAgICBvcHRpb25zLmNvbmZpZyA9IGNvbmZpZztcbiAgICAgICAgY29uZmlnLmFkZE1haGFiaHV0YShtYWhhYmh1dGFBcnJheShvcHRpb25zKSk7XG4gICAgfVxuXG4gICAgZ2V0IGNvbmZpZygpIHsgcmV0dXJuIHRoaXMuI2NvbmZpZzsgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gbWFoYWJodXRhQXJyYXkob3B0aW9ucykge1xuICAgIGxldCByZXQgPSBuZXcgbWFoYWJodXRhLk1haGFmdW5jQXJyYXkocGx1Z2luTmFtZSwgb3B0aW9ucyk7XG4gICAgcmV0LmFkZE1haGFmdW5jKG5ldyBQbGFudFVNTExvY2FsKCkpO1xuICAgIHJldC5hZGRNYWhhZnVuYyhuZXcgUGludG9yYUxvY2FsKCkpO1xuICAgIHJldHVybiByZXQ7XG59O1xuXG5leHBvcnQgdHlwZSBQaW50b3JhUmVuZGVyT3B0aW9ucyA9IHtcbiAgICAvKipcbiAgICAgKiBwaW50b3JhIERTTCBjb2RlIHRvIHJlbmRlclxuICAgICAqL1xuICAgIGNvZGU6IHN0cmluZ1xuICAgIGRldmljZVBpeGVsUmF0aW8/OiBudW1iZXIgfCBudWxsXG4gICAgLyoqXG4gICAgICogVHlwZSBmb3IgdGhlIG91dHB1dCBmaWxlXG4gICAgICogXG4gICAgLy8gaW1hZ2Uvc3ZnK3htbFxuICAgIC8vIGltYWdlL2pwZWdcbiAgICAvLyBpbWFnZS9wbmdcbiAgICAgKi9cbiAgICBtaW1lVHlwZT86IHN0cmluZ1xuICAgIC8qKlxuICAgICAqIEFzc2lnbiBleHRyYSBiYWNrZ3JvdW5kIGNvbG9yXG4gICAgICovXG4gICAgYmFja2dyb3VuZENvbG9yPzogc3RyaW5nXG4gICAgcGludG9yYUNvbmZpZz86IFBhcnRpYWw8UGludG9yYUNvbmZpZz5cbiAgICAvKipcbiAgICAgKiB3aWR0aCBvZiB0aGUgb3V0cHV0LCBoZWlnaHQgd2lsbCBiZSBjYWxjdWxhdGVkIGFjY29yZGluZyB0byB0aGUgZGlhZ3JhbSBjb250ZW50IHJhdGlvXG4gICAgICovXG4gICAgd2lkdGg/OiBudW1iZXJcbiAgICAvKipcbiAgICAgKiBXaGV0aGVyIHdlIHNob3VsZCBydW4gcmVuZGVyIGluIGEgc3VicHJvY2VzcyByYXRoZXIgaW4gY3VycmVudCBwcm9jZXNzLlxuICAgICAqIElmIHlvdSBjYWxsIHRoZSBgcmVuZGVyYCBmdW5jdGlvbiwgYnkgZGVmYXVsdCB0aGlzIGlzIHRydWUsIHRvIGF2b2lkIHBvbGx1dGluZyB0aGUgZ2xvYmFsIGVudmlyb25tZW50LlxuICAgICAqL1xuICAgIHJlbmRlckluU3VicHJvY2Vzcz86IGJvb2xlYW5cblxuICAgIG91dHB1dEZOOiBzdHJpbmc7XG59O1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZG9QaW50b3JhKFxuICAgIG9wdGlvbnM6IFBpbnRvcmFSZW5kZXJPcHRpb25zXG4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCByZW5kZXJPcHRzID0gc3RydWN0dXJlZENsb25lKG9wdGlvbnMpO1xuICAgIGRlbGV0ZSByZW5kZXJPcHRzLm91dHB1dEZOO1xuXG4gICAgY29uc3QgYnVmID0gYXdhaXQgcmVuZGVyKHJlbmRlck9wdHMpO1xuXG4gICAgaWYgKG9wdGlvbnMub3V0cHV0Rk4pIHtcbiAgICAgICAgYXdhaXQgZnNwLndyaXRlRmlsZShvcHRpb25zLm91dHB1dEZOLCBidWYpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gb3V0cHV0IGZpbGUgRk4gJHt1dGlsLmluc3BlY3Qob3B0aW9ucyl9YCk7XG4gICAgfVxufVxuXG5jbGFzcyBQaW50b3JhTG9jYWwgZXh0ZW5kcyBtYWhhYmh1dGEuQ3VzdG9tRWxlbWVudCB7XG5cdGdldCBlbGVtZW50TmFtZSgpIHsgcmV0dXJuIFwiZGlhZ3JhbXMtcGludG9yYVwiOyB9XG5cbiAgICBhc3luYyBwcm9jZXNzKCRlbGVtZW50LCBtZXRhZGF0YSwgZGlydHk6IEZ1bmN0aW9uKSB7XG4gICAgICAgIGNvbnN0IG9wdGlvbnM6IFBpbnRvcmFSZW5kZXJPcHRpb25zID0ge1xuICAgICAgICAgICAgY29kZTogJGVsZW1lbnQudGV4dCgpLFxuICAgICAgICAgICAgb3V0cHV0Rk46ICRlbGVtZW50LmF0dHIoJ291dHB1dC1maWxlJylcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBpbmYgPSAgJGVsZW1lbnQuYXR0cignaW5wdXQtZmlsZScpO1xuICAgICAgICBpZiAodHlwZW9mIGluZiA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5jb2RlID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgICYmIG9wdGlvbnMuY29kZS5sZW5ndGggPj0gMVxuICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBkaWFncmFtcy1waW50b3JhIC0gZWl0aGVyIHNwZWNpZnkgaW5wdXQtZmlsZSBPUiBhIGRpYWdyYW0gYm9keSwgbm90IGJvdGhgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG9wdGlvbnMuY29kZSA9IGF3YWl0IGZzcC5yZWFkRmlsZShpbmYsICd1dGYtOCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLm91dHB1dEZOICE9PSAnc3RyaW5nJ1xuICAgICAgICAgfHwgb3B0aW9ucy5vdXRwdXRGTi5sZW5ndGggPCAxXG4gICAgICAgICkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBkaWFncmFtcy1waW50b3JhIG11c3QgaGF2ZSBvdXRwdXQtZmlsZWApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcHhyID0gJGVsZW1lbnQuYXR0cigncGl4ZWwtcmF0aW8nKTtcbiAgICAgICAgaWYgKHR5cGVvZiBweHIgPT09ICdzdHJpbmcnXG4gICAgICAgICAmJiBweHIubGVuZ3RoID49IDFcbiAgICAgICAgKSB7XG4gICAgICAgICAgICBjb25zdCByID0gTnVtYmVyLnBhcnNlRmxvYXQocHhyKTtcbiAgICAgICAgICAgIGlmIChpc05hTihyKSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgZGlhZ3JhbXMtcGludG9yYTogcGl4ZWwtcmF0aW8gaXMgbm90IGEgbnVtYmVyICR7cHhyfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3B0aW9ucy5kZXZpY2VQaXhlbFJhdGlvID0gcjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG1pbWUgPSAkZWxlbWVudC5hdHRyKCdtaW1lLXR5cGUnKTtcbiAgICAgICAgaWYgKHR5cGVvZiBtaW1lID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICAgIG1pbWUgPT09ICdpbWFnZS9zdmcreG1sJ1xuICAgICAgICAgICAgIHx8IG1pbWUgPT09ICdpbWFnZS9qcGVnJ1xuICAgICAgICAgICAgIHx8IG1pbWUgPT09ICdpbWFnZS9wbmcnXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICBvcHRpb25zLm1pbWVUeXBlID0gbWltZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIE1JTUUgdHlwZSAke3V0aWwuaW5zcGVjdChtaW1lKX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGJnQ29sb3IgPSAkZWxlbWVudC5hdHRyKCdiZy1jb2xvcicpO1xuICAgICAgICBpZiAodHlwZW9mIGJnQ29sb3IgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBvcHRpb25zLmJhY2tncm91bmRDb2xvciA9IGJnQ29sb3I7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB3aWR0aCA9ICRlbGVtZW50LmF0dHIoJ3dpZHRoJyk7XG4gICAgICAgIGlmICh0eXBlb2Ygd2lkdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBvcHRpb25zLndpZHRoID0gTnVtYmVyLnBhcnNlRmxvYXQod2lkdGgpO1xuICAgICAgICAgICAgaWYgKGlzTmFOKG9wdGlvbnMud2lkdGgpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBkaWFncmFtcy1waW50b3JhOiB3aWR0aCBpcyBub3QgYSBudW1iZXIgJHt3aWR0aH1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIG9wdGlvbnMucmVuZGVySW5TdWJwcm9jZXNzID0gZmFsc2U7XG5cbiAgICAgICAgY29uc3QgYnVmID0gYXdhaXQgcmVuZGVyKG9wdGlvbnMpO1xuXG4gICAgICAgIGNvbnN0IGlkID0gJGVsZW1lbnQuYXR0cignaWQnKTtcbiAgICAgICAgY29uc3QgY2xhenogPSAkZWxlbWVudC5hdHRyKCdjbGFzcycpO1xuICAgICAgICBjb25zdCBhbHQgPSAkZWxlbWVudC5hdHRyKCdhbHQnKTtcbiAgICAgICAgY29uc3QgdGl0bGUgPSAkZWxlbWVudC5hdHRyKCd0aXRsZScpO1xuICAgICAgICBjb25zdCBjYXB0aW9uID0gJGVsZW1lbnQuYXR0cignY2FwdGlvbicpO1xuXG4gICAgICAgIGNvbnN0IGNhcCA9IHR5cGVvZiBjYXB0aW9uID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgPyBgPGZpZ2NhcHRpb24+JHtlbmNvZGUoY2FwdGlvbil9PC9maWdjYXB0aW9uPmBcbiAgICAgICAgICAgIDogJyc7XG4gICAgICAgIGNvbnN0IFRhbHQgPSB0eXBlb2YgYWx0ID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgPyBgYWx0PVwiJHtlbmNvZGUoYWx0KX1cImBcbiAgICAgICAgICAgIDogJyc7XG4gICAgICAgIGNvbnN0IFR0aXRsZSA9IHR5cGVvZiB0aXRsZSA9PT0gJ3N0cmluZydcbiAgICAgICAgICAgID8gYHRpdGxlPVwiJHtlbmNvZGUodGl0bGUpfVwiYFxuICAgICAgICAgICAgOiAnJztcbiAgICAgICAgY29uc3QgVGlkID0gdHlwZW9mIGlkID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgPyBgaWQ9XCIke2VuY29kZShpZCl9YFxuICAgICAgICAgICAgOiAnJztcbiAgICAgICAgY29uc3QgVGNsYXp6ID0gdHlwZW9mIGNsYXp6ID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgPyBgY2xhc3M9XCIke2VuY29kZShjbGF6eil9YFxuICAgICAgICAgICAgOiAnJztcblxuICAgICAgICAvLyBvcHRpb25zLm91dHB1dEZOIHdhcyBzZXQgZnJvbSBvdXRwdXQtZmlsZVxuICAgICAgICAvLyBUaGlzIGNyZWF0ZXMgdnBhdGhPdXQgZnJvbSB0aGF0IHZhbHVlXG4gICAgICAgIC8vIFRoaXMgY29tcHV0cyBmc3BhdGhPdXQsIHdoaWNoIGlzIHRoZW5cbiAgICAgICAgLy8gYXNzaWduZWQgYmFjayBpbnRvIG9wdGlvbnMub3V0cHV0Rk5cblxuICAgICAgICBsZXQgdnBhdGhPdXQ7XG4gICAgICAgIGlmICghIHBhdGguaXNBYnNvbHV0ZShvcHRpb25zLm91dHB1dEZOKSkge1xuICAgICAgICAgICAgbGV0IGRpciA9IHBhdGguZGlybmFtZShtZXRhZGF0YS5kb2N1bWVudC5wYXRoKTtcbiAgICAgICAgICAgIHZwYXRoT3V0ID0gcGF0aC5ub3JtYWxpemUoXG4gICAgICAgICAgICAgICAgcGF0aC5qb2luKCcvJywgZGlyLCBvcHRpb25zLm91dHB1dEZOKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZwYXRoT3V0ID0gb3B0aW9ucy5vdXRwdXRGTjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENvbXB1dGUgZnNwYXRoIGZvciB2cGF0aE91dFxuICAgICAgICBjb25zdCBmc3BhdGhPdXQgPSBwYXRoLm5vcm1hbGl6ZShwYXRoLmpvaW4oXG4gICAgICAgICAgICB0aGlzLmFycmF5Lm9wdGlvbnMuY29uZmlnLnJlbmRlckRlc3RpbmF0aW9uLCB2cGF0aE91dFxuICAgICAgICApKTtcbiAgICAgICAgb3B0aW9ucy5vdXRwdXRGTiA9IGZzcGF0aE91dDtcblxuICAgICAgICBpZiAob3B0aW9ucy5vdXRwdXRGTikge1xuICAgICAgICAgICAgYXdhaXQgZnNwLndyaXRlRmlsZShvcHRpb25zLm91dHB1dEZOLCBidWYpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBgXG4gICAgICAgIDxmaWd1cmUgJHtUaWR9ICR7VGNsYXp6fT5cbiAgICAgICAgPGltZyBzcmM9XCIke2VuY29kZSh2cGF0aE91dCl9XCIgJHtUYWx0fSAke1R0aXRsZX0vPlxuICAgICAgICAke2NhcH1cbiAgICAgICAgPC9maWd1cmU+XG4gICAgICAgIGA7XG4gICAgfVxufVxuXG4vKipcbiAqIE9wdGlvbnMgb2JqZWN0IHRoYXQgaXMgY29udmVydGVkIGludG8gcGxhbnR1bWwuamFyIG9wdGlvbnMuXG4gKi9cbmV4cG9ydCB0eXBlIGRvUGxhbnRVTUxPcHRpb25zID0ge1xuICAgIC8qKlxuICAgICAqIFRoZSBQbGFudFVNTCBkaWFncmFtIHRleHQgdG8gdXNlXG4gICAgICovXG4gICAgaW5wdXRCb2R5Pzogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogWmVybyBvciBtb3JlIGZpbGUgbmFtZXMgZm9yIGZpbGVzIHRvIHJlbmRlclxuICAgICAqL1xuICAgIGlucHV0Rk5zPzogc3RyaW5nW107XG5cbiAgICAvKipcbiAgICAgKiBQb3NzaWJsZSBmaWxlIHRvIHdyaXRlIG91dHB1dCBpbnRvXG4gICAgICovXG4gICAgb3V0cHV0Rk4/OiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBUbyB1c2UgYSBzcGVjaWZpYyBjaGFyYWN0ZXIgc2V0LiBEZWZhdWx0OiBVVEYtOFxuICAgICAqL1xuICAgIGNoYXJzZXQ/OiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBUbyB1c2UgZGFyayBtb2RlIGZvciBkaWFncmFtc1xuICAgICAqL1xuICAgIGRhcmttb2RlPzogYm9vbGVhbjtcblxuICAgIC8qKlxuICAgICAqIFRvIGdlbmVyYXRlIGludGVybWVkaWF0ZSBzdmVrIGZpbGVzXG4gICAgICovXG4gICAgZGVidWdzdmVrPzogYm9vbGVhbjtcblxuICAgIC8qKlxuICAgICAqIFwiZXhhbXBsZS5wdW1sXCIgVG8gb3ZlcnJpZGUgJWZpbGVuYW1lJSB2YXJpYWJsZVxuICAgICAqL1xuICAgIGZpbGVOYW1lT3ZlcnJpZGU/OiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBUbyB1c2UgKE4pIHRocmVhZHMgZm9yIHByb2Nlc3NpbmcuICBVc2UgXCJhdXRvXCIgZm9yIDQgdGhyZWFkcy5cbiAgICAgKi9cbiAgICBuYnRocmVhZD86IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIFRvIE5PVCBleHBvcnQgbWV0YWRhdGEgaW4gUE5HL1NWRyBnZW5lcmF0ZWQgZmlsZXNcbiAgICAgKi9cbiAgICBub21ldGFkYXRhPzogYm9vbGVhbjtcblxuICAgIC8qKlxuICAgICAqIFRvIGdlbmVyYXRlIGltYWdlcyBpbiB0aGUgc3BlY2lmaWVkIGRpcmVjdG9yeVxuICAgICAqL1xuICAgIG91dHB1dERpcj86IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIFRvIGdlbmVyYXRlIGltYWdlcyB1c2luZyBFUFMgZm9ybWF0XG4gICAgICovXG4gICAgdGVwcz86IGJvb2xlYW47XG5cbiAgICAvKipcbiAgICAgKiBUbyBnZW5lcmF0ZSBIVE1MIGZpbGUgZm9yIGNsYXNzIGRpYWdyYW1cbiAgICAgKi9cbiAgICB0aHRtbD86IGJvb2xlYW47XG5cbiAgICAvKipcbiAgICAgKiBUbyBnZW5lcmF0ZSBpbWFnZXMgdXNpbmcgTGFUZVgvVGlreiBmb3JtYXRcbiAgICAgKi9cbiAgICB0bGF0ZXg/OiBib29sZWFuO1xuXG4gICAgLyoqXG4gICAgICogVG8gZ2VuZXJhdGUgaW1hZ2VzIHVzaW5nIFBERiBmb3JtYXRcbiAgICAgKi9cbiAgICB0cGRmPzogYm9vbGVhbjtcblxuICAgIC8qKlxuICAgICAqIFRvIGdlbmVyYXRlIGltYWdlcyB1c2luZyBQTkcgZm9ybWF0IChkZWZhdWx0KVxuICAgICAqL1xuICAgIHRwbmc/OiBib29sZWFuO1xuXG4gICAgLyoqXG4gICAgICogVG8gZ2VuZXJhdGUgU0NYTUwgZmlsZSBmb3Igc3RhdGUgZGlhZ3JhbVxuICAgICAqL1xuICAgIHRzY3htbD86IGJvb2xlYW47XG5cbiAgICAvKipcbiAgICAgKiBUbyBnZW5lcmF0ZSBpbWFnZXMgdXNpbmcgU1ZHIGZvcm1hdFxuICAgICAqL1xuICAgIHRzdmc/OiBib29sZWFuO1xuXG4gICAgLyoqXG4gICAgICogVG8gZ2VuZXJhdGUgaW1hZ2VzIHdpdGggQVNDSUkgYXJ0XG4gICAgICovXG4gICAgdHR4dD86IGJvb2xlYW47XG5cbiAgICAvKipcbiAgICAgKiBUbyBnZW5lcmF0ZSBpbWFnZXMgd2l0aCBBU0NJSSBhcnQgdXNpbmcgVW5pY29kZSBjaGFyYWN0ZXJzXG4gICAgICovXG4gICAgdHV0eHQ/OiBib29sZWFuO1xuXG4gICAgLyoqXG4gICAgICogVG8gZ2VuZXJhdGUgaW1hZ2VzIHVzaW5nIFZEWCBmb3JtYXRcbiAgICAgKi9cbiAgICB0dmR4PzogYm9vbGVhbjtcblxuICAgIC8qKlxuICAgICAqIFRvIGdlbmVyYXRlIFhNSSBmaWxlIGZvciBjbGFzcyBkaWFncmFtXG4gICAgICovXG4gICAgdHhtaT86IGJvb2xlYW47XG5cbiAgICAvKipcbiAgICAgKiBUbyBoYXZlIGxvZyBpbmZvcm1hdGlvblxuICAgICAqL1xuICAgIHZlcmJvc2U/OiBib29sZWFuO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZG9QbGFudFVNTExvY2FsKG9wdGlvbnMpIHtcblxuICAgIGNvbnN0IGFyZ3MgPSBbXG4gICAgICAgIC8vICdqYXZhJyxcbiAgICAgICAgJy1qYXInLFxuICAgICAgICAnLURqYXZhLmF3dC5oZWFkbGVzcz10cnVlJyxcbiAgICAgICAgJy0tYWRkLW9wZW5zPWphdmEueG1sL2NvbS5zdW4ub3JnLmFwYWNoZS54YWxhbi5pbnRlcm5hbC54c2x0Yy50cmF4PUFMTC1VTk5BTUVEJyxcbiAgICAgICAgcGxhbnR1bWxKYXIsXG4gICAgXTtcbiAgICBpZiAob3B0aW9ucy5jaGFyc2V0KSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLWNoYXJzZXQnKTtcbiAgICAgICAgYXJncy5wdXNoKG9wdGlvbnMuY2hhcnNldCk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLmRhcmttb2RlKSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLWRhcmttb2RlJyk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLmRlYnVnc3Zlaykge1xuICAgICAgICBhcmdzLnB1c2goJy1kZWJ1Z3N2ZWsnKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMuZmlsZU5hbWVPdmVycmlkZSkge1xuICAgICAgICBhcmdzLnB1c2goJy1maWxlbmFtZScpO1xuICAgICAgICBhcmdzLnB1c2gob3B0aW9ucy5maWxlTmFtZU92ZXJyaWRlKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMubmJ0aHJlYWQpIHtcbiAgICAgICAgYXJncy5wdXNoKCctbmJ0aHJlYWQnKTtcbiAgICAgICAgYXJncy5wdXNoKG9wdGlvbnMubmJ0aHJlYWQpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy5ub21ldGFkYXRhKSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLW5vbWV0YWRhdGEnKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMudGVwcykge1xuICAgICAgICBhcmdzLnB1c2goJy10ZXBzJyk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnRodG1sKSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLXRodG1sJyk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnRsYXRleCkge1xuICAgICAgICBhcmdzLnB1c2goJy10bGF0ZXgnKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMudHBkZikge1xuICAgICAgICBhcmdzLnB1c2goJy10cGRmJyk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnRwbmcpIHtcbiAgICAgICAgYXJncy5wdXNoKCctdHBuZycpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy50c2N4bWwpIHtcbiAgICAgICAgYXJncy5wdXNoKCctdHNjeG1sJyk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnRzdmcpIHtcbiAgICAgICAgYXJncy5wdXNoKCctdHN2ZycpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy50dHh0KSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLXR0eHQnKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMudHV0eHQpIHtcbiAgICAgICAgYXJncy5wdXNoKCctdHV0eHQnKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMudHZkeCkge1xuICAgICAgICBhcmdzLnB1c2goJy10dmR4Jyk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnR4bWkpIHtcbiAgICAgICAgYXJncy5wdXNoKCctdHhtaScpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy52ZXJib3NlKSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLXZlcmJvc2UnKTtcbiAgICB9XG5cbiAgICAvLyAwIGlucHV0Rk5zIHJlcXVpcmVzIGlucHV0Qm9keSwgcmVxdWlyZXMgb3V0cHV0Rk5cbiAgICAvLyBjaGlsZC5zdGRpbi53cml0ZS9lbmQgd2l0aCBpbnB1dEJvZHlcbiAgICAvLyBjaGlsZC5zdGRvdXQucGlwZShmcy5jcmVhdGVXcml0ZVN0cmVhbShvdXRwdXRGTikpXG4gICAgLy8gLXBpcGVcbiAgICAvL1xuICAgIC8vIDEgaW5wdXRGTiwgbm8vaWdub3JlIGlucHV0Qm9keSwgcmVxdWlyZXMgb3V0cHV0Rk5cbiAgICAvLyBmcy5jcmVhdGVSZWFkU3RyZWFtKGlucHV0Rk4pLnBpcGUoY2hpbGQuc3RkaW4pID8/XG4gICAgLy8gY2hpbGQuc3Rkb3V0LnBpcGUoZnMuY3JlYXRlV3JpdGVTdHJlYW0ob3V0cHV0Rk4pKVxuICAgIC8vIC1waXBlXG4gICAgLy9cbiAgICAvLyBJR05PUkVcbiAgICAvLyBJR05PUkUgZWl0aGVyIDAgaW5wdXQgRk5zICYgaW5wdXRCb2R5LCBvciAxIGlucHV0Rk5cbiAgICAvLyBJR05PUkUgbm8gb3V0cHV0Rk5cbiAgICAvLyBJR05PUkUgLXRzdmcgc2V0XG4gICAgLy8gSUdOT1JFIFJlYWQgc3Rkb3V0IGludG8gYSBCdWZmZXIsIHRoYXQncyBjb252ZXJ0ZWQgdG8gc3RyaW5nXG4gICAgLy8gSUdOT1JFIC1waXBlXG4gICAgLy8gSUdOT1JFIFJldHVybiB0aGUgc3RyaW5nXG4gICAgLy8gU0VFIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzE0MjY5MjMzL25vZGUtanMtaG93LXRvLXJlYWQtYS1zdHJlYW0taW50by1hLWJ1ZmZlclxuICAgIC8vXG4gICAgLy8gbXVsdGlwbGUgaW5wdXRGTnMgLi4gb3B0aW9uYWwgb3V0cHV0LWRpcidzXG4gICAgLy8gQm90aCBnbyBvbiB0aGUgY29tbWFuZC1saW5lXG4gICAgLy9cblxuICAgIGxldCBzcGF3bm9wdHMgPSB7fSBhcyBhbnk7XG5cbiAgICBpZiAodHlwZW9mIG9wdGlvbnMuaW5wdXRGTnMgPT09ICd1bmRlZmluZWQnXG4gICAgICYmICFBcnJheS5pc0FycmF5KG9wdGlvbnMuaW5wdXRGTnMpXG4gICAgICYmIHR5cGVvZiBvcHRpb25zLmlucHV0Qm9keSAhPT0gJ3N0cmluZydcbiAgICApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBwbGFudHVtbCAtIG5vIGlucHV0IHNvdXJjZXNgKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBvcHRpb25zLmlucHV0Rk5zID09PSAndW5kZWZpbmVkJ1xuICAgICAmJiAhQXJyYXkuaXNBcnJheShvcHRpb25zLmlucHV0Rk5zKVxuICAgICAmJiB0eXBlb2Ygb3B0aW9ucy5pbnB1dEJvZHkgPT09ICdzdHJpbmcnXG4gICAgICYmIHR5cGVvZiBvcHRpb25zLm91dHB1dEZOICE9PSAnc3RyaW5nJ1xuICAgICkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sIC0gd2l0aCBpbnB1dEJvZHksIG5vIG91dHB1dCBkZXN0aW5hdGlvbmApO1xuICAgIH1cbiAgICAvLyBObyBmaWxlIG5hbWVzLCBidXQgYW4gaW5wdXRCb2R5LCBhbmQgYW4gb3V0cHV0IGZpbGUsXG4gICAgLy8gbWVhbnMgd2UncmUgcGlwaW5nXG4gICAgaWYgKHR5cGVvZiBvcHRpb25zLmlucHV0Rk5zID09PSAndW5kZWZpbmVkJ1xuICAgICAmJiAhQXJyYXkuaXNBcnJheShvcHRpb25zLmlucHV0Rk5zKVxuICAgICAmJiB0eXBlb2Ygb3B0aW9ucy5pbnB1dEJvZHkgPT09ICdzdHJpbmcnXG4gICAgICYmIHR5cGVvZiBvcHRpb25zLm91dHB1dEZOID09PSAnc3RyaW5nJ1xuICAgICkge1xuICAgICAgICBhcmdzLnB1c2goJy1waXBlJyk7XG4gICAgfVxuICAgIGlmIChBcnJheS5pc0FycmF5KG9wdGlvbnMuaW5wdXRGTnMpXG4gICAgICYmIG9wdGlvbnMuaW5wdXRGTnMubGVuZ3RoID09PSAxXG4gICAgICYmIHR5cGVvZiBvcHRpb25zLm91dHB1dEZOICE9PSAnc3RyaW5nJ1xuICAgICkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sIC0gd2l0aCBvbmUgaW5wdXQgZmlsZSAke29wdGlvbnMuaW5wdXRGTnNbMF19IG5vIG91dHB1dCBmaWxlYCk7XG4gICAgfVxuICAgIC8vIE9uZSBmaWxlIG5hbWVzLCBpZ25vcmUgaW5wdXRCb2R5LCBhbmQgYW4gb3V0cHV0IGZpbGUsXG4gICAgLy8gbWVhbnMgd2UncmUgcGlwaW5nXG4gICAgaWYgKEFycmF5LmlzQXJyYXkob3B0aW9ucy5pbnB1dEZOcylcbiAgICAgJiYgb3B0aW9ucy5pbnB1dEZOcy5sZW5ndGggPT09IDFcbiAgICAgJiYgdHlwZW9mIG9wdGlvbnMub3V0cHV0Rk4gPT09ICdzdHJpbmcnXG4gICAgKSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLXBpcGUnKTtcbiAgICB9XG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheShvcHRpb25zLmlucHV0Rk5zKVxuICAgICAmJiBvcHRpb25zLmlucHV0Rk5zLmxlbmd0aCA+IDFcbiAgICAgJiYgdHlwZW9mIG9wdGlvbnMub3V0cHV0Rk4gPT09ICdzdHJpbmcnXG4gICAgKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgcGxhbnR1bWwgLSB3aXRoIG11bHRpcGxlIGlucHV0IGZpbGVzLCBvdXRwdXQgZmlsZSBub3QgYWxsb3dlZGApXG4gICAgfVxuXG4gICAgLy8gbXVsdGlwbGUgZmlsZSBuYW1lcywgcHVzaCBvbnRvIGFyZ3NcbiAgICBpZiAoQXJyYXkuaXNBcnJheShvcHRpb25zLmlucHV0Rk5zKVxuICAgICAmJiBvcHRpb25zLmlucHV0Rk5zLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yIChjb25zdCBpbnB1dEZOIG9mIG9wdGlvbnMuaW5wdXRGTnMpIHtcbiAgICAgICAgICAgIGFyZ3MucHVzaChpbnB1dEZOKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5vdXRwdXREaXIgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLW91dHB1dCcpO1xuICAgICAgICBhcmdzLnB1c2gob3B0aW9ucy5vdXRwdXREaXIpO1xuICAgIH1cblxuICAgIC8vIE5vdyB0aGF0IHRoZSBjb21tYW5kIGFyZ3MgYW5kIHNwYXdub3B0cyBhcmUgc2V0IHVwXG4gICAgLy8gcnVuIHRoZSBjb21tYW5kXG4gICAgLy8gY29uc29sZS5sb2coe1xuICAgIC8vICAgICBzcGF3bm9wdHMsIGFyZ3NcbiAgICAvLyB9KTtcbiAgICBjb25zdCBjaGlsZCA9IHNwYXduKCdqYXZhJywgYXJncywgc3Bhd25vcHRzKTtcblxuICAgIC8vIE5leHQsIHNldCB1cCBzdGRpbi9zdGRvdXQgcGlwZXMgaW4gY2FzZVxuICAgIC8vIG9mIHVzaW5nIC1waXBlIG1vZGVcblxuICAgIC8vIE5vIGlucHV0IGZpbGVzLCB3aXRoIGlucHV0Qm9keSwgYW5kIG91dHB1dEZOLFxuICAgIC8vIHNldCB1cCB0aGUgcGlwaW5nIGZyb20gaW5wdXQgdG8gb3V0cHV0XG4gICAgaWYgKHR5cGVvZiBvcHRpb25zLmlucHV0Rk5zID09PSAndW5kZWZpbmVkJ1xuICAgICAmJiAhQXJyYXkuaXNBcnJheShvcHRpb25zLmlucHV0Rk5zKVxuICAgICAmJiB0eXBlb2Ygb3B0aW9ucy5pbnB1dEJvZHkgPT09ICdzdHJpbmcnXG4gICAgICYmIHR5cGVvZiBvcHRpb25zLm91dHB1dEZOID09PSAnc3RyaW5nJ1xuICAgICkge1xuICAgICAgICBjaGlsZC5zdGRpbi53cml0ZShvcHRpb25zLmlucHV0Qm9keSk7XG4gICAgICAgIGNoaWxkLnN0ZG91dC5waXBlKGZzLmNyZWF0ZVdyaXRlU3RyZWFtKG9wdGlvbnMub3V0cHV0Rk4pKTtcbiAgICAgICAgY2hpbGQuc3RkaW4uZW5kKCk7XG4gICAgfVxuXG4gICAgLy8gT25lIGZpbGUgbmFtZXMsIGlnbm9yZSBpbnB1dEJvZHksIGFuZCBhbiBvdXRwdXQgZmlsZSxcbiAgICAvLyBzZXQgdXAgdGhlIHBpcGluZyBmcm9tIGlucHV0IHRvIG91dHB1dFxuICAgIGlmIChBcnJheS5pc0FycmF5KG9wdGlvbnMuaW5wdXRGTnMpXG4gICAgICYmIG9wdGlvbnMuaW5wdXRGTnMubGVuZ3RoID09PSAxXG4gICAgICYmIHR5cGVvZiBvcHRpb25zLm91dHB1dEZOID09PSAnc3RyaW5nJ1xuICAgICkge1xuICAgICAgICAvLyBjb25zdCBpbnAgPSBhd2FpdCBmc3AucmVhZEZpbGUob3B0aW9ucy5pbnB1dEZOc1swXSwgJ3V0Zi04Jyk7XG4gICAgICAgIC8vIGNoaWxkLnN0ZGluLndyaXRlKGlucCk7XG4gICAgICAgIGZzLmNyZWF0ZVJlYWRTdHJlYW0ob3B0aW9ucy5pbnB1dEZOc1swXSkucGlwZShjaGlsZC5zdGRpbik7XG4gICAgICAgIGNoaWxkLnN0ZG91dC5waXBlKGZzLmNyZWF0ZVdyaXRlU3RyZWFtKG9wdGlvbnMub3V0cHV0Rk4pKTtcbiAgICAgICAgLy8gY2hpbGQuc3RkaW4uZW5kKCk7XG4gICAgfVxuXG4gICAgLy8gRmluYWxseSwgd2FpdCBmb3IgdGhlIGNoaWxkIHRvIGZpbmlzaFxuXG4gICAgY2hpbGQub24oJ2Vycm9yJywgKGVycikgPT4ge1xuICAgICAgICBjb25zb2xlLmVycm9yKGBwbGFudHVtbCBFUlJPUiBpbiBjaGlsZCBwcm9jZXNzICR7ZXJyLm1lc3NhZ2V9YCk7XG4gICAgfSk7XG5cbiAgICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGNoaWxkLm9uKCdjbG9zZScsIChjb2RlKSA9PiB7XG4gICAgICAgICAgICBpZiAoY29kZSA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUodW5kZWZpbmVkKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihgcGxhbnR1bWwgZmFpbCB3aXRoIGNvZGUgJHtjb2RlfWApKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbn1cblxuLyoqXG4gKiBIYW5kbGUgY29udmVydGluZyBhIHNpbmdsZSBQbGFudFVNTCBkaWFncmFtIGZvclxuICogZGlzcGxheSBpbiBhIGRvY3VtZW50LlxuICogXG4gKiBUaGUgZG9jdW1lbnQgZGVzY3JpcHRpb24gaXMgZWl0aGVyIGlubGluZVxuICogdG8gdGhlIDxkaWFncmFtcy1wbGFudHVtbD4gdGFnLCBvciBlbHNlIGEgc2luZ2xlXG4gKiBpbnB1dCBmaWxlIGluIHRoZSBpbnB1dC1maWxlIGF0dHJpYnV0ZS5cbiAqIFxuICogVGhlcmUgaXMgYSBzaW5nbGUgb3V0cHV0LWZpbGUgYXR0cmlidXRlIHRvXG4gKiBmb3IgYSBmaWxlIHRvIHJlY2VpdmUgYXMgb3V0cHV0LiAgVGhpcyBmaWxlXG4gKiBpcyB3cml0dGVuIGRpcmVjdGx5IHRvIHRoZSByZW5kZXJpbmdPdXRwdXQgZGlyZWN0b3J5LlxuICogXG4gKiBUaGlzIHdpbGwgc3VwcG9ydCBvbmx5IFBORyBhbmQgU1ZHIG91dHB1dCBmb3JtYXRzLlxuICogXG4gKiBUaGUgb3V0cHV0LWZpbGUgaXMgYSBWUGF0aCBzcGVjaWZ5aW5nIGFuXG4gKiBvdXRwdXQgZGlyZWN0b3J5IGxvY2F0aW9uLlxuICogXG4gKiBpc0Fic29sdXRlKG91dHB1dC1maWxlKSAtIG1lYW5zIGl0IGlzIHJvb3RlZFxuICogdG8gdGhlIG91dHB1dCBkaXJlY3RvcnkuICBPdGhlcndpc2UgaXQgaXMgcmVsYXRpdmVcbiAqIHRvIHRoZSBkaXJuYW1lKG1ldGFkYXRhLmRvY3VtZW50LnBhdGgpLlxuICovXG5jbGFzcyBQbGFudFVNTExvY2FsIGV4dGVuZHMgbWFoYWJodXRhLkN1c3RvbUVsZW1lbnQge1xuXG5cdGdldCBlbGVtZW50TmFtZSgpIHsgcmV0dXJuIFwiZGlhZ3JhbXMtcGxhbnR1bWxcIjsgfVxuICAgIGFzeW5jIHByb2Nlc3MoJGVsZW1lbnQsIG1ldGFkYXRhLCBkaXJ0eTogRnVuY3Rpb24pIHtcblxuICAgICAgICBjb25zdCBvcHRpb25zOiBkb1BsYW50VU1MT3B0aW9ucyA9IHtcbiAgICAgICAgICAgIC8vIFVzaW5nIC50ZXh0KCkgZWxpbWluYXRlcyBIVE1MIGZvcm1hdHRpbmcuXG4gICAgICAgICAgICBpbnB1dEJvZHk6ICRlbGVtZW50LnRleHQoKSxcbiAgICAgICAgICAgIGlucHV0Rk5zOiB1bmRlZmluZWQsXG4gICAgICAgICAgICBvdXRwdXRGTjogJGVsZW1lbnQuYXR0cignb3V0cHV0LWZpbGUnKVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEVuc3VyZSB0aGVyZSBpcyBlaXRoZXIgYW4gaW5wdXQtZmlsZVxuICAgICAgICAvLyBvciBhbiBpbnB1dCBib2R5XG5cbiAgICAgICAgY29uc3QgaW5mID0gICRlbGVtZW50LmF0dHIoJ2lucHV0LWZpbGUnKTtcbiAgICAgICAgaWYgKHR5cGVvZiBpbmYgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBvcHRpb25zLmlucHV0Rk5zID0gWyBpbmYgXTtcbiAgICAgICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGluZikgJiYgaW5mLmxlbmd0aCA+PSAxKSB7XG4gICAgICAgICAgICBvcHRpb25zLmlucHV0Rk5zID0gWyBpbmZbMF0gXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9wdGlvbnMuaW5wdXRGTnMgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLmlucHV0Qm9keSAhPT0gJ3N0cmluZydcbiAgICAgICAgICYmIChcbiAgICAgICAgICAgICFBcnJheS5pc0FycmF5KG9wdGlvbnMuaW5wdXRGTnMpXG4gICAgICAgICB8fCBvcHRpb25zLmlucHV0Rk5zLmxlbmd0aCA8PSAwXG4gICAgICAgICkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgUGxhbnRVTUxMb2NhbCBvbmUgaW5wdXQgZmlsZSBvciBpbmxpbmUgZGlhZ3JhbSBpcyByZXF1aXJlZGApO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IHZwYXRoSW47XG4gICAgICAgIGxldCBmc3BhdGhJbjtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkob3B0aW9ucy5pbnB1dEZOcykgJiYgb3B0aW9ucy5pbnB1dEZOcy5sZW5ndGggPT09IDEpIHtcblxuICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLmlucHV0Rk5zWzBdICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgUGxhbnRVTUxMb2NhbCBubyBpbnB1dCBmaWxlIEZOIGdpdmVuIGluICR7dXRpbC5pbnNwZWN0KG9wdGlvbnMuaW5wdXRGTnMpfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgaW5GTiA9IG9wdGlvbnMuaW5wdXRGTnNbMF07XG4gICAgICAgICAgICBpZiAocGF0aC5pc0Fic29sdXRlKGluRk4pKSB7XG4gICAgICAgICAgICAgICAgdnBhdGhJbiA9IGluRk47XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGxldCBkaXIgPSBwYXRoLmRpcm5hbWUobWV0YWRhdGEuZG9jdW1lbnQucGF0aCk7XG4gICAgICAgICAgICAgICAgdnBhdGhJbiA9IHBhdGgubm9ybWFsaXplKFxuICAgICAgICAgICAgICAgICAgICBwYXRoLmpvaW4oJy8nLCBkaXIsIGluRk4pXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgZG9jdW1lbnRzID0gdGhpcy5hcnJheS5vcHRpb25zLmNvbmZpZy5ha2FzaGEuZmlsZWNhY2hlLmRvY3VtZW50c0NhY2hlO1xuICAgICAgICAgICAgY29uc3QgYXNzZXRzID0gdGhpcy5hcnJheS5vcHRpb25zLmNvbmZpZy5ha2FzaGEuZmlsZWNhY2hlLmFzc2V0c0NhY2hlO1xuICAgICAgICAgICAgY29uc3QgZG9jID0gYXdhaXQgZG9jdW1lbnRzLmZpbmQodnBhdGhJbik7XG4gICAgICAgICAgICBsZXQgYXNzZXQ7XG5cbiAgICAgICAgICAgIGlmICghZG9jKSBhc3NldCA9IGF3YWl0IGFzc2V0cy5maW5kKHZwYXRoSW4pO1xuICAgXG4gICAgICAgICAgICBpZiAoIWRvYyAmJiAhYXNzZXQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFBsYW50VU1MTG9jYWwgbm8gcGxhbnR1bWwgYXNzZXQgb3IgZG9jdW1lbnQgZmlsZSAgZm91bmQgZm9yICR7dnBhdGhJbn1gKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGRvYykgZnNwYXRoSW4gPSBkb2MuZnNwYXRoO1xuICAgICAgICAgICAgZWxzZSBpZiAoYXNzZXQpIGZzcGF0aEluID0gYXNzZXQuZnNwYXRoO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSWYgdGhlcmUgd2FzIGFuIGlucHV0IGZpbGUsIHJlY29yZCBpdHMgZnVsbCBwYXRobmFtZVxuICAgICAgICAvLyBhcyB0aGUgaW5wdXRGTnMgZW50cnlcbiAgICAgICAgaWYgKGZzcGF0aEluKSBvcHRpb25zLmlucHV0Rk5zID0gWyBmc3BhdGhJbiBdO1xuXG4gICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5vdXRwdXRGTiAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgUGxhbnRVTUxMb2NhbCBubyBvdXRwdXQgZmlsZSBuYW1lIHdhcyBzdXBwbGllZGApO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IHZwYXRoT3V0O1xuICAgICAgICBpZiAoISBwYXRoLmlzQWJzb2x1dGUob3B0aW9ucy5vdXRwdXRGTikpIHtcbiAgICAgICAgICAgIGxldCBkaXIgPSBwYXRoLmRpcm5hbWUobWV0YWRhdGEuZG9jdW1lbnQucGF0aCk7XG4gICAgICAgICAgICB2cGF0aE91dCA9IHBhdGgubm9ybWFsaXplKFxuICAgICAgICAgICAgICAgIHBhdGguam9pbignLycsIGRpciwgb3B0aW9ucy5vdXRwdXRGTilcbiAgICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2cGF0aE91dCA9IG9wdGlvbnMub3V0cHV0Rk47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDb21wdXRlIGZzcGF0aCBmb3IgdnBhdGhPdXRcbiAgICAgICAgY29uc3QgZnNwYXRoT3V0ID0gcGF0aC5ub3JtYWxpemUocGF0aC5qb2luKFxuICAgICAgICAgICAgdGhpcy5hcnJheS5vcHRpb25zLmNvbmZpZy5yZW5kZXJEZXN0aW5hdGlvbiwgdnBhdGhPdXRcbiAgICAgICAgKSk7XG4gICAgICAgIG9wdGlvbnMub3V0cHV0Rk4gPSBmc3BhdGhPdXQ7XG5cbiAgICAgICAgY29uc3QgaWQgPSAkZWxlbWVudC5hdHRyKCdpZCcpO1xuICAgICAgICBjb25zdCBjbGF6eiA9ICRlbGVtZW50LmF0dHIoJ2NsYXNzJyk7XG4gICAgICAgIGNvbnN0IGFsdCA9ICRlbGVtZW50LmF0dHIoJ2FsdCcpO1xuICAgICAgICBjb25zdCB0aXRsZSA9ICRlbGVtZW50LmF0dHIoJ3RpdGxlJyk7XG4gICAgICAgIGNvbnN0IGNhcHRpb24gPSAkZWxlbWVudC5hdHRyKCdjYXB0aW9uJyk7XG4gICAgICAgIGNvbnN0IGNzID0gJGVsZW1lbnQuYXR0cignY2hhcnNldCcpO1xuICAgICAgICBpZiAoaXNWYWxpZENoYXJzZXQoY3MpKSBvcHRpb25zLmNoYXJzZXQgPSBjcztcbiAgICAgICAgb3B0aW9ucy5kYXJrbW9kZSA9IHR5cGVvZiAkZWxlbWVudC5wcm9wKCdkYXJrbW9kZScpICE9PSAndW5kZWZpbmVkJztcbiAgICAgICAgLy8gb3B0aW9ucy5kZWJ1Z3N2ZWsgPSAkZWxlbWVudC5wcm9wKCdkZWJ1Z3N2ZWsnKTtcbiAgICAgICAgLy8gb3B0aW9ucy5maWxlTmFtZU92ZXJyaWRlID0gJGVsZW1lbnQuYXR0cignZmlsZW5hbWUnKTtcbiAgICAgICAgY29uc3QgbmJ0aHJlYWQgPSAkZWxlbWVudC5hdHRyKCduYnRocmVhZCcpO1xuICAgICAgICBpZiAodHlwZW9mIG5idGhyZWFkID09PSAnc3RyaW5nJykgb3B0aW9ucy5uYnRocmVhZCA9IG5idGhyZWFkO1xuICAgICAgICBvcHRpb25zLm5vbWV0YWRhdGEgPSB0eXBlb2YgJGVsZW1lbnQucHJvcCgnbm9tZXRhZGF0YScpICE9PSAndW5kZWZpbmVkJztcbiAgICAgICAgLy8gb3B0aW9ucy50ZXBzID0gJGVsZW1lbnQucHJvcCgndGVwcycpO1xuICAgICAgICAvLyBvcHRpb25zLnRodG1sID0gJGVsZW1lbnQucHJvcCgndGh0bWwnKTtcbiAgICAgICAgLy8gb3B0aW9ucy50bGF0ZXggPSAkZWxlbWVudC5wcm9wKCd0bGF0ZXgnKTtcbiAgICAgICAgLy8gb3B0aW9ucy50cGRmID0gJGVsZW1lbnQucHJvcCgndHBkZicpO1xuICAgICAgICBvcHRpb25zLnRwbmcgPSB0eXBlb2YgJGVsZW1lbnQucHJvcCgndHBuZycpICE9PSAndW5kZWZpbmVkJztcbiAgICAgICAgLy8gb3B0aW9ucy50c2N4bWwgPSAkZWxlbWVudC5wcm9wKCd0c2N4bWwnKTtcbiAgICAgICAgb3B0aW9ucy50c3ZnID0gdHlwZW9mICRlbGVtZW50LnByb3AoJ3RzdmcnKSAhPT0gJ3VuZGVmaW5lZCc7XG4gICAgICAgIC8vIG9wdGlvbnMudHR4dCA9ICRlbGVtZW50LnByb3AoJ3R0eHQnKTtcbiAgICAgICAgLy8gb3B0aW9ucy50dXR4dCA9ICRlbGVtZW50LnByb3AoJ3R1dHh0Jyk7XG4gICAgICAgIC8vIG9wdGlvbnMudHZkeCA9ICRlbGVtZW50LnByb3AoJ3R2ZHgnKTtcbiAgICAgICAgLy8gb3B0aW9ucy50eG1pID0gJGVsZW1lbnQucHJvcCgndHhtaScpO1xuICAgICAgICAvLyBvcHRpb25zLnZlcmJvc2UgPSAkZWxlbWVudC5wcm9wKCd2ZXJib3NlJyk7XG5cbiAgICAgICAgaWYgKG9wdGlvbnMudHBuZyAmJiBvcHRpb25zLnRzdmcpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgUGxhbnRVTUxMb2NhbCBjYW5ub3QgdXNlIGJvdGggdHBuZyBhbmQgdHN2Z2ApO1xuICAgICAgICB9XG4gICAgICAgIGlmICghb3B0aW9ucy50cG5nICYmICFvcHRpb25zLnRzdmcpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgUGxhbnRVTUxMb2NhbCBtdXN0IHVzZSBvbmUgb2YgdHBuZyBvciB0c3ZnYCk7XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgZG9QbGFudFVNTExvY2FsKG9wdGlvbnMpO1xuXG4gICAgICAgIGNvbnN0IGNhcCA9IHR5cGVvZiBjYXB0aW9uID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgPyBgPGZpZ2NhcHRpb24+JHtlbmNvZGUoY2FwdGlvbil9PC9maWdjYXB0aW9uPmBcbiAgICAgICAgICAgIDogJyc7XG4gICAgICAgIGNvbnN0IFRhbHQgPSB0eXBlb2YgYWx0ID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgPyBgYWx0PVwiJHtlbmNvZGUoYWx0KX1cImBcbiAgICAgICAgICAgIDogJyc7XG4gICAgICAgIGNvbnN0IFR0aXRsZSA9IHR5cGVvZiB0aXRsZSA9PT0gJ3N0cmluZydcbiAgICAgICAgICAgID8gYHRpdGxlPVwiJHtlbmNvZGUodGl0bGUpfVwiYFxuICAgICAgICAgICAgOiAnJztcbiAgICAgICAgY29uc3QgVGlkID0gdHlwZW9mIGlkID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgPyBgaWQ9XCIke2VuY29kZShpZCl9YFxuICAgICAgICAgICAgOiAnJztcbiAgICAgICAgY29uc3QgVGNsYXp6ID0gdHlwZW9mIGNsYXp6ID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgPyBgY2xhc3M9XCIke2VuY29kZShjbGF6eil9YFxuICAgICAgICAgICAgOiAnJztcblxuICAgICAgICByZXR1cm4gYFxuICAgICAgICA8ZmlndXJlICR7VGlkfSAke1RjbGF6en0+XG4gICAgICAgIDxpbWcgc3JjPVwiJHtlbmNvZGUodnBhdGhPdXQpfVwiICR7VGFsdH0gJHtUdGl0bGV9Lz5cbiAgICAgICAgJHtjYXB9XG4gICAgICAgIDwvZmlndXJlPlxuICAgICAgICBgO1xuICAgIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzVmFsaWRDaGFyc2V0KGNoYXJzZXQpIHtcbiAgICBpZiAodHlwZW9mIGNoYXJzZXQgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgY29uc3QgY3MgPSBjaGFyc2V0LnRvTG93ZXJDYXNlKCk7XG5cbiAgICBpZiAodHlwZW9mIGNzICE9PSAnc3RyaW5nJ1xuICAgICAgICB8fCAoY3MgIT09ICd1dGY4JyAmJiBjcyAhPT0gJ3V0Zi04J1xuICAgICAgICAmJiBjcyAhPT0gJ3V0ZjE2JyAmJiBjcyAhPT0gJ3V0Zi0xNidcbiAgICAgICAgJiYgY3MgIT09ICd1dGYxNmJlJyAmJiBjcyAhPT0gJ3V0Zi0xNmJlJ1xuICAgICAgICAmJiBjcyAhPT0gJ3V0ZjE2bGUnICYmIGNzICE9PSAndXRmLTE2bGUnXG4gICAgICAgICYmIGNzICE9PSAndXRmMzInICYmIGNzICE9PSAndXRmLTMyJ1xuICAgICAgICAmJiBjcyAhPT0gJ3V0ZjMybGUnICYmIGNzICE9PSAndXRmLTMybGUnKVxuICAgICkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufVxuIl19