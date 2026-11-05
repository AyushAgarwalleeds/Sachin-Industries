# Sachin CAD

Sachin CAD is an original browser-based 2D editor integrated with the industrial website. Its interface, SVG icons and application code are specific to Sachin Industries. The workflow was reviewed against Autodesk's published AutoCAD Web command documentation; this is not Autodesk software or a claim of equivalent feature coverage.

## Delivered workflow

There are 49 ribbon tools across Draw, Modify, Annotate and Fabrication, plus file, view, layer, history and command controls. The published command guide is generated from the same tool catalogue as the interface.

Drawing includes lines, polylines with arc bulges, rectangles, circles, three-point arcs, ellipses, regular polygons, slots, interpolation splines and points. Editing includes move/copy, rotate/scale/mirror, two-point alignment, offsets, trim/extend, line fillets/chamfers, rectangular/polar arrays, joining, exploding, breaking, reversing, grouping and closed-profile boolean operations.

Text, leaders, aligned/horizontal/vertical dimensions, radius/diameter labels and hatch lines provide annotation. Dimensions are non-associative and export as editable line/text graphics. The fabrication helpers create mounting plates, rectangular blanks, sheet boundaries and an estimated single-bend flat layout using the visitor's own inputs.

Absolute, relative and polar coordinate entry, endpoint/midpoint/centre/quadrant/intersection snapping, grid snapping, orthogonal and 45-degree tracking, selection windows, draggable grips, pan/zoom and an expanded workspace support precise editing. The Properties and Layers panels expose numeric geometry, colour, visibility, locking, role and line style.

## Source layout

- `src/cad/main.js`: interface, command dispatch, pointer/keyboard interactions, history, recovery and file-worker integration.
- `src/cad/geometry.js`: geometry model, Paper.js operations, precise primitive measurements, transforms, drafting operations, dimensional graphics and bend formulas.
- `src/cad/io.js`: validated project format, ASCII DXF import/export and SVG output.
- `src/cad/io-worker.js`: file conversion in a browser worker.
- `src/cad/catalog.js`: the shared 49-tool catalogue, command descriptions and original SVG icons.
- `src/cad/cad.css`: responsive drawing interface.
- `src/cad.html`, `src/cad-guide.html`, `src/cad-promo.html`: page, static guide and homepage feature.
- `scripts/cad-check.mjs`: numerical geometry, interchange and validation tests.

The geometry dependency is Paper.js 0.17.0. File conversion uses dxf-parser 1.1.2 and @tarikjabiri/dxf 2.10.0. Their MIT notices, including the parser's loglevel dependency, are included in `public/licenses/`. The CAD module loads only on the CAD page; the film and 3D machine engine are not required by the editor.

## Files and privacy

Drawing, conversion and automatic recovery run on the visitor's device. No drawing upload endpoint, cloud account, database or CAD service is used. Recovery uses local browser storage and may be limited by quota or clearing storage. A downloaded project is the durable copy. Drawing names, coordinates, geometry and file contents are excluded from optional analytics.

DXF export preserves native lines, circles, arcs, polylines with bulges and full ellipses. Bezier geometry exports as cubic SPLINE segments. Layer colours and the editor's dashed/dotted styles are included. Project exports preserve the complete document; DXF/SVG can use visible geometry, selected geometry or the cut/bend profile scope.

ASCII DXF import handles the documented 2D entities and expands supported INSERT blocks. General non-rational splines and partial ellipses may be sampled. Rational splines and unsupported entities are reported as skipped. This is not a lossless converter for arbitrary DXF files. DWG and binary DXF are not supported.

Limits are 12,000 expanded entities, 100 layers, 250,000 control points and 20 MB source files. Block nesting and instance expansion are bounded. Numeric inputs are validated; rendered text and layer names are escaped. Undo is bounded to 80 states and approximately 32 MB. Performance depends on the visitor's device and drawing complexity.

## Verification

Automated checks cover primitive areas and dimensions, bulged paths, exact circle/arc measurements, reflection and placement, offset, trim/extend, fillet/chamfer, join, boolean operations, hatch, bend estimates, millimetre/inch interchange, cubic curves, layer colours/line styles and transformed DXF blocks.

Browser testing created a closed 120 × 80 mm profile and a 5 mm-radius circle from commands, edited the radius to 7.5 mm, exercised undo/redo, and moved the drawing by 10,20 mm. The actual downloaded DXF re-imported with the expected coordinates. The independent ezdxf audit reported zero errors and zero repairs for both that browser export and a mixed-geometry interchange file.

A direct circle-radius grip drag changed the geometry in the phone workspace. Switching display units to inches preserved physical coordinates and radius while converting dimension readouts. The single-bend helper produced the expected 154.6916 mm flat length for the tested inputs, with separate cut, bend and annotation geometry.

The geometry review is a drafting aid. It checks endpoints, whole duplicates, zero lengths and bounding dimensions; it does not establish complete contour validity, true-shape nesting, kerf compensation, tooling suitability or manufacturing approval. Confirm production files with the fabricator.
