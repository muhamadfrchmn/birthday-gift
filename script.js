/**
 * SCRIPT.JS — Birthday Website Interactive Logic
 * ─────────────────────────────────────────────────────────────
 * Modul-modul yang ada:
 *   1. Landing Intro  → fade-out & musik mulai
 *   2. AOS Init       → animasi scroll
 *   3. Music Control  → toggle play/pause
 *   4. Voice Message  → audio ducking logic
 *   5. Gallery / Lightbox → interaksi foto & navigasi
 *   6. Envelope / Surat  → animasi buka amplop + typewriter
 *   7. Confetti       → efek perayaan
 */

/* ============================================================
   HELPER: Query shorthand
============================================================ */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];


/* ============================================================
   1. LANDING INTRO — Transisi ke Main Journey
   ─────────────────────────────────────────────────────────────
   Logika:
   - Tombol "Buka Hadiah" diklik
   - Landing intro mulai animasi fade-out
   - Setelah 900ms (durasi animasi), intro disembunyikan (display:none)
   - Main journey di-reveal (opacity:1, pointer-events:auto)
   - Musik latar dimulai dengan volume 20%
   - AOS di-refresh, music ctrl muncul
============================================================ */
(function initLanding() {
  const intro      = $('#landing-intro');
  const mainJourney = $('#main-journey');
  const btnOpen    = $('#btn-open-gift');
  const bgMusic    = $('#bg-music');
  const musicCtrl  = $('#music-ctrl');

  if (!btnOpen || !intro || !mainJourney) return;

  btnOpen.addEventListener('click', () => {
    // Step 1: Tambahkan class animasi fade-out pada intro
    intro.classList.add('is-leaving');

    // Step 2: Mulai musik dengan volume rendah (20%)
    if (bgMusic) {
      bgMusic.volume = 0.20;
      bgMusic.play().catch(() => {
        // Browser mungkin memblokir autoplay — diabaikan dengan graceful
        console.info('Autoplay musik diblokir oleh browser. Klik ikon musik untuk memulai.');
      });
    }

    // Step 3: Setelah animasi selesai (900ms), sembunyikan intro
    setTimeout(() => {
      intro.style.display = 'none';
      mainJourney.setAttribute('aria-hidden', 'false');

      // Perbaikan Bug 1: hapus kunci scroll & paksa kembali ke atas halaman
      document.body.classList.remove('landing-active');
      window.scrollTo({ top: 0, behavior: 'instant' });

      // Step 4: Tampilkan main journey dengan fade-in
      mainJourney.classList.add('is-visible');

      // Step 5: Tampilkan kontrol musik setelah delay kecil
      setTimeout(() => {
        musicCtrl.classList.add('visible');
      }, 400);

      // Step 6: Refresh AOS agar animasi scroll berjalan dari awal
      if (window.AOS) AOS.refresh();

      // Step 7: Ledakkan konfeti kecil sebagai sambutan
      launchWelcomeConfetti();
    }, 900);
  });
})();


/* ============================================================
   2. AOS INIT — Animate On Scroll
============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  if (window.AOS) {
    AOS.init({
      duration: 800,       // Durasi animasi default (ms)
      once: true,          // Animasi hanya sekali saat pertama scroll
      offset: 60,          // Jarak dari bawah viewport sebelum animasi dimulai
      easing: 'ease-out-cubic',
    });
  }
});


/* ============================================================
   3. MUSIC CONTROL — Play / Pause Toggle
   ─────────────────────────────────────────────────────────────
   Klik tombol musik → toggle play/pause, ubah ikon, toggle animasi bar
============================================================ */
(function initMusicControl() {
  const bgMusic    = $('#bg-music');
  const btnToggle  = $('#btn-music-toggle');
  const iconPlay   = $('#icon-play');
  const iconPause  = $('#icon-pause');
  const bars       = $('.music-bars');

  if (!btnToggle || !bgMusic) return;

  btnToggle.addEventListener('click', () => {
    if (bgMusic.paused) {
      bgMusic.play().catch(() => {});
      setMusicPlaying(true);
    } else {
      bgMusic.pause();
      setMusicPlaying(false);
    }
  });

  /**
   * setMusicPlaying — Mengatur tampilan kontrol musik
   * @param {boolean} playing - apakah musik sedang diputar
   */
  function setMusicPlaying(playing) {
    iconPlay.style.display  = playing ? 'none' : 'block';
    iconPause.style.display = playing ? 'block' : 'none';

    if (playing) {
      bars.classList.remove('paused');
    } else {
      bars.classList.add('paused');
    }
  }
})();


/* ============================================================
   4. VOICE MESSAGE — Audio Ducking
   ─────────────────────────────────────────────────────────────
   Logika Audio Ducking:
   - Saat suara anak MULAI → musik perlahan mengecil ke volume 5%
   - Saat suara anak SELESAI → musik perlahan kembali ke 20%
   - Gunakan requestAnimationFrame untuk fade volume yang halus
============================================================ */
(function initVoiceMessage() {
  const btnVoice     = $('#btn-voice');
  const childVoice   = $('#child-voice');
  const bgMusic      = $('#bg-music');
  const voiceLabel   = $('#voice-label');
  const voiceWave    = $('#voice-wave');
  const playIcon     = $('#voice-play-icon');
  const stopIcon     = $('#voice-stop-icon');
  const rings        = $$('.btn-voice__ring');

  if (!btnVoice || !childVoice) return;

  let isPlaying = false;
  let fadeRAF   = null; // Reference ke animationFrame untuk cancel bila perlu

  btnVoice.addEventListener('click', () => {
    if (!isPlaying) {
      startVoice();
    } else {
      stopVoice();
    }
  });

  /** Mulai putar suara anak, duck musik latar */
  function startVoice() {
    isPlaying = true;

    // Update UI
    playIcon.style.display = 'none';
    stopIcon.style.display = 'block';
    voiceLabel.textContent = 'Sedang diputar...';
    voiceWave.classList.add('active');
    rings.forEach(r => r.classList.add('stopped'));

    // Audio ducking: perkecil musik ke 5% secara halus
    fadeMusicVolume(0.20, 0.05, 800);

    // Coba putar audio
    childVoice.currentTime = 0;
    childVoice.play().catch(() => {
      // Jika file tidak ada, simulasikan tetap jalan (untuk demo)
      voiceLabel.textContent = 'File audio belum terpasang — ganti di HTML';
    });
  }

  /** Hentikan suara anak, kembalikan musik */
  function stopVoice() {
    isPlaying = false;
    childVoice.pause();
    childVoice.currentTime = 0;
    restoreAfterVoice();
  }

  /** Restore UI dan musik setelah voice selesai */
  function restoreAfterVoice() {
    isPlaying = false;
    playIcon.style.display = 'block';
    stopIcon.style.display = 'none';
    voiceLabel.textContent = 'Tekan untuk mendengar';
    voiceWave.classList.remove('active');
    voiceWave.classList.remove('paused');
    rings.forEach(r => r.classList.remove('stopped'));

    // Kembalikan volume musik ke 20% secara halus
    fadeMusicVolume(0.05, 0.20, 1200);
  }

  // Event: suara selesai secara alami
  childVoice.addEventListener('ended', restoreAfterVoice);

  /**
   * fadeMusicVolume — Fade volume musik secara halus
   * @param {number} from   - Volume awal (0–1)
   * @param {number} to     - Volume tujuan (0–1)
   * @param {number} duration - Durasi fade dalam ms
   */
  function fadeMusicVolume(from, to, duration) {
    if (!bgMusic) return;
    if (fadeRAF) cancelAnimationFrame(fadeRAF);

    const start    = performance.now();
    const startVol = from;
    const endVol   = to;

    function step(now) {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Easing: ease-out quad
      const eased    = 1 - Math.pow(1 - progress, 2);

      bgMusic.volume = startVol + (endVol - startVol) * eased;

      if (progress < 1) {
        fadeRAF = requestAnimationFrame(step);
      }
    }

    fadeRAF = requestAnimationFrame(step);
  }

  // Pause waveform animasi saat paused
  childVoice.addEventListener('pause', () => {
    voiceWave.classList.add('paused');
  });
  childVoice.addEventListener('play', () => {
    voiceWave.classList.remove('paused');
  });
})();


/* ============================================================
   5. GALLERY & LIGHTBOX — Time Travel Gallery
   ─────────────────────────────────────────────────────────────
   Logika:
   - Kumpulkan semua .gallery-item ke dalam array
   - Saat item diklik → ambil data-src, data-caption, data-year
   - Tampilkan lightbox dengan animasi smooth spring
   - Navigasi prev/next antar foto
   - Tutup saat klik backdrop atau tombol close atau tekan Esc
============================================================ */
(function initGallery() {
  const items       = $$('.gallery-item');
  const lightbox    = $('#lightbox');
  const lbImg       = $('#lightbox-img');
  const lbCaption   = $('#lightbox-caption');
  const lbYear      = $('#lightbox-year');
  const btnClose    = $('#lightbox-close');
  const btnPrev     = $('#lightbox-prev');
  const btnNext     = $('#lightbox-next');

  if (!lightbox || items.length === 0) return;

  let currentIndex = 0;

  // ── Buka Lightbox ─────────────────────────────────────────
  items.forEach((item, idx) => {
    item.addEventListener('click', () => openLightbox(idx));
  });

  function openLightbox(index) {
    currentIndex = index;
    updateLightboxContent(index, false); // Tanpa swap animasi saat pertama buka
    lightbox.classList.add('is-open');
    document.body.style.overflow = 'hidden'; // Cegah scroll background
    lightbox.focus();
  }

  // ── Tutup Lightbox ────────────────────────────────────────
  function closeLightbox() {
    lightbox.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  btnClose.addEventListener('click', closeLightbox);

  // Tutup saat klik di luar konten (backdrop)
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  // Tutup dengan tombol Esc
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('is-open')) return;
    if (e.key === 'Escape')     closeLightbox();
    if (e.key === 'ArrowLeft')  navigateLightbox(-1);
    if (e.key === 'ArrowRight') navigateLightbox(1);
  });

  // ── Navigasi Prev / Next ──────────────────────────────────
  btnPrev.addEventListener('click', () => navigateLightbox(-1));
  btnNext.addEventListener('click', () => navigateLightbox(1));

  /**
   * navigateLightbox — Navigasi foto lightbox
   * @param {number} dir - Arah: -1 (prev) atau 1 (next)
   */
  function navigateLightbox(dir) {
    const newIndex = (currentIndex + dir + items.length) % items.length;
    currentIndex   = newIndex;
    updateLightboxContent(newIndex, true); // true = pakai swap animasi
  }

  /**
   * updateLightboxContent — Update gambar + caption + year
   * @param {number} index   - Index item galeri
   * @param {boolean} animate - Gunakan animasi swap atau tidak
   */
  function updateLightboxContent(index, animate) {
    const item    = items[index];
    const src     = item.dataset.src     || item.querySelector('img').src;
    const caption = item.dataset.caption || '';
    const year    = item.dataset.year    || '';

    if (animate) {
      // Fade out gambar lama, ganti, fade in lagi
      lbImg.classList.add('swapping');
      setTimeout(() => {
        lbImg.src         = src;
        lbCaption.textContent = caption;
        lbYear.textContent    = year;
        lbImg.classList.remove('swapping');
      }, 300);
    } else {
      lbImg.src             = src;
      lbCaption.textContent = caption;
      lbYear.textContent    = year;
    }
  }

  // ── Touch/Swipe Support untuk Mobile ─────────────────────
  let touchStartX = 0;
  lightbox.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].clientX;
  }, { passive: true });

  lightbox.addEventListener('touchend', (e) => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { // threshold 50px
      navigateLightbox(diff > 0 ? 1 : -1);
    }
  }, { passive: true });
})();


/* ============================================================
   6. ENVELOPE / SURAT — Amplop 3D + Toggle Buka/Tutup
   ─────────────────────────────────────────────────────────────
   Typewriter fix:
   - Gunakan textContent biasa (bukan insertAdjacentText/HTML)
   - .letter-body punya white-space: pre-wrap → newline \n otomatis jadi baris baru
   - Kursor dikelola sebagai elemen span terpisah via JS (bukan CSS ::after)
   - Saat tutup: twGeneration naik → typewriter aktif berhenti di iterasi berikutnya
============================================================ */
(function initEnvelope() {
  const btn        = $('#btn-open-letter');
  const btnText    = btn ? btn.querySelector('.envelope__btn-text') : null;
  const flap       = $('#envelope-flap');
  const letterWrap = $('#envelope-letter-wrap');
  const letterBody = $('#letter-body');
  const seal       = $('#envelope-seal');
  const sig        = $('#letter-signature');

  if (!btn || !flap || !letterWrap || !letterBody) return;

  let isOpen       = false;
  let twGeneration = 0;

  /* ── Isi surat ───────────────────────────────────────────── */
  const LETTER = `Sayang,

Selamat ulang tahun, ya.

Hari ini aku cuma ingin nulis sedikit dari hati, hal-hal yang mungkin sering terlewat untuk aku ucapkan langsung di depan kamu. Aku sangat mengenalmu—sosok wanita yang punya prinsip kuat dan pendirian yang sangat teguh. Aku tahu di balik pribadimu yang tegas dan perasaanmu yang kadang begitu peka, ada hati yang sebenarnya sangat lembut.

Aku selalu kagum melihat betapa detailnya kamu peduli pada hal-hal kecil untuk rumah kita, yang bahkan aku sendiri sering melewatkannya. Kamu itu tipe orang yang kalau sudah sayang, sayangnya luar biasa totalitas. Aku sering melihat kamu jauh lebih mengutamakan kenyamanan aku dan anak kita dibanding dirimu sendiri. Dan jujur, momen favoritku adalah saat kamu bisa menjadi diri sendiri, saat kamu manja dan begitu hangat—itu sisi kamu yang paling aku syukuri.

Aku nggak akan pernah lupa awal perjalanan kita dulu. Waktu kita mulai semuanya di tengah pandemi dengan segala ketidakpastian, terutama saat aku belum punya penghasilan tetap. Di masa-masa yang sangat berat itu, kamu tidak sedikit pun melangkah mundur. Kamu memilih untuk tetap berdiri teguh di sampingku. 

Terima kasih, Nia, karena sudah menjadi wanita yang begitu tulus. Terima kasih karena sudah melihatku bukan dari apa yang aku punya, tapi dari siapa aku. Ketulusanmu itu yang bikin aku merasa jadi pria paling beruntung di dunia.

Dari hati yang paling dalam, aku juga ingin minta maaf. Maaf kalau dalam upayaku untuk memberikan yang terbaik buat kamu, aku justru pernah membuatmu kecewa atau sedih. Maaf kalau sampai detik ini aku merasa belum bisa memberikan kebahagiaan yang sempurna seperti yang layak kamu dapatkan.

Terima kasih ya, sudah menjadi teman hidup yang luar biasa dan selalu setia bersamaku melewati segala musim. Aku akan terus belajar untuk jadi sandaran yang lebih baik dan lebih memahami kamu setiap harinya.

Aku sayang kamu, dulu, sekarang, dan selamanya.

Selamat ulang tahun, cintaku. 🌸`;

  /* ── Typewriter (versi sederhana & andal) ────────────────── */
  /**
   * startTypewriter — Ketik teks ke dalam `el` karakter per karakter.
   *
   * Teknik:
   *  - `el.style.whiteSpace = 'pre-wrap'` (diatur via CSS) → \n jadi baris baru
   *  - Teks disimpan di textNode terpisah; kursor adalah <span> saudara di belakangnya
   *  - Tidak pakai innerHTML += (mencegah re-parse) dan tidak pakai insertAdjacentText
   *    (mencegah bug mobile) → langsung mutasi textNode.data
   *
   * @param {string}      text       - Teks yang diketik
   * @param {HTMLElement} container  - Elemen target (#letter-body)
   * @param {number}      generation - Snapshot twGeneration saat dipanggil
   * @param {number}      speed      - ms per karakter
   */
  function startTypewriter(text, container, generation, speed) {
    // Bersihkan dan siapkan container
    container.innerHTML = '';

    // textNode: tempat teks menumpuk
    const textNode = document.createTextNode('');
    // cursorSpan: kursor berkedip yang selalu ada di ujung teks
    const cursorSpan = document.createElement('span');
    cursorSpan.className = 'tw-cursor';
    cursorSpan.textContent = '|';

    container.appendChild(textNode);
    container.appendChild(cursorSpan);

    let i = 0;

    function tick() {
      // Jika generation sudah berbeda, typewriter ini sudah dibatalkan → stop
      if (twGeneration !== generation) {
        container.innerHTML = '';
        return;
      }

      if (i < text.length) {
        // Tambahkan satu karakter ke textNode (safe, no HTML parsing)
        textNode.data += text[i];
        i++;

        // Auto-scroll letter-paper agar selalu ikut teks terbaru
        const paper = container.closest('.letter-paper');
        if (paper) paper.scrollTop = paper.scrollHeight;

        setTimeout(tick, speed);
      } else {
        // Selesai — hapus kursor, tampilkan tanda tangan
        cursorSpan.remove();
        if (sig) setTimeout(() => sig.classList.add('visible'), 350);
      }
    }

    tick();
  }

  /* ── Buka Amplop ─────────────────────────────────────────── */
  function openEnvelope() {
    isOpen = true;
    lock(true);

    if (sig) sig.classList.remove('visible');
    setBtn('open', 'Tutup Surat ✦', 'Tutup surat');

    // 1. Flap terbuka
    setTimeout(() => flap.classList.add('is-open'), 150);

    // 2. Surat muncul (max-height 0 → 620px)
    setTimeout(() => {
      letterWrap.classList.add('is-visible');

      // 3. Typewriter mulai setelah letter mulai terlihat
      setTimeout(() => {
        const gen = ++twGeneration;
        startTypewriter(LETTER, letterBody, gen, 22);
      }, 450);

    }, 700);

    setTimeout(() => lock(false), 1600);
  }

  /* ── Tutup Amplop ────────────────────────────────────────── */
  function closeEnvelope() {
    isOpen = false;
    lock(true);

    // Batalkan typewriter aktif (generation naik → tick berikutnya berhenti)
    twGeneration++;
    if (sig) sig.classList.remove('visible');

    // 1. Surat kolaps (max-height 620px → 0)
    letterWrap.classList.remove('is-visible');

    // 2. Flap menutup saat surat hampir habis kolaps
    setTimeout(() => flap.classList.remove('is-open'), 320);

    // 3. Bersihkan konten setelah animasi selesai (letter sudah tidak terlihat)
    setTimeout(() => { letterBody.innerHTML = ''; }, 900);

    setBtn('closed', 'Buka Suratmu ✦', 'Buka surat');
    setTimeout(() => lock(false), 1100);
  }

  /* ── Helpers ─────────────────────────────────────────────── */
  function setBtn(state, label, ariaLabel) {
    btn.dataset.state = state;
    if (btnText) btnText.textContent = label;
    btn.setAttribute('aria-label', ariaLabel);
  }
  function lock(active) {
    btn.classList.toggle('is-animating', active);
  }

  /* ── Events ──────────────────────────────────────────────── */
  btn.addEventListener('click', () => {
    if (btn.classList.contains('is-animating')) return;
    isOpen ? closeEnvelope() : openEnvelope();
  });
  if (seal) {
    seal.addEventListener('click', () => {
      if (btn.classList.contains('is-animating')) return;
      isOpen ? closeEnvelope() : openEnvelope();
    });
  }
})();


/* ============================================================
   7. CONFETTI — Efek Perayaan
   ─────────────────────────────────────────────────────────────
   Dua jenis konfeti:
   a. Welcome confetti — kecil, saat pertama masuk ke main journey
   b. Celebrate confetti — besar, saat klik tombol "Rayakan!"
============================================================ */

/**
 * launchWelcomeConfetti — Confetti sambutan kecil saat halaman utama muncul
 * Dipanggil oleh initLanding setelah intro menghilang
 */
function launchWelcomeConfetti() {
  if (!window.confetti) return;

  // Shower dari kedua sisi atas
  const colors = ['#E2B49A', '#F0CEBA', '#FFFBFB', '#C9896A', '#F5EEE9'];

  confetti({
    particleCount: 60,
    angle: 60,
    spread: 65,
    origin: { x: 0, y: 0.6 },
    colors,
    ticks: 220,
    gravity: 0.8,
    scalar: 0.9,
  });
  confetti({
    particleCount: 60,
    angle: 120,
    spread: 65,
    origin: { x: 1, y: 0.6 },
    colors,
    ticks: 220,
    gravity: 0.8,
    scalar: 0.9,
  });
}

/**
 * launchCelebrateConfetti — Confetti besar saat klik "Rayakan!"
 * Menggunakan beberapa tembakan berurutan untuk efek dramatis
 */
(function initConfettiButton() {
  const btnConfetti = $('#btn-confetti');
  if (!btnConfetti || !window.confetti) return;

  btnConfetti.addEventListener('click', () => {
    const colors    = ['#E2B49A', '#F0CEBA', '#C9896A', '#FFFBFB', '#F5EEE9', '#ffdd80'];
    const origin    = { x: 0.5, y: 0.7 };

    // Tembakan pertama: besar dari tengah bawah
    confetti({
      particleCount: 120,
      spread: 100,
      origin,
      colors,
      ticks: 300,
      gravity: 0.7,
      scalar: 1.1,
      shapes: ['circle', 'square'],
    });

    // Tembakan kedua: kiri
    setTimeout(() => {
      confetti({
        particleCount: 80,
        angle: 75,
        spread: 70,
        origin: { x: 0.1, y: 0.8 },
        colors,
        ticks: 260,
        gravity: 0.9,
      });
    }, 180);

    // Tembakan ketiga: kanan
    setTimeout(() => {
      confetti({
        particleCount: 80,
        angle: 105,
        spread: 70,
        origin: { x: 0.9, y: 0.8 },
        colors,
        ticks: 260,
        gravity: 0.9,
      });
    }, 360);

    // Tembakan keempat: shower dari atas
    setTimeout(() => {
      const end = Date.now() + 1500;
      const frame = () => {
        confetti({
          particleCount: 4,
          angle: 90,
          spread: 120,
          origin: { x: Math.random(), y: 0 },
          colors,
          ticks: 200,
          gravity: 1.1,
          scalar: 0.8,
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    }, 550);

    // Animasi tombol bounce
    btnConfetti.style.transform = 'scale(.93)';
    setTimeout(() => {
      btnConfetti.style.transform = '';
    }, 200);
  });
})();


/* ============================================================
   8. SMOOTH SCROLL UTILITY — Navigasi internal (opsional)
============================================================ */
$$('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});


/* ============================================================
   9. INTERSECTION OBSERVER — Efek tambahan saat section masuk viewport
   ─────────────────────────────────────────────────────────────
   Digunakan untuk memastikan section-section penting
   mendapat class 'in-view' untuk animasi tambahan di CSS
============================================================ */
(function initSectionObserver() {
  const sections = $$('section');

  if (!window.IntersectionObserver || sections.length === 0) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
      }
    });
  }, { threshold: 0.15 });

  sections.forEach(sec => observer.observe(sec));
})();


/* ============================================================
   10. FOOTER DATE — Isi tahun otomatis
============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const credit = $('.footer-credit');
  if (credit) {
    credit.innerHTML = credit.innerHTML.replace(
      '{{ Tahun Ini }}',
      new Date().getFullYear()
    );
  }
});

/* ============================================================
   11. ANIMATED TITLE — Judul tab browser bergerak
   ─────────────────────────────────────────────────────────────
   Dua efek digabungkan:
   a. Marquee scrolling — teks bergeser ke kiri seperti ticker
   b. Setiap putaran selesai → ganti ke pesan berikutnya
============================================================ */
(function initAnimatedTitle() {
  const messages = [
    '🎁 Sebuah Kado Kecil untuk Istriku Tercinta, Nia Kurniasih — Bukalah dengan Senyuman ✨ ❤️',
    
  ];

  let msgIndex   = 0;   // Indeks pesan aktif
  let charIndex  = 0;   // Posisi karakter awal marquee
  let rafId      = null;
  let lastTime   = 0;
  const INTERVAL = 120; // ms per satu karakter geser (lebih kecil = lebih cepat)
  const PAUSE    = 1800; // ms jeda sebelum ganti ke pesan berikutnya

  /** Ambil teks yang akan di-marquee (duplikat agar looping mulus) */
  function getText() {
    const msg = messages[msgIndex] + '   '; // spasi pemisah antar putaran
    return msg + msg; // duplikat untuk efek looping mulus
  }

  /** Update title satu langkah */
  function step(now) {
    if (now - lastTime >= INTERVAL) {
      lastTime = now;
      const text = getText();
      const half = text.length / 2;

      // Ambil substring mulai dari charIndex (max 38 karakter agar muat di tab)
      document.title = text.substring(charIndex, charIndex + 38);
      charIndex++;

      // Saat sudah satu putaran penuh → ganti pesan
      if (charIndex >= half) {
        charIndex = 0;
        // Jeda singkat sebelum pesan berikutnya
        cancelAnimationFrame(rafId);
        setTimeout(() => {
          msgIndex = (msgIndex + 1) % messages.length;
          rafId = requestAnimationFrame(step);
        }, PAUSE);
        return;
      }
    }
    rafId = requestAnimationFrame(step);
  }

  // Mulai animasi setelah halaman siap
  window.addEventListener('load', () => {
    rafId = requestAnimationFrame(step);
  });

  // Berhenti saat tab tidak aktif (hemat baterai), lanjut saat aktif lagi
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
      document.title = messages[msgIndex];
    } else {
      lastTime = 0;
      rafId = requestAnimationFrame(step);
    }
  });
})();