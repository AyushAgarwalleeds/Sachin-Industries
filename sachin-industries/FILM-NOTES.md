# Original 3D process film

## Delivered assets

- `public/media/sachin-process-film.mp4`: 24 seconds, 1280 × 720, 24 fps, silent H.264, fast start, approximately 1.7 MB.
- `public/media/process-film-en.vtt`: optional English visual descriptions.
- `public/media/process-film.json`: duration, chapter boundaries and publication metadata used by the generator.
- `public/images/process-film-poster.webp`: rendered 3D thumbnail.
- `public/images/social-preview-3d.jpg`: rendered social sharing image.
- `src/process-film.html`: watch page and visible transcript.
- `src/film.html`: home-page player and chapter controls.

The chapters are laser cutting (0–8 seconds), bending (8–16 seconds), and shearing (16–24 seconds). Each first presents a stylised machine and then a close-up of the working process. The film is a conceptual illustration, with material and job qualifications. It does not claim to be footage of the factory or a dimensionally accurate simulation.

The film was authored programmatically and rendered locally in Blender. Runway's connected plan did not include video generation, so no Runway-generated video is claimed or required by the website.

## Editable sources and rebuild

`src/models.js` is shared by the interactive viewer, SVG exporter and film model exporter. `scripts/render-film.py` builds the movie scene, close-up mechanisms, camera motion and graphic overlays. These are build-time tools; hosting the website does not require Blender or a video service.

1. Run `npm run illustrations` to regenerate the SVG studies in `public/illustrations/`.
2. Run `npm run film:models` to export `artwork/machines.json`.
3. With Blender 3.3 installed, run `blender --background --python scripts/render-film.py -- --preview` for six stills, or use `--render` for the complete film. On this workstation the executable is `D:\blender\blender.exe`. The script uses Blender 3.3's Eevee API; newer Blender versions may need adjustments.
4. Optimise `artwork/process-film-raw.mp4` with FFmpeg. The delivered encode used:

```sh
ffmpeg -i artwork/process-film-raw.mp4 -c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p -movflags +faststart -an public/media/sachin-process-film.mp4
```

5. Refresh the rendered poster, social image, descriptions, transcript and metadata when the movie changes. Then run `npm run build` and `npm run check`.

`artwork/` contains rendering intermediates and is ignored by Git. Blender saves an editable `.blend` there when the scene script runs. Original reference photographs and retired artwork are archived in `references/`; neither folder is included in `dist`.

## Website behaviour

The hero film is decorative and silent. It plays only above 1000 CSS pixels, when in view, when motion is enabled, and when the browser has not requested data saving. It pauses off screen and in background tabs. Phone and tablet heroes use SVGs. The separate native video player is available on all screen sizes, with controls and chapter buttons. The watch page supports `?t=8` and `?t=16` links without autoplaying.

When the real production origin is available, the generator adds VideoObject and Clip structured data, the absolute media and thumbnail URLs, and a video sitemap entry. The watch page's transcript and service links remain readable without WebGL. These features describe the movie to search systems; indexing and search appearance remain decisions made by those systems.
