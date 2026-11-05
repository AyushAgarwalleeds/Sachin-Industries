const t=(id,label,command,help,icon='line')=>({id,label,command,help,icon});
export const TOOL_GROUPS={
 draw:[
  t('line','Line','LINE · L','Pick successive points; Enter finishes separate line segments.','line'),
  t('polyline','Polyline','PLINE · PL','Pick vertices; Enter finishes, C closes the profile.','polyline'),
  t('rectangle','Rectangle','RECTANGLE · REC','Pick opposite corners or type a relative width,height.','rectangle'),
  t('circle','Circle','CIRCLE · C','Pick a centre, then a radius point or type the radius.','circle'),
  t('arc','3-point arc','ARC · A','Pick the start, a point on the arc, then the end.','arc'),
  t('ellipse','Ellipse','ELLIPSE · EL','Pick the centre, major-axis end, then minor-axis distance.','ellipse'),
  t('polygon','Polygon','POLYGON · POL','Set the number of sides, then pick centre and radius.','polygon'),
  t('spline','Spline','SPLINE · SPL','Pick interpolation points; Enter creates an editable cubic curve.','spline'),
  t('slot','Slot','SLOT','Set overall length and width, then place the centre.','slot'),
  t('point','Point','POINT · PO','Place construction points. Escape finishes.','point')
 ],
 modify:[
  t('move','Move','MOVE · M','Select objects, then pick base and destination points.','move'),
  t('copy','Copy','COPY · CO','Select objects, then pick base and destination points.','copy'),
  t('rotate','Rotate','ROTATE · RO','Rotate selected objects about a precise centre.','rotate'),
  t('scale','Scale','SCALE · SC','Scale selected objects uniformly about a centre.','scale'),
  t('mirror','Mirror','MIRROR · MI','Reflect a selection about a line through a centre.','mirror'),
  t('align','Align','ALIGN · AL','Map two source points onto two target points; scaling is optional.','align'),
  t('offset','Offset','OFFSET · O','Set distance, choose geometry, then choose its offset side.','offset'),
  t('trim','Trim','TRIM · TR','Click a line, circle or arc segment between visible cutting boundaries.','trim'),
  t('extend','Extend','EXTEND · EX','Click near a straight-line endpoint to extend it to a boundary.','extend'),
  t('fillet','Fillet','FILLET · F','Set radius and select two straight lines.','fillet'),
  t('chamfer','Chamfer','CHAMFER · CHA','Set equal distances and select two straight lines.','chamfer'),
  t('array','Rect. array','ARRAY · AR','Copy a selection into rows and columns.','array'),
  t('polararray','Polar array','ARRAYPOLAR','Repeat selected objects around a centre.','polararray'),
  t('join','Join','JOIN · J','Join one connected chain of lines, arcs and polylines.','join'),
  t('explode','Explode','EXPLODE · X','Split polylines into native edges, dimensions into lines/text, or flatten Beziers to 0.02 mm.','explode'),
  t('break','Break','BREAK · BR','Split a line or arc at the point you click.','break'),
  t('reverse','Reverse','REVERSE','Reverse the direction of selected paths.','reverse'),
  t('group','Group','GROUP · G','Group selected objects for selection and transformations.','group'),
  t('ungroup','Ungroup','UNGROUP','Return a group to independently selectable objects.','ungroup'),
  t('union','Union','UNION','Merge overlapping closed profiles.','union'),
  t('subtract','Subtract','SUBTRACT','Subtract subsequent selected profiles from the first selected profile.','subtract'),
  t('intersect','Intersect','INTERSECT','Keep the overlapping area of selected closed profiles.','intersect'),
  t('erase','Erase','ERASE · E','Delete selected unlocked objects. Undo restores them.','erase')
 ],
 annotate:[
  t('text','Text','TEXT · T','Set a label, height and rotation, then place it.','text'),
  t('dimension','Aligned dim','DIMALIGNED · DIM','Pick two extension points and a dimension-line position.','dimension'),
  t('dimh','Horizontal','DIMLINEAR · DIMH','Pick two points, then position the horizontal dimension.','dimh'),
  t('dimv','Vertical','DIMV','Pick two points, then position the vertical dimension.','dimv'),
  t('radius','Radius dim','DIMRADIUS','Pick a circle or arc, then position its radius label.','radius'),
  t('diameter','Diameter','DIMDIAMETER','Pick a circle or arc, then position its diameter label.','diameter'),
  t('leader','Leader','MLEADER','Set text; pick arrow point, elbow and label position.','leader'),
  t('hatch','Hatch','HATCH · H','Add spaced hatch lines inside a selected closed profile.','hatch'),
  t('measure','Distance','DIST · DI','Pick two points to report distance and angle.','measure'),
  t('area','Area','AREA · AA','Report summed closed-loop area and selected path length.','area')
 ],
 fabricate:[
  t('plate','Mounting plate','PLATE','Create a rounded plate, mounting holes and an optional slot.','plate'),
  t('bracket','Bend layout','BEND','Estimate one-bend flat length from outside legs and create cut/bend geometry.','bracket'),
  t('blank','Shear blank','BLANK','Create a precisely dimensioned rectangular cutting blank.','rectangle'),
  t('stock','Sheet boundary','STOCK','Set a sheet boundary for visual layout and size review.','stock'),
  t('review','Review drawing','CHECK','Check open endpoints, zero lengths, duplicate geometry and overall machine dimensions.','review'),
  t('sample','Example drawing','EXAMPLE','Load an editable, labelled example; Undo restores the previous drawing.','plate')
 ]
};
export const TOOLS=Object.values(TOOL_GROUPS).flat();
export const ICONS={
 line:'M4 20L20 4M3 18v4h4M18 2h4v4',polyline:'M3 18l5-12 8 12 5-9M2 17h3v3H2zM7 4h3v3H7zM15 17h3v3h-3z',rectangle:'M3 5h18v14H3z',circle:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M9 12h6M12 9v6',arc:'M4 19A14 14 0 0 1 20 5M2 17h4v4H2zM18 3h4v4h-4z',ellipse:'M22 12a10 6 0 1 1-20 0 10 6 0 0 1 20 0',polygon:'M12 2l9 6v9l-9 5-9-5V8z',spline:'M2 18C5-10 16 33 22 5M2 18l6-9m8 6 6-10',slot:'M7 6h10a6 6 0 0 1 0 12H7A6 6 0 0 1 7 6',point:'M12 2v20M2 12h20M9 9h6v6H9z',move:'M12 2v20M2 12h20M8 6l4-4 4 4M18 8l4 4-4 4M8 18l4 4 4-4M6 8l-4 4 4 4',copy:'M3 3h12v12H3zM9 15v6h12V9h-6',rotate:'M4 8a9 9 0 1 1-1 7M4 2v6h6M11 10h3v4h-3z',scale:'M3 12v9h9v-9zM8 3h13v13M21 3l-9 9',mirror:'M12 2v20M3 6l6 6-6 6zM21 6l-6 6 6 6z',align:'M3 5h6v6H3zM15 13h6v6h-6zM6 3v18M18 3v18M2 8h20',offset:'M3 19l8-14h10M7 21l8-12h8',trim:'M3 5l18 14M3 19l6-5m6-4 6-5M12 2v20',extend:'M3 17l11-8M14 2v20M14 9l7-5',fillet:'M3 21v-9a9 9 0 0 1 9-9h9',chamfer:'M3 21V11l8-8h10',array:'M3 3h5v5H3zM16 3h5v5h-5zM3 16h5v5H3zM16 16h5v5h-5z',polararray:'M10 2h4v4h-4zM18 10h4v4h-4zM10 18h4v4h-4zM2 10h4v4H2zM9 12h6M12 9v6',join:'M2 12h8m4 0h8M7 8l4 4-4 4m10-8-4 4 4 4',explode:'M8 8h8v8H8zM3 3l4 4M17 7l4-4M17 17l4 4M7 17l-4 4',break:'M2 18l7-6m6-3 7-5M9 7l5 9',reverse:'M3 8h18l-4-4M21 16H3l4 4',group:'M3 3h18v18H3zM7 7h4v4H7zM13 13h4v4h-4z',ungroup:'M3 3h7M3 3v7M21 3h-7M21 3v7M3 21h7M3 21v-7M21 21h-7M21 21v-7M8 8h8v8H8z',union:'M3 3h11v6h7v12H9v-7H3z',subtract:'M3 3h12v6H9v6H3zM9 15h12V9h-6',intersect:'M9 9h6v6H9zM3 3h12v6M3 3v12h6M21 21H9v-6M21 21V9h-6',erase:'M4 15L15 4l7 7-11 11H4l-3-3zM8 11l7 7',text:'M3 5V2h18v3M12 2v20M7 22h10',dimension:'M3 18L21 6M2 14l3 7M19 2l3 7M8 7l4 4',dimh:'M3 3v18M21 3v18M3 16h18M6 13l-3 3 3 3M18 13l3 3-3 3',dimv:'M3 3h18M3 21h18M16 3v18M13 6l3-3 3 3M13 18l3 3 3-3',radius:'M21 12a9 9 0 1 1-18 0M12 12l8-8M15 4h5v5',diameter:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M4 20L20 4',leader:'M2 20l8-10h12M2 20l5-1-4-3M13 4h8',hatch:'M3 3h18v18H3zM3 8l5-5M3 15L15 3M3 21L21 3M9 21l12-12M16 21l5-5',measure:'M2 16L18 2l4 5L6 22zM8 11l3 3M13 6l3 3',area:'M3 6l8-3 10 8-5 10H5zM8 10h8M8 14h6',plate:'M5 3h14l2 2v14l-2 2H5l-2-2V5zM6 6h1M17 6h1M6 18h1M17 18h1M8 10h8v4H8z',bracket:'M3 6h18v12H3zM9 6v12M7 3l4 18M14 10h4',stock:'M2 4h20v16H2zM5 7h7v9H5zM15 7h4v4h-4z',review:'M4 3h16v18H4zM8 8l2 2 5-5M8 15h8M8 18h5'
};
