"use strict";
// My Vibe wheel patches for the renderer chunk that builds the carousel. Shared by patcher.js (Windows: the chunk
// is rewritten inside app.asar) and main.js (Linux: the chunk is rewritten when the page requests it).
// All or nothing: returns null unless every pattern matches exactly once, since partial patching would break the page.
const isWheelChunk = (code) => code.includes("Math.ceil(22/") && code.includes("centeredSlides:!0,loop:!0");

const patchWheelChunk = (code) => {
  const steps = [
    // Items are duplicated to fill the loop; keep them single when wheelNoLoop is on, and compute the static-mode flag
    [/(\w+)=\((\w+)=>0===\2\.length\?\2:Array\.from\(\{length:Math\.ceil\(22\/\2\.length\)\},\(\)=>\2\)\.flat\(\)\)\((\w+)\)/,
      (m, v, e, a) => `${v}=(${e}=>0===${e}.length||window.ymModsFlags?.wheelNoLoop?${e}:Array.from({length:Math.ceil(22/${e}.length)},()=>${e}).flat())(${a}),__ymFit=!!window.ymModsFlags?.wheelNoLoop&&${a}.length>0&&${a}.length<=__YM_SPV__`],
    [/direction:"vertical",centeredSlides:!0,loop:!0,/,
      () => 'direction:"vertical",centeredSlides:!__ymFit,loop:!window.ymModsFlags?.wheelNoLoop,"data-ym-fit":__ymFit?"1":void 0,'],
    [/initialSlide:(\w+),/, (m, n) => `initialSlide:__ymFit?0:${n},`],
    [/mousewheel:(\w+),/, (m, p) => `mousewheel:!__ymFit&&${p},`],
    [/shouldActionOnClick:(\w+)<3/, (m, o) => `shouldActionOnClick:__ymFit||${o}<3`],
    [/let (\w+)=(\w+)\((\w+),(\w+),(\w+)\.length\),(\w+)=(\w+)\(\1,\3\)/,
      (m, o, O, t, n, v, s, E) => `let ${o}=${O}(${t},${n},${v}.length),${s}=${E}(__ymFit?0:${o},${t})`],
    // Arc: in static mode measure the distance from the middle tile instead of the active one
    [/(\w+)=(\w+)=>\{\2\.slides\.forEach\((\w+)=>\{let (\w+)=\3\.progress;/,
      (m, ew, e, s, t) => `${ew}=${e}=>{let __ymC=0;if(${e}.params&&!${e}.params.centeredSlides&&${e}.slides.length){let q=0;${e}.slides.forEach(x=>{q+=Number.isFinite(x.progress)?x.progress:0});__ymC=-q/${e}.slides.length}${e}.slides.forEach(${s}=>{let ${t}=${s}.progress+__ymC;`],
  ];
  const spv = code.match(/slidesPerView:(\w+),initialSlide:/);
  if (!spv) return null;
  let out = code;
  for (const [re, fn] of steps) {
    if ((out.match(new RegExp(re.source, "g")) || []).length !== 1) return null;
    out = out.replace(re, fn);
  }
  return out.replace("__YM_SPV__", spv[1]);
};

module.exports = { isWheelChunk, patchWheelChunk };
