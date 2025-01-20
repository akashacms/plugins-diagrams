const __dirname = import.meta.dirname;
import util from 'node:util';
// import packageConfig from '../package.json' with { type: 'json' }; 
import { doPlantUMLLocal, isValidCharset } from './index.js';
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
    const options = {
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
    });
    await doPlantUMLLocal(options);
});
program.parse();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vbGliL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQztBQUl0QyxPQUFPLElBQUksTUFBTSxXQUFXLENBQUM7QUFFN0Isc0VBQXNFO0FBRXRFLE9BQU8sRUFBcUIsZUFBZSxFQUFFLGNBQWMsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUVoRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBQ3BDLE1BQU0sT0FBTyxHQUFHLElBQUksT0FBTyxFQUFFLENBQUM7QUFFOUIsMERBQTBEO0FBQzFELGVBQWU7QUFDZixhQUFhO0FBRWIsb0NBQW9DO0FBQ3BDLFVBQVU7QUFDVixzQ0FBc0M7QUFDdEMseURBQXlEO0FBRXpELE9BQU87S0FDRixPQUFPLENBQUMsVUFBVSxDQUFDO0tBQ25CLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBQztLQUNwQyxNQUFNLENBQUMsMkJBQTJCLEVBQUUsNkJBQTZCLENBQUM7S0FDbEUsTUFBTSxDQUFDLDBCQUEwQixFQUFFLDRCQUE0QixDQUFDO0tBQ2hFLE1BQU0sQ0FBQyxxQkFBcUIsRUFBRSxpREFBaUQsQ0FBQztJQUNqRix3RUFBd0U7SUFDeEUsdURBQXVEO0tBQ3RELE1BQU0sQ0FBQyxZQUFZLEVBQUUsK0JBQStCLENBQUM7S0FDckQsTUFBTSxDQUFDLGFBQWEsRUFBRSxxQ0FBcUMsQ0FBQztJQUM3RCxrRUFBa0U7SUFDbEUsOEJBQThCO0lBQzlCLGtFQUFrRTtJQUNsRSxzREFBc0Q7SUFDdEQsc0ZBQXNGO0lBQ3RGLGlGQUFpRjtJQUNqRiwyRkFBMkY7SUFDM0YsaUVBQWlFO0tBQ2hFLE1BQU0sQ0FBQyxxQkFBcUIsRUFBRSxnREFBZ0QsQ0FBQztJQUNoRixxREFBcUQ7SUFDckQsNkVBQTZFO0lBQzdFLDJFQUEyRTtJQUMzRSx5REFBeUQ7SUFDekQsa0VBQWtF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QU8sTUFBTSxDQUFDLE9BQU8sS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUN0QyxNQUFNLElBQUksS0FBSyxDQUFDLG1DQUFtQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDdkYsQ0FBQztRQUNELE9BQU8sQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQztJQUNyQyxDQUFDO0lBRUQsT0FBTyxDQUFDLEdBQUcsQ0FBQztRQUNSLE1BQU0sRUFBRSxPQUFPO0tBQ2xCLENBQUMsQ0FBQTtJQUVGLE1BQU0sZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ25DLENBQUMsQ0FBQyxDQUFDO0FBR1AsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiXG5jb25zdCBfX2Rpcm5hbWUgPSBpbXBvcnQubWV0YS5kaXJuYW1lO1xuXG5pbXBvcnQgeyBwcm9taXNlcyBhcyBmc3AsIGNvbnN0YW50cyB9IGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHBhdGgsIHsgcGFyc2UgfSBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IHV0aWwgZnJvbSAnbm9kZTp1dGlsJztcblxuLy8gaW1wb3J0IHBhY2thZ2VDb25maWcgZnJvbSAnLi4vcGFja2FnZS5qc29uJyB3aXRoIHsgdHlwZTogJ2pzb24nIH07IFxuXG5pbXBvcnQgeyBkb1BsYW50VU1MT3B0aW9ucywgZG9QbGFudFVNTExvY2FsLCBpc1ZhbGlkQ2hhcnNldCB9IGZyb20gJy4vaW5kZXguanMnO1xuXG5pbXBvcnQgeyBDb21tYW5kIH0gZnJvbSAnY29tbWFuZGVyJztcbmNvbnN0IHByb2dyYW0gPSBuZXcgQ29tbWFuZCgpO1xuXG4vLyBQUk9HIHBsYW50dW1sIC0taW5wdXQgLi4gLS1vdXRwdXQgLi4gLS1vdGhlci1vcHRpb25zIC4uXG4vLyBQUk9HIG1lcm1haWRcbi8vIFBST0cga2F0ZXhcblxuLy8gcHJvZ3JhbS5uYW1lKHBhY2thZ2VDb25maWcubmFtZSk7XG4vLyBwcm9ncmFtXG4vLyAgICAgLnZlcnNpb24ocGFja2FnZUNvbmZpZy52ZXJzaW9uLFxuLy8gICAgICAgICAnLXYsIC0tdmVyc2lvbicsICdvdXRwdXQgdGhlIGN1cnJlbnQgdmVyc2lvbicpXG5cbnByb2dyYW1cbiAgICAuY29tbWFuZCgncGxhbnR1bWwnKVxuICAgIC5kZXNjcmlwdGlvbignUmVuZGVyIFBsYW50VU1MIGZpbGVzJylcbiAgICAub3B0aW9uKCctLWlucHV0LWZpbGUgPGlucHV0Rk4uLi4+JywgJ1BhdGggZm9yIGRvY3VtZW50IHRvIHJlbmRlcicpXG4gICAgLm9wdGlvbignLS1vdXRwdXQtZmlsZSA8b3V0cHV0Rk4+JywgJ1BhdGggZm9yIHJlbmRlcmVkIGRvY3VtZW50JylcbiAgICAub3B0aW9uKCctLWNoYXJzZXQgPGNoYXJzZXQ+JywgJ1RvIHVzZSBhIHNwZWNpZmljIGNoYXJhY3RlciBzZXQuIERlZmF1bHQ6IFVURi04JylcbiAgICAvLyBUT0RPIC0tY2hlY2ttZXRhZGF0YSBTa2lwIFBORyBmaWxlcyB0aGF0IGRvbid0IG5lZWQgdG8gYmUgcmVnZW5lcmF0ZWRcbiAgICAvLyBUT0RPIC1EdmFyPXZhbHVlIHNob3VsZCBiZSAtLWRlZmluZSA8ZGVmVmFyVmFsdWUuLi4+XG4gICAgLm9wdGlvbignLS1kYXJrbW9kZScsICdUbyB1c2UgZGFyayBtb2RlIGZvciBkaWFncmFtcycpXG4gICAgLm9wdGlvbignLS1kZWJ1Z3N2ZWsnLCAnVG8gZ2VuZXJhdGUgaW50ZXJtZWRpYXRlIHN2ZWsgZmlsZXMnKVxuICAgIC8vIFRPRE8gLS1leGNsdWRlIHBhdHRlcm4gYWJvdXQgZXhjbHVkaW5nIGZpbGVzIGZyb20gY29uc2lkZXJhdGlvblxuICAgIC8vICAgICAgICAgIGJhc2VkIG9uIGEgcGF0dGVyblxuICAgIC8vIFRPRE8gLS1kaXNhYmxlc3RhdHMgVG8gZGlzYWJsZSBzdGF0aXN0aWNzIGNvbXB1dGF0aW9uIChkZWZhdWx0KVxuICAgIC8vIFRPRE8gLS1lbmFibGVzdGF0cyBUbyBlbmFibGUgc3RhdGlzdGljcyBjb21wdXRhdGlvblxuICAgIC8vIFRPRE8gLS1lbmNvZGVzcHJpdGUgNHw4fDE2IFwiZmlsZVwiICBUbyBlbmNvZGUgYSBzcHJpdGUgYXQgYSBncmF5IGxldmVsIGZyb20gYW4gaW1hZ2VcbiAgICAvLyBUT0RPIC0tZmFpbGZhc3QgVG8gc3RvcCBwcm9jZXNzaW5nIGFzIHNvb24gYXMgYSBzeW50YXggZXJyb3IgaW4gZGlhZ3JhbSBvY2N1cnNcbiAgICAvLyBUT0RPIC0tZmFpbGZhc3QyIFRvIGRvIGEgZmlyc3Qgc3ludGF4IGNoZWNrIGJlZm9yZSBwcm9jZXNzaW5nIGZpbGVzLCB0byBmYWlsIGV2ZW4gZmFzdGVyXG4gICAgLy8gVE9ETyAtLWZpbGVkaXIgPGRpck5tPiBUbyBiZWhhdmUgYXMgaWYgUGxhbnRVTUwgaXMgaW4gdGhpcyBkaXJcbiAgICAub3B0aW9uKCctLWZpbGVuYW1lIDxmaWxlTm0+JywgJ1wiZXhhbXBsZS5wdW1sXCIgVG8gb3ZlcnJpZGUgJWZpbGVuYW1lJSB2YXJpYWJsZScpXG4gICAgLy8gVE9ETyAtLWdyYXBodml6ZG90IFwiZXhlXCIgVG8gc3BlY2lmeSBkb3QgZXhlY3V0YWJsZVxuICAgIC8vIFRPRE8gLS1odG1sc3RhdHMgIFRvIG91dHB1dCBnZW5lcmFsIHN0YXRpc3RpY3MgaW4gZmlsZSBwbGFudHVtbC1zdGF0cy5odG1sXG4gICAgLy8gVE9ETyAtSS9wYXRoL3RvL2ZpbGUgICAgIFRvIGluY2x1ZGUgZmlsZSBhcyBpZiAnIWluY2x1ZGUgZmlsZScgd2VyZSB1c2VkXG4gICAgLy8gVE9ETyAtSS9wYXRoL3RvLyoucHVtbCAgIFRvIGluY2x1ZGUgZmlsZXMgd2l0aCBwYXR0ZXJuXG4gICAgLy8gVE9ETyAtbGFuZ3VhZ2UgICAgICAgICAgIFRvIHByaW50IHRoZSBsaXN0IG9mIFBsYW50VU1MIGtleXdvcmRzXG4gICAgLy8gVE9ETyAtbG9vcHN0YXRzICAgICAgICAgIFRvIGNvbnRpbnVvdXNseSBwcmludCBzdGF0aXN0aWNzIGFib3V0IHVzYWdlXG4gICAgLy8gVE9ETyAtbWV0YWRhdGEgICAgICAgICAgIFRvIHJldHJpZXZlIFBsYW50VU1MIHNvdXJjZXMgZnJvbSBQTkcgaW1hZ2VzXG4gICAgLm9wdGlvbignLS1uYnRocmVhZCA8blRocmVhZHM+JywgJ1RvIHVzZSAoTikgdGhyZWFkcyBmb3IgcHJvY2Vzc2luZy4gIFVzZSBcImF1dG9cIiBmb3IgNCB0aHJlYWRzLicpXG4gICAgLy8gVE9ETyAtbm9lcnJvciAgICAgICAgICAgIFRvIHNraXAgaW1hZ2VzIHdoZW4gZXJyb3IgaW4gZGlhZ3JhbXNcbiAgICAub3B0aW9uKCctLW5vbWV0YWRhdGEnLCAnVG8gTk9UIGV4cG9ydCBtZXRhZGF0YSBpbiBQTkcvU1ZHIGdlbmVyYXRlZCBmaWxlcycpXG4gICAgLm9wdGlvbignLS1vdXRwdXQtZGlyIDxvdXREaXI+JywgJ1RvIGdlbmVyYXRlIGltYWdlcyBpbiB0aGUgc3BlY2lmaWVkIGRpcmVjdG9yeScpXG4gICAgLy8gLm9wdGlvbignLS1vdmVyd3JpdGUnLCAnVG8gYWxsb3cgdG8gb3ZlcndyaXRlIHJlYWQgb25seSBmaWxlcycpXG4gICAgLy8gVE9ETyAtUHByYWdtYTE9dmFsdWUgICAgIFRvIHNldCBwcmFnbWEgYXMgaWYgJyFwcmFnbWEgcHJhZ21hMSB2YWx1ZScgd2VyZSB1c2VkXG4gICAgLy8gVE9ETyAtcFtpcGVdICAgICAgICAgICAgIFRvIHVzZSBzdGRpbiBmb3IgUGxhbnRVTUwgc291cmNlIGFuZCBzdGRvdXQgZm9yIFBORy9TVkcvRVBTIGdlbmVyYXRpb25cbiAgICAvLyBUT0RPIC1waWNvd2ViICAgICAgICAgICAgVG8gc3RhcnQgaW50ZXJuYWwgSFRUUCBTZXJ2ZXIuIFNlZSBodHRwczovL3BsYW50dW1sLmNvbS9waWNvd2ViXG4gICAgLy8gVE9ETyAtcGlwZWltYWdlaW5kZXggTiAgIFRvIGdlbmVyYXRlIHRoZSBOdGggaW1hZ2Ugd2l0aCBwaXBlIG9wdGlvblxuICAgIC8vIFRPRE8gLXByZXByb2MgICAgICAgICAgICBUbyBvdXRwdXQgcHJlcHJvY2Vzc29yIHRleHQgb2YgZGlhZ3JhbXNcbiAgICAvLyBUT0RPIC1wcmludGZvbnRzICAgICAgICAgVG8gcHJpbnQgZm9udHMgYXZhaWxhYmxlIG9uIHlvdXIgc3lzdGVtXG4gICAgLy8gVE9ETyAtcHJvZ3Jlc3MgICAgICAgICAgIFRvIGRpc3BsYXkgYSB0ZXh0dWFsIHByb2dyZXNzIGJhciBpbiBjb25zb2xlXG4gICAgLy8gVE9ETyAtcXVpZXQgICAgICAgICAgICAgIFRvIE5PVCBwcmludCBlcnJvciBtZXNzYWdlIGludG8gdGhlIGNvbnNvbGVcbiAgICAvLyBUT0RPIC1yZWFsdGltZXN0YXRzICAgICAgVG8gZ2VuZXJhdGUgc3RhdGlzdGljcyBvbiB0aGUgZmx5IHJhdGhlciB0aGFuIGF0IHRoZSBlbmRcbiAgICAvLyBUT0RPIC1TcGFyYW0xPXZhbHVlICAgICAgVG8gc2V0IGEgc2tpbiBwYXJhbWV0ZXIgYXMgaWYgJ3NraW5wYXJhbSBwYXJhbTEgdmFsdWUnIHdlcmUgdXNlZFxuICAgIC8vIFRPRE8gLXNwbGFzaCAgICAgICAgICAgICBUbyBkaXNwbGF5IGEgc3BsYXNoIHNjcmVlbiB3aXRoIHNvbWUgcHJvZ3Jlc3MgYmFyXG4gICAgLy8gVE9ETyAtc3RkbGliICAgICAgICAgICAgIFRvIHByaW50IHN0YW5kYXJkIGxpYnJhcnkgaW5mb1xuICAgIC8vIFRPRE8gLXN5bnRheCAgICAgICAgICAgICBUbyByZXBvcnQgYW55IHN5bnRheCBlcnJvciBmcm9tIHN0YW5kYXJkIGlucHV0IHdpdGhvdXQgZ2VuZXJhdGluZyBpbWFnZXNcbiAgICAvLyBUT0RPIC10ZXN0ZG90ICAgICAgICAgICAgVG8gdGVzdCB0aGUgaW5zdGFsbGF0aW9uIG9mIGdyYXBodml6XG4gICAgLy8gVE9ETyAtdGhlbWUgeHh4ICAgICAgICAgIFRvIHVzZSBhIHNwZWNpZmljIHRoZW1lXG4gICAgLy8gVE9ETyAtdGltZW91dCBOICAgICAgICAgIFByb2Nlc3NpbmcgdGltZW91dCBpbiAoTikgc2Vjb25kcy4gRGVmYXVsdHMgdG8gMTUgbWludXRlcyAoOTAwIHNlY29uZHMpLlxuICAgIC5vcHRpb24oJy0tdGVwcycsICdUbyBnZW5lcmF0ZSBpbWFnZXMgdXNpbmcgRVBTIGZvcm1hdCcpXG4gICAgLm9wdGlvbignLS10aHRtbCcsICdUbyBnZW5lcmF0ZSBIVE1MIGZpbGUgZm9yIGNsYXNzIGRpYWdyYW0nKVxuICAgIC8vIFRPRE8gLXRsYXRleDpub3ByZWFtYmxlICBUbyBnZW5lcmF0ZSBpbWFnZXMgdXNpbmcgTGFUZVgvVGlreiBmb3JtYXQgd2l0aG91dCBwcmVhbWJsZVxuICAgIC5vcHRpb24oJy0tdGxhdGV4JywgJ1RvIGdlbmVyYXRlIGltYWdlcyB1c2luZyBMYVRlWC9UaWt6IGZvcm1hdCcpXG4gICAgLm9wdGlvbignLS10cGRmJywgJ1RvIGdlbmVyYXRlIGltYWdlcyB1c2luZyBQREYgZm9ybWF0JylcbiAgICAub3B0aW9uKCctLXRwbmcnLCAnVG8gZ2VuZXJhdGUgaW1hZ2VzIHVzaW5nIFBORyBmb3JtYXQgKGRlZmF1bHQpJylcbiAgICAub3B0aW9uKCctLXRzY3htbCcsICdUbyBnZW5lcmF0ZSBTQ1hNTCBmaWxlIGZvciBzdGF0ZSBkaWFncmFtJylcbiAgICAub3B0aW9uKCctLXRzdmcnLCAnVG8gZ2VuZXJhdGUgaW1hZ2VzIHVzaW5nIFNWRyBmb3JtYXQnKVxuICAgIC5vcHRpb24oJy0tdHR4dCcsICdUbyBnZW5lcmF0ZSBpbWFnZXMgd2l0aCBBU0NJSSBhcnQnKVxuICAgIC5vcHRpb24oJy0tdHV0eHQnLCAnVG8gZ2VuZXJhdGUgaW1hZ2VzIHdpdGggQVNDSUkgYXJ0IHVzaW5nIFVuaWNvZGUgY2hhcmFjdGVycycpXG4gICAgLm9wdGlvbignLS10dmR4JywgJ1RvIGdlbmVyYXRlIGltYWdlcyB1c2luZyBWRFggZm9ybWF0JylcbiAgICAub3B0aW9uKCctLXR4bWknLCAnVG8gZ2VuZXJhdGUgWE1JIGZpbGUgZm9yIGNsYXNzIGRpYWdyYW0nKVxuICAgIC5vcHRpb24oJy0tdmVyYm9zZScsICdUbyBoYXZlIGxvZyBpbmZvcm1hdGlvbicpXG4gICAgLy8gVE9ETyAteG1sc3RhdHMgICAgICAgICAgIFRvIG91dHB1dCBnZW5lcmFsIHN0YXRpc3RpY3MgaW4gZmlsZSBwbGFudHVtbC1zdGF0cy54bWxcbiAgICAuYWN0aW9uKGFzeW5jIChjbWRPYmopID0+IHtcblxuICAgICAgICBjb25zdCBvcHRpb25zOiBkb1BsYW50VU1MT3B0aW9ucyA9IHtcbiAgICAgICAgICAgIC8vIGlucHV0Qm9keSBkb2VzIG5vdCBtYWtlIHNlbnNlIGZvciBDTElcbiAgICAgICAgICAgIC8vIGlucHV0Qm9keTogdHlwZW9mIGlucHV0Rk4gPT09ICdzdHJpbmcnXG4gICAgICAgICAgICAvLyAgICAgICAgID8gYXdhaXQgZnNwLnJlYWRGaWxlKGlucHV0Rk4sICd1dGYtOCcpXG4gICAgICAgICAgICAvLyAgICAgICAgIDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgaW5wdXRGTnM6IGNtZE9iai5pbnB1dEZpbGUsXG4gICAgICAgICAgICBvdXRwdXRGTjogY21kT2JqLm91dHB1dEZpbGVcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoY21kT2JqLmNoYXJzZXQpIHtcbiAgICAgICAgICAgIGlmICghaXNWYWxpZENoYXJzZXQoY21kT2JqLmNoYXJzZXQpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBwbGFudHVtbCBjaGFyc2V0ICR7dXRpbC5pbnNwZWN0KGNtZE9iai5jaGFyc2V0KX0gdW5rbm93bmApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3B0aW9ucy5jaGFyc2V0ID0gY21kT2JqLmNoYXJzZXQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY21kT2JqLm5idGhyZWFkKSB7XG4gICAgICAgICAgICBpZiAoY21kT2JqLm5idGhyZWFkICE9PSAnYXV0bycpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBudCA9IE51bWJlci5wYXJzZUludChjbWRPYmoubmJ0aHJlYWQpO1xuICAgICAgICAgICAgICAgIGlmIChpc05hTihudCkgfHwgbnQgPCAwIHx8IG50ID4gMTYpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBwbGFudHVtbCBuYnRocmVhZCAke3V0aWwuaW5zcGVjdChjbWRPYmoubmJ0aHJlYWQpfSBpbnZhbGlkYCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3B0aW9ucy5uYnRocmVhZCA9IGNtZE9iai5uYnRocmVhZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgnZGFya21vZGUnIGluIGNtZE9iaikge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjbWRPYmouZGFya21vZGUgIT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgcGxhbnR1bWwgaW52YWxpZCBkYXJrbW9kZSBvcHRpb24gJHt1dGlsLmluc3BlY3QoY21kT2JqLmRhcmttb2RlKX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG9wdGlvbnMuZGFya21vZGUgPSBjbWRPYmouZGFya21vZGU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoJ2RlYnVnc3ZlaycgaW4gY21kT2JqKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGNtZE9iai5kZWJ1Z3N2ZWsgIT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgcGxhbnR1bWwgaW52YWxpZCBkZWJ1Z3N2ZWsgb3B0aW9uICR7dXRpbC5pbnNwZWN0KGNtZE9iai5kZWJ1Z3N2ZWspfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3B0aW9ucy5kZWJ1Z3N2ZWsgPSBjbWRPYmouZGVidWdzdmVrO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCdmaWxlbmFtZScgaW4gY21kT2JqKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGNtZE9iai5maWxlbmFtZSAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBwbGFudHVtbCBpbnZhbGlkIGZpbGVuYW1lIG9wdGlvbiAke3V0aWwuaW5zcGVjdChjbWRPYmouZmlsZW5hbWUpfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3B0aW9ucy5maWxlTmFtZU92ZXJyaWRlID0gY21kT2JqLmZpbGVuYW1lO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCdub21ldGFkYXRhJyBpbiBjbWRPYmopIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY21kT2JqLm5vbWV0YWRhdGEgIT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgcGxhbnR1bWwgaW52YWxpZCBub21ldGFkYXRhIG9wdGlvbiAke3V0aWwuaW5zcGVjdChjbWRPYmoubm9tZXRhZGF0YSl9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvcHRpb25zLm5vbWV0YWRhdGEgPSBjbWRPYmoubm9tZXRhZGF0YTtcbiAgICAgICAgfVxuXG4gICAgICAgIG9wdGlvbnMub3V0cHV0RGlyID0gY21kT2JqLm91dHB1dERpcjtcblxuICAgICAgICBpZiAoJ3RlcHMnIGluIGNtZE9iaikge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjbWRPYmoudGVwcyAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBwbGFudHVtbCBpbnZhbGlkIHRlcHMgb3B0aW9uICR7dXRpbC5pbnNwZWN0KGNtZE9iai50ZXBzKX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG9wdGlvbnMudGVwcyA9IGNtZE9iai50ZXBzO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCd0aHRtbCcgaW4gY21kT2JqKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGNtZE9iai50aHRtbCAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBwbGFudHVtbCBpbnZhbGlkIHRodG1sIG9wdGlvbiAke3V0aWwuaW5zcGVjdChjbWRPYmoudGh0bWwpfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3B0aW9ucy50aHRtbCA9IGNtZE9iai50aHRtbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgndGxhdGV4JyBpbiBjbWRPYmopIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY21kT2JqLnRsYXRleCAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBwbGFudHVtbCBpbnZhbGlkIHRsYXRleCBvcHRpb24gJHt1dGlsLmluc3BlY3QoY21kT2JqLnRsYXRleCl9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvcHRpb25zLnRsYXRleCA9IGNtZE9iai50bGF0ZXg7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoJ3RwZGYnIGluIGNtZE9iaikge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjbWRPYmoudHBkZiAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBwbGFudHVtbCBpbnZhbGlkIHRwZGYgb3B0aW9uICR7dXRpbC5pbnNwZWN0KGNtZE9iai50cGRmKX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG9wdGlvbnMudHBkZiA9IGNtZE9iai50cGRmO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCd0cG5nJyBpbiBjbWRPYmopIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY21kT2JqLnRwbmcgIT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgcGxhbnR1bWwgaW52YWxpZCB0cG5nIG9wdGlvbiAke3V0aWwuaW5zcGVjdChjbWRPYmoudHBuZyl9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvcHRpb25zLnRwbmcgPSBjbWRPYmoudHBuZztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgndHNjeG1sJyBpbiBjbWRPYmopIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY21kT2JqLnRzY3htbCAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBwbGFudHVtbCBpbnZhbGlkIHRzY3htbCBvcHRpb24gJHt1dGlsLmluc3BlY3QoY21kT2JqLnRzY3htbCl9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvcHRpb25zLnRzY3htbCA9IGNtZE9iai50c2N4bWw7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoJ3RzdmcnIGluIGNtZE9iaikge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjbWRPYmoudHN2ZyAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBwbGFudHVtbCBpbnZhbGlkIHRzdmcgb3B0aW9uICR7dXRpbC5pbnNwZWN0KGNtZE9iai50c3ZnKX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG9wdGlvbnMudHN2ZyA9IGNtZE9iai50c3ZnO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCd0dHh0JyBpbiBjbWRPYmopIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY21kT2JqLnRzdmcgIT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgcGxhbnR1bWwgaW52YWxpZCB0dHh0IG9wdGlvbiAke3V0aWwuaW5zcGVjdChjbWRPYmoudHR4dCl9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvcHRpb25zLnR0eHQgPSBjbWRPYmoudHR4dDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgndHV0eHQnIGluIGNtZE9iaikge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjbWRPYmoudHV0eHQgIT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgcGxhbnR1bWwgaW52YWxpZCB0dXR4dCBvcHRpb24gJHt1dGlsLmluc3BlY3QoY21kT2JqLnR1dHh0KX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG9wdGlvbnMudHV0eHQgPSBjbWRPYmoudHV0eHQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoJ3R2ZHgnIGluIGNtZE9iaikge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjbWRPYmoudHZkeCAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBwbGFudHVtbCBpbnZhbGlkIHR2ZHggb3B0aW9uICR7dXRpbC5pbnNwZWN0KGNtZE9iai50dmR4KX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG9wdGlvbnMudHZkeCA9IGNtZE9iai50dmR4O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCd0eG1pJyBpbiBjbWRPYmopIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY21kT2JqLnR4bWkgIT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgcGxhbnR1bWwgaW52YWxpZCB0eG1pIG9wdGlvbiAke3V0aWwuaW5zcGVjdChjbWRPYmoudHhtaSl9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvcHRpb25zLnR4bWkgPSBjbWRPYmoudHhtaTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgndmVyYm9zZScgaW4gY21kT2JqKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGNtZE9iai52ZXJib3NlICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHBsYW50dW1sIGludmFsaWQgdmVyYm9zZSBvcHRpb24gJHt1dGlsLmluc3BlY3QoY21kT2JqLnZlcmJvc2UpfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3B0aW9ucy52ZXJib3NlID0gY21kT2JqLnZlcmJvc2U7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zb2xlLmxvZyh7XG4gICAgICAgICAgICBjbWRPYmosIG9wdGlvbnNcbiAgICAgICAgfSlcblxuICAgICAgICBhd2FpdCBkb1BsYW50VU1MTG9jYWwob3B0aW9ucyk7XG4gICAgfSk7XG5cblxucHJvZ3JhbS5wYXJzZSgpO1xuIl19