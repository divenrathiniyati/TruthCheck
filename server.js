const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname)));

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});


const API_KEY = process.env.FACTCHECK_API_KEY;

/* =========================
   BASIC TEXT HELPERS
========================= */

const stopWords = new Set([
  "the","a","an","is","are","was","were","to","of","and","or","in",
  "on","for","with","that","this","it","as","by","from","at","be",
  "has","have","had","will","would","can","could","may","might",
  "about","into","than","then","their","there","they","them","you",
  "your","our","we","i","he","she","his","her","its","not"
]);

function normalizeText(text = "") {
  return String(text)
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getImportantWords(text = "") {
  return [...new Set(
    normalizeText(text)
      .split(" ")
      .filter(w => w.length >= 3 && !stopWords.has(w))
  )];
}

function phraseExists(text, phrase) {
  return normalizeText(text).includes(normalizeText(phrase));
}

/* =========================
   CONCEPTS
========================= */

const conceptGroups = {
  earth_shape: {
    label: "Earth Shape",
    positive: [
      "earth is round",
      "earth is spherical",
      "earth is sphere",
      "earth is not flat",
      "world is round",
      "world is spherical",
      "earth was spherical",
      "earth roughly spherical",
      "earth is roughly spherical",
      "earth is a globe",
      "earth is globe",
      "earth is curved",
      "earth has curvature",
      "earth is round shaped",
      "the earth is round"
    ],
    negative: [
      "earth is flat",
      "earth is not round",
      "earth isn't round",
      "earth isn't spherical",
      "world is flat",
      "flat earth",
      "earth isn't curved",
      "earth is not curved",
      "earth not curved",
      "earth doesn't curve",
      "earth does not curve",
      "earth isn't a globe",
      "earth is not a globe",
      "earth is not spherical",
      "earth isn't spherical",
      "earth doesn't rotate",
      "earth does not rotate"
    ],
    topicWords: ["earth", "world", "planet", "round", "flat", "spherical", "sphere"]
  },

  climate: {
    label: "Climate Change",
    positive: [
      "climate change is real",
      "global warming is real",
      "humans cause climate change",
      "climate change is caused by humans"
    ],
    negative: [
      "climate change is a hoax",
      "global warming is a hoax",
      "climate change is not real",
      "humans do not cause climate change"
    ],
    topicWords: ["climate", "warming", "global", "carbon", "emissions"]
  },

  vaccination: {
    label: "Vaccination",
    positive: [
      "vaccines are safe",
      "vaccines prevent disease",
      "vaccines reduce disease",
      "vaccines work",
      "vaccines are effective",
      "vaccine is effective",
      "vaccination is effective"
    ],
    negative: [
      "vaccines are dangerous",
      "vaccines cause autism",
      "vaccines do not work",
      "vaccines are ineffective"
    ],
    topicWords: ["vaccine", "vaccines", "vaccination", "immunity", "disease"]
  },

  medicine: {
    label: "Medicine",
    positive: [
      "medicine works",
      "treatment works",
      "drug is effective",
      "treatment is effective"
    ],
    negative: [
      "medicine does not work",
      "treatment does not work",
      "drug is ineffective",
      "treatment is ineffective"
    ],
    topicWords: ["medicine", "drug", "treatment", "disease", "health"]
  },

  election: {
    label: "Election",
    positive: [
      "won the election",
      "won election",
      "lost the election",
      "election results"
    ],
    negative: [
      "election was rigged",
      "election was stolen",
      "election fraud"
    ],
    topicWords: ["election", "vote", "voting", "ballot", "candidate", "results"]
  }
};

function findConceptMatches(text) {
  const normalized = normalizeText(text);
  const matches = [];

  for (const [key, concept] of Object.entries(conceptGroups)) {
    const positiveMatches = concept.positive.filter(p =>
      normalized.includes(normalizeText(p))
    );

    const negativeMatches = concept.negative.filter(p =>
      normalized.includes(normalizeText(p))
    );

    const topicMatches = concept.topicWords.filter(word =>
      normalized.includes(normalizeText(word))
    );

    if (
      positiveMatches.length ||
      negativeMatches.length ||
      topicMatches.length
    ) {
      matches.push({
        key,
        label: concept.label,
        positiveMatches,
        negativeMatches,
        topicMatches
      });
    }
  }

  return matches;
}

function detectDirection(text, conceptKey) {
  const concept = conceptGroups[conceptKey];
  if (!concept) return "unknown";

  const normalized = normalizeText(text);

  if (concept.positive.some(p =>
    normalized.includes(normalizeText(p))
  )) {
    return "positive";
  }

  if (concept.negative.some(p =>
    normalized.includes(normalizeText(p))
  )) {
    return "negative";
  }

  if (concept.topicWords.some(w =>
    normalized.includes(normalizeText(w))
  )) {
    return "topic";
  }

  return "unknown";
}

function comparePropositions(userClaim, evidenceClaim, conceptKey) {
  const userDirection = detectDirection(userClaim, conceptKey);
  const evidenceDirection = detectDirection(evidenceClaim, conceptKey);

  let relation = "unknown";

  if (
    userDirection !== "unknown" &&
    evidenceDirection !== "unknown"
  ) {
    if (userDirection === evidenceDirection) {
      relation = "same";
    } else if (
      (userDirection === "positive" && evidenceDirection === "negative") ||
      (userDirection === "negative" && evidenceDirection === "positive")
    ) {
      relation = "opposite";
    }
  }

  return {
    relation,
    userDirection,
    evidenceDirection
  };
}

/* =========================
   RELEVANCE
========================= */

function calculateRelevance(userClaim, evidenceClaim, title = "") {
  // Proposition matching is based on the reviewed claim itself.
  // The fact-check title is used only for keyword relevance so a
  // positive headline cannot accidentally reverse the reviewed claim.
  const combinedText = `${evidenceClaim} ${title}`;

  const userWords = getImportantWords(userClaim);
  const evidenceWords = new Set(getImportantWords(combinedText));

  const matchedWords = userWords.filter(word =>
    evidenceWords.has(word)
  );

  const wordScore = userWords.length
    ? Math.round((matchedWords.length / userWords.length) * 20)
    : 0;

  const concepts = findConceptMatches(evidenceClaim);

  if (!concepts.length) {
    return {
      relevanceScore: Math.min(30, wordScore + 10),
      relevanceLevel: "Weakly Related",
      matchType: "Keyword Only",
      direction: "unknown",
      matchedWords,
      matchedConcepts: [],
      matchedPropositions: [],
      userDirection: "unknown",
      evidenceDirection: "unknown"
    };
  }

  for (const concept of concepts) {
    const comparison = comparePropositions(
      userClaim,
      evidenceClaim,
      concept.key
    );

    const matchedPropositions = [
      ...concept.positiveMatches,
      ...concept.negativeMatches
    ];

    if (comparison.relation === "same") {
      return {
        relevanceScore: Math.min(100, 88 + wordScore),
        relevanceLevel: "Directly Relevant",
        matchType: "Same Proposition",
        direction: "supports",
        matchedWords,
        matchedConcepts: [concept.label],
        matchedPropositions,
        userDirection: comparison.userDirection,
        evidenceDirection: comparison.evidenceDirection
      };
    }

    if (comparison.relation === "opposite") {
      return {
        relevanceScore: Math.min(100, 78 + wordScore),
        relevanceLevel: "Contradictory / Related",
        matchType: "Opposite Proposition",
        direction: "contradicts",
        matchedWords,
        matchedConcepts: [concept.label],
        matchedPropositions,
        userDirection: comparison.userDirection,
        evidenceDirection: comparison.evidenceDirection
      };
    }
  }

  return {
    relevanceScore: Math.min(70, 48 + wordScore),
    relevanceLevel: "Topic Related",
    matchType: "Related Topic",
    direction: "topic",
    matchedWords,
    matchedConcepts: concepts.map(c => c.label),
    matchedPropositions: concepts.flatMap(c => [
      ...c.positiveMatches,
      ...c.negativeMatches
    ]),
    userDirection: "unknown",
    evidenceDirection: "topic"
  };
}

/* =========================
   CLAIM ANALYSIS
========================= */

function analyzeClaim(claim) {
  const words = getImportantWords(claim);
  const concepts = findConceptMatches(claim);

  let claimType = "General Claim";

  if (concepts.length) {
    claimType = concepts[0].label;
  }

  return {
    inputType: "Claim",
    claimType,
    question: `What evidence supports or contradicts: "${claim}"?`,
    years: (claim.match(/\b(19|20)\d{2}\b/g) || []).join(", ") || "None detected",
    numbers: (claim.match(/\b\d+(?:\.\d+)?\b/g) || []).join(", ") || "None detected",
    url: "No URL detected",
    context: concepts.length
      ? concepts.map(c => c.label).join(", ")
      : "General claim",
    normalizedClaim: normalizeText(claim),
    importantWords: words
  };
}

/* =========================
   GOOGLE FACT CHECK API
========================= */

async function searchFactChecks(claim) {
  if (!API_KEY) {
    throw new Error("FACTCHECK_API_KEY is missing in .env");
  }

  const url =
    "https://factchecktools.googleapis.com/v1alpha1/claims:search" +
    `?query=${encodeURIComponent(claim)}` +
    `&pageSize=30` +
    `&key=${encodeURIComponent(API_KEY)}`;

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 10000);

  try {
    const response = await fetch(url, {
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Google Fact Check API returned ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(
        "Google Fact Check service took too long to respond. Please try again."
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/* =========================
   URL / WEBPAGE PROCESSING
========================= */

function decodeHtmlEntities(text = "") {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function cleanHtml(html = "") {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function extractMeta(html, name) {
  const regex = new RegExp(
    `<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']*)["']`,
    "i"
  );

  const match = html.match(regex);
  return match ? decodeHtmlEntities(match[1]).trim() : "";
}

function extractPageContent(html, url) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

  const title = titleMatch
    ? cleanHtml(titleMatch[1])
    : "";

  const description =
    extractMeta(html, "description") ||
    extractMeta(html, "og:description");

  let content = "";

  const articleMatch = html.match(
    /<article[^>]*>([\s\S]*?)<\/article>/i
  );

  const mainMatch = html.match(
    /<main[^>]*>([\s\S]*?)<\/main>/i
  );

  if (articleMatch) {
    content = cleanHtml(articleMatch[1]);
  } else if (mainMatch) {
    content = cleanHtml(mainMatch[1]);
  } else {
    content = cleanHtml(html);
  }

  return {
    url,
    title,
    description,
    text: content.slice(0, 12000)
  };
}

async function fetchWebpage(url) {
  let parsed;

  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid URL.");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only HTTP and HTTPS links are supported.");
  }

  const hostname = parsed.hostname.toLowerCase();

  if (
    hostname === "localhost" ||
    hostname.endsWith(".local") ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
  ) {
    throw new Error("Private/local network URLs are not supported.");
  }

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 12000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 TruthCheck/1.0"
      }
    });

    if (!response.ok) {
      throw new Error(`Website returned ${response.status}`);
    }

    const contentType =
      response.headers.get("content-type") || "";

    if (!contentType.includes("text/html")) {
      throw new Error("This link does not contain an HTML webpage.");
    }

    const html = await response.text();

    return extractPageContent(html, url);

  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(
        "The webpage took too long to load."
      );
    }

    throw new Error(
      `Could not read webpage: ${error.message}`
    );

  } finally {
    clearTimeout(timeout);
  }
}

function getUrlSearchClaim(page) {
  if (page.title && page.description) {
    return `${page.title}. ${page.description}`.slice(0, 1000);
  }

  if (page.title) {
    return page.title.slice(0, 1000);
  }

  const sentences = page.text
    .split(/[.!?]\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 40);

  return (sentences[0] || page.text).slice(0, 1000);
}

/* =========================
   EVIDENCE
========================= */

function buildEvidence(userClaim, apiData) {
  const claims = apiData.claims || [];

  return claims.map((item, index) => {
    const review = item.claimReview?.[0] || {};

    const evidenceClaim =
      item.text ||
      review.title ||
      "";

    const title =
      review.title ||
      evidenceClaim ||
      "Fact-check assessment";

    const relevance =
      calculateRelevance(
        userClaim,
        evidenceClaim,
        title
      );

    return {
      id: index + 1,
      claim: evidenceClaim,
      title,
      publisher:
        review.publisher?.name ||
        "Unknown Publisher",
      url:
        review.url ||
        "#",
      reviewDate:
        review.reviewDate ||
        "Unknown date",
      rating:
        review.textualRating ||
        "Unknown",
      languageCode:
        item.languageCode ||
        "Unknown",

      relevanceScore:
        relevance.relevanceScore,

      relevanceLevel:
        relevance.relevanceLevel,

      matchType:
        relevance.matchType,

      direction:
        relevance.direction,

      matchedWords:
        relevance.matchedWords,

      matchedConcepts:
        relevance.matchedConcepts,

      matchedPropositions:
        relevance.matchedPropositions,

      userDirection:
        relevance.userDirection,

      evidenceDirection:
        relevance.evidenceDirection
    };
  });
}

/* =========================
   SOURCES
========================= */

function buildUniqueSources(evidence) {
  const map = new Map();

  for (const item of evidence) {
    const key =
      item.url ||
      `${item.publisher}|${item.title}`;

    if (!map.has(key)) {
      map.set(key, {
        publisher: item.publisher,
        title: item.title,
        claim: item.claim,
        url: item.url,
        rating: item.rating,
        relevanceScore: item.relevanceScore,
        relevanceLevel: item.relevanceLevel,
        matchType: item.matchType,
        direction: item.direction,
        matchedConcepts: item.matchedConcepts,
        matchedPropositions: item.matchedPropositions,
        matchedWords: item.matchedWords
      });
    }
  }

  return [...map.values()];
}

/* =========================
   SUMMARY
========================= */

function buildSummary(evidence, sources) {
  return {
    totalAssessments: evidence.length,
    uniqueSources: sources.length,

    relevant: evidence.filter(
      e => e.matchType === "Same Proposition"
    ).length,

    contradictory: evidence.filter(
      e => e.matchType === "Opposite Proposition"
    ).length,

    related: evidence.filter(
      e => e.matchType === "Related Topic"
    ).length,

    weak: evidence.filter(
      e => e.matchType === "Keyword Only"
    ).length
  };
}

/* =========================
   STATUS
========================= */

function getStatus(summary) {
  if (summary.relevant > 0) {
    return {
      title: "Directly Relevant Evidence Found",
      message:
        `TruthCheck found ${summary.relevant} directly relevant published assessment(s).`
    };
  }

  if (summary.contradictory > 0) {
    return {
      title: "Contradictory Evidence Found",
      message:
        `TruthCheck found ${summary.contradictory} assessment(s) covering an opposing version of the claim.`
    };
  }

  if (summary.related > 0) {
    return {
      title: "Related Evidence Found",
      message:
        `TruthCheck found ${summary.related} assessment(s) related to the topic.`
    };
  }

  return {
    title: "Limited Evidence Found",
    message:
      "TruthCheck could not find strongly matching published assessments."
  };
}

/* =========================
   MAIN API
========================= */

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    service: "TruthCheck",
    status: "online"
  });
});

app.post("/api/check", async (req, res) => {
  try {
    let claim =
      typeof req.body.claim === "string"
        ? req.body.claim.trim()
        : "";

    const inputType =
      req.body.inputType || "claim";

    if (!claim) {
      return res.status(400).json({
        success: false,
        error: "Please enter a claim or URL."
      });
    }

    if (claim.length > 2000) {
      return res.status(400).json({
        success: false,
        error: "Input is too long. Maximum 2000 characters."
      });
    }

    console.log("Checking input:", claim);

    let searchClaim = claim;
    let webpage = null;

    const looksLikeUrl =
      inputType === "url" ||
      /^https?:\/\//i.test(claim);

    if (looksLikeUrl) {
      console.log("URL detected:", claim);

      webpage = await fetchWebpage(claim);

      searchClaim =
        getUrlSearchClaim(webpage);

      console.log(
        "Page title:",
        webpage.title
      );

      console.log(
        "Fact-check search:",
        searchClaim
      );
    }

    const analysis =
      analyzeClaim(searchClaim);

    if (looksLikeUrl) {
      analysis.inputType = "URL / Link";
      analysis.detectedUrl = claim;
      analysis.pageTitle =
        webpage.title || "Untitled webpage";
      analysis.pageDescription =
        webpage.description || "No description found";
      analysis.extractedTextPreview =
        webpage.text.slice(0, 500);
    }

    const apiData =
      await searchFactChecks(searchClaim);

    const evidence =
      buildEvidence(searchClaim, apiData);

    const sources =
      buildUniqueSources(evidence);

    const summary =
      buildSummary(evidence, sources);

    const status =
      getStatus(summary);

    res.json({
      success: true,

      claim,

      inputType:
        looksLikeUrl
          ? "url"
          : "claim",

      searchClaim,

      analysis,

      status: status.title,

      statusMessage:
        status.message,

      summary,

      sources,

      evidence,

      webpage: webpage
        ? {
            url: webpage.url,
            title: webpage.title,
            description: webpage.description,
            extractedTextPreview:
              webpage.text.slice(0, 1000)
          }
        : null,

      contextNotes: [
        "Relevance is an estimated match between the submitted claim and published fact-check assessments.",
        "TruthCheck does not automatically treat a claim as true or false.",
        "Evidence should be reviewed in its original context."
      ]
    });

  } catch (error) {

    console.error(
      "TruthCheck error:",
      error
    );

    res.status(500).json({
      success: false,
      error:
        error.message ||
        "Something went wrong while checking the input."
    });
  }
});

/* =========================
   START SERVER
========================= */

app.listen(PORT, () => {
  console.log(
    `TruthCheck server running at http://localhost:${PORT}`
  );
});