(() => {
  "use strict";

  const report = window.OUTPLAN_REPORT;
  if (!report) return;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
  const money = (value, decimals = 2) => value == null
    ? "—"
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
  const moneyShort = (value) => value >= 1000
    ? `R$ ${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`
    : money(value);
  const num = (value, decimals = 0) => value == null
    ? "—"
    : new Intl.NumberFormat("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
  const percent = (value, decimals = 1) => value == null ? "—" : `${num(value * 100, decimals)}%`;
  const isoDate = (value) => {
    if (!value) return "—";
    const [year, month, day] = value.split("-");
    const names = ["", "jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    return `${Number(day)} ${names[Number(month)]} ${year}`;
  };
  const setText = (selector, value) => {
    const element = $(selector);
    if (element) element.textContent = value;
  };

  setText("[data-period]", `${isoDate(report.meta.startDate)} — ${isoDate(report.meta.endDate)}`);
  setText("[data-total-leads]", num(report.totals.leads));
  setText("[data-website-leads]", num(report.totals.websiteLeads));
  setText("[data-hosted-leads]", num(report.totals.hostedLeads));
  setText("[data-total-spend]", moneyShort(report.totals.spend));
  setText("[data-total-cpl]", money(report.totals.cpl));
  setText("[data-total-clicks]", num(report.totals.clicks));
  setText("[data-total-lead-rate]", percent(report.totals.leadRate, 2));
  setText("[data-total-ctr]", percent(report.totals.ctr, 2));
  setText("[data-total-cpm]", money(report.totals.impressions > 0 ? (report.totals.spend / report.totals.impressions) * 1000 : null));
  setText("[data-search-spend-coverage]", percent(report.search.spendCoverage, 0));
  setText("[data-search-lead-coverage]", percent(report.search.leadCoverage, 0));

  function deltaMarkup(item) {
    if (item.partial) return '<span class="badge partial">parcial</span>';
    if (item.leadsChange == null) return '<span class="delta neutral">base</span>';
    const value = item.leadsChange * 100;
    const tone = value > 0 ? "good" : value < 0 ? "bad" : "neutral";
    const arrow = value > 0 ? "↑" : value < 0 ? "↓" : "—";
    return `<span class="delta ${tone}">${arrow} ${num(Math.abs(value), 0)}%</span>`;
  }

  $("[data-monthly-table]").innerHTML = report.monthly.map((item) => {
    const rowClass = item.key === "2026-04" ? "best" : item.key === "2026-08" ? "critical" : item.partial ? "partial" : "";
    const note = item.key === "2026-02" ? '<span class="muted">Início em 18/02</span>' : item.partial ? '<span class="muted">1–6 out</span>' : "";
    return `
      <tr class="${rowClass}">
        <td><span class="month-name"><i class="row-dot"></i><strong>${esc(item.label)}</strong></span>${note}</td>
        <td><strong>${money(item.spend)}</strong></td>
        <td>${num(item.clicks)}</td>
        <td><strong class="lead-count">${num(item.leads)}</strong></td>
        <td>${percent(item.leadRate, 2)}</td>
        <td><strong>${money(item.cpl)}</strong></td>
        <td>${deltaMarkup(item)}</td>
      </tr>`;
  }).join("");

  const phaseListMarkup = report.phases.map((phase) => `
    <li data-phase="${esc(phase.id)}">
      <div class="phase-context">
        <span class="phase-period">${esc(phase.period)}</span>
        <span class="phase-page-label">Landing page</span>
        <strong class="phase-pages">${(phase.landingPages ?? []).map(esc).join(" · ")}</strong>
      </div>
      <div class="phase-copy">
        <h3>${esc(phase.title)}</h3>
        <p>${esc(phase.summary)}</p>
        <ul class="phase-actions">
          ${(phase.actions ?? []).map((action) => `<li>${esc(action)}</li>`).join("")}
        </ul>
      </div>
      <div class="phase-metrics">
        <div><span>Leads</span><strong>${num(phase.leads)}</strong></div>
        <div><span>Custo por lead</span><strong>${money(phase.cpl)}</strong></div>
        <div><span>Investimento</span><strong>${moneyShort(phase.spend)}</strong></div>
        <div><span>Conversão</span><strong>${percent(phase.leadRate, 1)}</strong></div>
      </div>
    </li>
  `).join("");

  $("[data-phases]").innerHTML = phaseListMarkup;

  const journeyTrack = $("[data-journey-track]");
  const journeyDetail = $("[data-journey-detail]");
  const journeyMetrics = (phase) => `
    <div><span>Leads</span><strong>${num(phase.leads)}</strong></div>
    <div><span>Custo por lead</span><strong>${money(phase.cpl)}</strong></div>
    <div><span>Investimento</span><strong>${moneyShort(phase.spend)}</strong></div>
    <div><span>Conversão</span><strong>${percent(phase.leadRate, 1)}</strong></div>
  `;

  journeyTrack.innerHTML = report.phases.map((phase, index) => `
    <button
      type="button"
      class="journey-step"
      id="journey-tab-${esc(phase.id)}"
      role="tab"
      aria-selected="${index === 0}"
      aria-controls="journey-detail"
      tabindex="${index === 0 ? 0 : -1}"
      data-journey-phase="${esc(phase.id)}"
    >
      <span class="journey-step-result"><strong>${num(phase.leads)}</strong> leads</span>
      <i aria-hidden="true"></i>
      <span class="journey-step-period">${esc(phase.period)}</span>
      <small>LP ${(phase.landingPages ?? []).map(esc).join(" · ")}</small>
    </button>
  `).join("");
  journeyTrack.style.setProperty("--phase-count", report.phases.length);

  journeyDetail.id = "journey-detail";
  const journeyButtons = $$('[data-journey-phase]');
  const journeyPrevious = $("[data-journey-previous]");
  const journeyNext = $("[data-journey-next]");
  let activeJourneyIndex = 0;

  function activateJourney(phaseId, shouldFocus = false) {
    const phase = report.phases.find((item) => item.id === phaseId) ?? report.phases[0];
    activeJourneyIndex = Math.max(0, report.phases.findIndex((item) => item.id === phase.id));

    journeyButtons.forEach((button) => {
      const active = button.dataset.journeyPhase === phase.id;
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
      if (active && shouldFocus) button.focus();
    });

    const activeButton = journeyButtons[activeJourneyIndex];
    if (activeButton && journeyTrack.scrollWidth > journeyTrack.clientWidth) {
      journeyTrack.scrollTo({
        left: activeButton.offsetLeft - (journeyTrack.clientWidth - activeButton.offsetWidth) / 2,
        behavior: "smooth",
      });
    }
    journeyPrevious.disabled = activeJourneyIndex === 0;
    journeyNext.disabled = activeJourneyIndex === report.phases.length - 1;

    journeyDetail.setAttribute("aria-labelledby", `journey-tab-${phase.id}`);
    journeyDetail.innerHTML = `
      <div class="journey-detail-context">
        <span>${esc(phase.period)}</span>
        <small>Landing page</small>
        <strong>${(phase.landingPages ?? []).map(esc).join(" · ")}</strong>
      </div>
      <div class="journey-detail-copy">
        <h3>${esc(phase.title)}</h3>
        <p>${esc(phase.summary)}</p>
        <ul class="journey-actions">
          ${(phase.actions ?? []).map((action) => `<li>${esc(action)}</li>`).join("")}
        </ul>
      </div>
      <div class="journey-detail-metrics">${journeyMetrics(phase)}</div>
    `;
  }

  journeyButtons.forEach((button, index) => {
    button.addEventListener("click", () => activateJourney(button.dataset.journeyPhase));
    button.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      let next = index;
      if (event.key === "ArrowLeft") next = (index - 1 + journeyButtons.length) % journeyButtons.length;
      if (event.key === "ArrowRight") next = (index + 1) % journeyButtons.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = journeyButtons.length - 1;
      activateJourney(journeyButtons[next].dataset.journeyPhase, true);
    });
  });

  journeyPrevious.addEventListener("click", () => {
    const previous = report.phases[activeJourneyIndex - 1];
    if (previous) activateJourney(previous.id);
  });
  journeyNext.addEventListener("click", () => {
    const next = report.phases[activeJourneyIndex + 1];
    if (next) activateJourney(next.id);
  });

  activateJourney(report.phases[0]?.id);

  const evolutionViewButtons = $$('[data-evolution-view]');
  const evolutionPanels = $$('[data-evolution-panel]');
  function activateEvolutionView(view) {
    evolutionViewButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.evolutionView === view));
    });
    evolutionPanels.forEach((panel) => {
      panel.hidden = panel.dataset.evolutionPanel !== view;
    });
  }
  evolutionViewButtons.forEach((button) => {
    button.addEventListener("click", () => activateEvolutionView(button.dataset.evolutionView));
  });

  const keywordTabs = report.search.keywordTabs ?? {
    converters: report.search.topMatchedKeywords.filter((item) => item.leads > 0),
    bottomFunnel: [],
    competitors: [],
  };
  const keywordRows = (items) => items.map((item, index) => `
      <tr>
        <td class="keyword-name"><span class="keyword-rank">${index + 1}</span><strong>${esc(item.text)}</strong></td>
        <td>${num(item.clicks)}</td>
        <td>${money(item.spend)}</td>
        <td><strong class="lead-count">${num(item.leads)}</strong></td>
        <td><strong>${money(item.cpl)}</strong></td>
      </tr>
    `).join("");

  Object.entries(keywordTabs).forEach(([group, items]) => {
    const body = $(`[data-keyword-group="${group}"]`);
    if (body) body.innerHTML = keywordRows(items);
    const summary = $(`[data-keyword-summary="${group}"]`);
    if (summary) {
      const leads = items.reduce((total, item) => total + item.leads, 0);
      const spend = items.reduce((total, item) => total + item.spend, 0);
      summary.textContent = `${num(items.length)} palavras · ${num(leads)} leads · ${money(spend)} investidos`;
    }
    setText(`[data-keyword-tab-count="${group}"]`, `${num(items.length)} palavras`);
  });

  const tabButtons = $$('[data-keyword-tab]');
  function activateKeywordTab(group, shouldFocus = false) {
    tabButtons.forEach((button) => {
      const active = button.dataset.keywordTab === group;
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
      if (active && shouldFocus) button.focus();
    });
    $$('[data-keyword-panel]').forEach((panel) => {
      const active = panel.dataset.keywordPanel === group;
      panel.hidden = !active;
      panel.classList.toggle("active", active);
    });
  }

  tabButtons.forEach((button, index) => {
    button.addEventListener("click", () => activateKeywordTab(button.dataset.keywordTab));
    button.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      let next = index;
      if (event.key === "ArrowLeft") next = (index - 1 + tabButtons.length) % tabButtons.length;
      if (event.key === "ArrowRight") next = (index + 1) % tabButtons.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = tabButtons.length - 1;
      activateKeywordTab(tabButtons[next].dataset.keywordTab, true);
    });
  });

  const chartView = {
    barLabel: "Leads",
    lineLabel: "Custo por lead",
    bars: report.monthly.map((item) => item.leads),
    line: report.monthly.map((item) => item.cpl),
    barFormat: (value) => num(value),
    lineFormat: (value) => money(value),
  };

  let chart;
  function renderChart() {
    const view = chartView;
    const partialIndex = report.monthly.findIndex((item) => item.partial);
    const barColors = report.monthly.map((_, index) => index === partialIndex ? "rgba(232,154,130,.22)" : "rgba(232,154,130,.76)");
    const barBorders = report.monthly.map((_, index) => index === partialIndex ? "rgba(232,154,130,.72)" : "rgba(232,154,130,1)");
    const config = {
      type: "bar",
      data: {
        labels: report.monthly.map((item) => item.partial ? "Out*" : item.label.slice(0, 3)),
        datasets: [
          {
            type: "bar",
            label: view.barLabel,
            data: view.bars,
            yAxisID: "y",
            backgroundColor: barColors,
            borderColor: barBorders,
            borderWidth: report.monthly.map((_, index) => index === partialIndex ? 1 : 0),
            borderRadius: 5,
            maxBarThickness: 46,
          },
          {
            type: "line",
            label: view.lineLabel,
            data: view.line,
            yAxisID: "y1",
            borderColor: "#00c2ff",
            backgroundColor: "#00c2ff",
            pointBackgroundColor: "#191526",
            pointBorderColor: "#00c2ff",
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 2,
            tension: .22,
            spanGaps: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#120f1d",
            borderColor: "rgba(255,255,255,.15)",
            borderWidth: 1,
            padding: 12,
            titleColor: "#f4f2f8",
            bodyColor: "#c9c3db",
            callbacks: {
              label(context) {
                const formatter = context.datasetIndex === 0 ? view.barFormat : view.lineFormat;
                return ` ${context.dataset.label}: ${formatter(context.parsed.y)}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { color: "rgba(255,255,255,.08)" },
            ticks: { color: "#8a839e", font: { family: "Inter", size: 11, weight: 600 } },
          },
          y: {
            beginAtZero: true,
            position: "left",
            grid: { color: "rgba(255,255,255,.065)" },
            border: { display: false },
            ticks: { color: "#8a839e", font: { family: "Inter", size: 11 }, callback: view.barFormat },
            title: { display: true, text: "Leads", color: "#8a839e", font: { size: 11, weight: 600 } },
          },
          y1: {
            beginAtZero: true,
            position: "right",
            grid: { drawOnChartArea: false },
            border: { display: false },
            ticks: { color: "#8a839e", font: { family: "Inter", size: 11 }, callback: view.lineFormat },
            title: { display: true, text: "Custo por lead", color: "#8a839e", font: { size: 11, weight: 600 } },
          },
        },
      },
    };

    if (chart) chart.destroy();
    if (window.Chart) chart = new Chart($("#monthlyChart"), config);
  }

  $("[data-print]")?.addEventListener("click", () => window.print());
  renderChart();
})();
