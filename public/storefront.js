/* Phase 1 home and cart behaviour. Uses the existing guest cart and API. */
(() => {
  const heroAsset = "/assets/Glamorous_Red_Platform_Heels_on_White-removebg-preview.png";
  const isBag = (p) => BAG_CATS.includes(p.cat);
  const marqueeCard = (p) => {
    const sold = status(p) === "out";
    return `<article class="card" data-id="${p.id}" tabindex="0" role="button"><div class="im">${img(p)}</div><span class="tag">${sold ? "Sold out" : isBag(p) ? "Bag" : "Shoe"}</span><div class="tx"><h3>${esc(p.name)}</h3><div class="price">${N(p.price)}</div></div><button class="quick-add" data-quick-add="${p.id}" ${sold ? "disabled" : ""}>${sold ? "Sold out" : "Add to cart"}</button></article>`;
  };
  const marquee = (title, products, bags = false) => {
    const list = products.length ? [...products, ...products] : [];
    return `<section class="marquee-section ${bags ? "bags" : "shoes"}"><div class="wrap"><div class="sh"><h2>${title}</h2><a class="btn alt sm" href="#shop">View all</a></div></div><div class="marquee-shell"><div class="marquee-track">${list.map(marqueeCard).join("") || "<p>No products yet.</p>"}</div></div></section>`;
  };
  home = function () {
    const shoes = P.filter((p) => !isBag(p));
    const bags = P.filter(isBag);
    return `<section class="fashion-hero"><div class="wrap"><div><div class="eyebrow">24 Heelz NG · the signature edit</div><h1>Make every <em>step</em> a statement.</h1><p>Discover elevated shoes and beautiful handbags selected for every unforgettable entrance.</p><a class="btn" href="#shop">Shop the collection</a></div><div class="hero-visual"><div class="visual-main"><img src="${heroAsset}" alt="Glamorous red platform heels" fetchpriority="high"></div><span class="hero-note">Curated for her</span></div></div></section><section class="promise-bar"><div class="wrap"><div><b>Nationwide delivery</b>Delivered across Nigeria</div><div><b>Personal styling</b>We help you choose</div><div><b>Live stock</b>Only available pieces shown</div><div><b>Secure ordering</b>Confirmed on WhatsApp</div></div></section>${marquee("Shoes", shoes)}${marquee("Bags", bags, true)}<section class="fashion-section"><div class="wrap"><div class="section-kicker">Shop with confidence</div><h2 class="section-title">The 24 Heelz experience.</h2><div class="service-grid"><article class="service-card"><span>01</span><b>Add everything to your cart</b><p>Select your size and build your order at your own pace.</p></article><article class="service-card"><span>02</span><b>Order on WhatsApp</b><p>We confirm availability, delivery and payment directly with you.</p></article><article class="service-card"><span>03</span><b>Delivered with care</b><p>Every order is personally confirmed before it is finalised.</p></article></div></div></section>`;
  };
  const oldCartUI = cartUI;
  cartUI = function () {
    oldCartUI();
    const count = CART.reduce((total, item) => total + item.qty, 0);
    const orderCount = document.querySelector("#orderCount");
    if (orderCount) orderCount.textContent = count;
    const barTxt = document.querySelector("#barTxt");
    if (barTxt && count) barTxt.textContent = `${count} item${count === 1 ? "" : "s"} in your cart`;
  };
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-quick-add]");
    if (!button || button.disabled) return;
    event.preventDefault();
    event.stopPropagation();
    const product = P.find((p) => p.id === button.dataset.quickAdd);
    if (!product) return;
    const size = (product.sizes || "One size").split(",")[0].trim() || "One size";
    addCart(product.id, size);
  }, true);
  document.querySelector("#menuToggle").onclick = () => {
    const menu = document.querySelector("#navMenu");
    const isOpen = menu.classList.toggle("open");
    document.querySelector("#menuToggle").setAttribute("aria-expanded", String(isOpen));
  };
  document.querySelector("#navMenu").addEventListener("click", (event) => {
    if (!event.target.closest("a")) return;
    document.querySelector("#navMenu").classList.remove("open");
    document.querySelector("#menuToggle").setAttribute("aria-expanded", "false");
    document.querySelector(".nav-drop")?.removeAttribute("open");
  });
  document.querySelector(".nav-drop-toggle")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const drop = event.currentTarget.closest(".nav-drop");
    const open = drop.classList.toggle("open");
    event.currentTarget.setAttribute("aria-expanded", String(open));
  });
  const syncHeaderBackground = () => document.querySelector("header")?.classList.toggle("scrolled", window.scrollY > 24);
  window.addEventListener("scroll", syncHeaderBackground, { passive: true });
  syncHeaderBackground();
  const updateWhatsApp = () => {
    const link = document.querySelector("#wab");
    if (link) link.href = `https://wa.me/2349030451124?text=${encodeURIComponent("Hello 24 Heelz NG, I would like to make an enquiry.")}`;
  };
  const oldSetMeta = setMeta;
  setMeta = function (page) { oldSetMeta(page); updateWhatsApp(); };
  updateWhatsApp();
})();
