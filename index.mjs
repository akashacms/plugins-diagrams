

import path from 'node:path';
import { execSync } from 'node:child_process';

const __dirname = import.meta.dirname;

const pluginName = '@akashacms/plugins-diagrams';

import akasha from 'akasharender';
const mahabhuta = akasha.mahabhuta;

const _plugin_config = Symbol('config');
const _plugin_options = Symbol('options');

export class DiagramsPlugin extends akasha.Plugin {
    constructor() {
        super(pluginName);
    }

    configure(config, options) {
        this[_plugin_config] = config;
        this[_plugin_options] = options;
        options.config = config;
        config.addMahabhuta(mahabhutaArray(options));
    }

    get config() { return this[_plugin_config]; }
    get options() { return this[_plugin_options]; }
}

export function mahabhutaArray(options) {
    let ret = new mahabhuta.MahafuncArray(pluginName, options);
    ret.addMahafunc(new PlantUMLLocal());
    return ret;
};

class PlantUMLLocal extends mahabhuta.PageProcessor {
    get selector() { return "pre[class=plantuml-inline]"; }
    async process($, metadata, dirty) {

        $('article').find('pre[class=plantuml-inline]').each(function() {

            const body  = $(this).html();

            console.log({ body });

            const plantumlJar = path.join(
                __dirname,
                'vendor',
                'plantuml',
                'plantuml-mit-1.2025.0.jar');
            const result = execSync(
                [
                    'java',
                    '-jar',
                    '-Djava.awt.headless=true',
                    '--add-opens=java.xml/com.sun.org.apache.xalan.internal.xsltc.trax="ALL-UNNAMED"',
                    plantumlJar,
                    '-tsvg',
                    '-pipe',
                ].join(' '),
                { input: body }
            );

            $(this).replaceWith(result.toString());
    
        });
    }
}
