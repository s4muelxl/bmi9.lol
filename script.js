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
  }

  function showSuccessCard(message, whatsappUrl) {
    if (!successCard) return;
    if (successText) {
      successText.textContent = message;
    }
    if (successWhatsApp && whatsappUrl) {
      successWhatsApp.href = whatsappUrl;
    }
    successCard.hidden = false;
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
          await showErrorAndHide();
          formOrcamento.reset();

          if (isRecoverable) {
            const detalhe = isLocalDev() && error.message ? ` Detalhe: ${error.message}` : "";
            formStatus.textContent =
              "Não foi possível registrar automaticamente agora." +
              getLocalBackendHelp() +
              " Você ainda pode continuar pelo WhatsApp." +
              detalhe;
            formStatus.className = "form-status success";
            setTimeout(() => openWhatsAppSafely(buildWhatsAppUrl(data)), 4000);
          } else {
            formStatus.textContent = error.message || "Ocorreu um erro. Tente novamente ou chame no WhatsApp.";
            formStatus.className = "form-status error";
          }
          return;
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

