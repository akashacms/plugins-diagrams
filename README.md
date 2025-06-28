# @akashacms/diagrams-maker

Process PlantUML, or Pintora, diagrams and either convert into an output file, or embed as HTML in a document.

PlantUML diagrams are rendered locally using a copy of `plantuml.jar`, specifically the version released under the MIT license.  By using the JAR file, you are not reliant on an external server.

**NOTE**: This package requires the Java runtime to be installed on your machine and in your path.  You can test this by running `java --help` at the command line.

**NOTE**: It was intended that this package also support Mermaid and KaTeX.  Those who are interested (or not) should see [the issue queue entry](https://github.com/akashacms/plugins-diagrams/issues/7) for this task.

## INSTALL

In an AkashaCMS project directory:

```shell
$ npm install @akashacms/diagrams-maker --save
```

## Usage - CLI -- PlantUML

The package includes a CLI tool with the following synopsis:

```shell
Usage: npx diagrams-maker plantuml [options]

Render PlantUML files

Options:
  --input-file <inputFN...>  Path for document to render
  --output-file <outputFN>   Path for rendered document
  --charset <charset>        To use a specific character set. Default: UTF-8
  --darkmode                 To use dark mode for diagrams
  --debugsvek                To generate intermediate svek files
  --filename <fileNm>        "example.puml" To override %filename% variable
  --nbthread <nThreads>      To use (N) threads for processing.
                             Use "auto" for 4 threads.
  --nometadata               To NOT export metadata in PNG/SVG generated files
  --output-dir <outDir>      To generate images in the specified directory
  --teps                     To generate images using EPS format
  --thtml                    To generate HTML file for class diagram
  --tlatex                   To generate images using LaTeX/Tikz format
  --tpdf                     To generate images using PDF format
  --tpng                     To generate images using PNG format (default)
  --tscxml                   To generate SCXML file for state diagram
  --tsvg                     To generate images using SVG format
  --ttxt                     To generate images with ASCII art
  --tutxt                    To generate images with ASCII art
                             using Unicode characters
  --tvdx                     To generate images using VDX format
  --txmi                     To generate XMI file for class diagram
  --verbose                  To have log information
  -h, --help                 display help for command
```

Most of these options correspond directly to the CLI arguments for `plantuml.jar` as listed on the PlantUML website.

One mode is a single input file, and a single output file:

```shell
$ npx diagrams-maker plantuml \
      --input-file flight.puml \
      --output-file flight.png  \
      --tpng
```

This converts the PlantUML diagram in the named file into a PNG.

The `--input-file` parameter can be used multiple times.  In that case, the parameters are treated as the `[file/dir] [file/dir] [file/dir]` parameters for `plantuml.jar`.  The `--output-file` parameter, if given, is ignored in this case.  You may use the `--output-dir` parameter to affect where the files land.

```shell
$ npx diagrams-maker plantuml \
    --input-file file1.puml --input-file dir/with/diagrams \
    --output-dir out
    --tpng
```

This will search for PlantUML documents in the named files or directories, generating PNG files, with the files landing in a directory hierarchy under the `out` directory.

## USAGE - CLI - Pintora

The package includes the following CLI commands to use Pintora.

```shell
$ npx diagrams-maker pintora --help
Usage: diagrams-maker pintora [options]

Render Pintora files

Options:
  --input-file <inputFN>    Path for document to render
  --output-file <outputFN>  Path for rendered document
  --pixel-ratio <ratio>
  --mime-type <mt>          MIME type for output file
  --bg-color <color>        String describing background color
  --width <number>          Width of the output, height will be calculated according to the diagram content ratio
  -h, --help                display help for command
```

The only mode is to render a single input file to an output file:

```shell
$ npx diagrams-maker pintora \
      --input-file flight.pintora \
      --output-file flight.png  \
      --mime-type image/png
```

The `--mime-type` option selects between `image/svg+xml`, `image/jpeg`, or `image/png`.

<!-- ## USAGE - CLI - Mermaid -->
<!-- ## USAGE - CLI - KaTeX -->

## API - PlantUML

The `diagram-maker` package exports an API providing similar functionality.

```js
import { doPlantUMLOptions, doPlantUMLLocal } from '@akashacms/diagrams-maker';

await doPlantUMLLocal({
  inputBody: `
    @startuml
    ... diagram
    @enduml
    `,
  outputFN: '/path/to/destination/diagram.png',
  tpng: true
} as doPlantUMLOptions);
```

This converts an inline diagram into a PNG file at the named filesystem location.  The structure of the _options_ parameter is described by `doPlantUMLOptions`.

The `inputFNs` is an array treated similarly to the `--input-file` parameter for the CLI.

There are three modes for treating inputs and outputs:

* No `inputFNs`, in which case `inputBody` is output to the `outputFN` which is required.
* One entry in the `inputFNs` which is output to the `outputFN` which is required.
* Multiple entries in the `inputFNs`, and the output location is influenced by `outputDir`.

## Usage - AkashaCMS project

The `@akashacms/diagrams-makers` package includes an AkashaCMS plugin.

Setup, configuration:

```js
import { DiagramsPlugin } from '@akashacms/diagrams-makers';

config.use(DiagramsPlugin);
```

### PlantUML diagrams in AkashaCMS projects

In a document the `<diagrams-plantuml>` tag is used for rendering a single PlantUML diagram into either PNG or SVG.

The PlantUML document can be used inline

```html
<diagrams-plantuml output-file="./flight.png" tpng>
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
</diagrams-plantuml>
```

The diagram is rendered into the AkashaCMS `renderDestination` directory hierarchy to a location relative to the document being rendered.

Either the `tpng` or `tsvg` property (not attribute) is used to indicate the output format.

The diagram can also be in the filesystem:

```html
<diagrams-plantuml
    input-file="./img/flight.puml"
    output-file="./img/flight.png"
    tpng/>
<diagrams-plantuml
    input-file="/path/to/diagrams/flight.puml"
    output-file="./img/flight.png"
    tpng/>
```

The `input-file` path must be a virtual path within either an `assets` or `documents` directory.

If the `input-file` is an absolute pathname, it is relative to the root of the virtual filespace of the AkashaCMS project configuration.  A relative pathname is relative to the file being rendered.

### Pintora diagrams in an AkashaCMS project

In a document the `<diagrams-pintora>` tag is used for rendering a single Pintora diagram into PNG, JPEG, or SVG.

The Pintora document can be used inline

```html
<diagrams-pintora output-file="./flight.png" mime-type="image/png">
sequenceDiagram
  Frida-->>Georgia: Flowers are beautiful
  @note over Frida,Georgia: Painters
  @note right of Georgia: Right
  @start_note left of Georgia
  multiline
  note
  @end_note
</diagrams-pintora>
```

Or, the Pintora document can be in an external file:

```html
<diagrams-pintora input-file="./flight.pint" output-file="./flight.jpeg" mime-type="image/jpeg"/>
```

Sometimes a Pintora document will not parse correctly when used in-line.  The solution for such a case is to place the diagram description in a file.
