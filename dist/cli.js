#! /usr/bin/env node
const __dirname = import.meta.dirname;
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import util from 'node:util';
// import packageConfig from '../package.json' with { type: 'json' }; 
import { doPlantUML, isValidCharset, doPintora, doMermaid, doKaTeX, renderKaTeXHtml } from './index.js';
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
    .option('--server <serverURL>', 'URL for a PlantUML server. Overrides PLANTUML_SERVER_URL.')
    .option('--jar <jarPath>', 'Path for a plantuml.jar file. Overrides PLANTUML_JAR.')
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
    const options = {
        // inputBody does not make sense for CLI
        // inputBody: typeof inputFN === 'string'
        //         ? await fsp.readFile(inputFN, 'utf-8')
        //         : undefined,
        inputFNs: cmdObj.inputFile,
        outputFN: cmdObj.outputFile
    };
    if (typeof cmdObj.server === 'string') {
        options.serverURL = cmdObj.server;
    }
    if (typeof cmdObj.jar === 'string') {
        options.jarPath = cmdObj.jar;
    }
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
    // In the single-input modes, when no --output-file is
    // given the rendered output is returned as a Buffer,
    // which is written to stdout.
    const buf = await doPlantUML(options);
    if (buf) {
        process.stdout.write(buf);
    }
});
// The editions of the PlantUML JAR published on the
// PlantUML release page, and the file name pattern
// used for each edition.
const plantumlEditions = [
    'gpl', 'mit', 'lgpl', 'asl', 'epl', 'bsd'
];
function plantumlJarName(edition, version) {
    return edition === 'gpl'
        ? `plantuml-${version}.jar`
        : `plantuml-${edition}-${version}.jar`;
}
program
    .command('plantuml-download')
    .description('Download the PlantUML JAR file for use with the PLANTUML_JAR environment variable')
    .option('--plantuml-version <version>', 'PlantUML version, such as 1.2025.0.  Default: the latest release.')
    .option('--edition <edition>', `JAR edition: ${plantumlEditions.join(', ')}`, 'mit')
    .option('--output-dir <outDir>', 'Directory into which the JAR is downloaded', '.')
    .action(async (cmdObj) => {
    const edition = cmdObj.edition;
    if (!plantumlEditions.includes(edition)) {
        throw new Error(`plantuml-download: unknown edition ${util.inspect(edition)} - use one of ${plantumlEditions.join(', ')}`);
    }
    let version = cmdObj.plantumlVersion;
    if (typeof version !== 'string') {
        const res = await fetch('https://api.github.com/repos/plantuml/plantuml/releases/latest');
        if (!res.ok) {
            throw new Error(`plantuml-download: could not determine the latest PlantUML release (${res.status} ${res.statusText}) - specify one with --plantuml-version`);
        }
        const release = await res.json();
        version = release.tag_name.replace(/^v/, '');
    }
    const jarName = plantumlJarName(edition, version);
    const url = `https://github.com/plantuml/plantuml/releases/download/v${version}/${jarName}`;
    console.log(`Downloading ${url}`);
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`plantuml-download: download of ${url} failed (${res.status} ${res.statusText})`);
    }
    const jarPath = path.join(cmdObj.outputDir, jarName);
    await fsp.mkdir(cmdObj.outputDir, { recursive: true });
    await fsp.writeFile(jarPath, Buffer.from(await res.arrayBuffer()));
    console.log(`Downloaded ${jarPath}

To use this JAR for PlantUML rendering, set the environment variable:

    export PLANTUML_JAR=${path.resolve(jarPath)}

Rendering with the JAR requires Java to be installed and in your PATH.`);
});
program
    .command('pintora')
    .description('Render Pintora files')
    .option('--input-file <inputFN>', 'Path for document to render')
    .option('--output-file <outputFN>', 'Path for rendered document')
    .option('--pixel-ratio <ratio>', '')
    .option('--mime-type <mt>', 'MIME type for output file')
    .option('--bg-color <color>', 'String describing background color')
    .option('--width <number>', 'Width of the output, height will be calculated according to the diagram content ratio')
    .action(async (cmdObj) => {
    const opts = {
        code: '',
        outputFN: ''
    };
    if (typeof cmdObj.inputFile === 'string') {
        opts.code = await fsp.readFile(cmdObj.inputFile, 'utf-8');
    }
    else {
        throw new Error('No input file specified');
    }
    if (typeof cmdObj.outputFile === 'string') {
        opts.outputFN = cmdObj.outputFile;
    }
    else {
        throw new Error('No output file specified');
    }
    if (typeof cmdObj.pixelRatio === 'string') {
        opts.devicePixelRatio = Number.parseFloat(cmdObj.pixelRatio);
    }
    if (typeof opts.devicePixelRatio !== 'undefined'
        && isNaN(opts.devicePixelRatio)) {
        throw new Error(`Invalid device pixel ratio ${util.inspect(cmdObj.pixelRatio)}`);
    }
    if (typeof cmdObj.mimeType === 'string') {
        if (cmdObj.mimeType === 'image/svg+xml'
            || cmdObj.mimeType === 'image/jpeg'
            || cmdObj.mimeType === 'image/png') {
            opts.mimeType = cmdObj.mimeType;
        }
        else {
            throw new Error(`Invalid MIME type ${util.inspect(cmdObj.mimeType)}`);
        }
    }
    if (typeof cmdObj.bgColor === 'string') {
        opts.backgroundColor = cmdObj.bgColor;
    }
    if (typeof cmdObj.width === 'string') {
        opts.width = Number.parseFloat(cmdObj.width);
        if (isNaN(opts.width)) {
            throw new Error(`diagrams-pintora: width is not a number ${cmdObj.width}`);
        }
    }
    opts.renderInSubprocess = false;
    await doPintora(opts);
});
program
    .command('mermaid')
    .description('Render Mermaid files to SVG')
    .option('--input-file <inputFN>', 'Path for document to render')
    .option('--output-file <outputFN>', 'Path for rendered SVG document')
    .option('--config <configFN>', 'Path for a JSON config file (theme, themeVariables, flowchart, ...)')
    .option('--theme <theme>', 'Theme preset: default, dark, forest, neutral, or modern')
    .option('--font <fontFN...>', 'TTF/OTF font file(s) to register for text measurement')
    .action(async (cmdObj) => {
    const opts = {
        code: '',
        outputFN: ''
    };
    if (typeof cmdObj.inputFile === 'string') {
        opts.code = await fsp.readFile(cmdObj.inputFile, 'utf-8');
    }
    else {
        throw new Error('No input file specified');
    }
    if (typeof cmdObj.outputFile === 'string') {
        opts.outputFN = cmdObj.outputFile;
    }
    else {
        throw new Error('No output file specified');
    }
    if (!opts.outputFN.endsWith('.svg')) {
        throw new Error(`mermaid output-file must have .svg extension ${util.inspect(opts.outputFN)}`);
    }
    if (typeof cmdObj.config === 'string') {
        opts.configJSON = await fsp.readFile(cmdObj.config, 'utf-8');
    }
    if (typeof cmdObj.theme === 'string') {
        opts.themePreset = cmdObj.theme;
    }
    if (Array.isArray(cmdObj.font)) {
        opts.fontFNs = cmdObj.font;
    }
    await doMermaid(opts);
});
program
    .command('katex')
    .description('Render TeX math files to KaTeX HTML markup')
    .option('--input-file <inputFN>', 'Path for document to render')
    .option('--output-file <outputFN>', 'Path for rendered HTML fragment')
    .option('--inline', 'Render in inline mode rather than display (block) mode')
    .option('--format <format>', 'Markup to emit: html, mathml, or htmlAndMathml')
    .option('--macros <macrosFN>', 'Path for a JSON file defining custom macros')
    .action(async (cmdObj) => {
    const opts = {
        code: '',
        outputFN: ''
    };
    if (typeof cmdObj.inputFile === 'string') {
        opts.code = await fsp.readFile(cmdObj.inputFile, 'utf-8');
    }
    else {
        throw new Error('No input file specified');
    }
    if ('inline' in cmdObj) {
        opts.displayMode = !cmdObj.inline;
    }
    if (typeof cmdObj.format === 'string') {
        if (cmdObj.format === 'html'
            || cmdObj.format === 'mathml'
            || cmdObj.format === 'htmlAndMathml') {
            opts.output = cmdObj.format;
        }
        else {
            throw new Error(`Invalid format ${util.inspect(cmdObj.format)} - use html, mathml, or htmlAndMathml`);
        }
    }
    if (typeof cmdObj.macros === 'string') {
        opts.macros = JSON.parse(await fsp.readFile(cmdObj.macros, 'utf-8'));
    }
    // When no --output-file is given the rendered markup
    // is written to stdout, so the command can be used in
    // a pipeline.
    if (typeof cmdObj.outputFile === 'string') {
        opts.outputFN = cmdObj.outputFile;
        await doKaTeX(opts);
    }
    else {
        process.stdout.write(renderKaTeXHtml(opts.code, opts));
    }
});
program.parse();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vbGliL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBRUEsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUM7QUFFdEMsT0FBTyxFQUFFLFFBQVEsSUFBSSxHQUFHLEVBQWEsTUFBTSxTQUFTLENBQUM7QUFDckQsT0FBTyxJQUFlLE1BQU0sV0FBVyxDQUFDO0FBQ3hDLE9BQU8sSUFBSSxNQUFNLFdBQVcsQ0FBQztBQUU3QixzRUFBc0U7QUFFdEUsT0FBTyxFQUFxQixVQUFVLEVBQUUsY0FBYyxFQUF3QixTQUFTLEVBQXdCLFNBQVMsRUFBc0IsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUUzTCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBQ3BDLE1BQU0sT0FBTyxHQUFHLElBQUksT0FBTyxFQUFFLENBQUM7QUFFOUIsMERBQTBEO0FBQzFELGVBQWU7QUFDZixhQUFhO0FBRWIsb0NBQW9DO0FBQ3BDLFVBQVU7QUFDVixzQ0FBc0M7QUFDdEMseURBQXlEO0FBRXpELE9BQU87S0FDRixPQUFPLENBQUMsVUFBVSxDQUFDO0tBQ25CLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBQztLQUNwQyxNQUFNLENBQUMsMkJBQTJCLEVBQUUsNkJBQTZCLENBQUM7S0FDbEUsTUFBTSxDQUFDLDBCQUEwQixFQUFFLDRCQUE0QixDQUFDO0tBQ2hFLE1BQU0sQ0FBQyxzQkFBc0IsRUFBRSwyREFBMkQsQ0FBQztLQUMzRixNQUFNLENBQUMsaUJBQWlCLEVBQUUsdURBQXVELENBQUM7S0FDbEYsTUFBTSxDQUFDLHFCQUFxQixFQUFFLGlEQUFpRCxDQUFDO0lBQ2pGLHdFQUF3RTtJQUN4RSx1REFBdUQ7S0FDdEQsTUFBTSxDQUFDLFlBQVksRUFBRSwrQkFBK0IsQ0FBQztLQUNyRCxNQUFNLENBQUMsYUFBYSxFQUFFLHFDQUFxQyxDQUFDO0lB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c0RBQXNEO0lBQ3RELGNBQWM7SUFDZCxJQUFJLE9BQU8sTUFBTSxDQUFDLFVBQVUsS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUN4QyxJQUFJLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUM7UUFDbEMsTUFBTSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDeEIsQ0FBQztTQUFNLENBQUM7UUFDSixPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQzNELENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQztBQUVQLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIiMhIC91c3IvYmluL2VudiBub2RlXG5cbmNvbnN0IF9fZGlybmFtZSA9IGltcG9ydC5tZXRhLmRpcm5hbWU7XG5cbmltcG9ydCB7IHByb21pc2VzIGFzIGZzcCwgY29uc3RhbnRzIH0gZnJvbSAnbm9kZTpmcyc7XG5pbXBvcnQgcGF0aCwgeyBwYXJzZSB9IGZyb20gJ25vZGU6cGF0aCc7XG5pbXBvcnQgdXRpbCBmcm9tICdub2RlOnV0aWwnO1xuXG4vLyBpbXBvcnQgcGFja2FnZUNvbmZpZyBmcm9tICcuLi9wYWNrYWdlLmpzb24nIHdpdGggeyB0eXBlOiAnanNvbicgfTsgXG5cbmltcG9ydCB7IGRvUGxhbnRVTUxPcHRpb25zLCBkb1BsYW50VU1MLCBpc1ZhbGlkQ2hhcnNldCwgUGludG9yYVJlbmRlck9wdGlvbnMsIGRvUGludG9yYSwgTWVybWFpZFJlbmRlck9wdGlvbnMsIGRvTWVybWFpZCwgS2FUZVhSZW5kZXJPcHRpb25zLCBkb0thVGVYLCByZW5kZXJLYVRlWEh0bWwgfSBmcm9tICcuL2luZGV4LmpzJztcblxuaW1wb3J0IHsgQ29tbWFuZCB9IGZyb20gJ2NvbW1hbmRlcic7XG5jb25zdCBwcm9ncmFtID0gbmV3IENvbW1hbmQoKTtcblxuLy8gUFJPRyBwbGFudHVtbCAtLWlucHV0IC4uIC0tb3V0cHV0IC4uIC0tb3RoZXItb3B0aW9ucyAuLlxuLy8gUFJPRyBtZXJtYWlkXG4vLyBQUk9HIGthdGV4XG5cbi8vIHByb2dyYW0ubmFtZShwYWNrYWdlQ29uZmlnLm5hbWUpO1xuLy8gcHJvZ3JhbVxuLy8gICAgIC52ZXJzaW9uKHBhY2thZ2VDb25maWcudmVyc2lvbixcbi8vICAgICAgICAgJy12LCAtLXZlcnNpb24nLCAnb3V0cHV0IHRoZSBjdXJyZW50IHZlcnNpb24nKVxuXG5wcm9ncmFtXG4gICAgLmNvbW1hbmQoJ3BsYW50dW1sJylcbiAgICAuZGVzY3JpcHRpb24oJ1JlbmRlciBQbGFudFVNTCBmaWxlcycpXG4gICAgLm9wdGlvbignLS1pbnB1dC1maWxlIDxpbnB1dEZOLi4uPicsICdQYXRoIGZvciBkb2N1bWVudCB0byByZW5kZXInKVxuICAgIC5vcHRpb24oJy0tb3V0cHV0LWZpbGUgPG91dHB1dEZOPicsICdQYXRoIGZvciByZW5kZXJlZCBkb2N1bWVudCcpXG4gICAgLm9wdGlvbignLS1zZXJ2ZXIgPHNlcnZlclVSTD4nLCAnVVJMIGZvciBhIFBsYW50VU1MIHNlcnZlci4gT3ZlcnJpZGVzIFBMQU5UVU1MX1NFUlZFUl9VUkwuJylcbiAgICAub3B0aW9uKCctLWphciA8amFyUGF0aD4nLCAnUGF0aCBmb3IgYSBwbGFudHVtbC5qYXIgZmlsZS4gT3ZlcnJpZGVzIFBMQU5UVU1MX0pBUi4nKVxuICAgIC5vcHRpb24oJy0tY2hhcnNldCA8Y2hhcnNldD4nLCAnVG8gdXNlIGEgc3BlY2lmaWMgY2hhcmFjdGVyIHNldC4gRGVmYXVsdDogVVRGLTgnKVxuICAgIC8vIFRPRE8gLS1jaGVja21ldGFkYXRhIFNraXAgUE5HIGZpbGVzIHRoYXQgZG9uJ3QgbmVlZCB0byBiZSByZWdlbmVyYXRlZFxuICAgIC8vIFRPRE8gLUR2YXI9dmFsdWUgc2hvdWxkIGJlIC0tZGVmaW5lIDxkZWZWYXJWYWx1ZS4uLj5cbiAgICAub3B0aW9uKCctLWRhcmttb2RlJywgJ1RvIHVzZSBkYXJrIG1vZGUgZm9yIGRpYWdyYW1zJylcbiAgICAub3B0aW9uKCctLWRlYnVnc3ZlaycsICdUbyBnZW5lcmF0ZSBpbnRlcm1lZGlhdGUgc3ZlayBmaWxlcycpXG4gICAgLy8gVE9ETyAtLWV4Y2x1ZGUgcGF0dGVybiBhYm91dCBleGNsdWRpbmcgZmlsZXMgZnJvbSBjb25zaWRlcmF0aW9uXG4gICAgLy8gICAgICAgICAgYmFzZWQgb24gYSBwYXR0ZXJuXG4gICAgLy8gVE9ETyAtLWRpc2FibGVzdGF0cyBUbyBkaXNhYmxlIHN0YXRpc3RpY3MgY29tcHV0YXRpb24gKGRlZmF1bHQpXG4gICAgLy8gVE9ETyAtLWVuYWJsZXN0YXRzIFRvIGVuYWJsZSBzdGF0aXN0aWNzIGNvbXB1dGF0aW9uXG4gICAgLy8gVE9ETyAtLWVuY29kZXNwcml0ZSA0fDh8MTYgXCJmaWxlXCIgIFRvIGVuY29kZSBhIHNwcml0ZSBhdCBhIGdyYXkgbGV2ZWwgZnJvbSBhbiBpbWFnZVxuICAgIC8vIFRPRE8gLS1mYWlsZmFzdCBUbyBzdG9wIHByb2Nlc3NpbmcgYXMgc29vbiBhcyBhIHN5bnRheCBlcnJvciBpbiBkaWFncmFtIG9jY3Vyc1xuICAgIC8vIFRPRE8gLS1mYWlsZmFzdDIgVG8gZG8gYSBmaXJzdCBzeW50YXggY2hlY2sgYmVmb3JlIHByb2Nlc3NpbmcgZmlsZXMsIHRvIGZhaWwgZXZlbiBmYXN0ZXJcbiAgICAvLyBUT0RPIC0tZmlsZWRpciA8ZGlyTm0+IFRvIGJlaGF2ZSBhcyBpZiBQbGFudFVNTCBpcyBpbiB0aGlzIGRpclxuICAgIC5vcHRpb24oJy0tZmlsZW5hbWUgPGZpbGVObT4nLCAnXCJleGFtcGxlLnB1bWxcIiBUbyBvdmVycmlkZSAlZmlsZW5hbWUlIHZhcmlhYmxlJylcbiAgICAvLyBUT0RPIC0tZ3JhcGh2aXpkb3QgXCJleGVcIiBUbyBzcGVjaWZ5IGRvdCBleGVjdXRhYmxlXG4gICAgLy8gVE9ETyAtLWh0bWxzdGF0cyAgVG8gb3V0cHV0IGdlbmVyYWwgc3RhdGlzdGljcyBpbiBmaWxlIHBsYW50dW1sLXN0YXRzLmh0bWxcbiAgICAvLyBUT0RPIC1JL3BhdGgvdG8vZmlsZSAgICAgVG8gaW5jbHVkZSBmaWxlIGFzIGlmICchaW5jbHVkZSBmaWxlJyB3ZXJlIHVzZWRcbiAgICAvLyBUT0RPIC1JL3BhdGgvdG8vKi5wdW1sICAgVG8gaW5jbHVkZSBmaWxlcyB3aXRoIHBhdHRlcm5cbiAgICAvLyBUT0RPIC1sYW5ndWFnZSAgICAgICAgICAgVG8gcHJpbnQgdGhlIGxpc3Qgb2YgUGxhbnRVTUwga2V5d29yZHNcbiAgICAvLyBUT0RPIC1sb29wc3RhdHMgICAgICAgICAgVG8gY29udGludW91c2x5IHByaW50IHN0YXRpc3RpY3MgYWJvdXQgdXNhZ2VcbiAgICAvLyBUT0RPIC1tZXRhZGF0YSAgICAgICAgICAgVG8gcmV0cmlldmUgUGxhbnRVTUwgc291cmNlcyBmcm9tIFBORyBpbWFnZXNcbiAgICAub3B0aW9uKCctLW5idGhyZWFkIDxuVGhyZWFkcz4nLCAnVG8gdXNlIChOKSB0aHJlYWRzIGZvciBwcm9jZXNzaW5nLiAgVXNlIFwiYXV0b1wiIGZvciA0IHRocmVhZHMuJylcbiAgICAvLyBUT0RPIC1ub2Vycm9yICAgICAgICAgICAgVG8gc2tpcCBpbWFnZXMgd2hlbiBlcnJvciBpbiBkaWFncmFtc1xuICAgIC5vcHRpb24oJy0tbm9tZXRhZGF0YScsICdUbyBOT1QgZXhwb3J0IG1ldGFkYXRhIGluIFBORy9TVkcgZ2VuZXJhdGVkIGZpbGVzJylcbiAgICAub3B0aW9uKCctLW91dHB1dC1kaXIgPG91dERpcj4nLCAnVG8gZ2VuZXJhdGUgaW1hZ2VzIGluIHRoZSBzcGVjaWZpZWQgZGlyZWN0b3J5JylcbiAgICAvLyAub3B0aW9uKCctLW92ZXJ3cml0ZScsICdUbyBhbGxvdyB0byBvdmVyd3JpdGUgcmVhZCBvbmx5IGZpbGVzJylcbiAgICAvLyBUT0RPIC1QcHJhZ21hMT12YWx1ZSAgICAgVG8gc2V0IHByYWdtYSBhcyBpZiAnIXByYWdtYSBwcmFnbWExIHZhbHVlJyB3ZXJlIHVzZWRcbiAgICAvLyBUT0RPIC1wW2lwZV0gICAgICAgICAgICAgVG8gdXNlIHN0ZGluIGZvciBQbGFudFVNTCBzb3VyY2UgYW5kIHN0ZG91dCBmb3IgUE5HL1NWRy9FUFMgZ2VuZXJhdGlvblxuICAgIC8vIFRPRE8gLXBpY293ZWIgICAgICAgICAgICBUbyBzdGFydCBpbnRlcm5hbCBIVFRQIFNlcnZlci4gU2VlIGh0dHBzOi8vcGxhbnR1bWwuY29tL3BpY293ZWJcbiAgICAvLyBUT0RPIC1waXBlaW1hZ2VpbmRleCBOICAgVG8gZ2VuZXJhdGUgdGhlIE50aCBpbWFnZSB3aXRoIHBpcGUgb3B0aW9uXG4gICAgLy8gVE9ETyAtcHJlcHJvYyAgICAgICAgICAgIFRvIG91dHB1dCBwcmVwcm9jZXNzb3IgdGV4dCBvZiBkaWFncmFtc1xuICAgIC8vIFRPRE8gLXByaW50Zm9udHMgICAgICAgICBUbyBwcmludCBmb250cyBhdmFpbGFibGUgb24geW91ciBzeXN0ZW1cbiAgICAvLyBUT0RPIC1wcm9ncmVzcyAgICAgICAgICAgVG8gZGlzcGxheSBhIHRleHR1YWwgcHJvZ3Jlc3MgYmFyIGluIGNvbnNvbGVcbiAgICAvLyBUT0RPIC1xdWlldCAgICAgICAgICAgICAgVG8gTk9UIHByaW50IGVycm9yIG1lc3NhZ2UgaW50byB0aGUgY29uc29sZVxuICAgIC8vIFRPRE8gLXJlYWx0aW1lc3RhdHMgICAgICBUbyBnZW5lcmF0ZSBzdGF0aXN0aWNzIG9uIHRoZSBmbHkgcmF0aGVyIHRoYW4gYXQgdGhlIGVuZFxuICAgIC8vIFRPRE8gLVNwYXJhbTE9dmFsdWUgICAgICBUbyBzZXQgYSBza2luIHBhcmFtZXRlciBhcyBpZiAnc2tpbnBhcmFtIHBhcmFtMSB2YWx1ZScgd2VyZSB1c2VkXG4gICAgLy8gVE9ETyAtc3BsYXNoICAgICAgICAgICAgIFRvIGRpc3BsYXkgYSBzcGxhc2ggc2NyZWVuIHdpdGggc29tZSBwcm9ncmVzcyBiYXJcbiAgICAvLyBUT0RPIC1zdGRsaWIgICAgICAgICAgICAgVG8gcHJpbnQgc3RhbmRhcmQgbGlicmFyeSBpbmZvXG4gICAgLy8gVE9ETyAtc3ludGF4ICAgICAgICAgICAgIFRvIHJlcG9ydCBhbnkgc3ludGF4IGVycm9yIGZyb20gc3RhbmRhcmQgaW5wdXQgd2l0aG91dCBnZW5lcmF0aW5nIGltYWdlc1xuICAgIC8vIFRPRE8gLXRlc3Rkb3QgICAgICAgICAgICBUbyB0ZXN0IHRoZSBpbnN0YWxsYXRpb24gb2YgZ3JhcGh2aXpcbiAgICAvLyBUT0RPIC10aGVtZSB4eHggICAgICAgICAgVG8gdXNlIGEgc3BlY2lmaWMgdGhlbWVcbiAgICAvLyBUT0RPIC10aW1lb3V0IE4gICAgICAgICAgUHJvY2Vzc2luZyB0aW1lb3V0IGluIChOKSBzZWNvbmRzLiBEZWZhdWx0cyB0byAxNSBtaW51dGVzICg5MDAgc2Vjb25kcykuXG4gICAgLm9wdGlvbignLS10ZXBzJywgJ1RvIGdlbmVyYXRlIGltYWdlcyB1c2luZyBFUFMgZm9ybWF0JylcbiAgICAub3B0aW9uKCctLXRodG1sJywgJ1RvIGdlbmVyYXRlIEhUTUwgZmlsZSBmb3IgY2xhc3MgZGlhZ3JhbScpXG4gICAgLy8gVE9ETyAtdGxhdGV4Om5vcHJlYW1ibGUgIFRvIGdlbmVyYXRlIGltYWdlcyB1c2luZyBMYVRlWC9UaWt6IGZvcm1hdCB3aXRob3V0IHByZWFtYmxlXG4gICAgLm9wdGlvbignLS10bGF0ZXgnLCAnVG8gZ2VuZXJhdGUgaW1hZ2VzIHVzaW5nIExhVGVYL1Rpa3ogZm9ybWF0JylcbiAgICAub3B0aW9uKCctLXRwZGYnLCAnVG8gZ2VuZXJhdGUgaW1hZ2VzIHVzaW5nIFBERiBmb3JtYXQnKVxuICAgIC5vcHRpb24oJy0tdHBuZycsICdUbyBnZW5lcmF0ZSBpbWFnZXMgdXNpbmcgUE5HIGZvcm1hdCAoZGVmYXVsdCknKVxuICAgIC5vcHRpb24oJy0tdHNjeG1sJywgJ1RvIGdlbmVyYXRlIFNDWE1MIGZpbGUgZm9yIHN0YXRlIGRpYWdyYW0nKVxuICAgIC5vcHRpb24oJy0tdHN2ZycsICdUbyBnZW5lcmF0ZSBpbWFnZXMgdXNpbmcgU1ZHIGZvcm1hdCcpXG4gICAgLm9wdGlvbignLS10dHh0JywgJ1RvIGdlbmVyYXRlIGltYWdlcyB3aXRoIEFTQ0lJIGFydCcpXG4gICAgLm9wdGlvbignLS10dXR4dCcsICdUbyBnZW5lcmF0ZSBpbWFnZXMgd2l0aCBBU0NJSSBhcnQgdXNpbmcgVW5pY29kZSBjaGFyYWN0ZXJzJylcbiAgICAub3B0aW9uKCctLXR2ZHgnLCAnVG8gZ2VuZXJhdGUgaW1hZ2VzIHVzaW5nIFZEWCBmb3JtYXQnKVxuICAgIC5vcHRpb24oJy0tdHhtaScsICdUbyBnZW5lcmF0ZSBYTUkgZmlsZSBmb3IgY2xhc3MgZGlhZ3JhbScpXG4gICAgLm9wdGlvbignLS12ZXJib3NlJywgJ1RvIGhhdmUgbG9nIGluZm9ybWF0aW9uJylcbiAgICAvLyBUT0RPIC14bWxzdGF0cyAgICAgICAgICAgVG8gb3V0cHV0IGdlbmVyYWwgc3RhdGlzdGljcyBpbiBmaWxlIHBsYW50dW1sLXN0YXRzLnhtbFxuICAgIC5hY3Rpb24oYXN5bmMgKGNtZE9iaikgPT4ge1xuXG4gICAgICAgIGNvbnN0IG9wdGlvbnM6IGRvUGxhbnRVTUxPcHRpb25zID0ge1xuICAgICAgICAgICAgLy8gaW5wdXRCb2R5IGRvZXMgbm90IG1ha2Ugc2Vuc2UgZm9yIENMSVxuICAgICAgICAgICAgLy8gaW5wdXRCb2R5OiB0eXBlb2YgaW5wdXRGTiA9PT0gJ3N0cmluZydcbiAgICAgICAgICAgIC8vICAgICAgICAgPyBhd2FpdCBmc3AucmVhZEZpbGUoaW5wdXRGTiwgJ3V0Zi04JylcbiAgICAgICAgICAgIC8vICAgICAgICAgOiB1bmRlZmluZWQsXG4gICAgICAgICAgICBpbnB1dEZOczogY21kT2JqLmlucHV0RmlsZSxcbiAgICAgICAgICAgIG91dHB1dEZOOiBjbWRPYmoub3V0cHV0RmlsZVxuICAgICAgICB9O1xuXG4gICAgICAgIGlmICh0eXBlb2YgY21kT2JqLnNlcnZlciA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIG9wdGlvbnMuc2VydmVyVVJMID0gY21kT2JqLnNlcnZlcjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIGNtZE9iai5qYXIgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBvcHRpb25zLmphclBhdGggPSBjbWRPYmouamFyO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNtZE9iai5jaGFyc2V0KSB7XG4gICAgICAgICAgICBpZiAoIWlzVmFsaWRDaGFyc2V0KGNtZE9iai5jaGFyc2V0KSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgcGxhbnR1bWwgY2hhcnNldCAke3V0aWwuaW5zcGVjdChjbWRPYmouY2hhcnNldCl9IHVua25vd25gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG9wdGlvbnMuY2hhcnNldCA9IGNtZE9iai5jaGFyc2V0O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNtZE9iai5uYnRocmVhZCkge1xuICAgICAgICAgICAgaWYgKGNtZE9iai5uYnRocmVhZCAhPT0gJ2F1dG8nKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbnQgPSBOdW1iZXIucGFyc2VJbnQoY21kT2JqLm5idGhyZWFkKTtcbiAgICAgICAgICAgICAgICBpZiAoaXNOYU4obnQpIHx8IG50IDwgMCB8fCBudCA+IDE2KSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgcGxhbnR1bWwgbmJ0aHJlYWQgJHt1dGlsLmluc3BlY3QoY21kT2JqLm5idGhyZWFkKX0gaW52YWxpZGApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG9wdGlvbnMubmJ0aHJlYWQgPSBjbWRPYmoubmJ0aHJlYWQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoJ2Rhcmttb2RlJyBpbiBjbWRPYmopIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY21kT2JqLmRhcmttb2RlICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sIGludmFsaWQgZGFya21vZGUgb3B0aW9uICR7dXRpbC5pbnNwZWN0KGNtZE9iai5kYXJrbW9kZSl9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvcHRpb25zLmRhcmttb2RlID0gY21kT2JqLmRhcmttb2RlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCdkZWJ1Z3N2ZWsnIGluIGNtZE9iaikge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjbWRPYmouZGVidWdzdmVrICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sIGludmFsaWQgZGVidWdzdmVrIG9wdGlvbiAke3V0aWwuaW5zcGVjdChjbWRPYmouZGVidWdzdmVrKX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG9wdGlvbnMuZGVidWdzdmVrID0gY21kT2JqLmRlYnVnc3ZlaztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgnZmlsZW5hbWUnIGluIGNtZE9iaikge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjbWRPYmouZmlsZW5hbWUgIT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgcGxhbnR1bWwgaW52YWxpZCBmaWxlbmFtZSBvcHRpb24gJHt1dGlsLmluc3BlY3QoY21kT2JqLmZpbGVuYW1lKX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG9wdGlvbnMuZmlsZU5hbWVPdmVycmlkZSA9IGNtZE9iai5maWxlbmFtZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgnbm9tZXRhZGF0YScgaW4gY21kT2JqKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGNtZE9iai5ub21ldGFkYXRhICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sIGludmFsaWQgbm9tZXRhZGF0YSBvcHRpb24gJHt1dGlsLmluc3BlY3QoY21kT2JqLm5vbWV0YWRhdGEpfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3B0aW9ucy5ub21ldGFkYXRhID0gY21kT2JqLm5vbWV0YWRhdGE7XG4gICAgICAgIH1cblxuICAgICAgICBvcHRpb25zLm91dHB1dERpciA9IGNtZE9iai5vdXRwdXREaXI7XG5cbiAgICAgICAgaWYgKCd0ZXBzJyBpbiBjbWRPYmopIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY21kT2JqLnRlcHMgIT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgcGxhbnR1bWwgaW52YWxpZCB0ZXBzIG9wdGlvbiAke3V0aWwuaW5zcGVjdChjbWRPYmoudGVwcyl9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvcHRpb25zLnRlcHMgPSBjbWRPYmoudGVwcztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgndGh0bWwnIGluIGNtZE9iaikge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjbWRPYmoudGh0bWwgIT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgcGxhbnR1bWwgaW52YWxpZCB0aHRtbCBvcHRpb24gJHt1dGlsLmluc3BlY3QoY21kT2JqLnRodG1sKX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG9wdGlvbnMudGh0bWwgPSBjbWRPYmoudGh0bWw7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoJ3RsYXRleCcgaW4gY21kT2JqKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGNtZE9iai50bGF0ZXggIT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgcGxhbnR1bWwgaW52YWxpZCB0bGF0ZXggb3B0aW9uICR7dXRpbC5pbnNwZWN0KGNtZE9iai50bGF0ZXgpfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3B0aW9ucy50bGF0ZXggPSBjbWRPYmoudGxhdGV4O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCd0cGRmJyBpbiBjbWRPYmopIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY21kT2JqLnRwZGYgIT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgcGxhbnR1bWwgaW52YWxpZCB0cGRmIG9wdGlvbiAke3V0aWwuaW5zcGVjdChjbWRPYmoudHBkZil9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvcHRpb25zLnRwZGYgPSBjbWRPYmoudHBkZjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgndHBuZycgaW4gY21kT2JqKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGNtZE9iai50cG5nICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sIGludmFsaWQgdHBuZyBvcHRpb24gJHt1dGlsLmluc3BlY3QoY21kT2JqLnRwbmcpfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3B0aW9ucy50cG5nID0gY21kT2JqLnRwbmc7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoJ3RzY3htbCcgaW4gY21kT2JqKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGNtZE9iai50c2N4bWwgIT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgcGxhbnR1bWwgaW52YWxpZCB0c2N4bWwgb3B0aW9uICR7dXRpbC5pbnNwZWN0KGNtZE9iai50c2N4bWwpfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3B0aW9ucy50c2N4bWwgPSBjbWRPYmoudHNjeG1sO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCd0c3ZnJyBpbiBjbWRPYmopIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY21kT2JqLnRzdmcgIT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgcGxhbnR1bWwgaW52YWxpZCB0c3ZnIG9wdGlvbiAke3V0aWwuaW5zcGVjdChjbWRPYmoudHN2Zyl9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvcHRpb25zLnRzdmcgPSBjbWRPYmoudHN2ZztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgndHR4dCcgaW4gY21kT2JqKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGNtZE9iai50c3ZnICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sIGludmFsaWQgdHR4dCBvcHRpb24gJHt1dGlsLmluc3BlY3QoY21kT2JqLnR0eHQpfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3B0aW9ucy50dHh0ID0gY21kT2JqLnR0eHQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoJ3R1dHh0JyBpbiBjbWRPYmopIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY21kT2JqLnR1dHh0ICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sIGludmFsaWQgdHV0eHQgb3B0aW9uICR7dXRpbC5pbnNwZWN0KGNtZE9iai50dXR4dCl9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvcHRpb25zLnR1dHh0ID0gY21kT2JqLnR1dHh0O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCd0dmR4JyBpbiBjbWRPYmopIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY21kT2JqLnR2ZHggIT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgcGxhbnR1bWwgaW52YWxpZCB0dmR4IG9wdGlvbiAke3V0aWwuaW5zcGVjdChjbWRPYmoudHZkeCl9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvcHRpb25zLnR2ZHggPSBjbWRPYmoudHZkeDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgndHhtaScgaW4gY21kT2JqKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGNtZE9iai50eG1pICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sIGludmFsaWQgdHhtaSBvcHRpb24gJHt1dGlsLmluc3BlY3QoY21kT2JqLnR4bWkpfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3B0aW9ucy50eG1pID0gY21kT2JqLnR4bWk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoJ3ZlcmJvc2UnIGluIGNtZE9iaikge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjbWRPYmoudmVyYm9zZSAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBwbGFudHVtbCBpbnZhbGlkIHZlcmJvc2Ugb3B0aW9uICR7dXRpbC5pbnNwZWN0KGNtZE9iai52ZXJib3NlKX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG9wdGlvbnMudmVyYm9zZSA9IGNtZE9iai52ZXJib3NlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW4gdGhlIHNpbmdsZS1pbnB1dCBtb2Rlcywgd2hlbiBubyAtLW91dHB1dC1maWxlIGlzXG4gICAgICAgIC8vIGdpdmVuIHRoZSByZW5kZXJlZCBvdXRwdXQgaXMgcmV0dXJuZWQgYXMgYSBCdWZmZXIsXG4gICAgICAgIC8vIHdoaWNoIGlzIHdyaXR0ZW4gdG8gc3Rkb3V0LlxuICAgICAgICBjb25zdCBidWYgPSBhd2FpdCBkb1BsYW50VU1MKG9wdGlvbnMpO1xuICAgICAgICBpZiAoYnVmKSB7XG4gICAgICAgICAgICBwcm9jZXNzLnN0ZG91dC53cml0ZShidWYpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbi8vIFRoZSBlZGl0aW9ucyBvZiB0aGUgUGxhbnRVTUwgSkFSIHB1Ymxpc2hlZCBvbiB0aGVcbi8vIFBsYW50VU1MIHJlbGVhc2UgcGFnZSwgYW5kIHRoZSBmaWxlIG5hbWUgcGF0dGVyblxuLy8gdXNlZCBmb3IgZWFjaCBlZGl0aW9uLlxuY29uc3QgcGxhbnR1bWxFZGl0aW9ucyA9IFtcbiAgICAnZ3BsJywgJ21pdCcsICdsZ3BsJywgJ2FzbCcsICdlcGwnLCAnYnNkJ1xuXTtcblxuZnVuY3Rpb24gcGxhbnR1bWxKYXJOYW1lKGVkaXRpb246IHN0cmluZywgdmVyc2lvbjogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGVkaXRpb24gPT09ICdncGwnXG4gICAgICAgID8gYHBsYW50dW1sLSR7dmVyc2lvbn0uamFyYFxuICAgICAgICA6IGBwbGFudHVtbC0ke2VkaXRpb259LSR7dmVyc2lvbn0uamFyYDtcbn1cblxucHJvZ3JhbVxuICAgIC5jb21tYW5kKCdwbGFudHVtbC1kb3dubG9hZCcpXG4gICAgLmRlc2NyaXB0aW9uKCdEb3dubG9hZCB0aGUgUGxhbnRVTUwgSkFSIGZpbGUgZm9yIHVzZSB3aXRoIHRoZSBQTEFOVFVNTF9KQVIgZW52aXJvbm1lbnQgdmFyaWFibGUnKVxuICAgIC5vcHRpb24oJy0tcGxhbnR1bWwtdmVyc2lvbiA8dmVyc2lvbj4nLCAnUGxhbnRVTUwgdmVyc2lvbiwgc3VjaCBhcyAxLjIwMjUuMC4gIERlZmF1bHQ6IHRoZSBsYXRlc3QgcmVsZWFzZS4nKVxuICAgIC5vcHRpb24oJy0tZWRpdGlvbiA8ZWRpdGlvbj4nLCBgSkFSIGVkaXRpb246ICR7cGxhbnR1bWxFZGl0aW9ucy5qb2luKCcsICcpfWAsICdtaXQnKVxuICAgIC5vcHRpb24oJy0tb3V0cHV0LWRpciA8b3V0RGlyPicsICdEaXJlY3RvcnkgaW50byB3aGljaCB0aGUgSkFSIGlzIGRvd25sb2FkZWQnLCAnLicpXG4gICAgLmFjdGlvbihhc3luYyAoY21kT2JqKSA9PiB7XG5cbiAgICAgICAgY29uc3QgZWRpdGlvbiA9IGNtZE9iai5lZGl0aW9uO1xuICAgICAgICBpZiAoIXBsYW50dW1sRWRpdGlvbnMuaW5jbHVkZXMoZWRpdGlvbikpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgcGxhbnR1bWwtZG93bmxvYWQ6IHVua25vd24gZWRpdGlvbiAke3V0aWwuaW5zcGVjdChlZGl0aW9uKX0gLSB1c2Ugb25lIG9mICR7cGxhbnR1bWxFZGl0aW9ucy5qb2luKCcsICcpfWApO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IHZlcnNpb24gPSBjbWRPYmoucGxhbnR1bWxWZXJzaW9uO1xuICAgICAgICBpZiAodHlwZW9mIHZlcnNpb24gIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBjb25zdCByZXMgPSBhd2FpdCBmZXRjaChcbiAgICAgICAgICAgICAgICAnaHR0cHM6Ly9hcGkuZ2l0aHViLmNvbS9yZXBvcy9wbGFudHVtbC9wbGFudHVtbC9yZWxlYXNlcy9sYXRlc3QnKTtcbiAgICAgICAgICAgIGlmICghcmVzLm9rKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBwbGFudHVtbC1kb3dubG9hZDogY291bGQgbm90IGRldGVybWluZSB0aGUgbGF0ZXN0IFBsYW50VU1MIHJlbGVhc2UgKCR7cmVzLnN0YXR1c30gJHtyZXMuc3RhdHVzVGV4dH0pIC0gc3BlY2lmeSBvbmUgd2l0aCAtLXBsYW50dW1sLXZlcnNpb25gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHJlbGVhc2UgPSBhd2FpdCByZXMuanNvbigpIGFzIHsgdGFnX25hbWU6IHN0cmluZyB9O1xuICAgICAgICAgICAgdmVyc2lvbiA9IHJlbGVhc2UudGFnX25hbWUucmVwbGFjZSgvXnYvLCAnJyk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBqYXJOYW1lID0gcGxhbnR1bWxKYXJOYW1lKGVkaXRpb24sIHZlcnNpb24pO1xuICAgICAgICBjb25zdCB1cmwgPSBgaHR0cHM6Ly9naXRodWIuY29tL3BsYW50dW1sL3BsYW50dW1sL3JlbGVhc2VzL2Rvd25sb2FkL3Yke3ZlcnNpb259LyR7amFyTmFtZX1gO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKGBEb3dubG9hZGluZyAke3VybH1gKTtcbiAgICAgICAgY29uc3QgcmVzID0gYXdhaXQgZmV0Y2godXJsKTtcbiAgICAgICAgaWYgKCFyZXMub2spIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgcGxhbnR1bWwtZG93bmxvYWQ6IGRvd25sb2FkIG9mICR7dXJsfSBmYWlsZWQgKCR7cmVzLnN0YXR1c30gJHtyZXMuc3RhdHVzVGV4dH0pYCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgamFyUGF0aCA9IHBhdGguam9pbihjbWRPYmoub3V0cHV0RGlyLCBqYXJOYW1lKTtcbiAgICAgICAgYXdhaXQgZnNwLm1rZGlyKGNtZE9iai5vdXRwdXREaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgICBhd2FpdCBmc3Aud3JpdGVGaWxlKGphclBhdGgsXG4gICAgICAgICAgICBCdWZmZXIuZnJvbShhd2FpdCByZXMuYXJyYXlCdWZmZXIoKSkpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKGBEb3dubG9hZGVkICR7amFyUGF0aH1cblxuVG8gdXNlIHRoaXMgSkFSIGZvciBQbGFudFVNTCByZW5kZXJpbmcsIHNldCB0aGUgZW52aXJvbm1lbnQgdmFyaWFibGU6XG5cbiAgICBleHBvcnQgUExBTlRVTUxfSkFSPSR7cGF0aC5yZXNvbHZlKGphclBhdGgpfVxuXG5SZW5kZXJpbmcgd2l0aCB0aGUgSkFSIHJlcXVpcmVzIEphdmEgdG8gYmUgaW5zdGFsbGVkIGFuZCBpbiB5b3VyIFBBVEguYCk7XG4gICAgfSk7XG5cbnByb2dyYW1cbiAgICAuY29tbWFuZCgncGludG9yYScpXG4gICAgLmRlc2NyaXB0aW9uKCdSZW5kZXIgUGludG9yYSBmaWxlcycpXG4gICAgLm9wdGlvbignLS1pbnB1dC1maWxlIDxpbnB1dEZOPicsICdQYXRoIGZvciBkb2N1bWVudCB0byByZW5kZXInKVxuICAgIC5vcHRpb24oJy0tb3V0cHV0LWZpbGUgPG91dHB1dEZOPicsICdQYXRoIGZvciByZW5kZXJlZCBkb2N1bWVudCcpXG4gICAgLm9wdGlvbignLS1waXhlbC1yYXRpbyA8cmF0aW8+JywgJycpXG4gICAgLm9wdGlvbignLS1taW1lLXR5cGUgPG10PicsICdNSU1FIHR5cGUgZm9yIG91dHB1dCBmaWxlJylcbiAgICAub3B0aW9uKCctLWJnLWNvbG9yIDxjb2xvcj4nLCAnU3RyaW5nIGRlc2NyaWJpbmcgYmFja2dyb3VuZCBjb2xvcicpXG4gICAgLm9wdGlvbignLS13aWR0aCA8bnVtYmVyPicsICdXaWR0aCBvZiB0aGUgb3V0cHV0LCBoZWlnaHQgd2lsbCBiZSBjYWxjdWxhdGVkIGFjY29yZGluZyB0byB0aGUgZGlhZ3JhbSBjb250ZW50IHJhdGlvJylcbiAgICAuYWN0aW9uKGFzeW5jIChjbWRPYmopID0+IHtcbiAgICAgICAgY29uc3Qgb3B0czogUGludG9yYVJlbmRlck9wdGlvbnMgPSB7XG4gICAgICAgICAgICBjb2RlOiAnJyxcbiAgICAgICAgICAgIG91dHB1dEZOOiAnJ1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmICh0eXBlb2YgY21kT2JqLmlucHV0RmlsZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIG9wdHMuY29kZSA9IGF3YWl0IGZzcC5yZWFkRmlsZShjbWRPYmouaW5wdXRGaWxlLCAndXRmLTgnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTm8gaW5wdXQgZmlsZSBzcGVjaWZpZWQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgY21kT2JqLm91dHB1dEZpbGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBvcHRzLm91dHB1dEZOID0gY21kT2JqLm91dHB1dEZpbGU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIG91dHB1dCBmaWxlIHNwZWNpZmllZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBjbWRPYmoucGl4ZWxSYXRpbyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIG9wdHMuZGV2aWNlUGl4ZWxSYXRpbyA9IE51bWJlci5wYXJzZUZsb2F0KGNtZE9iai5waXhlbFJhdGlvKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIG9wdHMuZGV2aWNlUGl4ZWxSYXRpbyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAgICAgICYmIGlzTmFOKG9wdHMuZGV2aWNlUGl4ZWxSYXRpbykpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBkZXZpY2UgcGl4ZWwgcmF0aW8gJHt1dGlsLmluc3BlY3QoY21kT2JqLnBpeGVsUmF0aW8pfWApO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBjbWRPYmoubWltZVR5cGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgY21kT2JqLm1pbWVUeXBlID09PSAnaW1hZ2Uvc3ZnK3htbCdcbiAgICAgICAgICAgICB8fCBjbWRPYmoubWltZVR5cGUgPT09ICdpbWFnZS9qcGVnJ1xuICAgICAgICAgICAgIHx8IGNtZE9iai5taW1lVHlwZSA9PT0gJ2ltYWdlL3BuZydcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgIG9wdHMubWltZVR5cGUgPSBjbWRPYmoubWltZVR5cGU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBNSU1FIHR5cGUgJHt1dGlsLmluc3BlY3QoY21kT2JqLm1pbWVUeXBlKX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgY21kT2JqLmJnQ29sb3IgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBvcHRzLmJhY2tncm91bmRDb2xvciA9IGNtZE9iai5iZ0NvbG9yO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBjbWRPYmoud2lkdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBvcHRzLndpZHRoID0gTnVtYmVyLnBhcnNlRmxvYXQoY21kT2JqLndpZHRoKTtcbiAgICAgICAgICAgIGlmIChpc05hTihvcHRzLndpZHRoKSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgZGlhZ3JhbXMtcGludG9yYTogd2lkdGggaXMgbm90IGEgbnVtYmVyICR7Y21kT2JqLndpZHRofWApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgb3B0cy5yZW5kZXJJblN1YnByb2Nlc3MgPSBmYWxzZTtcblxuICAgICAgICBhd2FpdCBkb1BpbnRvcmEob3B0cyk7XG4gICAgfSk7XG5cblxucHJvZ3JhbVxuICAgIC5jb21tYW5kKCdtZXJtYWlkJylcbiAgICAuZGVzY3JpcHRpb24oJ1JlbmRlciBNZXJtYWlkIGZpbGVzIHRvIFNWRycpXG4gICAgLm9wdGlvbignLS1pbnB1dC1maWxlIDxpbnB1dEZOPicsICdQYXRoIGZvciBkb2N1bWVudCB0byByZW5kZXInKVxuICAgIC5vcHRpb24oJy0tb3V0cHV0LWZpbGUgPG91dHB1dEZOPicsICdQYXRoIGZvciByZW5kZXJlZCBTVkcgZG9jdW1lbnQnKVxuICAgIC5vcHRpb24oJy0tY29uZmlnIDxjb25maWdGTj4nLCAnUGF0aCBmb3IgYSBKU09OIGNvbmZpZyBmaWxlICh0aGVtZSwgdGhlbWVWYXJpYWJsZXMsIGZsb3djaGFydCwgLi4uKScpXG4gICAgLm9wdGlvbignLS10aGVtZSA8dGhlbWU+JywgJ1RoZW1lIHByZXNldDogZGVmYXVsdCwgZGFyaywgZm9yZXN0LCBuZXV0cmFsLCBvciBtb2Rlcm4nKVxuICAgIC5vcHRpb24oJy0tZm9udCA8Zm9udEZOLi4uPicsICdUVEYvT1RGIGZvbnQgZmlsZShzKSB0byByZWdpc3RlciBmb3IgdGV4dCBtZWFzdXJlbWVudCcpXG4gICAgLmFjdGlvbihhc3luYyAoY21kT2JqKSA9PiB7XG4gICAgICAgIGNvbnN0IG9wdHM6IE1lcm1haWRSZW5kZXJPcHRpb25zID0ge1xuICAgICAgICAgICAgY29kZTogJycsXG4gICAgICAgICAgICBvdXRwdXRGTjogJydcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAodHlwZW9mIGNtZE9iai5pbnB1dEZpbGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBvcHRzLmNvZGUgPSBhd2FpdCBmc3AucmVhZEZpbGUoY21kT2JqLmlucHV0RmlsZSwgJ3V0Zi04Jyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIGlucHV0IGZpbGUgc3BlY2lmaWVkJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGNtZE9iai5vdXRwdXRGaWxlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgb3B0cy5vdXRwdXRGTiA9IGNtZE9iai5vdXRwdXRGaWxlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdObyBvdXRwdXQgZmlsZSBzcGVjaWZpZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIW9wdHMub3V0cHV0Rk4uZW5kc1dpdGgoJy5zdmcnKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBtZXJtYWlkIG91dHB1dC1maWxlIG11c3QgaGF2ZSAuc3ZnIGV4dGVuc2lvbiAke3V0aWwuaW5zcGVjdChvcHRzLm91dHB1dEZOKX1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgY21kT2JqLmNvbmZpZyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIG9wdHMuY29uZmlnSlNPTiA9IGF3YWl0IGZzcC5yZWFkRmlsZShjbWRPYmouY29uZmlnLCAndXRmLTgnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgY21kT2JqLnRoZW1lID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgb3B0cy50aGVtZVByZXNldCA9IGNtZE9iai50aGVtZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGNtZE9iai5mb250KSkge1xuICAgICAgICAgICAgb3B0cy5mb250Rk5zID0gY21kT2JqLmZvbnQ7XG4gICAgICAgIH1cblxuICAgICAgICBhd2FpdCBkb01lcm1haWQob3B0cyk7XG4gICAgfSk7XG5cbnByb2dyYW1cbiAgICAuY29tbWFuZCgna2F0ZXgnKVxuICAgIC5kZXNjcmlwdGlvbignUmVuZGVyIFRlWCBtYXRoIGZpbGVzIHRvIEthVGVYIEhUTUwgbWFya3VwJylcbiAgICAub3B0aW9uKCctLWlucHV0LWZpbGUgPGlucHV0Rk4+JywgJ1BhdGggZm9yIGRvY3VtZW50IHRvIHJlbmRlcicpXG4gICAgLm9wdGlvbignLS1vdXRwdXQtZmlsZSA8b3V0cHV0Rk4+JywgJ1BhdGggZm9yIHJlbmRlcmVkIEhUTUwgZnJhZ21lbnQnKVxuICAgIC5vcHRpb24oJy0taW5saW5lJywgJ1JlbmRlciBpbiBpbmxpbmUgbW9kZSByYXRoZXIgdGhhbiBkaXNwbGF5IChibG9jaykgbW9kZScpXG4gICAgLm9wdGlvbignLS1mb3JtYXQgPGZvcm1hdD4nLCAnTWFya3VwIHRvIGVtaXQ6IGh0bWwsIG1hdGhtbCwgb3IgaHRtbEFuZE1hdGhtbCcpXG4gICAgLm9wdGlvbignLS1tYWNyb3MgPG1hY3Jvc0ZOPicsICdQYXRoIGZvciBhIEpTT04gZmlsZSBkZWZpbmluZyBjdXN0b20gbWFjcm9zJylcbiAgICAuYWN0aW9uKGFzeW5jIChjbWRPYmopID0+IHtcbiAgICAgICAgY29uc3Qgb3B0czogS2FUZVhSZW5kZXJPcHRpb25zID0ge1xuICAgICAgICAgICAgY29kZTogJycsXG4gICAgICAgICAgICBvdXRwdXRGTjogJydcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAodHlwZW9mIGNtZE9iai5pbnB1dEZpbGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBvcHRzLmNvZGUgPSBhd2FpdCBmc3AucmVhZEZpbGUoY21kT2JqLmlucHV0RmlsZSwgJ3V0Zi04Jyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIGlucHV0IGZpbGUgc3BlY2lmaWVkJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoJ2lubGluZScgaW4gY21kT2JqKSB7XG4gICAgICAgICAgICBvcHRzLmRpc3BsYXlNb2RlID0gIWNtZE9iai5pbmxpbmU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGNtZE9iai5mb3JtYXQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgY21kT2JqLmZvcm1hdCA9PT0gJ2h0bWwnXG4gICAgICAgICAgICAgfHwgY21kT2JqLmZvcm1hdCA9PT0gJ21hdGhtbCdcbiAgICAgICAgICAgICB8fCBjbWRPYmouZm9ybWF0ID09PSAnaHRtbEFuZE1hdGhtbCdcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgIG9wdHMub3V0cHV0ID0gY21kT2JqLmZvcm1hdDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGZvcm1hdCAke3V0aWwuaW5zcGVjdChjbWRPYmouZm9ybWF0KX0gLSB1c2UgaHRtbCwgbWF0aG1sLCBvciBodG1sQW5kTWF0aG1sYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGNtZE9iai5tYWNyb3MgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBvcHRzLm1hY3JvcyA9IEpTT04ucGFyc2UoXG4gICAgICAgICAgICAgICAgYXdhaXQgZnNwLnJlYWRGaWxlKGNtZE9iai5tYWNyb3MsICd1dGYtOCcpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFdoZW4gbm8gLS1vdXRwdXQtZmlsZSBpcyBnaXZlbiB0aGUgcmVuZGVyZWQgbWFya3VwXG4gICAgICAgIC8vIGlzIHdyaXR0ZW4gdG8gc3Rkb3V0LCBzbyB0aGUgY29tbWFuZCBjYW4gYmUgdXNlZCBpblxuICAgICAgICAvLyBhIHBpcGVsaW5lLlxuICAgICAgICBpZiAodHlwZW9mIGNtZE9iai5vdXRwdXRGaWxlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgb3B0cy5vdXRwdXRGTiA9IGNtZE9iai5vdXRwdXRGaWxlO1xuICAgICAgICAgICAgYXdhaXQgZG9LYVRlWChvcHRzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlKHJlbmRlckthVGVYSHRtbChvcHRzLmNvZGUsIG9wdHMpKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG5wcm9ncmFtLnBhcnNlKCk7XG4iXX0=