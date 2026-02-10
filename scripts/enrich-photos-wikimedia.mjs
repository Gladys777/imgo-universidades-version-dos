#!/usr/bin/env node
/**
 * Enrich top N institutions with real photos from Wikimedia Commons/Wikipedia.
 * - Picks top institutions by number of programs.
 * - Tries Commons file search first (namespace 6).
 * - Falls back to Wikipedia pageimage if available.
 * Saves back to src/data/universities.json (adds fields: photos[], photoSource).
 *
 * NOTE: Requires internet. Run locally:
 *   npm run data:photos
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, "..");
const DATA_PATH = path.join(PROJECT_ROOT, "src", "data", "universities.json");

const TOP_N = Number(process.env.TOP_N || 100);
const MAX_PHOTOS_PER_UNI = Number(process.env.MAX_PHOTOS_PER_UNI || 4);
const USER_AGENT = process.env.USER_AGENT || "ImgoDemo/1.0 (contact: your-email@example.com)";

function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

async function fetchJson(url){
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }});
  if(!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.json();
}

function normName(name=""){
  return String(name).trim().replace(/\s+/g," ");
}

function commonsFileUrl(fileTitle){
  // fileTitle like "File:Something.jpg"
  const filename = fileTitle.replace(/^File:/i,"").replace(/ /g,"_");
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}`;
}

async function searchCommonsFiles(query){
  const q = encodeURIComponent(query);
  const url = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srnamespace=6&srsearch=${q}&srlimit=6&format=json&origin=*`;
  const data = await fetchJson(url);
  const hits = data?.query?.search || [];
  // return titles
  return hits.map(h=>h.title).filter(Boolean);
}

async function wikipediaPageImage(searchQuery){
  const q = encodeURIComponent(searchQuery);
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${q}&srlimit=1&format=json&origin=*`;
  const s = await fetchJson(searchUrl);
  const title = s?.query?.search?.[0]?.title;
  if(!title) return null;

  const imgUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&pithumbsize=1200&format=json&origin=*`;
  const img = await fetchJson(imgUrl);
  const pages = img?.query?.pages || {};
  const firstPage = Object.values(pages)[0];
  const thumb = firstPage?.thumbnail?.source;
  return thumb || null;
}

function ensureArray(x){ return Array.isArray(x) ? x : []; }

async function main(){
  if(!fs.existsSync(DATA_PATH)){
    console.error("universities.json not found:", DATA_PATH);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(DATA_PATH,"utf8"));
  const universities = ensureArray(raw);

  // Sort by number of programs desc; this is our proxy for "most searched" until GA exists.
  const sorted = universities
    .map(u=>({u, n: ensureArray(u.programs).length}))
    .sort((a,b)=>b.n-a.n);

  const target = sorted.slice(0, TOP_N).map(x=>x.u);

  console.log(`Enriching photos for top ${target.length} institutions (proxy: #programs).`);

  let updatedCount=0;
  for(let i=0;i<target.length;i++){
    const uni = target[i];
    const name = normName(uni.name || uni.institutionName || "");
    const country = normName(uni.country || "Colombia");
    const city = normName(uni.city || "");

    if(!name){ continue; }

    // If already has photos, skip unless FORCE=1
    if(!process.env.FORCE && ensureArray(uni.photos).length>=1){
      continue;
    }

    const queries = [
      `${name} ${city} campus`,
      `${name} campus`,
      `${name} universidad campus`,
      `${name} ${country} campus`,
      `${name} building`,
    ];

    let photos = [];
    let source = null;

    for(const q of queries){
      try{
        const titles = await searchCommonsFiles(q);
        const urls = titles.map(commonsFileUrl);
        if(urls.length){
          photos = urls.slice(0, MAX_PHOTOS_PER_UNI);
          source = "Wikimedia Commons";
          break;
        }
      }catch(e){
        // ignore and try next
      }
      await sleep(200);
    }

    if(photos.length===0){
      // fallback to wikipedia thumbnail
      try{
        const thumb = await wikipediaPageImage(`${name} ${country}`);
        if(thumb){
          photos=[thumb];
          source="Wikipedia (pageimage)";
        }
      }catch(e){}
    }

    if(photos.length){
      uni.photos = photos;
      uni.photoSource = source;
      updatedCount++;
      if(updatedCount % 10 === 0){
        console.log(`  updated ${updatedCount}...`);
      }
    }

    // polite rate limit
    await sleep(250);
  }

  fs.writeFileSync(DATA_PATH, JSON.stringify(universities, null, 2), "utf8");
  console.log(`Done. Updated institutions: ${updatedCount}. Saved to ${DATA_PATH}`);
  console.log("Tip: Run with FORCE=1 TOP_N=100 MAX_PHOTOS_PER_UNI=4 to regenerate.");
}

main().catch(err=>{
  console.error(err);
  process.exit(1);
});
