/**
 * ==========================================================================
 * QURAN PLAYER JAVASCRIPT (API Integration & Audio Playback)
 * ==========================================================================
 */

// API Endpoints
const API_BASE = 'https://www.mp3quran.net/api/v3';
const API_RECITERS = `${API_BASE}/reciters?language=ar`;
const API_SUWAR = `${API_BASE}/suwar?language=ar`;

// State Variables
let recitersData = [];
let suwarData = [];
let selectedReciter = null;
let selectedMoshaf = null;
let selectedSurah = null;

// HTML5 Audio Object
const audio = new Audio();
let isPlaying = false;
let isBuffering = false; // هل التسجيل قيد التحميل/التخزين المؤقت الآن؟

/**
 * Safe LocalStorage helper functions to prevent crashing in private browsing modes
 */
function safeGetItem(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn('LocalStorage is blocked or unavailable:', e);
    return null;
  }
}

function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn('LocalStorage write blocked:', e);
  }
}


// DOM Elements
const reciterSelect = document.getElementById('reciterSelect');
const riwayaSelect = document.getElementById('riwayaSelect');
const surahSelect = document.getElementById('surahSelect');

const playBtn = document.getElementById('playBtn');
const rewindBtn = document.getElementById('rewindBtn');
const forwardBtn = document.getElementById('forwardBtn');
const nowPlaying = document.getElementById('nowPlaying');
const npSurah = document.getElementById('npSurah');
const npReciter = document.getElementById('npReciter');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const currentTimeEl = document.getElementById('currentTime');
const durationEl = document.getElementById('duration');
const volumeBtn = document.getElementById('volumeBtn');
const volumeSlider = document.getElementById('volumeSlider');
const audioWave = document.getElementById('audioWave');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupAudioEvents();
  fetchInitialData();
});

/**
 * Fetch Reciters and Surahs from MP3Quran API v3
 */
async function fetchInitialData() {
  showLoader(true);
  try {
    const [recitersRes, suwarRes] = await Promise.all([
      fetch(API_RECITERS),
      fetch(API_SUWAR)
    ]);
    
    if (!recitersRes.ok || !suwarRes.ok) {
      throw new Error(`خادم البيانات غير متاح (Reciters: ${recitersRes.status}, Suwar: ${suwarRes.status})`);
    }
    
    const recitersJson = await recitersRes.json();
    const suwarJson = await suwarRes.json();

    recitersData = recitersJson.reciters || [];
    suwarData = suwarJson.suwar || [];

    // Populate Reciters
    populateReciters(recitersData);
    
    // Load from LocalStorage if exists
    restoreLastState();
  } catch (error) {
    console.error('Error fetching Quran data:', error);
    alert('حدث خطأ أثناء تحميل البيانات من الخادم. يرجى التحقق من اتصالك بالإنترنت وإعادة المحاولة.');
  } finally {
    showLoader(false);
  }
}

/**
 * Populate Reciter custom select
 */
function populateReciters(reciters) {
  const trigger = reciterSelect.querySelector('.custom-select__trigger span');
  const optionsContainer = reciterSelect.querySelector('.custom-select__options');
  optionsContainer.innerHTML = '';

  reciters.forEach(reciter => {
    const option = document.createElement('div');
    option.className = 'custom-select__option';
    option.dataset.value = reciter.id;
    option.textContent = reciter.name;
    
    option.addEventListener('click', () => {
      selectReciter(reciter);
      trigger.textContent = reciter.name;
      closeAllDropdowns();
    });
    
    optionsContainer.appendChild(option);
  });

  addSearchBox(reciterSelect, 'ابحث عن القارئ...');
  setupDropdownToggle(reciterSelect);
}

/**
 * Select a reciter and update narrations (Rewayat)
 */
function selectReciter(reciter) {
  selectedReciter = reciter;
  safeSetItem('quran_last_reciter', reciter.id);

  // إظهار اسم القارئ في عنوان القائمة
  reciterSelect.querySelector('.custom-select__trigger span').textContent = reciter.name;

  // Mark in options
  markSelectedOption(reciterSelect, reciter.id);

  // Populate Rewayat (moshaf array contains different narrations)
  populateRewayat(reciter.moshaf);

  // Automatically pick the first narration
  if (reciter.moshaf && reciter.moshaf.length > 0) {
    const defaultMoshaf = reciter.moshaf[0];
    selectRewayah(defaultMoshaf);
  } else {
    clearRewayahAndSurah();
  }
}

/**
 * Populate Rewayat custom select
 */
function populateRewayat(moshafs) {
  const trigger = riwayaSelect.querySelector('.custom-select__trigger span');
  const optionsContainer = riwayaSelect.querySelector('.custom-select__options');
  optionsContainer.innerHTML = '';

  moshafs.forEach(moshaf => {
    const option = document.createElement('div');
    option.className = 'custom-select__option';
    option.dataset.value = moshaf.id;
    option.textContent = moshaf.name; // E.g. "حفص عن عاصم"
    
    option.addEventListener('click', () => {
      selectRewayah(moshaf);
      trigger.textContent = moshaf.name;
      closeAllDropdowns();
    });
    
    optionsContainer.appendChild(option);
  });

  setupDropdownToggle(riwayaSelect);
}

/**
 * Select a narration (Rewayah/Moshaf) and update Surahs list
 */
function selectRewayah(moshaf) {
  selectedMoshaf = moshaf;
  safeSetItem('quran_last_rewayah', moshaf.id);
  
  // Set trigger text
  riwayaSelect.querySelector('.custom-select__trigger span').textContent = moshaf.name;

  // Mark in options
  markSelectedOption(riwayaSelect, moshaf.id);

  // Populate Surahs based on the allowed surah_list in the moshaf
  const allowedSurahIds = moshaf.surah_list.split(',').map(s => parseInt(s, 10));
  populateSurahs(allowedSurahIds);

  // إن كانت هناك سورة مختارة مسبقاً: أعد تحميلها بالقارئ/الرواية الجديدة فوراً
  if (selectedSurah) {
    if (allowedSurahIds.includes(selectedSurah.id)) {
      selectSurah(selectedSurah);
    } else {
      // السورة السابقة غير متوفّرة لهذا الاختيار → إعادة ضبط اختيار السورة
      resetSurahSelection();
    }
  }
}

/**
 * إعادة ضبط اختيار السورة فقط (عند عدم توفّرها في الرواية الجديدة)
 */
function resetSurahSelection() {
  selectedSurah = null;
  surahSelect.querySelector('.custom-select__trigger span').textContent = 'اختر السورة';
  markSelectedOption(surahSelect, null);
  audio.pause();
  audio.src = '';
  isPlaying = false;
  isBuffering = false;
  rewindBtn.setAttribute('disabled', 'true');
  forwardBtn.setAttribute('disabled', 'true');
  nowPlaying.hidden = true;
  progressFill.style.width = '0%';
  currentTimeEl.textContent = '00:00';
  durationEl.textContent = '--:--';
  audioWave.classList.remove('audio-player__wave--playing');
  updatePlayButton();
}

/**
 * Populate Surah custom select based on availability
 */
function populateSurahs(allowedIds) {
  const trigger = surahSelect.querySelector('.custom-select__trigger span');
  const optionsContainer = surahSelect.querySelector('.custom-select__options');
  optionsContainer.innerHTML = '';

  const filteredSuwar = suwarData.filter(s => allowedIds.includes(s.id));

  filteredSuwar.forEach(surah => {
    const option = document.createElement('div');
    option.className = 'custom-select__option';
    option.dataset.value = surah.id;
    option.textContent = `سورة ${surah.name}`;
    
    option.addEventListener('click', () => {
      selectSurah(surah);
      trigger.textContent = `سورة ${surah.name}`;
      closeAllDropdowns();
    });
    
    optionsContainer.appendChild(option);
  });

  addSearchBox(surahSelect, 'ابحث عن السورة...');
  setupDropdownToggle(surahSelect);
}

/**
 * Select a Surah, construct audio URL and prepare player
 */
function selectSurah(surah) {
  selectedSurah = surah;
  safeSetItem('quran_last_surah', surah.id);

  // إظهار اسم السورة في عنوان القائمة
  surahSelect.querySelector('.custom-select__trigger span').textContent = `سورة ${surah.name}`;

  // Mark in options
  markSelectedOption(surahSelect, surah.id);

  // Construct audio source
  const paddedSurahId = String(surah.id).padStart(3, '0');
  const audioUrl = `${selectedMoshaf.server}${paddedSurahId}.mp3`;

  // Update audio source
  const wasPlaying = isPlaying;
  audio.src = audioUrl;
  audio.load();

  // إظهار حالة التحميل حتى يصبح التسجيل جاهزاً
  isBuffering = true;
  updatePlayButton();

  // Reset progress bar UI
  progressFill.style.width = '0%';
  currentTimeEl.textContent = '00:00';
  durationEl.textContent = '--:--';

  playBtn.removeAttribute('disabled');
  rewindBtn.removeAttribute('disabled');
  forwardBtn.removeAttribute('disabled');

  // تحديث شريط "يُعرض الآن"
  npSurah.textContent = `سورة ${surah.name}`;
  npReciter.textContent = selectedReciter ? selectedReciter.name : '';
  nowPlaying.hidden = false;

  if (wasPlaying) {
    playAudio();
  }
}

/**
 * Clear dropdown values
 */
function clearRewayahAndSurah() {
  selectedMoshaf = null;
  selectedSurah = null;
  
  riwayaSelect.querySelector('.custom-select__trigger span').textContent = 'اختر الرواية';
  riwayaSelect.querySelector('.custom-select__options').innerHTML = '';
  
  surahSelect.querySelector('.custom-select__trigger span').textContent = 'اختر السورة';
  surahSelect.querySelector('.custom-select__options').innerHTML = '';
  
  rewindBtn.setAttribute('disabled', 'true');
  forwardBtn.setAttribute('disabled', 'true');
  nowPlaying.hidden = true;
  audio.src = '';
  audioWave.classList.remove('audio-player__wave--playing');
}

/**
 * Dropdown UI management helpers
 */
function setupDropdownToggle(selectEl) {
  // نربط مستمع الفتح/الإغلاق مرة واحدة فقط لكل قائمة.
  // (الاستنساخ السابق للعنصر كان يفصل عنوان القائمة فلا يظهر الاختيار)
  if (selectEl.dataset.toggleBound === 'true') return;
  selectEl.dataset.toggleBound = 'true';

  const trigger = selectEl.querySelector('.custom-select__trigger');

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = selectEl.classList.contains('custom-select--open');
    closeAllDropdowns();
    if (!isOpen) {
      selectEl.classList.add('custom-select--open');
      selectEl.classList.remove('custom-select--error'); // إزالة إطار الخطأ عند التفاعل

      // عند الفتح: تفريغ البحث السابق وإظهار كل الخيارات ثم التركيز على الحقل
      const search = selectEl.querySelector('.custom-select__search input');
      if (search) {
        search.value = '';
        search.dispatchEvent(new Event('input'));
        setTimeout(() => search.focus(), 50);
      }
    }
  });
}

function closeAllDropdowns() {
  document.querySelectorAll('.custom-select').forEach(el => {
    el.classList.remove('custom-select--open');
  });
}

/**
 * تطبيع النص العربي ليكون البحث "ذكياً":
 * - يحذف التشكيل (الحركات)
 * - يوحّد أشكال الألف (أ إ آ) والياء والهاء/التاء المربوطة
 * بهذا يجد المستخدم النتيجة حتى لو لم يكتب الهمزة أو التشكيل بدقة.
 */
function normalizeArabic(str) {
  return (str || '')
    .replace(/[ً-ٰٟ]/g, '') // إزالة التشكيل
    .replace(/[إأآا]/g, 'ا')
    .replace(/[ىئي]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * يضيف صندوق بحث ذكي أعلى قائمة منسدلة معيّنة ويربط الفلترة الحية.
 * البحث يدعم عدة كلمات: كل كلمة يجب أن توجد في الاسم (بأي ترتيب).
 */
function addSearchBox(selectEl, placeholder) {
  const optionsContainer = selectEl.querySelector('.custom-select__options');

  const searchWrap = document.createElement('div');
  searchWrap.className = 'custom-select__search';
  searchWrap.innerHTML = `<i class="fas fa-search"></i><input type="text" placeholder="${placeholder}">`;
  optionsContainer.prepend(searchWrap);

  const noResults = document.createElement('div');
  noResults.className = 'custom-select__no-results';
  noResults.textContent = 'لا توجد نتائج مطابقة';
  noResults.style.display = 'none';
  optionsContainer.appendChild(noResults);

  const input = searchWrap.querySelector('input');
  // منع إغلاق القائمة عند النقر داخل صندوق البحث
  input.addEventListener('click', (e) => e.stopPropagation());

  input.addEventListener('input', () => {
    const tokens = normalizeArabic(input.value).split(' ').filter(Boolean);
    let visibleCount = 0;

    optionsContainer.querySelectorAll('.custom-select__option').forEach(opt => {
      const text = normalizeArabic(opt.textContent);
      const isMatch = tokens.every(t => text.includes(t));
      opt.style.display = isMatch ? '' : 'none';
      if (isMatch) visibleCount++;
    });

    noResults.style.display = visibleCount === 0 ? 'block' : 'none';
  });
}

document.addEventListener('click', closeAllDropdowns);

function markSelectedOption(selectEl, value) {
  selectEl.querySelectorAll('.custom-select__option').forEach(opt => {
    if (opt.dataset.value == value) {
      opt.classList.add('custom-select__option--selected');
    } else {
      opt.classList.remove('custom-select__option--selected');
    }
  });
}

/**
 * Audio Controls and Logic
 */
function setupAudioEvents() {
  playBtn.addEventListener('click', togglePlay);

  // أزرار التقديم/التأخير 10 ثوانٍ
  rewindBtn.addEventListener('click', () => seekBy(-10));
  forwardBtn.addEventListener('click', () => seekBy(10));

  // اختصار لوحة المفاتيح: مسطرة المسافة للتشغيل/الإيقاف
  document.addEventListener('keydown', (e) => {
    const tag = e.target.tagName;
    // تجاهل الاختصار أثناء الكتابة في حقول الإدخال
    if (e.code === 'Space' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
      if (!audio.src) return;
      e.preventDefault();
      togglePlay();
    }
  });


  // Track timeline click (RTL: نقيس الموضع من الحافة اليمنى للشريط)
  progressBar.addEventListener('click', (e) => {
    if (!audio.src || !audio.duration) return;
    const rect = progressBar.getBoundingClientRect();
    let pos = (rect.right - e.clientX) / rect.width;
    pos = Math.min(Math.max(pos, 0), 1); // إبقاء القيمة بين 0 و 1

    const targetTime = pos * audio.duration;
    // تحريك الشريط والوقت فوراً مع المستخدم (قبل اكتمال التحميل)
    progressFill.style.width = `${pos * 100}%`;
    currentTimeEl.textContent = formatTime(targetTime);
    // ثم ننتقل فعلياً؛ المتصفح سيطلق حدث seeking/seeked لإظهار التحميل
    audio.currentTime = targetTime;
  });

  // Track volume slider change
  volumeSlider.addEventListener('input', (e) => {
    const val = e.target.value / 100;
    audio.volume = val;
    updateVolumeIcon(val);
  });

  volumeBtn.addEventListener('click', () => {
    if (audio.muted) {
      audio.muted = false;
      updateVolumeIcon(audio.volume);
      volumeSlider.value = audio.volume * 100;
    } else {
      audio.muted = true;
      volumeBtn.className = 'fas fa-volume-mute audio-player__volume-btn';
      volumeSlider.value = 0;
    }
  });

  // Audio lifecycle hooks
  audio.addEventListener('play', () => {
    isPlaying = true;
    audioWave.classList.add('audio-player__wave--playing');
    updatePlayButton();
  });

  audio.addEventListener('pause', () => {
    isPlaying = false;
    audioWave.classList.remove('audio-player__wave--playing');
    updatePlayButton();
  });

  // أحداث التحميل/الانتظار: تُظهر مؤشّر التحميل على زر التشغيل
  audio.addEventListener('waiting', () => { isBuffering = true; updatePlayButton(); });
  audio.addEventListener('seeking', () => { isBuffering = true; updatePlayButton(); });
  audio.addEventListener('playing', () => { isBuffering = false; updatePlayButton(); });
  audio.addEventListener('canplay', () => { isBuffering = false; updatePlayButton(); });
  audio.addEventListener('seeked', () => { isBuffering = false; updateProgressUI(); updatePlayButton(); });

  audio.addEventListener('timeupdate', updateProgressUI);

  audio.addEventListener('loadedmetadata', () => {
    durationEl.textContent = formatTime(audio.duration);
    updateProgressUI();
  });

  audio.addEventListener('ended', () => {
    isPlaying = false;
    isBuffering = false;
    audioWave.classList.remove('audio-player__wave--playing');
    progressFill.style.width = '0%';
    currentTimeEl.textContent = '00:00';
    updatePlayButton();
  });
}

/**
 * التقديم/التأخير بعدد من الثواني مع تحديث فوري للواجهة
 */
function seekBy(seconds) {
  if (!audio.src) return;
  let target = audio.currentTime + seconds;
  if (!isNaN(audio.duration)) {
    target = Math.min(audio.duration, target);
  }
  target = Math.max(0, target);
  audio.currentTime = target;
  updateProgressUI();
}

/**
 * تحديث عرض شريط التقدم والوقت الحالي
 */
function updateProgressUI() {
  if (!audio.duration || isNaN(audio.duration)) return;
  const pct = (audio.currentTime / audio.duration) * 100;
  progressFill.style.width = `${pct}%`;
  currentTimeEl.textContent = formatTime(audio.currentTime);
}

/**
 * اختيار أيقونة زر التشغيل حسب الحالة:
 * تحميل → دوّارة، يعمل → إيقاف، متوقف → تشغيل
 */
function updatePlayButton() {
  const icon = playBtn.querySelector('i');
  if (!icon) return;
  if (isBuffering) {
    icon.className = 'fas fa-spinner fa-spin';
  } else if (isPlaying) {
    icon.className = 'fas fa-pause';
  } else {
    icon.className = 'fas fa-play';
  }
}

function togglePlay() {
  // لم يختر المستخدم سورة بعد → إبراز الحقول الناقصة بإطار أحمر
  if (!audio.src) {
    highlightMissingSelections();
    return;
  }
  if (isPlaying) {
    audio.pause();
  } else {
    playAudio();
  }
}

/**
 * إبراز القوائم التي لم يحدّد المستخدم اختياراً فيها بإطار أحمر
 */
function highlightMissingSelections() {
  reciterSelect.classList.toggle('custom-select--error', !selectedReciter);
  riwayaSelect.classList.toggle('custom-select--error', !selectedMoshaf);
  surahSelect.classList.toggle('custom-select--error', !selectedSurah);
}

function playAudio() {
  audio.play().catch(err => {
    console.error('Playback block error:', err);
    // Standard browser autoplay policy fallback
    isPlaying = false;
    isBuffering = false;
    audioWave.classList.remove('audio-player__wave--playing');
    updatePlayButton();
  });
}

function updateVolumeIcon(val) {
  if (val === 0) {
    volumeBtn.className = 'fas fa-volume-mute audio-player__volume-btn';
  } else if (val < 0.4) {
    volumeBtn.className = 'fas fa-volume-down audio-player__volume-btn';
  } else {
    volumeBtn.className = 'fas fa-volume-up audio-player__volume-btn';
  }
}

/**
 * Format raw seconds to MM:SS
 */
function formatTime(seconds) {
  if (isNaN(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Loader Animation Handler
 */
function showLoader(show) {
  if (show) {
    playBtn.setAttribute('disabled', 'true');
    const icon = playBtn.querySelector('i');
    if (icon) icon.className = 'fas fa-spinner fa-spin';
  } else {
    // نُبقي الزر قابلاً للضغط حتى لو لم تُختر سورة، لإظهار التحقق بإطار أحمر
    playBtn.removeAttribute('disabled');
    updatePlayButton();
  }
}

/**
 * Restore last selections from LocalStorage
 */
function restoreLastState() {
  const lastReciterId = safeGetItem('quran_last_reciter');
  const lastRewayahId = safeGetItem('quran_last_rewayah');
  const lastSurahId = safeGetItem('quran_last_surah');

  if (lastReciterId) {
    const reciter = recitersData.find(r => r.id == lastReciterId);
    if (reciter) {
      selectReciter(reciter);
      reciterSelect.querySelector('.custom-select__trigger span').textContent = reciter.name;
      
      if (lastRewayahId) {
        const moshaf = reciter.moshaf.find(m => m.id == lastRewayahId);
        if (moshaf) {
          selectRewayah(moshaf);
          
          if (lastSurahId) {
            // Find surah name
            const surah = suwarData.find(s => s.id == lastSurahId);
            const allowedSurahIds = moshaf.surah_list.split(',').map(s => parseInt(s, 10));
            
            if (surah && allowedSurahIds.includes(surah.id)) {
              selectSurah(surah);
              surahSelect.querySelector('.custom-select__trigger span').textContent = `سورة ${surah.name}`;
            }
          }
        }
      }
    }
  }
}
