
import path from 'node:path';
import { promises as fsp } from 'node:fs';
import util from 'node:util';
import { encode } from 'html-entities';
import { render, PintoraConfig } from '@pintora/cli';
import * as akasha from 'akasharender';

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
 * the file named by the input-file attribute.  The
 * rendered image is written to the file named by the
 * required output-file attribute, and referenced with
 * <img> in the generated HTML.
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
             && options.code.length >= 1
            ) {
                throw new Error(`diagrams-pintora - either specify input-file OR a diagram body, not both`);
            }
            options.code = await fsp.readFile(fspathIn, 'utf-8');
        }

        if (typeof options.outputFN !== 'string'
         || options.outputFN.length < 1
        ) {
            throw new Error(`diagrams-pintora must have output-file`);
        }

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

        const buf = await render(options);

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
            ? `id="${encode(id)}`
            : '';
        const Tclazz = typeof clazz === 'string'
            ? `class="${encode(clazz)}`
            : '';
        const Twidth = typeof options.width === 'number'
            ? `width="${options.width.toString()}"`
            : '';

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

        if (options.outputFN) {
            await fsp.writeFile(options.outputFN, buf);
        }
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
