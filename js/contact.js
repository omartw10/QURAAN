/**
 * ==========================================================================
 * CONTACT FORM VALIDATION JAVASCRIPT (Real-time Client-side Verification)
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  const contactForm = document.getElementById('contactForm');
  if (!contactForm) return;

  const nameInput = document.getElementById('fullName');
  const emailInput = document.getElementById('emailAddress');
  const messageInput = document.getElementById('messageText');
  const successBanner = document.getElementById('formSuccess');

  // Input listeners for real-time validation
  nameInput.addEventListener('input', () => validateField(nameInput, validateName));
  emailInput.addEventListener('input', () => validateField(emailInput, validateEmail));
  messageInput.addEventListener('input', () => validateField(messageInput, validateMessage));

  // Form Submit Handler
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const isNameValid = validateField(nameInput, validateName);
    const isEmailValid = validateField(emailInput, validateEmail);
    const isMessageValid = validateField(messageInput, validateMessage);

    if (isNameValid && isEmailValid && isMessageValid) {
      // محاكاة عملية الإرسال فقط (بدون إرسال فعلي) — لأغراض العرض
      successBanner.classList.add('form__success--visible');
      contactForm.reset();
      clearFormStates([nameInput, emailInput, messageInput]);

      // إخفاء رسالة النجاح بعد 5 ثوانٍ
      setTimeout(() => {
        successBanner.classList.remove('form__success--visible');
      }, 5000);
    }
  });
});

/**
 * Validate a specific field with a given validation function
 */
function validateField(input, validationFn) {
  const errorMsgEl = input.parentNode.querySelector('.form__error-message');
  const validation = validationFn(input.value.trim());

  if (!validation.isValid) {
    input.classList.add('form__input--error', 'form__textarea--error');
    if (errorMsgEl) {
      errorMsgEl.textContent = validation.message;
      errorMsgEl.style.display = 'flex';
    }
    return false;
  } else {
    input.classList.remove('form__input--error', 'form__textarea--error');
    if (errorMsgEl) {
      errorMsgEl.textContent = '';
      errorMsgEl.style.display = 'none';
    }
    return true;
  }
}

/**
 * Clear styles and errors
 */
function clearFormStates(inputs) {
  inputs.forEach(input => {
    input.classList.remove('form__input--error', 'form__textarea--error');
    const errorMsgEl = input.parentNode.querySelector('.form__error-message');
    if (errorMsgEl) {
      errorMsgEl.textContent = '';
      errorMsgEl.style.display = 'none';
    }
  });
}

/**
 * Name Validation: Cannot be empty, min 3 chars
 */
function validateName(value) {
  if (value.length === 0) {
    return { isValid: false, message: 'يرجى إدخال الاسم بالكامل.' };
  }
  if (value.length < 3) {
    return { isValid: false, message: 'يجب أن يتكون الاسم من 3 أحرف على الأقل.' };
  }
  return { isValid: true };
}

/**
 * Email Validation: Valid pattern check
 */
function validateEmail(value) {
  if (value.length === 0) {
    return { isValid: false, message: 'يرجى إدخال البريد الإلكتروني.' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return { isValid: false, message: 'صيغة البريد الإلكتروني غير صالحة. مثال: name@example.com' };
  }
  return { isValid: true };
}

/**
 * Message Validation: Cannot be empty, min 10 chars
 */
function validateMessage(value) {
  if (value.length === 0) {
    return { isValid: false, message: 'يرجى كتابة نص الرسالة.' };
  }
  if (value.length < 10) {
    return { isValid: false, message: 'يجب أن يكون نص الرسالة 10 أحرف على الأقل.' };
  }
  return { isValid: true };
}
