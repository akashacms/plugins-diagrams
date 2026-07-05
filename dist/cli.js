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
program.parse();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vbGliL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBRUEsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUM7QUFFdEMsT0FBTyxFQUFFLFFBQVEsSUFBSSxHQUFHLEVBQWEsTUFBTSxTQUFTLENBQUM7QUFDckQsT0FBTyxJQUFlLE1BQU0sV0FBVyxDQUFDO0FBQ3hDLE9BQU8sSUFBSSxNQUFNLFdBQVcsQ0FBQztBQUU3QixzRUFBc0U7QUFFdEUsT0FBTyxFQUFxQixVQUFVLEVBQUUsY0FBYyxFQUF3QixTQUFTLEVBQXdCLFNBQVMsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUU3SSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBQ3BDLE1BQU0sT0FBTyxHQUFHLElBQUksT0FBTyxFQUFFLENBQUM7QUFFOUIsMERBQTBEO0FBQzFELGVBQWU7QUFDZixhQUFhO0FBRWIsb0NBQW9DO0FBQ3BDLFVBQVU7QUFDVixzQ0FBc0M7QUFDdEMseURBQXlEO0FBRXpELE9BQU87S0FDRixPQUFPLENBQUMsVUFBVSxDQUFDO0tBQ25CLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBQztLQUNwQyxNQUFNLENBQUMsMkJBQTJCLEVBQUUsNkJBQTZCLENBQUM7S0FDbEUsTUFBTSxDQUFDLDBCQUEwQixFQUFFLDRCQUE0QixDQUFDO0tBQ2hFLE1BQU0sQ0FBQyxzQkFBc0IsRUFBRSwyREFBMkQsQ0FBQztLQUMzRixNQUFNLENBQUMsaUJBQWlCLEVBQUUsdURBQXVELENBQUM7S0FDbEYsTUFBTSxDQUFDLHFCQUFxQixFQUFFLGlEQUFpRCxDQUFDO0lBQ2pGLHdFQUF3RTtJQUN4RSx1REFBdUQ7S0FDdEQsTUFBTSxDQUFDLFlBQVksRUFBRSwrQkFBK0IsQ0FBQztLQUNyRCxNQUFNLENBQUMsYUFBYSxFQUFFLHFDQUFxQyxDQUFDO0lBQzdELGtFQUFrRTtJQUNsRSw4QkFB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Q0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7UUFDbEMsTUFBTSxJQUFJLEtBQUssQ0FBQyxnREFBZ0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ25HLENBQUM7SUFFRCxJQUFJLE9BQU8sTUFBTSxDQUFDLE1BQU0sS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUNwQyxJQUFJLENBQUMsVUFBVSxHQUFHLE1BQU0sR0FBRyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ2pFLENBQUM7SUFFRCxJQUFJLE9BQU8sTUFBTSxDQUFDLEtBQUssS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUNuQyxJQUFJLENBQUMsV0FBVyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUM7SUFDcEMsQ0FBQztJQUVELElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUM3QixJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDL0IsQ0FBQztJQUVELE1BQU0sU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzFCLENBQUMsQ0FBQyxDQUFDO0FBRVAsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiIyEgL3Vzci9iaW4vZW52IG5vZGVcblxuY29uc3QgX19kaXJuYW1lID0gaW1wb3J0Lm1ldGEuZGlybmFtZTtcblxuaW1wb3J0IHsgcHJvbWlzZXMgYXMgZnNwLCBjb25zdGFudHMgfSBmcm9tICdub2RlOmZzJztcbmltcG9ydCBwYXRoLCB7IHBhcnNlIH0gZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCB1dGlsIGZyb20gJ25vZGU6dXRpbCc7XG5cbi8vIGltcG9ydCBwYWNrYWdlQ29uZmlnIGZyb20gJy4uL3BhY2thZ2UuanNvbicgd2l0aCB7IHR5cGU6ICdqc29uJyB9OyBcblxuaW1wb3J0IHsgZG9QbGFudFVNTE9wdGlvbnMsIGRvUGxhbnRVTUwsIGlzVmFsaWRDaGFyc2V0LCBQaW50b3JhUmVuZGVyT3B0aW9ucywgZG9QaW50b3JhLCBNZXJtYWlkUmVuZGVyT3B0aW9ucywgZG9NZXJtYWlkIH0gZnJvbSAnLi9pbmRleC5qcyc7XG5cbmltcG9ydCB7IENvbW1hbmQgfSBmcm9tICdjb21tYW5kZXInO1xuY29uc3QgcHJvZ3JhbSA9IG5ldyBDb21tYW5kKCk7XG5cbi8vIFBST0cgcGxhbnR1bWwgLS1pbnB1dCAuLiAtLW91dHB1dCAuLiAtLW90aGVyLW9wdGlvbnMgLi5cbi8vIFBST0cgbWVybWFpZFxuLy8gUFJPRyBrYXRleFxuXG4vLyBwcm9ncmFtLm5hbWUocGFja2FnZUNvbmZpZy5uYW1lKTtcbi8vIHByb2dyYW1cbi8vICAgICAudmVyc2lvbihwYWNrYWdlQ29uZmlnLnZlcnNpb24sXG4vLyAgICAgICAgICctdiwgLS12ZXJzaW9uJywgJ291dHB1dCB0aGUgY3VycmVudCB2ZXJzaW9uJylcblxucHJvZ3JhbVxuICAgIC5jb21tYW5kKCdwbGFudHVtbCcpXG4gICAgLmRlc2NyaXB0aW9uKCdSZW5kZXIgUGxhbnRVTUwgZmlsZXMnKVxuICAgIC5vcHRpb24oJy0taW5wdXQtZmlsZSA8aW5wdXRGTi4uLj4nLCAnUGF0aCBmb3IgZG9jdW1lbnQgdG8gcmVuZGVyJylcbiAgICAub3B0aW9uKCctLW91dHB1dC1maWxlIDxvdXRwdXRGTj4nLCAnUGF0aCBmb3IgcmVuZGVyZWQgZG9jdW1lbnQnKVxuICAgIC5vcHRpb24oJy0tc2VydmVyIDxzZXJ2ZXJVUkw+JywgJ1VSTCBmb3IgYSBQbGFudFVNTCBzZXJ2ZXIuIE92ZXJyaWRlcyBQTEFOVFVNTF9TRVJWRVJfVVJMLicpXG4gICAgLm9wdGlvbignLS1qYXIgPGphclBhdGg+JywgJ1BhdGggZm9yIGEgcGxhbnR1bWwuamFyIGZpbGUuIE92ZXJyaWRlcyBQTEFOVFVNTF9KQVIuJylcbiAgICAub3B0aW9uKCctLWNoYXJzZXQgPGNoYXJzZXQ+JywgJ1RvIHVzZSBhIHNwZWNpZmljIGNoYXJhY3RlciBzZXQuIERlZmF1bHQ6IFVURi04JylcbiAgICAvLyBUT0RPIC0tY2hlY2ttZXRhZGF0YSBTa2lwIFBORyBmaWxlcyB0aGF0IGRvbid0IG5lZWQgdG8gYmUgcmVnZW5lcmF0ZWRcbiAgICAvLyBUT0RPIC1EdmFyPXZhbHVlIHNob3VsZCBiZSAtLWRlZmluZSA8ZGVmVmFyVmFsdWUuLi4+XG4gICAgLm9wdGlvbignLS1kYXJrbW9kZScsICdUbyB1c2UgZGFyayBtb2RlIGZvciBkaWFncmFtcycpXG4gICAgLm9wdGlvbignLS1kZWJ1Z3N2ZWsnLCAnVG8gZ2VuZXJhdGUgaW50ZXJtZWRpYXRlIHN2ZWsgZmlsZXMnKVxuICAgIC8vIFRPRE8gLS1leGNsdWRlIHBhdHRlcm4gYWJvdXQgZXhjbHVkaW5nIGZpbGVzIGZyb20gY29uc2lkZXJhdGlvblxuICAgIC8vICAgICAgICAgIGJhc2VkIG9uIGEgcGF0dGVyblxuICAgIC8vIFRPRE8gLS1kaXNhYmxlc3RhdHMgVG8gZGlzYWJsZSBzdGF0aXN0aWNzIGNvbXB1dGF0aW9uIChkZWZhdWx0KVxuICAgIC8vIFRPRE8gLS1lbmFibGVzdGF0cyBUbyBlbmFibGUgc3RhdGlzdGljcyBjb21wdXRhdGlvblxuICAgIC8vIFRPRE8gLS1lbmNvZGVzcHJpdGUgNHw4fDE2IFwiZmlsZVwiICBUbyBlbmNvZGUgYSBzcHJpdGUgYXQgYSBncmF5IGxldmVsIGZyb20gYW4gaW1hZ2VcbiAgICAvLyBUT0RPIC0tZmFpbGZhc3QgVG8gc3RvcCBwcm9jZXNzaW5nIGFzIHNvb24gYXMgYSBzeW50YXggZXJyb3IgaW4gZGlhZ3JhbSBvY2N1cnNcbiAgICAvLyBUT0RPIC0tZmFpbGZhc3QyIFRvIGRvIGEgZmlyc3Qgc3ludGF4IGNoZWNrIGJlZm9yZSBwcm9jZXNzaW5nIGZpbGVzLCB0byBmYWlsIGV2ZW4gZmFzdGVyXG4gICAgLy8gVE9ETyAtLWZpbGVkaXIgPGRpck5tPiBUbyBiZWhhdmUgYXMgaWYgUGxhbnRVTUwgaXMgaW4gdGhpcyBkaXJcbiAgICAub3B0aW9uKCctLWZpbGVuYW1lIDxmaWxlTm0+JywgJ1wiZXhhbXBsZS5wdW1sXCIgVG8gb3ZlcnJpZGUgJWZpbGVuYW1lJSB2YXJpYWJsZScpXG4gICAgLy8gVE9ETyAtLWdyYXBodml6ZG90IFwiZXhlXCIgVG8gc3BlY2lmeSBkb3QgZXhlY3V0YWJsZVxuICAgIC8vIFRPRE8gLS1odG1sc3RhdHMgIFRvIG91dHB1dCBnZW5lcmFsIHN0YXRpc3RpY3MgaW4gZmlsZSBwbGFudHVtbC1zdGF0cy5odG1sXG4gICAgLy8gVE9ETyAtSS9wYXRoL3RvL2ZpbGUgICAgIFRvIGluY2x1ZGUgZmlsZSBhcyBpZiAnIWluY2x1ZGUgZmlsZScgd2VyZSB1c2VkXG4gICAgLy8gVE9ETyAtSS9wYXRoL3RvLyoucHVtbCAgIFRvIGluY2x1ZGUgZmlsZXMgd2l0aCBwYXR0ZXJuXG4gICAgLy8gVE9ETyAtbGFuZ3VhZ2UgICAgICAgICAgIFRvIHByaW50IHRoZSBsaXN0IG9mIFBsYW50VU1MIGtleXdvcmRzXG4gICAgLy8gVE9ETyAtbG9vcHN0YXRzICAgICAgICAgIFRvIGNvbnRpbnVvdXNseSBwcmludCBzdGF0aXN0aWNzIGFib3V0IHVzYWdlXG4gICAgLy8gVE9ETyAtbWV0YWRhdGEgICAgICAgICAgIFRvIHJldHJpZXZlIFBsYW50VU1MIHNvdXJjZXMgZnJvbSBQTkcgaW1hZ2VzXG4gICAgLm9wdGlvbignLS1uYnRocmVhZCA8blRocmVhZHM+JywgJ1RvIHVzZSAoTikgdGhyZWFkcyBmb3IgcHJvY2Vzc2luZy4gIFVzZSBcImF1dG9cIiBmb3IgNCB0aHJlYWRzLicpXG4gICAgLy8gVE9ETyAtbm9lcnJvciAgICAgICAgICAgIFRvIHNraXAgaW1hZ2VzIHdoZW4gZXJyb3IgaW4gZGlhZ3JhbXNcbiAgICAub3B0aW9uKCctLW5vbWV0YWRhdGEnLCAnVG8gTk9UIGV4cG9ydCBtZXRhZGF0YSBpbiBQTkcvU1ZHIGdlbmVyYXRlZCBmaWxlcycpXG4gICAgLm9wdGlvbignLS1vdXRwdXQtZGlyIDxvdXREaXI+JywgJ1RvIGdlbmVyYXRlIGltYWdlcyBpbiB0aGUgc3BlY2lmaWVkIGRpcmVjdG9yeScpXG4gICAgLy8gLm9wdGlvbignLS1vdmVyd3JpdGUnLCAnVG8gYWxsb3cgdG8gb3ZlcndyaXRlIHJlYWQgb25seSBmaWxlcycpXG4gICAgLy8gVE9ETyAtUHByYWdtYTE9dmFsdWUgICAgIFRvIHNldCBwcmFnbWEgYXMgaWYgJyFwcmFnbWEgcHJhZ21hMSB2YWx1ZScgd2VyZSB1c2VkXG4gICAgLy8gVE9ETyAtcFtpcGVdICAgICAgICAgICAgIFRvIHVzZSBzdGRpbiBmb3IgUGxhbnRVTUwgc291cmNlIGFuZCBzdGRvdXQgZm9yIFBORy9TVkcvRVBTIGdlbmVyYXRpb25cbiAgICAvLyBUT0RPIC1waWNvd2ViICAgICAgICAgICAgVG8gc3RhcnQgaW50ZXJuYWwgSFRUUCBTZXJ2ZXIuIFNlZSBodHRwczovL3BsYW50dW1sLmNvbS9waWNvd2ViXG4gICAgLy8gVE9ETyAtcGlwZWltYWdlaW5kZXggTiAgIFRvIGdlbmVyYXRlIHRoZSBOdGggaW1hZ2Ugd2l0aCBwaXBlIG9wdGlvblxuICAgIC8vIFRPRE8gLXByZXByb2MgICAgICAgICAgICBUbyBvdXRwdXQgcHJlcHJvY2Vzc29yIHRleHQgb2YgZGlhZ3JhbXNcbiAgICAvLyBUT0RPIC1wcmludGZvbnRzICAgICAgICAgVG8gcHJpbnQgZm9udHMgYXZhaWxhYmxlIG9uIHlvdXIgc3lzdGVtXG4gICAgLy8gVE9ETyAtcHJvZ3Jlc3MgICAgICAgICAgIFRvIGRpc3BsYXkgYSB0ZXh0dWFsIHByb2dyZXNzIGJhciBpbiBjb25zb2xlXG4gICAgLy8gVE9ETyAtcXVpZXQgICAgICAgICAgICAgIFRvIE5PVCBwcmludCBlcnJvciBtZXNzYWdlIGludG8gdGhlIGNvbnNvbGVcbiAgICAvLyBUT0RPIC1yZWFsdGltZXN0YXRzICAgICAgVG8gZ2VuZXJhdGUgc3RhdGlzdGljcyBvbiB0aGUgZmx5IHJhdGhlciB0aGFuIGF0IHRoZSBlbmRcbiAgICAvLyBUT0RPIC1TcGFyYW0xPXZhbHVlICAgICAgVG8gc2V0IGEgc2tpbiBwYXJhbWV0ZXIgYXMgaWYgJ3NraW5wYXJhbSBwYXJhbTEgdmFsdWUnIHdlcmUgdXNlZFxuICAgIC8vIFRPRE8gLXNwbGFzaCAgICAgICAgICAgICBUbyBkaXNwbGF5IGEgc3BsYXNoIHNjcmVlbiB3aXRoIHNvbWUgcHJvZ3Jlc3MgYmFyXG4gICAgLy8gVE9ETyAtc3RkbGliICAgICAgICAgICAgIFRvIHByaW50IHN0YW5kYXJkIGxpYnJhcnkgaW5mb1xuICAgIC8vIFRPRE8gLXN5bnRheCAgICAgICAgICAgICBUbyByZXBvcnQgYW55IHN5bnRheCBlcnJvciBmcm9tIHN0YW5kYXJkIGlucHV0IHdpdGhvdXQgZ2VuZXJhdGluZyBpbWFnZXNcbiAgICAvLyBUT0RPIC10ZXN0ZG90ICAgICAgICAgICAgVG8gdGVzdCB0aGUgaW5zdGFsbGF0aW9uIG9mIGdyYXBodml6XG4gICAgLy8gVE9ETyAtdGhlbWUgeHh4ICAgICAgICAgIFRvIHVzZSBhIHNwZWNpZmljIHRoZW1lXG4gICAgLy8gVE9ETyAtdGltZW91dCBOICAgICAgICAgIFByb2Nlc3NpbmcgdGltZW91dCBpbiAoTikgc2Vjb25kcy4gRGVmYXVsdHMgdG8gMTUgbWludXRlcyAoOTAwIHNlY29uZHMpLlxuICAgIC5vcHRpb24oJy0tdGVwcycsICdUbyBnZW5lcmF0ZSBpbWFnZXMgdXNpbmcgRVBTIGZvcm1hdCcpXG4gICAgLm9wdGlvbignLS10aHRtbCcsICdUbyBnZW5lcmF0ZSBIVE1MIGZpbGUgZm9yIGNsYXNzIGRpYWdyYW0nKVxuICAgIC8vIFRPRE8gLXRsYXRleDpub3ByZWFtYmxlICBUbyBnZW5lcmF0ZSBpbWFnZXMgdXNpbmcgTGFUZVgvVGlreiBmb3JtYXQgd2l0aG91dCBwcmVhbWJsZVxuICAgIC5vcHRpb24oJy0tdGxhdGV4JywgJ1RvIGdlbmVyYXRlIGltYWdlcyB1c2luZyBMYVRlWC9UaWt6IGZvcm1hdCcpXG4gICAgLm9wdGlvbignLS10cGRmJywgJ1RvIGdlbmVyYXRlIGltYWdlcyB1c2luZyBQREYgZm9ybWF0JylcbiAgICAub3B0aW9uKCctLXRwbmcnLCAnVG8gZ2VuZXJhdGUgaW1hZ2VzIHVzaW5nIFBORyBmb3JtYXQgKGRlZmF1bHQpJylcbiAgICAub3B0aW9uKCctLXRzY3htbCcsICdUbyBnZW5lcmF0ZSBTQ1hNTCBmaWxlIGZvciBzdGF0ZSBkaWFncmFtJylcbiAgICAub3B0aW9uKCctLXRzdmcnLCAnVG8gZ2VuZXJhdGUgaW1hZ2VzIHVzaW5nIFNWRyBmb3JtYXQnKVxuICAgIC5vcHRpb24oJy0tdHR4dCcsICdUbyBnZW5lcmF0ZSBpbWFnZXMgd2l0aCBBU0NJSSBhcnQnKVxuICAgIC5vcHRpb24oJy0tdHV0eHQnLCAnVG8gZ2VuZXJhdGUgaW1hZ2VzIHdpdGggQVNDSUkgYXJ0IHVzaW5nIFVuaWNvZGUgY2hhcmFjdGVycycpXG4gICAgLm9wdGlvbignLS10dmR4JywgJ1RvIGdlbmVyYXRlIGltYWdlcyB1c2luZyBWRFggZm9ybWF0JylcbiAgICAub3B0aW9uKCctLXR4bWknLCAnVG8gZ2VuZXJhdGUgWE1JIGZpbGUgZm9yIGNsYXNzIGRpYWdyYW0nKVxuICAgIC5vcHRpb24oJy0tdmVyYm9zZScsICdUbyBoYXZlIGxvZyBpbmZvcm1hdGlvbicpXG4gICAgLy8gVE9ETyAteG1sc3RhdHMgICAgICAgICAgIFRvIG91dHB1dCBnZW5lcmFsIHN0YXRpc3RpY3MgaW4gZmlsZSBwbGFudHVtbC1zdGF0cy54bWxcbiAgICAuYWN0aW9uKGFzeW5jIChjbWRPYmopID0+IHtcblxuICAgICAgICBjb25zdCBvcHRpb25zOiBkb1BsYW50VU1MT3B0aW9ucyA9IHtcbiAgICAgICAgICAgIC8vIGlucHV0Qm9keSBkb2VzIG5vdCBtYWtlIHNlbnNlIGZvciBDTElcbiAgICAgICAgICAgIC8vIGlucHV0Qm9keTogdHlwZW9mIGlucHV0Rk4gPT09ICdzdHJpbmcnXG4gICAgICAgICAgICAvLyAgICAgICAgID8gYXdhaXQgZnNwLnJlYWRGaWxlKGlucHV0Rk4sICd1dGYtOCcpXG4gICAgICAgICAgICAvLyAgICAgICAgIDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgaW5wdXRGTnM6IGNtZE9iai5pbnB1dEZpbGUsXG4gICAgICAgICAgICBvdXRwdXRGTjogY21kT2JqLm91dHB1dEZpbGVcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAodHlwZW9mIGNtZE9iai5zZXJ2ZXIgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBvcHRpb25zLnNlcnZlclVSTCA9IGNtZE9iai5zZXJ2ZXI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBjbWRPYmouamFyID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgb3B0aW9ucy5qYXJQYXRoID0gY21kT2JqLmphcjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjbWRPYmouY2hhcnNldCkge1xuICAgICAgICAgICAgaWYgKCFpc1ZhbGlkQ2hhcnNldChjbWRPYmouY2hhcnNldCkpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sIGNoYXJzZXQgJHt1dGlsLmluc3BlY3QoY21kT2JqLmNoYXJzZXQpfSB1bmtub3duYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvcHRpb25zLmNoYXJzZXQgPSBjbWRPYmouY2hhcnNldDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjbWRPYmoubmJ0aHJlYWQpIHtcbiAgICAgICAgICAgIGlmIChjbWRPYmoubmJ0aHJlYWQgIT09ICdhdXRvJykge1xuICAgICAgICAgICAgICAgIGNvbnN0IG50ID0gTnVtYmVyLnBhcnNlSW50KGNtZE9iai5uYnRocmVhZCk7XG4gICAgICAgICAgICAgICAgaWYgKGlzTmFOKG50KSB8fCBudCA8IDAgfHwgbnQgPiAxNikge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sIG5idGhyZWFkICR7dXRpbC5pbnNwZWN0KGNtZE9iai5uYnRocmVhZCl9IGludmFsaWRgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvcHRpb25zLm5idGhyZWFkID0gY21kT2JqLm5idGhyZWFkO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCdkYXJrbW9kZScgaW4gY21kT2JqKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGNtZE9iai5kYXJrbW9kZSAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBwbGFudHVtbCBpbnZhbGlkIGRhcmttb2RlIG9wdGlvbiAke3V0aWwuaW5zcGVjdChjbWRPYmouZGFya21vZGUpfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3B0aW9ucy5kYXJrbW9kZSA9IGNtZE9iai5kYXJrbW9kZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgnZGVidWdzdmVrJyBpbiBjbWRPYmopIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY21kT2JqLmRlYnVnc3ZlayAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBwbGFudHVtbCBpbnZhbGlkIGRlYnVnc3ZlayBvcHRpb24gJHt1dGlsLmluc3BlY3QoY21kT2JqLmRlYnVnc3Zlayl9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvcHRpb25zLmRlYnVnc3ZlayA9IGNtZE9iai5kZWJ1Z3N2ZWs7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoJ2ZpbGVuYW1lJyBpbiBjbWRPYmopIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY21kT2JqLmZpbGVuYW1lICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sIGludmFsaWQgZmlsZW5hbWUgb3B0aW9uICR7dXRpbC5pbnNwZWN0KGNtZE9iai5maWxlbmFtZSl9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvcHRpb25zLmZpbGVOYW1lT3ZlcnJpZGUgPSBjbWRPYmouZmlsZW5hbWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoJ25vbWV0YWRhdGEnIGluIGNtZE9iaikge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjbWRPYmoubm9tZXRhZGF0YSAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBwbGFudHVtbCBpbnZhbGlkIG5vbWV0YWRhdGEgb3B0aW9uICR7dXRpbC5pbnNwZWN0KGNtZE9iai5ub21ldGFkYXRhKX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG9wdGlvbnMubm9tZXRhZGF0YSA9IGNtZE9iai5ub21ldGFkYXRhO1xuICAgICAgICB9XG5cbiAgICAgICAgb3B0aW9ucy5vdXRwdXREaXIgPSBjbWRPYmoub3V0cHV0RGlyO1xuXG4gICAgICAgIGlmICgndGVwcycgaW4gY21kT2JqKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGNtZE9iai50ZXBzICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sIGludmFsaWQgdGVwcyBvcHRpb24gJHt1dGlsLmluc3BlY3QoY21kT2JqLnRlcHMpfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3B0aW9ucy50ZXBzID0gY21kT2JqLnRlcHM7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoJ3RodG1sJyBpbiBjbWRPYmopIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY21kT2JqLnRodG1sICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sIGludmFsaWQgdGh0bWwgb3B0aW9uICR7dXRpbC5pbnNwZWN0KGNtZE9iai50aHRtbCl9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvcHRpb25zLnRodG1sID0gY21kT2JqLnRodG1sO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCd0bGF0ZXgnIGluIGNtZE9iaikge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjbWRPYmoudGxhdGV4ICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sIGludmFsaWQgdGxhdGV4IG9wdGlvbiAke3V0aWwuaW5zcGVjdChjbWRPYmoudGxhdGV4KX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG9wdGlvbnMudGxhdGV4ID0gY21kT2JqLnRsYXRleDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgndHBkZicgaW4gY21kT2JqKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGNtZE9iai50cGRmICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sIGludmFsaWQgdHBkZiBvcHRpb24gJHt1dGlsLmluc3BlY3QoY21kT2JqLnRwZGYpfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3B0aW9ucy50cGRmID0gY21kT2JqLnRwZGY7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoJ3RwbmcnIGluIGNtZE9iaikge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjbWRPYmoudHBuZyAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBwbGFudHVtbCBpbnZhbGlkIHRwbmcgb3B0aW9uICR7dXRpbC5pbnNwZWN0KGNtZE9iai50cG5nKX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG9wdGlvbnMudHBuZyA9IGNtZE9iai50cG5nO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCd0c2N4bWwnIGluIGNtZE9iaikge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjbWRPYmoudHNjeG1sICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sIGludmFsaWQgdHNjeG1sIG9wdGlvbiAke3V0aWwuaW5zcGVjdChjbWRPYmoudHNjeG1sKX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG9wdGlvbnMudHNjeG1sID0gY21kT2JqLnRzY3htbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgndHN2ZycgaW4gY21kT2JqKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGNtZE9iai50c3ZnICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sIGludmFsaWQgdHN2ZyBvcHRpb24gJHt1dGlsLmluc3BlY3QoY21kT2JqLnRzdmcpfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3B0aW9ucy50c3ZnID0gY21kT2JqLnRzdmc7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoJ3R0eHQnIGluIGNtZE9iaikge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjbWRPYmoudHN2ZyAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBwbGFudHVtbCBpbnZhbGlkIHR0eHQgb3B0aW9uICR7dXRpbC5pbnNwZWN0KGNtZE9iai50dHh0KX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG9wdGlvbnMudHR4dCA9IGNtZE9iai50dHh0O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCd0dXR4dCcgaW4gY21kT2JqKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGNtZE9iai50dXR4dCAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBwbGFudHVtbCBpbnZhbGlkIHR1dHh0IG9wdGlvbiAke3V0aWwuaW5zcGVjdChjbWRPYmoudHV0eHQpfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3B0aW9ucy50dXR4dCA9IGNtZE9iai50dXR4dDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgndHZkeCcgaW4gY21kT2JqKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGNtZE9iai50dmR4ICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sIGludmFsaWQgdHZkeCBvcHRpb24gJHt1dGlsLmluc3BlY3QoY21kT2JqLnR2ZHgpfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3B0aW9ucy50dmR4ID0gY21kT2JqLnR2ZHg7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoJ3R4bWknIGluIGNtZE9iaikge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjbWRPYmoudHhtaSAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBwbGFudHVtbCBpbnZhbGlkIHR4bWkgb3B0aW9uICR7dXRpbC5pbnNwZWN0KGNtZE9iai50eG1pKX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG9wdGlvbnMudHhtaSA9IGNtZE9iai50eG1pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCd2ZXJib3NlJyBpbiBjbWRPYmopIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY21kT2JqLnZlcmJvc2UgIT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgcGxhbnR1bWwgaW52YWxpZCB2ZXJib3NlIG9wdGlvbiAke3V0aWwuaW5zcGVjdChjbWRPYmoudmVyYm9zZSl9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvcHRpb25zLnZlcmJvc2UgPSBjbWRPYmoudmVyYm9zZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluIHRoZSBzaW5nbGUtaW5wdXQgbW9kZXMsIHdoZW4gbm8gLS1vdXRwdXQtZmlsZSBpc1xuICAgICAgICAvLyBnaXZlbiB0aGUgcmVuZGVyZWQgb3V0cHV0IGlzIHJldHVybmVkIGFzIGEgQnVmZmVyLFxuICAgICAgICAvLyB3aGljaCBpcyB3cml0dGVuIHRvIHN0ZG91dC5cbiAgICAgICAgY29uc3QgYnVmID0gYXdhaXQgZG9QbGFudFVNTChvcHRpb25zKTtcbiAgICAgICAgaWYgKGJ1Zikge1xuICAgICAgICAgICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUoYnVmKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4vLyBUaGUgZWRpdGlvbnMgb2YgdGhlIFBsYW50VU1MIEpBUiBwdWJsaXNoZWQgb24gdGhlXG4vLyBQbGFudFVNTCByZWxlYXNlIHBhZ2UsIGFuZCB0aGUgZmlsZSBuYW1lIHBhdHRlcm5cbi8vIHVzZWQgZm9yIGVhY2ggZWRpdGlvbi5cbmNvbnN0IHBsYW50dW1sRWRpdGlvbnMgPSBbXG4gICAgJ2dwbCcsICdtaXQnLCAnbGdwbCcsICdhc2wnLCAnZXBsJywgJ2JzZCdcbl07XG5cbmZ1bmN0aW9uIHBsYW50dW1sSmFyTmFtZShlZGl0aW9uOiBzdHJpbmcsIHZlcnNpb246IHN0cmluZykge1xuICAgIHJldHVybiBlZGl0aW9uID09PSAnZ3BsJ1xuICAgICAgICA/IGBwbGFudHVtbC0ke3ZlcnNpb259LmphcmBcbiAgICAgICAgOiBgcGxhbnR1bWwtJHtlZGl0aW9ufS0ke3ZlcnNpb259LmphcmA7XG59XG5cbnByb2dyYW1cbiAgICAuY29tbWFuZCgncGxhbnR1bWwtZG93bmxvYWQnKVxuICAgIC5kZXNjcmlwdGlvbignRG93bmxvYWQgdGhlIFBsYW50VU1MIEpBUiBmaWxlIGZvciB1c2Ugd2l0aCB0aGUgUExBTlRVTUxfSkFSIGVudmlyb25tZW50IHZhcmlhYmxlJylcbiAgICAub3B0aW9uKCctLXBsYW50dW1sLXZlcnNpb24gPHZlcnNpb24+JywgJ1BsYW50VU1MIHZlcnNpb24sIHN1Y2ggYXMgMS4yMDI1LjAuICBEZWZhdWx0OiB0aGUgbGF0ZXN0IHJlbGVhc2UuJylcbiAgICAub3B0aW9uKCctLWVkaXRpb24gPGVkaXRpb24+JywgYEpBUiBlZGl0aW9uOiAke3BsYW50dW1sRWRpdGlvbnMuam9pbignLCAnKX1gLCAnbWl0JylcbiAgICAub3B0aW9uKCctLW91dHB1dC1kaXIgPG91dERpcj4nLCAnRGlyZWN0b3J5IGludG8gd2hpY2ggdGhlIEpBUiBpcyBkb3dubG9hZGVkJywgJy4nKVxuICAgIC5hY3Rpb24oYXN5bmMgKGNtZE9iaikgPT4ge1xuXG4gICAgICAgIGNvbnN0IGVkaXRpb24gPSBjbWRPYmouZWRpdGlvbjtcbiAgICAgICAgaWYgKCFwbGFudHVtbEVkaXRpb25zLmluY2x1ZGVzKGVkaXRpb24pKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sLWRvd25sb2FkOiB1bmtub3duIGVkaXRpb24gJHt1dGlsLmluc3BlY3QoZWRpdGlvbil9IC0gdXNlIG9uZSBvZiAke3BsYW50dW1sRWRpdGlvbnMuam9pbignLCAnKX1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCB2ZXJzaW9uID0gY21kT2JqLnBsYW50dW1sVmVyc2lvbjtcbiAgICAgICAgaWYgKHR5cGVvZiB2ZXJzaW9uICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgY29uc3QgcmVzID0gYXdhaXQgZmV0Y2goXG4gICAgICAgICAgICAgICAgJ2h0dHBzOi8vYXBpLmdpdGh1Yi5jb20vcmVwb3MvcGxhbnR1bWwvcGxhbnR1bWwvcmVsZWFzZXMvbGF0ZXN0Jyk7XG4gICAgICAgICAgICBpZiAoIXJlcy5vaykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgcGxhbnR1bWwtZG93bmxvYWQ6IGNvdWxkIG5vdCBkZXRlcm1pbmUgdGhlIGxhdGVzdCBQbGFudFVNTCByZWxlYXNlICgke3Jlcy5zdGF0dXN9ICR7cmVzLnN0YXR1c1RleHR9KSAtIHNwZWNpZnkgb25lIHdpdGggLS1wbGFudHVtbC12ZXJzaW9uYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCByZWxlYXNlID0gYXdhaXQgcmVzLmpzb24oKSBhcyB7IHRhZ19uYW1lOiBzdHJpbmcgfTtcbiAgICAgICAgICAgIHZlcnNpb24gPSByZWxlYXNlLnRhZ19uYW1lLnJlcGxhY2UoL152LywgJycpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgamFyTmFtZSA9IHBsYW50dW1sSmFyTmFtZShlZGl0aW9uLCB2ZXJzaW9uKTtcbiAgICAgICAgY29uc3QgdXJsID0gYGh0dHBzOi8vZ2l0aHViLmNvbS9wbGFudHVtbC9wbGFudHVtbC9yZWxlYXNlcy9kb3dubG9hZC92JHt2ZXJzaW9ufS8ke2phck5hbWV9YDtcblxuICAgICAgICBjb25zb2xlLmxvZyhgRG93bmxvYWRpbmcgJHt1cmx9YCk7XG4gICAgICAgIGNvbnN0IHJlcyA9IGF3YWl0IGZldGNoKHVybCk7XG4gICAgICAgIGlmICghcmVzLm9rKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sLWRvd25sb2FkOiBkb3dubG9hZCBvZiAke3VybH0gZmFpbGVkICgke3Jlcy5zdGF0dXN9ICR7cmVzLnN0YXR1c1RleHR9KWApO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGphclBhdGggPSBwYXRoLmpvaW4oY21kT2JqLm91dHB1dERpciwgamFyTmFtZSk7XG4gICAgICAgIGF3YWl0IGZzcC5ta2RpcihjbWRPYmoub3V0cHV0RGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgICAgYXdhaXQgZnNwLndyaXRlRmlsZShqYXJQYXRoLFxuICAgICAgICAgICAgQnVmZmVyLmZyb20oYXdhaXQgcmVzLmFycmF5QnVmZmVyKCkpKTtcblxuICAgICAgICBjb25zb2xlLmxvZyhgRG93bmxvYWRlZCAke2phclBhdGh9XG5cblRvIHVzZSB0aGlzIEpBUiBmb3IgUGxhbnRVTUwgcmVuZGVyaW5nLCBzZXQgdGhlIGVudmlyb25tZW50IHZhcmlhYmxlOlxuXG4gICAgZXhwb3J0IFBMQU5UVU1MX0pBUj0ke3BhdGgucmVzb2x2ZShqYXJQYXRoKX1cblxuUmVuZGVyaW5nIHdpdGggdGhlIEpBUiByZXF1aXJlcyBKYXZhIHRvIGJlIGluc3RhbGxlZCBhbmQgaW4geW91ciBQQVRILmApO1xuICAgIH0pO1xuXG5wcm9ncmFtXG4gICAgLmNvbW1hbmQoJ3BpbnRvcmEnKVxuICAgIC5kZXNjcmlwdGlvbignUmVuZGVyIFBpbnRvcmEgZmlsZXMnKVxuICAgIC5vcHRpb24oJy0taW5wdXQtZmlsZSA8aW5wdXRGTj4nLCAnUGF0aCBmb3IgZG9jdW1lbnQgdG8gcmVuZGVyJylcbiAgICAub3B0aW9uKCctLW91dHB1dC1maWxlIDxvdXRwdXRGTj4nLCAnUGF0aCBmb3IgcmVuZGVyZWQgZG9jdW1lbnQnKVxuICAgIC5vcHRpb24oJy0tcGl4ZWwtcmF0aW8gPHJhdGlvPicsICcnKVxuICAgIC5vcHRpb24oJy0tbWltZS10eXBlIDxtdD4nLCAnTUlNRSB0eXBlIGZvciBvdXRwdXQgZmlsZScpXG4gICAgLm9wdGlvbignLS1iZy1jb2xvciA8Y29sb3I+JywgJ1N0cmluZyBkZXNjcmliaW5nIGJhY2tncm91bmQgY29sb3InKVxuICAgIC5vcHRpb24oJy0td2lkdGggPG51bWJlcj4nLCAnV2lkdGggb2YgdGhlIG91dHB1dCwgaGVpZ2h0IHdpbGwgYmUgY2FsY3VsYXRlZCBhY2NvcmRpbmcgdG8gdGhlIGRpYWdyYW0gY29udGVudCByYXRpbycpXG4gICAgLmFjdGlvbihhc3luYyAoY21kT2JqKSA9PiB7XG4gICAgICAgIGNvbnN0IG9wdHM6IFBpbnRvcmFSZW5kZXJPcHRpb25zID0ge1xuICAgICAgICAgICAgY29kZTogJycsXG4gICAgICAgICAgICBvdXRwdXRGTjogJydcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAodHlwZW9mIGNtZE9iai5pbnB1dEZpbGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBvcHRzLmNvZGUgPSBhd2FpdCBmc3AucmVhZEZpbGUoY21kT2JqLmlucHV0RmlsZSwgJ3V0Zi04Jyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIGlucHV0IGZpbGUgc3BlY2lmaWVkJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGNtZE9iai5vdXRwdXRGaWxlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgb3B0cy5vdXRwdXRGTiA9IGNtZE9iai5vdXRwdXRGaWxlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdObyBvdXRwdXQgZmlsZSBzcGVjaWZpZWQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgY21kT2JqLnBpeGVsUmF0aW8gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBvcHRzLmRldmljZVBpeGVsUmF0aW8gPSBOdW1iZXIucGFyc2VGbG9hdChjbWRPYmoucGl4ZWxSYXRpbyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBvcHRzLmRldmljZVBpeGVsUmF0aW8gIT09ICd1bmRlZmluZWQnXG4gICAgICAgICAmJiBpc05hTihvcHRzLmRldmljZVBpeGVsUmF0aW8pKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgZGV2aWNlIHBpeGVsIHJhdGlvICR7dXRpbC5pbnNwZWN0KGNtZE9iai5waXhlbFJhdGlvKX1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgY21kT2JqLm1pbWVUeXBlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICAgIGNtZE9iai5taW1lVHlwZSA9PT0gJ2ltYWdlL3N2Zyt4bWwnXG4gICAgICAgICAgICAgfHwgY21kT2JqLm1pbWVUeXBlID09PSAnaW1hZ2UvanBlZydcbiAgICAgICAgICAgICB8fCBjbWRPYmoubWltZVR5cGUgPT09ICdpbWFnZS9wbmcnXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICBvcHRzLm1pbWVUeXBlID0gY21kT2JqLm1pbWVUeXBlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgTUlNRSB0eXBlICR7dXRpbC5pbnNwZWN0KGNtZE9iai5taW1lVHlwZSl9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGNtZE9iai5iZ0NvbG9yID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgb3B0cy5iYWNrZ3JvdW5kQ29sb3IgPSBjbWRPYmouYmdDb2xvcjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgY21kT2JqLndpZHRoID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgb3B0cy53aWR0aCA9IE51bWJlci5wYXJzZUZsb2F0KGNtZE9iai53aWR0aCk7XG4gICAgICAgICAgICBpZiAoaXNOYU4ob3B0cy53aWR0aCkpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGRpYWdyYW1zLXBpbnRvcmE6IHdpZHRoIGlzIG5vdCBhIG51bWJlciAke2NtZE9iai53aWR0aH1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIG9wdHMucmVuZGVySW5TdWJwcm9jZXNzID0gZmFsc2U7XG5cbiAgICAgICAgYXdhaXQgZG9QaW50b3JhKG9wdHMpO1xuICAgIH0pO1xuXG5cbnByb2dyYW1cbiAgICAuY29tbWFuZCgnbWVybWFpZCcpXG4gICAgLmRlc2NyaXB0aW9uKCdSZW5kZXIgTWVybWFpZCBmaWxlcyB0byBTVkcnKVxuICAgIC5vcHRpb24oJy0taW5wdXQtZmlsZSA8aW5wdXRGTj4nLCAnUGF0aCBmb3IgZG9jdW1lbnQgdG8gcmVuZGVyJylcbiAgICAub3B0aW9uKCctLW91dHB1dC1maWxlIDxvdXRwdXRGTj4nLCAnUGF0aCBmb3IgcmVuZGVyZWQgU1ZHIGRvY3VtZW50JylcbiAgICAub3B0aW9uKCctLWNvbmZpZyA8Y29uZmlnRk4+JywgJ1BhdGggZm9yIGEgSlNPTiBjb25maWcgZmlsZSAodGhlbWUsIHRoZW1lVmFyaWFibGVzLCBmbG93Y2hhcnQsIC4uLiknKVxuICAgIC5vcHRpb24oJy0tdGhlbWUgPHRoZW1lPicsICdUaGVtZSBwcmVzZXQ6IGRlZmF1bHQsIGRhcmssIGZvcmVzdCwgbmV1dHJhbCwgb3IgbW9kZXJuJylcbiAgICAub3B0aW9uKCctLWZvbnQgPGZvbnRGTi4uLj4nLCAnVFRGL09URiBmb250IGZpbGUocykgdG8gcmVnaXN0ZXIgZm9yIHRleHQgbWVhc3VyZW1lbnQnKVxuICAgIC5hY3Rpb24oYXN5bmMgKGNtZE9iaikgPT4ge1xuICAgICAgICBjb25zdCBvcHRzOiBNZXJtYWlkUmVuZGVyT3B0aW9ucyA9IHtcbiAgICAgICAgICAgIGNvZGU6ICcnLFxuICAgICAgICAgICAgb3V0cHV0Rk46ICcnXG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHR5cGVvZiBjbWRPYmouaW5wdXRGaWxlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgb3B0cy5jb2RlID0gYXdhaXQgZnNwLnJlYWRGaWxlKGNtZE9iai5pbnB1dEZpbGUsICd1dGYtOCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdObyBpbnB1dCBmaWxlIHNwZWNpZmllZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBjbWRPYmoub3V0cHV0RmlsZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIG9wdHMub3V0cHV0Rk4gPSBjbWRPYmoub3V0cHV0RmlsZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTm8gb3V0cHV0IGZpbGUgc3BlY2lmaWVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFvcHRzLm91dHB1dEZOLmVuZHNXaXRoKCcuc3ZnJykpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgbWVybWFpZCBvdXRwdXQtZmlsZSBtdXN0IGhhdmUgLnN2ZyBleHRlbnNpb24gJHt1dGlsLmluc3BlY3Qob3B0cy5vdXRwdXRGTil9YCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGNtZE9iai5jb25maWcgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBvcHRzLmNvbmZpZ0pTT04gPSBhd2FpdCBmc3AucmVhZEZpbGUoY21kT2JqLmNvbmZpZywgJ3V0Zi04Jyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGNtZE9iai50aGVtZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIG9wdHMudGhlbWVQcmVzZXQgPSBjbWRPYmoudGhlbWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShjbWRPYmouZm9udCkpIHtcbiAgICAgICAgICAgIG9wdHMuZm9udEZOcyA9IGNtZE9iai5mb250O1xuICAgICAgICB9XG5cbiAgICAgICAgYXdhaXQgZG9NZXJtYWlkKG9wdHMpO1xuICAgIH0pO1xuXG5wcm9ncmFtLnBhcnNlKCk7XG4iXX0=