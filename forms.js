(() => {
  'use strict';

  const ENDPOINT = 'https://vhtasjikqfldoilqdbhv.supabase.co/functions/v1/submit-form';
  const isEs = (document.documentElement.lang || '').toLowerCase().startsWith('es');
  const privacyUrl = isEs ? 'privacy-es.html' : 'privacy.html';

  const copy = isEs ? {
    newsletterConsent: 'Sí, quiero recibir la vista previa, novedades y beneficios de Ramiro Clemente por email. Puedo darme de baja cuando quiera.',
    newsletterPrivacy: 'Usaré tu email para darte acceso a la vista previa y enviarte mi newsletter. Puedes darte de baja cuando quieras.',
    contactPrivacy: 'Usaré tus datos solo para responder a tu mensaje. Por favor, no incluyas información sensible.',
    discountPrivacy: 'Usaré tu email para darte el código. Las novedades y ofertas son opcionales.',
    privacy: 'Privacidad',
    sending: 'Enviando…',
    sent: 'Enviado. Gracias.',
    error: 'No se ha podido enviar. Inténtalo de nuevo en unos minutos.',
    consentRequired: 'Marca la casilla para suscribirte y acceder a la vista previa.'
  } : {
    newsletterConsent: 'Yes, I’d like to receive the preview, news and benefits from Ramiro Clemente by email. I can unsubscribe anytime.',
    newsletterPrivacy: 'I’ll use your email to give you access to the preview and send my newsletter. You can unsubscribe anytime.',
    contactPrivacy: 'I’ll only use your details to reply to your message. Please don’t include sensitive information.',
    discountPrivacy: 'I’ll use your email to give you the code. News and offers are optional.',
    privacy: 'Privacy',
    sending: 'Sending…',
    sent: 'Sent. Thank you.',
    error: 'Something went wrong. Please try again in a few minutes.',
    consentRequired: 'Please tick the box to subscribe and access the preview.'
  };

  function privacyNote(text) {
    const p = document.createElement('p');
    p.className = 'rc-privacy-note';
    p.style.margin = '4px 0 0';
    p.style.fontSize = '0.78rem';
    p.style.lineHeight = '1.45';
    p.style.opacity = '0.82';
    p.innerHTML = `${text} <a href="${privacyUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration:underline;">${copy.privacy}</a>`;
    return p;
  }

  function statusNode(form) {
    let node = form.querySelector('.rc-form-status');
    if (!node) {
      node = document.createElement('p');
      node.className = 'rc-form-status';
      node.setAttribute('aria-live', 'polite');
      node.style.margin = '4px 0 0';
      node.style.fontSize = '0.86rem';
      form.appendChild(node);
    }
    return node;
  }

  function setBusy(form, busy) {
    const button = form.querySelector('button[type="submit"]');
    if (!button) return;
    if (!button.dataset.originalText) button.dataset.originalText = button.textContent || '';
    button.disabled = busy;
    button.textContent = busy ? copy.sending : button.dataset.originalText;
  }

  async function send(payload) {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store'
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || 'submit_failed');
    return data;
  }

  function language() {
    const lang = (document.documentElement.lang || '').toLowerCase();
    if (lang.startsWith('es')) return 'es';
    if (lang.startsWith('en')) return 'en';
    if (lang.startsWith('pt')) return 'pt';
    return 'other';
  }

  function sourcePage() {
    return window.location.href.split('#')[0];
  }

  function setupNewsletter() {
    const form = document.querySelector('form[data-forced-preview-form="true"]');
    if (!form) return;

    form.setAttribute('action', '#');
    form.removeAttribute('target');
    form.dataset.rcForm = 'newsletter';

    const checkbox = form.querySelector('input[name="newsletter_consent"]');
    if (checkbox) {
      const span = checkbox.parentElement && checkbox.parentElement.querySelector('span');
      if (span) span.textContent = copy.newsletterConsent;
    }

    if (!form.querySelector('.rc-privacy-note')) form.appendChild(privacyNote(copy.newsletterPrivacy));
  }

  function setupContact() {
    const forms = Array.from(document.querySelectorAll('form.contact-form'));
    const form = forms.find(f => !f.hasAttribute('data-forced-preview-form'));
    if (!form) return;

    form.setAttribute('action', '#');
    form.removeAttribute('enctype');
    form.dataset.rcForm = 'contact';
    if (!form.querySelector('.rc-privacy-note')) form.insertBefore(privacyNote(copy.contactPrivacy), form.querySelector('button[type="submit"]'));
  }

  function setupDiscount() {
    const form = document.getElementById('discountLeadForm');
    if (!form) return;

    form.setAttribute('action', '#');
    form.removeAttribute('target');
    form.dataset.rcForm = 'discount_lead';

    const consent = form.querySelector('input[name="email_updates_consent"]');
    if (consent) {
      const span = consent.parentElement && consent.parentElement.querySelector('span');
      if (span) span.textContent = isEs
        ? 'Sí, quiero recibir novedades, ofertas y descuentos por email. Puedo darme de baja cuando quiera.'
        : 'Yes, I’d like to receive news, offers and discounts by email. I can unsubscribe anytime.';
    }

    if (!form.querySelector('.rc-privacy-note')) form.insertBefore(privacyNote(copy.discountPrivacy), form.querySelector('button[type="submit"]'));
  }

  function showDiscountCode() {
    const lead = document.getElementById('discountLeadPopup');
    const code = document.getElementById('discountCodePopup');
    if (lead) {
      lead.classList.remove('is-visible');
      lead.setAttribute('aria-hidden', 'true');
    }
    if (code) {
      code.classList.add('is-visible');
      code.setAttribute('aria-hidden', 'false');
    }
  }

  document.addEventListener('submit', async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.dataset.rcForm) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const type = form.dataset.rcForm;
    const fd = new FormData(form);
    const status = statusNode(form);
    status.textContent = '';

    const email = String(fd.get('email') || fd.get('Email') || '').trim();
    if (!email) return;

    let payload;

    if (type === 'newsletter') {
      const checkbox = form.querySelector('input[name="newsletter_consent"]');
      if (!checkbox || !checkbox.checked) {
        status.textContent = copy.consentRequired;
        return;
      }
      payload = {
        form_type: 'newsletter',
        source_page: sourcePage(),
        language: language(),
        email,
        marketing_consent: true,
        consent_version: isEs ? 'cm_newsletter_es_v1_2026-09-17' : 'cm_newsletter_en_v1_2026-09-17',
        consent_text: copy.newsletterConsent,
        website: String(fd.get('website') || fd.get('_honey') || '')
      };
    } else if (type === 'contact') {
      payload = {
        form_type: 'contact',
        source_page: sourcePage(),
        language: language(),
        name: String(fd.get('Name') || fd.get('Nombre') || '').trim(),
        email,
        message: String(fd.get('Message') || fd.get('Mensaje') || '').trim(),
        marketing_consent: false,
        website: ''
      };
    } else {
      const marketing = !!form.querySelector('input[name="email_updates_consent"]:checked');
      const previous = !!form.querySelector('input[name="previous_customer"]:checked');
      payload = {
        form_type: 'discount_lead',
        source_page: sourcePage(),
        language: language(),
        email,
        previous_customer: previous,
        marketing_consent: marketing,
        consent_version: marketing ? (isEs ? 'cm_discount_es_v1_2026-09-17' : 'cm_discount_en_v1_2026-09-17') : null,
        consent_text: marketing ? (isEs
          ? 'Sí, quiero recibir novedades, ofertas y descuentos por email. Puedo darme de baja cuando quiera.'
          : 'Yes, I’d like to receive news, offers and discounts by email. I can unsubscribe anytime.') : null,
        website: ''
      };
    }

    try {
      setBusy(form, true);
      await send(payload);
      status.textContent = copy.sent;
      if (type === 'newsletter') {
        const destination = form.dataset.previewDestination || (isEs ? 'preview-es-v3.html' : 'preview-v3.html');
        window.location.assign(destination);
      } else if (type === 'contact') {
        form.reset();
      } else if (type === 'discount_lead') {
        showDiscountCode();
      }
    } catch (err) {
      console.error(err);
      status.textContent = copy.error;
    } finally {
      setBusy(form, false);
    }
  }, true);

  document.addEventListener('DOMContentLoaded', () => {
    setupNewsletter();
    setupContact();
    setupDiscount();
  });
})();
