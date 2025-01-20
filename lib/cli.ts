
const __dirname = import.meta.dirname;

import { promises as fsp, constants } from 'node:fs';
import path, { parse } from 'node:path';
import util from 'node:util';

// import packageConfig from '../package.json' with { type: 'json' }; 

import { doPlantUMLOptions, doPlantUMLLocal, isValidCharset } from './index.js';

import { Command } from 'commander';
const program = new Command();

// PROG plantuml --input .. --output .. --other-options ..
// PROG mermaid
// PROG katex

// program.name(packageConfig.name);
// program
//     .version(packageConfig.version,
//         '-v, --version', 'output the current version')

program
    .command('plantuml')
    .description('Render PlantUML files')
    .option('--input-file <inputFN...>', 'Path for document to render')
    .option('--output-file <outputFN>', 'Path for rendered document')
    .option('--charset <charset>', 'To use a specific character set. Default: UTF-8')
    // TODO --checkmetadata Skip PNG files that don't need to be regenerated
    // TODO -Dvar=value should be --define <defVarValue...>
    .option('--darkmode', 'To use dark mode for diagrams')
    .option('--debugsvek', 'To generate intermediate svek files')
    // TODO --exclude pattern about excluding files from consideration
    //          based on a pattern
    // TODO --disablestats To disable statistics computation (default)
    // TODO --enablestats To enable statistics computation
    // TODO --encodesprite 4|8|16 "file"  To encode a sprite at a gray level from an image
    // TODO --failfast To stop processing as soon as a syntax error in diagram occurs
    // TODO --failfast2 To do a first syntax check before processing files, to fail even faster
    // TODO --filedir <dirNm> To behave as if PlantUML is in this dir
    .option('--filename <fileNm>', '"example.puml" To override %filename% variable')
    // TODO --graphvizdot "exe" To specify dot executable
    // TODO --htmlstats  To output general statistics in file plantuml-stats.html
    // TODO -I/path/to/file     To include file as if '!include file' were used
    // TODO -I/path/to/*.puml   To include files with pattern
    // TODO -language           To print the list of PlantUML keywords
    // TODO -loopstats          To continuously print statistics about usage
    // TODO -metadata           To retrieve PlantUML sources from PNG images
    .option('--nbthread <nThreads>', 'To use (N) threads for processing.  Use "auto" for 4 threads.')
    // TODO -noerror            To skip images when error in diagrams
    .option('--nometadata', 'To NOT export metadata in PNG/SVG generated files')
    .option('--output-dir <outDir>', 'To generate images in the specified directory')
    // .option('--overwrite', 'To allow to overwrite read only files')
    // TODO -Ppragma1=value     To set pragma as if '!pragma pragma1 value' were used
    // TODO -p[ipe]             To use stdin for PlantUML source and stdout for PNG/SVG/EPS generation
    // TODO -picoweb            To start internal HTTP Server. See https://plantuml.com/picoweb
    // TODO -pipeimageindex N   To generate the Nth image with pipe option
    // TODO -preproc            To output preprocessor text of diagrams
    // TODO -printfonts         To print fonts available on your system
    // TODO -progress           To display a textual progress bar in console
    // TODO -quiet              To NOT print error message into the console
    // TODO -realtimestats      To generate statistics on the fly rather than at the end
    // TODO -Sparam1=value      To set a skin parameter as if 'skinparam param1 value' were used
    // TODO -splash             To display a splash screen with some progress bar
    // TODO -stdlib             To print standard library info
    // TODO -syntax             To report any syntax error from standard input without generating images
    // TODO -testdot            To test the installation of graphviz
    // TODO -theme xxx          To use a specific theme
    // TODO -timeout N          Processing timeout in (N) seconds. Defaults to 15 minutes (900 seconds).
    .option('--teps', 'To generate images using EPS format')
    .option('--thtml', 'To generate HTML file for class diagram')
    // TODO -tlatex:nopreamble  To generate images using LaTeX/Tikz format without preamble
    .option('--tlatex', 'To generate images using LaTeX/Tikz format')
    .option('--tpdf', 'To generate images using PDF format')
    .option('--tpng', 'To generate images using PNG format (default)')
    .option('--tscxml', 'To generate SCXML file for state diagram')
    .option('--tsvg', 'To generate images using SVG format')
    .option('--ttxt', 'To generate images with ASCII art')
    .option('--tutxt', 'To generate images with ASCII art using Unicode characters')
    .option('--tvdx', 'To generate images using VDX format')
    .option('--txmi', 'To generate XMI file for class diagram')
    .option('--verbose', 'To have log information')
    // TODO -xmlstats           To output general statistics in file plantuml-stats.xml
    .action(async (cmdObj) => {

        const options: doPlantUMLOptions = {
            // inputBody does not make sense for CLI
            // inputBody: typeof inputFN === 'string'
            //         ? await fsp.readFile(inputFN, 'utf-8')
            //         : undefined,
            inputFNs: cmdObj.inputFile,
            outputFN: cmdObj.outputFile
        };

        if (cmdObj.charset) {
            if (!isValidCharset(cmdObj.charset)) {
                throw new Error(`plantuml charset ${util.inspect(cmdObj.charset)} unknown`);
            }
            options.charset = cmdObj.charset;
        }

        if (cmdObj.nbthread) {
            if (cmdObj.nbthread !== 'auto') {
                const nt = Number.parseInt(cmdObj.nbthread);
                if (isNaN(nt) || nt < 0 || nt > 16) {
                    throw new Error(`plantuml nbthread ${util.inspect(cmdObj.nbthread)} invalid`);
                }
            }
            options.nbthread = cmdObj.nbthread;
        }

        if ('darkmode' in cmdObj) {
            if (typeof cmdObj.darkmode !== 'boolean') {
                throw new Error(`plantuml invalid darkmode option ${util.inspect(cmdObj.darkmode)}`);
            }
            options.darkmode = cmdObj.darkmode;
        }

        if ('debugsvek' in cmdObj) {
            if (typeof cmdObj.debugsvek !== 'boolean') {
                throw new Error(`plantuml invalid debugsvek option ${util.inspect(cmdObj.debugsvek)}`);
            }
            options.debugsvek = cmdObj.debugsvek;
        }

        if ('filename' in cmdObj) {
            if (typeof cmdObj.filename !== 'boolean') {
                throw new Error(`plantuml invalid filename option ${util.inspect(cmdObj.filename)}`);
            }
            options.fileNameOverride = cmdObj.filename;
        }

        if ('nometadata' in cmdObj) {
            if (typeof cmdObj.nometadata !== 'boolean') {
                throw new Error(`plantuml invalid nometadata option ${util.inspect(cmdObj.nometadata)}`);
            }
            options.nometadata = cmdObj.nometadata;
        }

        options.outputDir = cmdObj.outputDir;

        if ('teps' in cmdObj) {
            if (typeof cmdObj.teps !== 'boolean') {
                throw new Error(`plantuml invalid teps option ${util.inspect(cmdObj.teps)}`);
            }
            options.teps = cmdObj.teps;
        }

        if ('thtml' in cmdObj) {
            if (typeof cmdObj.thtml !== 'boolean') {
                throw new Error(`plantuml invalid thtml option ${util.inspect(cmdObj.thtml)}`);
            }
            options.thtml = cmdObj.thtml;
        }

        if ('tlatex' in cmdObj) {
            if (typeof cmdObj.tlatex !== 'boolean') {
                throw new Error(`plantuml invalid tlatex option ${util.inspect(cmdObj.tlatex)}`);
            }
            options.tlatex = cmdObj.tlatex;
        }

        if ('tpdf' in cmdObj) {
            if (typeof cmdObj.tpdf !== 'boolean') {
                throw new Error(`plantuml invalid tpdf option ${util.inspect(cmdObj.tpdf)}`);
            }
            options.tpdf = cmdObj.tpdf;
        }

        if ('tpng' in cmdObj) {
            if (typeof cmdObj.tpng !== 'boolean') {
                throw new Error(`plantuml invalid tpng option ${util.inspect(cmdObj.tpng)}`);
            }
            options.tpng = cmdObj.tpng;
        }

        if ('tscxml' in cmdObj) {
            if (typeof cmdObj.tscxml !== 'boolean') {
                throw new Error(`plantuml invalid tscxml option ${util.inspect(cmdObj.tscxml)}`);
            }
            options.tscxml = cmdObj.tscxml;
        }

        if ('tsvg' in cmdObj) {
            if (typeof cmdObj.tsvg !== 'boolean') {
                throw new Error(`plantuml invalid tsvg option ${util.inspect(cmdObj.tsvg)}`);
            }
            options.tsvg = cmdObj.tsvg;
        }

        if ('ttxt' in cmdObj) {
            if (typeof cmdObj.tsvg !== 'boolean') {
                throw new Error(`plantuml invalid ttxt option ${util.inspect(cmdObj.ttxt)}`);
            }
            options.ttxt = cmdObj.ttxt;
        }

        if ('tutxt' in cmdObj) {
            if (typeof cmdObj.tutxt !== 'boolean') {
                throw new Error(`plantuml invalid tutxt option ${util.inspect(cmdObj.tutxt)}`);
            }
            options.tutxt = cmdObj.tutxt;
        }

        if ('tvdx' in cmdObj) {
            if (typeof cmdObj.tvdx !== 'boolean') {
                throw new Error(`plantuml invalid tvdx option ${util.inspect(cmdObj.tvdx)}`);
            }
            options.tvdx = cmdObj.tvdx;
        }

        if ('txmi' in cmdObj) {
            if (typeof cmdObj.txmi !== 'boolean') {
                throw new Error(`plantuml invalid txmi option ${util.inspect(cmdObj.txmi)}`);
            }
            options.txmi = cmdObj.txmi;
        }

        if ('verbose' in cmdObj) {
            if (typeof cmdObj.verbose !== 'boolean') {
                throw new Error(`plantuml invalid verbose option ${util.inspect(cmdObj.verbose)}`);
            }
            options.verbose = cmdObj.verbose;
        }

        console.log({
            cmdObj, options
        })

        await doPlantUMLLocal(options);
    });


program.parse();
