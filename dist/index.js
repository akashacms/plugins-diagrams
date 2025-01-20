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
    console.log({
        spawnopts, args
    });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9saWIvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBRUEsT0FBTyxJQUFJLE1BQU0sV0FBVyxDQUFDO0FBQzdCLE9BQU8sRUFBdUIsTUFBTSxTQUFTLENBQUM7QUFDOUMsT0FBTyxJQUFJLE1BQU0sV0FBVyxDQUFDO0FBQzdCLE9BQU8sRUFBdUIsS0FBSyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDaEUsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUVyQyxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQztBQUV0QywrQ0FBK0M7QUFDL0MsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FDYixTQUFTLEVBQ1QsSUFBSSxFQUNKLFFBQVEsRUFDUixVQUFVLEVBQ1YsMkJBQTJCLENBQUMsQ0FBQztBQUU3QyxNQUFNLFVBQVUsR0FBRyw2QkFBNkIsQ0FBQztBQUVqRCxPQUFPLEtBQUssTUFBTSxNQUFNLGNBQWMsQ0FBQztBQUN2QyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDckQsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQztBQUVuQyxNQUFNLGNBQWMsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDeEMsTUFBTSxlQUFlLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBRTFDLE1BQU0sT0FBTyxjQUFlLFNBQVEsTUFBTTtJQUl0QztRQUNJLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUh0Qix5Q0FBUTtJQUlSLENBQUM7SUFFRCxTQUFTLENBQUMsTUFBTSxFQUFFLE9BQU87UUFDckIsdUJBQUEsSUFBSSwwQkFBVyxNQUFNLE1BQUEsQ0FBQztRQUN0QixLQUFLLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQyxDQUFDLGtCQUFr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QUUsS0FBSyxTQUFTLElBQUksRUFBRSxLQUFLLFVBQVUsQ0FBQyxFQUMzQyxDQUFDO1FBQ0MsT0FBTyxLQUFLLENBQUM7SUFDakIsQ0FBQztJQUNELE9BQU8sSUFBSSxDQUFDO0FBQ2hCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJcblxuaW1wb3J0IHBhdGggZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCBmcywgeyBwcm9taXNlcyBhcyBmc3AgfSBmcm9tICdub2RlOmZzJztcbmltcG9ydCB1dGlsIGZyb20gJ25vZGU6dXRpbCc7XG5pbXBvcnQgeyBleGVjU3luYywgc3Bhd25TeW5jLCBzcGF3biB9IGZyb20gJ25vZGU6Y2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQge2VuY29kZX0gZnJvbSAnaHRtbC1lbnRpdGllcyc7XG5cbmNvbnN0IF9fZGlybmFtZSA9IGltcG9ydC5tZXRhLmRpcm5hbWU7XG5cbi8vIFBhdGggbmFtZSBmb3IgdGhlIGxvY2FsIGNvcHkgb2YgcGxhbnR1bWwuamFyXG5jb25zdCBwbGFudHVtbEphciA9IHBhdGguam9pbihcbiAgICAgICAgICAgICAgICBfX2Rpcm5hbWUsXG4gICAgICAgICAgICAgICAgJy4uJyxcbiAgICAgICAgICAgICAgICAndmVuZG9yJyxcbiAgICAgICAgICAgICAgICAncGxhbnR1bWwnLFxuICAgICAgICAgICAgICAgICdwbGFudHVtbC1taXQtMS4yMDI1LjAuamFyJyk7XG5cbmNvbnN0IHBsdWdpbk5hbWUgPSAnQGFrYXNoYWNtcy9wbHVnaW5zLWRpYWdyYW1zJztcblxuaW1wb3J0ICogYXMgYWthc2hhIGZyb20gJ2FrYXNoYXJlbmRlcic7XG5pbXBvcnQgeyBQbHVnaW4gfSBmcm9tICdha2FzaGFyZW5kZXIvZGlzdC9QbHVnaW4uanMnO1xuY29uc3QgbWFoYWJodXRhID0gYWthc2hhLm1haGFiaHV0YTtcblxuY29uc3QgX3BsdWdpbl9jb25maWcgPSBTeW1ib2woJ2NvbmZpZycpO1xuY29uc3QgX3BsdWdpbl9vcHRpb25zID0gU3ltYm9sKCdvcHRpb25zJyk7XG5cbmV4cG9ydCBjbGFzcyBEaWFncmFtc1BsdWdpbiBleHRlbmRzIFBsdWdpbiB7XG5cbiAgICAjY29uZmlnO1xuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKHBsdWdpbk5hbWUpO1xuICAgIH1cblxuICAgIGNvbmZpZ3VyZShjb25maWcsIG9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy4jY29uZmlnID0gY29uZmlnO1xuICAgICAgICBzdXBlci5vcHRpb25zID0gb3B0aW9uczsgLy8gPyBvcHRpb25zIDoge307XG4gICAgICAgIG9wdGlvbnMuY29uZmlnID0gY29uZmlnO1xuICAgICAgICBjb25maWcuYWRkTWFoYWJodXRhKG1haGFiaHV0YUFycmF5KG9wdGlvbnMpKTtcbiAgICB9XG5cbiAgICBnZXQgY29uZmlnKCkgeyByZXR1cm4gdGhpcy4jY29uZmlnOyB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtYWhhYmh1dGFBcnJheShvcHRpb25zKSB7XG4gICAgbGV0IHJldCA9IG5ldyBtYWhhYmh1dGEuTWFoYWZ1bmNBcnJheShwbHVnaW5OYW1lLCBvcHRpb25zKTtcbiAgICByZXQuYWRkTWFoYWZ1bmMobmV3IFBsYW50VU1MTG9jYWwoKSk7XG4gICAgcmV0dXJuIHJldDtcbn07XG5cbi8qKlxuICogT3B0aW9ucyBvYmplY3QgdGhhdCBpcyBjb252ZXJ0ZWQgaW50byBwbGFudHVtbC5qYXIgb3B0aW9ucy5cbiAqL1xuZXhwb3J0IHR5cGUgZG9QbGFudFVNTE9wdGlvbnMgPSB7XG4gICAgLyoqXG4gICAgICogVGhlIFBsYW50VU1MIGRpYWdyYW0gdGV4dCB0byB1c2VcbiAgICAgKi9cbiAgICBpbnB1dEJvZHk/OiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBaZXJvIG9yIG1vcmUgZmlsZSBuYW1lcyBmb3IgZmlsZXMgdG8gcmVuZGVyXG4gICAgICovXG4gICAgaW5wdXRGTnM/OiBzdHJpbmdbXTtcblxuICAgIC8qKlxuICAgICAqIFBvc3NpYmxlIGZpbGUgdG8gd3JpdGUgb3V0cHV0IGludG9cbiAgICAgKi9cbiAgICBvdXRwdXRGTj86IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIFRvIHVzZSBhIHNwZWNpZmljIGNoYXJhY3RlciBzZXQuIERlZmF1bHQ6IFVURi04XG4gICAgICovXG4gICAgY2hhcnNldD86IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIFRvIHVzZSBkYXJrIG1vZGUgZm9yIGRpYWdyYW1zXG4gICAgICovXG4gICAgZGFya21vZGU/OiBib29sZWFuO1xuXG4gICAgLyoqXG4gICAgICogVG8gZ2VuZXJhdGUgaW50ZXJtZWRpYXRlIHN2ZWsgZmlsZXNcbiAgICAgKi9cbiAgICBkZWJ1Z3N2ZWs/OiBib29sZWFuO1xuXG4gICAgLyoqXG4gICAgICogXCJleGFtcGxlLnB1bWxcIiBUbyBvdmVycmlkZSAlZmlsZW5hbWUlIHZhcmlhYmxlXG4gICAgICovXG4gICAgZmlsZU5hbWVPdmVycmlkZT86IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIFRvIHVzZSAoTikgdGhyZWFkcyBmb3IgcHJvY2Vzc2luZy4gIFVzZSBcImF1dG9cIiBmb3IgNCB0aHJlYWRzLlxuICAgICAqL1xuICAgIG5idGhyZWFkPzogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogVG8gTk9UIGV4cG9ydCBtZXRhZGF0YSBpbiBQTkcvU1ZHIGdlbmVyYXRlZCBmaWxlc1xuICAgICAqL1xuICAgIG5vbWV0YWRhdGE/OiBib29sZWFuO1xuXG4gICAgLyoqXG4gICAgICogVG8gZ2VuZXJhdGUgaW1hZ2VzIGluIHRoZSBzcGVjaWZpZWQgZGlyZWN0b3J5XG4gICAgICovXG4gICAgb3V0cHV0RGlyPzogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogVG8gZ2VuZXJhdGUgaW1hZ2VzIHVzaW5nIEVQUyBmb3JtYXRcbiAgICAgKi9cbiAgICB0ZXBzPzogYm9vbGVhbjtcblxuICAgIC8qKlxuICAgICAqIFRvIGdlbmVyYXRlIEhUTUwgZmlsZSBmb3IgY2xhc3MgZGlhZ3JhbVxuICAgICAqL1xuICAgIHRodG1sPzogYm9vbGVhbjtcblxuICAgIC8qKlxuICAgICAqIFRvIGdlbmVyYXRlIGltYWdlcyB1c2luZyBMYVRlWC9UaWt6IGZvcm1hdFxuICAgICAqL1xuICAgIHRsYXRleD86IGJvb2xlYW47XG5cbiAgICAvKipcbiAgICAgKiBUbyBnZW5lcmF0ZSBpbWFnZXMgdXNpbmcgUERGIGZvcm1hdFxuICAgICAqL1xuICAgIHRwZGY/OiBib29sZWFuO1xuXG4gICAgLyoqXG4gICAgICogVG8gZ2VuZXJhdGUgaW1hZ2VzIHVzaW5nIFBORyBmb3JtYXQgKGRlZmF1bHQpXG4gICAgICovXG4gICAgdHBuZz86IGJvb2xlYW47XG5cbiAgICAvKipcbiAgICAgKiBUbyBnZW5lcmF0ZSBTQ1hNTCBmaWxlIGZvciBzdGF0ZSBkaWFncmFtXG4gICAgICovXG4gICAgdHNjeG1sPzogYm9vbGVhbjtcblxuICAgIC8qKlxuICAgICAqIFRvIGdlbmVyYXRlIGltYWdlcyB1c2luZyBTVkcgZm9ybWF0XG4gICAgICovXG4gICAgdHN2Zz86IGJvb2xlYW47XG5cbiAgICAvKipcbiAgICAgKiBUbyBnZW5lcmF0ZSBpbWFnZXMgd2l0aCBBU0NJSSBhcnRcbiAgICAgKi9cbiAgICB0dHh0PzogYm9vbGVhbjtcblxuICAgIC8qKlxuICAgICAqIFRvIGdlbmVyYXRlIGltYWdlcyB3aXRoIEFTQ0lJIGFydCB1c2luZyBVbmljb2RlIGNoYXJhY3RlcnNcbiAgICAgKi9cbiAgICB0dXR4dD86IGJvb2xlYW47XG5cbiAgICAvKipcbiAgICAgKiBUbyBnZW5lcmF0ZSBpbWFnZXMgdXNpbmcgVkRYIGZvcm1hdFxuICAgICAqL1xuICAgIHR2ZHg/OiBib29sZWFuO1xuXG4gICAgLyoqXG4gICAgICogVG8gZ2VuZXJhdGUgWE1JIGZpbGUgZm9yIGNsYXNzIGRpYWdyYW1cbiAgICAgKi9cbiAgICB0eG1pPzogYm9vbGVhbjtcblxuICAgIC8qKlxuICAgICAqIFRvIGhhdmUgbG9nIGluZm9ybWF0aW9uXG4gICAgICovXG4gICAgdmVyYm9zZT86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkb1BsYW50VU1MTG9jYWwob3B0aW9ucykge1xuXG4gICAgY29uc3QgYXJncyA9IFtcbiAgICAgICAgLy8gJ2phdmEnLFxuICAgICAgICAnLWphcicsXG4gICAgICAgICctRGphdmEuYXd0LmhlYWRsZXNzPXRydWUnLFxuICAgICAgICAnLS1hZGQtb3BlbnM9amF2YS54bWwvY29tLnN1bi5vcmcuYXBhY2hlLnhhbGFuLmludGVybmFsLnhzbHRjLnRyYXg9QUxMLVVOTkFNRUQnLFxuICAgICAgICBwbGFudHVtbEphcixcbiAgICBdO1xuICAgIGlmIChvcHRpb25zLmNoYXJzZXQpIHtcbiAgICAgICAgYXJncy5wdXNoKCctY2hhcnNldCcpO1xuICAgICAgICBhcmdzLnB1c2gob3B0aW9ucy5jaGFyc2V0KTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMuZGFya21vZGUpIHtcbiAgICAgICAgYXJncy5wdXNoKCctZGFya21vZGUnKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMuZGVidWdzdmVrKSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLWRlYnVnc3ZlaycpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy5maWxlTmFtZU92ZXJyaWRlKSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLWZpbGVuYW1lJyk7XG4gICAgICAgIGFyZ3MucHVzaChvcHRpb25zLmZpbGVOYW1lT3ZlcnJpZGUpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy5uYnRocmVhZCkge1xuICAgICAgICBhcmdzLnB1c2goJy1uYnRocmVhZCcpO1xuICAgICAgICBhcmdzLnB1c2gob3B0aW9ucy5uYnRocmVhZCk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLm5vbWV0YWRhdGEpIHtcbiAgICAgICAgYXJncy5wdXNoKCctbm9tZXRhZGF0YScpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy50ZXBzKSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLXRlcHMnKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMudGh0bWwpIHtcbiAgICAgICAgYXJncy5wdXNoKCctdGh0bWwnKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMudGxhdGV4KSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLXRsYXRleCcpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy50cGRmKSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLXRwZGYnKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMudHBuZykge1xuICAgICAgICBhcmdzLnB1c2goJy10cG5nJyk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnRzY3htbCkge1xuICAgICAgICBhcmdzLnB1c2goJy10c2N4bWwnKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMudHN2Zykge1xuICAgICAgICBhcmdzLnB1c2goJy10c3ZnJyk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnR0eHQpIHtcbiAgICAgICAgYXJncy5wdXNoKCctdHR4dCcpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy50dXR4dCkge1xuICAgICAgICBhcmdzLnB1c2goJy10dXR4dCcpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy50dmR4KSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLXR2ZHgnKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMudHhtaSkge1xuICAgICAgICBhcmdzLnB1c2goJy10eG1pJyk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnZlcmJvc2UpIHtcbiAgICAgICAgYXJncy5wdXNoKCctdmVyYm9zZScpO1xuICAgIH1cblxuICAgIC8vIDAgaW5wdXRGTnMgcmVxdWlyZXMgaW5wdXRCb2R5LCByZXF1aXJlcyBvdXRwdXRGTlxuICAgIC8vIGNoaWxkLnN0ZGluLndyaXRlL2VuZCB3aXRoIGlucHV0Qm9keVxuICAgIC8vIGNoaWxkLnN0ZG91dC5waXBlKGZzLmNyZWF0ZVdyaXRlU3RyZWFtKG91dHB1dEZOKSlcbiAgICAvLyAtcGlwZVxuICAgIC8vXG4gICAgLy8gMSBpbnB1dEZOLCBuby9pZ25vcmUgaW5wdXRCb2R5LCByZXF1aXJlcyBvdXRwdXRGTlxuICAgIC8vIGZzLmNyZWF0ZVJlYWRTdHJlYW0oaW5wdXRGTikucGlwZShjaGlsZC5zdGRpbikgPz9cbiAgICAvLyBjaGlsZC5zdGRvdXQucGlwZShmcy5jcmVhdGVXcml0ZVN0cmVhbShvdXRwdXRGTikpXG4gICAgLy8gLXBpcGVcbiAgICAvL1xuICAgIC8vIElHTk9SRVxuICAgIC8vIElHTk9SRSBlaXRoZXIgMCBpbnB1dCBGTnMgJiBpbnB1dEJvZHksIG9yIDEgaW5wdXRGTlxuICAgIC8vIElHTk9SRSBubyBvdXRwdXRGTlxuICAgIC8vIElHTk9SRSAtdHN2ZyBzZXRcbiAgICAvLyBJR05PUkUgUmVhZCBzdGRvdXQgaW50byBhIEJ1ZmZlciwgdGhhdCdzIGNvbnZlcnRlZCB0byBzdHJpbmdcbiAgICAvLyBJR05PUkUgLXBpcGVcbiAgICAvLyBJR05PUkUgUmV0dXJuIHRoZSBzdHJpbmdcbiAgICAvLyBTRUUgaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTQyNjkyMzMvbm9kZS1qcy1ob3ctdG8tcmVhZC1hLXN0cmVhbS1pbnRvLWEtYnVmZmVyXG4gICAgLy9cbiAgICAvLyBtdWx0aXBsZSBpbnB1dEZOcyAuLiBvcHRpb25hbCBvdXRwdXQtZGlyJ3NcbiAgICAvLyBCb3RoIGdvIG9uIHRoZSBjb21tYW5kLWxpbmVcbiAgICAvL1xuXG4gICAgbGV0IHNwYXdub3B0cyA9IHt9IGFzIGFueTtcblxuICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5pbnB1dEZOcyA9PT0gJ3VuZGVmaW5lZCdcbiAgICAgJiYgIUFycmF5LmlzQXJyYXkob3B0aW9ucy5pbnB1dEZOcylcbiAgICAgJiYgdHlwZW9mIG9wdGlvbnMuaW5wdXRCb2R5ICE9PSAnc3RyaW5nJ1xuICAgICkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sIC0gbm8gaW5wdXQgc291cmNlc2ApO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIG9wdGlvbnMuaW5wdXRGTnMgPT09ICd1bmRlZmluZWQnXG4gICAgICYmICFBcnJheS5pc0FycmF5KG9wdGlvbnMuaW5wdXRGTnMpXG4gICAgICYmIHR5cGVvZiBvcHRpb25zLmlucHV0Qm9keSA9PT0gJ3N0cmluZydcbiAgICAgJiYgdHlwZW9mIG9wdGlvbnMub3V0cHV0Rk4gIT09ICdzdHJpbmcnXG4gICAgKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgcGxhbnR1bWwgLSB3aXRoIGlucHV0Qm9keSwgbm8gb3V0cHV0IGRlc3RpbmF0aW9uYCk7XG4gICAgfVxuICAgIC8vIE5vIGZpbGUgbmFtZXMsIGJ1dCBhbiBpbnB1dEJvZHksIGFuZCBhbiBvdXRwdXQgZmlsZSxcbiAgICAvLyBtZWFucyB3ZSdyZSBwaXBpbmdcbiAgICBpZiAodHlwZW9mIG9wdGlvbnMuaW5wdXRGTnMgPT09ICd1bmRlZmluZWQnXG4gICAgICYmICFBcnJheS5pc0FycmF5KG9wdGlvbnMuaW5wdXRGTnMpXG4gICAgICYmIHR5cGVvZiBvcHRpb25zLmlucHV0Qm9keSA9PT0gJ3N0cmluZydcbiAgICAgJiYgdHlwZW9mIG9wdGlvbnMub3V0cHV0Rk4gPT09ICdzdHJpbmcnXG4gICAgKSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLXBpcGUnKTtcbiAgICB9XG4gICAgaWYgKEFycmF5LmlzQXJyYXkob3B0aW9ucy5pbnB1dEZOcylcbiAgICAgJiYgb3B0aW9ucy5pbnB1dEZOcy5sZW5ndGggPT09IDFcbiAgICAgJiYgdHlwZW9mIG9wdGlvbnMub3V0cHV0Rk4gIT09ICdzdHJpbmcnXG4gICAgKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgcGxhbnR1bWwgLSB3aXRoIG9uZSBpbnB1dCBmaWxlICR7b3B0aW9ucy5pbnB1dEZOc1swXX0gbm8gb3V0cHV0IGZpbGVgKTtcbiAgICB9XG4gICAgLy8gT25lIGZpbGUgbmFtZXMsIGlnbm9yZSBpbnB1dEJvZHksIGFuZCBhbiBvdXRwdXQgZmlsZSxcbiAgICAvLyBtZWFucyB3ZSdyZSBwaXBpbmdcbiAgICBpZiAoQXJyYXkuaXNBcnJheShvcHRpb25zLmlucHV0Rk5zKVxuICAgICAmJiBvcHRpb25zLmlucHV0Rk5zLmxlbmd0aCA9PT0gMVxuICAgICAmJiB0eXBlb2Ygb3B0aW9ucy5vdXRwdXRGTiA9PT0gJ3N0cmluZydcbiAgICApIHtcbiAgICAgICAgYXJncy5wdXNoKCctcGlwZScpO1xuICAgIH1cblxuICAgIGlmIChBcnJheS5pc0FycmF5KG9wdGlvbnMuaW5wdXRGTnMpXG4gICAgICYmIG9wdGlvbnMuaW5wdXRGTnMubGVuZ3RoID4gMVxuICAgICAmJiB0eXBlb2Ygb3B0aW9ucy5vdXRwdXRGTiA9PT0gJ3N0cmluZydcbiAgICApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBwbGFudHVtbCAtIHdpdGggbXVsdGlwbGUgaW5wdXQgZmlsZXMsIG91dHB1dCBmaWxlIG5vdCBhbGxvd2VkYClcbiAgICB9XG5cbiAgICAvLyBtdWx0aXBsZSBmaWxlIG5hbWVzLCBwdXNoIG9udG8gYXJnc1xuICAgIGlmIChBcnJheS5pc0FycmF5KG9wdGlvbnMuaW5wdXRGTnMpXG4gICAgICYmIG9wdGlvbnMuaW5wdXRGTnMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKGNvbnN0IGlucHV0Rk4gb2Ygb3B0aW9ucy5pbnB1dEZOcykge1xuICAgICAgICAgICAgYXJncy5wdXNoKGlucHV0Rk4pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBvcHRpb25zLm91dHB1dERpciA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgYXJncy5wdXNoKCctb3V0cHV0Jyk7XG4gICAgICAgIGFyZ3MucHVzaChvcHRpb25zLm91dHB1dERpcik7XG4gICAgfVxuXG4gICAgLy8gTm93IHRoYXQgdGhlIGNvbW1hbmQgYXJncyBhbmQgc3Bhd25vcHRzIGFyZSBzZXQgdXBcbiAgICAvLyBydW4gdGhlIGNvbW1hbmRcbiAgICBjb25zb2xlLmxvZyh7XG4gICAgICAgIHNwYXdub3B0cywgYXJnc1xuICAgIH0pO1xuICAgIGNvbnN0IGNoaWxkID0gc3Bhd24oJ2phdmEnLCBhcmdzLCBzcGF3bm9wdHMpO1xuXG4gICAgLy8gTmV4dCwgc2V0IHVwIHN0ZGluL3N0ZG91dCBwaXBlcyBpbiBjYXNlXG4gICAgLy8gb2YgdXNpbmcgLXBpcGUgbW9kZVxuXG4gICAgLy8gTm8gaW5wdXQgZmlsZXMsIHdpdGggaW5wdXRCb2R5LCBhbmQgb3V0cHV0Rk4sXG4gICAgLy8gc2V0IHVwIHRoZSBwaXBpbmcgZnJvbSBpbnB1dCB0byBvdXRwdXRcbiAgICBpZiAodHlwZW9mIG9wdGlvbnMuaW5wdXRGTnMgPT09ICd1bmRlZmluZWQnXG4gICAgICYmICFBcnJheS5pc0FycmF5KG9wdGlvbnMuaW5wdXRGTnMpXG4gICAgICYmIHR5cGVvZiBvcHRpb25zLmlucHV0Qm9keSA9PT0gJ3N0cmluZydcbiAgICAgJiYgdHlwZW9mIG9wdGlvbnMub3V0cHV0Rk4gPT09ICdzdHJpbmcnXG4gICAgKSB7XG4gICAgICAgIGNoaWxkLnN0ZGluLndyaXRlKG9wdGlvbnMuaW5wdXRCb2R5KTtcbiAgICAgICAgY2hpbGQuc3Rkb3V0LnBpcGUoZnMuY3JlYXRlV3JpdGVTdHJlYW0ob3B0aW9ucy5vdXRwdXRGTikpO1xuICAgICAgICBjaGlsZC5zdGRpbi5lbmQoKTtcbiAgICB9XG5cbiAgICAvLyBPbmUgZmlsZSBuYW1lcywgaWdub3JlIGlucHV0Qm9keSwgYW5kIGFuIG91dHB1dCBmaWxlLFxuICAgIC8vIHNldCB1cCB0aGUgcGlwaW5nIGZyb20gaW5wdXQgdG8gb3V0cHV0XG4gICAgaWYgKEFycmF5LmlzQXJyYXkob3B0aW9ucy5pbnB1dEZOcylcbiAgICAgJiYgb3B0aW9ucy5pbnB1dEZOcy5sZW5ndGggPT09IDFcbiAgICAgJiYgdHlwZW9mIG9wdGlvbnMub3V0cHV0Rk4gPT09ICdzdHJpbmcnXG4gICAgKSB7XG4gICAgICAgIC8vIGNvbnN0IGlucCA9IGF3YWl0IGZzcC5yZWFkRmlsZShvcHRpb25zLmlucHV0Rk5zWzBdLCAndXRmLTgnKTtcbiAgICAgICAgLy8gY2hpbGQuc3RkaW4ud3JpdGUoaW5wKTtcbiAgICAgICAgZnMuY3JlYXRlUmVhZFN0cmVhbShvcHRpb25zLmlucHV0Rk5zWzBdKS5waXBlKGNoaWxkLnN0ZGluKTtcbiAgICAgICAgY2hpbGQuc3Rkb3V0LnBpcGUoZnMuY3JlYXRlV3JpdGVTdHJlYW0ob3B0aW9ucy5vdXRwdXRGTikpO1xuICAgICAgICAvLyBjaGlsZC5zdGRpbi5lbmQoKTtcbiAgICB9XG5cbiAgICAvLyBGaW5hbGx5LCB3YWl0IGZvciB0aGUgY2hpbGQgdG8gZmluaXNoXG5cbiAgICBjaGlsZC5vbignZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYHBsYW50dW1sIEVSUk9SIGluIGNoaWxkIHByb2Nlc3MgJHtlcnIubWVzc2FnZX1gKTtcbiAgICB9KTtcblxuICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgY2hpbGQub24oJ2Nsb3NlJywgKGNvZGUpID0+IHtcbiAgICAgICAgICAgIGlmIChjb2RlID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh1bmRlZmluZWQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKGBwbGFudHVtbCBmYWlsIHdpdGggY29kZSAke2NvZGV9YCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcblxufVxuXG4vKipcbiAqIEhhbmRsZSBjb252ZXJ0aW5nIGEgc2luZ2xlIFBsYW50VU1MIGRpYWdyYW0gZm9yXG4gKiBkaXNwbGF5IGluIGEgZG9jdW1lbnQuXG4gKiBcbiAqIFRoZSBkb2N1bWVudCBkZXNjcmlwdGlvbiBpcyBlaXRoZXIgaW5saW5lXG4gKiB0byB0aGUgPGRpYWdyYW1zLXBsYW50dW1sPiB0YWcsIG9yIGVsc2UgYSBzaW5nbGVcbiAqIGlucHV0IGZpbGUgaW4gdGhlIGlucHV0LWZpbGUgYXR0cmlidXRlLlxuICogXG4gKiBUaGVyZSBpcyBhIHNpbmdsZSBvdXRwdXQtZmlsZSBhdHRyaWJ1dGUgdG9cbiAqIGZvciBhIGZpbGUgdG8gcmVjZWl2ZSBhcyBvdXRwdXQuICBUaGlzIGZpbGVcbiAqIGlzIHdyaXR0ZW4gZGlyZWN0bHkgdG8gdGhlIHJlbmRlcmluZ091dHB1dCBkaXJlY3RvcnkuXG4gKiBcbiAqIFRoaXMgd2lsbCBzdXBwb3J0IG9ubHkgUE5HIGFuZCBTVkcgb3V0cHV0IGZvcm1hdHMuXG4gKiBcbiAqIFRoZSBvdXRwdXQtZmlsZSBpcyBhIFZQYXRoIHNwZWNpZnlpbmcgYW5cbiAqIG91dHB1dCBkaXJlY3RvcnkgbG9jYXRpb24uXG4gKiBcbiAqIGlzQWJzb2x1dGUob3V0cHV0LWZpbGUpIC0gbWVhbnMgaXQgaXMgcm9vdGVkXG4gKiB0byB0aGUgb3V0cHV0IGRpcmVjdG9yeS4gIE90aGVyd2lzZSBpdCBpcyByZWxhdGl2ZVxuICogdG8gdGhlIGRpcm5hbWUobWV0YWRhdGEuZG9jdW1lbnQucGF0aCkuXG4gKi9cbmNsYXNzIFBsYW50VU1MTG9jYWwgZXh0ZW5kcyBtYWhhYmh1dGEuQ3VzdG9tRWxlbWVudCB7XG5cblx0Z2V0IGVsZW1lbnROYW1lKCkgeyByZXR1cm4gXCJkaWFncmFtcy1wbGFudHVtbFwiOyB9XG4gICAgYXN5bmMgcHJvY2VzcygkZWxlbWVudCwgbWV0YWRhdGEsIGRpcnR5OiBGdW5jdGlvbikge1xuXG4gICAgICAgIGNvbnN0IG9wdGlvbnM6IGRvUGxhbnRVTUxPcHRpb25zID0ge1xuICAgICAgICAgICAgLy8gVXNpbmcgLnRleHQoKSBlbGltaW5hdGVzIEhUTUwgZm9ybWF0dGluZy5cbiAgICAgICAgICAgIGlucHV0Qm9keTogJGVsZW1lbnQudGV4dCgpLFxuICAgICAgICAgICAgaW5wdXRGTnM6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIG91dHB1dEZOOiAkZWxlbWVudC5hdHRyKCdvdXRwdXQtZmlsZScpXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gRW5zdXJlIHRoZXJlIGlzIGVpdGhlciBhbiBpbnB1dC1maWxlXG4gICAgICAgIC8vIG9yIGFuIGlucHV0IGJvZHlcblxuICAgICAgICBjb25zdCBpbmYgPSAgJGVsZW1lbnQuYXR0cignaW5wdXQtZmlsZScpO1xuICAgICAgICBpZiAodHlwZW9mIGluZiA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIG9wdGlvbnMuaW5wdXRGTnMgPSBbIGluZiBdO1xuICAgICAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoaW5mKSAmJiBpbmYubGVuZ3RoID49IDEpIHtcbiAgICAgICAgICAgIG9wdGlvbnMuaW5wdXRGTnMgPSBbIGluZlswXSBdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3B0aW9ucy5pbnB1dEZOcyA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMuaW5wdXRCb2R5ICE9PSAnc3RyaW5nJ1xuICAgICAgICAgJiYgKFxuICAgICAgICAgICAgIUFycmF5LmlzQXJyYXkob3B0aW9ucy5pbnB1dEZOcylcbiAgICAgICAgIHx8IG9wdGlvbnMuaW5wdXRGTnMubGVuZ3RoIDw9IDBcbiAgICAgICAgKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQbGFudFVNTExvY2FsIG9uZSBpbnB1dCBmaWxlIG9yIGlubGluZSBkaWFncmFtIGlzIHJlcXVpcmVkYCk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgdnBhdGhJbjtcbiAgICAgICAgbGV0IGZzcGF0aEluO1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShvcHRpb25zLmlucHV0Rk5zKSAmJiBvcHRpb25zLmlucHV0Rk5zLmxlbmd0aCA9PT0gMSkge1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMuaW5wdXRGTnNbMF0gIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQbGFudFVNTExvY2FsIG5vIGlucHV0IGZpbGUgRk4gZ2l2ZW4gaW4gJHt1dGlsLmluc3BlY3Qob3B0aW9ucy5pbnB1dEZOcyl9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBpbkZOID0gb3B0aW9ucy5pbnB1dEZOc1swXTtcbiAgICAgICAgICAgIGlmIChwYXRoLmlzQWJzb2x1dGUoaW5GTikpIHtcbiAgICAgICAgICAgICAgICB2cGF0aEluID0gaW5GTjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbGV0IGRpciA9IHBhdGguZGlybmFtZShtZXRhZGF0YS5kb2N1bWVudC5wYXRoKTtcbiAgICAgICAgICAgICAgICB2cGF0aEluID0gcGF0aC5ub3JtYWxpemUoXG4gICAgICAgICAgICAgICAgICAgIHBhdGguam9pbignLycsIGRpciwgaW5GTilcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBkb2N1bWVudHMgPSB0aGlzLmFycmF5Lm9wdGlvbnMuY29uZmlnLmFrYXNoYS5maWxlY2FjaGUuZG9jdW1lbnRzQ2FjaGU7XG4gICAgICAgICAgICBjb25zdCBhc3NldHMgPSB0aGlzLmFycmF5Lm9wdGlvbnMuY29uZmlnLmFrYXNoYS5maWxlY2FjaGUuYXNzZXRzQ2FjaGU7XG4gICAgICAgICAgICBjb25zdCBkb2MgPSBhd2FpdCBkb2N1bWVudHMuZmluZCh2cGF0aEluKTtcbiAgICAgICAgICAgIGxldCBhc3NldDtcblxuICAgICAgICAgICAgaWYgKCFkb2MpIGFzc2V0ID0gYXdhaXQgYXNzZXRzLmZpbmQodnBhdGhJbik7XG4gICBcbiAgICAgICAgICAgIGlmICghZG9jICYmICFhc3NldCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgUGxhbnRVTUxMb2NhbCBubyBwbGFudHVtbCBhc3NldCBvciBkb2N1bWVudCBmaWxlICBmb3VuZCBmb3IgJHt2cGF0aElufWApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZG9jKSBmc3BhdGhJbiA9IGRvYy5mc3BhdGg7XG4gICAgICAgICAgICBlbHNlIGlmIChhc3NldCkgZnNwYXRoSW4gPSBhc3NldC5mc3BhdGg7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJZiB0aGVyZSB3YXMgYW4gaW5wdXQgZmlsZSwgcmVjb3JkIGl0cyBmdWxsIHBhdGhuYW1lXG4gICAgICAgIC8vIGFzIHRoZSBpbnB1dEZOcyBlbnRyeVxuICAgICAgICBpZiAoZnNwYXRoSW4pIG9wdGlvbnMuaW5wdXRGTnMgPSBbIGZzcGF0aEluIF07XG5cbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLm91dHB1dEZOICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQbGFudFVNTExvY2FsIG5vIG91dHB1dCBmaWxlIG5hbWUgd2FzIHN1cHBsaWVkYCk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgdnBhdGhPdXQ7XG4gICAgICAgIGlmICghIHBhdGguaXNBYnNvbHV0ZShvcHRpb25zLm91dHB1dEZOKSkge1xuICAgICAgICAgICAgbGV0IGRpciA9IHBhdGguZGlybmFtZShtZXRhZGF0YS5kb2N1bWVudC5wYXRoKTtcbiAgICAgICAgICAgIHZwYXRoT3V0ID0gcGF0aC5ub3JtYWxpemUoXG4gICAgICAgICAgICAgICAgcGF0aC5qb2luKCcvJywgZGlyLCBvcHRpb25zLm91dHB1dEZOKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZwYXRoT3V0ID0gb3B0aW9ucy5vdXRwdXRGTjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENvbXB1dGUgZnNwYXRoIGZvciB2cGF0aE91dFxuICAgICAgICBjb25zdCBmc3BhdGhPdXQgPSBwYXRoLm5vcm1hbGl6ZShwYXRoLmpvaW4oXG4gICAgICAgICAgICB0aGlzLmFycmF5Lm9wdGlvbnMuY29uZmlnLnJlbmRlckRlc3RpbmF0aW9uLCB2cGF0aE91dFxuICAgICAgICApKTtcbiAgICAgICAgb3B0aW9ucy5vdXRwdXRGTiA9IGZzcGF0aE91dDtcblxuICAgICAgICBjb25zdCBpZCA9ICRlbGVtZW50LmF0dHIoJ2lkJyk7XG4gICAgICAgIGNvbnN0IGNsYXp6ID0gJGVsZW1lbnQuYXR0cignY2xhc3MnKTtcbiAgICAgICAgY29uc3QgYWx0ID0gJGVsZW1lbnQuYXR0cignYWx0Jyk7XG4gICAgICAgIGNvbnN0IHRpdGxlID0gJGVsZW1lbnQuYXR0cigndGl0bGUnKTtcbiAgICAgICAgY29uc3QgY2FwdGlvbiA9ICRlbGVtZW50LmF0dHIoJ2NhcHRpb24nKTtcbiAgICAgICAgY29uc3QgY3MgPSAkZWxlbWVudC5hdHRyKCdjaGFyc2V0Jyk7XG4gICAgICAgIGlmIChpc1ZhbGlkQ2hhcnNldChjcykpIG9wdGlvbnMuY2hhcnNldCA9IGNzO1xuICAgICAgICBvcHRpb25zLmRhcmttb2RlID0gdHlwZW9mICRlbGVtZW50LnByb3AoJ2Rhcmttb2RlJykgIT09ICd1bmRlZmluZWQnO1xuICAgICAgICAvLyBvcHRpb25zLmRlYnVnc3ZlayA9ICRlbGVtZW50LnByb3AoJ2RlYnVnc3ZlaycpO1xuICAgICAgICAvLyBvcHRpb25zLmZpbGVOYW1lT3ZlcnJpZGUgPSAkZWxlbWVudC5hdHRyKCdmaWxlbmFtZScpO1xuICAgICAgICBjb25zdCBuYnRocmVhZCA9ICRlbGVtZW50LmF0dHIoJ25idGhyZWFkJyk7XG4gICAgICAgIGlmICh0eXBlb2YgbmJ0aHJlYWQgPT09ICdzdHJpbmcnKSBvcHRpb25zLm5idGhyZWFkID0gbmJ0aHJlYWQ7XG4gICAgICAgIG9wdGlvbnMubm9tZXRhZGF0YSA9IHR5cGVvZiAkZWxlbWVudC5wcm9wKCdub21ldGFkYXRhJykgIT09ICd1bmRlZmluZWQnO1xuICAgICAgICAvLyBvcHRpb25zLnRlcHMgPSAkZWxlbWVudC5wcm9wKCd0ZXBzJyk7XG4gICAgICAgIC8vIG9wdGlvbnMudGh0bWwgPSAkZWxlbWVudC5wcm9wKCd0aHRtbCcpO1xuICAgICAgICAvLyBvcHRpb25zLnRsYXRleCA9ICRlbGVtZW50LnByb3AoJ3RsYXRleCcpO1xuICAgICAgICAvLyBvcHRpb25zLnRwZGYgPSAkZWxlbWVudC5wcm9wKCd0cGRmJyk7XG4gICAgICAgIG9wdGlvbnMudHBuZyA9IHR5cGVvZiAkZWxlbWVudC5wcm9wKCd0cG5nJykgIT09ICd1bmRlZmluZWQnO1xuICAgICAgICAvLyBvcHRpb25zLnRzY3htbCA9ICRlbGVtZW50LnByb3AoJ3RzY3htbCcpO1xuICAgICAgICBvcHRpb25zLnRzdmcgPSB0eXBlb2YgJGVsZW1lbnQucHJvcCgndHN2ZycpICE9PSAndW5kZWZpbmVkJztcbiAgICAgICAgLy8gb3B0aW9ucy50dHh0ID0gJGVsZW1lbnQucHJvcCgndHR4dCcpO1xuICAgICAgICAvLyBvcHRpb25zLnR1dHh0ID0gJGVsZW1lbnQucHJvcCgndHV0eHQnKTtcbiAgICAgICAgLy8gb3B0aW9ucy50dmR4ID0gJGVsZW1lbnQucHJvcCgndHZkeCcpO1xuICAgICAgICAvLyBvcHRpb25zLnR4bWkgPSAkZWxlbWVudC5wcm9wKCd0eG1pJyk7XG4gICAgICAgIC8vIG9wdGlvbnMudmVyYm9zZSA9ICRlbGVtZW50LnByb3AoJ3ZlcmJvc2UnKTtcblxuICAgICAgICBpZiAob3B0aW9ucy50cG5nICYmIG9wdGlvbnMudHN2Zykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQbGFudFVNTExvY2FsIGNhbm5vdCB1c2UgYm90aCB0cG5nIGFuZCB0c3ZnYCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFvcHRpb25zLnRwbmcgJiYgIW9wdGlvbnMudHN2Zykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQbGFudFVNTExvY2FsIG11c3QgdXNlIG9uZSBvZiB0cG5nIG9yIHRzdmdgKTtcbiAgICAgICAgfVxuICAgICAgICBhd2FpdCBkb1BsYW50VU1MTG9jYWwob3B0aW9ucyk7XG5cbiAgICAgICAgY29uc3QgY2FwID0gdHlwZW9mIGNhcHRpb24gPT09ICdzdHJpbmcnXG4gICAgICAgICAgICA/IGA8ZmlnY2FwdGlvbj4ke2VuY29kZShjYXB0aW9uKX08L2ZpZ2NhcHRpb24+YFxuICAgICAgICAgICAgOiAnJztcbiAgICAgICAgY29uc3QgVGFsdCA9IHR5cGVvZiBhbHQgPT09ICdzdHJpbmcnXG4gICAgICAgICAgICA/IGBhbHQ9XCIke2VuY29kZShhbHQpfVwiYFxuICAgICAgICAgICAgOiAnJztcbiAgICAgICAgY29uc3QgVHRpdGxlID0gdHlwZW9mIHRpdGxlID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgPyBgdGl0bGU9XCIke2VuY29kZSh0aXRsZSl9XCJgXG4gICAgICAgICAgICA6ICcnO1xuICAgICAgICBjb25zdCBUaWQgPSB0eXBlb2YgaWQgPT09ICdzdHJpbmcnXG4gICAgICAgICAgICA/IGBpZD1cIiR7ZW5jb2RlKGlkKX1gXG4gICAgICAgICAgICA6ICcnO1xuICAgICAgICBjb25zdCBUY2xhenogPSB0eXBlb2YgY2xhenogPT09ICdzdHJpbmcnXG4gICAgICAgICAgICA/IGBjbGFzcz1cIiR7ZW5jb2RlKGNsYXp6KX1gXG4gICAgICAgICAgICA6ICcnO1xuICAgICAgICAvLyBUT0RPIGVuc3VyZSBvdXRwdXRGTiBpcyB2cGF0aCByZWxhdGl2ZSB0byByb290XG4gICAgICAgIHJldHVybiBgXG4gICAgICAgIDxmaWd1cmUgJHtUaWR9ICR7VGNsYXp6fT5cbiAgICAgICAgPGltZyBzcmM9XCIke2VuY29kZSh2cGF0aE91dCl9XCIgJHtUYWx0fSAke1R0aXRsZX0vPlxuICAgICAgICAke2NhcH1cbiAgICAgICAgPC9maWd1cmU+XG4gICAgICAgIGA7XG4gICAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNWYWxpZENoYXJzZXQoY2hhcnNldCkge1xuICAgIGlmICh0eXBlb2YgY2hhcnNldCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBjb25zdCBjcyA9IGNoYXJzZXQudG9Mb3dlckNhc2UoKTtcblxuICAgIGlmICh0eXBlb2YgY3MgIT09ICdzdHJpbmcnXG4gICAgICAgIHx8IChjcyAhPT0gJ3V0ZjgnICYmIGNzICE9PSAndXRmLTgnXG4gICAgICAgICYmIGNzICE9PSAndXRmMTYnICYmIGNzICE9PSAndXRmLTE2J1xuICAgICAgICAmJiBjcyAhPT0gJ3V0ZjE2YmUnICYmIGNzICE9PSAndXRmLTE2YmUnXG4gICAgICAgICYmIGNzICE9PSAndXRmMTZsZScgJiYgY3MgIT09ICd1dGYtMTZsZSdcbiAgICAgICAgJiYgY3MgIT09ICd1dGYzMicgJiYgY3MgIT09ICd1dGYtMzInXG4gICAgICAgICYmIGNzICE9PSAndXRmMzJsZScgJiYgY3MgIT09ICd1dGYtMzJsZScpXG4gICAgKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59XG4iXX0=