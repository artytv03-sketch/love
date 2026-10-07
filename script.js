/* ============================================================
   Для одной очень конкретной Ульяны — сценарий
   ------------------------------------------------------------
   1. Утилиты и настройки
   2. Навигация между экранами
   3. Конверт
   4. Убегающая кнопка
   5. Мысли: свайп и навигация
   6. Перезапуск истории
   ============================================================ */

(function () {
  "use strict";

  /* ---------- 1. Утилиты и настройки ---------- */

  var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var prefersReducedMotion = function () {
    return motionQuery.matches;
  };

  var clamp = function (value, min, max) {
    return Math.min(Math.max(value, min), max);
  };

  var $ = function (selector, scope) {
    return (scope || document).querySelector(selector);
  };

  /* Порядок сцен истории */
  var SCREENS = ["intro", "letter", "cards", "final"];

  var screens = SCREENS.map(function (name) {
    return document.getElementById("screen-" + name);
  });

  var currentIndex = 0;

  /* ---------- 2. Навигация между экранами ---------- */

  function showScreen(name, options) {
    var nextIndex = SCREENS.indexOf(name);
    if (nextIndex === -1 || nextIndex === currentIndex) return;

    var prev = screens[currentIndex];
    var next = screens[nextIndex];
    var focusScreen = (options && options.focus) !== false;

    prev.classList.remove("is-active");
    prev.inert = true;

    // экран полностью убираем из потока после затухания
    var hideDelay = prefersReducedMotion() ? 260 : 780;
    window.setTimeout(function () {
      if (!prev.classList.contains("is-active")) prev.hidden = true;
    }, hideDelay);

    next.hidden = false;
    next.inert = false;
    next.scrollTop = 0;
    // перезапуск анимаций появления содержимого
    void next.offsetWidth;
    next.classList.add("is-active");

    currentIndex = nextIndex;

    if (focusScreen) {
      next.setAttribute("tabindex", "-1");
      next.focus({ preventScroll: true });
    }
  }

  var goToLetter = function () {
    showScreen("letter");
  };
  var goToCards = function () {
    showScreen("cards");
  };
  var goToFinal = function () {
    showScreen("final");
  };

  /* ---------- 3. Конверт ---------- */

  var openButton = $("#openLetter");
  var envelope = $("#envelope");
  var backdropBurst = $("#backdropBurst");
  var isOpening = false;

  function openEnvelope() {
    if (isOpening) return;
    isOpening = true;

    openButton.disabled = true;

    // 1. конверт слегка увеличивается
    envelope.classList.add("is-opening");

    // 2. красное свечение ненадолго усиливается, 3. появляется лёгкий дым
    if (!prefersReducedMotion()) {
      backdropBurst.classList.remove("is-lit");
      void backdropBurst.offsetWidth;
      backdropBurst.classList.add("is-lit");
    }

    // 4. плавный переход к письму
    var delay = prefersReducedMotion() ? 320 : 1450;
    window.setTimeout(goToLetter, delay);
  }

  if (openButton) openButton.addEventListener("click", openEnvelope);

  /* ---------- 4. Отказ от чтения ---------- */

  var refuseBtn = $("#refuseBtn");
  var teaseEl = $("#tease");

  var REFUSE_TEXT = "Так не пойдёт.";

  function showTease(text) {
    if (!teaseEl) return;
    teaseEl.textContent = text;
    teaseEl.classList.toggle("is-visible", Boolean(text));
  }

  function resetRefuse() {
    showTease("");
  }

  if (refuseBtn) {
    refuseBtn.addEventListener("click", function () {
      showTease(REFUSE_TEXT);
    });
  }

  /* ---------- 5. Мысли: свайп и навигация ---------- */

  var slider = $("#slider");
  var track = $("#sliderTrack");
  var dotsBox = $("#dots");
  var hint = $("#sliderHint");
  var prevBtn = $("#prevCard");
  var nextBtn = $("#nextCard");

  var slides = track ? Array.prototype.slice.call(track.children) : [];
  var dots = [];
  var activeSlide = 0;
  var scrollFrame = null;

  function buildDots() {
    if (!dotsBox) return;
    dotsBox.textContent = "";
    slides.forEach(function (slide, index) {
      var dot = document.createElement("button");
      dot.type = "button";
      dot.className = "dot";
      dot.setAttribute("role", "tab");
      dot.setAttribute("aria-label", "Мысль " + (index + 1) + " из " + slides.length);
      dot.setAttribute("aria-selected", index === 0 ? "true" : "false");
      dot.addEventListener("click", function () {
        goToSlide(index);
      });
      dotsBox.appendChild(dot);
      dots.push(dot);
    });
  }

  function markActive(index) {
    activeSlide = clamp(index, 0, slides.length - 1);
    var isLast = activeSlide === slides.length - 1;

    dots.forEach(function (dot, i) {
      var isActive = i === activeSlide;
      dot.classList.toggle("is-active", isActive);
      dot.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    if (prevBtn) prevBtn.disabled = activeSlide === 0;
    if (nextBtn) {
      // на последней карточке стрелка ведёт к финалу
      nextBtn.disabled = false;
      nextBtn.classList.toggle("is-final", isLast);
      nextBtn.setAttribute("aria-label", isLast ? "К финалу" : "Следующая мысль");
    }
    if (hint) hint.classList.toggle("is-visible", isLast);
  }

  function goToSlide(index) {
    if (!slider || !slides.length) return;
    var target = clamp(index, 0, slides.length - 1);
    var slide = slides[target];

    // считаем позицию по реальным координатам: крайние карточки
    // прижимаются к краям, остальные — по центру
    var sliderRect = slider.getBoundingClientRect();
    var slideRect = slide.getBoundingClientRect();
    var left = slider.scrollLeft + (slideRect.left - sliderRect.left);
    var isFirst = target === 0;
    var isLast = target === slides.length - 1;

    if (isFirst) {
      // первая карточка просто прижимается к началу
      left += 0;
    } else if (isLast) {
      // последняя — к правому краю
      left += slideRect.width - slider.clientWidth;
    } else {
      left += slideRect.width / 2 - slider.clientWidth / 2;
    }

    slider.scrollTo({
      left: left,
      behavior: prefersReducedMotion() ? "auto" : "smooth"
    });
    markActive(target);
  }

  /* шаг вперёд: карточки → финал */
  function goForward() {
    if (activeSlide >= slides.length - 1) {
      goToFinal();
      return;
    }
    goToSlide(activeSlide + 1);
  }

  function detectActiveSlide() {
    if (!slider) return;
    var sliderRect = slider.getBoundingClientRect();
    var center = sliderRect.left + slider.clientWidth / 2;
    var nearest = 0;
    var nearestDistance = Infinity;

    slides.forEach(function (slide, index) {
      var rect = slide.getBoundingClientRect();
      var distance = Math.abs(rect.left + rect.width / 2 - center);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = index;
      }
    });

    if (nearest !== activeSlide) markActive(nearest);
  }

  if (slider && track) {
    buildDots();
    markActive(0);

    slider.addEventListener(
      "scroll",
      function () {
        if (scrollFrame) return;
        scrollFrame = window.requestAnimationFrame(function () {
          scrollFrame = null;
          detectActiveSlide();
        });
      },
      { passive: true }
    );

    if (prevBtn) prevBtn.addEventListener("click", function () { goToSlide(activeSlide - 1); });
    if (nextBtn) nextBtn.addEventListener("click", goForward);

    window.addEventListener("resize", function () {
      goToSlide(activeSlide);
    });
  }

  // стрелки клавиатуры работают, когда открыт экран с мыслями
  document.addEventListener("keydown", function (event) {
    if (SCREENS[currentIndex] !== "cards") return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goForward();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goToSlide(activeSlide - 1);
    }
  });

  /* ---------- 6. Перезапуск истории ---------- */

  var continueBtn = $("#toCompliments");
  var restartBtn = $("#restart");

  if (continueBtn) {
    continueBtn.addEventListener("click", function () {
      goToCards();
      goToSlide(0);
    });
  }

  if (restartBtn) {
    restartBtn.addEventListener("click", function () {
      resetRefuse();
      if (slider) slider.scrollTo({ left: 0, behavior: "auto" });
      markActive(0);
      envelope.classList.remove("is-opening");
      openButton.disabled = false;
      isOpening = false;
      showScreen("intro");
    });
  }

})();