// Antonio Digital — deliberately minimal. Mobile menu + footer year only.
(function () {
  "use strict";

  var toggle = document.querySelector(".nav-toggle");
  var mobileNav = document.getElementById("mobileNav");
  if (toggle && mobileNav) {
    toggle.addEventListener("click", function () {
      var open = mobileNav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    mobileNav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        mobileNav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  var year = document.getElementById("year");
  if (year) { year.textContent = new Date().getFullYear(); }

  // Contact form: submit to contact.php via fetch, show inline status.
  var form = document.getElementById("contactForm");
  if (form) {
    var status = form.querySelector(".form-status");
    var button = form.querySelector('button[type="submit"]');
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      status.className = "form-status";
      status.textContent = "Šaljem...";
      button.disabled = true;
      fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { "Accept": "application/json" }
      })
        .then(function (r) { return r.json().catch(function () { return { success: false, error: "Greška na poslužitelju." }; }); })
        .then(function (data) {
          button.disabled = false;
          if (data.success) {
            status.className = "form-status ok";
            status.textContent = "Poruka je poslana. Javljam se u najkraćem roku.";
            form.reset();
          } else {
            status.className = "form-status err";
            status.textContent = data.error || "Slanje nije uspjelo. Pišite mi na WhatsApp ili email.";
          }
        })
        .catch(function () {
          button.disabled = false;
          status.className = "form-status err";
          status.textContent = "Slanje nije uspjelo. Pišite mi na WhatsApp ili email.";
        });
    });
  }
})();
