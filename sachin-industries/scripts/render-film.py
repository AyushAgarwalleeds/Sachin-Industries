"""Render an original, silent 3D film. Requires Blender 3.3+; not run during hosting builds."""
import bpy, json, math, sys, os
from pathlib import Path
from mathutils import Matrix, Vector

ROOT=Path(__file__).resolve().parent.parent
DATA=json.loads((ROOT/'artwork/machines.json').read_text(encoding='utf-8'))
OUT=ROOT/'artwork'
FPS=24
N=192
ARGS=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE'
scene.eevee.taa_render_samples=24
scene.eevee.use_gtao=True;scene.eevee.gtao_distance=3;scene.eevee.gtao_factor=1.25
scene.eevee.use_soft_shadows=True;scene.eevee.use_ssr=True
scene.eevee.use_bloom=True;scene.eevee.bloom_intensity=.1;scene.eevee.bloom_radius=3
scene.render.resolution_x=1280;scene.render.resolution_y=720;scene.render.resolution_percentage=100
scene.render.fps=FPS;scene.frame_start=1;scene.frame_end=N*3
scene.render.film_transparent=False
scene.view_settings.view_transform='Filmic';scene.view_settings.look='Medium High Contrast'
scene.view_settings.exposure=.15;scene.view_settings.gamma=1
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.012,.025,.018,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.45
C=Matrix(((1,0,0,0),(0,0,-1,0),(0,1,0,0),(0,0,0,1)))
CI=C.inverted()
def converted(a):
    return C@Matrix(tuple(tuple(a[c*4+r] for c in range(4)) for r in range(4)))@CI
def material(name,color,metal=.0,rough=.4,emission=None):
    m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*color,1)
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
    if emission and sum(emission)>.01:p.inputs['Emission'].default_value=(*emission,1);p.inputs['Emission Strength'].default_value=3
    return m
def ink_material(name,color):
    m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes;n.clear();o=n.new('ShaderNodeOutputMaterial');e=n.new('ShaderNodeEmission');e.inputs['Color'].default_value=(*color,1);e.inputs['Strength'].default_value=1;m.node_tree.links.new(e.outputs[0],o.inputs['Surface']);return m
lime=ink_material('Signal lime',(.68,.94,.2));white=ink_material('Warm white',(.85,.92,.85));muted=ink_material('Technical grey',(.28,.4,.31));panel=ink_material('Graphite field',(.003,.008,.005))
floor=material('Graphite studio',(.012,.024,.018),.25,.43)
mat_cache={}
for chapter,(name,parts) in enumerate(DATA['models'].items()):
    for i,part in enumerate(parts):
        mesh=bpy.data.meshes.new(f'{name}-{i}');mesh.from_pydata(part['vertices'],[],part['faces']);mesh.update()
        obj=bpy.data.objects.new(f'{name}-{i}',mesh);scene.collection.objects.link(obj)
        key=(part['hex'],part['metalness'],tuple(part['emission']))
        if key not in mat_cache:mat_cache[key]=material(str(key),part['color'],part['metalness'],part['roughness'],part['emission'])
        obj.data.materials.append(mat_cache[key]);obj.matrix_world=converted(part['matrix'])
        if len(part['vertices'])==24:
            bevel=obj.modifiers.new('Machined edges','BEVEL');bevel.width=.018;bevel.segments=2
            normal=obj.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
        obj.rotation_mode='QUATERNION'
        if part['keys']:
            for sample in [{'frame':1,'matrix':part['matrix']},*part['keys']]:
                frame=chapter*N+sample['frame'];obj.matrix_world=converted(sample['matrix'])
                obj.keyframe_insert('location',frame=frame);obj.keyframe_insert('rotation_quaternion',frame=frame);obj.keyframe_insert('scale',frame=frame)
        for block in range(3):
            obj.hide_render=block!=chapter;obj.keyframe_insert('hide_render',frame=block*N+1)
        obj.hide_render=True;obj.keyframe_insert('hide_render',frame=chapter*N+97)
        if obj.animation_data:
            for curve in obj.animation_data.action.fcurves:
                for point in curve.keyframe_points:point.interpolation='CONSTANT' if curve.data_path=='hide_render' else 'LINEAR'
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.035));bpy.context.object.data.materials.append(floor)
grid=material('Floor markings',(.035,.065,.045),.1,.7)
for x in range(-12,13,2):
    bpy.ops.mesh.primitive_cube_add(size=1,location=(x,0,-.025));o=bpy.context.object;o.dimensions=(.008,24,.006);o.data.materials.append(grid)
for y in range(-12,13,2):
    bpy.ops.mesh.primitive_cube_add(size=1,location=(0,y,-.025));o=bpy.context.object;o.dimensions=(24,.008,.006);o.data.materials.append(grid)
def area(name,pos,energy,size,color):
    d=bpy.data.lights.new(name,'AREA');d.energy=energy;d.shape='DISK';d.size=size;d.color=color;o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=pos;o.rotation_euler=(Vector((0,0,1.4))-o.location).to_track_quat('-Z','Y').to_euler()
area('Large softbox',(1,-5,10),1900,8,(.85,1,.9));area('Edge reflection',(-6,2,6),1700,6,(.6,1,.35));area('Cool rim',(6,4,7),2100,5,(.75,.9,1))
silver=material('Mechanism silver',(.45,.57,.5),.8,.22)
graphite=material('Mechanism graphite',(.018,.038,.026),.65,.28)
signal=material('Mechanism enamel',(.52,.78,.14),.5,.27)
brass=material('Laser nozzle',(.5,.25,.06),.85,.25)
hot=material('Focused energy',(.95,.15,.012),.1,.3,(1,.18,.01))
def cube(name,size,pos,mat,parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1,location=pos);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if parent:o.parent=parent
    o.data.materials.append(mat);bevel=o.modifiers.new('Fine edges','BEVEL');bevel.width=.022;bevel.segments=2;o.modifiers.new('Surface normals','WEIGHTED_NORMAL');return o
def empty(name,pos=(0,0,0)):
    o=bpy.data.objects.new(name,None);scene.collection.objects.link(o);o.location=pos;return o
def shape(name,vertices,faces,mat):
    m=bpy.data.meshes.new(name);m.from_pydata(vertices,[],faces);m.update();o=bpy.data.objects.new(name,m);scene.collection.objects.link(o);o.data.materials.append(mat);return o
def extruded_yz(name,section,width,mat):
    vs=[(x,y,z) for x in [-width/2,width/2] for y,z in section];n=len(section);fs=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)];return shape(name,vs,fs,mat)
def key(o,prop,value,frame):setattr(o,prop,value);o.keyframe_insert(prop,frame=frame)
def show_macro(objects,chapter):
    for o in objects:
        for frame,hidden in [(1,True),(chapter*N+97,False),((chapter+1)*N+1,True)]:o.hide_render=hidden;o.keyframe_insert('hide_render',frame=frame)
        if o.animation_data:
            for curve in o.animation_data.action.fcurves:
                for point in curve.keyframe_points:point.interpolation='CONSTANT' if curve.data_path=='hide_render' else 'LINEAR'
# Laser macro: a moving nozzle and a progressively revealed cut path.
before=set(scene.objects)
cube('Cutting table',(8,4,.5),(0,.2,1.1),graphite)
cube('Plate',(7.4,3.2,.15),(0,0,1.65),silver)
head=empty('Moving laser head')
cube('Laser housing',(1.1,1.1,1.2),(0,0,3.4),graphite,head)
bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=.39,depth=.55,location=(0,0,2.65));o=bpy.context.object;o.parent=head;o.data.materials.append(brass)
bpy.ops.mesh.primitive_cone_add(vertices=32,radius1=.055,radius2=.32,depth=.6,location=(0,0,2.08));o=bpy.context.object;o.parent=head;o.data.materials.append(brass)
bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=.014,depth=.1,location=(0,0,1.75));o=bpy.context.object;o.parent=head;o.data.materials.append(hot)
curve=bpy.data.curves.new('Progressive laser kerf','CURVE');curve.dimensions='3D';curve.resolution_u=1;curve.bevel_depth=.014;curve.bevel_resolution=2;spline=curve.splines.new('POLY');spline.points.add(1);spline.points[0].co=(-2.8,0,1.731,1);spline.points[1].co=(2.8,0,1.731,1);o=bpy.data.objects.new('Glowing cut',curve);scene.collection.objects.link(o);o.data.materials.append(hot)
for frame,x,factor in [(97,-2.8,0),(192,2.8,1)]:key(head,'location',(x,0,0),frame);curve.bevel_factor_end=factor;curve.keyframe_insert('bevel_factor_end',frame=frame)
for i in range(14):
    a=i*2.399;o=cube('Cut sparks',(.009,.009,.2),(math.cos(a)*.12,math.sin(a)*.16,1.78+abs(math.sin(a))*.16),hot,head);o.rotation_euler=(a,.7,a*.5)
    for f in range(97,193,8):o.scale=(1,1,.5+abs(math.sin(f*.9+i))*1.4);o.keyframe_insert('scale',frame=f)
show_macro(set(scene.objects)-before,0)
# Bending macro: the punch forms a V while the finished sheet keeps its shape.
before=set(scene.objects)
extruded_yz('V die',[(-1.5,.8),(1.5,.8),(1.5,1.9),(.6,1.9),(0,1.3),(-.6,1.9),(-1.5,1.9)],8,graphite)
punch=extruded_yz('Press punch',[(-.5,3.15),(.5,3.15),(.5,2.55),(0,1.97),(-.5,2.55)],7.5,silver)
beam=cube('Press beam',(8,1.1,.9),(0,0,3.6),signal)
left=empty('Left sheet hinge',(0,0,1.97));right=empty('Right sheet hinge',(0,0,1.97))
cube('Left formed face',(7.2,1.5,.06),(0,-.75,0),silver,left);cube('Right formed face',(7.2,1.5,.06),(0,.75,0),silver,right)
for frame,stroke,angle in [(289,0,0),(301,0,0),(345,.57,.65),(365,0,.65),(384,0,.65)]:
    key(punch,'location',(0,0,-stroke),frame);key(beam,'location',(0,0,3.6-stroke),frame)
    z=1.97-(.57 if angle else 0);key(left,'location',(0,0,z),frame);key(right,'location',(0,0,z),frame);key(left,'rotation_euler',(-angle,0,0),frame);key(right,'rotation_euler',(angle,0,0),frame)
show_macro(set(scene.objects)-before,1)
# Shearing macro: a raked blade passes the fixed edge; the severed strip drops.
before=set(scene.objects)
cube('Shear bed',(8,2,1),(0,1.1,1),graphite);cube('Fixed lower edge',(8,.22,.22),(0,.1,1.42),silver)
cube('Retained plate',(7.2,1.6,.12),(0,.82,1.58),silver);offcut=cube('Separated strip',(7.2,1.2,.12),(0,-.6,1.58),silver)
vertices=[(-4,-.1,2.4),(4,-.1,2.8),(4,-.1,3.6),(-4,-.1,3.2),(-4,.1,2.4),(4,.1,2.8),(4,.1,3.6),(-4,.1,3.2)]
blade=shape('Raked moving blade',vertices,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(0,4,7,3),(1,2,6,5)],signal)
for frame,stroke,drop in [(481,0,0),(493,0,0),(531,1.24,0),(549,1.24,.75),(576,.1,.9)]:key(blade,'location',(0,0,-stroke),frame);key(offcut,'location',(0,-.6-drop*.45,1.58-drop),frame);key(offcut,'rotation_euler',(-drop*.45,0,0),frame)
show_macro(set(scene.objects)-before,2)
camdata=bpy.data.cameras.new('Process camera');camera=bpy.data.objects.new('Process camera',camdata);scene.collection.objects.link(camera);scene.camera=camera;camdata.type='ORTHO';camdata.ortho_scale=13.5;camdata.shift_x=-.22;camdata.lens=50
hud=bpy.data.objects.new('Screen graphics',None);scene.collection.objects.link(hud);hud.parent=camera;hud.location=(0,0,0)
W=13.5;H=W*720/1280
def hud_box(name,x,y,w,h,z,mat):
    bpy.ops.mesh.primitive_plane_add(size=1);o=bpy.context.object;o.name=name;o.parent=hud;o.location=(x,y,z);o.scale=(w,h,1);o.data.materials.append(mat);return o
hud_box('Editorial field',-.515*W,0,.43*W,H,-8,panel)
hud_box('Fine rule',-.305*W,0,.008,H*.86,-7.8,muted)
font_display=bpy.data.fonts.load(str(ROOT/'public/fonts/barlow-condensed.ttf'))
font_body=bpy.data.fonts.load(str(ROOT/'public/fonts/dm-sans-500.ttf'))
def text(name,body,x,y,size,mat,font=font_body):
    curve=bpy.data.curves.new(name,'FONT');curve.body=body;curve.size=size;curve.font=font;curve.space_line=1.35
    o=bpy.data.objects.new(name,curve);scene.collection.objects.link(o);o.parent=hud;o.location=(x,y,-7);o.data.materials.append(mat);return o
text('Brand','SACHIN INDUSTRIES',-.665*W,2.9,.21,white)
text('Location','SHEET METAL WORKS / PUNE, INDIA',-.665*W,2.52,.12,muted)
titles=[('01 / FIBER LASER','CUT.','12 kW fiber laser\nUp to 40 mm thickness*\n8,000 x 2,500 mm bed'),('02 / PRESS BRAKE','BEND.','Up to 25 mm thickness*\n8 metres of forming capability\nFrom flat sheet to useful form'),('03 / HEAVY-DUTY SHEARING','SHEAR.','Up to 25 mm thickness*\n8 metre length capability\nStraight cuts. Serious scale.')]
for chapter,(eyebrow,title,copy) in enumerate(titles):
    group=[text(f'Chapter {chapter}',eyebrow,-.665*W,1.35,.15,lime),text(f'Title {chapter}',title,-.67*W,-.05,1.62,white,font_display),text(f'Details {chapter}',copy,-.665*W,-1.1,.2,white)]
    for o in group:
        for block in range(3):o.hide_render=block!=chapter;o.keyframe_insert('hide_render',frame=block*N+1)
text('Qualification','*Capacities depend on material and job.\nIllustrative 3D process animation.',-.665*W,-2.95,.115,muted)
for i in range(3):
    hud_box(f'Chapter marker {i}',(-.61+i*.105)*W,-3.4,.085*W,.024,-7,muted)
    o=hud_box(f'Active chapter {i}',(-.61+i*.105)*W,-3.4,.085*W,.03,-6.95,lime)
    for block in range(3):o.hide_render=block!=i;o.keyframe_insert('hide_render',frame=block*N+1)
for frame in range(1,N*3+1,4):
    chapter=min((frame-1)//N,2);u=((frame-1)%N)/(N-1);ease=max(0,min(1,(u-.35)/.65));ease=ease*ease*(3-2*ease)
    # A restrained move from the whole machine into its working area.
    look=Vector((0,-.6*ease,1.5-.2*ease));angle=math.radians(42+u*7);radius=17
    camera.location=look+Vector((math.sin(angle)*radius,-math.cos(angle)*radius,8.3-1.0*ease));camera.rotation_euler=(look-camera.location).to_track_quat('-Z','Y').to_euler();camera.keyframe_insert('location',frame=frame);camera.keyframe_insert('rotation_euler',frame=frame)
    camdata.ortho_scale=13.5-2*ease;camdata.keyframe_insert('ortho_scale',frame=frame);hud.scale=(camdata.ortho_scale/13.5,)*3;hud.keyframe_insert('scale',frame=frame)
for obj in scene.objects:
    if obj.animation_data and obj.animation_data.action:
        for curve in obj.animation_data.action.fcurves:
            if curve.data_path=='hide_render':
                for point in curve.keyframe_points:point.interpolation='CONSTANT'
scene.frame_set(72)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'process-film.blend'))
if '--preview' in ARGS:
    scene.render.image_settings.file_format='PNG'
    for frame,name in [(72,'laser'),(144,'laser-detail'),(270,'bending'),(336,'bending-detail'),(465,'shearing'),(545,'shearing-detail')]:
        scene.frame_set(frame);scene.render.filepath=str(OUT/f'preview-{name}.png');bpy.ops.render.render(write_still=True)
elif '--render' in ARGS:
    scene.render.image_settings.file_format='FFMPEG';scene.render.ffmpeg.format='MPEG4';scene.render.ffmpeg.codec='H264';scene.render.ffmpeg.constant_rate_factor='MEDIUM';scene.render.ffmpeg.ffmpeg_preset='GOOD';scene.render.ffmpeg.audio_codec='NONE'
    scene.render.filepath=str(OUT/'process-film-raw.mp4');scene.frame_set(1);bpy.ops.render.render(animation=True)
