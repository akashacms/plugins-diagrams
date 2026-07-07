var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _DiagramsPlugin_config;
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const pluginName = '@akashacms/diagram-makers';
import * as akasha from 'akasharender';
import { Plugin } from 'akasharender/dist/Plugin.js';
const mahabhuta = akasha.mahabhuta;
export { MarkdownITMermaidPlugin, MarkdownITPlantUMLPlugin, MarkdownITPintoraPlugin, MarkdownITKaTeXPlugin } from './markdown-it.js';
import { MermaidLocal } from './render-mermaid.js';
import { PlantUMLLocal } from './render-plantuml.js';
import { PintoraLocal } from './render-pintora.js';
import { KaTeXLocal } from './render-katex.js';
export { doMermaid, renderMermaidSvg, registerMermaidFonts, adaptInlineSvg, MermaidLocal } from './render-mermaid.js';
export { doPlantUML, doPlantUMLServer, doPlantUMLLocal, plantumlEncode, isValidCharset, PlantUMLLocal } from './render-plantuml.js';
export { doPintora, PintoraLocal } from './render-pintora.js';
export { doKaTeX, renderKaTeXHtml, KaTeXLocal } from './render-katex.js';
export class DiagramsPlugin extends Plugin {
    constructor() {
        super(pluginName);
        _DiagramsPlugin_config.set(this, void 0);
    }
    configure(config, options) {
        __classPrivateFieldSet(this, _DiagramsPlugin_config, config, "f");
        // this.config = config;
        this.akasha = config.akasha;
        this.options = options ? options : {};
        this.options.config = config;
        if (this.options.mermaid?.configFN
            && !this.options.mermaid.configJSON) {
            this.options.mermaid.configJSON = fs.readFileSync(this.options.mermaid.configFN, 'utf-8');
        }
        config.addMahabhuta(mahabhutaArray(this.options, config, this.akasha, this));
        let moduleDirname = import.meta.dirname;
        config.addAssetsDir(path.join(moduleDirname, '..', 'assets'));
        config.addStylesheet({
            href: '/vendor/@akashacms/diagram-makers/style.css'
        });
        // The KaTeX stylesheet and fonts are sizable, so they
        // are added only for projects that opt in to KaTeX
        // rendering by supplying a katex options object.
        if (this.options.katex) {
            const katexDist = path.dirname(createRequire(import.meta.url)
                .resolve('katex/dist/katex.min.css'));
            config.addAssetsDir({
                src: katexDist,
                dest: 'vendor/katex',
                // Only the stylesheet and fonts are needed for
                // server-rendered math - not the browser-side
                // JS bundles.
                ignore: [
                    '**/*.js', '**/*.mjs',
                    '**/*.d.ts', 'README.md'
                ]
            });
            config.addStylesheet({
                href: '/vendor/katex/katex.min.css'
            });
        }
    }
    get config() { return __classPrivateFieldGet(this, _DiagramsPlugin_config, "f"); }
}
_DiagramsPlugin_config = new WeakMap();
export function mahabhutaArray(options, config, akasha, plugin) {
    let ret = new mahabhuta.MahafuncArray(pluginName, options);
    ret.addMahafunc(new MermaidLocal(config, akasha, plugin));
    ret.addMahafunc(new PlantUMLLocal(config, akasha, plugin));
    ret.addMahafunc(new PintoraLocal(config, akasha, plugin));
    ret.addMahafunc(new KaTeXLocal(config, akasha, plugin));
    return ret;
}
;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9saWIvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBRUEsT0FBTyxJQUFJLE1BQU0sV0FBVyxDQUFDO0FBQzdCLE9BQU8sRUFBRSxNQUFNLFNBQVMsQ0FBQztBQUN6QixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBRTVDLE1BQU0sVUFBVSxHQUFHLDJCQUEyQixDQUFDO0FBRS9DLE9BQU8sS0FBSyxNQUFNLE1BQU0sY0FBYyxDQUFDO0FBQ3ZDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNyRCxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDO0FBRW5DLE9BQU8sRUFDSCx1QkFBdUIsRUFDdkIsd0JBQXdCLEVBQ3hCLHVCQUF1QixFQUN2QixxQkFBcUIsRUFHeEIsTUFBTSxrQkFBa0IsQ0FBQztBQUUxQixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDbkQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQ3JELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUNuRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFHL0MsT0FBTyxFQUVILFNBQVMsRUFDVCxnQkFBZ0IsRUFDaEIsb0JBQW9CLEVBQ3BCLGNBQWMsRUFDZCxZQUFZLEVBQ2YsTUFBTSxxQkFBcUIsQ0FBQztBQUU3QixPQUFPLEVBRUgsVUFBVSxFQUNWLGdCQUFnQixFQUNoQixlQUFlLEVBQ2YsY0FBYyxFQUNkLGNBQWMsRUFDZCxhQUFhLEVBQ2hCLE1BQU0sc0JBQXNCLENBQUM7QUFFOUIsT0FBTyxFQUVILFNBQVMsRUFDVCxZQUFZLEVBQ2YsTUFBTSxxQkFBcUIsQ0FBQztBQUU3QixPQUFPLEVBR0gsT0FBTyxFQUNQLGVBQWUsRUFDZixV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QU0sRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQzFELEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxVQUFVLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQ3hELE9BQU8sR0FBRyxDQUFDO0FBQ2YsQ0FBQztBQUFBLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJcblxuaW1wb3J0IHBhdGggZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCBmcyBmcm9tICdub2RlOmZzJztcbmltcG9ydCB7IGNyZWF0ZVJlcXVpcmUgfSBmcm9tICdub2RlOm1vZHVsZSc7XG5cbmNvbnN0IHBsdWdpbk5hbWUgPSAnQGFrYXNoYWNtcy9kaWFncmFtLW1ha2Vycyc7XG5cbmltcG9ydCAqIGFzIGFrYXNoYSBmcm9tICdha2FzaGFyZW5kZXInO1xuaW1wb3J0IHsgUGx1Z2luIH0gZnJvbSAnYWthc2hhcmVuZGVyL2Rpc3QvUGx1Z2luLmpzJztcbmNvbnN0IG1haGFiaHV0YSA9IGFrYXNoYS5tYWhhYmh1dGE7XG5cbmV4cG9ydCB7XG4gICAgTWFya2Rvd25JVE1lcm1haWRQbHVnaW4sXG4gICAgTWFya2Rvd25JVFBsYW50VU1MUGx1Z2luLFxuICAgIE1hcmtkb3duSVRQaW50b3JhUGx1Z2luLFxuICAgIE1hcmtkb3duSVRLYVRlWFBsdWdpbixcbiAgICBNZXJtYWlkUGx1Z2luT3B0aW9ucyxcbiAgICBLYVRlWFBsdWdpbk9wdGlvbnNcbn0gZnJvbSAnLi9tYXJrZG93bi1pdC5qcyc7XG5cbmltcG9ydCB7IE1lcm1haWRMb2NhbCB9IGZyb20gJy4vcmVuZGVyLW1lcm1haWQuanMnO1xuaW1wb3J0IHsgUGxhbnRVTUxMb2NhbCB9IGZyb20gJy4vcmVuZGVyLXBsYW50dW1sLmpzJztcbmltcG9ydCB7IFBpbnRvcmFMb2NhbCB9IGZyb20gJy4vcmVuZGVyLXBpbnRvcmEuanMnO1xuaW1wb3J0IHsgS2FUZVhMb2NhbCB9IGZyb20gJy4vcmVuZGVyLWthdGV4LmpzJztcbmltcG9ydCB7IEthVGVYT3B0aW9ucyB9IGZyb20gJy4vcmVuZGVyLWthdGV4LmpzJztcblxuZXhwb3J0IHtcbiAgICBNZXJtYWlkUmVuZGVyT3B0aW9ucyxcbiAgICBkb01lcm1haWQsXG4gICAgcmVuZGVyTWVybWFpZFN2ZyxcbiAgICByZWdpc3Rlck1lcm1haWRGb250cyxcbiAgICBhZGFwdElubGluZVN2ZyxcbiAgICBNZXJtYWlkTG9jYWxcbn0gZnJvbSAnLi9yZW5kZXItbWVybWFpZC5qcyc7XG5cbmV4cG9ydCB7XG4gICAgZG9QbGFudFVNTE9wdGlvbnMsXG4gICAgZG9QbGFudFVNTCxcbiAgICBkb1BsYW50VU1MU2VydmVyLFxuICAgIGRvUGxhbnRVTUxMb2NhbCxcbiAgICBwbGFudHVtbEVuY29kZSxcbiAgICBpc1ZhbGlkQ2hhcnNldCxcbiAgICBQbGFudFVNTExvY2FsXG59IGZyb20gJy4vcmVuZGVyLXBsYW50dW1sLmpzJztcblxuZXhwb3J0IHtcbiAgICBQaW50b3JhUmVuZGVyT3B0aW9ucyxcbiAgICBkb1BpbnRvcmEsXG4gICAgUGludG9yYUxvY2FsXG59IGZyb20gJy4vcmVuZGVyLXBpbnRvcmEuanMnO1xuXG5leHBvcnQge1xuICAgIEthVGVYT3B0aW9ucyxcbiAgICBLYVRlWFJlbmRlck9wdGlvbnMsXG4gICAgZG9LYVRlWCxcbiAgICByZW5kZXJLYVRlWEh0bWwsXG4gICAgS2FUZVhMb2NhbFxufSBmcm9tICcuL3JlbmRlci1rYXRleC5qcyc7XG5cbmV4cG9ydCB0eXBlIERpYWdyYW1zUGx1Z2luT3B0aW9ucyA9IHtcbiAgICAvKipcbiAgICAgKiBPcHRpb25zIGZvciByZW5kZXJpbmcgPGRpYWdyYW1zLW1lcm1haWQ+IGVsZW1lbnRzXG4gICAgICovXG4gICAgbWVybWFpZD86IHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZpbGUgbmFtZSBvZiBhIEpTT04gY29uZmlndXJhdGlvbiBmaWxlIHVzaW5nIHRoZSBzYW1lXG4gICAgICAgICAqIHNjaGVtYSBhcyB0aGUgbW1kciAtLWNvbmZpZyBmaWxlICh0aGVtZSwgdGhlbWVWYXJpYWJsZXMsXG4gICAgICAgICAqIGZsb3djaGFydCwgLi4uKS4gIFJlYWQgb25jZSBhdCBjb25maWd1cmF0aW9uIHRpbWUuXG4gICAgICAgICAqL1xuICAgICAgICBjb25maWdGTj86IHN0cmluZztcblxuICAgICAgICAvKipcbiAgICAgICAgICogSlNPTiBjb25maWd1cmF0aW9uIHN0cmluZyB3aXRoIHRoZSBzYW1lIHNjaGVtYS4gIFRha2VzXG4gICAgICAgICAqIHByZWNlZGVuY2Ugb3ZlciBjb25maWdGTi5cbiAgICAgICAgICovXG4gICAgICAgIGNvbmZpZ0pTT04/OiBzdHJpbmc7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRoZW1lIHByZXNldCBuYW1lOiBkZWZhdWx0LCBkYXJrLCBmb3Jlc3QsIG5ldXRyYWwsIG1vZGVybi5cbiAgICAgICAgICogVGFrZXMgcHJlY2VkZW5jZSBvdmVyIHRoZSBjb25maWcncyB0aGVtZSBuYW1lLlxuICAgICAgICAgKi9cbiAgICAgICAgdGhlbWVQcmVzZXQ/OiBzdHJpbmc7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRURi9PVEYgZm9udCBmaWxlcyB0byByZWdpc3RlciBmb3IgdGV4dCBtZWFzdXJlbWVudC5cbiAgICAgICAgICogV2hlbiBvbWl0dGVkLCBhIGNvbW1vbiBzeXN0ZW0gZm9udCBpcyB1c2VkIGlmIGZvdW5kLlxuICAgICAgICAgKi9cbiAgICAgICAgZm9udEZOcz86IHN0cmluZ1tdO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBPcHRpb25zIGZvciByZW5kZXJpbmcgPGRpYWdyYW1zLWthdGV4PiBlbGVtZW50cy4gIFdoZW4gdGhpc1xuICAgICAqIG9iamVjdCBpcyBwcmVzZW50IChldmVuIGVtcHR5KSwgdGhlIEthVGVYIHN0eWxlc2hlZXQgYW5kXG4gICAgICogZm9udHMgYXJlIGFkZGVkIHRvIHRoZSBwcm9qZWN0IGFzIGFzc2V0cy4gIFRoZSByZW5kZXJpbmdcbiAgICAgKiBvcHRpb25zIChkaXNwbGF5TW9kZSBpcyBpZ25vcmVkIC0gaXQgaXMgY29udHJvbGxlZCBieSB0aGVcbiAgICAgKiBpbmxpbmUgcHJvcGVydHkgb24gdGhlIGVsZW1lbnQpIGFwcGx5IHRvIGV2ZXJ5XG4gICAgICogPGRpYWdyYW1zLWthdGV4PiBlbGVtZW50IGluIHRoZSBwcm9qZWN0LlxuICAgICAqL1xuICAgIGthdGV4PzogS2FUZVhPcHRpb25zO1xufTtcblxuZXhwb3J0IGNsYXNzIERpYWdyYW1zUGx1Z2luIGV4dGVuZHMgUGx1Z2luIHtcblxuICAgICNjb25maWc7XG5cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIocGx1Z2luTmFtZSk7XG4gICAgfVxuXG4gICAgY29uZmlndXJlKGNvbmZpZywgb3B0aW9ucz86IERpYWdyYW1zUGx1Z2luT3B0aW9ucykge1xuICAgICAgICB0aGlzLiNjb25maWcgPSBjb25maWc7XG4gICAgICAgIC8vIHRoaXMuY29uZmlnID0gY29uZmlnO1xuICAgICAgICB0aGlzLmFrYXNoYSA9IGNvbmZpZy5ha2FzaGE7XG4gICAgICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnMgPyBvcHRpb25zIDoge307XG4gICAgICAgIHRoaXMub3B0aW9ucy5jb25maWcgPSBjb25maWc7XG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMubWVybWFpZD8uY29uZmlnRk5cbiAgICAgICAgICYmICF0aGlzLm9wdGlvbnMubWVybWFpZC5jb25maWdKU09OXG4gICAgICAgICkge1xuICAgICAgICAgICAgdGhpcy5vcHRpb25zLm1lcm1haWQuY29uZmlnSlNPTiA9IGZzLnJlYWRGaWxlU3luYyhcbiAgICAgICAgICAgICAgICB0aGlzLm9wdGlvbnMubWVybWFpZC5jb25maWdGTiwgJ3V0Zi04Jyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uZmlnLmFkZE1haGFiaHV0YShtYWhhYmh1dGFBcnJheSh0aGlzLm9wdGlvbnMsIGNvbmZpZywgdGhpcy5ha2FzaGEsIHRoaXMpKTtcbiAgICAgICAgbGV0IG1vZHVsZURpcm5hbWUgPSBpbXBvcnQubWV0YS5kaXJuYW1lO1xuICAgICAgICBjb25maWcuYWRkQXNzZXRzRGlyKHBhdGguam9pbihtb2R1bGVEaXJuYW1lLCAnLi4nLCAnYXNzZXRzJykpO1xuICAgICAgICBjb25maWcuYWRkU3R5bGVzaGVldCh7XG4gICAgICAgICAgICBocmVmOiAnL3ZlbmRvci9AYWthc2hhY21zL2RpYWdyYW0tbWFrZXJzL3N0eWxlLmNzcydcbiAgICAgICAgfSk7XG4gICAgICAgIC8vIFRoZSBLYVRlWCBzdHlsZXNoZWV0IGFuZCBmb250cyBhcmUgc2l6YWJsZSwgc28gdGhleVxuICAgICAgICAvLyBhcmUgYWRkZWQgb25seSBmb3IgcHJvamVjdHMgdGhhdCBvcHQgaW4gdG8gS2FUZVhcbiAgICAgICAgLy8gcmVuZGVyaW5nIGJ5IHN1cHBseWluZyBhIGthdGV4IG9wdGlvbnMgb2JqZWN0LlxuICAgICAgICBpZiAodGhpcy5vcHRpb25zLmthdGV4KSB7XG4gICAgICAgICAgICBjb25zdCBrYXRleERpc3QgPSBwYXRoLmRpcm5hbWUoXG4gICAgICAgICAgICAgICAgY3JlYXRlUmVxdWlyZShpbXBvcnQubWV0YS51cmwpXG4gICAgICAgICAgICAgICAgICAgIC5yZXNvbHZlKCdrYXRleC9kaXN0L2thdGV4Lm1pbi5jc3MnKSk7XG4gICAgICAgICAgICBjb25maWcuYWRkQXNzZXRzRGlyKHtcbiAgICAgICAgICAgICAgICBzcmM6IGthdGV4RGlzdCxcbiAgICAgICAgICAgICAgICBkZXN0OiAndmVuZG9yL2thdGV4JyxcbiAgICAgICAgICAgICAgICAvLyBPbmx5IHRoZSBzdHlsZXNoZWV0IGFuZCBmb250cyBhcmUgbmVlZGVkIGZvclxuICAgICAgICAgICAgICAgIC8vIHNlcnZlci1yZW5kZXJlZCBtYXRoIC0gbm90IHRoZSBicm93c2VyLXNpZGVcbiAgICAgICAgICAgICAgICAvLyBKUyBidW5kbGVzLlxuICAgICAgICAgICAgICAgIGlnbm9yZTogW1xuICAgICAgICAgICAgICAgICAgICAnKiovKi5qcycsICcqKi8qLm1qcycsXG4gICAgICAgICAgICAgICAgICAgICcqKi8qLmQudHMnLCAnUkVBRE1FLm1kJ1xuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY29uZmlnLmFkZFN0eWxlc2hlZXQoe1xuICAgICAgICAgICAgICAgIGhyZWY6ICcvdmVuZG9yL2thdGV4L2thdGV4Lm1pbi5jc3MnXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGdldCBjb25maWcoKSB7IHJldHVybiB0aGlzLiNjb25maWc7IH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1haGFiaHV0YUFycmF5KFxuICAgIG9wdGlvbnMsXG4gICAgY29uZmlnPzogYWthc2hhLkNvbmZpZ3VyYXRpb24sXG4gICAgYWthc2hhPzogYW55LFxuICAgIHBsdWdpbj86IFBsdWdpblxuKSB7XG4gICAgbGV0IHJldCA9IG5ldyBtYWhhYmh1dGEuTWFoYWZ1bmNBcnJheShwbHVnaW5OYW1lLCBvcHRpb25zKTtcbiAgICByZXQuYWRkTWFoYWZ1bmMobmV3IE1lcm1haWRMb2NhbChjb25maWcsIGFrYXNoYSwgcGx1Z2luKSk7XG4gICAgcmV0LmFkZE1haGFmdW5jKG5ldyBQbGFudFVNTExvY2FsKGNvbmZpZywgYWthc2hhLCBwbHVnaW4pKTtcbiAgICByZXQuYWRkTWFoYWZ1bmMobmV3IFBpbnRvcmFMb2NhbChjb25maWcsIGFrYXNoYSwgcGx1Z2luKSk7XG4gICAgcmV0LmFkZE1haGFmdW5jKG5ldyBLYVRlWExvY2FsKGNvbmZpZywgYWthc2hhLCBwbHVnaW4pKTtcbiAgICByZXR1cm4gcmV0O1xufTtcbiJdfQ==