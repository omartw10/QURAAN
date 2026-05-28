/**
 * ==========================================================================
 * AYAH OF THE DAY (آية اليوم)
 * يجلب آية عشوائية مع تفسيرها الميسّر عبر AlQuran Cloud API
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  const textEl = document.getElementById('ayahText');
  const tafsirEl = document.getElementById('ayahTafsir');
  const refEl = document.getElementById('ayahRef');
  const btn = document.getElementById('ayahRefreshBtn');

  if (!textEl || !btn) return;

  const TOTAL_AYAHS = 6236; // إجمالي آيات المصحف

  async function loadAyah() {
    const ayahNumber = Math.floor(Math.random() * TOTAL_AYAHS) + 1;

    // حالة التحميل
    btn.disabled = true;
    btn.querySelector('i').classList.add('fa-spin');
    textEl.textContent = 'جارٍ تحميل الآية...';
    tafsirEl.textContent = '';
    refEl.textContent = '';

    try {
      // نطلب نسختين معاً: النص العثماني + التفسير الميسّر
      const res = await fetch(
        `https://api.alquran.cloud/v1/ayah/${ayahNumber}/editions/quran-uthmani,ar.muyassar`
      );
      if (!res.ok) throw new Error('تعذّر الوصول للخادم');

      const json = await res.json();
      const quran = json.data[0];   // النص العثماني
      const tafsir = json.data[1];  // التفسير الميسّر

      textEl.textContent = `﴿ ${quran.text} ﴾`;
      tafsirEl.textContent = tafsir ? tafsir.text : '';
      refEl.textContent = `${quran.surah.name} (${quran.surah.number}:${quran.numberInSurah})`;
    } catch (error) {
      console.error('Error fetching ayah:', error);
      textEl.textContent = 'تعذّر تحميل الآية، يرجى التحقق من الاتصال والمحاولة مرة أخرى.';
    } finally {
      btn.disabled = false;
      btn.querySelector('i').classList.remove('fa-spin');
    }
  }

  btn.addEventListener('click', loadAyah);
  loadAyah(); // تحميل أولي عند فتح الصفحة
});
