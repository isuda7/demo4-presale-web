// SEO · AEO · GEO 빌드 플러그인
// 1) JavaScript로 그리던 핵심 콘텐츠(면적표·평면·유의사항·FAQ)를 정적 HTML로 미리 넣는다.
//    → JavaScript를 실행하지 않는 검색·AI 크롤러도 사실 정보를 읽는다.
// 2) 페이지별 canonical, og:url, 절대경로 og:image, 트위터 카드, 구조화 데이터(JSON-LD)를 넣는다.
// 3) sitemap.xml, robots.txt, llms.txt를 만든다(개발 서버에서도 같은 주소로 볼 수 있다).
import { readFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { UNITS } from '../src/data/units.js';
import { SITE, PAGES, FAQ } from '../src/data/site.js';
import { esc, typeLabel, notesListHtml, summaryTableHtml, unitTabsHtml, unitPanelsHtml, faqHtml } from '../src/js/render.js';

const NOINDEX_PAGES = new Set(['admin', '404']);

export function seoPlugin({ root, siteUrl, verification = {}, indexing = true }) {
  const notes = JSON.parse(readFileSync(resolve(root, 'src/data/notes.json'), 'utf8'));
  const abs = (p) => `${siteUrl}${p.startsWith('/') ? p : `/${p}`}`;
  const pageOf = (name) => PAGES.find((p) => p.name === name);
  // 페이지 설명은 원본 HTML의 meta description에서 읽는다(llms.txt용)
  const descriptions = Object.fromEntries(PAGES.map((p) => {
    try {
      const src = readFileSync(resolve(root, `${p.name}.html`), 'utf8');
      return [p.name, src.match(/<meta name="description" content="(.*?)"/)?.[1] ?? ''];
    } catch { return [p.name, '']; }
  }));

  /* ---------- 정적 콘텐츠 ---------- */
  function fillStatic(html) {
    return html
      .replace(/(id="unitSummaryTable2?"[^>]*>)(<\/div>)/g, (_, open, close) => `${open}${summaryTableHtml(UNITS)}${close}`)
      .replace(/(id="unitTabs"[^>]*>)(<\/div>)/, (_, open, close) => `${open}${unitTabsHtml(UNITS)}${close}`)
      .replace(/(<div id="unitPanels">)(<\/div>)/, (_, open, close) => `${open}${unitPanelsHtml(UNITS, notes)}${close}`)
      .replace(/<details class="notes"([^>]*) data-notes="(\d+)"([^>]*)><summary>(.*?)<\/summary><\/details>/g, (m, a, n, b, summary) => {
        const list = notes[n] || [];
        return list.length ? `<details class="notes"${a} data-notes="${n}"${b}><summary>${summary}</summary><ul>${notesListHtml(list)}</ul></details>` : '';
      })
      .replace(/(<details class="acc" data-notes-list="(\d+)"><summary>.*?<\/summary><ul>)(<\/ul>)/g, (_, open, n, close) => `${open}${notesListHtml(notes[n])}${close}`)
      .replace('<!-- @faq -->', faqHtml(FAQ))
      .replace(/<!-- @site:(\w+) -->/g, (_, key) => esc(SITE[key] ?? ''));
  }

  /* ---------- 구조화 데이터 ---------- */
  function jsonLd(name) {
    const out = [];
    const page = pageOf(name);
    if (name === 'index') {
      out.push({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE.name,
        alternateName: SITE.nameEn,
        url: abs('/'),
        inLanguage: 'ko-KR',
        description: SITE.summary,
      });
      out.push(complexLd());
    } else if (page) {
      out.push({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '홈', item: abs('/') },
          { '@type': 'ListItem', position: 2, name: page.label, item: abs(page.path) },
        ],
      });
    }
    if (name === 'unit') {
      out.push({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: `${SITE.name} 타입별 평면`,
        numberOfItems: UNITS.length,
        itemListElement: UNITS.map((u, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: {
            '@type': 'Apartment',
            name: `${SITE.name} ${typeLabel(u)}`,
            url: abs(`/unit.html?type=${u.id}`),
            image: abs(`/images/unit-${u.id}-basic.webp`),
            floorSize: { '@type': 'QuantitativeValue', value: Number(u.blocks[0].exclusive), unitCode: 'MTK', unitText: '㎡ (전용면적)' },
            additionalProperty: u.blocks.flatMap((b) => [
              { '@type': 'PropertyValue', name: `${b.danji} 세대수`, value: b.households },
              { '@type': 'PropertyValue', name: `${b.danji} 공급면적(㎡)`, value: Number(b.supply) },
              { '@type': 'PropertyValue', name: `${b.danji} 계약면적(㎡)`, value: Number(b.contract) },
            ]),
            containedInPlace: { '@type': 'ApartmentComplex', name: SITE.name, url: abs('/') },
          },
        })),
      });
    }
    if (name === 'faq') {
      out.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQ.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a.join(' ') },
        })),
      });
    }
    if (name === 'community' || name === 'location') out.push(complexLd({ compact: true }));
    return out;
  }

  function complexLd({ compact = false } = {}) {
    const ld = {
      '@context': 'https://schema.org',
      '@type': 'ApartmentComplex',
      name: SITE.name,
      alternateName: SITE.nameEn,
      url: abs('/'),
      description: SITE.summary,
      image: [abs(SITE.defaultImage), abs('/images/exterior.webp')],
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'KR',
        addressRegion: SITE.address.region,
        addressLocality: SITE.address.locality,
        streetAddress: SITE.address.street1,
      },
      numberOfAccommodationUnits: SITE.totalHouseholds,
      amenityFeature: SITE.amenities.map((a) => ({ '@type': 'LocationFeatureSpecification', name: a, value: true })),
    };
    if (!compact) {
      ld.additionalProperty = [
        { '@type': 'PropertyValue', name: '시공', value: SITE.builder },
        { '@type': 'PropertyValue', name: '시행', value: SITE.developer },
        { '@type': 'PropertyValue', name: '위탁', value: SITE.agent },
        ...SITE.blocks.flatMap((b) => [
          { '@type': 'PropertyValue', name: `${b.name} 세대수`, value: b.households },
          { '@type': 'PropertyValue', name: `${b.name} 위치`, value: b.address },
          { '@type': 'PropertyValue', name: `${b.name} 분양규모(연면적)`, value: b.grossFloorArea },
        ]),
        { '@type': 'PropertyValue', name: '정보 기준', value: SITE.basis },
      ];
    }
    return ld;
  }

  /* ---------- head 메타 ---------- */
  function headTags(name, html) {
    const page = pageOf(name);
    const title = html.match(/<title>(.*?)<\/title>/)?.[1] ?? SITE.name;
    const desc = html.match(/<meta name="description" content="(.*?)"/)?.[1] ?? SITE.summary;
    const tags = [];
    if (!indexing && !NOINDEX_PAGES.has(name) && !/name="robots"/.test(html)) {
      tags.push('<meta name="robots" content="noindex, nofollow" />'); // 검색 노출 끔(SEARCH_INDEXING=off)
    }
    if (NOINDEX_PAGES.has(name)) {
      if (!/name="robots"/.test(html)) tags.push('<meta name="robots" content="noindex, nofollow" />');
      return tags;
    }
    const url = abs(page?.path ?? `/${name}.html`);
    const image = abs(page?.image ?? SITE.defaultImage);
    tags.push(`<link rel="canonical" href="${url}" />`);
    // 검색엔진 소유 확인 메타태그 (환경변수로 받은 값, 메인 페이지에만)
    if (name === 'index') {
      const meta = { google: 'google-site-verification', naver: 'naver-site-verification', bing: 'msvalidate.01' };
      for (const [k, metaName] of Object.entries(meta)) {
        const v = String(verification[k] ?? '').trim();
        if (/^[\w\-.=+/]{8,200}$/.test(v)) tags.push(`<meta name="${metaName}" content="${v}" />`);
      }
    }
    tags.push('<meta property="og:type" content="website" />');
    tags.push('<meta property="og:locale" content="ko_KR" />');
    tags.push(`<meta property="og:url" content="${url}" />`);
    tags.push(`<meta property="og:image" content="${image}" />`);
    if (!/property="og:title"/.test(html)) tags.push(`<meta property="og:title" content="${title}" />`);
    if (!/property="og:description"/.test(html)) tags.push(`<meta property="og:description" content="${desc}" />`);
    tags.push('<meta name="twitter:card" content="summary_large_image" />');
    tags.push(`<meta name="twitter:title" content="${title}" />`);
    tags.push(`<meta name="twitter:description" content="${desc}" />`);
    tags.push(`<meta name="twitter:image" content="${image}" />`);
    for (const ld of jsonLd(name)) {
      tags.push(`<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`);
    }
    return tags;
  }

  /* ---------- 파일 생성 ---------- */
  const today = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);

  function sitemapXml() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PAGES.map((p) => `  <url><loc>${abs(p.path)}</loc><lastmod>${today()}</lastmod><priority>${p.priority ?? '0.7'}</priority></url>`).join('\n')}
</urlset>
`;
  }

  function robotsTxtClosed() {
    // 검색 노출 끔: 검색엔진은 noindex를 읽을 수 있게 접근만 허용하고, AI 크롤러와 사이트맵은 막는다
    const aiBots = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'CCBot'];
    return `# ${SITE.name} — 검색 노출 꺼짐 (모든 페이지 noindex)
User-agent: *
Allow: /
Disallow: /admin.html
Disallow: /api/

${aiBots.map((b) => `User-agent: ${b}`).join('\n')}
Disallow: /
`;
  }

  function robotsTxt() {
    const rules = 'Allow: /\nDisallow: /admin.html\nDisallow: /api/';
    // AI 검색·답변 크롤러는 명시적으로 허용한다(홍보 사이트는 인용될수록 유리). 막으려면 이 목록을 Disallow: / 로 바꾼다.
    const aiBots = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended'];
    return `# ${SITE.name}
User-agent: *
${rules}

# AI 검색·답변 크롤러
${aiBots.map((b) => `User-agent: ${b}`).join('\n')}
${rules}

# 네이버 · 다음
User-agent: Yeti
User-agent: Daumoa
${rules}

Sitemap: ${abs('/sitemap.xml')}
`;
  }

  function llmsTxt() {
    const lines = [];
    lines.push(`# ${SITE.name}`, '', `> ${SITE.summary}`, '');
    lines.push('## 핵심 정보', '');
    lines.push(`- 위치: ${SITE.blocks.map((b) => `${b.name} ${b.address}`).join(' / ')}`);
    lines.push(`- 세대수: 총 ${SITE.totalHouseholds.toLocaleString()}세대 (${SITE.blocks.map((b) => `${b.name} ${b.households}세대`).join(', ')})`);
    lines.push(`- 타입: ${UNITS.map(typeLabel).join(', ')} (10개 타입)`);
    lines.push(`- 시공: ${SITE.builder} / 시행: ${SITE.developer} / 위탁: ${SITE.agent}`);
    lines.push(`- 용도: ${SITE.use}, ${SITE.landOwnership}`);
    lines.push(`- 커뮤니티: ${SITE.amenities.join(', ')}`);
    lines.push(`- 정보 기준: ${SITE.basis}`, '');
    lines.push('## 타입별 면적 (전용 / 공급 / 계약, ㎡)', '');
    lines.push('| 타입 | 단지 | 세대수 | 전용 | 공급 | 계약 |', '|---|---|---|---|---|---|');
    for (const u of UNITS) for (const b of u.blocks) lines.push(`| ${typeLabel(u)} | ${b.danji} | ${b.households} | ${b.exclusive} | ${b.supply} | ${b.contract} |`);
    lines.push('', '## 페이지', '');
    for (const p of PAGES) lines.push(`- [${p.label}](${abs(p.path)}): ${descriptions[p.name] ?? ''}`.trimEnd());
    lines.push('', '## 자주 묻는 질문', '');
    for (const f of FAQ) lines.push(`- **${f.q}** ${f.a[0]}`);
    lines.push('', '## 안내', '', `- 사진·이미지·CG는 소비자의 이해를 돕기 위한 것으로 실제와 다를 수 있습니다.`, `- 분양 일정·견본주택 정보는 확정되는 대로 안내하며, 관심고객 등록: ${abs('/apply.html')}`, '');
    return lines.join('\n');
  }

  // 검색 노출을 끄면 사이트맵·llms.txt는 만들지 않고 robots.txt만 차단용으로 만든다
  const files = indexing
    ? {
        '/sitemap.xml': ['application/xml; charset=utf-8', sitemapXml],
        '/robots.txt': ['text/plain; charset=utf-8', robotsTxt],
        '/llms.txt': ['text/plain; charset=utf-8', llmsTxt],
      }
    : { '/robots.txt': ['text/plain; charset=utf-8', robotsTxtClosed] };

  return {
    name: 'presale-seo',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const name = basename(ctx.filename || ctx.path || 'index.html', '.html');
        const filled = fillStatic(html);
        const tags = headTags(name, filled);
        return filled.replace('</head>', `  ${tags.join('\n  ')}\n</head>`);
      },
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const f = files[req.url?.split('?')[0]];
        if (!f) return next();
        res.setHeader('Content-Type', f[0]);
        res.end(f[1]());
      });
    },
    generateBundle() {
      for (const [path, [, make]] of Object.entries(files)) {
        this.emitFile({ type: 'asset', fileName: path.slice(1), source: make() });
      }
    },
  };
}
