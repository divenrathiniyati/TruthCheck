// ============================================================
// TruthCheck - Frontend JavaScript
// Day 3: Claim Check + URL Detection Preparation
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
    console.log("TruthCheck frontend loaded successfully.");

    // --------------------------------------------------------
    // DOM ELEMENTS
    // --------------------------------------------------------

    const claimForm = document.getElementById("claimForm");
    const claimInput = document.getElementById("claimInput");
    const checkButton = document.getElementById("checkButton");

    const resultSection = document.getElementById("resultSection");

    const resultClaim = document.getElementById("resultClaim");
    const claimTypeBadge = document.getElementById("claimTypeBadge");

    const analysisClaimType = document.getElementById("analysisClaimType");
    const analysisQuestion = document.getElementById("analysisQuestion");
    const analysisYears = document.getElementById("analysisYears");
    const analysisNumbers = document.getElementById("analysisNumbers");
    const analysisUrl = document.getElementById("analysisUrl");
    const analysisContext = document.getElementById("analysisContext");
    const normalizedClaim = document.getElementById("normalizedClaim");

    const statusIcon = document.getElementById("statusIcon");
    const statusTitle = document.getElementById("statusTitle");
    const statusMessage = document.getElementById("statusMessage");

    const sourceCount = document.getElementById("sourceCount");
    const evidenceCount = document.getElementById("evidenceCount");
    const relevantCount = document.getElementById("relevantCount");
    const contradictoryCount = document.getElementById("contradictoryCount");
    const relatedCount = document.getElementById("relatedCount");
    const weakCount = document.getElementById("weakCount");

    const sourcesList = document.getElementById("sourcesList");
    const evidenceList = document.getElementById("evidenceList");

    const notice = document.getElementById("notice");

    const newCheckButtons = [
        document.getElementById("newCheckButtonTop"),
        document.getElementById("newCheckButtonBottom")
    ].filter(Boolean);


    // --------------------------------------------------------
    // BASIC SAFETY CHECK
    // --------------------------------------------------------

    if (!claimForm || !claimInput || !checkButton) {
        console.error("TruthCheck: Required HTML elements are missing.");
        return;
    }


    // --------------------------------------------------------
    // HTML ESCAPE
    // Prevents HTML entered by users from being interpreted
    // as actual HTML.
    // --------------------------------------------------------

    function escapeHtml(value) {
        if (value === null || value === undefined) {
            return "";
        }

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    // --------------------------------------------------------
    // ARRAY / LIST FORMATTER
    // --------------------------------------------------------

    function formatList(items) {
        if (!Array.isArray(items) || items.length === 0) {
            return "None";
        }

        return items
            .map(item => escapeHtml(item))
            .join(", ");
    }


    // --------------------------------------------------------
    // URL DETECTION
    // Day 3 preparation
    // --------------------------------------------------------

    function isUrl(text) {
        if (!text) {
            return false;
        }

        const value = text.trim();

        try {
            const url = new URL(value);

            return (
                url.protocol === "http:" ||
                url.protocol === "https:"
            );
        } catch (error) {
            return false;
        }
    }


    // --------------------------------------------------------
    // INPUT TYPE
    // --------------------------------------------------------

    function detectInputType(text) {
        if (isUrl(text)) {
            return "url";
        }

        return "claim";
    }


    // --------------------------------------------------------
    // MATCH CLASS
    // Used for relevance/evidence badges
    // --------------------------------------------------------

    function getMatchClass(matchType) {
        if (!matchType) {
            return "related";
        }

        const type = String(matchType).toLowerCase();

        if (
            type.includes("direct") ||
            type.includes("same")
        ) {
            return "relevant";
        }

        if (
            type.includes("contradict") ||
            type.includes("opposite")
        ) {
            return "contradictory";
        }

        if (
            type.includes("weak")
        ) {
            return "weak";
        }

        return "related";
    }


    // --------------------------------------------------------
    // LOADING STATE
    // --------------------------------------------------------

    function setLoading(isLoading) {
        if (isLoading) {
            checkButton.disabled = true;

            checkButton.dataset.originalText =
                checkButton.innerHTML;

            checkButton.innerHTML = `
                <span class="button-spinner"></span>
                Checking...
            `;

            claimInput.disabled = true;
        } else {
            checkButton.disabled = false;

            checkButton.innerHTML =
                checkButton.dataset.originalText ||
                "Check Claim";

            claimInput.disabled = false;
        }
    }


    // --------------------------------------------------------
    // ERROR MESSAGE
    // --------------------------------------------------------

    function showError(message) {
        console.error("TruthCheck error:", message);

        if (notice) {
            notice.classList.remove("hidden");

            notice.innerHTML = `
                <div class="notice-error">
                    <strong>Something went wrong</strong>
                    <p>${escapeHtml(message)}</p>
                </div>
            `;
        }

        if (statusTitle) {
            statusTitle.textContent = "Check Failed";
        }

        if (statusMessage) {
            statusMessage.textContent = message;
        }

        if (statusIcon) {
            statusIcon.textContent = "!";
        }

        if (resultSection) {
            resultSection.classList.add("visible");
        }
    }


    // --------------------------------------------------------
    // HIDE ERROR / NOTICE
    // --------------------------------------------------------

    function clearNotice() {
        if (!notice) {
            return;
        }

        notice.innerHTML = "";
        notice.classList.add("hidden");
    }


    // --------------------------------------------------------
    // CLAIM ANALYSIS
    // --------------------------------------------------------

    function displayClaimAnalysis(data, submittedText) {
        const analysis =
            data.claimAnalysis ||
            data.analysis ||
            {};

        const claimType =
            analysis.claimType ||
            data.claimType ||
            detectInputType(submittedText);

        const question =
            analysis.question ||
            "Does the available evidence support this claim?";

        const years =
            analysis.years ||
            analysis.yearReferences ||
            [];

        const numbers =
            analysis.numbers ||
            [];

        const urls =
            analysis.urls ||
            [];

        const context =
            analysis.context ||
            analysis.contextWords ||
            [];

        const normalized =
            analysis.normalizedClaim ||
            data.normalizedClaim ||
            submittedText;

        if (analysisClaimType) {
            analysisClaimType.textContent = claimType;
        }

        if (analysisQuestion) {
            analysisQuestion.textContent = question;
        }

        if (analysisYears) {
            analysisYears.textContent =
                Array.isArray(years)
                    ? formatList(years)
                    : escapeHtml(years);
        }

        if (analysisNumbers) {
            analysisNumbers.textContent =
                Array.isArray(numbers)
                    ? formatList(numbers)
                    : escapeHtml(numbers);
        }

        if (analysisUrl) {
            const detectedUrl =
                analysis.detectedUrl ||
                analysis.url ||
                "";

            analysisUrl.textContent =
                detectedUrl ||
                (Array.isArray(urls)
                    ? formatList(urls)
                    : escapeHtml(urls || "No URL detected"));
        }

        if (analysisContext) {
            analysisContext.textContent =
                Array.isArray(context)
                    ? formatList(context)
                    : escapeHtml(context);
        }

        if (normalizedClaim) {
            normalizedClaim.textContent = normalized;
        }

        if (claimTypeBadge) {
            claimTypeBadge.textContent =
                claimType === "url"
                    ? "URL"
                    : "CLAIM";
        }

        if (resultClaim) {
            resultClaim.textContent = submittedText;
        }
    }


    // --------------------------------------------------------
    // STATUS DISPLAY
    // --------------------------------------------------------

    function displayStatus(data) {
        const status =
            data.status ||
            "Verification Complete";

        const message =
            data.statusMessage ||
            data.message ||
            "TruthCheck completed the evidence search.";

        if (statusTitle) {
            statusTitle.textContent =
                typeof status === "object"
                    ? status.title || "Verification Complete"
                    : status;
        }

        if (statusMessage) {
            statusMessage.textContent =
                typeof status === "object"
                    ? status.message || message
                    : message;
        }

        if (statusIcon) {
            statusIcon.textContent = "✓";
        }
    }


    // --------------------------------------------------------
    // SUMMARY COUNTS
    // --------------------------------------------------------

    function displaySummary(data) {
        const summary = data.summary || {};

        const totalSources =
            summary.uniqueSources ??
            data.uniqueSources ??
            data.sources?.length ??
            0;

        const totalEvidence =
            summary.totalAssessments ??
            data.totalAssessments ??
            data.evidence?.length ??
            0;

        const relevant =
            summary.relevant ??
            data.relevant ??
            0;

        const related =
            summary.related ??
            data.related ??
            0;

        const weak =
            summary.weak ??
            data.weak ??
            0;

        if (sourceCount) {
            sourceCount.textContent = totalSources;
        }

        if (evidenceCount) {
            evidenceCount.textContent = totalEvidence;
        }

        if (relevantCount) {
            relevantCount.textContent = relevant;
        }

        if (contradictoryCount) {
            contradictoryCount.textContent =
                summary.contradictory ??
                data.contradictory ??
                0;
        }

        if (relatedCount) {
            relatedCount.textContent = related;
        }

        if (weakCount) {
            weakCount.textContent = weak;
        }
    }


    // --------------------------------------------------------
    // SOURCE CARD
    // --------------------------------------------------------

    function createSourceCard(source, index) {
        const title =
            source.title ||
            source.name ||
            "Untitled source";

        const publisher =
            source.publisher ||
            source.source ||
            source.publisherName ||
            "Unknown publisher";

        const rating =
            source.rating ||
            source.textualRating ||
            "Not specified";

        const url =
            source.url ||
            source.reviewUrl ||
            source.webUrl ||
            "";

        const relevance =
            source.relevanceScore ??
            source.relevance ??
            "";

        const relevanceLevel =
            source.relevanceLevel ||
            source.matchType ||
            "Related";

        const concepts =
            Array.isArray(source.matchedConcepts)
                ? source.matchedConcepts
                : source.concept
                    ? [source.concept]
                    : [];

        const propositions =
            Array.isArray(source.matchedPropositions)
                ? source.matchedPropositions
                : source.proposition
                    ? [source.proposition]
                    : [];

        const matchClass =
            getMatchClass(relevanceLevel);

        return `
            <article class="source-card">
                <div class="source-card-header">
                    <span class="source-number">
                        ${index + 1}
                    </span>

                    <div class="source-main">
                        <h3>
                            ${escapeHtml(title)}
                        </h3>

                        <p class="source-publisher">
                            ${escapeHtml(publisher)}
                        </p>
                    </div>
                </div>

                <div class="source-meta">
                    <span class="source-rating">
                        Rating:
                        <strong>
                            ${escapeHtml(rating)}
                        </strong>
                    </span>

                    ${
                        relevance !== ""
                            ? `
                                <span class="source-relevance ${matchClass}">
                                    Relevance:
                                    <strong>
                                        ${escapeHtml(relevance)}%
                                    </strong>
                                </span>
                              `
                            : ""
                    }

                    <span class="source-match ${matchClass}">
                        ${escapeHtml(relevanceLevel)}
                    </span>
                </div>

                <div class="source-details">
                    <p>
                        <strong>Concept:</strong>
                        ${concepts.length ? formatList(concepts) : "Not identified"}
                    </p>

                    ${
                        propositions.length
                            ? `
                                <p>
                                    <strong>Proposition:</strong>
                                    ${formatList(propositions.slice(0, 3))}
                                </p>
                              `
                            : ""
                    }
                </div>

                ${
                    url
                        ? `
                            <a
                                class="source-link"
                                href="${escapeHtml(url)}"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Open Original Source ↗
                            </a>
                          `
                        : ""
                }
            </article>
        `;
    }


    // --------------------------------------------------------
    // DISPLAY SOURCES
    // --------------------------------------------------------

    function displaySources(data) {
        if (!sourcesList) {
            return;
        }

        const sources =
            Array.isArray(data.sources)
                ? data.sources
                : [];

        if (sources.length === 0) {
            sourcesList.innerHTML = `
                <div class="empty-state">
                    No published sources were found.
                </div>
            `;

            return;
        }

        sourcesList.innerHTML = sources
            .map((source, index) =>
                createSourceCard(source, index)
            )
            .join("");
    }


    // --------------------------------------------------------
    // EVIDENCE CARD
    // --------------------------------------------------------

    function createEvidenceCard(evidence, index) {
        const title =
            evidence.title ||
            "Fact-check assessment";

        const publisher =
            evidence.publisher ||
            evidence.source ||
            "Unknown publisher";

        const reviewedClaim =
            evidence.reviewedClaim ||
            evidence.claim ||
            evidence.publishedClaim ||
            "Not available";

        const rating =
            evidence.rating ||
            evidence.textualRating ||
            "Not specified";

        const relevance =
            evidence.relevanceScore ??
            evidence.relevance ??
            "";

        const matchType =
            evidence.matchType ||
            evidence.relevanceLevel ||
            "Related";

        const concept =
            evidence.concept ||
            evidence.conceptLabel ||
            "Unknown";

        const proposition =
            evidence.proposition ||
            evidence.matchedProposition ||
            "";

        const matchedWords =
            evidence.matchedWords ||
            [];

        const direction =
            evidence.direction ||
            "";

        const matchClass =
            getMatchClass(matchType);

        return `
            <article class="evidence-card">
                <div class="evidence-header">
                    <span class="evidence-number">
                        ${index + 1}
                    </span>

                    <div>
                        <h3>
                            ${escapeHtml(title)}
                        </h3>

                        <p>
                            ${escapeHtml(publisher)}
                        </p>
                    </div>
                </div>

                <div class="evidence-body">

                    <div class="reviewed-claim">
                        <strong>Published claim reviewed:</strong>

                        <p>
                            ${escapeHtml(reviewedClaim)}
                        </p>
                    </div>

                    <div class="evidence-meta">

                        <span>
                            Rating:
                            <strong>
                                ${escapeHtml(rating)}
                            </strong>
                        </span>

                        ${
                            relevance !== ""
                                ? `
                                    <span class="${matchClass}">
                                        Relevance:
                                        <strong>
                                            ${escapeHtml(relevance)}%
                                        </strong>
                                    </span>
                                  `
                                : ""
                        }

                        <span class="${matchClass}">
                            ${escapeHtml(matchType)}
                        </span>

                    </div>

                    <div class="evidence-details">

                        <p>
                            <strong>Concept:</strong>
                            ${escapeHtml(concept)}
                        </p>

                        ${
                            proposition
                                ? `
                                    <p>
                                        <strong>Proposition:</strong>
                                        ${escapeHtml(proposition)}
                                    </p>
                                  `
                                : ""
                        }

                        ${
                            direction
                                ? `
                                    <p>
                                        <strong>Direction:</strong>
                                        ${escapeHtml(direction)}
                                    </p>
                                  `
                                : ""
                        }

                        ${
                            Array.isArray(matchedWords) &&
                            matchedWords.length > 0
                                ? `
                                    <p>
                                        <strong>Matched words:</strong>
                                        ${formatList(matchedWords)}
                                    </p>
                                  `
                                : ""
                        }

                    </div>
                </div>
            </article>
        `;
    }


    // --------------------------------------------------------
    // DISPLAY EVIDENCE
    // --------------------------------------------------------

    function displayEvidence(data) {
        if (!evidenceList) {
            return;
        }

        const evidence =
            Array.isArray(data.evidence)
                ? data.evidence
                : [];

        if (evidence.length === 0) {
            evidenceList.innerHTML = `
                <div class="empty-state">
                    No evidence assessments were returned.
                </div>
            `;

            return;
        }

        evidenceList.innerHTML = evidence
            .map((item, index) =>
                createEvidenceCard(item, index)
            )
            .join("");
    }


    // --------------------------------------------------------
    // NOTICE / DISCLAIMER
    // --------------------------------------------------------

    function displayNotice(data) {
        if (!notice) {
            return;
        }

        const contextNotes =
            data.contextNotes ||
            data.notes ||
            [];

        const notes =
            Array.isArray(contextNotes)
                ? contextNotes
                : [contextNotes];

        const filteredNotes =
            notes.filter(Boolean);

        let html = `
            <div class="notice-info">
                <strong>Important:</strong>

                <p>
                    Relevance is an estimated match between
                    your claim and published fact-check material.
                    It is not a truth or confidence score.
                </p>
            </div>
        `;

        if (data.webpage) {
            const pageTitle = data.webpage.title || "Webpage";
            const pageDescription = data.webpage.description || "";

            html += `
                <div class="notice-notes webpage-note">
                    <p><strong>Page checked:</strong> ${escapeHtml(pageTitle)}</p>
                    ${pageDescription ? `<p>${escapeHtml(pageDescription)}</p>` : ""}
                </div>
            `;
        }

        if (filteredNotes.length > 0) {
            html += `
                <div class="notice-notes">
                    ${filteredNotes
                        .map(note => `
                            <p>
                                ${escapeHtml(note)}
                            </p>
                        `)
                        .join("")}
                </div>
            `;
        }

        notice.innerHTML = html;
        notice.classList.remove("hidden");
    }


    // --------------------------------------------------------
    // DISPLAY COMPLETE RESULT
    // --------------------------------------------------------

    function displayResult(data, submittedText) {
        console.log("TruthCheck result:", data);

        if (!data) {
            showError("The server returned an empty response.");
            return;
        }

        if (resultSection) {
            resultSection.classList.add("visible");
        }

        displayClaimAnalysis(
            data,
            submittedText
        );

        displayStatus(data);

        displaySummary(data);

        displaySources(data);

        displayEvidence(data);

        displayNotice(data);

        // Scroll to result
        setTimeout(() => {
            if (resultSection) {
                resultSection.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        }, 100);
    }


    // --------------------------------------------------------
    // MAIN CHECK FUNCTION
    // --------------------------------------------------------

    async function checkClaim() {
        const input = claimInput.value.trim();

        if (!input) {
            claimInput.focus();
            return;
        }

        clearNotice();

        const inputType = detectInputType(input);

        console.log(
            "TruthCheck input type:",
            inputType
        );

        console.log(
            "TruthCheck submitted:",
            input
        );

        setLoading(true);

        try {
            // ------------------------------------------------
            // CURRENT BACKEND REQUEST
            //
            // We send inputType as well.
            // Existing claim checking continues to work.
            // URL processing will be handled in server.js.
            // ------------------------------------------------

            const response = await fetch("/api/check", {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    claim: input,
                    inputType: inputType
                })
            });

            console.log(
                "TruthCheck server response:",
                response.status
            );

            let data;

            try {
                data = await response.json();
            } catch (jsonError) {
                throw new Error(
                    "Server returned an invalid response."
                );
            }

            console.log(
                "TruthCheck server data:",
                data
            );

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    data.error ||
                    `Server error (${response.status})`
                );
            }

            if (data.success === false) {
                throw new Error(
                    data.message ||
                    data.error ||
                    "TruthCheck could not process this request."
                );
            }

            displayResult(
                data,
                input
            );

            try {
                const history = JSON.parse(
                    localStorage.getItem("truthcheck_history") || "[]"
                );
                const updated = [
                    { text: input, type: inputType, time: Date.now() },
                    ...history.filter(item => item.text !== input)
                ].slice(0, 10);
                localStorage.setItem(
                    "truthcheck_history",
                    JSON.stringify(updated)
                );
            } catch (_) {}

        } catch (error) {
            console.error(
                "TruthCheck request failed:",
                error
            );

            let message =
                error.message ||
                "Unable to connect to TruthCheck.";

            if (
                error.name === "TypeError" &&
                message.toLowerCase().includes("fetch")
            ) {
                message =
                    "Could not connect to the TruthCheck backend. " +
                    "Make sure server.js is running.";
            }

            showError(message);

        } finally {
            setLoading(false);
        }
    }


    // --------------------------------------------------------
    // FORM SUBMIT
    // --------------------------------------------------------

    claimForm.addEventListener(
        "submit",
        event => {
            event.preventDefault();

            checkClaim();
        }
    );


    // --------------------------------------------------------
    // EXAMPLE CLAIM BUTTONS
    // --------------------------------------------------------

    const exampleButtons =
        document.querySelectorAll(
            ".example-button"
        );

    exampleButtons.forEach(button => {
        button.addEventListener(
            "click",
            () => {
                const claim =
                    button.dataset.claim ||
                    button.textContent.trim();

                claimInput.value = claim;

                claimInput.focus();

                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });
            }
        );
    });


    // --------------------------------------------------------
    // NEW CHECK BUTTONS
    // --------------------------------------------------------

    newCheckButtons.forEach(button => {
        button.addEventListener(
            "click",
            () => {
                claimInput.value = "";

                clearNotice();

                if (resultSection) {
                    resultSection.classList.remove(
                        "visible"
                    );
                }

                claimInput.disabled = false;

                claimInput.focus();

                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });
            }
        );
    });


    // --------------------------------------------------------
    // ENTER KEY SUPPORT
    // --------------------------------------------------------

    claimInput.addEventListener(
        "keydown",
        event => {
            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {
                event.preventDefault();

                if (!checkButton.disabled) {
                    checkClaim();
                }
            }
        }
    );


    // --------------------------------------------------------
    // INPUT HINT
    // --------------------------------------------------------

    claimInput.addEventListener(
        "input",
        () => {
            const value =
                claimInput.value.trim();

            if (value.length === 0) {
                claimInput.removeAttribute(
                    "data-input-type"
                );

                return;
            }

            claimInput.dataset.inputType =
                detectInputType(value);
        }
    );

});