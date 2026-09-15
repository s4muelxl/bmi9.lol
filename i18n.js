/**
 * BMI9 i18n Engine — Vanilla JS internationalisation
 * Supports: pt-BR, en-US
 * Persists language choice in localStorage.
 * Translations are embedded — works with file://, http://, anything.
 */
(function () {
  "use strict";

  const STORAGE_KEY = "bmi9-lang";
  const DEFAULT_LANG = "pt-BR";
  const SUPPORTED = ["pt-BR", "en-US"];

  /* ── Embedded translations ── */
  const TRANSLATIONS = {
    "en-US": {
      nav: { home: "Home", about: "About", services: "Services", projects: "Projects", contact: "Contact" },
      logo: { subtitle: "Industrial Floors" },
      hero: {
        title: "High-Strength Monolithic Floors",
        description: "Complete industrial floor projects, polished concrete and high-performance solutions for warehouses, factories and logistics centers.",
        cta: "View services",
        badge1: "+10 years of experience",
        badge2: "Nationwide execution",
        badge3: "Specialized technical team",
        card_title: "What we do",
        card_item1: "Industrial monolithic floors",
        card_item2: "High-performance polished concrete",
        card_item3: "Floors for warehouses, factories and retail",
        card_cta: "Explore solutions"
      },
      services: {
        tag: "Services",
        title: "Complete industrial flooring solutions",
        description: "We design and build floors focused on strength, durability and technical finishing.",
        monolithic_title: "Industrial monolithic floor",
        monolithic_desc: "Continuous system, no unnecessary joints, ideal for heavy traffic and heavy loads.",
        monolithic_item1: "Greater mechanical strength",
        monolithic_item2: "Reduced maintenance",
        monolithic_item3: "Easy cleaning",
        polished_title: "Polished concrete",
        polished_desc: "Polished finish and high durability for warehouses, distribution centers and factories.",
        polished_item1: "Excellent cost-effectiveness",
        polished_item2: "Smooth and resistant surface",
        polished_item3: "Better light reflection",
        finishing_title: "Finishing and leveling",
        finishing_desc: "Correction and leveling of existing or new floors, with flatness and technical standards.",
        finishing_item1: "Imperfection correction",
        finishing_item2: "Better operational performance",
        finishing_item3: "Surface preparation for coatings",
        custom_title: "Custom projects",
        custom_desc: "Solutions for warehouses, factories and retail, considering loads and operation flow.",
        custom_item1: "Custom-made projects",
        custom_item2: "Specialized technical team",
        custom_item3: "Quality control"
      },
      differentials: {
        tag: "Why BMI9?",
        title: "Differentials in your project",
        engineering_title: "Applied engineering",
        engineering_desc: "Projects signed by experienced professionals, with proper load dimensioning.",
        equipment_title: "Modern equipment",
        equipment_desc: "State-of-the-art equipment for concreting, leveling and finishing.",
        deadlines_title: "Commitment to deadlines",
        deadlines_desc: "Planning focused on meeting schedules and reducing impact on operations.",
        quality_title: "Proven quality",
        quality_desc: "Track record of projects delivered for industrial and logistics clients across Brazil."
      },
      partners: {
        tag: "Partnerships",
        title: "Companies that closed a contract with us"
      },
      gallery: {
        tag: "Projects",
        title: "Completed works",
        description: "Examples of monolithic floors, polished concrete and high-strength solutions by BMI9.",
        project1_kicker: "Project 01",
        project1_name: "Honda Dealership",
        project1_copy: "Workshop epoxy flooring and traffic markings at Honda Dealership.",
        project2_kicker: "Project 02",
        project2_name: "Daycare and Amusement Park",
        project2_copy: "Monolithic colorful resin floor for children's recreation.",
        project3_kicker: "Project 03",
        project3_name: "Industrial Epoxy Flooring",
        project3_copy: "High-resistance epoxy coating and safety marking lines.",
        project4_kicker: "Project 04",
        project4_name: "Marmorized Floor and Wall",
        project4_copy: "Liquid porcelain, marbled effect and high-standard decoration."
      },
      contact: {
        tag: "Contact",
        title: "Talk to BMI9",
        description: "We are ready to help you find the best industrial flooring solution.",
        whatsapp_title: "WhatsApp",
        whatsapp_desc: "Quick response for questions.",
        email_title: "Email",
        email_desc: "Official channel for proposals, documents and commercial inquiries.",
        instagram_title: "Instagram",
        instagram_desc: "Follow our latest projects.",
        institutional_title: "Company information",
        form_title: "Request a Quote",
        form_desc: "Fill in the details and we will contact you as soon as possible.",
        form_name: "Your name or company",
        form_phone: "Phone or WhatsApp",
        form_city: "City of the project",
        form_state: "State",
        form_type: "Type of project",
        form_type_galpao: "Logistics Warehouse",
        form_type_industria: "Factory",
        form_type_comercial: "Retail",
        form_type_outro: "Other",
        form_area: "Estimated area (m²)",
        form_message: "Project details, deadline or questions...",
        form_submit: "Submit request"
      },
      footer: {
        rights: "BMI9 Industrial Floors. All rights reserved.",
        legal: "BMI9 Construções e Reformas Ltda • CNPJ 24.559.316/0001-86 • São Paulo/SP",
        seo: "Monolithic floor • Industrial floor • Polished concrete • Warehouse floor"
      },
      whatsapp_float: "WhatsApp",
      mobile_cta: "Request a Quote",
      overlay: {
        sending: "Sending request",
        wait: "Please wait...",
        step1: "Receiving your data",
        step2: "Processing quote",
        step3: "Finalizing and sending",
        done_title: "Done!",
        done_subtitle: "Quote sent successfully."
      },
      about: {
        tag: "About BMI9",
        title: "Specialists in high-performance industrial floors",
        subtitle: "Formal operations, technical support and direct commercial communication for industrial and logistics projects.",
        who_title: "Who we are",
        who_p1: "<strong>BMI9</strong> delivers complete solutions in <strong>industrial monolithic floors</strong> and <strong>polished concrete</strong>, combining engineering, technology and high-standard execution. Our commitment is to transform the infrastructure of companies throughout Brazil.",
        who_p2: "We work on small, medium and large-scale projects, focused on <strong>durability</strong>, <strong>safety</strong> and <strong>cost-effectiveness</strong>. Every m² executed carries our signature of excellence.",
        fact_razao: "Legal name",
        fact_cnpj: "Tax ID (CNPJ)",
        fact_base: "Headquarters",
        fact_contact: "Commercial contact",
        mission_title: "Mission",
        mission_desc: "Deliver high-strength industrial floors that enhance the performance and operational safety of our clients.",
        vision_title: "Vision",
        vision_desc: "Be a national reference and the first choice in advanced solutions for industrial and logistics floors.",
        values_title: "Values",
        values_desc: "Absolute commitment to results, technical rigor, respect for deadlines, safety and solid partnerships.",
        stat_obras: "Projects delivered",
        stat_m2: "of floors executed",
        institutional_tag: "Institutional",
        institutional_title: "Commercial structure and corporate presence",
        institutional_desc: "BMI9 maintains official service channels and institutional presence for negotiations with clients, partners and technical operations.",
        official_title: "Official support",
        profile_title: "Activity profile",
        profile_desc: "Focused on industrial floors, polished concrete, base leveling and custom solutions for warehouses, factories and commercial areas.",
        admin_title: "Administrative headquarters",
        admin_desc: "Operations based in São Paulo/SP with commercial support for demands from different regions of Brazil.",
        engineering_desc_about: "Projects signed by experienced professionals, with detailed technical dimensioning to withstand severe loads.",
        equipment_desc_about: "State-of-the-art machinery fleet, ensuring excellence in concreting, laser leveling and finishing.",
        deadlines_desc_about: "Robust planning and optimized logistics, focused on meeting tight schedules while reducing operational impact.",
        quality_desc_about: "Extensive portfolio of projects delivered for giants in the logistics and industrial sector across Brazil."
      },
      project_honda: {
        tag: "Featured project",
        title: "Honda Dealership",
        hero_copy: "Revitalization and Epoxy Painting of Workshop – Honda Dealership.",
        summary_title: "Project summary",
        summary_desc: "High-thickness epoxy painting project and safety marking executed at the Honda Dealership workshop, ensuring durability, ease of cleaning and premium finish.",
        check1: "High resistance glossy epoxy coating application",
        check2: "Full demarcation of slots, safety lines and traffic arrows",
        check3: "Premium aesthetic finish aligned with Honda's identity",
        back: "Back to projects"
      },
      project_galpao: {
        tag: "Completed project",
        title: "Daycare and Amusement Park",
        hero_copy: "Monolithic colorful resin floor for children's recreation with high safety and durability.",
        summary_title: "Project summary",
        summary_desc: "Flooring solution developed for school and recreation environments, prioritizing safety, impact absorption, custom aesthetics and ease of cleaning.",
        check1: "Colorful and non-toxic monolithic resin",
        check2: "Seamless surface for child safety",
        check3: "Easy cleaning and sanitary safety",
        back: "Back to projects"
      },
      project_industria: {
        tag: "Completed project",
        title: "Industrial Epoxy Flooring",
        hero_copy: "High-thickness epoxy floor with high mechanical resistance and safety markings.",
        summary_title: "Project summary",
        summary_desc: "Application of self-leveling epoxy coating in a large manufacturing plant, aiming for chemical resistance, ease of asepsis and visual organization.",
        check1: "Durable and glossy epoxy coating",
        check2: "Painted safety signs and bands",
        check3: "Smooth surface for heavy industrial traffic",
        back: "Back to projects"
      },
      project_comercial: {
        tag: "Completed project",
        title: "Marmorized Floor and Wall",
        hero_copy: "Liquid porcelain with high-gloss marbled effect and artistic wall application.",
        summary_title: "Project summary",
        summary_desc: "Execution of self-leveling floor with metallic marbled vitrified finish and decorative panels with marmorato technique and gold leaf application.",
        check1: "Marbled effect with deep shine and veins",
        check2: "Gold leaf application on wall coatings",
        check3: "Exclusive, luxurious and high-standard design",
        back: "Back to projects"
      },
      comments: {
        title: "Customer Feedback",
        rating: "Rating:",
        submit: "Submit Comment",
        empty: "No comments yet. Be the first to comment!",
        placeholder_name: "Your name",
        placeholder_text: "Leave your comment or feedback..."
      }
    }
  };
  // pt-BR is baked into the HTML, so no need to store it here.

  let currentLang = DEFAULT_LANG;

  /* ── Helpers ── */

  function resolve(obj, path) {
    return path.split(".").reduce((o, k) => (o && o[k] !== undefined ? o[k] : null), obj);
  }

  function detectLanguage() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED.includes(stored)) return stored;

    const nav = (navigator.language || navigator.userLanguage || "").replace("_", "-");
    if (SUPPORTED.includes(nav)) return nav;
    if (nav.startsWith("pt")) return "pt-BR";
    if (nav.startsWith("en")) return "en-US";

    return DEFAULT_LANG;
  }

  /* ── Core ── */

  function applyTranslations(translations) {
    // textContent / innerHTML
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const val = resolve(translations, key);
      if (val !== null) {
        if (val.includes("<")) {
          el.innerHTML = val;
        } else {
          el.textContent = val;
        }
      }
    });

    // placeholder
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      const val = resolve(translations, key);
      if (val !== null) el.placeholder = val;
    });

    // aria-label
    document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
      const key = el.getAttribute("data-i18n-aria");
      const val = resolve(translations, key);
      if (val !== null) el.setAttribute("aria-label", val);
    });

    // Update <html lang>
    document.documentElement.lang = currentLang;

    // Update switcher active state
    document.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.classList.toggle("lang-btn--active", btn.dataset.lang === currentLang);
    });

    // Dispatch custom event for language changes
    document.dispatchEvent(new CustomEvent("languageChanged", { detail: { lang: currentLang } }));
  }

  function setLanguage(lang) {
    if (!SUPPORTED.includes(lang) || lang === currentLang) return;
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);

    if (lang === DEFAULT_LANG) {
      // Reload to get baked-in PT-BR text
      location.reload();
      return;
    }

    const translations = TRANSLATIONS[lang];
    if (translations) {
      applyTranslations(translations);
    }
  }

  /* ── Init ── */

  function init() {
    currentLang = detectLanguage();

    if (currentLang !== DEFAULT_LANG && TRANSLATIONS[currentLang]) {
      applyTranslations(TRANSLATIONS[currentLang]);
    }

    // Update switcher active state for default lang too
    document.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.classList.toggle("lang-btn--active", btn.dataset.lang === currentLang);
    });

    // Bind switcher buttons
    document.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        setLanguage(btn.dataset.lang);
      });
    });
  }

  // Expose API
  window.i18n = { setLanguage, getCurrentLang: () => currentLang };

  // Auto-init on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
