

import path from 'node:path';
import fs, { promises as fsp } from 'node:fs';
import util from 'node:util';
import { execSync, spawnSync, spawn } from 'node:child_process';
import {encode} from 'html-entities';

const __dirname = import.meta.dirname;

// Path name for the local copy of plantuml.jar
const plantumlJar = path.join(
                __dirname,
                '..',
                'vendor',
                'plantuml',
                'plantuml-mit-1.2025.0.jar');

const pluginName = '@akashacms/plugins-diagrams';

import * as akasha from 'akasharender';
import { Plugin } from 'akasharender/dist/Plugin.js';
const mahabhuta = akasha.mahabhuta;

const _plugin_config = Symbol('config');
const _plugin_options = Symbol('options');

export class DiagramsPlugin extends Plugin {

    #config;

    constructor() {
        super(pluginName);
    }

    configure(config, options) {
        this.#config = config;
        super.options = options; // ? options : {};
        options.config = config;
        config.addMahabhuta(mahabhutaArray(options));
    }

    get config() { return this.#config; }
}

export function mahabhutaArray(options) {
    let ret = new mahabhuta.MahafuncArray(pluginName, options);
    ret.addMahafunc(new PlantUMLLocal());
    return ret;
};

/**
 * Options object that is converted into plantuml.jar options.
 */
export type doPlantUMLOptions = {
    /**
     * The PlantUML diagram text to use
     */
    inputBody?: string;

    /**
     * Zero or more file names for files to render
     */
    inputFNs?: string[];

    /**
     * Possible file to write output into
     */
    outputFN?: string;

    /**
     * To use a specific character set. Default: UTF-8
     */
    charset?: string;

    /**
     * To use dark mode for diagrams
     */
    darkmode?: boolean;

    /**
     * To generate intermediate svek files
     */
    debugsvek?: boolean;

    /**
     * "example.puml" To override %filename% variable
     */
    fileNameOverride?: string;

    /**
     * To use (N) threads for processing.  Use "auto" for 4 threads.
     */
    nbthread?: string;

    /**
     * To NOT export metadata in PNG/SVG generated files
     */
    nometadata?: boolean;

    /**
     * To generate images in the specified directory
     */
    outputDir?: string;

    /**
     * To generate images using EPS format
     */
    teps?: boolean;

    /**
     * To generate HTML file for class diagram
     */
    thtml?: boolean;

    /**
     * To generate images using LaTeX/Tikz format
     */
    tlatex?: boolean;

    /**
     * To generate images using PDF format
     */
    tpdf?: boolean;

    /**
     * To generate images using PNG format (default)
     */
    tpng?: boolean;

    /**
     * To generate SCXML file for state diagram
     */
    tscxml?: boolean;

    /**
     * To generate images using SVG format
     */
    tsvg?: boolean;

    /**
     * To generate images with ASCII art
     */
    ttxt?: boolean;

    /**
     * To generate images with ASCII art using Unicode characters
     */
    tutxt?: boolean;

    /**
     * To generate images using VDX format
     */
    tvdx?: boolean;

    /**
     * To generate XMI file for class diagram
     */
    txmi?: boolean;

    /**
     * To have log information
     */
    verbose?: boolean;
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

    let spawnopts = {} as any;

    if (typeof options.inputFNs === 'undefined'
     && !Array.isArray(options.inputFNs)
     && typeof options.inputBody !== 'string'
    ) {
        throw new Error(`plantuml - no input sources`);
    }
    if (typeof options.inputFNs === 'undefined'
     && !Array.isArray(options.inputFNs)
     && typeof options.inputBody === 'string'
     && typeof options.outputFN !== 'string'
    ) {
        throw new Error(`plantuml - with inputBody, no output destination`);
    }
    // No file names, but an inputBody, and an output file,
    // means we're piping
    if (typeof options.inputFNs === 'undefined'
     && !Array.isArray(options.inputFNs)
     && typeof options.inputBody === 'string'
     && typeof options.outputFN === 'string'
    ) {
        args.push('-pipe');
    }
    if (Array.isArray(options.inputFNs)
     && options.inputFNs.length === 1
     && typeof options.outputFN !== 'string'
    ) {
        throw new Error(`plantuml - with one input file ${options.inputFNs[0]} no output file`);
    }
    // One file names, ignore inputBody, and an output file,
    // means we're piping
    if (Array.isArray(options.inputFNs)
     && options.inputFNs.length === 1
     && typeof options.outputFN === 'string'
    ) {
        args.push('-pipe');
    }

    if (Array.isArray(options.inputFNs)
     && options.inputFNs.length > 1
     && typeof options.outputFN === 'string'
    ) {
        throw new Error(`plantuml - with multiple input files, output file not allowed`)
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
     && typeof options.outputFN === 'string'
    ) {
        child.stdin.write(options.inputBody);
        child.stdout.pipe(fs.createWriteStream(options.outputFN));
        child.stdin.end();
    }

    // One file names, ignore inputBody, and an output file,
    // set up the piping from input to output
    if (Array.isArray(options.inputFNs)
     && options.inputFNs.length === 1
     && typeof options.outputFN === 'string'
    ) {
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
            } else {
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
    async process($element, metadata, dirty: Function) {

        const options: doPlantUMLOptions = {
            // Using .text() eliminates HTML formatting.
            inputBody: $element.text(),
            inputFNs: undefined,
            outputFN: $element.attr('output-file')
        };

        // Ensure there is either an input-file
        // or an input body

        const inf =  $element.attr('input-file');
        if (typeof inf === 'string') {
            options.inputFNs = [ inf ];
        } else if (Array.isArray(inf) && inf.length >= 1) {
            options.inputFNs = [ inf[0] ];
        } else {
            options.inputFNs = undefined;
        }
        if (typeof options.inputBody !== 'string'
         && (
            !Array.isArray(options.inputFNs)
         || options.inputFNs.length <= 0
        )) {
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
            } else {
                let dir = path.dirname(metadata.document.path);
                vpathIn = path.normalize(
                    path.join('/', dir, inFN)
                );
            }

            const documents = this.array.options.config.akasha.filecache.documentsCache;
            const assets = this.array.options.config.akasha.filecache.assetsCache;
            const doc = await documents.find(vpathIn);
            let asset;

            if (!doc) asset = await assets.find(vpathIn);
   
            if (!doc && !asset) {
                throw new Error(`PlantUMLLocal no plantuml asset or document file  found for ${vpathIn}`);
            }

            if (doc) fspathIn = doc.fspath;
            else if (asset) fspathIn = asset.fspath;
        }

        // If there was an input file, record its full pathname
        // as the inputFNs entry
        if (fspathIn) options.inputFNs = [ fspathIn ];

        if (typeof options.outputFN !== 'string') {
            throw new Error(`PlantUMLLocal no output file name was supplied`);
        }

        let vpathOut;
        if (! path.isAbsolute(options.outputFN)) {
            let dir = path.dirname(metadata.document.path);
            vpathOut = path.normalize(
                path.join('/', dir, options.outputFN)
            );
        } else {
            vpathOut = options.outputFN;
        }

        // Compute fspath for vpathOut
        const fspathOut = path.normalize(path.join(
            this.array.options.config.renderDestination, vpathOut
        ));
        options.outputFN = fspathOut;

        const id = $element.attr('id');
        const clazz = $element.attr('class');
        const alt = $element.attr('alt');
        const title = $element.attr('title');
        const caption = $element.attr('caption');
        const cs = $element.attr('charset');
        if (isValidCharset(cs)) options.charset = cs;
        options.darkmode = typeof $element.prop('darkmode') !== 'undefined';
        // options.debugsvek = $element.prop('debugsvek');
        // options.fileNameOverride = $element.attr('filename');
        const nbthread = $element.attr('nbthread');
        if (typeof nbthread === 'string') options.nbthread = nbthread;
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
        && cs !== 'utf32le' && cs !== 'utf-32le')
    ) {
        return false;
    }
    return true;
}
