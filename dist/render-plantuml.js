import path from 'node:path';
import fs, { promises as fsp } from 'node:fs';
import util from 'node:util';
import { deflateRawSync } from 'node:zlib';
import { spawn } from 'node:child_process';
import { encode } from 'html-entities';
import * as akasha from 'akasharender';
import { adaptInlineSvg } from './render-mermaid.js';
// The PlantUML JAR is no longer distributed with this package.
// Rendering PlantUML requires the user to either run a PlantUML
// server (PLANTUML_SERVER_URL) or download the JAR (PLANTUML_JAR).
// See the README section "Setting up PlantUML rendering".
const plantumlSetupHelp = `See the "Setting up PlantUML rendering" section of the @akashacms/diagram-makers README: https://github.com/akashacms/plugins-diagrams#setting-up-plantuml-rendering`;
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
 * Guard against diagram text that PlantUML would not
 * render correctly.  In -pipe mode the JAR silently emits
 * a "Welcome to PlantUML" placeholder image, with a zero
 * exit code, when the input has no complete
 * @start...@end block, while a PlantUML server tolerates
 * an incomplete block - so the two backends silently
 * disagree.  Failing loudly makes the authoring mistake
 * visible regardless of backend.
 */
function checkDiagramComplete(diagram, source) {
    if (!/^\s*@start\w/m.test(diagram)) {
        throw new Error(`plantuml - the diagram from ${source} has no @start line (such as @startuml)`);
    }
    if (!/^\s*@end\w/m.test(diagram)) {
        throw new Error(`plantuml - the diagram from ${source} has no @end line (such as @enduml)`);
    }
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
    let source;
    if (Array.isArray(options.inputFNs)
        && options.inputFNs.length > 1) {
        throw new Error(`plantuml server - only one input file is supported by PlantUML server rendering - use the JAR instead (PLANTUML_JAR)`);
    }
    else if (Array.isArray(options.inputFNs)
        && options.inputFNs.length === 1) {
        source = options.inputFNs[0];
        diagram = await fsp.readFile(source, 'utf-8');
    }
    else if (typeof options.inputBody === 'string'
        && options.inputBody.length >= 1) {
        source = 'the inline diagram body';
        diagram = options.inputBody;
    }
    else {
        throw new Error(`plantuml server - no input sources`);
    }
    checkDiagramComplete(diagram, source);
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
    let pipeInput;
    if (pipeMode) {
        args.push('-pipe');
        if (Array.isArray(options.inputFNs)
            && options.inputFNs.length === 1) {
            pipeInput = await fsp.readFile(options.inputFNs[0], 'utf-8');
            checkDiagramComplete(pipeInput, options.inputFNs[0]);
        }
        else {
            pipeInput = options.inputBody;
            checkDiagramComplete(pipeInput, 'the inline diagram body');
        }
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
        child.stdin.write(pipeInput);
        child.stdin.end();
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
export class PlantUMLLocal extends akasha.CustomElement {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuZGVyLXBsYW50dW1sLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vbGliL3JlbmRlci1wbGFudHVtbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLElBQUksTUFBTSxXQUFXLENBQUM7QUFDN0IsT0FBTyxFQUFFLEVBQUUsRUFBRSxRQUFRLElBQUksR0FBRyxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBQzlDLE9BQU8sSUFBSSxNQUFNLFdBQVcsQ0FBQztBQUM3QixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBQzNDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUMzQyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3ZDLE9BQU8sS0FBSyxNQUFNLE1BQU0sY0FBYyxDQUFDO0FBQ3ZDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUVyRCwrREFBK0Q7QUFDL0QsZ0VBQWdFO0FBQ2hFLG1FQUFtRTtBQUNuRSwwREFBMEQ7QUFFMUQsTUFBTSxpQkFBaUIsR0FDbkIsc0tBQXNLLENBQUM7QUFrSTNLOzs7Ozs7Ozs7Ozs7Ozs7R0FlRztBQUNILE1BQU0sQ0FBQyxLQUFLLFVBQVUsVUFBVSxDQUM1QixPQUEwQjtJQUUxQixNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsU0FBUztXQUN4QixPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDO0lBQzNDLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPO1dBQ3BCLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDO0lBQ3BDLElBQUksT0FBTyxTQUFTLEtBQUssUUFBUSxJQUFJLFNBQVMsQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFLENBQUM7UUFDekQsT0FBTyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNyQyxDQUFDO0lBQ0QsSUFBSSxPQUFPLE9BQU8sS0FBSyxRQUFRLElBQUksT0FBTyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUNyRCxPQUFPLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBQ0QsTUFBTSxJQUFJLEtBQUssQ0FBQyw2T0FBNk8saUJBQWlCLEVBQUUsQ0FBQyxDQUFDO0FBQ3RSLENBQUM7QUFFRCxvREFBb0Q7QUFDcEQsaURBQWlEO0FBQ2pELHdDQUF3QztBQUN4QyxNQUFNLGdCQUFnQixHQUNsQixrRUFBa0UsQ0FBQztBQUV2RTs7Ozs7R0FLRztBQUNILE1BQU0sVUFBVSxjQUFjLENBQUMsT0FBZTtJQUMxQyxNQUFNLFFBQVEsR0FBRyxjQUFjLENBQzNCLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDakQsSUFBSSxHQUFHLEdBQUcsRUFBRSxDQUFDO0lBQ2IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1FBQzFDLE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN2QixNQUFNLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN6RCxNQUFNLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN6RCxHQUFHLElBQUksZ0JBQWdCLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztjQUN6QixnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO2NBQ2hELGdCQUFnQixDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7Y0FDaEQsZ0JBQWdCLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7SUFDRCxPQUFPLEdBQUcsQ0FBQztBQUNmLENBQUM7QUFFRDs7Ozs7Ozs7O0dBU0c7QUFDSCxTQUFTLG9CQUFvQixDQUFDLE9BQWUsRUFBRSxNQUFjO0lBQ3pELElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7UUFDakMsTUFBTSxJQUFJLEtBQUssQ0FBQywrQkFBK0IsTUFBTSx5Q0FBeUMsQ0FBQyxDQUFDO0lBQ3BHLENBQUM7SUFDRCxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1FBQy9CLE1BQU0sSUFBSSxLQUFLLENBQUMsK0JBQStCLE1BQU0scUNBQXFDLENBQUMsQ0FBQztJQUNoRyxDQUFDO0FBQ0wsQ0FBQztBQUVEOzs7Ozs7Ozs7Ozs7O0dBYUc7QUFDSCxNQUFNLENBQUMsS0FBSyxVQUFVLGdCQUFnQixDQUNsQyxPQUEwQjtJQUUxQixNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsU0FBUztXQUN4QixPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDO0lBQzNDLElBQUksT0FBTyxTQUFTLEtBQUssUUFBUSxJQUFJLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDeEQsTUFBTSxJQUFJLEtBQUssQ0FBQyx3RkFBd0YsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDO0lBQ2pJLENBQUM7SUFFRCxLQUFLLE1BQU0sV0FBVyxJQUFJO1FBQ3RCLE1BQU0sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxRQUFRO1FBQzNDLE1BQU0sRUFBRSxNQUFNLEVBQUUsT0FBTztLQUMxQixFQUFFLENBQUM7UUFDQSxJQUFJLE9BQU8sQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO1lBQ3ZCLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLFdBQVcsbUdBQW1HLENBQUMsQ0FBQztRQUM3SixDQUFDO0lBQ0wsQ0FBQztJQUNELElBQUksT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ25CLE1BQU0sSUFBSSxLQUFLLENBQUMsK0dBQStHLENBQUMsQ0FBQztJQUNySSxDQUFDO0lBRUQsSUFBSSxNQUFNLENBQUM7SUFDWCxJQUFJLE9BQU8sQ0FBQyxJQUFJO1FBQUUsTUFBTSxHQUFHLEtBQUssQ0FBQztTQUM1QixJQUFJLE9BQU8sQ0FBQyxJQUFJO1FBQUUsTUFBTSxHQUFHLEtBQUssQ0FBQzs7UUFDakMsTUFBTSxHQUFHLEtBQUssQ0FBQztJQUVwQixJQUFJLE9BQU8sQ0FBQztJQUNaLElBQUksTUFBTSxDQUFDO0lBQ1gsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUM7V0FDL0IsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUM3QixDQUFDO1FBQ0MsTUFBTSxJQUFJLEtBQUssQ0FBQyxzSEFBc0gsQ0FBQyxDQUFDO0lBQzVJLENBQUM7U0FBTSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQztXQUN0QyxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQy9CLENBQUM7UUFDQyxNQUFNLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM3QixPQUFPLEdBQUcsTUFBTSxHQUFHLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNsRCxDQUFDO1NBQU0sSUFBSSxPQUFPLE9BQU8sQ0FBQyxTQUFTLEtBQUssUUFBUTtXQUM1QyxPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQy9CLENBQUM7UUFDQyxNQUFNLEdBQUcseUJBQXlCLENBQUM7UUFDbkMsT0FBTyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUM7SUFDaEMsQ0FBQztTQUFNLENBQUM7UUFDSixNQUFNLElBQUksS0FBSyxDQUFDLG9DQUFvQyxDQUFDLENBQUM7SUFDMUQsQ0FBQztJQUNELG9CQUFvQixDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztJQUV0QyxNQUFNLEdBQUcsR0FBRyxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxJQUFJLE1BQU0sSUFBSSxjQUFjLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztJQUVwRixJQUFJLEdBQUcsQ0FBQztJQUNSLElBQUksQ0FBQztRQUNELEdBQUcsR0FBRyxNQUFNLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUMzQixDQUFDO0lBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztRQUNYLE1BQU0sSUFBSSxLQUFLLENBQUMsd0RBQXdELFNBQVMsTUFBTSxHQUFHLENBQUMsT0FBTyxNQUFNLGlCQUFpQixFQUFFLENBQUMsQ0FBQztJQUNqSSxDQUFDO0lBQ0QsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUNWLGdEQUFnRDtRQUNoRCwrQ0FBK0M7UUFDL0MsaURBQWlEO1FBQ2pELHdDQUF3QztRQUN4QyxNQUFNLElBQUksS0FBSyxDQUFDLHFCQUFxQixTQUFTLG1CQUFtQixHQUFHLENBQUMsTUFBTSxJQUFJLEdBQUcsQ0FBQyxVQUFVLGtCQUFrQixDQUFDLENBQUM7SUFDckgsQ0FBQztJQUVELE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztJQUNqRCxJQUFJLE9BQU8sT0FBTyxDQUFDLFFBQVEsS0FBSyxRQUFRO1dBQ3BDLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxJQUFJLENBQUMsRUFDOUIsQ0FBQztRQUNDLE1BQU0sR0FBRyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQzNDLE9BQU8sU0FBUyxDQUFDO0lBQ3JCLENBQUM7SUFDRCxPQUFPLEdBQUcsQ0FBQztBQUNmLENBQUM7QUFFRCxNQUFNLENBQUMsS0FBSyxVQUFVLGVBQWUsQ0FDakMsT0FBMEI7SUFHMUIsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLE9BQU87V0FDeEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUM7SUFDcEMsSUFBSSxPQUFPLFdBQVcsS0FBSyxRQUFRO1dBQy9CLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUN4QixDQUFDO1FBQ0MsTUFBTSxJQUFJLEtBQUssQ0FBQyxvSkFBb0osaUJBQWlCLEVBQUUsQ0FBQyxDQUFDO0lBQzdMLENBQUM7SUFDRCxJQUFJLENBQUM7UUFDRCxNQUFNLEdBQUcsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDckQsQ0FBQztJQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7UUFDWCxNQUFNLElBQUksS0FBSyxDQUFDLDJCQUEyQixXQUFXLHdDQUF3QyxpQkFBaUIsRUFBRSxDQUFDLENBQUM7SUFDdkgsQ0FBQztJQUVELE1BQU0sSUFBSSxHQUFHO1FBQ1QsVUFBVTtRQUNWLE1BQU07UUFDTiwwQkFBMEI7UUFDMUIsK0VBQStFO1FBQy9FLFdBQVc7S0FDZCxDQUFDO0lBQ0YsSUFBSSxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDbEIsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUN0QixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUMvQixDQUFDO0lBQ0QsSUFBSSxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDbkIsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUMzQixDQUFDO0lBQ0QsSUFBSSxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDcEIsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUM1QixDQUFDO0lBQ0QsSUFBSSxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUMzQixJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDeEMsQ0FBQztJQUNELElBQUksT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ25CLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDdkIsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDaEMsQ0FBQztJQUNELElBQUksT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDN0IsQ0FBQztJQUNELElBQUksT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ2YsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN2QixDQUFDO0lBQ0QsSUFBSSxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDaEIsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUN4QixDQUFDO0lBQ0QsSUFBSSxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDakIsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUN6QixDQUFDO0lBQ0QsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDZixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3ZCLENBQUM7SUFDRCxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNmLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDdkIsQ0FBQztJQUNELElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2pCLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDekIsQ0FBQztJQUNELElBQUksT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ2YsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN2QixDQUFDO0lBQ0QsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDZixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3ZCLENBQUM7SUFDRCxJQUFJLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNoQixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3hCLENBQUM7SUFDRCxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNmLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDdkIsQ0FBQztJQUNELElBQUksT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ2YsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN2QixDQUFDO0lBQ0QsSUFBSSxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDbEIsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUMxQixDQUFDO0lBRUQsZ0NBQWdDO0lBQ2hDLHVDQUF1QztJQUN2QyxRQUFRO0lBQ1IsRUFBRTtJQUNGLGlDQUFpQztJQUNqQyxpREFBaUQ7SUFDakQsUUFBUTtJQUNSLEVBQUU7SUFDRiw0Q0FBNEM7SUFDNUMsa0RBQWtEO0lBQ2xELGtEQUFrRDtJQUNsRCxvQkFBb0I7SUFDcEIsRUFBRTtJQUNGLDZDQUE2QztJQUM3Qyw4QkFBOEI7SUFDOUIsRUFBRTtJQUVGLElBQUksU0FBUyxHQUFHLEVBQVMsQ0FBQztJQUUxQixJQUFJLE9BQU8sT0FBTyxDQUFDLFFBQVEsS0FBSyxXQUFXO1dBQ3ZDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDO1dBQ2hDLE9BQU8sT0FBTyxDQUFDLFNBQVMsS0FBSyxRQUFRLEVBQ3ZDLENBQUM7UUFDQyxNQUFNLElBQUksS0FBSyxDQUFDLDZCQUE2QixDQUFDLENBQUM7SUFDbkQsQ0FBQztJQUNELG9EQUFvRDtJQUNwRCwyQkFBMkI7SUFDM0IsTUFBTSxRQUFRLEdBQ1YsQ0FBQyxPQUFPLE9BQU8sQ0FBQyxRQUFRLEtBQUssV0FBVztXQUN2QyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQztXQUNoQyxPQUFPLE9BQU8sQ0FBQyxTQUFTLEtBQUssUUFBUSxDQUFDO1dBQ3ZDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDO2VBQy9CLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ3BDLElBQUksU0FBUyxDQUFDO0lBQ2QsSUFBSSxRQUFRLEVBQUUsQ0FBQztRQUNYLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbkIsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUM7ZUFDL0IsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUMvQixDQUFDO1lBQ0MsU0FBUyxHQUFHLE1BQU0sR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQzdELG9CQUFvQixDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDekQsQ0FBQzthQUFNLENBQUM7WUFDSixTQUFTLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQztZQUM5QixvQkFBb0IsQ0FBQyxTQUFTLEVBQUUseUJBQXlCLENBQUMsQ0FBQztRQUMvRCxDQUFDO0lBQ0wsQ0FBQztJQUVELElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDO1dBQy9CLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUM7V0FDM0IsT0FBTyxPQUFPLENBQUMsUUFBUSxLQUFLLFFBQVEsRUFDdEMsQ0FBQztRQUNDLE1BQU0sSUFBSSxLQUFLLENBQUMsK0RBQStELENBQUMsQ0FBQTtJQUNwRixDQUFDO0lBRUQsc0NBQXNDO0lBQ3RDLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDO1dBQy9CLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQzlCLEtBQUssTUFBTSxPQUFPLElBQUksT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3JDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDdkIsQ0FBQztJQUNMLENBQUM7SUFFRCxJQUFJLE9BQU8sT0FBTyxDQUFDLFNBQVMsS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUN4QyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3JCLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ2pDLENBQUM7SUFFRCxxREFBcUQ7SUFDckQsa0JBQWtCO0lBQ2xCLGdCQUFnQjtJQUNoQixzQkFBc0I7SUFDdEIsTUFBTTtJQUNOLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBRTdDLDBDQUEwQztJQUMxQyxzQkFBc0I7SUFFdEIsSUFBSSxNQUE0QixDQUFDO0lBQ2pDLElBQUksUUFBUSxFQUFFLENBQUM7UUFDWCxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM3QixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ2xCLDZDQUE2QztRQUM3Qyx5Q0FBeUM7UUFDekMsSUFBSSxPQUFPLE9BQU8sQ0FBQyxRQUFRLEtBQUssUUFBUTtlQUNwQyxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQzlCLENBQUM7WUFDQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDOUQsQ0FBQzthQUFNLENBQUM7WUFDSixNQUFNLEdBQUcsRUFBRSxDQUFDO1lBQ1osS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUU7Z0JBQzlCLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDdkIsQ0FBQyxDQUFDLENBQUM7UUFDUCxDQUFDO0lBQ0wsQ0FBQztJQUVELHdDQUF3QztJQUV4QyxLQUFLLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO1FBQ3RCLE9BQU8sQ0FBQyxLQUFLLENBQUMsbUNBQW1DLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO0lBQ3BFLENBQUMsQ0FBQyxDQUFDO0lBRUgsTUFBTSxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUNsQyxLQUFLLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO1lBQ3ZCLElBQUksSUFBSSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNiLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUN2QixDQUFDO2lCQUFNLENBQUM7Z0JBQ0osTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLDJCQUEyQixJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDekQsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQyxDQUFDLENBQUM7SUFFSCxPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO0FBQ3RELENBQUM7QUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBd0JHO0FBQ0gsTUFBTSxPQUFPLGFBQWMsU0FBUSxNQUFNLENBQUMsYUFBYTtJQUV0RCxJQUFJLFdBQVcsS0FBSyxPQUFPLG1CQUFtQixDQUFDLENBQUMsQ0FBQztJQUM5QyxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsS0FBZTtRQUU3QyxNQUFNLE9BQU8sR0FBc0I7WUFDL0IsNENBQTRDO1lBQzVDLFNBQVMsRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFO1lBQzFCLFFBQVEsRUFBRSxTQUFTO1lBQ25CLFFBQVEsRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQztTQUN6QyxDQUFDO1FBRUYsdUNBQXVDO1FBQ3ZDLG1CQUFtQjtRQUVuQixNQUFNLEdBQUcsR0FBSSxRQUFRLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3pDLElBQUksT0FBTyxHQUFHLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDMUIsT0FBTyxDQUFDLFFBQVEsR0FBRyxDQUFFLEdBQUcsQ0FBRSxDQUFDO1FBQy9CLENBQUM7YUFBTSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUMvQyxPQUFPLENBQUMsUUFBUSxHQUFHLENBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFFLENBQUM7UUFDbEMsQ0FBQzthQUFNLENBQUM7WUFDSixPQUFPLENBQUMsUUFBUSxHQUFHLFNBQVMsQ0FBQztRQUNqQyxDQUFDO1FBQ0QsSUFBSSxPQUFPLE9BQU8sQ0FBQyxTQUFTLEtBQUssUUFBUTtlQUNyQyxDQUNBLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDO21CQUNoQyxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQy9CLEVBQUUsQ0FBQztZQUNBLE1BQU0sSUFBSSxLQUFLLENBQUMsNERBQTRELENBQUMsQ0FBQztRQUNsRixDQUFDO1FBRUQsSUFBSSxPQUFPLENBQUM7UUFDWixJQUFJLFFBQVEsQ0FBQztRQUNiLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFFbkUsSUFBSSxPQUFPLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssUUFBUSxFQUFFLENBQUM7Z0JBQzFDLE1BQU0sSUFBSSxLQUFLLENBQUMsMkNBQTJDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNqRyxDQUFDO1lBQ0QsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNqQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDeEIsT0FBTyxHQUFHLElBQUksQ0FBQztZQUNuQixDQUFDO2lCQUFNLENBQUM7Z0JBQ0osSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUMvQyxPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDcEIsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUM1QixDQUFDO1lBQ04sQ0FBQztZQUVELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUM7WUFDOUQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQztZQUN4RCxNQUFNLEdBQUcsR0FBRyxNQUFNLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDMUMsSUFBSSxLQUFLLENBQUM7WUFFVixJQUFJLENBQUMsR0FBRztnQkFBRSxLQUFLLEdBQUcsTUFBTSxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRTdDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDakIsTUFBTSxJQUFJLEtBQUssQ0FBQywrREFBK0QsT0FBTyxFQUFFLENBQUMsQ0FBQztZQUM5RixDQUFDO1lBRUQsSUFBSSxHQUFHO2dCQUFFLFFBQVEsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDO2lCQUMxQixJQUFJLEtBQUs7Z0JBQUUsUUFBUSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUM7UUFDNUMsQ0FBQztRQUVELHVEQUF1RDtRQUN2RCx3QkFBd0I7UUFDeEIsSUFBSSxRQUFRO1lBQUUsT0FBTyxDQUFDLFFBQVEsR0FBRyxDQUFFLFFBQVEsQ0FBRSxDQUFDO1FBRTlDLHFEQUFxRDtRQUNyRCxvREFBb0Q7UUFDcEQsK0NBQStDO1FBQy9DLE1BQU0sVUFBVSxHQUFHLE9BQU8sT0FBTyxDQUFDLFFBQVEsS0FBSyxRQUFRO2VBQ3BDLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztRQUUvQyxJQUFJLFFBQVEsQ0FBQztRQUNiLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNkLElBQUksQ0FBRSxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO2dCQUN0QyxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQy9DLFFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUNyQixJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUN4QyxDQUFDO1lBQ04sQ0FBQztpQkFBTSxDQUFDO2dCQUNKLFFBQVEsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDO1lBQ2hDLENBQUM7WUFFRCw4QkFBOEI7WUFDOUIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUN0QyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsaUJBQWlCLEVBQUUsUUFBUSxDQUN4RCxDQUFDLENBQUM7WUFDSCxPQUFPLENBQUMsUUFBUSxHQUFHLFNBQVMsQ0FBQztRQUNqQyxDQUFDO2FBQU0sQ0FBQztZQUNKLE9BQU8sQ0FBQyxRQUFRLEdBQUcsU0FBUyxDQUFDO1FBQ2pDLENBQUM7UUFFRCxJQUFJLEtBQUssR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ25DLGlDQUFpQztRQUNqQyxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzVCLEtBQUssR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2pDLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ2YsTUFBTSxJQUFJLEtBQUssQ0FBQyx3Q0FBd0MsS0FBSyxFQUFFLENBQUMsQ0FBQztZQUNyRSxDQUFDO1lBQ0ssT0FBUSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDakMsQ0FBQztRQUVELHdCQUF3QjtRQUV4QixNQUFNLEVBQUUsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQy9CLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDckMsTUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNqQyxNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3JDLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDekMsTUFBTSxFQUFFLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNwQyxJQUFJLGNBQWMsQ0FBQyxFQUFFLENBQUM7WUFBRSxPQUFPLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztRQUM3QyxPQUFPLENBQUMsUUFBUSxHQUFHLE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxXQUFXLENBQUM7UUFDcEUsa0RBQWtEO1FBQ2xELHdEQUF3RDtRQUN4RCxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzNDLElBQUksT0FBTyxRQUFRLEtBQUssUUFBUTtZQUFFLE9BQU8sQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBQzlELE9BQU8sQ0FBQyxVQUFVLEdBQUcsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLFdBQVcsQ0FBQztRQUN4RSx3Q0FBd0M7UUFDeEMsMENBQTBDO1FBQzFDLDRDQUE0QztRQUM1Qyx3Q0FBd0M7UUFDeEMsT0FBTyxDQUFDLElBQUksR0FBRyxPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssV0FBVyxDQUFDO1FBQzVELDRDQUE0QztRQUM1QyxPQUFPLENBQUMsSUFBSSxHQUFHLE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxXQUFXLENBQUM7UUFDNUQsd0NBQXdDO1FBQ3hDLDBDQUEwQztRQUMxQyx3Q0FBd0M7UUFDeEMsd0NBQXdDO1FBQ3hDLDhDQUE4QztRQUU5QyxJQUFJLE9BQU8sQ0FBQyxJQUFJLElBQUksT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQy9CLE1BQU0sSUFBSSxLQUFLLENBQUMsNkNBQTZDLENBQUMsQ0FBQztRQUNuRSxDQUFDO1FBQ0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDakMsTUFBTSxJQUFJLEtBQUssQ0FBQyw0Q0FBNEMsQ0FBQyxDQUFDO1FBQ2xFLENBQUM7UUFDRCxJQUFJLFVBQVUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM5QixNQUFNLElBQUksS0FBSyxDQUFDLDJFQUEyRSxDQUFDLENBQUM7UUFDakcsQ0FBQztRQUVELE1BQU0sR0FBRyxHQUFHLE1BQU0sVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRXRDLE1BQU0sR0FBRyxHQUFHLE9BQU8sT0FBTyxLQUFLLFFBQVE7WUFDbkMsQ0FBQyxDQUFDLGVBQWUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxlQUFlO1lBQy9DLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDVCxNQUFNLElBQUksR0FBRyxPQUFPLEdBQUcsS0FBSyxRQUFRO1lBQ2hDLENBQUMsQ0FBQyxRQUFRLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRztZQUN4QixDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ1QsTUFBTSxNQUFNLEdBQUcsT0FBTyxLQUFLLEtBQUssUUFBUTtZQUNwQyxDQUFDLENBQUMsVUFBVSxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUc7WUFDNUIsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNULE1BQU0sR0FBRyxHQUFHLE9BQU8sRUFBRSxLQUFLLFFBQVE7WUFDOUIsQ0FBQyxDQUFDLE9BQU8sTUFBTSxDQUFDLEVBQUUsQ0FBQyxHQUFHO1lBQ3RCLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDVCxxREFBcUQ7UUFDckQsbURBQW1EO1FBQ25ELE1BQU0sTUFBTSxHQUFHLE9BQU8sS0FBSyxLQUFLLFFBQVE7WUFDcEMsQ0FBQyxDQUFDLDRCQUE0QixNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUc7WUFDOUMsQ0FBQyxDQUFDLDJCQUEyQixDQUFDO1FBQ2xDLE1BQU0sTUFBTSxHQUFHLE9BQU8sS0FBSyxLQUFLLFFBQVE7WUFDcEMsQ0FBQyxDQUFDLFVBQVUsS0FBSyxDQUFDLFFBQVEsRUFBRSxHQUFHO1lBQy9CLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFFVCxxREFBcUQ7UUFDckQscURBQXFEO1FBQ3JELHFEQUFxRDtRQUNyRCxzREFBc0Q7UUFDdEQsc0RBQXNEO1FBQ3RELHFDQUFxQztRQUNyQyxNQUFNLEdBQUcsR0FBRyxVQUFVO1lBQ2xCLENBQUMsQ0FBQztrQkFDSSxHQUFHLElBQUksTUFBTSxJQUFJLE1BQU07VUFDL0IsY0FBYyxDQUNaLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLHVCQUF1QixFQUFFLEVBQUUsQ0FBQyxFQUMxRCxPQUFPLEtBQUssS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUM3QyxPQUFPLEdBQUcsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1VBQzVDLEdBQUc7O1NBRUo7WUFDRyxDQUFDLENBQUM7a0JBQ0ksR0FBRyxJQUFJLE1BQU07b0JBQ1gsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLElBQUksSUFBSSxNQUFNLElBQUksTUFBTTtVQUN2RCxHQUFHOztTQUVKLENBQUM7UUFDRixvQkFBb0I7UUFDcEIsT0FBTyxHQUFHLENBQUM7SUFDZixDQUFDO0NBQ0o7QUFFRCxNQUFNLFVBQVUsY0FBYyxDQUFDLE9BQU87SUFDbEMsSUFBSSxPQUFPLE9BQU8sS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUM5QixPQUFPLEtBQUssQ0FBQztJQUNqQixDQUFDO0lBQ0QsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBRWpDLElBQUksT0FBTyxFQUFFLEtBQUssUUFBUTtXQUNuQixDQUFDLEVBQUUsS0FBSyxNQUFNLElBQUksRUFBRSxLQUFLLE9BQU87ZUFDaEMsRUFBRSxLQUFLLE9BQU8sSUFBSSxFQUFFLEtBQUssUUFBUTtlQUNqQyxFQUFFLEtBQUssU0FBUyxJQUFJLEVBQUUsS0FBSyxVQUFVO2VBQ3JDLEVBQUUsS0FBSyxTQUFTLElBQUksRUFBRSxLQUFLLFVBQVU7ZUFDckMsRUFBRSxLQUFLLE9BQU8sSUFBSSxFQUFFLEtBQUssUUFBUTtlQUNqQyxFQUFFLEtBQUssU0FBUyxJQUFJLEVBQUUsS0FBSyxVQUFVLENBQUMsRUFDM0MsQ0FBQztRQUNDLE9BQU8sS0FBSyxDQUFDO0lBQ2pCLENBQUM7SUFDRCxPQUFPLElBQUksQ0FBQztBQUNoQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiXG5pbXBvcnQgcGF0aCBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IGZzLCB7IHByb21pc2VzIGFzIGZzcCB9IGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHV0aWwgZnJvbSAnbm9kZTp1dGlsJztcbmltcG9ydCB7IGRlZmxhdGVSYXdTeW5jIH0gZnJvbSAnbm9kZTp6bGliJztcbmltcG9ydCB7IHNwYXduIH0gZnJvbSAnbm9kZTpjaGlsZF9wcm9jZXNzJztcbmltcG9ydCB7IGVuY29kZSB9IGZyb20gJ2h0bWwtZW50aXRpZXMnO1xuaW1wb3J0ICogYXMgYWthc2hhIGZyb20gJ2FrYXNoYXJlbmRlcic7XG5pbXBvcnQgeyBhZGFwdElubGluZVN2ZyB9IGZyb20gJy4vcmVuZGVyLW1lcm1haWQuanMnO1xuXG4vLyBUaGUgUGxhbnRVTUwgSkFSIGlzIG5vIGxvbmdlciBkaXN0cmlidXRlZCB3aXRoIHRoaXMgcGFja2FnZS5cbi8vIFJlbmRlcmluZyBQbGFudFVNTCByZXF1aXJlcyB0aGUgdXNlciB0byBlaXRoZXIgcnVuIGEgUGxhbnRVTUxcbi8vIHNlcnZlciAoUExBTlRVTUxfU0VSVkVSX1VSTCkgb3IgZG93bmxvYWQgdGhlIEpBUiAoUExBTlRVTUxfSkFSKS5cbi8vIFNlZSB0aGUgUkVBRE1FIHNlY3Rpb24gXCJTZXR0aW5nIHVwIFBsYW50VU1MIHJlbmRlcmluZ1wiLlxuXG5jb25zdCBwbGFudHVtbFNldHVwSGVscCA9XG4gICAgYFNlZSB0aGUgXCJTZXR0aW5nIHVwIFBsYW50VU1MIHJlbmRlcmluZ1wiIHNlY3Rpb24gb2YgdGhlIEBha2FzaGFjbXMvZGlhZ3JhbS1tYWtlcnMgUkVBRE1FOiBodHRwczovL2dpdGh1Yi5jb20vYWthc2hhY21zL3BsdWdpbnMtZGlhZ3JhbXMjc2V0dGluZy11cC1wbGFudHVtbC1yZW5kZXJpbmdgO1xuXG4vKipcbiAqIE9wdGlvbnMgb2JqZWN0IHRoYXQgaXMgY29udmVydGVkIGludG8gcGxhbnR1bWwuamFyIG9wdGlvbnMuXG4gKi9cbmV4cG9ydCB0eXBlIGRvUGxhbnRVTUxPcHRpb25zID0ge1xuICAgIC8qKlxuICAgICAqIFRoZSBQbGFudFVNTCBkaWFncmFtIHRleHQgdG8gdXNlXG4gICAgICovXG4gICAgaW5wdXRCb2R5Pzogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogWmVybyBvciBtb3JlIGZpbGUgbmFtZXMgZm9yIGZpbGVzIHRvIHJlbmRlclxuICAgICAqL1xuICAgIGlucHV0Rk5zPzogc3RyaW5nW107XG5cbiAgICAvKipcbiAgICAgKiBQb3NzaWJsZSBmaWxlIHRvIHdyaXRlIG91dHB1dCBpbnRvXG4gICAgICovXG4gICAgb3V0cHV0Rk4/OiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBUbyB1c2UgYSBzcGVjaWZpYyBjaGFyYWN0ZXIgc2V0LiBEZWZhdWx0OiBVVEYtOFxuICAgICAqL1xuICAgIGNoYXJzZXQ/OiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBUbyB1c2UgZGFyayBtb2RlIGZvciBkaWFncmFtc1xuICAgICAqL1xuICAgIGRhcmttb2RlPzogYm9vbGVhbjtcblxuICAgIC8qKlxuICAgICAqIFRvIGdlbmVyYXRlIGludGVybWVkaWF0ZSBzdmVrIGZpbGVzXG4gICAgICovXG4gICAgZGVidWdzdmVrPzogYm9vbGVhbjtcblxuICAgIC8qKlxuICAgICAqIFwiZXhhbXBsZS5wdW1sXCIgVG8gb3ZlcnJpZGUgJWZpbGVuYW1lJSB2YXJpYWJsZVxuICAgICAqL1xuICAgIGZpbGVOYW1lT3ZlcnJpZGU/OiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBUbyB1c2UgKE4pIHRocmVhZHMgZm9yIHByb2Nlc3NpbmcuICBVc2UgXCJhdXRvXCIgZm9yIDQgdGhyZWFkcy5cbiAgICAgKi9cbiAgICBuYnRocmVhZD86IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIFRvIE5PVCBleHBvcnQgbWV0YWRhdGEgaW4gUE5HL1NWRyBnZW5lcmF0ZWQgZmlsZXNcbiAgICAgKi9cbiAgICBub21ldGFkYXRhPzogYm9vbGVhbjtcblxuICAgIC8qKlxuICAgICAqIFRvIGdlbmVyYXRlIGltYWdlcyBpbiB0aGUgc3BlY2lmaWVkIGRpcmVjdG9yeVxuICAgICAqL1xuICAgIG91dHB1dERpcj86IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIFRvIGdlbmVyYXRlIGltYWdlcyB1c2luZyBFUFMgZm9ybWF0XG4gICAgICovXG4gICAgdGVwcz86IGJvb2xlYW47XG5cbiAgICAvKipcbiAgICAgKiBUbyBnZW5lcmF0ZSBIVE1MIGZpbGUgZm9yIGNsYXNzIGRpYWdyYW1cbiAgICAgKi9cbiAgICB0aHRtbD86IGJvb2xlYW47XG5cbiAgICAvKipcbiAgICAgKiBUbyBnZW5lcmF0ZSBpbWFnZXMgdXNpbmcgTGFUZVgvVGlreiBmb3JtYXRcbiAgICAgKi9cbiAgICB0bGF0ZXg/OiBib29sZWFuO1xuXG4gICAgLyoqXG4gICAgICogVG8gZ2VuZXJhdGUgaW1hZ2VzIHVzaW5nIFBERiBmb3JtYXRcbiAgICAgKi9cbiAgICB0cGRmPzogYm9vbGVhbjtcblxuICAgIC8qKlxuICAgICAqIFRvIGdlbmVyYXRlIGltYWdlcyB1c2luZyBQTkcgZm9ybWF0IChkZWZhdWx0KVxuICAgICAqL1xuICAgIHRwbmc/OiBib29sZWFuO1xuXG4gICAgLyoqXG4gICAgICogVG8gZ2VuZXJhdGUgU0NYTUwgZmlsZSBmb3Igc3RhdGUgZGlhZ3JhbVxuICAgICAqL1xuICAgIHRzY3htbD86IGJvb2xlYW47XG5cbiAgICAvKipcbiAgICAgKiBUbyBnZW5lcmF0ZSBpbWFnZXMgdXNpbmcgU1ZHIGZvcm1hdFxuICAgICAqL1xuICAgIHRzdmc/OiBib29sZWFuO1xuXG4gICAgLyoqXG4gICAgICogVG8gZ2VuZXJhdGUgaW1hZ2VzIHdpdGggQVNDSUkgYXJ0XG4gICAgICovXG4gICAgdHR4dD86IGJvb2xlYW47XG5cbiAgICAvKipcbiAgICAgKiBUbyBnZW5lcmF0ZSBpbWFnZXMgd2l0aCBBU0NJSSBhcnQgdXNpbmcgVW5pY29kZSBjaGFyYWN0ZXJzXG4gICAgICovXG4gICAgdHV0eHQ/OiBib29sZWFuO1xuXG4gICAgLyoqXG4gICAgICogVG8gZ2VuZXJhdGUgaW1hZ2VzIHVzaW5nIFZEWCBmb3JtYXRcbiAgICAgKi9cbiAgICB0dmR4PzogYm9vbGVhbjtcblxuICAgIC8qKlxuICAgICAqIFRvIGdlbmVyYXRlIFhNSSBmaWxlIGZvciBjbGFzcyBkaWFncmFtXG4gICAgICovXG4gICAgdHhtaT86IGJvb2xlYW47XG5cbiAgICAvKipcbiAgICAgKiBUbyBoYXZlIGxvZyBpbmZvcm1hdGlvblxuICAgICAqL1xuICAgIHZlcmJvc2U/OiBib29sZWFuO1xuXG4gICAgLyoqXG4gICAgICogVVJMIGZvciBhIFBsYW50VU1MIHNlcnZlciwgc3VjaCBhc1xuICAgICAqIGh0dHA6Ly9sb2NhbGhvc3Q6ODA4MC4gIE92ZXJyaWRlcyB0aGVcbiAgICAgKiBQTEFOVFVNTF9TRVJWRVJfVVJMIGVudmlyb25tZW50IHZhcmlhYmxlLlxuICAgICAqL1xuICAgIHNlcnZlclVSTD86IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIEZpbGVzeXN0ZW0gcGF0aCBmb3IgYSBwbGFudHVtbC5qYXIgZmlsZS5cbiAgICAgKiBPdmVycmlkZXMgdGhlIFBMQU5UVU1MX0pBUiBlbnZpcm9ubWVudCB2YXJpYWJsZS5cbiAgICAgKi9cbiAgICBqYXJQYXRoPzogc3RyaW5nO1xufVxuXG4vKipcbiAqIFJlbmRlciBhIFBsYW50VU1MIGRpYWdyYW0gdXNpbmcgd2hpY2hldmVyIHJlbmRlcmluZ1xuICogYmFja2VuZCBpcyBjb25maWd1cmVkLiAgSWYgYSBzZXJ2ZXIgVVJMIGlzIGF2YWlsYWJsZVxuICogKHRoZSBzZXJ2ZXJVUkwgb3B0aW9uIG9yIHRoZSBQTEFOVFVNTF9TRVJWRVJfVVJMXG4gKiBlbnZpcm9ubWVudCB2YXJpYWJsZSksIHRoZSBkaWFncmFtIGlzIHNlbnQgdG8gdGhhdFxuICogUGxhbnRVTUwgc2VydmVyLiAgT3RoZXJ3aXNlLCBpZiBhIEpBUiBwYXRoIGlzIGF2YWlsYWJsZVxuICogKHRoZSBqYXJQYXRoIG9wdGlvbiBvciB0aGUgUExBTlRVTUxfSkFSIGVudmlyb25tZW50XG4gKiB2YXJpYWJsZSksIHRoZSBkaWFncmFtIGlzIHJlbmRlcmVkIGxvY2FsbHkgYnkgcnVubmluZ1xuICogdGhlIEpBUiB3aXRoIEphdmEuICBJZiBuZWl0aGVyIGlzIGF2YWlsYWJsZSwgYW4gZXJyb3JcbiAqIGlzIHRocm93biBkaXJlY3RpbmcgdGhlIHVzZXIgdG8gdGhlIFJFQURNRS5cbiAqXG4gKiBJbiB0aGUgc2luZ2xlLWlucHV0IG1vZGVzIChpbnB1dEJvZHkgb3Igb25lIGVudHJ5IGluXG4gKiBpbnB1dEZOcyksIHdoZW4gbm8gb3V0cHV0Rk4gaXMgZ2l2ZW4gdGhlIHJlbmRlcmVkXG4gKiBvdXRwdXQgaXMgcmV0dXJuZWQgYXMgYSBCdWZmZXIgaW5zdGVhZCBvZiBiZWluZ1xuICogd3JpdHRlbiB0byBhIGZpbGUuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkb1BsYW50VU1MKFxuICAgIG9wdGlvbnM6IGRvUGxhbnRVTUxPcHRpb25zXG4pOiBQcm9taXNlPEJ1ZmZlciB8IHVuZGVmaW5lZD4ge1xuICAgIGNvbnN0IHNlcnZlclVSTCA9IG9wdGlvbnMuc2VydmVyVVJMXG4gICAgICAgICAgICA/PyBwcm9jZXNzLmVudi5QTEFOVFVNTF9TRVJWRVJfVVJMO1xuICAgIGNvbnN0IGphclBhdGggPSBvcHRpb25zLmphclBhdGhcbiAgICAgICAgICAgID8/IHByb2Nlc3MuZW52LlBMQU5UVU1MX0pBUjtcbiAgICBpZiAodHlwZW9mIHNlcnZlclVSTCA9PT0gJ3N0cmluZycgJiYgc2VydmVyVVJMLmxlbmd0aCA+PSAxKSB7XG4gICAgICAgIHJldHVybiBkb1BsYW50VU1MU2VydmVyKG9wdGlvbnMpO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIGphclBhdGggPT09ICdzdHJpbmcnICYmIGphclBhdGgubGVuZ3RoID49IDEpIHtcbiAgICAgICAgcmV0dXJuIGRvUGxhbnRVTUxMb2NhbChvcHRpb25zKTtcbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKGBQbGFudFVNTCByZW5kZXJpbmcgaXMgbm90IGNvbmZpZ3VyZWQuICBFaXRoZXIgcnVuIGEgUGxhbnRVTUwgc2VydmVyIGFuZCBzZXQgdGhlIFBMQU5UVU1MX1NFUlZFUl9VUkwgZW52aXJvbm1lbnQgdmFyaWFibGUsIG9yIGRvd25sb2FkIHBsYW50dW1sLmphciAobnB4IGRpYWdyYW0tbWFrZXJzIHBsYW50dW1sLWRvd25sb2FkKSBhbmQgc2V0IHRoZSBQTEFOVFVNTF9KQVIgZW52aXJvbm1lbnQgdmFyaWFibGUuICAke3BsYW50dW1sU2V0dXBIZWxwfWApO1xufVxuXG4vLyBUaGUgYWxwaGFiZXQgdXNlZCBieSBQbGFudFVNTCBzZXJ2ZXJzIGZvciBlbmNvZGVkXG4vLyBkaWFncmFtIHRleHQuICBJdCByZXNlbWJsZXMgYmFzZTY0LCBidXQgd2l0aCBhXG4vLyBkaWZmZXJlbnQgY2hhcmFjdGVyIHNldCBhbmQgb3JkZXJpbmcuXG5jb25zdCBwbGFudHVtbEFscGhhYmV0ID1cbiAgICAnMDEyMzQ1Njc4OUFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXotXyc7XG5cbi8qKlxuICogRW5jb2RlIFBsYW50VU1MIGRpYWdyYW0gdGV4dCBmb3IgdXNlIGluIGEgUGxhbnRVTUxcbiAqIHNlcnZlciBVUkwsIGFzIGRvY3VtZW50ZWQgYXRcbiAqIGh0dHBzOi8vcGxhbnR1bWwuY29tL3RleHQtZW5jb2RpbmcgLS0gdGhlIHRleHQgaXNcbiAqIGRlZmxhdGVkLCB0aGVuIGVuY29kZWQgd2l0aCBhIGJhc2U2NC1saWtlIGFscGhhYmV0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gcGxhbnR1bWxFbmNvZGUoZGlhZ3JhbTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBjb25zdCBkZWZsYXRlZCA9IGRlZmxhdGVSYXdTeW5jKFxuICAgICAgICBCdWZmZXIuZnJvbShkaWFncmFtLCAndXRmLTgnKSwgeyBsZXZlbDogOSB9KTtcbiAgICBsZXQgcmV0ID0gJyc7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkZWZsYXRlZC5sZW5ndGg7IGkgKz0gMykge1xuICAgICAgICBjb25zdCBiMSA9IGRlZmxhdGVkW2ldO1xuICAgICAgICBjb25zdCBiMiA9IGkgKyAxIDwgZGVmbGF0ZWQubGVuZ3RoID8gZGVmbGF0ZWRbaSArIDFdIDogMDtcbiAgICAgICAgY29uc3QgYjMgPSBpICsgMiA8IGRlZmxhdGVkLmxlbmd0aCA/IGRlZmxhdGVkW2kgKyAyXSA6IDA7XG4gICAgICAgIHJldCArPSBwbGFudHVtbEFscGhhYmV0W2IxID4+IDJdXG4gICAgICAgICAgICAgKyBwbGFudHVtbEFscGhhYmV0WygoYjEgJiAweDAzKSA8PCA0KSB8IChiMiA+PiA0KV1cbiAgICAgICAgICAgICArIHBsYW50dW1sQWxwaGFiZXRbKChiMiAmIDB4MEYpIDw8IDIpIHwgKGIzID4+IDYpXVxuICAgICAgICAgICAgICsgcGxhbnR1bWxBbHBoYWJldFtiMyAmIDB4M0ZdO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xufVxuXG4vKipcbiAqIEd1YXJkIGFnYWluc3QgZGlhZ3JhbSB0ZXh0IHRoYXQgUGxhbnRVTUwgd291bGQgbm90XG4gKiByZW5kZXIgY29ycmVjdGx5LiAgSW4gLXBpcGUgbW9kZSB0aGUgSkFSIHNpbGVudGx5IGVtaXRzXG4gKiBhIFwiV2VsY29tZSB0byBQbGFudFVNTFwiIHBsYWNlaG9sZGVyIGltYWdlLCB3aXRoIGEgemVyb1xuICogZXhpdCBjb2RlLCB3aGVuIHRoZSBpbnB1dCBoYXMgbm8gY29tcGxldGVcbiAqIEBzdGFydC4uLkBlbmQgYmxvY2ssIHdoaWxlIGEgUGxhbnRVTUwgc2VydmVyIHRvbGVyYXRlc1xuICogYW4gaW5jb21wbGV0ZSBibG9jayAtIHNvIHRoZSB0d28gYmFja2VuZHMgc2lsZW50bHlcbiAqIGRpc2FncmVlLiAgRmFpbGluZyBsb3VkbHkgbWFrZXMgdGhlIGF1dGhvcmluZyBtaXN0YWtlXG4gKiB2aXNpYmxlIHJlZ2FyZGxlc3Mgb2YgYmFja2VuZC5cbiAqL1xuZnVuY3Rpb24gY2hlY2tEaWFncmFtQ29tcGxldGUoZGlhZ3JhbTogc3RyaW5nLCBzb3VyY2U6IHN0cmluZykge1xuICAgIGlmICghL15cXHMqQHN0YXJ0XFx3L20udGVzdChkaWFncmFtKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sIC0gdGhlIGRpYWdyYW0gZnJvbSAke3NvdXJjZX0gaGFzIG5vIEBzdGFydCBsaW5lIChzdWNoIGFzIEBzdGFydHVtbClgKTtcbiAgICB9XG4gICAgaWYgKCEvXlxccypAZW5kXFx3L20udGVzdChkaWFncmFtKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sIC0gdGhlIGRpYWdyYW0gZnJvbSAke3NvdXJjZX0gaGFzIG5vIEBlbmQgbGluZSAoc3VjaCBhcyBAZW5kdW1sKWApO1xuICAgIH1cbn1cblxuLyoqXG4gKiBSZW5kZXIgYSBQbGFudFVNTCBkaWFncmFtIGJ5IHNlbmRpbmcgaXQgdG8gYSBQbGFudFVNTFxuICogc2VydmVyLiAgVGhlIHNlcnZlciBVUkwgY29tZXMgZnJvbSB0aGUgc2VydmVyVVJMIG9wdGlvblxuICogb3IgdGhlIFBMQU5UVU1MX1NFUlZFUl9VUkwgZW52aXJvbm1lbnQgdmFyaWFibGUuXG4gKlxuICogVGhlIHNlcnZlciBzdXBwb3J0cyBhIHN1YnNldCBvZiB0aGUgSkFSJ3MgZmVhdHVyZXM6XG4gKiBQTkcgKHRwbmcsIHRoZSBkZWZhdWx0KSwgU1ZHICh0c3ZnKSwgYW5kIEFTQ0lJIGFydFxuICogKHR0eHQpIG91dHB1dCBmb3JtYXRzLiAgVGhlIGlucHV0IGlzIGVpdGhlciBpbnB1dEJvZHlcbiAqIG9yIGEgc2luZ2xlIGVudHJ5IGluIGlucHV0Rk5zLiAgVGhlIHJlbmRlcmVkIG91dHB1dCBpc1xuICogd3JpdHRlbiB0byBvdXRwdXRGTiB3aGVuIGdpdmVuLCBhbmQgcmV0dXJuZWQgYXMgYVxuICogQnVmZmVyIG90aGVyd2lzZS4gIE9wdGlvbnMgdGhhdCBvbmx5IG1ha2Ugc2Vuc2UgZm9yXG4gKiB0aGUgSkFSIChkYXJrbW9kZSwgY2hhcnNldCwgbmJ0aHJlYWQsIG91dHB1dERpciwgYW5kXG4gKiB0aGUgb3RoZXIgb3V0cHV0IGZvcm1hdHMpIGFyZSBub3Qgc3VwcG9ydGVkLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZG9QbGFudFVNTFNlcnZlcihcbiAgICBvcHRpb25zOiBkb1BsYW50VU1MT3B0aW9uc1xuKTogUHJvbWlzZTxCdWZmZXIgfCB1bmRlZmluZWQ+IHtcbiAgICBjb25zdCBzZXJ2ZXJVUkwgPSBvcHRpb25zLnNlcnZlclVSTFxuICAgICAgICAgICAgPz8gcHJvY2Vzcy5lbnYuUExBTlRVTUxfU0VSVkVSX1VSTDtcbiAgICBpZiAodHlwZW9mIHNlcnZlclVSTCAhPT0gJ3N0cmluZycgfHwgc2VydmVyVVJMLmxlbmd0aCA8IDEpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBwbGFudHVtbCBzZXJ2ZXIgLSBubyBzZXJ2ZXIgVVJMLiAgU2V0IHRoZSBQTEFOVFVNTF9TRVJWRVJfVVJMIGVudmlyb25tZW50IHZhcmlhYmxlLiAgJHtwbGFudHVtbFNldHVwSGVscH1gKTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IHVuc3VwcG9ydGVkIG9mIFtcbiAgICAgICAgJ3RlcHMnLCAndGh0bWwnLCAndGxhdGV4JywgJ3RwZGYnLCAndHNjeG1sJyxcbiAgICAgICAgJ3R2ZHgnLCAndHhtaScsICd0dXR4dCdcbiAgICBdKSB7XG4gICAgICAgIGlmIChvcHRpb25zW3Vuc3VwcG9ydGVkXSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBwbGFudHVtbCBzZXJ2ZXIgLSB0aGUgJHt1bnN1cHBvcnRlZH0gb3V0cHV0IGZvcm1hdCBpcyBub3Qgc3VwcG9ydGVkIGJ5IFBsYW50VU1MIHNlcnZlciByZW5kZXJpbmcgLSB1c2UgdGhlIEpBUiBpbnN0ZWFkIChQTEFOVFVNTF9KQVIpYCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKG9wdGlvbnMuZGFya21vZGUpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBwbGFudHVtbCBzZXJ2ZXIgLSBkYXJrbW9kZSBpcyBub3Qgc3VwcG9ydGVkIGJ5IFBsYW50VU1MIHNlcnZlciByZW5kZXJpbmcgLSB1c2UgdGhlIEpBUiBpbnN0ZWFkIChQTEFOVFVNTF9KQVIpYCk7XG4gICAgfVxuXG4gICAgbGV0IGZvcm1hdDtcbiAgICBpZiAob3B0aW9ucy50c3ZnKSBmb3JtYXQgPSAnc3ZnJztcbiAgICBlbHNlIGlmIChvcHRpb25zLnR0eHQpIGZvcm1hdCA9ICd0eHQnO1xuICAgIGVsc2UgZm9ybWF0ID0gJ3BuZyc7XG5cbiAgICBsZXQgZGlhZ3JhbTtcbiAgICBsZXQgc291cmNlO1xuICAgIGlmIChBcnJheS5pc0FycmF5KG9wdGlvbnMuaW5wdXRGTnMpXG4gICAgICYmIG9wdGlvbnMuaW5wdXRGTnMubGVuZ3RoID4gMVxuICAgICkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sIHNlcnZlciAtIG9ubHkgb25lIGlucHV0IGZpbGUgaXMgc3VwcG9ydGVkIGJ5IFBsYW50VU1MIHNlcnZlciByZW5kZXJpbmcgLSB1c2UgdGhlIEpBUiBpbnN0ZWFkIChQTEFOVFVNTF9KQVIpYCk7XG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KG9wdGlvbnMuaW5wdXRGTnMpXG4gICAgICYmIG9wdGlvbnMuaW5wdXRGTnMubGVuZ3RoID09PSAxXG4gICAgKSB7XG4gICAgICAgIHNvdXJjZSA9IG9wdGlvbnMuaW5wdXRGTnNbMF07XG4gICAgICAgIGRpYWdyYW0gPSBhd2FpdCBmc3AucmVhZEZpbGUoc291cmNlLCAndXRmLTgnKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBvcHRpb25zLmlucHV0Qm9keSA9PT0gJ3N0cmluZydcbiAgICAgJiYgb3B0aW9ucy5pbnB1dEJvZHkubGVuZ3RoID49IDFcbiAgICApIHtcbiAgICAgICAgc291cmNlID0gJ3RoZSBpbmxpbmUgZGlhZ3JhbSBib2R5JztcbiAgICAgICAgZGlhZ3JhbSA9IG9wdGlvbnMuaW5wdXRCb2R5O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgcGxhbnR1bWwgc2VydmVyIC0gbm8gaW5wdXQgc291cmNlc2ApO1xuICAgIH1cbiAgICBjaGVja0RpYWdyYW1Db21wbGV0ZShkaWFncmFtLCBzb3VyY2UpO1xuXG4gICAgY29uc3QgdXJsID0gYCR7c2VydmVyVVJMLnJlcGxhY2UoL1xcLyskLywgJycpfS8ke2Zvcm1hdH0vJHtwbGFudHVtbEVuY29kZShkaWFncmFtKX1gO1xuXG4gICAgbGV0IHJlcztcbiAgICB0cnkge1xuICAgICAgICByZXMgPSBhd2FpdCBmZXRjaCh1cmwpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sIHNlcnZlciAtIGNvdWxkIG5vdCByZWFjaCBQbGFudFVNTCBzZXJ2ZXIgYXQgJHtzZXJ2ZXJVUkx9IC0gJHtlcnIubWVzc2FnZX0uICAke3BsYW50dW1sU2V0dXBIZWxwfWApO1xuICAgIH1cbiAgICBpZiAoIXJlcy5vaykge1xuICAgICAgICAvLyBGb3IgZGlhZ3JhbSBlcnJvcnMgdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFcbiAgICAgICAgLy8gNHh4IHN0YXR1cywgYnV0IHRoZSBib2R5IGlzIHN0aWxsIGEgcmVuZGVyZWRcbiAgICAgICAgLy8gaW1hZ2UgZGVzY3JpYmluZyB0aGUgZXJyb3IuICBSZXBvcnQgdGhlIHN0YXR1c1xuICAgICAgICAvLyBhbmQgbGV0IHRoZSB1c2VyIGluc3BlY3QgdGhlIGRpYWdyYW0uXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgcGxhbnR1bWwgc2VydmVyIC0gJHtzZXJ2ZXJVUkx9IHJlc3BvbmRlZCB3aXRoICR7cmVzLnN0YXR1c30gJHtyZXMuc3RhdHVzVGV4dH0gZm9yIHRoZSBkaWFncmFtYCk7XG4gICAgfVxuXG4gICAgY29uc3QgYnVmID0gQnVmZmVyLmZyb20oYXdhaXQgcmVzLmFycmF5QnVmZmVyKCkpO1xuICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5vdXRwdXRGTiA9PT0gJ3N0cmluZydcbiAgICAgJiYgb3B0aW9ucy5vdXRwdXRGTi5sZW5ndGggPj0gMVxuICAgICkge1xuICAgICAgICBhd2FpdCBmc3Aud3JpdGVGaWxlKG9wdGlvbnMub3V0cHV0Rk4sIGJ1Zik7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHJldHVybiBidWY7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkb1BsYW50VU1MTG9jYWwoXG4gICAgb3B0aW9uczogZG9QbGFudFVNTE9wdGlvbnNcbik6IFByb21pc2U8QnVmZmVyIHwgdW5kZWZpbmVkPiB7XG5cbiAgICBjb25zdCBwbGFudHVtbEphciA9IG9wdGlvbnMuamFyUGF0aFxuICAgICAgICAgICAgPz8gcHJvY2Vzcy5lbnYuUExBTlRVTUxfSkFSO1xuICAgIGlmICh0eXBlb2YgcGxhbnR1bWxKYXIgIT09ICdzdHJpbmcnXG4gICAgIHx8IHBsYW50dW1sSmFyLmxlbmd0aCA8IDFcbiAgICApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBwbGFudHVtbCAtIG5vIEpBUiBmaWxlIGNvbmZpZ3VyZWQuICBEb3dubG9hZCBwbGFudHVtbC5qYXIgKG5weCBkaWFncmFtLW1ha2VycyBwbGFudHVtbC1kb3dubG9hZCkgYW5kIHNldCB0aGUgUExBTlRVTUxfSkFSIGVudmlyb25tZW50IHZhcmlhYmxlLiAgJHtwbGFudHVtbFNldHVwSGVscH1gKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgZnNwLmFjY2VzcyhwbGFudHVtbEphciwgZnMuY29uc3RhbnRzLlJfT0spO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sIC0gdGhlIEpBUiBmaWxlICR7cGxhbnR1bWxKYXJ9IGRvZXMgbm90IGV4aXN0IG9yIGlzIG5vdCByZWFkYWJsZS4gICR7cGxhbnR1bWxTZXR1cEhlbHB9YCk7XG4gICAgfVxuXG4gICAgY29uc3QgYXJncyA9IFtcbiAgICAgICAgLy8gJ2phdmEnLFxuICAgICAgICAnLWphcicsXG4gICAgICAgICctRGphdmEuYXd0LmhlYWRsZXNzPXRydWUnLFxuICAgICAgICAnLS1hZGQtb3BlbnM9amF2YS54bWwvY29tLnN1bi5vcmcuYXBhY2hlLnhhbGFuLmludGVybmFsLnhzbHRjLnRyYXg9QUxMLVVOTkFNRUQnLFxuICAgICAgICBwbGFudHVtbEphcixcbiAgICBdO1xuICAgIGlmIChvcHRpb25zLmNoYXJzZXQpIHtcbiAgICAgICAgYXJncy5wdXNoKCctY2hhcnNldCcpO1xuICAgICAgICBhcmdzLnB1c2gob3B0aW9ucy5jaGFyc2V0KTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMuZGFya21vZGUpIHtcbiAgICAgICAgYXJncy5wdXNoKCctZGFya21vZGUnKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMuZGVidWdzdmVrKSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLWRlYnVnc3ZlaycpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy5maWxlTmFtZU92ZXJyaWRlKSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLWZpbGVuYW1lJyk7XG4gICAgICAgIGFyZ3MucHVzaChvcHRpb25zLmZpbGVOYW1lT3ZlcnJpZGUpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy5uYnRocmVhZCkge1xuICAgICAgICBhcmdzLnB1c2goJy1uYnRocmVhZCcpO1xuICAgICAgICBhcmdzLnB1c2gob3B0aW9ucy5uYnRocmVhZCk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLm5vbWV0YWRhdGEpIHtcbiAgICAgICAgYXJncy5wdXNoKCctbm9tZXRhZGF0YScpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy50ZXBzKSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLXRlcHMnKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMudGh0bWwpIHtcbiAgICAgICAgYXJncy5wdXNoKCctdGh0bWwnKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMudGxhdGV4KSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLXRsYXRleCcpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy50cGRmKSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLXRwZGYnKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMudHBuZykge1xuICAgICAgICBhcmdzLnB1c2goJy10cG5nJyk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnRzY3htbCkge1xuICAgICAgICBhcmdzLnB1c2goJy10c2N4bWwnKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMudHN2Zykge1xuICAgICAgICBhcmdzLnB1c2goJy10c3ZnJyk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnR0eHQpIHtcbiAgICAgICAgYXJncy5wdXNoKCctdHR4dCcpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy50dXR4dCkge1xuICAgICAgICBhcmdzLnB1c2goJy10dXR4dCcpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy50dmR4KSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLXR2ZHgnKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMudHhtaSkge1xuICAgICAgICBhcmdzLnB1c2goJy10eG1pJyk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnZlcmJvc2UpIHtcbiAgICAgICAgYXJncy5wdXNoKCctdmVyYm9zZScpO1xuICAgIH1cblxuICAgIC8vIDAgaW5wdXRGTnMgcmVxdWlyZXMgaW5wdXRCb2R5XG4gICAgLy8gY2hpbGQuc3RkaW4ud3JpdGUvZW5kIHdpdGggaW5wdXRCb2R5XG4gICAgLy8gLXBpcGVcbiAgICAvL1xuICAgIC8vIDEgaW5wdXRGTiwgbm8vaWdub3JlIGlucHV0Qm9keVxuICAgIC8vIGZzLmNyZWF0ZVJlYWRTdHJlYW0oaW5wdXRGTikucGlwZShjaGlsZC5zdGRpbilcbiAgICAvLyAtcGlwZVxuICAgIC8vXG4gICAgLy8gSW4gYm90aCAtcGlwZSBjYXNlcywgY2hpbGQuc3Rkb3V0IGdvZXMgdG9cbiAgICAvLyBmcy5jcmVhdGVXcml0ZVN0cmVhbShvdXRwdXRGTikgd2hlbiBvdXRwdXRGTiBpc1xuICAgIC8vIGdpdmVuLCBhbmQgaXMgb3RoZXJ3aXNlIGNvbGxlY3RlZCBpbnRvIGEgQnVmZmVyXG4gICAgLy8gdGhhdCBpcyByZXR1cm5lZC5cbiAgICAvL1xuICAgIC8vIG11bHRpcGxlIGlucHV0Rk5zIC4uIG9wdGlvbmFsIG91dHB1dC1kaXInc1xuICAgIC8vIEJvdGggZ28gb24gdGhlIGNvbW1hbmQtbGluZVxuICAgIC8vXG5cbiAgICBsZXQgc3Bhd25vcHRzID0ge30gYXMgYW55O1xuXG4gICAgaWYgKHR5cGVvZiBvcHRpb25zLmlucHV0Rk5zID09PSAndW5kZWZpbmVkJ1xuICAgICAmJiAhQXJyYXkuaXNBcnJheShvcHRpb25zLmlucHV0Rk5zKVxuICAgICAmJiB0eXBlb2Ygb3B0aW9ucy5pbnB1dEJvZHkgIT09ICdzdHJpbmcnXG4gICAgKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgcGxhbnR1bWwgLSBubyBpbnB1dCBzb3VyY2VzYCk7XG4gICAgfVxuICAgIC8vIEFuIGlucHV0Qm9keSB3aXRoIG5vIGZpbGUgbmFtZXMsIG9yIGEgc2luZ2xlIGZpbGVcbiAgICAvLyBuYW1lLCBtZWFucyB3ZSdyZSBwaXBpbmdcbiAgICBjb25zdCBwaXBlTW9kZSA9XG4gICAgICAgICh0eXBlb2Ygb3B0aW9ucy5pbnB1dEZOcyA9PT0gJ3VuZGVmaW5lZCdcbiAgICAgICYmICFBcnJheS5pc0FycmF5KG9wdGlvbnMuaW5wdXRGTnMpXG4gICAgICAmJiB0eXBlb2Ygb3B0aW9ucy5pbnB1dEJvZHkgPT09ICdzdHJpbmcnKVxuICAgICB8fCAoQXJyYXkuaXNBcnJheShvcHRpb25zLmlucHV0Rk5zKVxuICAgICAgJiYgb3B0aW9ucy5pbnB1dEZOcy5sZW5ndGggPT09IDEpO1xuICAgIGxldCBwaXBlSW5wdXQ7XG4gICAgaWYgKHBpcGVNb2RlKSB7XG4gICAgICAgIGFyZ3MucHVzaCgnLXBpcGUnKTtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkob3B0aW9ucy5pbnB1dEZOcylcbiAgICAgICAgICYmIG9wdGlvbnMuaW5wdXRGTnMubGVuZ3RoID09PSAxXG4gICAgICAgICkge1xuICAgICAgICAgICAgcGlwZUlucHV0ID0gYXdhaXQgZnNwLnJlYWRGaWxlKG9wdGlvbnMuaW5wdXRGTnNbMF0sICd1dGYtOCcpO1xuICAgICAgICAgICAgY2hlY2tEaWFncmFtQ29tcGxldGUocGlwZUlucHV0LCBvcHRpb25zLmlucHV0Rk5zWzBdKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBpcGVJbnB1dCA9IG9wdGlvbnMuaW5wdXRCb2R5O1xuICAgICAgICAgICAgY2hlY2tEaWFncmFtQ29tcGxldGUocGlwZUlucHV0LCAndGhlIGlubGluZSBkaWFncmFtIGJvZHknKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmIChBcnJheS5pc0FycmF5KG9wdGlvbnMuaW5wdXRGTnMpXG4gICAgICYmIG9wdGlvbnMuaW5wdXRGTnMubGVuZ3RoID4gMVxuICAgICAmJiB0eXBlb2Ygb3B0aW9ucy5vdXRwdXRGTiA9PT0gJ3N0cmluZydcbiAgICApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBwbGFudHVtbCAtIHdpdGggbXVsdGlwbGUgaW5wdXQgZmlsZXMsIG91dHB1dCBmaWxlIG5vdCBhbGxvd2VkYClcbiAgICB9XG5cbiAgICAvLyBtdWx0aXBsZSBmaWxlIG5hbWVzLCBwdXNoIG9udG8gYXJnc1xuICAgIGlmIChBcnJheS5pc0FycmF5KG9wdGlvbnMuaW5wdXRGTnMpXG4gICAgICYmIG9wdGlvbnMuaW5wdXRGTnMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKGNvbnN0IGlucHV0Rk4gb2Ygb3B0aW9ucy5pbnB1dEZOcykge1xuICAgICAgICAgICAgYXJncy5wdXNoKGlucHV0Rk4pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBvcHRpb25zLm91dHB1dERpciA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgYXJncy5wdXNoKCctb3V0cHV0Jyk7XG4gICAgICAgIGFyZ3MucHVzaChvcHRpb25zLm91dHB1dERpcik7XG4gICAgfVxuXG4gICAgLy8gTm93IHRoYXQgdGhlIGNvbW1hbmQgYXJncyBhbmQgc3Bhd25vcHRzIGFyZSBzZXQgdXBcbiAgICAvLyBydW4gdGhlIGNvbW1hbmRcbiAgICAvLyBjb25zb2xlLmxvZyh7XG4gICAgLy8gICAgIHNwYXdub3B0cywgYXJnc1xuICAgIC8vIH0pO1xuICAgIGNvbnN0IGNoaWxkID0gc3Bhd24oJ2phdmEnLCBhcmdzLCBzcGF3bm9wdHMpO1xuXG4gICAgLy8gTmV4dCwgc2V0IHVwIHN0ZGluL3N0ZG91dCBwaXBlcyBpbiBjYXNlXG4gICAgLy8gb2YgdXNpbmcgLXBpcGUgbW9kZVxuXG4gICAgbGV0IGNodW5rczogQnVmZmVyW10gfCB1bmRlZmluZWQ7XG4gICAgaWYgKHBpcGVNb2RlKSB7XG4gICAgICAgIGNoaWxkLnN0ZGluLndyaXRlKHBpcGVJbnB1dCk7XG4gICAgICAgIGNoaWxkLnN0ZGluLmVuZCgpO1xuICAgICAgICAvLyBUaGUgb3V0cHV0IGdvZXMgZWl0aGVyIHRvIHRoZSBuYW1lZCBvdXRwdXRcbiAgICAgICAgLy8gZmlsZSBvciBpbnRvIGEgQnVmZmVyIHRoYXQgaXMgcmV0dXJuZWRcbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLm91dHB1dEZOID09PSAnc3RyaW5nJ1xuICAgICAgICAgJiYgb3B0aW9ucy5vdXRwdXRGTi5sZW5ndGggPj0gMVxuICAgICAgICApIHtcbiAgICAgICAgICAgIGNoaWxkLnN0ZG91dC5waXBlKGZzLmNyZWF0ZVdyaXRlU3RyZWFtKG9wdGlvbnMub3V0cHV0Rk4pKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNodW5rcyA9IFtdO1xuICAgICAgICAgICAgY2hpbGQuc3Rkb3V0Lm9uKCdkYXRhJywgKGNodW5rKSA9PiB7XG4gICAgICAgICAgICAgICAgY2h1bmtzLnB1c2goY2h1bmspO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBGaW5hbGx5LCB3YWl0IGZvciB0aGUgY2hpbGQgdG8gZmluaXNoXG5cbiAgICBjaGlsZC5vbignZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYHBsYW50dW1sIEVSUk9SIGluIGNoaWxkIHByb2Nlc3MgJHtlcnIubWVzc2FnZX1gKTtcbiAgICB9KTtcblxuICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgY2hpbGQub24oJ2Nsb3NlJywgKGNvZGUpID0+IHtcbiAgICAgICAgICAgIGlmIChjb2RlID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh1bmRlZmluZWQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKGBwbGFudHVtbCBmYWlsIHdpdGggY29kZSAke2NvZGV9YCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiBjaHVua3MgPyBCdWZmZXIuY29uY2F0KGNodW5rcykgOiB1bmRlZmluZWQ7XG59XG5cbi8qKlxuICogSGFuZGxlIGNvbnZlcnRpbmcgYSBzaW5nbGUgUGxhbnRVTUwgZGlhZ3JhbSBmb3JcbiAqIGRpc3BsYXkgaW4gYSBkb2N1bWVudC5cbiAqIFxuICogVGhlIGRvY3VtZW50IGRlc2NyaXB0aW9uIGlzIGVpdGhlciBpbmxpbmVcbiAqIHRvIHRoZSA8ZGlhZ3JhbXMtcGxhbnR1bWw+IHRhZywgb3IgZWxzZSBhIHNpbmdsZVxuICogaW5wdXQgZmlsZSBpbiB0aGUgaW5wdXQtZmlsZSBhdHRyaWJ1dGUuXG4gKiBcbiAqIFRoZXJlIGlzIGEgc2luZ2xlIG91dHB1dC1maWxlIGF0dHJpYnV0ZSB0b1xuICogZm9yIGEgZmlsZSB0byByZWNlaXZlIGFzIG91dHB1dC4gIFRoaXMgZmlsZVxuICogaXMgd3JpdHRlbiBkaXJlY3RseSB0byB0aGUgcmVuZGVyaW5nT3V0cHV0IGRpcmVjdG9yeS5cbiAqIFxuICogVGhpcyB3aWxsIHN1cHBvcnQgb25seSBQTkcgYW5kIFNWRyBvdXRwdXQgZm9ybWF0cy5cbiAqIFxuICogVGhlIG91dHB1dC1maWxlIGlzIGEgVlBhdGggc3BlY2lmeWluZyBhblxuICogb3V0cHV0IGRpcmVjdG9yeSBsb2NhdGlvbi5cbiAqIFxuICogaXNBYnNvbHV0ZShvdXRwdXQtZmlsZSkgLSBtZWFucyBpdCBpcyByb290ZWRcbiAqIHRvIHRoZSBvdXRwdXQgZGlyZWN0b3J5LiAgT3RoZXJ3aXNlIGl0IGlzIHJlbGF0aXZlXG4gKiB0byB0aGUgZGlybmFtZShtZXRhZGF0YS5kb2N1bWVudC5wYXRoKS5cbiAqIFxuICogV2hlbiB0aGVyZSBpcyBubyBvdXRwdXQtZmlsZSBhdHRyaWJ1dGUsIHRoZSBkaWFncmFtXG4gKiBpcyByZW5kZXJlZCBhcyBpbmxpbmUgU1ZHIGVtYmVkZGVkIGluIHRoZSBnZW5lcmF0ZWRcbiAqIEhUTUwuICBUaGlzIG1vZGUgcmVxdWlyZXMgdGhlIHRzdmcgb3V0cHV0IGZvcm1hdC5cbiAqL1xuZXhwb3J0IGNsYXNzIFBsYW50VU1MTG9jYWwgZXh0ZW5kcyBha2FzaGEuQ3VzdG9tRWxlbWVudCB7XG5cblx0Z2V0IGVsZW1lbnROYW1lKCkgeyByZXR1cm4gXCJkaWFncmFtcy1wbGFudHVtbFwiOyB9XG4gICAgYXN5bmMgcHJvY2VzcygkZWxlbWVudCwgbWV0YWRhdGEsIGRpcnR5OiBGdW5jdGlvbikge1xuXG4gICAgICAgIGNvbnN0IG9wdGlvbnM6IGRvUGxhbnRVTUxPcHRpb25zID0ge1xuICAgICAgICAgICAgLy8gVXNpbmcgLnRleHQoKSBlbGltaW5hdGVzIEhUTUwgZm9ybWF0dGluZy5cbiAgICAgICAgICAgIGlucHV0Qm9keTogJGVsZW1lbnQudGV4dCgpLFxuICAgICAgICAgICAgaW5wdXRGTnM6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIG91dHB1dEZOOiAkZWxlbWVudC5hdHRyKCdvdXRwdXQtZmlsZScpXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gRW5zdXJlIHRoZXJlIGlzIGVpdGhlciBhbiBpbnB1dC1maWxlXG4gICAgICAgIC8vIG9yIGFuIGlucHV0IGJvZHlcblxuICAgICAgICBjb25zdCBpbmYgPSAgJGVsZW1lbnQuYXR0cignaW5wdXQtZmlsZScpO1xuICAgICAgICBpZiAodHlwZW9mIGluZiA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIG9wdGlvbnMuaW5wdXRGTnMgPSBbIGluZiBdO1xuICAgICAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoaW5mKSAmJiBpbmYubGVuZ3RoID49IDEpIHtcbiAgICAgICAgICAgIG9wdGlvbnMuaW5wdXRGTnMgPSBbIGluZlswXSBdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3B0aW9ucy5pbnB1dEZOcyA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMuaW5wdXRCb2R5ICE9PSAnc3RyaW5nJ1xuICAgICAgICAgJiYgKFxuICAgICAgICAgICAgIUFycmF5LmlzQXJyYXkob3B0aW9ucy5pbnB1dEZOcylcbiAgICAgICAgIHx8IG9wdGlvbnMuaW5wdXRGTnMubGVuZ3RoIDw9IDBcbiAgICAgICAgKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQbGFudFVNTExvY2FsIG9uZSBpbnB1dCBmaWxlIG9yIGlubGluZSBkaWFncmFtIGlzIHJlcXVpcmVkYCk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgdnBhdGhJbjtcbiAgICAgICAgbGV0IGZzcGF0aEluO1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShvcHRpb25zLmlucHV0Rk5zKSAmJiBvcHRpb25zLmlucHV0Rk5zLmxlbmd0aCA9PT0gMSkge1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMuaW5wdXRGTnNbMF0gIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQbGFudFVNTExvY2FsIG5vIGlucHV0IGZpbGUgRk4gZ2l2ZW4gaW4gJHt1dGlsLmluc3BlY3Qob3B0aW9ucy5pbnB1dEZOcyl9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBpbkZOID0gb3B0aW9ucy5pbnB1dEZOc1swXTtcbiAgICAgICAgICAgIGlmIChwYXRoLmlzQWJzb2x1dGUoaW5GTikpIHtcbiAgICAgICAgICAgICAgICB2cGF0aEluID0gaW5GTjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbGV0IGRpciA9IHBhdGguZGlybmFtZShtZXRhZGF0YS5kb2N1bWVudC5wYXRoKTtcbiAgICAgICAgICAgICAgICB2cGF0aEluID0gcGF0aC5ub3JtYWxpemUoXG4gICAgICAgICAgICAgICAgICAgIHBhdGguam9pbignLycsIGRpciwgaW5GTilcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBkb2N1bWVudHMgPSB0aGlzLmNvbmZpZy5ha2FzaGEuZmlsZWNhY2hlLmRvY3VtZW50c0NhY2hlO1xuICAgICAgICAgICAgY29uc3QgYXNzZXRzID0gdGhpcy5jb25maWcuYWthc2hhLmZpbGVjYWNoZS5hc3NldHNDYWNoZTtcbiAgICAgICAgICAgIGNvbnN0IGRvYyA9IGF3YWl0IGRvY3VtZW50cy5maW5kKHZwYXRoSW4pO1xuICAgICAgICAgICAgbGV0IGFzc2V0O1xuXG4gICAgICAgICAgICBpZiAoIWRvYykgYXNzZXQgPSBhd2FpdCBhc3NldHMuZmluZCh2cGF0aEluKTtcbiAgIFxuICAgICAgICAgICAgaWYgKCFkb2MgJiYgIWFzc2V0KSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQbGFudFVNTExvY2FsIG5vIHBsYW50dW1sIGFzc2V0IG9yIGRvY3VtZW50IGZpbGUgIGZvdW5kIGZvciAke3ZwYXRoSW59YCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChkb2MpIGZzcGF0aEluID0gZG9jLmZzcGF0aDtcbiAgICAgICAgICAgIGVsc2UgaWYgKGFzc2V0KSBmc3BhdGhJbiA9IGFzc2V0LmZzcGF0aDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElmIHRoZXJlIHdhcyBhbiBpbnB1dCBmaWxlLCByZWNvcmQgaXRzIGZ1bGwgcGF0aG5hbWVcbiAgICAgICAgLy8gYXMgdGhlIGlucHV0Rk5zIGVudHJ5XG4gICAgICAgIGlmIChmc3BhdGhJbikgb3B0aW9ucy5pbnB1dEZOcyA9IFsgZnNwYXRoSW4gXTtcblxuICAgICAgICAvLyBXaXRoIG5vIG91dHB1dC1maWxlIGF0dHJpYnV0ZSwgdGhlIHJlbmRlcmVkIFNWRyBpc1xuICAgICAgICAvLyBpbnNlcnRlZCBpbmxpbmUgaW4gdGhlIGdlbmVyYXRlZCBIVE1MIHJhdGhlciB0aGFuXG4gICAgICAgIC8vIHdyaXR0ZW4gdG8gYSBmaWxlIGFuZCByZWZlcmVuY2VkIHdpdGggPGltZz4uXG4gICAgICAgIGNvbnN0IGlubGluZU1vZGUgPSB0eXBlb2Ygb3B0aW9ucy5vdXRwdXRGTiAhPT0gJ3N0cmluZydcbiAgICAgICAgICAgICAgICAgICAgICAgIHx8IG9wdGlvbnMub3V0cHV0Rk4ubGVuZ3RoIDwgMTtcblxuICAgICAgICBsZXQgdnBhdGhPdXQ7XG4gICAgICAgIGlmICghaW5saW5lTW9kZSkge1xuICAgICAgICAgICAgaWYgKCEgcGF0aC5pc0Fic29sdXRlKG9wdGlvbnMub3V0cHV0Rk4pKSB7XG4gICAgICAgICAgICAgICAgbGV0IGRpciA9IHBhdGguZGlybmFtZShtZXRhZGF0YS5kb2N1bWVudC5wYXRoKTtcbiAgICAgICAgICAgICAgICB2cGF0aE91dCA9IHBhdGgubm9ybWFsaXplKFxuICAgICAgICAgICAgICAgICAgICBwYXRoLmpvaW4oJy8nLCBkaXIsIG9wdGlvbnMub3V0cHV0Rk4pXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdnBhdGhPdXQgPSBvcHRpb25zLm91dHB1dEZOO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDb21wdXRlIGZzcGF0aCBmb3IgdnBhdGhPdXRcbiAgICAgICAgICAgIGNvbnN0IGZzcGF0aE91dCA9IHBhdGgubm9ybWFsaXplKHBhdGguam9pbihcbiAgICAgICAgICAgICAgICB0aGlzLmFycmF5Lm9wdGlvbnMuY29uZmlnLnJlbmRlckRlc3RpbmF0aW9uLCB2cGF0aE91dFxuICAgICAgICAgICAgKSk7XG4gICAgICAgICAgICBvcHRpb25zLm91dHB1dEZOID0gZnNwYXRoT3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3B0aW9ucy5vdXRwdXRGTiA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCB3aWR0aCA9ICRlbGVtZW50LmF0dHIoJ3dpZHRoJyk7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGB3aWR0aD0ke3dpZHRofWApO1xuICAgICAgICBpZiAodHlwZW9mIHdpZHRoID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgd2lkdGggPSBOdW1iZXIucGFyc2VGbG9hdCh3aWR0aCk7XG4gICAgICAgICAgICBpZiAoaXNOYU4od2lkdGgpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQbGFudFVNTExvY2FsOiB3aWR0aCBpcyBub3QgYSBudW1iZXIgJHt3aWR0aH1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICg8YW55Pm9wdGlvbnMpLndpZHRoID0gd2lkdGg7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBjb25zb2xlLmxvZyhvcHRpb25zKTtcblxuICAgICAgICBjb25zdCBpZCA9ICRlbGVtZW50LmF0dHIoJ2lkJyk7XG4gICAgICAgIGNvbnN0IGNsYXp6ID0gJGVsZW1lbnQuYXR0cignY2xhc3MnKTtcbiAgICAgICAgY29uc3QgYWx0ID0gJGVsZW1lbnQuYXR0cignYWx0Jyk7XG4gICAgICAgIGNvbnN0IHRpdGxlID0gJGVsZW1lbnQuYXR0cigndGl0bGUnKTtcbiAgICAgICAgY29uc3QgY2FwdGlvbiA9ICRlbGVtZW50LmF0dHIoJ2NhcHRpb24nKTtcbiAgICAgICAgY29uc3QgY3MgPSAkZWxlbWVudC5hdHRyKCdjaGFyc2V0Jyk7XG4gICAgICAgIGlmIChpc1ZhbGlkQ2hhcnNldChjcykpIG9wdGlvbnMuY2hhcnNldCA9IGNzO1xuICAgICAgICBvcHRpb25zLmRhcmttb2RlID0gdHlwZW9mICRlbGVtZW50LnByb3AoJ2Rhcmttb2RlJykgIT09ICd1bmRlZmluZWQnO1xuICAgICAgICAvLyBvcHRpb25zLmRlYnVnc3ZlayA9ICRlbGVtZW50LnByb3AoJ2RlYnVnc3ZlaycpO1xuICAgICAgICAvLyBvcHRpb25zLmZpbGVOYW1lT3ZlcnJpZGUgPSAkZWxlbWVudC5hdHRyKCdmaWxlbmFtZScpO1xuICAgICAgICBjb25zdCBuYnRocmVhZCA9ICRlbGVtZW50LmF0dHIoJ25idGhyZWFkJyk7XG4gICAgICAgIGlmICh0eXBlb2YgbmJ0aHJlYWQgPT09ICdzdHJpbmcnKSBvcHRpb25zLm5idGhyZWFkID0gbmJ0aHJlYWQ7XG4gICAgICAgIG9wdGlvbnMubm9tZXRhZGF0YSA9IHR5cGVvZiAkZWxlbWVudC5wcm9wKCdub21ldGFkYXRhJykgIT09ICd1bmRlZmluZWQnO1xuICAgICAgICAvLyBvcHRpb25zLnRlcHMgPSAkZWxlbWVudC5wcm9wKCd0ZXBzJyk7XG4gICAgICAgIC8vIG9wdGlvbnMudGh0bWwgPSAkZWxlbWVudC5wcm9wKCd0aHRtbCcpO1xuICAgICAgICAvLyBvcHRpb25zLnRsYXRleCA9ICRlbGVtZW50LnByb3AoJ3RsYXRleCcpO1xuICAgICAgICAvLyBvcHRpb25zLnRwZGYgPSAkZWxlbWVudC5wcm9wKCd0cGRmJyk7XG4gICAgICAgIG9wdGlvbnMudHBuZyA9IHR5cGVvZiAkZWxlbWVudC5wcm9wKCd0cG5nJykgIT09ICd1bmRlZmluZWQnO1xuICAgICAgICAvLyBvcHRpb25zLnRzY3htbCA9ICRlbGVtZW50LnByb3AoJ3RzY3htbCcpO1xuICAgICAgICBvcHRpb25zLnRzdmcgPSB0eXBlb2YgJGVsZW1lbnQucHJvcCgndHN2ZycpICE9PSAndW5kZWZpbmVkJztcbiAgICAgICAgLy8gb3B0aW9ucy50dHh0ID0gJGVsZW1lbnQucHJvcCgndHR4dCcpO1xuICAgICAgICAvLyBvcHRpb25zLnR1dHh0ID0gJGVsZW1lbnQucHJvcCgndHV0eHQnKTtcbiAgICAgICAgLy8gb3B0aW9ucy50dmR4ID0gJGVsZW1lbnQucHJvcCgndHZkeCcpO1xuICAgICAgICAvLyBvcHRpb25zLnR4bWkgPSAkZWxlbWVudC5wcm9wKCd0eG1pJyk7XG4gICAgICAgIC8vIG9wdGlvbnMudmVyYm9zZSA9ICRlbGVtZW50LnByb3AoJ3ZlcmJvc2UnKTtcblxuICAgICAgICBpZiAob3B0aW9ucy50cG5nICYmIG9wdGlvbnMudHN2Zykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQbGFudFVNTExvY2FsIGNhbm5vdCB1c2UgYm90aCB0cG5nIGFuZCB0c3ZnYCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFvcHRpb25zLnRwbmcgJiYgIW9wdGlvbnMudHN2Zykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQbGFudFVNTExvY2FsIG11c3QgdXNlIG9uZSBvZiB0cG5nIG9yIHRzdmdgKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaW5saW5lTW9kZSAmJiAhb3B0aW9ucy50c3ZnKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFBsYW50VU1MTG9jYWwgd2l0aG91dCBvdXRwdXQtZmlsZSByZW5kZXJzIGlubGluZSBTVkcsIHdoaWNoIHJlcXVpcmVzIHRzdmdgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGJ1ZiA9IGF3YWl0IGRvUGxhbnRVTUwob3B0aW9ucyk7XG5cbiAgICAgICAgY29uc3QgY2FwID0gdHlwZW9mIGNhcHRpb24gPT09ICdzdHJpbmcnXG4gICAgICAgICAgICA/IGA8ZmlnY2FwdGlvbj4ke2VuY29kZShjYXB0aW9uKX08L2ZpZ2NhcHRpb24+YFxuICAgICAgICAgICAgOiAnJztcbiAgICAgICAgY29uc3QgVGFsdCA9IHR5cGVvZiBhbHQgPT09ICdzdHJpbmcnXG4gICAgICAgICAgICA/IGBhbHQ9XCIke2VuY29kZShhbHQpfVwiYFxuICAgICAgICAgICAgOiAnJztcbiAgICAgICAgY29uc3QgVHRpdGxlID0gdHlwZW9mIHRpdGxlID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgPyBgdGl0bGU9XCIke2VuY29kZSh0aXRsZSl9XCJgXG4gICAgICAgICAgICA6ICcnO1xuICAgICAgICBjb25zdCBUaWQgPSB0eXBlb2YgaWQgPT09ICdzdHJpbmcnXG4gICAgICAgICAgICA/IGBpZD1cIiR7ZW5jb2RlKGlkKX1cImBcbiAgICAgICAgICAgIDogJyc7XG4gICAgICAgIC8vIFRoZSBkaWFncmFtcy1wbGFudHVtbCBjbGFzcyBjYXJyaWVzIHRoZSBzdHlsZXNoZWV0XG4gICAgICAgIC8vIHJ1bGVzIGNvbnN0cmFpbmluZyB0aGUgZGlhZ3JhbSB0byBpdHMgY29udGFpbmVyLlxuICAgICAgICBjb25zdCBUY2xhenogPSB0eXBlb2YgY2xhenogPT09ICdzdHJpbmcnXG4gICAgICAgICAgICA/IGBjbGFzcz1cImRpYWdyYW1zLXBsYW50dW1sICR7ZW5jb2RlKGNsYXp6KX1cImBcbiAgICAgICAgICAgIDogYGNsYXNzPVwiZGlhZ3JhbXMtcGxhbnR1bWxcImA7XG4gICAgICAgIGNvbnN0IFR3aWR0aCA9IHR5cGVvZiB3aWR0aCA9PT0gJ251bWJlcidcbiAgICAgICAgICAgID8gYHdpZHRoPVwiJHt3aWR0aC50b1N0cmluZygpfVwiYFxuICAgICAgICAgICAgOiAnJztcblxuICAgICAgICAvLyBJbiBpbmxpbmUgbW9kZSB0aGVyZSBpcyBubyA8aW1nPiB0byBjYXJyeSB0aGUgYWx0LFxuICAgICAgICAvLyB0aXRsZSwgYW5kIHdpZHRoIGF0dHJpYnV0ZXMuICBUaGUgYWx0IHRleHQgYmVjb21lc1xuICAgICAgICAvLyBhbiBhcmlhLWxhYmVsIG9uIHRoZSBTVkcgcm9vdCwgdGhlIHdpZHRoIGJlY29tZXMgYVxuICAgICAgICAvLyB3aWR0aCBzdHlsZSBvbiB0aGUgU1ZHIHJvb3QsIGFuZCB0aGUgdGl0bGUgbGFuZHMgb25cbiAgICAgICAgLy8gdGhlIDxmaWd1cmU+LiAgVGhlIFhNTCBwcm9sb2d1ZSBlbWl0dGVkIGJ5IFBsYW50VU1MXG4gICAgICAgIC8vIGlzIHN0cmlwcGVkIGZvciBlbWJlZGRpbmcgaW4gSFRNTC5cbiAgICAgICAgY29uc3QgcmV0ID0gaW5saW5lTW9kZVxuICAgICAgICAgICAgPyBgXG4gICAgICAgIDxmaWd1cmUgJHtUaWR9ICR7VGNsYXp6fSAke1R0aXRsZX0+XG4gICAgICAgICR7YWRhcHRJbmxpbmVTdmcoXG4gICAgICAgICAgICBidWYudG9TdHJpbmcoJ3V0Zi04JykucmVwbGFjZSgvXlxccyo8XFw/eG1sW14+XSpcXD8+XFxzKi8sICcnKSxcbiAgICAgICAgICAgIHR5cGVvZiB3aWR0aCA9PT0gJ251bWJlcicgPyB3aWR0aCA6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIHR5cGVvZiBhbHQgPT09ICdzdHJpbmcnID8gYWx0IDogdW5kZWZpbmVkKX1cbiAgICAgICAgJHtjYXB9XG4gICAgICAgIDwvZmlndXJlPlxuICAgICAgICBgXG4gICAgICAgICAgICA6IGBcbiAgICAgICAgPGZpZ3VyZSAke1RpZH0gJHtUY2xhenp9PlxuICAgICAgICA8aW1nIHNyYz1cIiR7ZW5jb2RlKHZwYXRoT3V0KX1cIiAke1RhbHR9ICR7VHRpdGxlfSAke1R3aWR0aH0vPlxuICAgICAgICAke2NhcH1cbiAgICAgICAgPC9maWd1cmU+XG4gICAgICAgIGA7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKHJldCk7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNWYWxpZENoYXJzZXQoY2hhcnNldCkge1xuICAgIGlmICh0eXBlb2YgY2hhcnNldCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBjb25zdCBjcyA9IGNoYXJzZXQudG9Mb3dlckNhc2UoKTtcblxuICAgIGlmICh0eXBlb2YgY3MgIT09ICdzdHJpbmcnXG4gICAgICAgIHx8IChjcyAhPT0gJ3V0ZjgnICYmIGNzICE9PSAndXRmLTgnXG4gICAgICAgICYmIGNzICE9PSAndXRmMTYnICYmIGNzICE9PSAndXRmLTE2J1xuICAgICAgICAmJiBjcyAhPT0gJ3V0ZjE2YmUnICYmIGNzICE9PSAndXRmLTE2YmUnXG4gICAgICAgICYmIGNzICE9PSAndXRmMTZsZScgJiYgY3MgIT09ICd1dGYtMTZsZSdcbiAgICAgICAgJiYgY3MgIT09ICd1dGYzMicgJiYgY3MgIT09ICd1dGYtMzInXG4gICAgICAgICYmIGNzICE9PSAndXRmMzJsZScgJiYgY3MgIT09ICd1dGYtMzJsZScpXG4gICAgKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59XG4iXX0=