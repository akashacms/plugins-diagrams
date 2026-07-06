

import path from 'node:path';
import fs from 'node:fs';

const pluginName = '@akashacms/diagram-makers';

import * as akasha from 'akasharender';
import { Plugin } from 'akasharender/dist/Plugin.js';
const mahabhuta = akasha.mahabhuta;

export {
    MarkdownITMermaidPlugin,
    MarkdownITPlantUMLPlugin,
    MarkdownITPintoraPlugin,
    MermaidPluginOptions
} from './markdown-it.js';

import { MermaidLocal } from './render-mermaid.js';
import { PlantUMLLocal } from './render-plantuml.js';
import { PintoraLocal } from './render-pintora.js';

export {
    MermaidRenderOptions,
    doMermaid,
    renderMermaidSvg,
    registerMermaidFonts,
    adaptInlineSvg,
    MermaidLocal
} from './render-mermaid.js';

export {
    doPlantUMLOptions,
    doPlantUML,
    doPlantUMLServer,
    doPlantUMLLocal,
    plantumlEncode,
    isValidCharset,
    PlantUMLLocal
} from './render-plantuml.js';

export {
    PintoraRenderOptions,
    doPintora,
    PintoraLocal
} from './render-pintora.js';

export type DiagramsPluginOptions = {
    /**
     * Options for rendering <diagrams-mermaid> elements
     */
    mermaid?: {
        /**
         * File name of a JSON configuration file using the same
         * schema as the mmdr --config file (theme, themeVariables,
         * flowchart, ...).  Read once at configuration time.
         */
        configFN?: string;

        /**
         * JSON configuration string with the same schema.  Takes
         * precedence over configFN.
         */
        configJSON?: string;

        /**
         * Theme preset name: default, dark, forest, neutral, modern.
         * Takes precedence over the config's theme name.
         */
        themePreset?: string;

        /**
         * TTF/OTF font files to register for text measurement.
         * When omitted, a common system font is used if found.
         */
        fontFNs?: string[];
    };
};

export class DiagramsPlugin extends Plugin {

    #config;

    constructor() {
        super(pluginName);
    }

    configure(config, options?: DiagramsPluginOptions) {
        this.#config = config;
        // this.config = config;
        this.akasha = config.akasha;
        this.options = options ? options : {};
        this.options.config = config;
        if (this.options.mermaid?.configFN
         && !this.options.mermaid.configJSON
        ) {
            this.options.mermaid.configJSON = fs.readFileSync(
                this.options.mermaid.configFN, 'utf-8');
        }
        config.addMahabhuta(mahabhutaArray(this.options, config, this.akasha, this));
        let moduleDirname = import.meta.dirname;
        config.addAssetsDir(path.join(moduleDirname, '..', 'assets'));
        config.addStylesheet({
            href: '/vendor/@akashacms/diagram-makers/style.css'
        });
    }

    get config() { return this.#config; }
}

export function mahabhutaArray(
    options,
    config?: akasha.Configuration,
    akasha?: any,
    plugin?: Plugin
) {
    let ret = new mahabhuta.MahafuncArray(pluginName, options);
    ret.addMahafunc(new MermaidLocal(config, akasha, plugin));
    ret.addMahafunc(new PlantUMLLocal(config, akasha, plugin));
    ret.addMahafunc(new PintoraLocal(config, akasha, plugin));
    return ret;
};
