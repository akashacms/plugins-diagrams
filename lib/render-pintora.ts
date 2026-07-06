
import path from 'node:path';
import { promises as fsp } from 'node:fs';
import util from 'node:util';
import { encode } from 'html-entities';
import { render, PintoraConfig } from '@pintora/cli';
import * as akasha from 'akasharender';
import { adaptInlineSvg } from './render-mermaid.js';

export type PintoraRenderOptions = {
    /**
     * pintora DSL code to render
     */
    code: string
    devicePixelRatio?: number | null
    /**
     * Type for the output file
     * 
    // image/svg+xml
    // image/jpeg
    // image/png
     */
    mimeType?: string
    /**
     * Assign extra background color
     */
    backgroundColor?: string
    pintoraConfig?: Partial<PintoraConfig>
    /**
     * width of the output, height will be calculated according to the diagram content ratio
     */
    width?: number
    /**
     * Whether we should run render in a subprocess rather in current process.
     * If you call the `render` function, by default this is true, to avoid polluting the global environment.
     */
    renderInSubprocess?: boolean

    outputFN: string;
};

export async function doPintora(
    options: PintoraRenderOptions
): Promise<void> {
    const renderOpts = structuredClone(options);
    delete renderOpts.outputFN;

    const buf = await render(renderOpts);

    if (options.outputFN) {
        await fsp.writeFile(options.outputFN, buf);
    } else {
        throw new Error(`No output file FN ${util.inspect(options)}`);
    }
}

/**
 * Handle converting a single Pintora diagram for display
 * in a document, from the <diagrams-pintora> element.
 *
 * The diagram is either inline in the element body or in
 * the file named by the input-file attribute.  With an
 * output-file attribute the rendered image is written to
 * that file in the format named by the mime-type
 * attribute (PNG by default), and referenced with <img>
 * in the generated HTML.
 *
 * When there is no output-file attribute, the diagram is
 * rendered as inline SVG embedded in the generated HTML.
 * This mode supports only SVG - a mime-type of image/png
 * or image/jpeg is an error, since binary images cannot
 * be embedded inline.
 */
export class PintoraLocal extends akasha.CustomElement {
	get elementName() { return "diagrams-pintora"; }

    async process($element, metadata, dirty: Function) {
        const options: PintoraRenderOptions = {
            code: $element.text(),
            outputFN: $element.attr('output-file')
        };

        let vpathIn;
        let fspathIn;
        const inf =  $element.attr('input-file');
        if (typeof inf === 'string'
         && inf.length >= 1
        ) {
            if (path.isAbsolute(inf)) {
                vpathIn = inf;
            } else {
                let dir = path.dirname(metadata.document.path);
                vpathIn = path.normalize(
                    path.join('/', dir, inf)
                );
            }
        }

        // console.log(`PintoraLocal input-file ${util.inspect(inf)} vpathIn ${util.inspect(vpathIn)}`);

        const documents = this.config.akasha.filecache.documentsCache;
        const assets = this.akasha.filecache.assetsCache;
        const doc = vpathIn
            ? await documents.find(vpathIn)
            : undefined;
        let asset;

        if (!doc) asset = vpathIn
            ? await assets.find(vpathIn)
            : undefined;
   
        if (doc) fspathIn = doc.fspath;
        else if (asset) fspathIn = asset.fspath;

        if (typeof fspathIn === 'string') {
            if (typeof options.code === 'string'
             && options.code.trim().length >= 1
            ) {
                throw new Error(`diagrams-pintora - either specify input-file OR a diagram body, not both`);
            }
            options.code = await fsp.readFile(fspathIn, 'utf-8');
        }

        if (typeof options.code !== 'string'
         || options.code.trim().length < 1
        ) {
            throw new Error(`diagrams-pintora requires an input-file or an inline diagram body`);
        }

        // With no output-file attribute, the rendered SVG is
        // inserted inline in the generated HTML rather than
        // written to a file and referenced with <img>.
        const inlineMode = typeof options.outputFN !== 'string'
                        || options.outputFN.length < 1;

        const pxr = $element.attr('pixel-ratio');
        if (typeof pxr === 'string'
         && pxr.length >= 1
        ) {
            const r = Number.parseFloat(pxr);
            if (isNaN(r)) {
                throw new Error(`diagrams-pintora: pixel-ratio is not a number ${pxr}`);
            }
            options.devicePixelRatio = r;
        }

        const mime = $element.attr('mime-type');
        if (typeof mime === 'string') {
            if (
                mime === 'image/svg+xml'
             || mime === 'image/jpeg'
             || mime === 'image/png'
            ) {
                options.mimeType = mime;
            } else {
                throw new Error(`Invalid MIME type ${util.inspect(mime)}`);
            }
        }

        // Inline SVG is embedded as markup in the generated
        // HTML, so the binary image formats cannot be used
        // without an output-file.
        if (inlineMode) {
            if (typeof options.mimeType === 'string'
             && options.mimeType !== 'image/svg+xml'
            ) {
                throw new Error(`diagrams-pintora without output-file renders inline SVG - ${options.mimeType} requires an output-file`);
            }
            options.mimeType = 'image/svg+xml';
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

        // For image/svg+xml the renderer returns the SVG
        // as a string; for the binary formats it returns
        // a Buffer.
        const rendered = await render(options);

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
            ? `id="${encode(id)}"`
            : '';
        // The diagrams-pintora class carries the stylesheet
        // rules constraining the diagram to its container.
        const Tclazz = typeof clazz === 'string'
            ? `class="diagrams-pintora ${encode(clazz)}"`
            : `class="diagrams-pintora"`;
        const Twidth = typeof options.width === 'number'
            ? `width="${options.width.toString()}"`
            : '';

        // In inline mode there is no <img> to carry the alt,
        // title, and width attributes.  The alt text becomes
        // an aria-label on the SVG root, the width becomes a
        // width style on the SVG root, and the title lands on
        // the <figure>.
        if (inlineMode) {
            return `
        <figure ${Tid} ${Tclazz} ${Ttitle}>
        ${adaptInlineSvg(String(rendered),
            options.width,
            typeof alt === 'string' ? alt : undefined)}
        ${cap}
        </figure>
        `;
        }

        // options.outputFN was set from output-file
        // This creates vpathOut from that value
        // This computs fspathOut, which is then
        // assigned back into options.outputFN

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
            this.config.renderDestination, vpathOut
        ));
        options.outputFN = fspathOut;

        await fsp.mkdir(path.dirname(fspathOut), {
            recursive: true
        });
        await fsp.writeFile(fspathOut, rendered);

        const ret = `
        <figure ${Tid} ${Tclazz}>
        <img src="${encode(vpathOut)}" ${Talt} ${Ttitle} ${Twidth}/>
        ${cap}
        </figure>
        `;
        // console.log(ret);
        return ret;
    }
}
