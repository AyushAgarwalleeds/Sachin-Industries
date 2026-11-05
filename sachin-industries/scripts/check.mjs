import assert from 'node:assert/strict';
import { readFile, readdir, access, mkdtemp, mkdir, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
const root=resolve('dist');
const files=(await readdir(root)).filter(f=>f.endsWith('.html'));
assert.equal(files.length,11,'All eleven static pages must be built');
const titles=new Set(),descriptions=new Set();let linkCount=0,imageCount=0,schemaCount=0;
const pages=Object.fromEntries(await Promise.all(files.map(async f=>[f,await readFile(resolve(root,f),'utf8')])));
for(const [file,html] of Object.entries(pages)){
 assert.equal((html.match(/<h1\b/g)||[]).length,1,`${file}: exactly one H1`);
 const title=html.match(/<title>(.*?)<\/title>/s)?.[1];assert.ok(title&&title.length<90,`${file}: descriptive title`);assert.ok(!titles.has(title),`${file}: unique title`);titles.add(title);
 const description=html.match(/name="description" content="([^"]+)"/)?.[1];assert.ok(description&&description.length>=40,`${file}: description required`);assert.ok(!descriptions.has(description),`${file}: unique description`);descriptions.add(description);
 for(const match of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)){const data=JSON.parse(match[1]);assert.equal(data['@context'],'https://schema.org');assert.ok(data['@graph'].some(x=>x['@type']==='LocalBusiness'));schemaCount++;}
 for(const match of html.matchAll(/(?:href|src|poster)="(\/[^\"]*)"/g)){
  const value=match[1].replaceAll('&amp;','&');const u=new URL(value,'https://local.test');const path=u.pathname==='/'?'index.html':decodeURIComponent(u.pathname.slice(1));
  await access(resolve(root,path)).catch(()=>assert.fail(`${file}: broken local path ${value}`));
  if(u.hash&&pages[path])assert.ok(pages[path].includes(`id="${u.hash.slice(1)}"`),`${file}: missing anchor ${value}`);linkCount++;
 }
 for(const match of html.matchAll(/<img\b[^>]*>/g)){assert.ok(/alt="[^"]+"/.test(match[0]),`${file}: image alt required`);assert.ok(/width="\d+"/.test(match[0])&&/height="\d+"/.test(match[0]),`${file}: image dimensions required`);imageCount++;}
 assert.ok(!/example\.com|\bTODO\b|lorem ipsum|codex-preview/i.test(html),`${file}: no unfinished content`);
 assert.ok(!/fonts\.googleapis|fonts\.gstatic/.test(html),`${file}: fonts must be local`);
 assert.ok(!/\/images\/(?:laser|bending|shearing|factory)-machine\./.test(html),`${file}: retired photographs must not appear`);
}
const home=pages['index.html'];assert.ok(home.includes('40 <small>mm'));assert.ok(home.includes('8,000 × 2,500'));assert.ok(home.includes('tel:+919422027396'));
const robots=await readFile(resolve(root,'robots.txt'),'utf8');assert.ok(robots.includes('Allow: /'));
const canonical=home.match(/rel="canonical" href="([^"]+)"/);
if(canonical){const sitemap=await readFile(resolve(root,'sitemap.xml'),'utf8');assert.ok(sitemap.includes(canonical[1]));assert.equal((sitemap.match(/<url>/g)||[]).length,10);assert.ok(!sitemap.includes('404'));console.log('Production canonical URLs and 10-entry sitemap verified.');}
console.log(`PASS: ${files.length} pages, ${linkCount} local links/assets, ${imageCount} accessible images, ${schemaCount} JSON-LD graphs. Unique metadata, anchors, business details and crawlability verified.`);
// Exercise production URL generation in an isolated directory, without putting a test domain in the real build.
const fixture=await mkdtemp(resolve(tmpdir(),'sachin-seo-'));
await mkdir(resolve(fixture,'src'));await copyFile('src/home.html',resolve(fixture,'src/home.html'));
for(const name of ['cad.html','cad-guide.html','cad-promo.html'])await copyFile('src/'+name,resolve(fixture,'src/'+name));
await copyFile('src/guide.html',resolve(fixture,'src/guide.html'));
await copyFile('src/film.html',resolve(fixture,'src/film.html'));
await copyFile('src/process-film.html',resolve(fixture,'src/process-film.html'));
await mkdir(resolve(fixture,'public/media'),{recursive:true});
await copyFile('public/media/process-film.json',resolve(fixture,'public/media/process-film.json'));
const generated=spawnSync(process.execPath,[resolve('scripts/generate.mjs')],{cwd:fixture,env:{...process.env,SITE_URL:'https://sachin-seo-test.invalid',GA4_MEASUREMENT_ID:'G-UNITTEST1',GOOGLE_SITE_VERIFICATION:'unit_test_token',BING_SITE_VERIFICATION:'unit_test_bing'},encoding:'utf8'});
assert.equal(generated.status,0,generated.stderr);
const fixtureHome=await readFile(resolve(fixture,'index.html'),'utf8'),fixtureMap=await readFile(resolve(fixture,'public/sitemap.xml'),'utf8');
assert.ok(fixtureHome.includes('rel="canonical" href="https://sachin-seo-test.invalid/"'));
assert.ok(fixtureHome.includes('content="https://sachin-seo-test.invalid/images/social-preview-3d.jpg"'));
assert.equal((fixtureMap.match(/<url>/g)||[]).length,10);
assert.ok((await readFile(resolve(fixture,'public/robots.txt'),'utf8')).includes('Sitemap: https://sachin-seo-test.invalid/sitemap.xml'));
assert.ok(fixtureHome.includes('"measurementId":"G-UNITTEST1"'));
assert.ok(fixtureHome.includes('name="google-site-verification" content="unit_test_token"'));
assert.ok(fixtureHome.includes('name="msvalidate.01" content="unit_test_bing"'));
const schema=JSON.parse(fixtureHome.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
assert.equal(schema['@graph'].find(s=>s['@type']==='FAQPage').mainEntity.length,5);
assert.ok((await readFile(resolve(fixture,'404.html'),'utf8')).includes('content="noindex,follow"'));
const watch=await readFile(resolve(fixture,'process-film.html'),'utf8');
const watchGraph=JSON.parse(watch.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1])['@graph'];
const video=watchGraph.find(v=>v['@type']==='VideoObject');assert.equal(video.duration,'PT24S');assert.equal(video.hasPart.length,3);assert.equal(video.contentUrl,'https://sachin-seo-test.invalid/media/sachin-process-film.mp4');assert.ok(video.thumbnailUrl[0].startsWith('https://'));
assert.ok(fixtureMap.includes('<video:video>'));assert.ok(fixtureMap.includes('<video:duration>24</video:duration>'));assert.ok(watch.includes('<video'));assert.ok(watch.includes('process-film-en.vtt'));
const movie=await readFile(resolve(root,'media/sachin-process-film.mp4'));assert.equal(movie.toString('ascii',4,8),'ftyp');assert.ok(movie.length>100000,'Film must be an actual encoded MP4');
console.log('PASS: production canonical/social metadata, ten-page sitemap, visible FAQ schema, GA4 configuration, verification tags and 404 indexing controls.');
console.log('PASS: encoded 24-second MP4, captions, watch page, VideoObject, three chapters and video sitemap metadata. Retired photographs are absent from all pages.');

const fixtureCad=await readFile(resolve(fixture,'cad.html'),'utf8'),cadGraph=JSON.parse(fixtureCad.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1])['@graph'];
const cad=cadGraph.find(x=>x['@type']==='WebApplication');assert.equal(cad.isAccessibleForFree,true);assert.equal(cad.offers.price,'0');assert.equal(cad.url,'https://sachin-seo-test.invalid/cad.html');assert.equal(cad.featureList.length,49);assert.ok(cadGraph.find(x=>x['@type']==='FAQPage').mainEntity.length===4);
assert.ok(fixtureMap.includes('/cad.html'));assert.ok(fixtureMap.includes('/cad-guide.html'));assert.ok(home.includes('data-load-map'));assert.ok(home.includes('Open Sachin CAD'));assert.ok(fixtureCad.includes('Your drawings stay on your device'));
assert.ok(pages['cad-guide.html'].includes('PLINE 0,0 120,0'));assert.ok(!pages['cad-guide.html'].includes('<!-- CAD_COMMAND_TABLE -->'));
console.log('PASS: 49-tool CAD application metadata, free access, four matching FAQs, command guide, CAD sitemap URLs, homepage discovery link and interactive-map loader.');
