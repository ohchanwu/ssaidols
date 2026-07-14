/**
 * 원본 TourAPI JSON → 슬림 POI 인덱스 생성.
 *
 * 원본은 공공누리 제3유형(변경 금지)이므로 절대 수정하지 않고, 파생 파일만 새로 만든다.
 * 산출물: public/index/{contentTypeId}.json + public/index/manifest.json
 *
 * 필드 선정 근거는 docs/plans/mvp-must-have-plan.ko.md §3 참조 (실측 기반).
 *   - tel 제외: 3.1%만 채워져 있음
 *   - cat1~3 제외: 22%만 채워져 있고 코드표도 없음 → lclsSystm1/2 사용 (100% 충족)
 */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
import { join, basename } from 'node:path'

const SRC_DIR = '서울_data'
const OUT_DIR = 'public/index'

// deferred/ 는 범위 제외(쇼핑). 하위 디렉터리를 훑지 않으므로 자동으로 빠지지만,
// 실수로 다시 들어오는 것을 막기 위해 파일명으로도 한 번 더 거른다.
const EXCLUDED = ['쇼핑', '음식점']

const toPoi = (it) => ({
  id: it.contentid,
  type: it.contenttypeid,
  name: it.title,
  addr: it.addr1 ?? '',
  lat: Number.parseFloat(it.mapy),
  lng: Number.parseFloat(it.mapx),
  img: it.firstimage ?? '',
  l1: it.lclsSystm1 ?? '',
  l2: it.lclsSystm2 ?? '',
})

// 좌표가 없는 항목은 지도에 찍을 수 없으므로 인덱스에서 제외한다.
const hasCoords = (p) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && p.lat !== 0 && p.lng !== 0

const entries = (await readdir(SRC_DIR, { withFileTypes: true }))
  .filter((e) => e.isFile() && e.name.endsWith('.json'))
  .filter((e) => !EXCLUDED.some((x) => e.name.includes(x)))

if (entries.length === 0) throw new Error(`${SRC_DIR} 에서 대상 JSON을 찾지 못했습니다.`)

await mkdir(OUT_DIR, { recursive: true })

const manifest = []
let totalIn = 0
let totalOut = 0

for (const entry of entries) {
  const raw = JSON.parse(await readFile(join(SRC_DIR, entry.name), 'utf-8'))
  const items = raw.items.map(toPoi).filter(hasCoords)

  const dropped = raw.items.length - items.length
  totalIn += raw.items.length
  totalOut += items.length

  const outFile = `${raw.contentTypeId}.json`
  const payload = {
    contentTypeId: raw.contentTypeId,
    contentType: raw.contentType,
    total: items.length,
    items,
  }
  await writeFile(join(OUT_DIR, outFile), JSON.stringify(payload), 'utf-8')

  manifest.push({
    contentTypeId: raw.contentTypeId,
    contentType: raw.contentType,
    total: items.length,
    file: outFile,
  })

  const kb = (Buffer.byteLength(JSON.stringify(payload)) / 1024).toFixed(0)
  const note = dropped > 0 ? ` (좌표 없음 ${dropped}건 제외)` : ''
  console.log(`  ${raw.contentType.padEnd(8)} ${String(items.length).padStart(4)}건 → ${outFile} ${kb}KB${note}`)
}

manifest.sort((a, b) => b.total - a.total)
await writeFile(join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8')

console.log(`\n✓ POI 인덱스 생성 완료: ${totalOut}건 / ${manifest.length}개 카테고리`)
if (totalIn !== totalOut) console.log(`  (원본 ${totalIn}건 중 좌표 누락 ${totalIn - totalOut}건 제외)`)
console.log(`  → ${OUT_DIR}/`)
