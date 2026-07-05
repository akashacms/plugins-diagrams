#! /usr/bin/env node
const __dirname = import.meta.dirname;
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import util from 'node:util';
// import packageConfig from '../package.json' with { type: 'json' }; 
import { doPlantUML, isValidCharset, doPintora, doMermaid } from './index.js';
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
    await doPlantUML(options);
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
program.parse();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vbGliL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBRUEsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUM7QUFFdEMsT0FBTyxFQUFFLFFBQVEsSUFBSSxHQUFHLEVBQWEsTUFBTSxTQUFTLENBQUM7QUFDckQsT0FBTyxJQUFlLE1BQU0sV0FBVyxDQUFDO0FBQ3hDLE9BQU8sSUFBSSxNQUFNLFdBQVcsQ0FBQztBQUU3QixzRUFBc0U7QUFFdEUsT0FBTyxFQUFxQixVQUFVLEVBQUUsY0FBYyxFQUF3QixTQUFTLEVBQXdCLFNBQVMsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUU3SSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBQ3BDLE1BQU0sT0FBTyxHQUFHLElBQUksT0FBTyxFQUFFLENBQUM7QUFFOUIsMERBQTBEO0FBQzFELGVBQWU7QUFDZixhQUFhO0FBRWIsb0NBQW9DO0FBQ3BDLFVBQVU7QUFDVixzQ0FBc0M7QUFDdEMseURBQXlEO0FBRXpELE9BQU87S0FDRixPQUFPLENBQUMsVUFBVSxDQUFDO0tBQ25CLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBQztLQUNwQyxNQUFNLENBQUMsMkJBQTJCLEVBQUUsNkJBQTZCLENBQUM7S0FDbEUsTUFBTSxDQUFDLDBCQUEwQixFQUFFLDRCQUE0QixDQUFDO0tBQ2hFLE1BQU0sQ0FBQyxzQkFBc0IsRUFBRSwyREFBMkQsQ0FBQztLQUMzRixNQUFNLENBQUMsaUJBQWlCLEVBQUUsdURBQXVELENBQUM7S0FDbEYsTUFBTSxDQUFDLHFCQUFxQixFQUFFLGlEQUFpRCxDQUFDO0lBQ2pGLHdFQUF3RTtJQUN4RSx1REFBdUQ7S0FDdEQsTUFBTSxDQUFDLFlBQVksRUFBRSwrQkFBK0IsQ0FBQztLQUNyRCxNQUFNLENBQUMsYUFBYSxFQUFFLHFDQUFxQyxDQUFDO0lBQzdELGtFQUFrRTtJQUNsRSw4QkFB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QUFDO0lBRUQsSUFBSSxPQUFPLE1BQU0sQ0FBQyxNQUFNLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDcEMsSUFBSSxDQUFDLFVBQVUsR0FBRyxNQUFNLEdBQUcsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNqRSxDQUFDO0lBRUQsSUFBSSxPQUFPLE1BQU0sQ0FBQyxLQUFLLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDbkMsSUFBSSxDQUFDLFdBQVcsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDO0lBQ3BDLENBQUM7SUFFRCxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7UUFDN0IsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDO0lBQy9CLENBQUM7SUFFRCxNQUFNLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMxQixDQUFDLENBQUMsQ0FBQztBQUVQLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIiMhIC91c3IvYmluL2VudiBub2RlXG5cbmNvbnN0IF9fZGlybmFtZSA9IGltcG9ydC5tZXRhLmRpcm5hbWU7XG5cbmltcG9ydCB7IHByb21pc2VzIGFzIGZzcCwgY29uc3RhbnRzIH0gZnJvbSAnbm9kZTpmcyc7XG5pbXBvcnQgcGF0aCwgeyBwYXJzZSB9IGZyb20gJ25vZGU6cGF0aCc7XG5pbXBvcnQgdXRpbCBmcm9tICdub2RlOnV0aWwnO1xuXG4vLyBpbXBvcnQgcGFja2FnZUNvbmZpZyBmcm9tICcuLi9wYWNrYWdlLmpzb24nIHdpdGggeyB0eXBlOiAnanNvbicgfTsgXG5cbmltcG9ydCB7IGRvUGxhbnRVTUxPcHRpb25zLCBkb1BsYW50VU1MLCBpc1ZhbGlkQ2hhcnNldCwgUGludG9yYVJlbmRlck9wdGlvbnMsIGRvUGludG9yYSwgTWVybWFpZFJlbmRlck9wdGlvbnMsIGRvTWVybWFpZCB9IGZyb20gJy4vaW5kZXguanMnO1xuXG5pbXBvcnQgeyBDb21tYW5kIH0gZnJvbSAnY29tbWFuZGVyJztcbmNvbnN0IHByb2dyYW0gPSBuZXcgQ29tbWFuZCgpO1xuXG4vLyBQUk9HIHBsYW50dW1sIC0taW5wdXQgLi4gLS1vdXRwdXQgLi4gLS1vdGhlci1vcHRpb25zIC4uXG4vLyBQUk9HIG1lcm1haWRcbi8vIFBST0cga2F0ZXhcblxuLy8gcHJvZ3JhbS5uYW1lKHBhY2thZ2VDb25maWcubmFtZSk7XG4vLyBwcm9ncmFtXG4vLyAgICAgLnZlcnNpb24ocGFja2FnZUNvbmZpZy52ZXJzaW9uLFxuLy8gICAgICAgICAnLXYsIC0tdmVyc2lvbicsICdvdXRwdXQgdGhlIGN1cnJlbnQgdmVyc2lvbicpXG5cbnByb2dyYW1cbiAgICAuY29tbWFuZCgncGxhbnR1bWwnKVxuICAgIC5kZXNjcmlwdGlvbignUmVuZGVyIFBsYW50VU1MIGZpbGVzJylcbiAgICAub3B0aW9uKCctLWlucHV0LWZpbGUgPGlucHV0Rk4uLi4+JywgJ1BhdGggZm9yIGRvY3VtZW50IHRvIHJlbmRlcicpXG4gICAgLm9wdGlvbignLS1vdXRwdXQtZmlsZSA8b3V0cHV0Rk4+JywgJ1BhdGggZm9yIHJlbmRlcmVkIGRvY3VtZW50JylcbiAgICAub3B0aW9uKCctLXNlcnZlciA8c2VydmVyVVJMPicsICdVUkwgZm9yIGEgUGxhbnRVTUwgc2VydmVyLiBPdmVycmlkZXMgUExBTlRVTUxfU0VSVkVSX1VSTC4nKVxuICAgIC5vcHRpb24oJy0tamFyIDxqYXJQYXRoPicsICdQYXRoIGZvciBhIHBsYW50dW1sLmphciBmaWxlLiBPdmVycmlkZXMgUExBTlRVTUxfSkFSLicpXG4gICAgLm9wdGlvbignLS1jaGFyc2V0IDxjaGFyc2V0PicsICdUbyB1c2UgYSBzcGVjaWZpYyBjaGFyYWN0ZXIgc2V0LiBEZWZhdWx0OiBVVEYtOCcpXG4gICAgLy8gVE9ETyAtLWNoZWNrbWV0YWRhdGEgU2tpcCBQTkcgZmlsZXMgdGhhdCBkb24ndCBuZWVkIHRvIGJlIHJlZ2VuZXJhdGVkXG4gICAgLy8gVE9ETyAtRHZhcj12YWx1ZSBzaG91bGQgYmUgLS1kZWZpbmUgPGRlZlZhclZhbHVlLi4uPlxuICAgIC5vcHRpb24oJy0tZGFya21vZGUnLCAnVG8gdXNlIGRhcmsgbW9kZSBmb3IgZGlhZ3JhbXMnKVxuICAgIC5vcHRpb24oJy0tZGVidWdzdmVrJywgJ1RvIGdlbmVyYXRlIGludGVybWVkaWF0ZSBzdmVrIGZpbGVzJylcbiAgICAvLyBUT0RPIC0tZXhjbHVkZSBwYXR0ZXJuIGFib3V0IGV4Y2x1ZGluZyBmaWxlcyBmcm9tIGNvbnNpZGVyYXRpb25cbiAgICAvLyAgICAgICAgICBiYXNlZCBvbiBhIHBhdHRlcm5cbiAgICAvLyBUT0RPIC0tZGlzYWJsZXN0YXRzIFRvIGRpc2FibGUgc3RhdGlzdGljcyBjb21wdXRhdGlvbiAoZGVmYXVsdClcbiAgICAvLyBUT0RPIC0tZW5hYmxlc3RhdHMgVG8gZW5hYmxlIHN0YXRpc3RpY3MgY29tcHV0YXRpb25cbiAgICAvLyBUT0RPIC0tZW5jb2Rlc3ByaXRlIDR8OHwxNiBcImZpbGVcIiAgVG8gZW5jb2RlIGEgc3ByaXRlIGF0IGEgZ3JheSBsZXZlbCBmcm9tIGFuIGltYWdlXG4gICAgLy8gVE9ETyAtLWZhaWxmYXN0IFRvIHN0b3AgcHJvY2Vzc2luZyBhcyBzb29uIGFzIGEgc3ludGF4IGVycm9yIGluIGRpYWdyYW0gb2NjdXJzXG4gICAgLy8gVE9ETyAtLWZhaWxmYXN0MiBUbyBkbyBhIGZpcnN0IHN5bnRheCBjaGVjayBiZWZvcmUgcHJvY2Vzc2luZyBmaWxlcywgdG8gZmFpbCBldmVuIGZhc3RlclxuICAgIC8vIFRPRE8gLS1maWxlZGlyIDxkaXJObT4gVG8gYmVoYXZlIGFzIGlmIFBsYW50VU1MIGlzIGluIHRoaXMgZGlyXG4gICAgLm9wdGlvbignLS1maWxlbmFtZSA8ZmlsZU5tPicsICdcImV4YW1wbGUucHVtbFwiIFRvIG92ZXJyaWRlICVmaWxlbmFtZSUgdmFyaWFibGUnKVxuICAgIC8vIFRPRE8gLS1ncmFwaHZpemRvdCBcImV4ZVwiIFRvIHNwZWNpZnkgZG90IGV4ZWN1dGFibGVcbiAgICAvLyBUT0RPIC0taHRtbHN0YXRzICBUbyBvdXRwdXQgZ2VuZXJhbCBzdGF0aXN0aWNzIGluIGZpbGUgcGxhbnR1bWwtc3RhdHMuaHRtbFxuICAgIC8vIFRPRE8gLUkvcGF0aC90by9maWxlICAgICBUbyBpbmNsdWRlIGZpbGUgYXMgaWYgJyFpbmNsdWRlIGZpbGUnIHdlcmUgdXNlZFxuICAgIC8vIFRPRE8gLUkvcGF0aC90by8qLnB1bWwgICBUbyBpbmNsdWRlIGZpbGVzIHdpdGggcGF0dGVyblxuICAgIC8vIFRPRE8gLWxhbmd1YWdlICAgICAgICAgICBUbyBwcmludCB0aGUgbGlzdCBvZiBQbGFudFVNTCBrZXl3b3Jkc1xuICAgIC8vIFRPRE8gLWxvb3BzdGF0cyAgICAgICAgICBUbyBjb250aW51b3VzbHkgcHJpbnQgc3RhdGlzdGljcyBhYm91dCB1c2FnZVxuICAgIC8vIFRPRE8gLW1ldGFkYXRhICAgICAgICAgICBUbyByZXRyaWV2ZSBQbGFudFVNTCBzb3VyY2VzIGZyb20gUE5HIGltYWdlc1xuICAgIC5vcHRpb24oJy0tbmJ0aHJlYWQgPG5UaHJlYWRzPicsICdUbyB1c2UgKE4pIHRocmVhZHMgZm9yIHByb2Nlc3NpbmcuICBVc2UgXCJhdXRvXCIgZm9yIDQgdGhyZWFkcy4nKVxuICAgIC8vIFRPRE8gLW5vZXJyb3IgICAgICAgICAgICBUbyBza2lwIGltYWdlcyB3aGVuIGVycm9yIGluIGRpYWdyYW1zXG4gICAgLm9wdGlvbignLS1ub21ldGFkYXRhJywgJ1RvIE5PVCBleHBvcnQgbWV0YWRhdGEgaW4gUE5HL1NWRyBnZW5lcmF0ZWQgZmlsZXMnKVxuICAgIC5vcHRpb24oJy0tb3V0cHV0LWRpciA8b3V0RGlyPicsICdUbyBnZW5lcmF0ZSBpbWFnZXMgaW4gdGhlIHNwZWNpZmllZCBkaXJlY3RvcnknKVxuICAgIC8vIC5vcHRpb24oJy0tb3ZlcndyaXRlJywgJ1RvIGFsbG93IHRvIG92ZXJ3cml0ZSByZWFkIG9ubHkgZmlsZXMnKVxuICAgIC8vIFRPRE8gLVBwcmFnbWExPXZhbHVlICAgICBUbyBzZXQgcHJhZ21hIGFzIGlmICchcHJhZ21hIHByYWdtYTEgdmFsdWUnIHdlcmUgdXNlZFxuICAgIC8vIFRPRE8gLXBbaXBlXSAgICAgICAgICAgICBUbyB1c2Ugc3RkaW4gZm9yIFBsYW50VU1MIHNvdXJjZSBhbmQgc3Rkb3V0IGZvciBQTkcvU1ZHL0VQUyBnZW5lcmF0aW9uXG4gICAgLy8gVE9ETyAtcGljb3dlYiAgICAgICAgICAgIFRvIHN0YXJ0IGludGVybmFsIEhUVFAgU2VydmVyLiBTZWUgaHR0cHM6Ly9wbGFudHVtbC5jb20vcGljb3dlYlxuICAgIC8vIFRPRE8gLXBpcGVpbWFnZWluZGV4IE4gICBUbyBnZW5lcmF0ZSB0aGUgTnRoIGltYWdlIHdpdGggcGlwZSBvcHRpb25cbiAgICAvLyBUT0RPIC1wcmVwcm9jICAgICAgICAgICAgVG8gb3V0cHV0IHByZXByb2Nlc3NvciB0ZXh0IG9mIGRpYWdyYW1zXG4gICAgLy8gVE9ETyAtcHJpbnRmb250cyAgICAgICAgIFRvIHByaW50IGZvbnRzIGF2YWlsYWJsZSBvbiB5b3VyIHN5c3RlbVxuICAgIC8vIFRPRE8gLXByb2dyZXNzICAgICAgICAgICBUbyBkaXNwbGF5IGEgdGV4dHVhbCBwcm9ncmVzcyBiYXIgaW4gY29uc29sZVxuICAgIC8vIFRPRE8gLXF1aWV0ICAgICAgICAgICAgICBUbyBOT1QgcHJpbnQgZXJyb3IgbWVzc2FnZSBpbnRvIHRoZSBjb25zb2xlXG4gICAgLy8gVE9ETyAtcmVhbHRpbWVzdGF0cyAgICAgIFRvIGdlbmVyYXRlIHN0YXRpc3RpY3Mgb24gdGhlIGZseSByYXRoZXIgdGhhbiBhdCB0aGUgZW5kXG4gICAgLy8gVE9ETyAtU3BhcmFtMT12YWx1ZSAgICAgIFRvIHNldCBhIHNraW4gcGFyYW1ldGVyIGFzIGlmICdza2lucGFyYW0gcGFyYW0xIHZhbHVlJyB3ZXJlIHVzZWRcbiAgICAvLyBUT0RPIC1zcGxhc2ggICAgICAgICAgICAgVG8gZGlzcGxheSBhIHNwbGFzaCBzY3JlZW4gd2l0aCBzb21lIHByb2dyZXNzIGJhclxuICAgIC8vIFRPRE8gLXN0ZGxpYiAgICAgICAgICAgICBUbyBwcmludCBzdGFuZGFyZCBsaWJyYXJ5IGluZm9cbiAgICAvLyBUT0RPIC1zeW50YXggICAgICAgICAgICAgVG8gcmVwb3J0IGFueSBzeW50YXggZXJyb3IgZnJvbSBzdGFuZGFyZCBpbnB1dCB3aXRob3V0IGdlbmVyYXRpbmcgaW1hZ2VzXG4gICAgLy8gVE9ETyAtdGVzdGRvdCAgICAgICAgICAgIFRvIHRlc3QgdGhlIGluc3RhbGxhdGlvbiBvZiBncmFwaHZpelxuICAgIC8vIFRPRE8gLXRoZW1lIHh4eCAgICAgICAgICBUbyB1c2UgYSBzcGVjaWZpYyB0aGVtZVxuICAgIC8vIFRPRE8gLXRpbWVvdXQgTiAgICAgICAgICBQcm9jZXNzaW5nIHRpbWVvdXQgaW4gKE4pIHNlY29uZHMuIERlZmF1bHRzIHRvIDE1IG1pbnV0ZXMgKDkwMCBzZWNvbmRzKS5cbiAgICAub3B0aW9uKCctLXRlcHMnLCAnVG8gZ2VuZXJhdGUgaW1hZ2VzIHVzaW5nIEVQUyBmb3JtYXQnKVxuICAgIC5vcHRpb24oJy0tdGh0bWwnLCAnVG8gZ2VuZXJhdGUgSFRNTCBmaWxlIGZvciBjbGFzcyBkaWFncmFtJylcbiAgICAvLyBUT0RPIC10bGF0ZXg6bm9wcmVhbWJsZSAgVG8gZ2VuZXJhdGUgaW1hZ2VzIHVzaW5nIExhVGVYL1Rpa3ogZm9ybWF0IHdpdGhvdXQgcHJlYW1ibGVcbiAgICAub3B0aW9uKCctLXRsYXRleCcsICdUbyBnZW5lcmF0ZSBpbWFnZXMgdXNpbmcgTGFUZVgvVGlreiBmb3JtYXQnKVxuICAgIC5vcHRpb24oJy0tdHBkZicsICdUbyBnZW5lcmF0ZSBpbWFnZXMgdXNpbmcgUERGIGZvcm1hdCcpXG4gICAgLm9wdGlvbignLS10cG5nJywgJ1RvIGdlbmVyYXRlIGltYWdlcyB1c2luZyBQTkcgZm9ybWF0IChkZWZhdWx0KScpXG4gICAgLm9wdGlvbignLS10c2N4bWwnLCAnVG8gZ2VuZXJhdGUgU0NYTUwgZmlsZSBmb3Igc3RhdGUgZGlhZ3JhbScpXG4gICAgLm9wdGlvbignLS10c3ZnJywgJ1RvIGdlbmVyYXRlIGltYWdlcyB1c2luZyBTVkcgZm9ybWF0JylcbiAgICAub3B0aW9uKCctLXR0eHQnLCAnVG8gZ2VuZXJhdGUgaW1hZ2VzIHdpdGggQVNDSUkgYXJ0JylcbiAgICAub3B0aW9uKCctLXR1dHh0JywgJ1RvIGdlbmVyYXRlIGltYWdlcyB3aXRoIEFTQ0lJIGFydCB1c2luZyBVbmljb2RlIGNoYXJhY3RlcnMnKVxuICAgIC5vcHRpb24oJy0tdHZkeCcsICdUbyBnZW5lcmF0ZSBpbWFnZXMgdXNpbmcgVkRYIGZvcm1hdCcpXG4gICAgLm9wdGlvbignLS10eG1pJywgJ1RvIGdlbmVyYXRlIFhNSSBmaWxlIGZvciBjbGFzcyBkaWFncmFtJylcbiAgICAub3B0aW9uKCctLXZlcmJvc2UnLCAnVG8gaGF2ZSBsb2cgaW5mb3JtYXRpb24nKVxuICAgIC8vIFRPRE8gLXhtbHN0YXRzICAgICAgICAgICBUbyBvdXRwdXQgZ2VuZXJhbCBzdGF0aXN0aWNzIGluIGZpbGUgcGxhbnR1bWwtc3RhdHMueG1sXG4gICAgLmFjdGlvbihhc3luYyAoY21kT2JqKSA9PiB7XG5cbiAgICAgICAgY29uc3Qgb3B0aW9uczogZG9QbGFudFVNTE9wdGlvbnMgPSB7XG4gICAgICAgICAgICAvLyBpbnB1dEJvZHkgZG9lcyBub3QgbWFrZSBzZW5zZSBmb3IgQ0xJXG4gICAgICAgICAgICAvLyBpbnB1dEJvZHk6IHR5cGVvZiBpbnB1dEZOID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgLy8gICAgICAgICA/IGF3YWl0IGZzcC5yZWFkRmlsZShpbnB1dEZOLCAndXRmLTgnKVxuICAgICAgICAgICAgLy8gICAgICAgICA6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIGlucHV0Rk5zOiBjbWRPYmouaW5wdXRGaWxlLFxuICAgICAgICAgICAgb3V0cHV0Rk46IGNtZE9iai5vdXRwdXRGaWxlXG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHR5cGVvZiBjbWRPYmouc2VydmVyID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgb3B0aW9ucy5zZXJ2ZXJVUkwgPSBjbWRPYmouc2VydmVyO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgY21kT2JqLmphciA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIG9wdGlvbnMuamFyUGF0aCA9IGNtZE9iai5qYXI7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY21kT2JqLmNoYXJzZXQpIHtcbiAgICAgICAgICAgIGlmICghaXNWYWxpZENoYXJzZXQoY21kT2JqLmNoYXJzZXQpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBwbGFudHVtbCBjaGFyc2V0ICR7dXRpbC5pbnNwZWN0KGNtZE9iai5jaGFyc2V0KX0gdW5rbm93bmApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3B0aW9ucy5jaGFyc2V0ID0gY21kT2JqLmNoYXJzZXQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY21kT2JqLm5idGhyZWFkKSB7XG4gICAgICAgICAgICBpZiAoY21kT2JqLm5idGhyZWFkICE9PSAnYXV0bycpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBudCA9IE51bWJlci5wYXJzZUludChjbWRPYmoubmJ0aHJlYWQpO1xuICAgICAgICAgICAgICAgIGlmIChpc05hTihudCkgfHwgbnQgPCAwIHx8IG50ID4gMTYpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBwbGFudHVtbCBuYnRocmVhZCAke3V0aWwuaW5zcGVjdChjbWRPYmoubmJ0aHJlYWQpfSBpbnZhbGlkYCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3B0aW9ucy5uYnRocmVhZCA9IGNtZE9iai5uYnRocmVhZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgnZGFya21vZGUnIGluIGNtZE9iaikge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjbWRPYmouZGFya21vZGUgIT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgcGxhbnR1bWwgaW52YWxpZCBkYXJrbW9kZSBvcHRpb24gJHt1dGlsLmluc3BlY3QoY21kT2JqLmRhcmttb2RlKX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG9wdGlvbnMuZGFya21vZGUgPSBjbWRPYmouZGFya21vZGU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoJ2RlYnVnc3ZlaycgaW4gY21kT2JqKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGNtZE9iai5kZWJ1Z3N2ZWsgIT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgcGxhbnR1bWwgaW52YWxpZCBkZWJ1Z3N2ZWsgb3B0aW9uICR7dXRpbC5pbnNwZWN0KGNtZE9iai5kZWJ1Z3N2ZWspfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3B0aW9ucy5kZWJ1Z3N2ZWsgPSBjbWRPYmouZGVidWdzdmVrO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCdmaWxlbmFtZScgaW4gY21kT2JqKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGNtZE9iai5maWxlbmFtZSAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBwbGFudHVtbCBpbnZhbGlkIGZpbGVuYW1lIG9wdGlvbiAke3V0aWwuaW5zcGVjdChjbWRPYmouZmlsZW5hbWUpfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3B0aW9ucy5maWxlTmFtZU92ZXJyaWRlID0gY21kT2JqLmZpbGVuYW1lO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCdub21ldGFkYXRhJyBpbiBjbWRPYmopIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY21kT2JqLm5vbWV0YWRhdGEgIT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgcGxhbnR1bWwgaW52YWxpZCBub21ldGFkYXRhIG9wdGlvbiAke3V0aWwuaW5zcGVjdChjbWRPYmoubm9tZXRhZGF0YSl9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvcHRpb25zLm5vbWV0YWRhdGEgPSBjbWRPYmoubm9tZXRhZGF0YTtcbiAgICAgICAgfVxuXG4gICAgICAgIG9wdGlvbnMub3V0cHV0RGlyID0gY21kT2JqLm91dHB1dERpcjtcblxuICAgICAgICBpZiAoJ3RlcHMnIGluIGNtZE9iaikge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjbWRPYmoudGVwcyAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBwbGFudHVtbCBpbnZhbGlkIHRlcHMgb3B0aW9uICR7dXRpbC5pbnNwZWN0KGNtZE9iai50ZXBzKX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG9wdGlvbnMudGVwcyA9IGNtZE9iai50ZXBzO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCd0aHRtbCcgaW4gY21kT2JqKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGNtZE9iai50aHRtbCAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBwbGFudHVtbCBpbnZhbGlkIHRodG1sIG9wdGlvbiAke3V0aWwuaW5zcGVjdChjbWRPYmoudGh0bWwpfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3B0aW9ucy50aHRtbCA9IGNtZE9iai50aHRtbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgndGxhdGV4JyBpbiBjbWRPYmopIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY21kT2JqLnRsYXRleCAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBwbGFudHVtbCBpbnZhbGlkIHRsYXRleCBvcHRpb24gJHt1dGlsLmluc3BlY3QoY21kT2JqLnRsYXRleCl9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvcHRpb25zLnRsYXRleCA9IGNtZE9iai50bGF0ZXg7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoJ3RwZGYnIGluIGNtZE9iaikge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjbWRPYmoudHBkZiAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBwbGFudHVtbCBpbnZhbGlkIHRwZGYgb3B0aW9uICR7dXRpbC5pbnNwZWN0KGNtZE9iai50cGRmKX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG9wdGlvbnMudHBkZiA9IGNtZE9iai50cGRmO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCd0cG5nJyBpbiBjbWRPYmopIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY21kT2JqLnRwbmcgIT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgcGxhbnR1bWwgaW52YWxpZCB0cG5nIG9wdGlvbiAke3V0aWwuaW5zcGVjdChjbWRPYmoudHBuZyl9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvcHRpb25zLnRwbmcgPSBjbWRPYmoudHBuZztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgndHNjeG1sJyBpbiBjbWRPYmopIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY21kT2JqLnRzY3htbCAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBwbGFudHVtbCBpbnZhbGlkIHRzY3htbCBvcHRpb24gJHt1dGlsLmluc3BlY3QoY21kT2JqLnRzY3htbCl9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvcHRpb25zLnRzY3htbCA9IGNtZE9iai50c2N4bWw7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoJ3RzdmcnIGluIGNtZE9iaikge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjbWRPYmoudHN2ZyAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBwbGFudHVtbCBpbnZhbGlkIHRzdmcgb3B0aW9uICR7dXRpbC5pbnNwZWN0KGNtZE9iai50c3ZnKX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG9wdGlvbnMudHN2ZyA9IGNtZE9iai50c3ZnO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCd0dHh0JyBpbiBjbWRPYmopIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY21kT2JqLnRzdmcgIT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgcGxhbnR1bWwgaW52YWxpZCB0dHh0IG9wdGlvbiAke3V0aWwuaW5zcGVjdChjbWRPYmoudHR4dCl9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvcHRpb25zLnR0eHQgPSBjbWRPYmoudHR4dDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgndHV0eHQnIGluIGNtZE9iaikge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjbWRPYmoudHV0eHQgIT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgcGxhbnR1bWwgaW52YWxpZCB0dXR4dCBvcHRpb24gJHt1dGlsLmluc3BlY3QoY21kT2JqLnR1dHh0KX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG9wdGlvbnMudHV0eHQgPSBjbWRPYmoudHV0eHQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoJ3R2ZHgnIGluIGNtZE9iaikge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjbWRPYmoudHZkeCAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBwbGFudHVtbCBpbnZhbGlkIHR2ZHggb3B0aW9uICR7dXRpbC5pbnNwZWN0KGNtZE9iai50dmR4KX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG9wdGlvbnMudHZkeCA9IGNtZE9iai50dmR4O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCd0eG1pJyBpbiBjbWRPYmopIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY21kT2JqLnR4bWkgIT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgcGxhbnR1bWwgaW52YWxpZCB0eG1pIG9wdGlvbiAke3V0aWwuaW5zcGVjdChjbWRPYmoudHhtaSl9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvcHRpb25zLnR4bWkgPSBjbWRPYmoudHhtaTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgndmVyYm9zZScgaW4gY21kT2JqKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGNtZE9iai52ZXJib3NlICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sIGludmFsaWQgdmVyYm9zZSBvcHRpb24gJHt1dGlsLmluc3BlY3QoY21kT2JqLnZlcmJvc2UpfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3B0aW9ucy52ZXJib3NlID0gY21kT2JqLnZlcmJvc2U7XG4gICAgICAgIH1cblxuICAgICAgICBhd2FpdCBkb1BsYW50VU1MKG9wdGlvbnMpO1xuICAgIH0pO1xuXG4vLyBUaGUgZWRpdGlvbnMgb2YgdGhlIFBsYW50VU1MIEpBUiBwdWJsaXNoZWQgb24gdGhlXG4vLyBQbGFudFVNTCByZWxlYXNlIHBhZ2UsIGFuZCB0aGUgZmlsZSBuYW1lIHBhdHRlcm5cbi8vIHVzZWQgZm9yIGVhY2ggZWRpdGlvbi5cbmNvbnN0IHBsYW50dW1sRWRpdGlvbnMgPSBbXG4gICAgJ2dwbCcsICdtaXQnLCAnbGdwbCcsICdhc2wnLCAnZXBsJywgJ2JzZCdcbl07XG5cbmZ1bmN0aW9uIHBsYW50dW1sSmFyTmFtZShlZGl0aW9uOiBzdHJpbmcsIHZlcnNpb246IHN0cmluZykge1xuICAgIHJldHVybiBlZGl0aW9uID09PSAnZ3BsJ1xuICAgICAgICA/IGBwbGFudHVtbC0ke3ZlcnNpb259LmphcmBcbiAgICAgICAgOiBgcGxhbnR1bWwtJHtlZGl0aW9ufS0ke3ZlcnNpb259LmphcmA7XG59XG5cbnByb2dyYW1cbiAgICAuY29tbWFuZCgncGxhbnR1bWwtZG93bmxvYWQnKVxuICAgIC5kZXNjcmlwdGlvbignRG93bmxvYWQgdGhlIFBsYW50VU1MIEpBUiBmaWxlIGZvciB1c2Ugd2l0aCB0aGUgUExBTlRVTUxfSkFSIGVudmlyb25tZW50IHZhcmlhYmxlJylcbiAgICAub3B0aW9uKCctLXBsYW50dW1sLXZlcnNpb24gPHZlcnNpb24+JywgJ1BsYW50VU1MIHZlcnNpb24sIHN1Y2ggYXMgMS4yMDI1LjAuICBEZWZhdWx0OiB0aGUgbGF0ZXN0IHJlbGVhc2UuJylcbiAgICAub3B0aW9uKCctLWVkaXRpb24gPGVkaXRpb24+JywgYEpBUiBlZGl0aW9uOiAke3BsYW50dW1sRWRpdGlvbnMuam9pbignLCAnKX1gLCAnbWl0JylcbiAgICAub3B0aW9uKCctLW91dHB1dC1kaXIgPG91dERpcj4nLCAnRGlyZWN0b3J5IGludG8gd2hpY2ggdGhlIEpBUiBpcyBkb3dubG9hZGVkJywgJy4nKVxuICAgIC5hY3Rpb24oYXN5bmMgKGNtZE9iaikgPT4ge1xuXG4gICAgICAgIGNvbnN0IGVkaXRpb24gPSBjbWRPYmouZWRpdGlvbjtcbiAgICAgICAgaWYgKCFwbGFudHVtbEVkaXRpb25zLmluY2x1ZGVzKGVkaXRpb24pKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sLWRvd25sb2FkOiB1bmtub3duIGVkaXRpb24gJHt1dGlsLmluc3BlY3QoZWRpdGlvbil9IC0gdXNlIG9uZSBvZiAke3BsYW50dW1sRWRpdGlvbnMuam9pbignLCAnKX1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCB2ZXJzaW9uID0gY21kT2JqLnBsYW50dW1sVmVyc2lvbjtcbiAgICAgICAgaWYgKHR5cGVvZiB2ZXJzaW9uICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgY29uc3QgcmVzID0gYXdhaXQgZmV0Y2goXG4gICAgICAgICAgICAgICAgJ2h0dHBzOi8vYXBpLmdpdGh1Yi5jb20vcmVwb3MvcGxhbnR1bWwvcGxhbnR1bWwvcmVsZWFzZXMvbGF0ZXN0Jyk7XG4gICAgICAgICAgICBpZiAoIXJlcy5vaykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgcGxhbnR1bWwtZG93bmxvYWQ6IGNvdWxkIG5vdCBkZXRlcm1pbmUgdGhlIGxhdGVzdCBQbGFudFVNTCByZWxlYXNlICgke3Jlcy5zdGF0dXN9ICR7cmVzLnN0YXR1c1RleHR9KSAtIHNwZWNpZnkgb25lIHdpdGggLS1wbGFudHVtbC12ZXJzaW9uYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCByZWxlYXNlID0gYXdhaXQgcmVzLmpzb24oKSBhcyB7IHRhZ19uYW1lOiBzdHJpbmcgfTtcbiAgICAgICAgICAgIHZlcnNpb24gPSByZWxlYXNlLnRhZ19uYW1lLnJlcGxhY2UoL152LywgJycpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgamFyTmFtZSA9IHBsYW50dW1sSmFyTmFtZShlZGl0aW9uLCB2ZXJzaW9uKTtcbiAgICAgICAgY29uc3QgdXJsID0gYGh0dHBzOi8vZ2l0aHViLmNvbS9wbGFudHVtbC9wbGFudHVtbC9yZWxlYXNlcy9kb3dubG9hZC92JHt2ZXJzaW9ufS8ke2phck5hbWV9YDtcblxuICAgICAgICBjb25zb2xlLmxvZyhgRG93bmxvYWRpbmcgJHt1cmx9YCk7XG4gICAgICAgIGNvbnN0IHJlcyA9IGF3YWl0IGZldGNoKHVybCk7XG4gICAgICAgIGlmICghcmVzLm9rKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sLWRvd25sb2FkOiBkb3dubG9hZCBvZiAke3VybH0gZmFpbGVkICgke3Jlcy5zdGF0dXN9ICR7cmVzLnN0YXR1c1RleHR9KWApO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGphclBhdGggPSBwYXRoLmpvaW4oY21kT2JqLm91dHB1dERpciwgamFyTmFtZSk7XG4gICAgICAgIGF3YWl0IGZzcC5ta2RpcihjbWRPYmoub3V0cHV0RGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgICAgYXdhaXQgZnNwLndyaXRlRmlsZShqYXJQYXRoLFxuICAgICAgICAgICAgQnVmZmVyLmZyb20oYXdhaXQgcmVzLmFycmF5QnVmZmVyKCkpKTtcblxuICAgICAgICBjb25zb2xlLmxvZyhgRG93bmxvYWRlZCAke2phclBhdGh9XG5cblRvIHVzZSB0aGlzIEpBUiBmb3IgUGxhbnRVTUwgcmVuZGVyaW5nLCBzZXQgdGhlIGVudmlyb25tZW50IHZhcmlhYmxlOlxuXG4gICAgZXhwb3J0IFBMQU5UVU1MX0pBUj0ke3BhdGgucmVzb2x2ZShqYXJQYXRoKX1cblxuUmVuZGVyaW5nIHdpdGggdGhlIEpBUiByZXF1aXJlcyBKYXZhIHRvIGJlIGluc3RhbGxlZCBhbmQgaW4geW91ciBQQVRILmApO1xuICAgIH0pO1xuXG5wcm9ncmFtXG4gICAgLmNvbW1hbmQoJ3BpbnRvcmEnKVxuICAgIC5kZXNjcmlwdGlvbignUmVuZGVyIFBpbnRvcmEgZmlsZXMnKVxuICAgIC5vcHRpb24oJy0taW5wdXQtZmlsZSA8aW5wdXRGTj4nLCAnUGF0aCBmb3IgZG9jdW1lbnQgdG8gcmVuZGVyJylcbiAgICAub3B0aW9uKCctLW91dHB1dC1maWxlIDxvdXRwdXRGTj4nLCAnUGF0aCBmb3IgcmVuZGVyZWQgZG9jdW1lbnQnKVxuICAgIC5vcHRpb24oJy0tcGl4ZWwtcmF0aW8gPHJhdGlvPicsICcnKVxuICAgIC5vcHRpb24oJy0tbWltZS10eXBlIDxtdD4nLCAnTUlNRSB0eXBlIGZvciBvdXRwdXQgZmlsZScpXG4gICAgLm9wdGlvbignLS1iZy1jb2xvciA8Y29sb3I+JywgJ1N0cmluZyBkZXNjcmliaW5nIGJhY2tncm91bmQgY29sb3InKVxuICAgIC5vcHRpb24oJy0td2lkdGggPG51bWJlcj4nLCAnV2lkdGggb2YgdGhlIG91dHB1dCwgaGVpZ2h0IHdpbGwgYmUgY2FsY3VsYXRlZCBhY2NvcmRpbmcgdG8gdGhlIGRpYWdyYW0gY29udGVudCByYXRpbycpXG4gICAgLmFjdGlvbihhc3luYyAoY21kT2JqKSA9PiB7XG4gICAgICAgIGNvbnN0IG9wdHM6IFBpbnRvcmFSZW5kZXJPcHRpb25zID0ge1xuICAgICAgICAgICAgY29kZTogJycsXG4gICAgICAgICAgICBvdXRwdXRGTjogJydcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAodHlwZW9mIGNtZE9iai5pbnB1dEZpbGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBvcHRzLmNvZGUgPSBhd2FpdCBmc3AucmVhZEZpbGUoY21kT2JqLmlucHV0RmlsZSwgJ3V0Zi04Jyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIGlucHV0IGZpbGUgc3BlY2lmaWVkJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGNtZE9iai5vdXRwdXRGaWxlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgb3B0cy5vdXRwdXRGTiA9IGNtZE9iai5vdXRwdXRGaWxlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdObyBvdXRwdXQgZmlsZSBzcGVjaWZpZWQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgY21kT2JqLnBpeGVsUmF0aW8gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBvcHRzLmRldmljZVBpeGVsUmF0aW8gPSBOdW1iZXIucGFyc2VGbG9hdChjbWRPYmoucGl4ZWxSYXRpbyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBvcHRzLmRldmljZVBpeGVsUmF0aW8gIT09ICd1bmRlZmluZWQnXG4gICAgICAgICAmJiBpc05hTihvcHRzLmRldmljZVBpeGVsUmF0aW8pKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgZGV2aWNlIHBpeGVsIHJhdGlvICR7dXRpbC5pbnNwZWN0KGNtZE9iai5waXhlbFJhdGlvKX1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgY21kT2JqLm1pbWVUeXBlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICAgIGNtZE9iai5taW1lVHlwZSA9PT0gJ2ltYWdlL3N2Zyt4bWwnXG4gICAgICAgICAgICAgfHwgY21kT2JqLm1pbWVUeXBlID09PSAnaW1hZ2UvanBlZydcbiAgICAgICAgICAgICB8fCBjbWRPYmoubWltZVR5cGUgPT09ICdpbWFnZS9wbmcnXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICBvcHRzLm1pbWVUeXBlID0gY21kT2JqLm1pbWVUeXBlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgTUlNRSB0eXBlICR7dXRpbC5pbnNwZWN0KGNtZE9iai5taW1lVHlwZSl9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGNtZE9iai5iZ0NvbG9yID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgb3B0cy5iYWNrZ3JvdW5kQ29sb3IgPSBjbWRPYmouYmdDb2xvcjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgY21kT2JqLndpZHRoID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgb3B0cy53aWR0aCA9IE51bWJlci5wYXJzZUZsb2F0KGNtZE9iai53aWR0aCk7XG4gICAgICAgICAgICBpZiAoaXNOYU4ob3B0cy53aWR0aCkpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGRpYWdyYW1zLXBpbnRvcmE6IHdpZHRoIGlzIG5vdCBhIG51bWJlciAke2NtZE9iai53aWR0aH1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIG9wdHMucmVuZGVySW5TdWJwcm9jZXNzID0gZmFsc2U7XG5cbiAgICAgICAgYXdhaXQgZG9QaW50b3JhKG9wdHMpO1xuICAgIH0pO1xuXG5cbnByb2dyYW1cbiAgICAuY29tbWFuZCgnbWVybWFpZCcpXG4gICAgLmRlc2NyaXB0aW9uKCdSZW5kZXIgTWVybWFpZCBmaWxlcyB0byBTVkcnKVxuICAgIC5vcHRpb24oJy0taW5wdXQtZmlsZSA8aW5wdXRGTj4nLCAnUGF0aCBmb3IgZG9jdW1lbnQgdG8gcmVuZGVyJylcbiAgICAub3B0aW9uKCctLW91dHB1dC1maWxlIDxvdXRwdXRGTj4nLCAnUGF0aCBmb3IgcmVuZGVyZWQgU1ZHIGRvY3VtZW50JylcbiAgICAub3B0aW9uKCctLWNvbmZpZyA8Y29uZmlnRk4+JywgJ1BhdGggZm9yIGEgSlNPTiBjb25maWcgZmlsZSAodGhlbWUsIHRoZW1lVmFyaWFibGVzLCBmbG93Y2hhcnQsIC4uLiknKVxuICAgIC5vcHRpb24oJy0tdGhlbWUgPHRoZW1lPicsICdUaGVtZSBwcmVzZXQ6IGRlZmF1bHQsIGRhcmssIGZvcmVzdCwgbmV1dHJhbCwgb3IgbW9kZXJuJylcbiAgICAub3B0aW9uKCctLWZvbnQgPGZvbnRGTi4uLj4nLCAnVFRGL09URiBmb250IGZpbGUocykgdG8gcmVnaXN0ZXIgZm9yIHRleHQgbWVhc3VyZW1lbnQnKVxuICAgIC5hY3Rpb24oYXN5bmMgKGNtZE9iaikgPT4ge1xuICAgICAgICBjb25zdCBvcHRzOiBNZXJtYWlkUmVuZGVyT3B0aW9ucyA9IHtcbiAgICAgICAgICAgIGNvZGU6ICcnLFxuICAgICAgICAgICAgb3V0cHV0Rk46ICcnXG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHR5cGVvZiBjbWRPYmouaW5wdXRGaWxlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgb3B0cy5jb2RlID0gYXdhaXQgZnNwLnJlYWRGaWxlKGNtZE9iai5pbnB1dEZpbGUsICd1dGYtOCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdObyBpbnB1dCBmaWxlIHNwZWNpZmllZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBjbWRPYmoub3V0cHV0RmlsZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIG9wdHMub3V0cHV0Rk4gPSBjbWRPYmoub3V0cHV0RmlsZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTm8gb3V0cHV0IGZpbGUgc3BlY2lmaWVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFvcHRzLm91dHB1dEZOLmVuZHNXaXRoKCcuc3ZnJykpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgbWVybWFpZCBvdXRwdXQtZmlsZSBtdXN0IGhhdmUgLnN2ZyBleHRlbnNpb24gJHt1dGlsLmluc3BlY3Qob3B0cy5vdXRwdXRGTil9YCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGNtZE9iai5jb25maWcgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBvcHRzLmNvbmZpZ0pTT04gPSBhd2FpdCBmc3AucmVhZEZpbGUoY21kT2JqLmNvbmZpZywgJ3V0Zi04Jyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGNtZE9iai50aGVtZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIG9wdHMudGhlbWVQcmVzZXQgPSBjbWRPYmoudGhlbWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShjbWRPYmouZm9udCkpIHtcbiAgICAgICAgICAgIG9wdHMuZm9udEZOcyA9IGNtZE9iai5mb250O1xuICAgICAgICB9XG5cbiAgICAgICAgYXdhaXQgZG9NZXJtYWlkKG9wdHMpO1xuICAgIH0pO1xuXG5wcm9ncmFtLnBhcnNlKCk7XG4iXX0=