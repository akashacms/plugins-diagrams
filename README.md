# @akashacms/plugins-diagrams

Process PlantUML diagrams and embed as SVG.

## INSTALL

In an AkashaCMS project directory:

```shell
$ npm install @akashacms/plugins-diagrams --save
```

## Configuration

In the AkashaCMS configuration file add this:

```js
// CJS modules - would require import() - untested
// In Node.js 24, require(ESM MODULE) is supposed to work
// Something like this:
const DiagramsPlugin = await import('@akashacms/plugins-diagrams');
// ESM modules
import { DiagramsPlugin } from '@akashacms/plugins-diagrams';

/// In the section where plugins are being added:

config.use(DiagramsPlugin);
```

## Usage

In your content add:

```html
<pre class="plantuml-inline">
@startuml
start

if (Graphviz installed?) then (yes)
  :process all 
  diagrams;
else (no)
  :process only 
  __sequence__ and __activity__ diagrams;
endif

stop
@enduml
</pre>
```

The plugin recognizes content between `<pre class="plantuml-inline">` and `</pre>` as containing a PlantUML diagram.  The PlantUML syntax itself requires the `@startuml` and `@enduml` markers.  Between those you place the description of your diagram.

The diagram is rendered locally using a copy of `plantuml.jar`, specifically the version released under the MIT license.

**NOTE**: This plugin requires the Java runtime to be installed on your machine and in your path.  You can test this by running `java --help` at the command line.

## Hat Tip

This package was inspired by https://www.npmjs.com/package/plantuml
