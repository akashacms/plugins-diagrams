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
import fs from 'node:fs';
import util from 'node:util';
import { spawn } from 'node:child_process';
import { encode } from 'html-entities';
const __dirname = import.meta.dirname;
// Path name for the local copy of plantuml.jar
const plantumlJar = path.join(__dirname, '..', 'vendor', 'plantuml', 'plantuml-mit-1.2025.0.jar');
const pluginName = '@akashacms/plugins-diagrams';
import * as akasha from 'akasharender';
import { Plugin } from 'akasharender/dist/Plugin.js';
const mahabhuta = akasha.mahabhuta;
const _plugin_config = Symbol('config');
const _plugin_options = Symbol('options');
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
    return ret;
}
;
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
        // TODO ensure outputFN is vpath relative to root
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9saWIvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBRUEsT0FBTyxJQUFJLE1BQU0sV0FBVyxDQUFDO0FBQzdCLE9BQU8sRUFBdUIsTUFBTSxTQUFTLENBQUM7QUFDOUMsT0FBTyxJQUFJLE1BQU0sV0FBVyxDQUFDO0FBQzdCLE9BQU8sRUFBdUIsS0FBSyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDaEUsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUVyQyxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQztBQUV0QywrQ0FBK0M7QUFDL0MsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FDYixTQUFTLEVBQ1QsSUFBSSxFQUNKLFFBQVEsRUFDUixVQUFVLEVBQ1YsMkJBQTJCLENBQUMsQ0FBQztBQUU3QyxNQUFNLFVBQVUsR0FBRyw2QkFBNkIsQ0FBQztBQUVqRCxPQUFPLEtBQUssTUFBTSxNQUFNLGNBQWMsQ0FBQztBQUN2QyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDckQsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQztBQUVuQyxNQUFNLGNBQWMsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDeEMsTUFBTSxlQUFlLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBRTFDLE1BQU0sT0FBTyxjQUFlLFNBQVEsTUFBTTtJQUl0QztRQUNJLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUh0Qix5Q0FBUTtJQUlSLENBQUM7SUFFRCxTQUFTLENBQUMsTUFBTSxFQUFFLE9BQU87UUFDckIsdUJBQUEsSUFBSSwwQkFBVyxNQUFNLE1BQUEsQ0FBQztRQUN0QixLQUFLLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQyxDQUFDLGtCQUFr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QUssVUFBVSxDQUFDLEVBQzNDLENBQUM7UUFDQyxPQUFPLEtBQUssQ0FBQztJQUNqQixDQUFDO0lBQ0QsT0FBTyxJQUFJLENBQUM7QUFDaEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIlxuXG5pbXBvcnQgcGF0aCBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IGZzLCB7IHByb21pc2VzIGFzIGZzcCB9IGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHV0aWwgZnJvbSAnbm9kZTp1dGlsJztcbmltcG9ydCB7IGV4ZWNTeW5jLCBzcGF3blN5bmMsIHNwYXduIH0gZnJvbSAnbm9kZTpjaGlsZF9wcm9jZXNzJztcbmltcG9ydCB7ZW5jb2RlfSBmcm9tICdodG1sLWVudGl0aWVzJztcblxuY29uc3QgX19kaXJuYW1lID0gaW1wb3J0Lm1ldGEuZGlybmFtZTtcblxuLy8gUGF0aCBuYW1lIGZvciB0aGUgbG9jYWwgY29weSBvZiBwbGFudHVtbC5qYXJcbmNvbnN0IHBsYW50dW1sSmFyID0gcGF0aC5qb2luKFxuICAgICAgICAgICAgICAgIF9fZGlybmFtZSxcbiAgICAgICAgICAgICAgICAnLi4nLFxuICAgICAgICAgICAgICAgICd2ZW5kb3InLFxuICAgICAgICAgICAgICAgICdwbGFudHVtbCcsXG4gICAgICAgICAgICAgICAgJ3BsYW50dW1sLW1pdC0xLjIwMjUuMC5qYXInKTtcblxuY29uc3QgcGx1Z2luTmFtZSA9ICdAYWthc2hhY21zL3BsdWdpbnMtZGlhZ3JhbXMnO1xuXG5pbXBvcnQgKiBhcyBha2FzaGEgZnJvbSAnYWthc2hhcmVuZGVyJztcbmltcG9ydCB7IFBsdWdpbiB9IGZyb20gJ2FrYXNoYXJlbmRlci9kaXN0L1BsdWdpbi5qcyc7XG5jb25zdCBtYWhhYmh1dGEgPSBha2FzaGEubWFoYWJodXRhO1xuXG5jb25zdCBfcGx1Z2luX2NvbmZpZyA9IFN5bWJvbCgnY29uZmlnJyk7XG5jb25zdCBfcGx1Z2luX29wdGlvbnMgPSBTeW1ib2woJ29wdGlvbnMnKTtcblxuZXhwb3J0IGNsYXNzIERpYWdyYW1zUGx1Z2luIGV4dGVuZHMgUGx1Z2luIHtcblxuICAgICNjb25maWc7XG5cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIocGx1Z2luTmFtZSk7XG4gICAgfVxuXG4gICAgY29uZmlndXJlKGNvbmZpZywgb3B0aW9ucykge1xuICAgICAgICB0aGlzLiNjb25maWcgPSBjb25maWc7XG4gICAgICAgIHN1cGVyLm9wdGlvbnMgPSBvcHRpb25zOyAvLyA/IG9wdGlvbnMgOiB7fTtcbiAgICAgICAgb3B0aW9ucy5jb25maWcgPSBjb25maWc7XG4gICAgICAgIGNvbmZpZy5hZGRNYWhhYmh1dGEobWFoYWJodXRhQXJyYXkob3B0aW9ucykpO1xuICAgIH1cblxuICAgIGdldCBjb25maWcoKSB7IHJldHVybiB0aGlzLiNjb25maWc7IH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1haGFiaHV0YUFycmF5KG9wdGlvbnMpIHtcbiAgICBsZXQgcmV0ID0gbmV3IG1haGFiaHV0YS5NYWhhZnVuY0FycmF5KHBsdWdpbk5hbWUsIG9wdGlvbnMpO1xuICAgIHJldC5hZGRNYWhhZnVuYyhuZXcgUGxhbnRVTUxMb2NhbCgpKTtcbiAgICByZXR1cm4gcmV0O1xufTtcblxuLyoqXG4gKiBPcHRpb25zIG9iamVjdCB0aGF0IGlzIGNvbnZlcnRlZCBpbnRvIHBsYW50dW1sLmphciBvcHRpb25zLlxuICovXG5leHBvcnQgdHlwZSBkb1BsYW50VU1MT3B0aW9ucyA9IHtcbiAgICAvKipcbiAgICAgKiBUaGUgUGxhbnRVTUwgZGlhZ3JhbSB0ZXh0IHRvIHVzZVxuICAgICAqL1xuICAgIGlucHV0Qm9keT86IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIFplcm8gb3IgbW9yZSBmaWxlIG5hbWVzIGZvciBmaWxlcyB0byByZW5kZXJcbiAgICAgKi9cbiAgICBpbnB1dEZOcz86IHN0cmluZ1tdO1xuXG4gICAgLyoqXG4gICAgICogUG9zc2libGUgZmlsZSB0byB3cml0ZSBvdXRwdXQgaW50b1xuICAgICAqL1xuICAgIG91dHB1dEZOPzogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogVG8gdXNlIGEgc3BlY2lmaWMgY2hhcmFjdGVyIHNldC4gRGVmYXVsdDogVVRGLThcbiAgICAgKi9cbiAgICBjaGFyc2V0Pzogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogVG8gdXNlIGRhcmsgbW9kZSBmb3IgZGlhZ3JhbXNcbiAgICAgKi9cbiAgICBkYXJrbW9kZT86IGJvb2xlYW47XG5cbiAgICAvKipcbiAgICAgKiBUbyBnZW5lcmF0ZSBpbnRlcm1lZGlhdGUgc3ZlayBmaWxlc1xuICAgICAqL1xuICAgIGRlYnVnc3Zlaz86IGJvb2xlYW47XG5cbiAgICAvKipcbiAgICAgKiBcImV4YW1wbGUucHVtbFwiIFRvIG92ZXJyaWRlICVmaWxlbmFtZSUgdmFyaWFibGVcbiAgICAgKi9cbiAgICBmaWxlTmFtZU92ZXJyaWRlPzogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogVG8gdXNlIChOKSB0aHJlYWRzIGZvciBwcm9jZXNzaW5nLiAgVXNlIFwiYXV0b1wiIGZvciA0IHRocmVhZHMuXG4gICAgICovXG4gICAgbmJ0aHJlYWQ/OiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBUbyBOT1QgZXhwb3J0IG1ldGFkYXRhIGluIFBORy9TVkcgZ2VuZXJhdGVkIGZpbGVzXG4gICAgICovXG4gICAgbm9tZXRhZGF0YT86IGJvb2xlYW47XG5cbiAgICAvKipcbiAgICAgKiBUbyBnZW5lcmF0ZSBpbWFnZXMgaW4gdGhlIHNwZWNpZmllZCBkaXJlY3RvcnlcbiAgICAgKi9cbiAgICBvdXRwdXREaXI/OiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBUbyBnZW5lcmF0ZSBpbWFnZXMgdXNpbmcgRVBTIGZvcm1hdFxuICAgICAqL1xuICAgIHRlcHM/OiBib29sZWFuO1xuXG4gICAgLyoqXG4gICAgICogVG8gZ2VuZXJhdGUgSFRNTCBmaWxlIGZvciBjbGFzcyBkaWFncmFtXG4gICAgICovXG4gICAgdGh0bWw/OiBib29sZWFuO1xuXG4gICAgLyoqXG4gICAgICogVG8gZ2VuZXJhdGUgaW1hZ2VzIHVzaW5nIExhVGVYL1Rpa3ogZm9ybWF0XG4gICAgICovXG4gICAgdGxhdGV4PzogYm9vbGVhbjtcblxuICAgIC8qKlxuICAgICAqIFRvIGdlbmVyYXRlIGltYWdlcyB1c2luZyBQREYgZm9ybWF0XG4gICAgICovXG4gICAgdHBkZj86IGJvb2xlYW47XG5cbiAgICAvKipcbiAgICAgKiBUbyBnZW5lcmF0ZSBpbWFnZXMgdXNpbmcgUE5HIGZvcm1hdCAoZGVmYXVsdClcbiAgICAgKi9cbiAgICB0cG5nPzogYm9vbGVhbjtcblxuICAgIC8qKlxuICAgICAqIFRvIGdlbmVyYXRlIFNDWE1MIGZpbGUgZm9yIHN0YXRlIGRpYWdyYW1cbiAgICAgKi9cbiAgICB0c2N4bWw/OiBib29sZWFuO1xuXG4gICAgLyoqXG4gICAgICogVG8gZ2VuZXJhdGUgaW1hZ2VzIHVzaW5nIFNWRyBmb3JtYXRcbiAgICAgKi9cbiAgICB0c3ZnPzogYm9vbGVhbjtcblxuICAgIC8qKlxuICAgICAqIFRvIGdlbmVyYXRlIGltYWdlcyB3aXRoIEFTQ0lJIGFydFxuICAgICAqL1xuICAgIHR0eHQ/OiBib29sZWFuO1xuXG4gICAgLyoqXG4gICAgICogVG8gZ2VuZXJhdGUgaW1hZ2VzIHdpdGggQVNDSUkgYXJ0IHVzaW5nIFVuaWNvZGUgY2hhcmFjdGVyc1xuICAgICAqL1xuICAgIHR1dHh0PzogYm9vbGVhbjtcblxuICAgIC8qKlxuICAgICAqIFRvIGdlbmVyYXRlIGltYWdlcyB1c2luZyBWRFggZm9ybWF0XG4gICAgICovXG4gICAgdHZkeD86IGJvb2xlYW47XG5cbiAgICAvKipcbiAgICAgKiBUbyBnZW5lcmF0ZSBYTUkgZmlsZSBmb3IgY2xhc3MgZGlhZ3JhbVxuICAgICAqL1xuICAgIHR4bWk/OiBib29sZWFuO1xuXG4gICAgLyoqXG4gICAgICogVG8gaGF2ZSBsb2cgaW5mb3JtYXRpb25cbiAgICAgKi9cbiAgICB2ZXJib3NlPzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRvUGxhbnRVTUxMb2NhbChvcHRpb25zKSB7XG5cbiAgICBjb25zdCBhcmdzID0gW1xuICAgICAgICAvLyAnamF2YScsXG4gICAgICAgICctamFyJyxcbiAgICAgICAgJy1EamF2YS5hd3QuaGVhZGxlc3M9dHJ1ZScsXG4gICAgICAgICctLWFkZC1vcGVucz1qYXZhLnhtbC9jb20uc3VuLm9yZy5hcGFjaGUueGFsYW4uaW50ZXJuYWwueHNsdGMudHJheD1BTEwtVU5OQU1FRCcsXG4gICAgICAgIHBsYW50dW1sSmFyLFxuICAgIF07XG4gICAgaWYgKG9wdGlvbnMuY2hhcnNldCkge1xuICAgICAgICBhcmdzLnB1c2goJy1jaGFyc2V0Jyk7XG4gICAgICAgIGFyZ3MucHVzaChvcHRpb25zLmNoYXJzZXQpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy5kYXJrbW9kZSkge1xuICAgICAgICBhcmdzLnB1c2goJy1kYXJrbW9kZScpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy5kZWJ1Z3N2ZWspIHtcbiAgICAgICAgYXJncy5wdXNoKCctZGVidWdzdmVrJyk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLmZpbGVOYW1lT3ZlcnJpZGUpIHtcbiAgICAgICAgYXJncy5wdXNoKCctZmlsZW5hbWUnKTtcbiAgICAgICAgYXJncy5wdXNoKG9wdGlvbnMuZmlsZU5hbWVPdmVycmlkZSk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLm5idGhyZWFkKSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLW5idGhyZWFkJyk7XG4gICAgICAgIGFyZ3MucHVzaChvcHRpb25zLm5idGhyZWFkKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMubm9tZXRhZGF0YSkge1xuICAgICAgICBhcmdzLnB1c2goJy1ub21ldGFkYXRhJyk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnRlcHMpIHtcbiAgICAgICAgYXJncy5wdXNoKCctdGVwcycpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy50aHRtbCkge1xuICAgICAgICBhcmdzLnB1c2goJy10aHRtbCcpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy50bGF0ZXgpIHtcbiAgICAgICAgYXJncy5wdXNoKCctdGxhdGV4Jyk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnRwZGYpIHtcbiAgICAgICAgYXJncy5wdXNoKCctdHBkZicpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy50cG5nKSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLXRwbmcnKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMudHNjeG1sKSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLXRzY3htbCcpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy50c3ZnKSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLXRzdmcnKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMudHR4dCkge1xuICAgICAgICBhcmdzLnB1c2goJy10dHh0Jyk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnR1dHh0KSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLXR1dHh0Jyk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnR2ZHgpIHtcbiAgICAgICAgYXJncy5wdXNoKCctdHZkeCcpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy50eG1pKSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLXR4bWknKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMudmVyYm9zZSkge1xuICAgICAgICBhcmdzLnB1c2goJy12ZXJib3NlJyk7XG4gICAgfVxuXG4gICAgLy8gMCBpbnB1dEZOcyByZXF1aXJlcyBpbnB1dEJvZHksIHJlcXVpcmVzIG91dHB1dEZOXG4gICAgLy8gY2hpbGQuc3RkaW4ud3JpdGUvZW5kIHdpdGggaW5wdXRCb2R5XG4gICAgLy8gY2hpbGQuc3Rkb3V0LnBpcGUoZnMuY3JlYXRlV3JpdGVTdHJlYW0ob3V0cHV0Rk4pKVxuICAgIC8vIC1waXBlXG4gICAgLy9cbiAgICAvLyAxIGlucHV0Rk4sIG5vL2lnbm9yZSBpbnB1dEJvZHksIHJlcXVpcmVzIG91dHB1dEZOXG4gICAgLy8gZnMuY3JlYXRlUmVhZFN0cmVhbShpbnB1dEZOKS5waXBlKGNoaWxkLnN0ZGluKSA/P1xuICAgIC8vIGNoaWxkLnN0ZG91dC5waXBlKGZzLmNyZWF0ZVdyaXRlU3RyZWFtKG91dHB1dEZOKSlcbiAgICAvLyAtcGlwZVxuICAgIC8vXG4gICAgLy8gSUdOT1JFXG4gICAgLy8gSUdOT1JFIGVpdGhlciAwIGlucHV0IEZOcyAmIGlucHV0Qm9keSwgb3IgMSBpbnB1dEZOXG4gICAgLy8gSUdOT1JFIG5vIG91dHB1dEZOXG4gICAgLy8gSUdOT1JFIC10c3ZnIHNldFxuICAgIC8vIElHTk9SRSBSZWFkIHN0ZG91dCBpbnRvIGEgQnVmZmVyLCB0aGF0J3MgY29udmVydGVkIHRvIHN0cmluZ1xuICAgIC8vIElHTk9SRSAtcGlwZVxuICAgIC8vIElHTk9SRSBSZXR1cm4gdGhlIHN0cmluZ1xuICAgIC8vIFNFRSBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xNDI2OTIzMy9ub2RlLWpzLWhvdy10by1yZWFkLWEtc3RyZWFtLWludG8tYS1idWZmZXJcbiAgICAvL1xuICAgIC8vIG11bHRpcGxlIGlucHV0Rk5zIC4uIG9wdGlvbmFsIG91dHB1dC1kaXInc1xuICAgIC8vIEJvdGggZ28gb24gdGhlIGNvbW1hbmQtbGluZVxuICAgIC8vXG5cbiAgICBsZXQgc3Bhd25vcHRzID0ge30gYXMgYW55O1xuXG4gICAgaWYgKHR5cGVvZiBvcHRpb25zLmlucHV0Rk5zID09PSAndW5kZWZpbmVkJ1xuICAgICAmJiAhQXJyYXkuaXNBcnJheShvcHRpb25zLmlucHV0Rk5zKVxuICAgICAmJiB0eXBlb2Ygb3B0aW9ucy5pbnB1dEJvZHkgIT09ICdzdHJpbmcnXG4gICAgKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgcGxhbnR1bWwgLSBubyBpbnB1dCBzb3VyY2VzYCk7XG4gICAgfVxuICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5pbnB1dEZOcyA9PT0gJ3VuZGVmaW5lZCdcbiAgICAgJiYgIUFycmF5LmlzQXJyYXkob3B0aW9ucy5pbnB1dEZOcylcbiAgICAgJiYgdHlwZW9mIG9wdGlvbnMuaW5wdXRCb2R5ID09PSAnc3RyaW5nJ1xuICAgICAmJiB0eXBlb2Ygb3B0aW9ucy5vdXRwdXRGTiAhPT0gJ3N0cmluZydcbiAgICApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBwbGFudHVtbCAtIHdpdGggaW5wdXRCb2R5LCBubyBvdXRwdXQgZGVzdGluYXRpb25gKTtcbiAgICB9XG4gICAgLy8gTm8gZmlsZSBuYW1lcywgYnV0IGFuIGlucHV0Qm9keSwgYW5kIGFuIG91dHB1dCBmaWxlLFxuICAgIC8vIG1lYW5zIHdlJ3JlIHBpcGluZ1xuICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5pbnB1dEZOcyA9PT0gJ3VuZGVmaW5lZCdcbiAgICAgJiYgIUFycmF5LmlzQXJyYXkob3B0aW9ucy5pbnB1dEZOcylcbiAgICAgJiYgdHlwZW9mIG9wdGlvbnMuaW5wdXRCb2R5ID09PSAnc3RyaW5nJ1xuICAgICAmJiB0eXBlb2Ygb3B0aW9ucy5vdXRwdXRGTiA9PT0gJ3N0cmluZydcbiAgICApIHtcbiAgICAgICAgYXJncy5wdXNoKCctcGlwZScpO1xuICAgIH1cbiAgICBpZiAoQXJyYXkuaXNBcnJheShvcHRpb25zLmlucHV0Rk5zKVxuICAgICAmJiBvcHRpb25zLmlucHV0Rk5zLmxlbmd0aCA9PT0gMVxuICAgICAmJiB0eXBlb2Ygb3B0aW9ucy5vdXRwdXRGTiAhPT0gJ3N0cmluZydcbiAgICApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBwbGFudHVtbCAtIHdpdGggb25lIGlucHV0IGZpbGUgJHtvcHRpb25zLmlucHV0Rk5zWzBdfSBubyBvdXRwdXQgZmlsZWApO1xuICAgIH1cbiAgICAvLyBPbmUgZmlsZSBuYW1lcywgaWdub3JlIGlucHV0Qm9keSwgYW5kIGFuIG91dHB1dCBmaWxlLFxuICAgIC8vIG1lYW5zIHdlJ3JlIHBpcGluZ1xuICAgIGlmIChBcnJheS5pc0FycmF5KG9wdGlvbnMuaW5wdXRGTnMpXG4gICAgICYmIG9wdGlvbnMuaW5wdXRGTnMubGVuZ3RoID09PSAxXG4gICAgICYmIHR5cGVvZiBvcHRpb25zLm91dHB1dEZOID09PSAnc3RyaW5nJ1xuICAgICkge1xuICAgICAgICBhcmdzLnB1c2goJy1waXBlJyk7XG4gICAgfVxuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkob3B0aW9ucy5pbnB1dEZOcylcbiAgICAgJiYgb3B0aW9ucy5pbnB1dEZOcy5sZW5ndGggPiAxXG4gICAgICYmIHR5cGVvZiBvcHRpb25zLm91dHB1dEZOID09PSAnc3RyaW5nJ1xuICAgICkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sIC0gd2l0aCBtdWx0aXBsZSBpbnB1dCBmaWxlcywgb3V0cHV0IGZpbGUgbm90IGFsbG93ZWRgKVxuICAgIH1cblxuICAgIC8vIG11bHRpcGxlIGZpbGUgbmFtZXMsIHB1c2ggb250byBhcmdzXG4gICAgaWYgKEFycmF5LmlzQXJyYXkob3B0aW9ucy5pbnB1dEZOcylcbiAgICAgJiYgb3B0aW9ucy5pbnB1dEZOcy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAoY29uc3QgaW5wdXRGTiBvZiBvcHRpb25zLmlucHV0Rk5zKSB7XG4gICAgICAgICAgICBhcmdzLnB1c2goaW5wdXRGTik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIG9wdGlvbnMub3V0cHV0RGlyID09PSAnc3RyaW5nJykge1xuICAgICAgICBhcmdzLnB1c2goJy1vdXRwdXQnKTtcbiAgICAgICAgYXJncy5wdXNoKG9wdGlvbnMub3V0cHV0RGlyKTtcbiAgICB9XG5cbiAgICAvLyBOb3cgdGhhdCB0aGUgY29tbWFuZCBhcmdzIGFuZCBzcGF3bm9wdHMgYXJlIHNldCB1cFxuICAgIC8vIHJ1biB0aGUgY29tbWFuZFxuICAgIC8vIGNvbnNvbGUubG9nKHtcbiAgICAvLyAgICAgc3Bhd25vcHRzLCBhcmdzXG4gICAgLy8gfSk7XG4gICAgY29uc3QgY2hpbGQgPSBzcGF3bignamF2YScsIGFyZ3MsIHNwYXdub3B0cyk7XG5cbiAgICAvLyBOZXh0LCBzZXQgdXAgc3RkaW4vc3Rkb3V0IHBpcGVzIGluIGNhc2VcbiAgICAvLyBvZiB1c2luZyAtcGlwZSBtb2RlXG5cbiAgICAvLyBObyBpbnB1dCBmaWxlcywgd2l0aCBpbnB1dEJvZHksIGFuZCBvdXRwdXRGTixcbiAgICAvLyBzZXQgdXAgdGhlIHBpcGluZyBmcm9tIGlucHV0IHRvIG91dHB1dFxuICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5pbnB1dEZOcyA9PT0gJ3VuZGVmaW5lZCdcbiAgICAgJiYgIUFycmF5LmlzQXJyYXkob3B0aW9ucy5pbnB1dEZOcylcbiAgICAgJiYgdHlwZW9mIG9wdGlvbnMuaW5wdXRCb2R5ID09PSAnc3RyaW5nJ1xuICAgICAmJiB0eXBlb2Ygb3B0aW9ucy5vdXRwdXRGTiA9PT0gJ3N0cmluZydcbiAgICApIHtcbiAgICAgICAgY2hpbGQuc3RkaW4ud3JpdGUob3B0aW9ucy5pbnB1dEJvZHkpO1xuICAgICAgICBjaGlsZC5zdGRvdXQucGlwZShmcy5jcmVhdGVXcml0ZVN0cmVhbShvcHRpb25zLm91dHB1dEZOKSk7XG4gICAgICAgIGNoaWxkLnN0ZGluLmVuZCgpO1xuICAgIH1cblxuICAgIC8vIE9uZSBmaWxlIG5hbWVzLCBpZ25vcmUgaW5wdXRCb2R5LCBhbmQgYW4gb3V0cHV0IGZpbGUsXG4gICAgLy8gc2V0IHVwIHRoZSBwaXBpbmcgZnJvbSBpbnB1dCB0byBvdXRwdXRcbiAgICBpZiAoQXJyYXkuaXNBcnJheShvcHRpb25zLmlucHV0Rk5zKVxuICAgICAmJiBvcHRpb25zLmlucHV0Rk5zLmxlbmd0aCA9PT0gMVxuICAgICAmJiB0eXBlb2Ygb3B0aW9ucy5vdXRwdXRGTiA9PT0gJ3N0cmluZydcbiAgICApIHtcbiAgICAgICAgLy8gY29uc3QgaW5wID0gYXdhaXQgZnNwLnJlYWRGaWxlKG9wdGlvbnMuaW5wdXRGTnNbMF0sICd1dGYtOCcpO1xuICAgICAgICAvLyBjaGlsZC5zdGRpbi53cml0ZShpbnApO1xuICAgICAgICBmcy5jcmVhdGVSZWFkU3RyZWFtKG9wdGlvbnMuaW5wdXRGTnNbMF0pLnBpcGUoY2hpbGQuc3RkaW4pO1xuICAgICAgICBjaGlsZC5zdGRvdXQucGlwZShmcy5jcmVhdGVXcml0ZVN0cmVhbShvcHRpb25zLm91dHB1dEZOKSk7XG4gICAgICAgIC8vIGNoaWxkLnN0ZGluLmVuZCgpO1xuICAgIH1cblxuICAgIC8vIEZpbmFsbHksIHdhaXQgZm9yIHRoZSBjaGlsZCB0byBmaW5pc2hcblxuICAgIGNoaWxkLm9uKCdlcnJvcicsIChlcnIpID0+IHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgcGxhbnR1bWwgRVJST1IgaW4gY2hpbGQgcHJvY2VzcyAke2Vyci5tZXNzYWdlfWApO1xuICAgIH0pO1xuXG4gICAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBjaGlsZC5vbignY2xvc2UnLCAoY29kZSkgPT4ge1xuICAgICAgICAgICAgaWYgKGNvZGUgPT09IDApIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHVuZGVmaW5lZCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoYHBsYW50dW1sIGZhaWwgd2l0aCBjb2RlICR7Y29kZX1gKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG59XG5cbi8qKlxuICogSGFuZGxlIGNvbnZlcnRpbmcgYSBzaW5nbGUgUGxhbnRVTUwgZGlhZ3JhbSBmb3JcbiAqIGRpc3BsYXkgaW4gYSBkb2N1bWVudC5cbiAqIFxuICogVGhlIGRvY3VtZW50IGRlc2NyaXB0aW9uIGlzIGVpdGhlciBpbmxpbmVcbiAqIHRvIHRoZSA8ZGlhZ3JhbXMtcGxhbnR1bWw+IHRhZywgb3IgZWxzZSBhIHNpbmdsZVxuICogaW5wdXQgZmlsZSBpbiB0aGUgaW5wdXQtZmlsZSBhdHRyaWJ1dGUuXG4gKiBcbiAqIFRoZXJlIGlzIGEgc2luZ2xlIG91dHB1dC1maWxlIGF0dHJpYnV0ZSB0b1xuICogZm9yIGEgZmlsZSB0byByZWNlaXZlIGFzIG91dHB1dC4gIFRoaXMgZmlsZVxuICogaXMgd3JpdHRlbiBkaXJlY3RseSB0byB0aGUgcmVuZGVyaW5nT3V0cHV0IGRpcmVjdG9yeS5cbiAqIFxuICogVGhpcyB3aWxsIHN1cHBvcnQgb25seSBQTkcgYW5kIFNWRyBvdXRwdXQgZm9ybWF0cy5cbiAqIFxuICogVGhlIG91dHB1dC1maWxlIGlzIGEgVlBhdGggc3BlY2lmeWluZyBhblxuICogb3V0cHV0IGRpcmVjdG9yeSBsb2NhdGlvbi5cbiAqIFxuICogaXNBYnNvbHV0ZShvdXRwdXQtZmlsZSkgLSBtZWFucyBpdCBpcyByb290ZWRcbiAqIHRvIHRoZSBvdXRwdXQgZGlyZWN0b3J5LiAgT3RoZXJ3aXNlIGl0IGlzIHJlbGF0aXZlXG4gKiB0byB0aGUgZGlybmFtZShtZXRhZGF0YS5kb2N1bWVudC5wYXRoKS5cbiAqL1xuY2xhc3MgUGxhbnRVTUxMb2NhbCBleHRlbmRzIG1haGFiaHV0YS5DdXN0b21FbGVtZW50IHtcblxuXHRnZXQgZWxlbWVudE5hbWUoKSB7IHJldHVybiBcImRpYWdyYW1zLXBsYW50dW1sXCI7IH1cbiAgICBhc3luYyBwcm9jZXNzKCRlbGVtZW50LCBtZXRhZGF0YSwgZGlydHk6IEZ1bmN0aW9uKSB7XG5cbiAgICAgICAgY29uc3Qgb3B0aW9uczogZG9QbGFudFVNTE9wdGlvbnMgPSB7XG4gICAgICAgICAgICAvLyBVc2luZyAudGV4dCgpIGVsaW1pbmF0ZXMgSFRNTCBmb3JtYXR0aW5nLlxuICAgICAgICAgICAgaW5wdXRCb2R5OiAkZWxlbWVudC50ZXh0KCksXG4gICAgICAgICAgICBpbnB1dEZOczogdW5kZWZpbmVkLFxuICAgICAgICAgICAgb3V0cHV0Rk46ICRlbGVtZW50LmF0dHIoJ291dHB1dC1maWxlJylcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBFbnN1cmUgdGhlcmUgaXMgZWl0aGVyIGFuIGlucHV0LWZpbGVcbiAgICAgICAgLy8gb3IgYW4gaW5wdXQgYm9keVxuXG4gICAgICAgIGNvbnN0IGluZiA9ICAkZWxlbWVudC5hdHRyKCdpbnB1dC1maWxlJyk7XG4gICAgICAgIGlmICh0eXBlb2YgaW5mID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgb3B0aW9ucy5pbnB1dEZOcyA9IFsgaW5mIF07XG4gICAgICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShpbmYpICYmIGluZi5sZW5ndGggPj0gMSkge1xuICAgICAgICAgICAgb3B0aW9ucy5pbnB1dEZOcyA9IFsgaW5mWzBdIF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvcHRpb25zLmlucHV0Rk5zID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5pbnB1dEJvZHkgIT09ICdzdHJpbmcnXG4gICAgICAgICAmJiAoXG4gICAgICAgICAgICAhQXJyYXkuaXNBcnJheShvcHRpb25zLmlucHV0Rk5zKVxuICAgICAgICAgfHwgb3B0aW9ucy5pbnB1dEZOcy5sZW5ndGggPD0gMFxuICAgICAgICApKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFBsYW50VU1MTG9jYWwgb25lIGlucHV0IGZpbGUgb3IgaW5saW5lIGRpYWdyYW0gaXMgcmVxdWlyZWRgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCB2cGF0aEluO1xuICAgICAgICBsZXQgZnNwYXRoSW47XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KG9wdGlvbnMuaW5wdXRGTnMpICYmIG9wdGlvbnMuaW5wdXRGTnMubGVuZ3RoID09PSAxKSB7XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5pbnB1dEZOc1swXSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFBsYW50VU1MTG9jYWwgbm8gaW5wdXQgZmlsZSBGTiBnaXZlbiBpbiAke3V0aWwuaW5zcGVjdChvcHRpb25zLmlucHV0Rk5zKX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGluRk4gPSBvcHRpb25zLmlucHV0Rk5zWzBdO1xuICAgICAgICAgICAgaWYgKHBhdGguaXNBYnNvbHV0ZShpbkZOKSkge1xuICAgICAgICAgICAgICAgIHZwYXRoSW4gPSBpbkZOO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBsZXQgZGlyID0gcGF0aC5kaXJuYW1lKG1ldGFkYXRhLmRvY3VtZW50LnBhdGgpO1xuICAgICAgICAgICAgICAgIHZwYXRoSW4gPSBwYXRoLm5vcm1hbGl6ZShcbiAgICAgICAgICAgICAgICAgICAgcGF0aC5qb2luKCcvJywgZGlyLCBpbkZOKVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGRvY3VtZW50cyA9IHRoaXMuYXJyYXkub3B0aW9ucy5jb25maWcuYWthc2hhLmZpbGVjYWNoZS5kb2N1bWVudHNDYWNoZTtcbiAgICAgICAgICAgIGNvbnN0IGFzc2V0cyA9IHRoaXMuYXJyYXkub3B0aW9ucy5jb25maWcuYWthc2hhLmZpbGVjYWNoZS5hc3NldHNDYWNoZTtcbiAgICAgICAgICAgIGNvbnN0IGRvYyA9IGF3YWl0IGRvY3VtZW50cy5maW5kKHZwYXRoSW4pO1xuICAgICAgICAgICAgbGV0IGFzc2V0O1xuXG4gICAgICAgICAgICBpZiAoIWRvYykgYXNzZXQgPSBhd2FpdCBhc3NldHMuZmluZCh2cGF0aEluKTtcbiAgIFxuICAgICAgICAgICAgaWYgKCFkb2MgJiYgIWFzc2V0KSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQbGFudFVNTExvY2FsIG5vIHBsYW50dW1sIGFzc2V0IG9yIGRvY3VtZW50IGZpbGUgIGZvdW5kIGZvciAke3ZwYXRoSW59YCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChkb2MpIGZzcGF0aEluID0gZG9jLmZzcGF0aDtcbiAgICAgICAgICAgIGVsc2UgaWYgKGFzc2V0KSBmc3BhdGhJbiA9IGFzc2V0LmZzcGF0aDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElmIHRoZXJlIHdhcyBhbiBpbnB1dCBmaWxlLCByZWNvcmQgaXRzIGZ1bGwgcGF0aG5hbWVcbiAgICAgICAgLy8gYXMgdGhlIGlucHV0Rk5zIGVudHJ5XG4gICAgICAgIGlmIChmc3BhdGhJbikgb3B0aW9ucy5pbnB1dEZOcyA9IFsgZnNwYXRoSW4gXTtcblxuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMub3V0cHV0Rk4gIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFBsYW50VU1MTG9jYWwgbm8gb3V0cHV0IGZpbGUgbmFtZSB3YXMgc3VwcGxpZWRgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCB2cGF0aE91dDtcbiAgICAgICAgaWYgKCEgcGF0aC5pc0Fic29sdXRlKG9wdGlvbnMub3V0cHV0Rk4pKSB7XG4gICAgICAgICAgICBsZXQgZGlyID0gcGF0aC5kaXJuYW1lKG1ldGFkYXRhLmRvY3VtZW50LnBhdGgpO1xuICAgICAgICAgICAgdnBhdGhPdXQgPSBwYXRoLm5vcm1hbGl6ZShcbiAgICAgICAgICAgICAgICBwYXRoLmpvaW4oJy8nLCBkaXIsIG9wdGlvbnMub3V0cHV0Rk4pXG4gICAgICAgICAgICApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdnBhdGhPdXQgPSBvcHRpb25zLm91dHB1dEZOO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ29tcHV0ZSBmc3BhdGggZm9yIHZwYXRoT3V0XG4gICAgICAgIGNvbnN0IGZzcGF0aE91dCA9IHBhdGgubm9ybWFsaXplKHBhdGguam9pbihcbiAgICAgICAgICAgIHRoaXMuYXJyYXkub3B0aW9ucy5jb25maWcucmVuZGVyRGVzdGluYXRpb24sIHZwYXRoT3V0XG4gICAgICAgICkpO1xuICAgICAgICBvcHRpb25zLm91dHB1dEZOID0gZnNwYXRoT3V0O1xuXG4gICAgICAgIGNvbnN0IGlkID0gJGVsZW1lbnQuYXR0cignaWQnKTtcbiAgICAgICAgY29uc3QgY2xhenogPSAkZWxlbWVudC5hdHRyKCdjbGFzcycpO1xuICAgICAgICBjb25zdCBhbHQgPSAkZWxlbWVudC5hdHRyKCdhbHQnKTtcbiAgICAgICAgY29uc3QgdGl0bGUgPSAkZWxlbWVudC5hdHRyKCd0aXRsZScpO1xuICAgICAgICBjb25zdCBjYXB0aW9uID0gJGVsZW1lbnQuYXR0cignY2FwdGlvbicpO1xuICAgICAgICBjb25zdCBjcyA9ICRlbGVtZW50LmF0dHIoJ2NoYXJzZXQnKTtcbiAgICAgICAgaWYgKGlzVmFsaWRDaGFyc2V0KGNzKSkgb3B0aW9ucy5jaGFyc2V0ID0gY3M7XG4gICAgICAgIG9wdGlvbnMuZGFya21vZGUgPSB0eXBlb2YgJGVsZW1lbnQucHJvcCgnZGFya21vZGUnKSAhPT0gJ3VuZGVmaW5lZCc7XG4gICAgICAgIC8vIG9wdGlvbnMuZGVidWdzdmVrID0gJGVsZW1lbnQucHJvcCgnZGVidWdzdmVrJyk7XG4gICAgICAgIC8vIG9wdGlvbnMuZmlsZU5hbWVPdmVycmlkZSA9ICRlbGVtZW50LmF0dHIoJ2ZpbGVuYW1lJyk7XG4gICAgICAgIGNvbnN0IG5idGhyZWFkID0gJGVsZW1lbnQuYXR0cignbmJ0aHJlYWQnKTtcbiAgICAgICAgaWYgKHR5cGVvZiBuYnRocmVhZCA9PT0gJ3N0cmluZycpIG9wdGlvbnMubmJ0aHJlYWQgPSBuYnRocmVhZDtcbiAgICAgICAgb3B0aW9ucy5ub21ldGFkYXRhID0gdHlwZW9mICRlbGVtZW50LnByb3AoJ25vbWV0YWRhdGEnKSAhPT0gJ3VuZGVmaW5lZCc7XG4gICAgICAgIC8vIG9wdGlvbnMudGVwcyA9ICRlbGVtZW50LnByb3AoJ3RlcHMnKTtcbiAgICAgICAgLy8gb3B0aW9ucy50aHRtbCA9ICRlbGVtZW50LnByb3AoJ3RodG1sJyk7XG4gICAgICAgIC8vIG9wdGlvbnMudGxhdGV4ID0gJGVsZW1lbnQucHJvcCgndGxhdGV4Jyk7XG4gICAgICAgIC8vIG9wdGlvbnMudHBkZiA9ICRlbGVtZW50LnByb3AoJ3RwZGYnKTtcbiAgICAgICAgb3B0aW9ucy50cG5nID0gdHlwZW9mICRlbGVtZW50LnByb3AoJ3RwbmcnKSAhPT0gJ3VuZGVmaW5lZCc7XG4gICAgICAgIC8vIG9wdGlvbnMudHNjeG1sID0gJGVsZW1lbnQucHJvcCgndHNjeG1sJyk7XG4gICAgICAgIG9wdGlvbnMudHN2ZyA9IHR5cGVvZiAkZWxlbWVudC5wcm9wKCd0c3ZnJykgIT09ICd1bmRlZmluZWQnO1xuICAgICAgICAvLyBvcHRpb25zLnR0eHQgPSAkZWxlbWVudC5wcm9wKCd0dHh0Jyk7XG4gICAgICAgIC8vIG9wdGlvbnMudHV0eHQgPSAkZWxlbWVudC5wcm9wKCd0dXR4dCcpO1xuICAgICAgICAvLyBvcHRpb25zLnR2ZHggPSAkZWxlbWVudC5wcm9wKCd0dmR4Jyk7XG4gICAgICAgIC8vIG9wdGlvbnMudHhtaSA9ICRlbGVtZW50LnByb3AoJ3R4bWknKTtcbiAgICAgICAgLy8gb3B0aW9ucy52ZXJib3NlID0gJGVsZW1lbnQucHJvcCgndmVyYm9zZScpO1xuXG4gICAgICAgIGlmIChvcHRpb25zLnRwbmcgJiYgb3B0aW9ucy50c3ZnKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFBsYW50VU1MTG9jYWwgY2Fubm90IHVzZSBib3RoIHRwbmcgYW5kIHRzdmdgKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIW9wdGlvbnMudHBuZyAmJiAhb3B0aW9ucy50c3ZnKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFBsYW50VU1MTG9jYWwgbXVzdCB1c2Ugb25lIG9mIHRwbmcgb3IgdHN2Z2ApO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IGRvUGxhbnRVTUxMb2NhbChvcHRpb25zKTtcblxuICAgICAgICBjb25zdCBjYXAgPSB0eXBlb2YgY2FwdGlvbiA9PT0gJ3N0cmluZydcbiAgICAgICAgICAgID8gYDxmaWdjYXB0aW9uPiR7ZW5jb2RlKGNhcHRpb24pfTwvZmlnY2FwdGlvbj5gXG4gICAgICAgICAgICA6ICcnO1xuICAgICAgICBjb25zdCBUYWx0ID0gdHlwZW9mIGFsdCA9PT0gJ3N0cmluZydcbiAgICAgICAgICAgID8gYGFsdD1cIiR7ZW5jb2RlKGFsdCl9XCJgXG4gICAgICAgICAgICA6ICcnO1xuICAgICAgICBjb25zdCBUdGl0bGUgPSB0eXBlb2YgdGl0bGUgPT09ICdzdHJpbmcnXG4gICAgICAgICAgICA/IGB0aXRsZT1cIiR7ZW5jb2RlKHRpdGxlKX1cImBcbiAgICAgICAgICAgIDogJyc7XG4gICAgICAgIGNvbnN0IFRpZCA9IHR5cGVvZiBpZCA9PT0gJ3N0cmluZydcbiAgICAgICAgICAgID8gYGlkPVwiJHtlbmNvZGUoaWQpfWBcbiAgICAgICAgICAgIDogJyc7XG4gICAgICAgIGNvbnN0IFRjbGF6eiA9IHR5cGVvZiBjbGF6eiA9PT0gJ3N0cmluZydcbiAgICAgICAgICAgID8gYGNsYXNzPVwiJHtlbmNvZGUoY2xhenopfWBcbiAgICAgICAgICAgIDogJyc7XG4gICAgICAgIC8vIFRPRE8gZW5zdXJlIG91dHB1dEZOIGlzIHZwYXRoIHJlbGF0aXZlIHRvIHJvb3RcbiAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgPGZpZ3VyZSAke1RpZH0gJHtUY2xhenp9PlxuICAgICAgICA8aW1nIHNyYz1cIiR7ZW5jb2RlKHZwYXRoT3V0KX1cIiAke1RhbHR9ICR7VHRpdGxlfS8+XG4gICAgICAgICR7Y2FwfVxuICAgICAgICA8L2ZpZ3VyZT5cbiAgICAgICAgYDtcbiAgICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1ZhbGlkQ2hhcnNldChjaGFyc2V0KSB7XG4gICAgaWYgKHR5cGVvZiBjaGFyc2V0ICE9PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGNvbnN0IGNzID0gY2hhcnNldC50b0xvd2VyQ2FzZSgpO1xuXG4gICAgaWYgKHR5cGVvZiBjcyAhPT0gJ3N0cmluZydcbiAgICAgICAgfHwgKGNzICE9PSAndXRmOCcgJiYgY3MgIT09ICd1dGYtOCdcbiAgICAgICAgJiYgY3MgIT09ICd1dGYxNicgJiYgY3MgIT09ICd1dGYtMTYnXG4gICAgICAgICYmIGNzICE9PSAndXRmMTZiZScgJiYgY3MgIT09ICd1dGYtMTZiZSdcbiAgICAgICAgJiYgY3MgIT09ICd1dGYxNmxlJyAmJiBjcyAhPT0gJ3V0Zi0xNmxlJ1xuICAgICAgICAmJiBjcyAhPT0gJ3V0ZjMyJyAmJiBjcyAhPT0gJ3V0Zi0zMidcbiAgICAgICAgJiYgY3MgIT09ICd1dGYzMmxlJyAmJiBjcyAhPT0gJ3V0Zi0zMmxlJylcbiAgICApIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn1cbiJdfQ==