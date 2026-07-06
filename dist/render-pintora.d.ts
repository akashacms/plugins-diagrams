import { PintoraConfig } from '@pintora/cli';
import * as akasha from 'akasharender';
export type PintoraRenderOptions = {
    /**
     * pintora DSL code to render
     */
    code: string;
    devicePixelRatio?: number | null;
    /**
     * Type for the output file
     *
    // image/svg+xml
    // image/jpeg
    // image/png
     */
    mimeType?: string;
    /**
     * Assign extra background color
     */
    backgroundColor?: string;
    pintoraConfig?: Partial<PintoraConfig>;
    /**
     * width of the output, height will be calculated according to the diagram content ratio
     */
    width?: number;
    /**
     * Whether we should run render in a subprocess rather in current process.
     * If you call the `render` function, by default this is true, to avoid polluting the global environment.
     */
    renderInSubprocess?: boolean;
    outputFN: string;
};
export declare function doPintora(options: PintoraRenderOptions): Promise<void>;
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
export declare class PintoraLocal extends akasha.CustomElement {
    get elementName(): string;
    process($element: any, metadata: any, dirty: Function): Promise<string>;
}
//# sourceMappingURL=render-pintora.d.ts.map