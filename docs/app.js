/* Takshashila QMD Converter — frontend logic */

(function () {
  "use strict";

  // ── Config ──────────────────────────────────────────────────────────────────
  // After connecting to Render, paste the service URL here.
  // Format: https://your-service-name.onrender.com
  const API_BASE = "https://takshashila-qmd-converter.onrender.com";

  // ── DOM refs ────────────────────────────────────────────────────────────────
  const form       = document.getElementById("convertForm");
  const convertBtn = document.getElementById("convertBtn");
  const btnLabel   = convertBtn.querySelector(".btn-label");
  const btnArrow   = convertBtn.querySelector("#btnArrow");
  const spinnerEl  = convertBtn.querySelector(".spinner");

  const progressArea = document.getElementById("progressArea");
  const progressMsg  = document.getElementById("progressMsg");

  const resultArea       = document.getElementById("resultArea");
  const successCard      = document.getElementById("successCard");
  const errorCard        = document.getElementById("errorCard");
  const resultMsg        = document.getElementById("resultMsg");
  const errorMsg         = document.getElementById("errorMsg");

  // ── Mode toggle ─────────────────────────────────────────────────────────────
  const modeRadios = document.querySelectorAll('input[name="mode"]');
  function currentMode() {
    for (const r of modeRadios) if (r.checked) return r.value;
    return "paper";
  }

  function applyDocMode(mode) {
    document.querySelectorAll(".paper-only").forEach(el => {
      el.style.display = mode === "paper" ? "" : "none";
    });
    document.querySelectorAll(".blog-only").forEach(el => {
      el.style.display = mode === "blog" ? "" : "none";
    });

    // Update step 3 heading
    const step3Title = document.querySelector(".step3-title");
    if (step3Title) {
      step3Title.textContent = mode === "paper"
        ? "Output Settings"
        : "Blog Slug";
    }
  }

  modeRadios.forEach(r => {
    r.addEventListener("change", () => applyDocMode(currentMode()));
  });
  applyDocMode(currentMode()); // on load

  // Prefill today's date
  const dateInput = document.getElementById("date");
  if (!dateInput.value) {
    dateInput.value = new Date().toISOString().slice(0, 10);
  }

  // ── Form submit ─────────────────────────────────────────────────────────────
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const mode = currentMode();
    if (!validateForm(mode)) return;

    setLoading(true);
    hideResults();
    showProgress(
      mode === "blog"
        ? "Converting blog post (~1–2 min)…"
        : "Converting document and rendering PDF (~2–5 min)…"
    );

    const fd = new FormData(form);
    // Ensure mode is in the payload
    fd.set("mode", mode);

    let zip_blob, filename;
    try {
      const resp = await fetch(`${API_BASE}/api/convert`, {
        method: "POST",
        body: fd,
      });

      if (!resp.ok) {
        let detail = `Server error (${resp.status})`;
        try {
          const json = await resp.json();
          detail = json.detail || detail;
        } catch (_) {}
        throw new Error(detail);
      }

      // Pull filename from Content-Disposition header
      const cd = resp.headers.get("Content-Disposition") || "";
      const match = cd.match(/filename="?([^";]+)"?/);
      filename = match ? match[1] : (mode === "blog"
        ? `${fd.get("slug") || "post"}.zip`
        : `${fd.get("pdf_filename") || "output"}.zip`);

      zip_blob = await resp.blob();
    } catch (err) {
      showError(err.message);
      setLoading(false);
      hideProgress();
      return;
    }

    setLoading(false);
    hideProgress();
    showSuccess(zip_blob, filename);
  });

  // ── Validation ──────────────────────────────────────────────────────────────
  function validateForm(mode) {
    let ok = true;
    const required = ["google_doc_url", "title", "authors", "date"];
    if (mode === "paper") required.push("pdf_filename");
    if (mode === "blog")  required.push("slug");

    required.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (!el.value.trim()) { el.classList.add("error"); ok = false; }
      else el.classList.remove("error");
    });

    const urlEl = document.getElementById("google_doc_url");
    if (
      urlEl.value.trim() &&
      !urlEl.value.includes("docs.google.com") &&
      !urlEl.value.includes("drive.google.com")
    ) {
      urlEl.classList.add("error");
      ok = false;
      alert("Please paste a Google Docs URL (docs.google.com or drive.google.com).");
    }

    if (mode === "paper") {
      const fnEl = document.getElementById("pdf_filename");
      if (fnEl && fnEl.value.trim() && !/^[A-Za-z0-9_\-]+$/.test(fnEl.value.trim())) {
        fnEl.classList.add("error");
        ok = false;
        alert("Filename may only contain letters, numbers, hyphens and underscores.");
      }
    }

    if (mode === "blog") {
      const slugEl = document.getElementById("slug");
      if (slugEl && slugEl.value.trim() && !/^[A-Za-z0-9_\-]+$/.test(slugEl.value.trim())) {
        slugEl.classList.add("error");
        ok = false;
        alert("Slug may only contain letters, numbers, hyphens and underscores.");
      }
    }

    return ok;
  }

  document.querySelectorAll("input, textarea").forEach((el) => {
    el.addEventListener("input", () => el.classList.remove("error"));
  });

  // ── UI helpers ───────────────────────────────────────────────────────────────
  function setLoading(on) {
    convertBtn.disabled = on;
    btnLabel.textContent = on ? "Converting…" : "Convert";
    if (btnArrow) btnArrow.hidden = on;
    spinnerEl.hidden = !on;
  }

  function showProgress(msg) {
    progressMsg.textContent = msg;
    progressArea.hidden = false;
    progressArea.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function hideProgress() { progressArea.hidden = true; }

  function hideResults() {
    resultArea.hidden = true;
    successCard.hidden = true;
    errorCard.hidden = true;
  }

  function showSuccess(blob, filename) {
    const url = URL.createObjectURL(blob);
    const dlZip = document.getElementById("dlZip");
    dlZip.href = url;
    dlZip.download = filename;
    resultMsg.innerHTML = `Your <strong>${filename}</strong> is ready — click to download.`;
    resultArea.hidden = false;
    successCard.hidden = false;
    resultArea.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function showError(msg) {
    errorMsg.textContent = msg;
    resultArea.hidden = false;
    errorCard.hidden = false;
    resultArea.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  document.getElementById("tryAgainBtn").addEventListener("click", () => { hideResults(); hideProgress(); });
  document.getElementById("convertAnother").addEventListener("click", () => {
    hideResults(); hideProgress();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

})();
