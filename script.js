// Reset body visibility when restored from bfcache (browser back/forward)
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    document.body.style.opacity = "";
    document.body.style.transform = "";
    document.body.style.transition = "";
  }
});

const initAll = () => {
  // Injeta o fundo animado de tinta fluida se ainda não existir
  if (!document.querySelector(".ink-bg")) {
    const inkBg = document.createElement("div");
    inkBg.className = "ink-bg visible";
    inkBg.innerHTML = `
      <div class="ink-blob ink-blue"></div>
      <div class="ink-blob ink-yellow"></div>
    `;
    document.body.prepend(inkBg);
  }

  // Reset inline opacity/transform in case a stale navigation left them set
  document.body.style.opacity = "";
  document.body.style.transform = "";
  const yearSpan = document.getElementById("year");
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear().toString();
  }

  const navToggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".header .nav");

  if (navToggle && nav) {
    navToggle.setAttribute("aria-controls", nav.id || "site-nav");
    navToggle.setAttribute("aria-expanded", "false");

    const closeNav = () => {
      nav.classList.remove("nav-open");
      navToggle.setAttribute("aria-expanded", "false");
      document.body.classList.remove("nav-open");
    };

    const openNav = () => {
      nav.classList.add("nav-open");
      navToggle.setAttribute("aria-expanded", "true");
      document.body.classList.add("nav-open");
    };

    navToggle.addEventListener("click", () => {
      if (nav.classList.contains("nav-open")) {
        closeNav();
      } else {
        openNav();
      }
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        closeNav();
      });
    });

    document.addEventListener("click", (event) => {
      if (!nav.classList.contains("nav-open")) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (nav.contains(target) || navToggle.contains(target)) return;
      closeNav();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      closeNav();
    });
  }

  // Efeitos ao rolar (Sombra do header e Parallax de fundo)
  const header = document.querySelector(".header");

  window.addEventListener("scroll", () => {
    const scrolled = window.scrollY;
    
    // 1. Sombra e encolhimento do header
    if (header) {
      header.classList.toggle("scrolled", scrolled > 10);
    }
    
    // 2. Parallax suave nos glows de fundo
    const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const limit = windowHeight;
    const percent = limit > 0 ? (scrolled / limit) * 100 : 0;
    const scrollY1Px = scrolled * 0.18;
    const scrollX1Px = scrolled * 0.08;
    const scrollY2Px = scrolled * 0.18;
    const scrollX2Px = scrolled * 0.08;
    document.documentElement.style.setProperty("--scroll-y1-px", `${scrollY1Px}px`);
    document.documentElement.style.setProperty("--scroll-x1-px", `${scrollX1Px}px`);
    document.documentElement.style.setProperty("--scroll-y2-px", `${scrollY2Px}px`);
    document.documentElement.style.setProperty("--scroll-x2-px", `${scrollX2Px}px`);

  }, { passive: true });

  // Dispara o scroll no carregamento para sincronizar o estado
  window.dispatchEvent(new Event("scroll"));

  // ---- Animações ao rolar (reveal deslizante) ----
  // Standard reveal (slide up)
  const revealSelectors = [
    ".hero-content",
    ".section-heading",
    ".section-inner",
    ".image-card",
  ];

  // Slide from left
  const revealLeftSelectors = [
    ".section-text",
    ".contact-info",
  ];

  // Slide from right
  const revealRightSelectors = [
    ".section-media",
    ".contact-form",
    ".hero-card",
  ];

  // Scale in (cards / grid items)
  const revealScaleSelectors = [
    ".card",
    ".diferencial-item",
    ".gallery-item",
    ".pill",
    ".contact-item",
  ];

  // Apply classes
  document.querySelectorAll(revealSelectors.join(", ")).forEach(el => el.classList.add("reveal"));
  document.querySelectorAll(revealLeftSelectors.join(", ")).forEach(el => el.classList.add("reveal-left"));
  document.querySelectorAll(revealRightSelectors.join(", ")).forEach(el => el.classList.add("reveal-right"));
  document.querySelectorAll(revealScaleSelectors.join(", ")).forEach(el => el.classList.add("reveal-scale"));

  // Staggered delays for grid items
  document.querySelectorAll(".cards-grid .card").forEach((el, i) => {
    el.style.transitionDelay = `${(i % 4) * 0.1}s`;
  });
  document.querySelectorAll(".diferenciais-grid .diferencial-item").forEach((el, i) => {
    el.style.transitionDelay = `${(i % 4) * 0.1}s`;
  });
  document.querySelectorAll(".gallery-grid .gallery-item").forEach((el, i) => {
    el.style.transitionDelay = `${(i % 3) * 0.12}s`;
  });
  document.querySelectorAll(".pill-grid .pill").forEach((el, i) => {
    el.style.transitionDelay = `${(i % 3) * 0.1}s`;
  });

  // All animatable elements
  const allAnimated = document.querySelectorAll(".reveal, .reveal-left, .reveal-right, .reveal-scale");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
        }
      });
    },
    { threshold: 0.01, rootMargin: "0px 0px 80px 0px" }
  );

  allAnimated.forEach((el) => observer.observe(el));

  // Hero entra na tela ao carregar
  const heroContent = document.querySelector(".hero-content");
  if (heroContent) {
    heroContent.classList.add("in-view");
  }



  // ---- Formulário de Orçamento ----
  const formOrcamento = document.getElementById("form-orcamento");
  const formStatus = document.getElementById("form-status");
  const successCard = document.getElementById("orcamento-success-card");
  const successText = document.getElementById("orcamento-success-text");
  const successWhatsApp = document.getElementById("orcamento-success-whatsapp");
  const successClose = document.getElementById("orcamento-success-close");

  function sanitizeInput(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML.trim();
  }

  function isValidPhone(phone) {
    return /^[\d\s\-\+\(\)]{8,20}$/.test(phone);
  }

  function buildWhatsAppUrl(data) {
    const cityState = [data.cidade, data.estado].filter(Boolean).join(" - ") || "não informada";
    const tipoObra = data.tipo_obra || "não informado";
    const metragem = data.metragem || "não informada";
    const mensagem = data.mensagem || "—";
    const text = [
      `Olá! Sou *${data.nome}* e acabei de solicitar um orçamento pelo site da BMI9.`,
      "",
      `*Telefone:* ${data.telefone}`,
      `*Cidade:* ${cityState}`,
      `*Tipo:* ${tipoObra}`,
      `*Metragem:* ${metragem} m²`,
      "",
      `*Mensagem:* ${mensagem}`,
    ].join("\n");

    return `https://wa.me/5511951605371?text=${encodeURIComponent(text)}`;
  }

  function openWhatsAppSafely(url) {
    if (!url) return;

    const popup = window.open(url, "_blank");
    if (popup) {
      try {
        popup.opener = null;
      } catch (_) {
        // noop
      }
      return;
    }

    window.location.href = url;
  }

  function buildPdfFilename(nome) {
    const safe = (nome || "").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    return `Orcamento_${safe || "BMI9"}.pdf`;
  }

  function generateClientPdf(data) {
    const pageWidth = 595;
    const pageHeight = 842;
    const pad = (n) => String(n).padStart(2, "0");
    const dObj = new Date();
    const agora = `${pad(dObj.getDate())}/${pad(dObj.getMonth() + 1)}/${dObj.getFullYear()} ${pad(dObj.getHours())}:${pad(dObj.getMinutes())}:${pad(dObj.getSeconds())}`;
    const referencia = `BMI9-${String(dObj.getFullYear()).slice(-2)}${pad(dObj.getMonth() + 1)}${pad(dObj.getDate())}-${pad(dObj.getHours())}${pad(dObj.getMinutes())}${pad(dObj.getSeconds())}`;
    const margem = 42;
    const largConteudo = pageWidth - margem * 2;
    const largGap = 16;
    const largCard = (largConteudo - largGap) / 2;
    const cidadeEstado = [data.cidade, data.estado].filter(Boolean).join(" - ") || "Não informado";
    const valMetragem = data.metragem ? `${data.metragem} m²` : "Não informada";
    const msgBase = data.mensagem || "Nenhuma mensagem adicional foi informada pelo cliente.";

    const palette = {
      background: [245, 247, 250],
      brand: [9, 39, 66],
      brandSoft: [22, 62, 94],
      accent: [242, 181, 52],
      accentSoft: [252, 240, 214],
      surface: [255, 255, 255],
      stroke: [220, 228, 237],
      title: [10, 31, 53],
      muted: [98, 117, 140],
      text: [33, 48, 70],
    };

    const rowsContato = [
      ["Nome / empresa", data.nome || "Não informado"],
      ["Telefone", data.telefone || "Não informado"],
      ["Cidade / estado", cidadeEstado],
    ];
    const rowsProjeto = [
      ["Tipo de obra", data.tipo_obra || "Não informado"],
      ["Metragem", valMetragem],
      ["Origem", "Solicitação recebida pelo site BMI9"],
    ];

    const escapePdf = (t) => {
      let r = "";
      for (let i = 0; i < (t || "").length; i++) {
        const c = t.charCodeAt(i);
        r += c > 255 ? "?" : t[i];
      }
      return r.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    };

    const colorCmd = (rgb, m) => `${(rgb[0] / 255).toFixed(3)} ${(rgb[1] / 255).toFixed(3)} ${(rgb[2] / 255).toFixed(3)} ${m}`;
    const rectCmd = (x, y, w, h, fill, stroke, lw) => {
      lw = lw || 1;
      const cmds = ["q"];
      if (fill) cmds.push(colorCmd(fill, "rg"));
      if (stroke) { cmds.push(`${lw.toFixed(2)} w`); cmds.push(colorCmd(stroke, "RG")); }
      const op = fill && stroke ? "B" : stroke ? "S" : "f";
      cmds.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re ${op}`);
      cmds.push("Q");
      return cmds.join("\n") + "\n";
    };

    const textCmd = (x, y, txt, sz, rgb, fnt) => [
      "BT",
      `/${fnt} ${sz.toFixed(2)} Tf`,
      colorCmd(rgb, "rg"),
      `${x.toFixed(2)} ${y.toFixed(2)} Td`,
      `(${escapePdf(txt)}) Tj`,
      "ET"
    ].join("\n") + "\n";

    const rectTop = (x, top, w, h, fill, stroke, lw) => rectCmd(x, pageHeight - top - h, w, h, fill, stroke, lw);
    const textTop = (x, baseTop, txt, sz, rgb, fnt) => textCmd(x, pageHeight - baseTop, txt, sz, rgb, fnt);

    const wrapLines = (txt, maxC) => {
      const norm = (txt || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
      if (!norm) return [""];
      const lines = [];
      norm.split("\n").forEach((p) => {
        let buf = "";
        p.trim().split(/\s+/).forEach((w) => {
          if (w.length > maxC) {
            if (buf) { lines.push(buf); buf = ""; }
            for (let i = 0; i < w.length; i += maxC) lines.push(w.slice(i, i + maxC));
            return;
          }
          const cand = buf ? `${buf} ${w}` : w;
          if (cand.length <= maxC) buf = cand;
          else { if (buf) lines.push(buf); buf = w; }
        });
        if (buf) lines.push(buf);
      });
      return lines.length ? lines : [""];
    };

    const prepRows = (rows) => rows.map(([lbl, val]) => [lbl, wrapLines(val || "—", 29)]);
    const cardH = (prep) => {
      let h = 78.0;
      prep.forEach(([, lns]) => { h += 11.0 + (lns.length * 12.5) + 7.5; });
      return Math.max(166.0, h);
    };

    const prepC = prepRows(rowsContato);
    const prepP = prepRows(rowsProjeto);
    const altCards = Math.max(cardH(prepC), cardH(prepP));

    const drawCard = (x, top, w, h, ttl, prep, accent) => {
      let out = "";
      const vOff = Math.max(0, (h - cardH(prep)) / 2);
      out += rectTop(x + 4, top + 4, w, h, [228, 234, 242]);
      out += rectTop(x, top, w, h, [255, 255, 255], [221, 229, 237], 1);
      out += rectTop(x, top, w, 6, accent);
      out += textTop(x + 18, top + 34 + vOff, ttl, 14, [10, 31, 53], "F1");
      out += rectTop(x + 18, top + 46 + vOff, w - 36, 1, [221, 229, 237]);
      let cTop = top + 67 + vOff;
      prep.forEach(([lbl, lns]) => {
        out += textTop(x + 18, cTop, lbl.toUpperCase(), 7.6, [98, 117, 140], "F1");
        cTop += 11;
        lns.forEach((ln) => {
          out += textTop(x + 18, cTop, ln, 11.3, [33, 48, 70], "F2");
          cTop += 12.5;
        });
        cTop += 7.5;
      });
      return out;
    };

    const topoCards = 308;
    const topoMsg = topoCards + altCards + 30;
    const topoFooter = 742;
    const altFooter = 58;
    const altMsg = Math.max(168, topoFooter - topoMsg - 20);
    const lnsMsg = wrapLines(msgBase, 72).slice(0, 8);

    let c = "";
    c += rectCmd(0, 0, pageWidth, pageHeight, palette.background);
    c += rectTop(0, 0, pageWidth, 212, palette.brand);
    c += rectTop(0, 158, pageWidth, 54, palette.brandSoft);
    c += rectTop(388, 44, 166, 92, palette.brandSoft, [47, 93, 131], 1);

    const fLarg = (largConteudo - 24) / 3;
    c += rectTop(margem, 176, fLarg, 16, [18, 53, 82]);
    c += rectTop(margem + fLarg + 12, 176, fLarg, 16, [18, 53, 82]);
    c += rectTop(margem + fLarg * 2 + 24, 176, fLarg, 16, [18, 53, 82]);

    c += rectTop(margem, 38, 70, 22, palette.accent);
    c += textTop(margem + 11, 54, "BMI9", 16, [0, 0, 0], "F1");
    c += textTop(margem, 73, "CONSTRUCAO E REFORMAS", 7, [201, 213, 225], "F1");

    c += textTop(margem, 122, "Solicitacao de Orcamento", 24, [255, 255, 255], "F1");
    c += textTop(margem, 150, "Documento executivo com os dados enviados pelo cliente.", 11.2, [214, 222, 231], "F2");
    c += textTop(margem + 8, 188, "Triagem inicial", 8.2, [218, 229, 239], "F2");
    c += textTop(margem + fLarg + 20, 188, "Contato comercial", 8.2, [218, 229, 239], "F2");
    c += textTop(margem + fLarg * 2 + 32, 188, "Proposta tecnica", 8.2, [218, 229, 239], "F2");

    c += textTop(406, 68, "GERADO EM", 8.5, palette.accent, "F1");
    c += textTop(406, 92, agora, 12, [255, 255, 255], "F2");
    c += textTop(406, 116, "REFERENCIA", 8.2, palette.accent, "F1");
    c += textTop(406, 134, referencia, 10.2, [228, 236, 244], "F2");

    c += textTop(margem, 248, "Resumo do cliente", 18, palette.title, "F1");
    c += textTop(margem, 272, "Os dados foram organizados em blocos para facilitar a triagem comercial.", 10.6, palette.muted, "F2");

    c += drawCard(margem, topoCards, largCard, altCards, "Contato", prepC, palette.accent);
    c += drawCard(margem + largCard + largGap, topoCards, largCard, altCards, "Projeto", prepP, [56, 132, 255]);

    c += rectTop(margem + 4, topoMsg + 4, largConteudo, altMsg, [228, 234, 242]);
    c += rectTop(margem, topoMsg, largConteudo, altMsg, palette.surface, palette.stroke, 1);
    c += rectTop(margem, topoMsg, largConteudo, 58, palette.accentSoft);
    c += textTop(margem + 18, topoMsg + 36, "Escopo e observacoes do cliente", 13.5, palette.title, "F1");
    c += textTop(margem + 18, topoMsg + 56, "Mensagem enviada no formulario de orcamento.", 10, palette.muted, "F2");

    let mY = pageHeight - (topoMsg + 92);
    lnsMsg.forEach((ln) => {
      c += textCmd(margem + 18, mY, ln, 11.1, palette.text, "F2");
      mY -= 15;
    });

    c += rectTop(margem, topoFooter, largConteudo, altFooter, palette.brand);
    c += textTop(margem + 18, topoFooter + 24, "Proximos passos: analise tecnica, contato comercial e proposta detalhada.", 9.6, [255, 255, 255], "F2");
    c += textTop(margem + 18, topoFooter + 44, "Documento gerado automaticamente para atendimento comercial da BMI9.", 8.8, [201, 213, 225], "F2");

    const objs = [
      "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
      "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
      "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >> endobj",
      "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >> endobj",
      "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >> endobj",
      `6 0 obj << /Length ${c.length} >> stream\n${c}\nendstream\nendobj`
    ];

    const parts = ["%PDF-1.4\n"];
    const offsets = [0];
    let cur = parts[0].length;
    objs.forEach((o) => {
      offsets.push(cur);
      const str = o + "\n";
      parts.push(str);
      cur += str.length;
    });

    const xref = [`xref\n0 ${objs.length + 1}\n`, "0000000000 65535 f \n"];
    for (let i = 1; i <= objs.length; i++) {
      xref.push(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
    }
    xref.push(`trailer << /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${cur}\n%%EOF`);
    parts.push(xref.join(""));

    const rawPdf = parts.join("");
    return btoa(rawPdf);
  }

  function downloadPdf(base64Content, filename) {
    if (!base64Content) return;

    const binary = atob(base64Content);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: "application/pdf" });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename || "Orcamento_BMI9.pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 1000);
  }

  function createRecoverableError(message) {
    const error = new Error(message);
    error.recoverable = true;
    return error;
  }

  function hideSuccessCard() {
    if (!successCard) return;
    successCard.hidden = true;
    successCard.setAttribute("hidden", "hidden");
  }

  function showSuccessCard(message, whatsappUrl) {
    if (!successCard) return;
    if (successText) {
      successText.textContent = message;
    }
    if (successWhatsApp && whatsappUrl) {
      successWhatsApp.href = whatsappUrl;
      successWhatsApp.target = "_blank";
      successWhatsApp.rel = "noopener";
    }
    successCard.hidden = false;
    successCard.removeAttribute("hidden");
    successCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  if (successClose) {
    successClose.addEventListener("click", () => {
      hideSuccessCard();
    });
  }

  async function readResponsePayload(response) {
    const text = await response.text();
    if (!text) {
      return { result: null, rawText: "" };
    }

    const tryParse = (value) => {
      try {
        return JSON.parse(value);
      } catch (_) {
        return null;
      }
    };

    const directJson = tryParse(text);
    if (directJson) {
      return { result: directJson, rawText: text };
    }

    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end > start) {
      const extractedJson = tryParse(text.slice(start, end + 1));
      if (extractedJson) {
        return { result: extractedJson, rawText: text };
      }
    }

    return { result: null, rawText: text };
  }

  function isLocalDev() {
    return (
      location.hostname === "localhost" ||
      location.hostname === "127.0.0.1" ||
      location.protocol === "file:"
    );
  }

  function uniqueValues(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function isLoopbackHost(hostname = location.hostname) {
    return hostname === "localhost" || hostname === "127.0.0.1";
  }

  function getConfiguredApiCandidates() {
    const metaApi = document
      .querySelector('meta[name="bmi9-api-orcamento"]')
      ?.getAttribute("content");
    const bodyApi = document.body?.dataset?.orcamentoApi;
    const windowApi = typeof window.BMI9_API_URL === "string"
      ? window.BMI9_API_URL
      : "";

    return uniqueValues([
      metaApi?.trim(),
      bodyApi?.trim(),
      windowApi.trim(),
    ]);
  }

  function getLocalFlaskCandidates() {
    return [
      "http://127.0.0.1:5000/api/orcamento",
      "http://localhost:5000/api/orcamento",
    ];
  }

  function getApiCandidates() {
    const configuredCandidates = getConfiguredApiCandidates();
    const localFlaskCandidates = getLocalFlaskCandidates();
    const sameOriginCandidates = ["/api/orcamento", "/contato.php", "contato.php"];
    const isLocalServer = isLoopbackHost() && location.port === "5000";
    const isPhpPage = location.pathname.toLowerCase().endsWith(".php");

    if (location.protocol === "file:") {
      return uniqueValues([
        ...configuredCandidates,
        ...localFlaskCandidates,
      ]);
    }

    if (isLocalServer) {
      return uniqueValues([
        ...configuredCandidates,
        "/api/orcamento",
        "/contato.php",
      ]);
    }

    if (isLoopbackHost()) {
      return uniqueValues([
        ...configuredCandidates,
        ...(isPhpPage ? sameOriginCandidates : localFlaskCandidates),
        ...(isPhpPage ? localFlaskCandidates : sameOriginCandidates),
      ]);
    }

    return uniqueValues([
      ...configuredCandidates,
      "/api/orcamento",
      "/contato.php",
      "contato.php",
    ]);
  }

  function getLocalBackendHelp() {
    if (!isLocalDev()) {
      return "";
    }

    if (location.protocol === "file:") {
      return " Execute o arquivo run.bat ou run.ps1 para iniciar o servidor Flask local na porta 5000.";
    }

    if (isLoopbackHost() && location.port !== "5000") {
      return " Se este preview estiver rodando em um servidor estático local, execute run.bat ou run.ps1 para subir a API Flask na porta 5000.";
    }

    return " Verifique se a API Flask local está ativa na porta 5000.";
  }

  async function submitOrcamento(data) {
    const endpoints = getApiCandidates().map((url) => ({
      url,
      options: {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify(data),
      },
    }));

    let lastError = createRecoverableError("Erro ao processar a solicitação.");

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint.url, endpoint.options);
        const { result, rawText } = await readResponsePayload(response);

        if (response.ok && result && result.ok) {
          return result;
        }

        const isRecoverableResponse =
          response.status === 404 ||
          response.status === 405 ||
          response.status === 429 ||
          response.status >= 500 ||
          !result;

        lastError = isRecoverableResponse
          ? createRecoverableError(
              result?.error ||
              rawText.trim() ||
              `Servidor indisponível (${response.status}).`
            )
          : new Error(
              result?.error ||
              result?.message ||
              rawText.trim() ||
              "Erro ao processar a solicitação."
            );

        const shouldTryFallback =
          endpoint !== endpoints[endpoints.length - 1] &&
          isRecoverableResponse;

        if (!shouldTryFallback) {
          throw lastError;
        }
      } catch (error) {
        const isNetworkError = error instanceof TypeError;
        lastError = isNetworkError
          ? createRecoverableError(
              isLocalDev()
                ? `Não foi possível conectar ao servidor de orçamento (${endpoint.url}).`
                : "Não foi possível conectar ao servidor de orçamento."
            )
          : error instanceof Error
            ? error
            : createRecoverableError("Erro ao processar a solicitação.");

        const isLastEndpoint = endpoint === endpoints[endpoints.length - 1];
        const isRecoverableError = isNetworkError || lastError.recoverable === true;
        const shouldRethrow = isLastEndpoint || !isRecoverableError;

        if (shouldRethrow) {
          throw lastError;
        }
      }
    }

    throw lastError;
  }

  if (formOrcamento) {
    /* ── Phone Mask (UX Improve) ── */
    const phoneInput = document.getElementById("telefone");
    if (phoneInput) {
      phoneInput.addEventListener("input", function (e) {
        let val = e.target.value.replace(/\D/g, "");
        if (val.length > 11) val = val.slice(0, 11);
        if (val.length > 2) val = val.replace(/^(\d{2})(\d)/g, "($1) $2");
        if (val.length > 9) val = val.replace(/(\d{5})(\d)/, "$1-$2");
        else if (val.length > 8) val = val.replace(/(\d{4})(\d)/, "$1-$2");
        e.target.value = val;
      });
    }

    /* ── Overlay controller (novo) ── */
    const ov        = document.getElementById("form-overlay");
    const ovTitle   = document.getElementById("ov-title");
    const ovSub     = document.getElementById("ov-subtitle");
    const ovFill    = document.getElementById("ov-progress-fill");
    const ovBar     = document.getElementById("ov-progress-bar");
    const ovSteps   = ov ? ov.querySelectorAll(".ov-step") : [];

    const MIN_SHOW_MS = 2200;
    let ovStartTime  = 0;
    let hideTimer    = null;

    function setProgress(pct) {
      const v = Math.max(0, Math.min(100, Math.round(pct)));
      if (ovFill) ovFill.style.width = v + "%";
      if (ovBar)  ovBar.setAttribute("aria-valuenow", String(v));
    }

    function setStep(active) {
      // active = 1, 2, 3 (or 0 = none)
      ovSteps.forEach((el) => {
        const n = parseInt(el.dataset.step, 10);
        el.classList.toggle("step-done",   n < active);
        el.classList.toggle("step-active", n === active);
      });
    }

    function allStepsDone() {
      ovSteps.forEach((el) => {
        el.classList.remove("step-active");
        el.classList.add("step-done");
      });
    }

    function showOv() {
      if (!ov) return;
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }

      // Reset state
      setProgress(0);
      setStep(1);
      if (ovTitle) ovTitle.textContent = "Enviando solicitação";
      if (ovSub)   ovSub.textContent   = "Aguarde um momento...";
      ov.classList.remove("ov-done", "ov-hiding");
      ov.hidden = false;

      // Force reflow then show
      void ov.offsetWidth;
      ov.classList.add("ov-visible");
      ovStartTime = Date.now();
    }

    function hideOv() {
      if (!ov) return;
      if (hideTimer) clearTimeout(hideTimer);
      ov.classList.remove("ov-visible");
      ov.classList.add("ov-hiding");
      hideTimer = setTimeout(() => {
        ov.classList.remove("ov-hiding", "ov-done");
        ov.hidden = true;
      }, 380);
    }

    function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

    async function waitMin() {
      const rem = MIN_SHOW_MS - (Date.now() - ovStartTime);
      if (rem > 0) await delay(rem);
    }

    async function showDoneAndHide(waitMs) {
      if (!ov) return;
      allStepsDone();
      setProgress(100);
      ov.classList.add("ov-done");
      if (ovTitle) ovTitle.textContent = "Concluído!";
      if (ovSub)   ovSub.textContent   = "Orçamento enviado com sucesso.";
      await waitMin();
      await delay(waitMs || 1200);
      hideOv();
    }

    async function showErrorAndHide() {
      if (!ov) return;
      await waitMin();
      await delay(800);
      hideOv();
    }

    /* ── Animação de progresso enquanto aguarda ── */
    async function runProgressAnimation(serverPromise) {
      // Stage 1
      await delay(300);
      setStep(1);
      setProgress(20);
      await delay(500);

      // Stage 2
      setStep(2);
      setProgress(50);
      await delay(700);

      // Stage 3
      setStep(3);
      setProgress(82);

      // Aguarda o servidor resolver
      await serverPromise;
      setProgress(95);
    }

    /* ── Submit ── */
    formOrcamento.addEventListener("submit", async (e) => {
      e.preventDefault();
      console.log("[Submitting] Form submission started"); // Guarantee we hit this
      const formData = new FormData(formOrcamento);
      const data = Object.fromEntries(formData.entries());
      const submitBtn = formOrcamento.querySelector('button[type="submit"]');
      hideSuccessCard();

      // Limpar erros prévios
      formOrcamento.querySelectorAll(".input-error").forEach(el => el.classList.remove("input-error"));

      // Honeypot
      if (data.website) {
        formStatus.textContent = "Solicitação enviada com sucesso!";
        formStatus.className = "form-status success";
        return;
      }

      // Validação básica
      const inputNome = document.getElementById("nome");
      const inputPhone = document.getElementById("telefone");
      const nome     = sanitizeInput(data.nome || "");
      const telefone = sanitizeInput(data.telefone || "");
      
      let hasError = false;
      if (!nome || nome.length < 2) {
        if(inputNome) inputNome.classList.add("input-error");
        formStatus.textContent = "Por favor, informe seu nome completo.";
        formStatus.className = "form-status error";
        hasError = true;
      }
      if (!telefone || !isValidPhone(telefone)) {
        if(inputPhone) inputPhone.classList.add("input-error");
        if(!hasError) {
          formStatus.textContent = "Por favor, informe um telefone válido.";
          formStatus.className = "form-status error";
        }
        hasError = true;
      }
      
      if (hasError) return;

      // Desabilitar botão e mostrar overlay
      submitBtn.disabled = true;
      submitBtn.textContent = "Enviando...";
      formStatus.textContent = "";
      showOv();

      try {
        // Dispara o request; captura erros internamente
        const serverPromise = submitOrcamento(data).catch(err => ({ __error: err }));

        // Roda animação E servidor em paralelo — espera AMBOS terminarem
        const animPromise = runProgressAnimation(serverPromise);

        const [result] = await Promise.all([
          Promise.race([
            serverPromise,
            delay(60000).then(() => ({
              __error: createRecoverableError("Tempo de resposta excedido. Tente novamente."),
            })),
          ]),
          animPromise.catch(() => {}),
        ]);

        if (result && result.__error) {
          const error = result.__error;
          const isRecoverable = error instanceof Error && error.recoverable === true;

          if (isRecoverable) {
            console.warn("Backend offline ou inacessível. Ativando finalização local de contingência:", error.message);

            // 1. Salvar backup localmente para não perder o lead
            try {
              const offlineLeads = JSON.parse(localStorage.getItem("bmi9_offline_leads") || "[]");
              offlineLeads.push({
                data: new Date().toLocaleString("pt-BR"),
                ...data
              });
              localStorage.setItem("bmi9_offline_leads", JSON.stringify(offlineLeads));
            } catch (_) {}

            // 2. Gerar PDF diretamente no navegador
            let clientPdfB64 = "";
            try {
              clientPdfB64 = generateClientPdf(data);
              downloadPdf(clientPdfB64, buildPdfFilename(data.nome));
            } catch (pdfErr) {
              console.warn("Falha na geração do PDF no cliente:", pdfErr);
            }

            const waUrl = buildWhatsAppUrl(data);
            await showDoneAndHide(1000);

            const hasPdf = Boolean(clientPdfB64);
            formStatus.innerHTML = hasPdf
              ? "✅ Solicitação concluída com sucesso! Seu PDF foi gerado e baixado."
              : "✅ Solicitação concluída! Clique no botão abaixo para continuar no WhatsApp.";
            formStatus.className = "form-status success";

            showSuccessCard(
              hasPdf
                ? "Tudo pronto! Seu orçamento foi gerado e o arquivo PDF já foi baixado. Clique no botão abaixo para falar com nosso atendimento no WhatsApp:"
                : "Tudo pronto! Clique no botão abaixo para falar diretamente com nosso atendimento no WhatsApp:",
              waUrl
            );

            formOrcamento.reset();
            setTimeout(() => openWhatsAppSafely(waUrl), 3500);
            return;
          } else {
            await showErrorAndHide();
            formStatus.textContent = error.message || "Ocorreu um erro. Tente novamente ou chame no WhatsApp.";
            formStatus.className = "form-status error";
            return;
          }
        }

        // Sucesso
        const res = result && typeof result === "object" ? result : {};
        const waUrl = typeof res.whatsapp_url === "string" && res.whatsapp_url.trim()
          ? res.whatsapp_url : buildWhatsAppUrl(data);
        const pdfB64 = typeof res.pdf_base64 === "string" ? res.pdf_base64 : "";

        if (res.warning) console.warn("Aviso do backend:", res.warning);
        if (pdfB64) {
          try { downloadPdf(pdfB64, res.pdf_filename); } catch (pdfErr) {
            console.warn("Falha ao baixar PDF:", pdfErr);
          }
        }

        await showDoneAndHide(1000);

        const hasPdf = Boolean(pdfB64);
        const warn = res.warning && isLocalDev() ? `<br><small>Aviso: ${res.warning}</small>` : "";
        formStatus.innerHTML = (hasPdf
          ? "✅ Solicitação enviada! O PDF está sendo baixado e você será redirecionado ao WhatsApp."
          : "✅ Solicitação enviada! Você será redirecionado ao WhatsApp.") + warn;
        formStatus.className = "form-status success";
        showSuccessCard(
          hasPdf
            ? "Tudo certo. O PDF está baixando e o atendimento continua no WhatsApp."
            : "Tudo certo. O atendimento continua no WhatsApp.",
          waUrl
        );
        formOrcamento.reset();
        setTimeout(() => openWhatsAppSafely(waUrl), 5000);

      } catch (error) {
        console.error("Erro inesperado ao enviar orçamento:", error);
        try { await showErrorAndHide(); } catch (_) { hideOv(); }
        formStatus.textContent = error.message || "Ocorreu um erro. Tente novamente ou chame no WhatsApp.";
        formStatus.className = "form-status error";
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Enviar solicitação";
      }
    });
  }

  // ---- Carousel Sliders for Project Pages ----
  const carousels = document.querySelectorAll(".carousel-container");
  
  if (carousels.length > 0) {
    // Dynamically inject Lightbox modal container
    const lightboxModal = document.createElement("div");
    lightboxModal.id = "lightbox-modal";
    lightboxModal.className = "lightbox-modal";
    lightboxModal.innerHTML = `
      <button class="lightbox-close" aria-label="Fechar visualização">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
      <button class="lightbox-btn lightbox-prev" aria-label="Imagem anterior">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="15 18 9 12 15 6"></polyline></svg>
      </button>
      <div class="lightbox-wrapper">
        <img class="lightbox-img" src="" alt="" />
        <div class="lightbox-caption"></div>
      </div>
      <button class="lightbox-btn lightbox-next" aria-label="Próxima imagem">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="9 18 15 12 9 6"></polyline></svg>
      </button>
    `;
    document.body.appendChild(lightboxModal);

    const lightboxImg = lightboxModal.querySelector(".lightbox-img");
    const lightboxCaption = lightboxModal.querySelector(".lightbox-caption");
    const lightboxPrev = lightboxModal.querySelector(".lightbox-prev");
    const lightboxNext = lightboxModal.querySelector(".lightbox-next");
    const lightboxClose = lightboxModal.querySelector(".lightbox-close");
    
    let activeCarouselSlides = [];
    let activeLightboxIndex = 0;

    const openLightbox = (slides, index) => {
      activeCarouselSlides = slides;
      activeLightboxIndex = index;
      updateLightboxContent();
      lightboxModal.classList.add("active");
      document.body.style.overflow = "hidden"; // Disable background scrolling
    };

    const closeLightbox = () => {
      lightboxModal.classList.remove("active");
      document.body.style.overflow = "";
    };

    const updateLightboxContent = () => {
      const slide = activeCarouselSlides[activeLightboxIndex];
      const img = slide.querySelector("img");
      if (!img) return;

      lightboxImg.src = img.src;
      
      const isEn = (document.documentElement.lang || "").startsWith("en");
      const altText = isEn ? (img.getAttribute("data-alt-en") || img.getAttribute("alt")) : img.getAttribute("alt");
      lightboxCaption.textContent = altText || "";
    };

    lightboxClose.addEventListener("click", closeLightbox);
    lightboxModal.addEventListener("click", (e) => {
      if (e.target === lightboxModal) closeLightbox();
    });

    lightboxPrev.addEventListener("click", (e) => {
      e.stopPropagation();
      activeLightboxIndex = (activeLightboxIndex - 1 + activeCarouselSlides.length) % activeCarouselSlides.length;
      updateLightboxContent();
    });

    lightboxNext.addEventListener("click", (e) => {
      e.stopPropagation();
      activeLightboxIndex = (activeLightboxIndex + 1) % activeCarouselSlides.length;
      updateLightboxContent();
    });

    document.addEventListener("keydown", (e) => {
      if (!lightboxModal.classList.contains("active")) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") lightboxPrev.click();
      if (e.key === "ArrowRight") lightboxNext.click();
    });

    // Touch swipe support for lightbox
    let lightboxTouchStartX = 0;
    let lightboxTouchEndX = 0;

    lightboxModal.addEventListener("touchstart", (e) => {
      lightboxTouchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    lightboxModal.addEventListener("touchend", (e) => {
      lightboxTouchEndX = e.changedTouches[0].screenX;
      handleLightboxSwipe();
    }, { passive: true });

    const handleLightboxSwipe = () => {
      const diff = lightboxTouchEndX - lightboxTouchStartX;
      if (Math.abs(diff) > 40) {
        if (diff > 0) {
          lightboxPrev.click();
        } else {
          lightboxNext.click();
        }
      }
    };

    carousels.forEach((container) => {
      const track = container.querySelector(".carousel-track");
      if (!track) return;
      const slides = Array.from(track.children);
      const nextBtn = container.querySelector(".carousel-next");
      const prevBtn = container.querySelector(".carousel-prev");
      const dotsContainer = container.querySelector(".carousel-dots");
      const dots = dotsContainer ? Array.from(dotsContainer.children) : [];

      // Inject clean SVG icons into arrows
      if (nextBtn) {
        nextBtn.innerHTML = `<svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
      }
      if (prevBtn) {
        prevBtn.innerHTML = `<svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg>`;
      }

      // Create floating caption box
      const captionBox = document.createElement("div");
      captionBox.className = "carousel-caption-box";
      container.appendChild(captionBox);

      let currentIndex = 0;

      const updateCaption = () => {
        const activeImg = slides[currentIndex].querySelector("img");
        if (activeImg) {
          const isEn = (document.documentElement.lang || "").startsWith("en");
          const altText = isEn ? (activeImg.getAttribute("data-alt-en") || activeImg.getAttribute("alt")) : activeImg.getAttribute("alt");
          
          captionBox.style.opacity = "0";
          captionBox.style.transform = "translateY(8px)";
          setTimeout(() => {
            captionBox.textContent = altText || "";
            captionBox.style.opacity = "1";
            captionBox.style.transform = "translateY(0)";
          }, 150);
        }
      };

      const updateSlide = (index) => {
        if (index < 0) index = slides.length - 1;
        if (index >= slides.length) index = 0;
        currentIndex = index;

        track.style.transform = `translateX(-${currentIndex * 100}%)`;

        // Update dots active class
        dots.forEach((dot, idx) => {
          dot.classList.toggle("active", idx === currentIndex);
        });

        // Update dynamic caption
        updateCaption();
      };

      // Listen to dynamic language changes to refresh captions
      document.addEventListener("languageChanged", () => {
        updateCaption();
        if (lightboxModal.classList.contains("active")) {
          updateLightboxContent();
        }
      });

      // Initial caption set
      updateSlide(0);

      // Event listener for opening lightbox on image click with double-click/tap detection
      let clickTimeout = null;
      slides.forEach((slide, idx) => {
        slide.addEventListener("click", (e) => {
          if (clickTimeout) {
            clearTimeout(clickTimeout);
            clickTimeout = null;
            handleLikeAction(true);
          } else {
            clickTimeout = setTimeout(() => {
              clickTimeout = null;
              openLightbox(slides, idx);
            }, 250);
          }
        });
      });

      if (nextBtn) {
        nextBtn.addEventListener("click", () => {
          updateSlide(currentIndex + 1);
        });
      }

      if (prevBtn) {
        prevBtn.addEventListener("click", () => {
          updateSlide(currentIndex - 1);
        });
      }

      dots.forEach((dot, idx) => {
        dot.addEventListener("click", () => {
          updateSlide(idx);
        });
      });

      // Auto-play timer
      let autoPlay = setInterval(() => {
        updateSlide(currentIndex + 1);
      }, 5000);

      const resetAutoPlay = () => {
        clearInterval(autoPlay);
        autoPlay = setInterval(() => {
          updateSlide(currentIndex + 1);
        }, 5000);
      };

      if (nextBtn) nextBtn.addEventListener("click", resetAutoPlay);
      if (prevBtn) prevBtn.addEventListener("click", resetAutoPlay);
      dots.forEach(dot => dot.addEventListener("click", resetAutoPlay));

      // Touch swipe support for main carousel
      let touchStartX = 0;
      let touchEndX = 0;

      container.addEventListener("touchstart", (e) => {
        touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });

      container.addEventListener("touchend", (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
      }, { passive: true });

      const handleSwipe = () => {
        const diff = touchEndX - touchStartX;
        if (Math.abs(diff) > 40) {
          if (diff > 0) {
            updateSlide(currentIndex - 1);
          } else {
            updateSlide(currentIndex + 1);
          }
          resetAutoPlay();
        }
      };

      // ---- Like System (Instagram/TikTok style) ----
      const projectId = container.getAttribute("data-project-id") || "unknown";
      const heartPop = container.querySelector(".carousel-heart-pop");
      const likeBtn = container.querySelector("[data-like-btn]");
      const likeCountText = container.querySelector("[data-like-count]");

      const BASE_LIKES = {
        "obra-honda": 247,
        "obra-galpao": 189,
        "obra-industria": 156,
        "obra-comercial": 112
      };

      let likesCount = BASE_LIKES[projectId] || 100;
      let isLiked = localStorage.getItem(`liked_${projectId}`) === "true";

      const updateLikeUI = () => {
        if (likeCountText) {
          likeCountText.textContent = String(likesCount);
        }
        if (likeBtn) {
          likeBtn.classList.toggle("liked", isLiked);
        }
      };

      const triggerHeartPop = () => {
        if (heartPop) {
          heartPop.classList.remove("pop");
          void heartPop.offsetWidth; // Force reflow
          heartPop.classList.add("pop");
          setTimeout(() => {
            heartPop.classList.remove("pop");
          }, 700);
        }
      };

      const loadLikesFromBackend = () => {
        fetch(`/api/likes?project_id=${projectId}`)
          .then(res => {
            if (!res.ok) throw new Error("HTTP error " + res.status);
            return res.json();
          })
          .then(data => {
            if (data.ok && typeof data.likes === "number") {
              likesCount = data.likes;
              updateLikeUI();
            }
          })
          .catch(err => {
            console.warn("[LIKES] Fallback to local count due to API error:", err);
          });
      };

      const sendLikeToBackend = (likedState) => {
        fetch('/api/likes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            project_id: projectId,
            liked: likedState
          })
        })
        .then(res => {
          if (!res.ok) throw new Error("HTTP error " + res.status);
          return res.json();
        })
        .then(data => {
          if (data.ok && typeof data.likes === "number") {
            likesCount = data.likes;
            updateLikeUI();
          }
        })
        .catch(err => {
          console.warn("[LIKES] Failed to sync like state to backend:", err);
        });
      };

      const handleLikeAction = (forceLike = false) => {
        if (forceLike) {
          if (!isLiked) {
            isLiked = true;
            localStorage.setItem(`liked_${projectId}`, "true");
            likesCount += 1;
            updateLikeUI();
            triggerHeartPop();
            sendLikeToBackend(true);
          } else {
            triggerHeartPop();
          }
        } else {
          isLiked = !isLiked;
          localStorage.setItem(`liked_${projectId}`, String(isLiked));
          likesCount += isLiked ? 1 : -1;
          updateLikeUI();
          if (isLiked) {
            triggerHeartPop();
          }
          sendLikeToBackend(isLiked);
        }
      };

      if (likeBtn) {
        likeBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          handleLikeAction(false);
        });
      }

      // Initialize UI state and load counts from backend
      updateLikeUI();
      loadLikesFromBackend();
    });
  }

  // ---- Comments System ----
  const commentsList = document.querySelector("[data-comments-list]");
  const commentForm = document.querySelector("[data-comment-form]");
  const activeCarousel = document.querySelector(".carousel-container");

  if (commentsList && commentForm && activeCarousel) {
    const projectId = activeCarousel.getAttribute("data-project-id") || "unknown";
    const nameInput = commentForm.querySelector("[data-comment-name]");
    const textInput = commentForm.querySelector("[data-comment-text]");
    const starsContainer = commentForm.querySelector("[data-stars-select]");
    let currentRating = 5;

    // Star Selection Interaction
    if (starsContainer) {
      const stars = Array.from(starsContainer.children);
      stars.forEach((star) => {
        star.addEventListener("click", () => {
          const val = parseInt(star.getAttribute("data-value") || "5");
          currentRating = val;
          stars.forEach((s) => {
            const sVal = parseInt(s.getAttribute("data-value") || "0");
            s.classList.toggle("active", sVal <= val);
          });
        });
      });
    }

    // Default mock comments for each project
    const DEFAULT_COMMENTS = {
      "obra-honda": [
        { author: "Carlos Silva (Gerente)", rating: 5, text: "O piso epóxi ficou impecável. A sinalização de segurança ajudou a organizar muito a área de trabalho.", date: "28/05/2026" },
        { author: "Roberto Souza", rating: 5, text: "Excelente acabamento e pontualidade na entrega.", date: "29/05/2026" }
      ],
      "obra-galpao": [
        { author: "Amanda Rocha (Diretora)", rating: 5, text: "As cores do piso monolítico ficaram lindas e a limpeza é extremamente simples. As crianças adoraram!", date: "20/05/2026" },
        { author: "Patrícia Lima", rating: 5, text: "Excelente acabamento, muito seguro e confortável para os brinquedos.", date: "24/05/2026" }
      ],
      "obra-industria": [
        { author: "Marcos Oliveira (Supervisor)", rating: 5, text: "Resistência excelente para tráfego de empilhadeiras. Recomendo fortemente a BMI9.", date: "15/05/2026" },
        { author: "Julio Cezar", rating: 5, text: "Equipe muito profissional e atenciosa do início ao fim.", date: "19/05/2026" }
      ],
      "obra-comercial": [
        { author: "Tatiane Mendes (Arquiteta)", rating: 5, text: "O efeito mármore metálico deu um aspecto luxuoso incrível para a sala. Trabalho artístico de primeira!", date: "10/05/2026" },
        { author: "Felipe Neto", rating: 5, text: "Piso extremamente brilhante e moderno. Excelente!", date: "14/05/2026" }
      ]
    };

    // Load comments from API with LocalStorage fallback
    const storageKey = `comments_${projectId}`;
    let comments = [];

    const saveCommentLocallyFallback = (newComment) => {
      comments.push(newComment);
      try {
        localStorage.setItem(storageKey, JSON.stringify(comments));
      } catch (e) {}
      renderComments();
    };

    const loadCommentsFromBackend = () => {
      fetch(`/api/comments?project_id=${projectId}`)
        .then(res => {
          if (!res.ok) throw new Error("HTTP error " + res.status);
          return res.json();
        })
        .then(data => {
          comments = data;
          renderComments();
        })
        .catch(err => {
          console.warn("[COMMENTS] Fallback to localStorage due to api error:", err);
          try {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
              comments = JSON.parse(stored);
            } else {
              comments = DEFAULT_COMMENTS[projectId] || [];
            }
          } catch (e) {
            comments = DEFAULT_COMMENTS[projectId] || [];
          }
          renderComments();
        });
    };

    // Render comments function
    const renderComments = () => {
      commentsList.innerHTML = "";
      if (comments.length === 0) {
        commentsList.innerHTML = `<p style="color: rgba(255,255,255,0.4); font-style: italic; font-size: 0.95rem;">Nenhum comentário ainda. Seja o primeiro a comentar!</p>`;
        return;
      }

      comments.forEach((c) => {
        const card = document.createElement("div");
        card.className = "comment-card";
        
        const initials = c.author.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
        const starsHtml = "&#9733;".repeat(c.rating) + "&#9734;".repeat(5 - c.rating);

        card.innerHTML = `
          <div class="comment-avatar">${initials}</div>
          <div class="comment-content">
            <div class="comment-header">
              <span class="comment-author">${c.author}</span>
              <span class="comment-stars">${starsHtml}</span>
            </div>
            <p class="comment-text-body">${c.text}</p>
            <div class="comment-date">${c.date}</div>
          </div>
        `;
        commentsList.appendChild(card);
      });
    };

    // Handle submit
    commentForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const authorVal = nameInput.value.trim();
      const textVal = textInput.value.trim();

      if (authorVal && textVal) {
        const newComment = {
          author: authorVal,
          rating: currentRating,
          text: textVal
        };

        // Try to save to backend API
        fetch('/api/comments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            project_id: projectId,
            author: authorVal,
            text: textVal,
            rating: currentRating
          })
        })
        .then(res => {
          if (!res.ok) throw new Error("API error");
          return res.json();
        })
        .then(data => {
          if (data.ok) {
            comments.push(data.comment);
            renderComments();
          } else {
            saveCommentLocallyFallback({
              ...newComment,
              date: new Date().toLocaleDateString('pt-BR')
            });
          }
        })
        .catch(() => {
          saveCommentLocallyFallback({
            ...newComment,
            date: new Date().toLocaleDateString('pt-BR')
          });
        });

        // Reset Form
        nameInput.value = "";
        textInput.value = "";
        currentRating = 5;
        if (starsContainer) {
          const stars = Array.from(starsContainer.children);
          stars.forEach((s) => s.classList.add("active"));
        }
      }
    });

    // Initial render
    loadCommentsFromBackend();
  }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAll);
} else {
  initAll();
}

// Proteção global para evitar download/cópia de fotos e logo
document.addEventListener("contextmenu", (e) => {
  if (e.target.tagName === "IMG") {
    e.preventDefault();
  }
}, { passive: false });

document.addEventListener("dragstart", (e) => {
  if (e.target.tagName === "IMG") {
    e.preventDefault();
  }
}, { passive: false });

// Otimização da logo de São Paulo para contraste no fundo escuro mantendo cores originais
document.addEventListener("DOMContentLoaded", () => {
  const fixSpLogo = () => {
    const spLogos = document.querySelectorAll('img[src*="logo_sp.png"]');
    spLogos.forEach(img => {
      if (img.dataset.processed) return;
      
      const processImage = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          ctx.drawImage(img, 0, 0);
          
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;
          const width = canvas.width;
          const height = canvas.height;
          const visited = new Uint8Array(width * height);
          const queue = [];
          
          // Adiciona todas as bordas na fila de início
          for (let x = 0; x < width; x++) {
            queue.push(x, 0);
            queue.push(x, height - 1);
            visited[x] = 1;
            visited[(height - 1) * width + x] = 1;
          }
          for (let y = 1; y < height - 1; y++) {
            queue.push(0, y);
            queue.push(width - 1, y);
            visited[y * width] = 1;
            visited[y * width + (width - 1)] = 1;
          }
          
          let head = 0;
          while (head < queue.length) {
            const cx = queue[head++];
            const cy = queue[head++];
            const cidx = (cy * width + cx) * 4;
            const cr = data[cidx];
            const cg = data[cidx + 1];
            const cb = data[cidx + 2];
            const ca = data[cidx + 3];
            
            // Fundo é branco puro ou quase branco (R, G, B > 215)
            if (ca > 0 && cr > 215 && cg > 215 && cb > 215) {
              data[cidx + 3] = 0; // Torna o fundo 100% transparente!
              
              // Vizinhos 4-direções
              const dx = [1, -1, 0, 0];
              const dy = [0, 0, 1, -1];
              for (let i = 0; i < 4; i++) {
                const nx = cx + dx[i];
                const ny = cy + dy[i];
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                  const nidx = ny * width + nx;
                  if (!visited[nidx]) {
                    visited[nidx] = 1;
                    queue.push(nx, ny);
                  }
                }
              }
            }
          }
          
          ctx.putImageData(imgData, 0, 0);
          img.src = canvas.toDataURL();
          img.dataset.processed = 'true';
        } catch (err) {
          console.warn("[LOGO SP] Falha ao ajustar contraste da logo:", err);
        }
      };

      if (img.complete && img.naturalWidth) {
        processImage();
      } else {
        img.addEventListener('load', processImage);
      }
    });
  };

  fixSpLogo();
  // Também roda depois de um tempo curto caso as imagens sejam injetadas ou carregadas dinamicamente
  setTimeout(fixSpLogo, 1000);
});

