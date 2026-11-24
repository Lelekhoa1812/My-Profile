export type ProfileFact = {
  key: string;
  kind: string;
  value: string;
  visibility?: string;
};

export type ProfileSection = {
  sectionId: string;
  heading: string;
  sourceType: string;
  aliases?: string[];
  text: string;
  visibility?: string;
};

const FACT_LABELS: Record<string, string> = {
  full_name: "Name",
  also_known_as: "Also called",
  email: "Email",
  phone: "Phone",
  location: "Location",
  linkedin: "LinkedIn",
  github: "GitHub",
  huggingface: "Hugging Face",
  public_title: "Current title",
  page_title: "Page title",
  degree: "Degree",
  languages: "Languages",
  experience_span: "Experience",
};

export function factLabel(key: string): string {
  return FACT_LABELS[key] ?? key.replaceAll("_", " ");
}

const FACT_KEY_ALIASES: Record<string, readonly string[]> = {
  current_title: ["public_title"],
  job_title: ["public_title"],
  title: ["public_title", "page_title"],
  job: ["public_title"],
  name: ["full_name"],
  experience: ["experience_span"],
};

function factKeys(key: string): string[] {
  const normalized = key.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return [...new Set([normalized, ...(FACT_KEY_ALIASES[normalized] ?? [])])];
}

export function lookupFacts(facts: readonly ProfileFact[], input: { key?: string; kind?: string }) {
  if (!input.key && !input.kind) return { found: false as const };
  let rows = facts.filter((fact) => (fact.visibility ?? "public") === "public");
  if (input.key) {
    const keys = factKeys(input.key);
    const byKey = rows.filter((fact) => keys.includes(fact.key));
    rows = byKey.length > 0 ? byKey : rows.filter((fact) => {
      const hay = `${fact.key} ${factLabel(fact.key)} ${fact.value}`.toLowerCase();
      const terms = keys[0]?.split("_").filter((term) => term.length > 2 && !STOP_WORDS.has(term)) ?? [];
      return terms.length > 0 && terms.every((term) => hay.includes(term));
    });
  }
  if (input.kind) {
    const byKind = rows.filter((fact) => fact.kind === input.kind);
    if (byKind.length > 0) rows = byKind;
    else if (!input.key) return { found: false as const };
  }
  if (rows.length === 0) return { found: false as const };
  return {
    found: true as const,
    facts: rows.map((fact) => ({ label: factLabel(fact.key), kind: fact.kind, value: fact.value })),
  };
}

export function listSections(sections: readonly ProfileSection[], sourceType?: string) {
  const sectionsOut = sections
    .filter((section) => (section.visibility ?? "public") === "public")
    .filter((section) => !section.sectionId.startsWith("archive-"))
    .filter((section) => !sourceType || section.sourceType === sourceType)
    .map((section) => ({
      sectionId: section.sectionId,
      heading: section.heading,
      sourceType: section.sourceType,
    }));
  if (sectionsOut.length === 0) return { found: false as const, sections: sectionsOut };
  return { found: true as const, sections: sectionsOut };
}

const CURRENT_ROLE = new Set(["current role", "current job", "current title", "current employer"]);

export function readSection(sections: readonly ProfileSection[], sectionId: string) {
  const wanted = sectionId.trim().toLowerCase();
  const phrase = wanted.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  const visible = sections.filter((item) => (item.visibility ?? "public") === "public");
  const current = CURRENT_ROLE.has(phrase) ? visible.find((item) => item.sectionId === "role-axion") : undefined;
  const section = current
    ?? visible.find((item) => item.sectionId === sectionId)
    ?? visible.find((item) => item.heading.toLowerCase() === wanted || item.sectionId.toLowerCase() === wanted)
    ?? uniqueHeading(visible, wanted)
    ?? uniqueAlias(visible, wanted)
    ?? (phrase === wanted ? undefined : uniqueHeading(visible, phrase) ?? uniqueAlias(visible, phrase));
  if (!section) return { found: false as const };
  return {
    found: true as const,
    sectionId: section.sectionId,
    heading: section.heading,
    sourceType: section.sourceType,
    text: section.text,
  };
}

const BROAD_SECTION_IDS = ["role-axion", "project-shipped"] as const;

const ROLE_SPANS: readonly { key: string; start: number; end: number; ids: readonly string[]; before?: readonly string[]; nested?: boolean }[] = [
  { key: "axion", start: 202607, end: 999912, ids: ["role-axion"] },
  { key: "harry", start: 202512, end: 202607, ids: ["role-harry-senior"] },
  { key: "pedigree", start: 202603, end: 202605, ids: ["role-harry-pedigree"], before: ["role-harry-senior"], nested: true },
  { key: "mizco", start: 202511, end: 202606, ids: ["role-mizco"] },
  { key: "teqar", start: 202505, end: 999912, ids: ["role-teqar"] },
  { key: "medswin", start: 202508, end: 202607, ids: ["role-swinburne-research"] },
  { key: "research", start: 202508, end: 202607, ids: ["role-swinburne-research"] },
  { key: "aitc", start: 202506, end: 202511, ids: ["role-aitc"] },
  { key: "hai", start: 202508, end: 202510, ids: ["role-hai-au"] },
  { key: "pythera", start: 202501, end: 202509, ids: ["role-pythera"] },
  { key: "poptech", start: 202505, end: 202507, ids: ["role-poptech"] },
  { key: "nam", start: 202412, end: 202505, ids: ["role-nam-a-ai"] },
  { key: "inet", start: 202404, end: 202503, ids: ["role-inet"] },
  { key: "vietdan", start: 202412, end: 202502, ids: ["role-vietdan-ml"] },
  { key: "alta", start: 202205, end: 202301, ids: ["role-alta"] },
];

function spanMonths(value: number): number {
  return Math.floor(value / 100) * 12 + (value % 100);
}

function overlappingRoleIds(text: string): string[] | undefined {
  if (!/\boverlaps?\b/.test(text) && !/\bsame time\b/.test(text)) return undefined;
  const named = ROLE_SPANS.filter((span) => text.includes(span.key) && !span.nested);
  if (named.length === 0 && /\broles?\b/.test(text)) {
    const current = ROLE_SPANS.find((span) => span.key === "axion");
    if (current) named.push(current);
  }
  if (named.length !== 1) return undefined;
  const anchor = named[0];
  if (!anchor) return undefined;
  const others = ROLE_SPANS.filter((span) => !span.nested && span.ids.every((id) => !anchor.ids.includes(id)) && span.start < anchor.end && span.end > anchor.start)
    .map((span) => ({ id: span.ids[0] ?? "", months: spanMonths(Math.min(span.end, anchor.end)) - spanMonths(Math.max(span.start, anchor.start)) }))
    .filter((item) => item.id.length > 0)
    .sort((left, right) => right.months - left.months);
  const ids = [...anchor.ids, ...others.map((item) => item.id)].filter((id, index, list) => list.indexOf(id) === index).slice(0, 4);
  return ids.length > 1 ? ids : undefined;
}

function betweenRoleIds(text: string): string[] | undefined {
  if (!/\bbetween\b/.test(text)) return undefined;
  const named = ROLE_SPANS.filter((span, index, list) => text.includes(span.key) && !span.nested && list.findIndex((item) => item.ids[0] === span.ids[0]) === index);
  if (named.length !== 2) return undefined;
  const ordered = [...named].sort((left, right) => left.start - right.start);
  const earlier = ordered[0];
  const later = ordered[1];
  if (!earlier || !later) return undefined;
  const other = (span: (typeof ROLE_SPANS)[number]) => !span.nested && span.ids.every((id) => !earlier.ids.includes(id) && !later.ids.includes(id));
  const startedAfter = ROLE_SPANS.filter((span) => other(span) && span.start >= earlier.end && span.start < later.start).sort((left, right) => left.start - right.start);
  if (startedAfter.length > 0) return startedAfter.flatMap((span) => span.ids).filter((id, index, list) => list.indexOf(id) === index).slice(0, 3);
  const covering = ROLE_SPANS.filter((span) => other(span) && span.start < later.start && span.end > earlier.end).sort((left, right) => right.start - left.start);
  const middle = covering.flatMap((span) => span.ids).filter((id, index, list) => list.indexOf(id) === index).slice(0, 2);
  return [...earlier.ids, ...middle, ...later.ids].filter((id, index, list) => list.indexOf(id) === index);
}

function recentEndedRoleIds(text: string): string[] | undefined {
  if (!/\bprevious role\b/.test(text) && !(/\bended\b/.test(text) && /\broles?\b/.test(text))) return undefined;
  const closed = ROLE_SPANS.filter((span, index, list) => !span.nested && span.end < 999912 && list.findIndex((item) => item.ids[0] === span.ids[0]) === index);
  const latest = closed.reduce((end, span) => Math.max(end, span.end), 0);
  const ids = closed.filter((span) => span.end === latest).sort((left, right) => right.start - left.start).flatMap((span) => span.ids);
  return ids.length > 0 ? ids.slice(0, 2) : undefined;
}

function adjacentRoleIds(text: string) {
  const before = text.match(/\bbefore\s+(?:the\s+)?([a-z]+)\b/);
  const after = text.match(/\bafter\s+(?:the\s+)?([a-z]+)\b/);
  const word = before?.[1] ?? after?.[1];
  const key = word === "hirer" ? "harry" : word;
  const named = ROLE_SPANS.find((span) => span.key === key);
  if (!named) return undefined;
  if (before && named.before) return [...named.before];
  const spans = before
    ? ROLE_SPANS.filter((span) => span.end <= named.start && span.ids.every((id) => !named.ids.includes(id)) && !span.nested).sort((left, right) => right.end - left.end || right.start - left.start)
    : ROLE_SPANS.filter((span) => span.start >= named.end && span.ids.every((id) => !named.ids.includes(id))).sort((left, right) => left.start - right.start);
  const ids = spans.flatMap((span) => span.ids).filter((id, index, list) => list.indexOf(id) === index).slice(0, 3);
  return ids.length > 0 ? ids : undefined;
}

function askedProductSectionIds(text: string): string[] | undefined {
  const named: Array<[RegExp, string]> = [
    [/\bestatefolio\b/, "project-estatefolio"],
    [/\bcva\b/, "project-cva"],
    [/\bmedchat\b/, "project-medchat"],
    [/\bsall-?e\b/, "project-salle"],
    [/\bcodoptic\b/, "project-codoptic"],
    [/\bgolf\b/, "project-golf"],
    [/\bwritingjourney\b|\bwriting coach\b/, "project-writing"],
    [/\badhd\b/, "project-adhd"],
    [/\bquotient\b/, "project-quotient"],
    [/\bfree-router\b/, "project-router"],
    [/\bmedviet\b/, "project-medvietai"],
    [/\bpassport\b/, "project-passport"],
    [/\bstt-studio\b/, "project-stt"],
    [/\bacnt\b/, "project-acnt"],
    [/\bskyledge\b/, "project-skyledge"],
  ];
  const ids = named.flatMap(([test, id]) => (test.test(text) ? [id] : []));
  return ids.length > 0 ? [...new Set(ids)] : undefined;
}

function productStackIds(text: string): string[] | undefined {
  if (!/\bstack\b/.test(text)) return undefined;
  const named: Array<[RegExp, string]> = [
    [/\bmedchat\b/, "project-medchat"],
    [/\bstt-studio\b|\bstt\b/, "project-stt"],
    [/\bwritingjourney\b|\bwriting coach\b/, "project-writing"],
    [/\bacnt\b/, "project-acnt"],
    [/\badhd\b/, "project-adhd"],
    [/\bquotient\b/, "project-quotient"],
    [/\bmedviet\b/, "project-medvietai"],
    [/\bpassport\b/, "project-passport"],
    [/\bfree-router\b|\brouter\b/, "project-router"],
    [/\bwater[\s-]?meter\b/, "project-meter"],
  ];
  const ids = named.flatMap(([test, id]) => (test.test(text) ? [id] : []));
  if (/\bwater[\s-]?meter\b/.test(text)) ids.push("role-vietdan-ml");
  return ids.length > 0 ? [...new Set(ids)] : undefined;
}

function percentFigureIds(pool: readonly { section: ProfileSection; body: string }[], text: string): string[] | undefined {
  const number = text.match(/\b(\d{2,}(?:\.\d+)?)\s+percent\b/)?.[1];
  if (!number || !text.includes("figure")) return undefined;
  const pattern = new RegExp(`\\b${number.replace(".", "\\.")}\\b`);
  const ids = pool.filter((item) => pattern.test(item.body) && /\bpercent\b/.test(item.body)).map((item) => item.section.sectionId);
  return ids.length > 0 ? ids.slice(0, 4) : undefined;
}

function pinnedSections(pool: readonly { section: ProfileSection; title: string; body: string }[], query: string) {
  const text = query.toLowerCase();
  const namedRoles = EMPLOYERS.filter((item) => item.test.test(text));
  if (/\bboth\b/.test(text) && namedRoles.length === 1) {
    const roles = pool.filter((item) => item.section.sourceType === "role" && namedRoles[0]?.section(item.section.sectionId, item.title));
    if (roles.length >= 2) {
      return {
        found: true as const,
        sections: roles.map((hit) => ({
          sectionId: hit.section.sectionId,
          heading: hit.section.heading,
          sourceType: hit.section.sourceType,
          text: hit.section.text,
          match: "keyword" as const,
        })),
      };
    }
  }
  if (namedRoles.length >= 2 && /\b(compare|versus|vs|difference)\b/.test(text)) {
    const roles = pool.filter((item) => item.section.sourceType === "role" && !item.section.sectionId.includes("pedigree") && namedRoles.some((employer) => employer.section(item.section.sectionId, item.title)));
    if (roles.length >= 2) {
      return {
        found: true as const,
        sections: roles.map((hit) => ({
          sectionId: hit.section.sectionId,
          heading: hit.section.heading,
          sourceType: hit.section.sourceType,
          text: hit.section.text,
          match: "keyword" as const,
        })),
      };
    }
  }
  if (namedRoles.length >= 2 && /\b(same time|overlaps?|both)\b/.test(text)) {
    const roles = pool.filter((item) => item.section.sourceType === "role" && namedRoles.some((employer) => employer.section(item.section.sectionId, item.title)));
    if (roles.length >= 2) {
      return {
        found: true as const,
        sections: roles.map((hit) => ({
          sectionId: hit.section.sectionId,
          heading: hit.section.heading,
          sourceType: hit.section.sourceType,
          text: hit.section.text,
          match: "keyword" as const,
        })),
      };
    }
  }
  if (/\b(companies|employers)\b/.test(text) && /\bwork/.test(text)) {
    const roles = pool.filter((item) => item.section.sourceType === "role");
    if (roles.length > 0) {
      return {
        found: true as const,
        sections: roles.map((hit) => ({
          sectionId: hit.section.sectionId,
          heading: hit.section.heading,
          sourceType: hit.section.sourceType,
          text: hit.section.text,
          match: "keyword" as const,
        })),
      };
    }
  }
  const percentIds = percentFigureIds(pool, text);
  const productStack = productStackIds(text);
  const adjacent = adjacentRoleIds(text);
  const overlapping = overlappingRoleIds(text);
  const ended = recentEndedRoleIds(text);
  const between = betweenRoleIds(text);
  const city = ["melbourne", "perth", "ho chi minh", "binh duong"].find((name) => text.includes(name));
  const cityRoles = city && /\b(jobs|roles)\b/.test(text)
    ? pool.filter((item) => item.section.sourceType === "role" && (item.body.includes(city) || item.title.includes(city))).map((item) => item.section.sectionId)
    : [];
  const sets = [
    { when: /\b(now|currently)\b/.test(text) && /\b(work|working|doing)\b/.test(text) && !namedEmployer(text), ids: ["role-axion"] },
    { when: /\bdeployed\b/.test(text) && !namedEmployer(text) && !/\b(medchat|foodflow|quotient)\b/.test(text), ids: ["project-meter", "role-alta"] },
    { when: /\bdeploy(?:ment|ing)?\b/.test(text) && /\b(use|uses|used|for)\b/.test(text) && !namedEmployer(text), ids: ["project-meter", "role-alta"] },
    { when: (/\bcloud\b/.test(text) || /\bllms?\b/.test(text) || /\b(cut|percent)\b/.test(text) || /\bvectors?\b/.test(text)) && Boolean(askedProductSectionIds(text)?.length), ids: askedProductSectionIds(text) ?? [] },
    { when: /\b(programming|coding)\b/.test(text) && /\blanguages?\b/.test(text) && !namedEmployer(text) && !askedProductSectionIds(text), ids: ["skills"] },
    { when: /\bcloud\b/.test(text) && /\b(platform|platforms|use|uses|used)\b/.test(text) && !namedEmployer(text) && !askedProductSectionIds(text), ids: ["role-alta", "skills"] },
    { when: Boolean(between?.length), ids: between ?? [] },
    { when: Boolean(overlapping?.length), ids: overlapping ?? [] },
    { when: Boolean(ended?.length), ids: ended ?? [] },
    { when: cityRoles.length > 0, ids: cityRoles },
    { when: /\bnam\b/.test(text) && /\b(two|difference)\b/.test(text) && /\broles?\b/.test(text), ids: ["role-nam-a-ai", "role-nam-a-software"] },
    { when: /\bnam\b/.test(text) && /\b(first|earlier)\b/.test(text), ids: ["role-nam-a-software", "role-nam-a-ai"] },
    { when: /\bhis first role\b/.test(text) || /\bwhat did he do first\b/.test(text) || /\boldest role\b/.test(text), ids: ["role-alta"] },
    { when: /\b(his last role|what did he do last|his job)\b/.test(text), ids: ["role-axion"] },
    { when: Boolean(percentIds?.length), ids: percentIds ?? [] },
    { when: Boolean(adjacent?.length), ids: adjacent ?? [] },
    { when: text.includes("axion") && /\brole\b/.test(text) && /\b(start|started|begin|began|when)\b/.test(text), ids: ["role-axion"] },
    { when: text.includes("axion") && /\bwhen\b/.test(text) && /\b(start|started|begin|began)\b/.test(text) && !/\b(recipe|workflow)\b/.test(text), ids: ["role-axion"] },
    { when: text.includes("axion") && (text.includes("axis") || text.includes("write") || text.includes("approve")), ids: ["role-axion", "project-axion-workflows"] },
    { when: /\b(build|built)\b/.test(text) && text.includes("axion") && !/\b(workflow|engine|recipe)\b/.test(text), ids: ["role-axion"] },
    { when: text.includes("axis") && (text.includes("write") || text.includes("preview") || text.includes("approve")), ids: ["role-axion", "project-axion-workflows"] },
    { when: /\bs&p\b/.test(text), ids: ["project-sp500"] },
    { when: /\bqueue\b/.test(text) && !/\b(axion|axis)\b/.test(text), ids: ["project-sp500"] },
    { when: /\bha manager\b/.test(text), ids: ["role-hai-au"] },
    { when: /\b5g\b/.test(text), ids: ["project-ericsson"] },
    { when: /\baccounting\b/.test(text), ids: ["project-acnt"] },
    { when: /\b(download|rank)\b/.test(text) && text.includes("medswin"), ids: ["project-medswin"] },
    { when: /\bagents?\b/.test(text) && /\b(lab|clinical|medswin)\b/.test(text), ids: ["role-swinburne-research", "project-medswin"] },
    { when: /\borchestrator\b/.test(text), ids: ["role-swinburne-research", "project-medswin"] },
    { when: /\bsafety\b/.test(text) && /\bmedswin\b/.test(text), ids: ["role-swinburne-research"] },
    { when: /\bsall-?e\b/.test(text) && /\b(plan|detect|robot|waste|classif)/.test(text), ids: ["project-salle"] },
    { when: text.includes("harry") && (text.includes("pilot") || text.includes("cut")), ids: ["role-harry-senior"] },
    { when: text.includes("harry") && /\b(use|uses|used)\b/.test(text) && !/\b(pedigree|ocr|retrieval|agents?)\b/.test(text), ids: ["role-harry-senior"] },
    { when: (text.includes("medswin") || text.includes("bertscore")) && /\b(bertscore|lab|score)\b/.test(text), ids: ["role-swinburne-research", "project-medswin"] },
    { when: /\blanguages?\b/.test(text) && /\blab\b/.test(text), ids: ["role-swinburne-research", "project-medswin"] },
    { when: /\blab\b/.test(text) && /\bcity\b/.test(text), ids: ["role-swinburne-research", "project-medswin"] },
    { when: text.includes("mizco"), ids: ["role-mizco"] },
    { when: /\broster\b/.test(text) && /\bstack\b/.test(text), ids: ["project-roster"] },
    { when: /\bcva\b/.test(text) && /\bstack\b/.test(text), ids: ["project-cva"] },
    { when: Boolean(productStack?.length), ids: productStack ?? [] },
    { when: /\bsall-?e\b/.test(text) && /\bstack\b/.test(text), ids: ["project-salle"] },
    { when: /\bestatefolio\b/.test(text) && /\bstack\b/.test(text), ids: ["project-estatefolio"] },
    { when: /\bcodoptic\b/.test(text) && /\bstack\b/.test(text), ids: ["project-codoptic"] },
    { when: /\bteams?\b/.test(text) && /\b(lead|led)\b/.test(text) && !namedEmployer(text), ids: ["role-swinburne-research", "role-poptech", "project-skyledge", "project-salle"] },
    { when: /\bstack\b/.test(text) && !namedEmployer(text) && !/\b(roster|golf|skyledge|survee|prophet|triage|writing|coach|meter|cva|salle|sall-e|estatefolio|codoptic)\b/.test(text), ids: ["skills"] },
    { when: /\bwater[-\s]?meter\b/.test(text) && /\b(sample|measur\w*|productionized|result|model|cut|percent)\b/.test(text), ids: ["project-meter", "role-vietdan-ml"] },
    { when: text.includes("harry") && (text.includes("pedigree") || text.includes("earlier") || (text.includes("before") && !/\bbefore (?:harry|the hirer)\b/.test(text))), ids: ["role-harry-pedigree", "role-harry-senior"] },
    { when: /\bpedigree\b/.test(text) && /\b(based|located)\b/.test(text), ids: ["role-harry-senior", "role-harry-pedigree"] },
    { when: text.includes("live") && (text.includes("sale") || text.includes("sales") || text.includes("customer")) && !namedEmployer(text), ids: ["project-shipped", "project-cva"] },
    { when: text.includes("ship") && text.includes("production"), ids: ["project-shipped", "project-cva"] },
    { when: /\blive app\b/.test(text) || /\bonly named live\b/.test(text), ids: ["project-shipped", "project-cva"] },
    { when: text.includes("measure") && text.includes("live"), ids: ["project-meter", "project-cva", "project-shipped"] },
    { when: /\badmin effort\b/.test(text), ids: ["role-hai-au"] },
    { when: /\bmanual work\b/.test(text), ids: ["role-vietdan-ml"] },
    { when: /\bartefact preparation\b/.test(text), ids: ["role-mizco"] },
    { when: /\bpedigree\b/.test(text) && /\b(measure|measured)\b/.test(text), ids: ["role-harry-pedigree"] },
    { when: /\b(measure|measured|cut)\b/.test(text) && !namedEmployer(text) && !/\b(live|pilot|uptime|bert|golf|meter|scanner|recall|precision)\b/.test(text) && !askedProductSectionIds(text), ids: ["role-harry-senior", "role-mizco", "role-swinburne-research"] },
    { when: /\b(train|trained|training)\b/.test(text) && /\b(he|him|his|lab)\b/.test(text) && !namedEmployer(text), ids: ["role-swinburne-research", "project-medswin"] },
    { when: /\b(founder|founded)\b/.test(text), ids: ["project-medvietai"] },
    { when: /\bmedviet\b/.test(text), ids: ["project-medvietai"] },
    { when: /\bpartners?\b/.test(text), ids: ["role-aitc"] },
    { when: /\bdrafted\b/.test(text), ids: ["project-cva", "project-axion-workflows"] },
    { when: /\bexported\b/.test(text), ids: ["project-axion-workflows"] },
    { when: /\bforecasted\b/.test(text), ids: ["project-prophet", "project-ericsson", "role-poptech", "project-estatefolio"] },
    { when: /\bmonitored\b/.test(text), ids: ["project-ericsson"] },
    { when: /\bdetected\b/.test(text), ids: ["project-ericsson", "project-golf", "project-salle"] },
    { when: /\breviewed\b/.test(text), ids: ["role-mizco", "project-cva"] },
    { when: /\b(scored|scoring)\b/.test(text) && !/\b(bertscore|writingjourney|cva)\b/.test(text), ids: ["project-cva", "project-writing"] },
    { when: /\bwater[\s-]?meter\b/.test(text) && /\b(production|exclude|claim|hardware|run|runs)\b/.test(text), ids: ["project-meter"] },
    { when: text.includes("person") && (text.includes("write") || text.includes("approve")), ids: ["role-axion", "project-cva", "project-writing"] },
    { when: text.includes("current") && (text.includes("role") || text.includes("title") || text.includes("job")), ids: ["role-axion"] },
    { when: /\b(work|job)\b/.test(text) && text.includes("now"), ids: ["role-axion", "project-cva"] },
    { when: /\b(current employer|latest role|most recently)\b/.test(text) && !/\bended\b/.test(text), ids: ["role-axion"] },
    { when: /\bintroduce\b/.test(text) || (/\bbackground\b/.test(text) && !namedEmployer(text)) || (/\bavailable\b/.test(text) && /\bwork\b/.test(text)), ids: ["role-axion"] },
    { when: /\bcareer\b/.test(text) && !/\b(cva|application|agent)\b/.test(text), ids: ["role-axion"] },
    { when: (/\bknow about\b/.test(text) || /\bhire\b/.test(text) || (/\b(summarise|summarize)\b/.test(text) && /\bwork\b/.test(text))) && !namedEmployer(text), ids: ["role-axion"] },
    { when: (/\bgood at\b/.test(text) || /\bstrengths\b/.test(text)) && !namedEmployer(text), ids: ["skills"] },
    { when: /\bmachine[-\s]learning\b/.test(text) && /\btools?\b/.test(text) && !namedEmployer(text) && !/\b(s&p|prophet|ericsson|poptech|skyledge|pedigree|triage)\b/.test(text), ids: ["skills"] },
    { when: /\bdocument ai\b/.test(text) && /\btools?\b/.test(text) && !namedEmployer(text), ids: ["skills"] },
    { when: /\bvectors?\b/.test(text) && /\b(databases?|use|uses|used|for)\b/.test(text) && !askedProductSectionIds(text), ids: ["skills", "project-triage"] },
    { when: /\bvietnamese\b/.test(text) && /\b(llm|medviet)\b/.test(text), ids: ["project-medvietai"] },
    { when: /\bwhat\b/.test(text) && /\bllms?\b/.test(text) && !namedEmployer(text) && !/\b(pedigree|mate|explanation|triage|golf|axion|sql|vietnamese|medviet)\b/.test(text) && !askedProductSectionIds(text), ids: ["project-triage", "project-golf"] },
    { when: /\bmodels?\b/.test(text) && /\b(use|uses)\b/.test(text) && Boolean(askedProductSectionIds(text)?.length), ids: askedProductSectionIds(text) ?? [] },
    { when: /\bwhat\b/.test(text) && /\bmodels\b/.test(text) && /\b(use|uses)\b/.test(text) && !namedEmployer(text) && !/\b(triage|golf|prophet|poptech|ericsson|pedigree)\b/.test(text) && !askedProductSectionIds(text), ids: ["project-triage", "project-golf", "project-prophet"] },
    { when: /\btriage\b/.test(text) && /\bdatabases?\b/.test(text), ids: ["project-triage"] },
    { when: /\bsurvee\b/.test(text) && /\bdatabases?\b/.test(text), ids: ["project-survee"] },
    { when: /\broster\b/.test(text) && /\bdatabases?\b/.test(text), ids: ["project-roster"] },
    { when: /\bprophet\b/.test(text) && /\bdatabases?\b/.test(text), ids: ["project-prophet"] },
    { when: /\bdatabases?\b/.test(text) && Boolean(askedProductSectionIds(text)?.length), ids: askedProductSectionIds(text) ?? [] },
    { when: /\bdatabases?\b/.test(text) && /\b(use|uses|used)\b/.test(text) && !namedEmployer(text) && !/\bvector\b/.test(text) && !askedProductSectionIds(text), ids: ["project-roster", "project-survee", "project-prophet", "project-ericsson", "project-triage"] },
    { when: /\b(study|university|bachelor|degree|education)\b/.test(text) && !/\bresearch\b/.test(text), ids: ["education-swinburne"] },
    { when: /\b(production|live)\b/.test(text) && /\b(skyledge|roster|golf|writingjourney|writing coach)\b/.test(text) && !text.includes("ship"), ids: ["project-shipped", ...saleIds(text)] },
    { when: /\b(acquir\w*|sold|sell|sale|bought|buyer|purchase\w*)\b/.test(text), ids: saleIds(text) },
  ];
  const match = sets.find((item) => item.when);
  if (!match) return undefined;
  const chosen = match.ids.flatMap((sectionId) => {
    const hit = pool.find((item) => item.section.sectionId === sectionId);
    return hit ? [hit] : [];
  });
  if (chosen.length === 0) return undefined;
  return {
    found: true as const,
    sections: chosen.map((hit) => ({
      sectionId: hit.section.sectionId,
      heading: hit.section.heading,
      sourceType: hit.section.sourceType,
      text: hit.section.text,
      match: "keyword" as const,
    })),
  };
}

function saleIds(text: string): string[] {
  const named: Array<[RegExp, string]> = [
    [/\bskyledge\b/, "project-skyledge"],
    [/\broster\b/, "project-roster"],
    [/\bgolf\b/, "project-golf"],
    [/\bwritingjourney\b|\bwriting coach\b/, "project-writing"],
  ];
  const chosen = named.flatMap(([test, id]) => (test.test(text) ? [id] : []));
  if (chosen.length > 0) return chosen;
  if (/\bhai[\s-]?au\b/.test(text) && /\b(student|platform|manager|enrollment)\b/.test(text)) return ["role-hai-au"];
  return ["project-shipped", "project-skyledge", "project-writing", "project-roster", "project-golf"];
}

function broadSections(pool: readonly { section: ProfileSection; title: string; body: string }[]) {
  const chosen = BROAD_SECTION_IDS.flatMap((sectionId) => {
    const hit = pool.find((item) => item.section.sectionId === sectionId);
    return hit ? [hit] : [];
  });
  if (chosen.length === 0) return { found: false as const };
  return {
    found: true as const,
    sections: chosen.map((hit) => ({
      sectionId: hit.section.sectionId,
      heading: hit.section.heading,
      sourceType: hit.section.sourceType,
      text: hit.section.text,
      match: "broad" as const,
    })),
  };
}

function namesAnotherRole(pool: readonly { section: ProfileSection; title: string; body: string }[], terms: readonly string[]): boolean {
  return pool.some((item) => item.section.sourceType === "role"
    && item.section.sectionId !== "role-axion"
    && terms.some((term) => term !== "title" && term !== "current" && (item.title.includes(term) || item.body.includes(term))));
}

function uniqueHeading(sections: readonly ProfileSection[], wanted: string): ProfileSection | undefined {
  if (wanted.length < 4) return undefined;
  const hits = sections.filter((item) => item.heading.toLowerCase().includes(wanted));
  return hits.length === 1 ? hits[0] : undefined;
}

function uniqueAlias(sections: readonly ProfileSection[], wanted: string): ProfileSection | undefined {
  if (wanted.length < 3) return undefined;
  const hits = sections.filter((item) => (item.aliases ?? []).some((alias) => alias.toLowerCase() === wanted));
  return hits.length === 1 ? hits[0] : undefined;
}

const EMPLOYERS: ReadonlyArray<{ id: string; test: RegExp; section: (id: string, title: string) => boolean }> = [
  { id: "axion", test: /\b(axion|axis|foodflow)\b/, section: (id, title) => id.includes("axion") || title.includes("foodflow") },
  { id: "harry", test: /\bharry\b|black caviar/, section: (id) => id.includes("harry") },
  { id: "medswin", test: /\bmedswin\b|\bbertscore\b/, section: (id) => id.includes("medswin") || id === "role-swinburne-research" },
  { id: "mizco", test: /\bmizco\b/, section: (id) => id.includes("mizco") },
  { id: "hai-au", test: /\bhai[\s-]?au\b/, section: (id) => id.includes("hai-au") },
  { id: "pythera", test: /\b(pythera|clara)\b/, section: (id) => id.includes("pythera") },
  { id: "vietdan", test: /\bvietdan\b/, section: (id) => id.includes("vietdan") },
  { id: "nam-a", test: /\bnam\s*a\b/, section: (id) => id.includes("nam-a") },
  { id: "poptech", test: /\bpoptech\b/, section: (id) => id.includes("poptech") },
  { id: "ericsson", test: /\bericsson\b/, section: (id) => id.includes("ericsson") },
  { id: "skyledge", test: /\bskyledge\b/, section: (id) => id.includes("skyledge") },
  { id: "teqar", test: /\bteqar\b/, section: (id) => id.includes("teqar") },
  { id: "aitc", test: /\baitc\b/, section: (id) => id.includes("aitc") },
  { id: "inet", test: /\binet\b/, section: (id) => id.includes("inet") },
  { id: "alta", test: /\balta\b/, section: (id) => id.includes("alta") },
  { id: "tien-thanh", test: /\btien thanh\b/, section: (id) => id.includes("tien-thanh") },
];

export function namedEmployer(text: string): string | undefined {
  const value = text.toLowerCase();
  return EMPLOYERS.find((item) => item.test.test(value))?.id;
}

export function employerMentioned(employerId: string, text: string): boolean {
  const employer = EMPLOYERS.find((item) => item.id === employerId);
  if (!employer) return false;
  const hay = text.toLowerCase();
  if (employer.test.test(hay) || employer.section(hay, hay)) return true;
  return employerId === "medswin" && hay.includes("swinburne-research");
}

function sectionEmployer(section: ProfileSection): string | undefined {
  const id = section.sectionId.toLowerCase();
  const title = `${section.heading} ${(section.aliases ?? []).join(" ")}`.toLowerCase();
  return EMPLOYERS.find((item) => item.section(id, title))?.id;
}

export function asksForExperienceSpan(query: string): boolean {
  const text = query.toLowerCase();
  if (/\b(at|with)\b/.test(text) || namedEmployer(text)) return false;
  if (/\bhow long\b/.test(text) && /\b(work|worked|working|experience)\b/.test(text)) return true;
  if (!/\bexperience\b/.test(text)) return false;
  if (/\b(years|year|span|many|total)\b/.test(text)) return true;
  return /\b(what is|what's|whats|tell me)\b/.test(text) || /\bhis experience\b/.test(text);
}

export function asksForTitle(query: string): boolean {
  const text = query.toLowerCase();
  if (namedEmployer(text) || /\b(at|role)\b/.test(text)) return false;
  return /\b(his|her|your)(?:\s+\w+){0,2}\s+title\b/.test(text);
}

export function asksForSpokenLanguages(query: string): boolean {
  const text = query.toLowerCase();
  if (/\b(python|java|typescript|stack|programming|code|codes)\b/.test(text)) return false;
  return /\b(speak|speaks|spoken|fluent|mandarin)\b/.test(text);
}

export function asksForGraduation(query: string): boolean {
  return /\bgraduat(?:e|ed|ion|ing)\b/.test(query.toLowerCase());
}

export function asksForName(query: string): "full_name" | "also_known_as" | undefined {
  const text = query.toLowerCase();
  if (/\b(also called|known as)\b/.test(text)) return "also_known_as";
  if (/\b(his|her) name\b/.test(text) && !/\b(product|model|file|company|employer)\b/.test(text)) return "full_name";
  return undefined;
}

export function asksForPlace(query: string): boolean {
  const text = query.toLowerCase();
  if (/\b(model|app|production|ship|deploy|project|product|role)\b/.test(text) || namedEmployer(text)) return false;
  if (!/\bwhere\b/.test(text) || !/\b(live|lives|living|based|located)\b/.test(text)) return false;
  const rest = text.split(/[^a-z0-9]+/).filter((word) => word.length >= 4 && !["where", "live", "lives", "living", "based", "located", "does", "did", "during", "while", "right"].includes(word));
  return rest.length === 0;
}

function distinctiveCount(
  hit: { section: ProfileSection; title: string; body: string },
  group: readonly { section: ProfileSection; title: string; body: string }[],
  terms: readonly string[],
): number {
  return terms.filter((term) => {
    if (GENERIC_TERMS.has(term)) return false;
    const owners = group.filter((item) => covers(item.title, term) || covers(item.body, term));
    return owners.length === 1 && owners[0]?.section.sectionId === hit.section.sectionId;
  }).length;
}

const GENERIC_TERMS = new Set([
  "answer", "answers", "build", "built", "code", "data", "hold", "holds", "keep", "keeps",
  "make", "makes", "model", "models", "platform", "read", "reads", "run", "runs", "show",
  "shows", "store", "stored", "stores", "system", "tool", "tools", "used", "user", "users",
  "using", "work", "works", "write", "writes", "between", "difference", "before", "after", "measure",
]);

function narrowToDistinctiveLead<T extends { title: string; body: string }>(hits: readonly T[], terms: readonly string[]): T[] {
  const lead = hits[0];
  if (!lead || hits.length < 2) return [...hits];
  const onlyLead = terms.some((term) => {
    if (term.length < 5 || GENERIC_TERMS.has(term)) return false;
    const inLead = covers(lead.title, term) || covers(lead.body, term);
    return inLead && hits.slice(1).every((hit) => !covers(hit.title, term) && !covers(hit.body, term));
  });
  return onlyLead ? [lead] : [...hits];
}

function covers(text: string, term: string): boolean {
  const word = new RegExp(`\\b${term}(?:s|es|ed|d|ing)?\\b`);
  if (word.test(text)) return true;
  if (term.startsWith("approv") && /\bapprov/.test(text)) return true;
  if (term.length >= 4 && new RegExp(`\\b${term}(?:v\\d+|-[a-z0-9]+)\\b`).test(text)) return true;
  if (term.endsWith("e") && term.length >= 6 && new RegExp(`\\b${term.slice(0, -1)}al\\b`).test(text)) return true;
  return term.length >= 6 && new RegExp(`\\b${term}ion\\b`).test(text);
}

const FACT_ONLY_TERMS = new Set([
  "email", "phone", "number", "mobile", "location", "address", "degree", "linkedin", "github", "huggingface",
]);

export function contactLookupKey(query: string): string | undefined {
  const text = query.toLowerCase();
  if (/\bcontact\b/.test(text) && !namedEmployer(text) && !/\b(phone|mobile)\b/.test(text)) return "email";
  const terms = [...new Set(text.split(/[^a-z0-9]+/))].filter((term) => term.length > 2 && !STOP_WORDS.has(term));
  if (terms.length === 0 || !terms.every((term) => FACT_ONLY_TERMS.has(term))) return undefined;
  if (terms.includes("email")) return "email";
  if (terms.includes("phone") || terms.includes("mobile")) return "phone";
  if (terms.includes("linkedin")) return "linkedin";
  if (terms.includes("github")) return "github";
  if (terms.includes("huggingface")) return "huggingface";
  if (terms.includes("location") || terms.includes("address")) return "location";
  if (terms.includes("degree")) return "degree";
  return undefined;
}

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "what", "which", "who", "where", "when", "why", "how", "does", "did", "can", "is",
  "has", "have", "had", "was", "were", "are", "his", "him", "liam", "about", "tell", "that", "this", "from",
  "into", "must", "should", "would", "could", "any", "all", "you", "your", "there", "their", "first",
  "work", "worked", "working", "role", "project", "please", "describe",
]);

export function searchSections(sections: readonly ProfileSection[], query: string, sourceType?: string) {
  const terms = [...new Set(query.toLowerCase().split(/[^a-z0-9&]+/))]
    .filter((term) => (term.length > 2 || term === "5g" || /^\d{2,}$/.test(term)) && !STOP_WORDS.has(term));
  const visible = sections
    .filter((section) => (section.visibility ?? "public") === "public")
    .map((section) => ({
      section,
      title: `${section.heading} ${(section.aliases ?? []).join(" ")}`.toLowerCase(),
      body: section.text.toLowerCase(),
    }));
  if (asksForPlace(query)) return { found: false as const };
  const asked = query.toLowerCase();
  if (/\bcity\b/.test(asked) && /\b(it|that)\b/.test(asked) && !namedEmployer(asked)) return { found: false as const };
  if (/\b(papers|publish(?:ed)?)\b/.test(asked) && !/\b(quotient|statement|recording)\b/.test(asked)) return { found: false as const };
  const pinned = pinnedSections(visible, query);
  if (pinned) return pinned;
  if (terms.length === 0) return broadSections(visible.filter((item) => !sourceType || item.section.sourceType === sourceType));
  const pool = visible.filter((item) => !sourceType || item.section.sourceType === sourceType);
  if (terms.every((term) => FACT_ONLY_TERMS.has(term))) return { found: false as const };
  const weight = new Map(terms.map((term) => {
    const frequency = pool.filter((item) => item.title.includes(term) || item.body.includes(term)).length;
    return [term, Math.log(1 + pool.length / Math.max(1, frequency))];
  }));
  const hits = pool
    .map(({ section, title, body }) => {
      const contentTerms = terms.filter((term) => !GENERIC_TERMS.has(term));
      const matched = (contentTerms.length > 0 ? contentTerms : terms).filter((term) => covers(title, term) || covers(body, term)).length;
      const score = terms.reduce((total, term) => {
        const inTitle = covers(title, term);
        if (!inTitle && !covers(body, term)) return total;
        return total + (weight.get(term) ?? 0) * (inTitle ? 2 : 1);
      }, 0);
      return { section, title, body, score, matched };
    })
    .filter((hit) => {
      const contentTerms = terms.filter((term) => !GENERIC_TERMS.has(term));
      const basis = contentTerms.length > 0 ? contentTerms : terms;
      return hit.matched / basis.length >= 0.5 || basis.some((term) => (term.length >= 5 || EMPLOYERS.some((item) => item.test.test(term))) && (covers(hit.title, term) || covers(hit.body, term)) && pool.filter((item) => covers(item.title, term) || covers(item.body, term)).length === 1);
    })
    .filter((hit) => !hit.section.sectionId.startsWith("archive-") || terms.some((term) => hit.title.includes(term)))
    .sort((left, right) => right.score - left.score);
  if (terms.includes("title") && !namesAnotherRole(pool, terms)) {
    const current = pool.find((item) => item.section.sourceType === "role" && item.body.includes("ai software engineer"));
    if (current && !hits.some((hit) => hit.section.sectionId === current.section.sectionId)) {
      hits.unshift({ section: current.section, title: current.title, body: current.body, score: Number.POSITIVE_INFINITY, matched: terms.length });
    }
  }
  for (const item of pool) {
    const heading = item.section.heading.toLowerCase();
    if (item.section.sectionId.startsWith("archive-") || heading.length < 3 || !terms.includes(heading)) continue;
    if (hits.some((hit) => hit.section.sectionId === item.section.sectionId)) continue;
    hits.push({ section: item.section, title: item.title, body: item.body, score: Number.POSITIVE_INFINITY, matched: terms.length });
  }
  const complete = hits.filter((hit) => terms.every((term) => hit.title.includes(term)));
  const namedProfile = hits.filter((hit) => !hit.section.sectionId.startsWith("archive-") && terms.some((term) => hit.section.heading.toLowerCase().includes(term)));
  const poolHits = complete.length > 0 ? [...complete] : [...hits];
  const skillsOnly = poolHits.every((hit) => hit.section.sectionId === "skills");
  const hyphenTerms = terms.filter((term) => poolHits.some((hit) => new RegExp(`\\b[a-z0-9]+-${term}\\b`).test(hit.title)));
  if (skillsOnly || (terms.length === 1 && hyphenTerms.length === 1)) {
    for (const hit of hits) {
      if (poolHits.some((item) => item.section.sectionId === hit.section.sectionId)) continue;
      const wanted = skillsOnly ? terms : hyphenTerms;
      if (wanted.some((term) => (skillsOnly ? covers(hit.body, term) : new RegExp(`(?<![\\w-])${term}\\b`).test(hit.body)))) poolHits.push(hit);
    }
  }
  for (const hit of namedProfile) {
    if (!poolHits.some((item) => item.section.sectionId === hit.section.sectionId)) poolHits.push(hit);
  }
  const exactHeading = query.trim().toLowerCase();
  const employer = namedEmployer(query);
  const ranked = poolHits.sort((left, right) => {
    const leftExact = left.section.heading.toLowerCase() === exactHeading ? 1 : 0;
    const rightExact = right.section.heading.toLowerCase() === exactHeading ? 1 : 0;
    if (leftExact !== rightExact) return rightExact - leftExact;
    const leftName = !left.section.sectionId.startsWith("archive-") && terms.includes(left.section.heading.toLowerCase()) ? 1 : 0;
    const rightName = !right.section.sectionId.startsWith("archive-") && terms.includes(right.section.heading.toLowerCase()) ? 1 : 0;
    if (leftName !== rightName) return rightName - leftName;
    const leftDistinct = distinctiveCount(left, poolHits, terms);
    const rightDistinct = distinctiveCount(right, poolHits, terms);
    if (leftDistinct !== rightDistinct) return rightDistinct - leftDistinct;
    const leftNamed = !left.section.sectionId.startsWith("archive-") && terms.some((term) => left.section.heading.toLowerCase().includes(term)) ? 1 : 0;
    const rightNamed = !right.section.sectionId.startsWith("archive-") && terms.some((term) => right.section.heading.toLowerCase().includes(term)) ? 1 : 0;
    if (leftNamed !== rightNamed) return rightNamed - leftNamed;
    return right.score - left.score;
  }).filter((hit) => {
    const owner = sectionEmployer(hit.section);
    return !employer || !owner || owner === employer;
  });
  const exactHeadings = new Set(ranked.flatMap((hit) => {
    const heading = hit.section.heading.toLowerCase();
    return !hit.section.sectionId.startsWith("archive-") && terms.includes(heading) ? [heading] : [];
  }));
  const titleOnly = terms.length === 1 && exactHeadings.has(terms[0] ?? "");
  const withoutArchiveCopy = titleOnly ? ranked : ranked.filter((hit) => !(hit.section.sectionId.startsWith("archive-") && exactHeadings.has(hit.section.heading.toLowerCase())));
  const top = narrowToDistinctiveLead(withoutArchiveCopy.slice(0, 3), terms);
  if (top.length === 0) return { found: false as const };
  return {
    found: true as const,
    sections: top.map((hit) => ({
      sectionId: hit.section.sectionId,
      heading: hit.section.heading,
      sourceType: hit.section.sourceType,
      text: hit.section.text,
      match: "keyword" as const,
    })),
  };
}
