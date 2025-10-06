(function() {
	'use strict';

	// DOM references
	const views = {
		splash: document.getElementById('splash'),
		menu: document.getElementById('menu'),
		game: document.getElementById('game'),
		levels: document.getElementById('levels'),
		settings: document.getElementById('settings'),
		about: document.getElementById('about'),
		finish: document.getElementById('finish'),
		profile: document.getElementById('profile')
	};
	const promptEl = document.getElementById('prompt');
	const levelIndicatorEl = document.getElementById('level-indicator');
	const scoreEl = document.getElementById('score');
	const timerEl = document.getElementById('timer');
	const gridEl = document.getElementById('grid');
	const toastEl = document.getElementById('toast');
	const levelsGridEl = document.getElementById('levels-grid');
	const finalScoreEl = document.getElementById('final-score');
	const finalTimeEl = document.getElementById('final-time');
	const splashProgressEl = document.getElementById('splash-progress');
	const splashBarEl = document.getElementById('splash-bar');
	const levelProgressBar = document.getElementById('level-progress-bar');
	const confettiLayer = document.createElement('div');
	confettiLayer.className = 'confetti';
	document.body.appendChild(confettiLayer);

	// Onboarding
	const onboarding = document.getElementById('onboarding');
	const inputName = document.getElementById('player-name');
	const inputAge = document.getElementById('player-age');
	const btnOnboardContinue = document.getElementById('btn-onboard-continue');
	const inputAvatar = document.getElementById('player-avatar');
	const avatarPreview = document.getElementById('avatar-preview');
	const profileAvatarEl = document.getElementById('profile-avatar');

	let avatarDataUrl = '';
	if (inputAvatar) {
		inputAvatar.addEventListener('change', (e) => {
			const file = e.target.files && e.target.files[0];
			if (!file) return;
			const reader = new FileReader();
			reader.onload = () => {
				avatarDataUrl = String(reader.result || '');
				if (avatarPreview) avatarPreview.src = avatarDataUrl;
			};
			reader.readAsDataURL(file);
		});
	}

	// Settings controls
	const toggleMute = document.getElementById('toggle-mute');
	const btnReset = document.getElementById('btn-reset');
	const qualitySelect = document.getElementById('quality-select');
	const toggleSpeak = document.getElementById('toggle-speak');

	// Menu buttons
	const btnPlay = document.getElementById('btn-play');
	const btnLevels = document.getElementById('btn-levels');
	const btnSettings = document.getElementById('btn-settings');
	const btnAbout = document.getElementById('btn-about');
	const btnProfile = document.getElementById('btn-profile');

	// Game buttons
	const btnNext = document.getElementById('btn-next');
	const btnRestart = document.getElementById('btn-restart');
	const btnExit = document.getElementById('btn-exit');
	const btnBackFromLevels = document.getElementById('btn-back-from-levels');
	const btnBackFromSettings = document.getElementById('btn-back-from-settings');
	const btnBackFromAbout = document.getElementById('btn-back-from-about');
	const btnBackFromProfile = document.getElementById('btn-back-from-profile');
	const btnEditProfile = document.getElementById('btn-edit-profile');
	const btnPlayAgain = document.getElementById('btn-play-again');
	const btnAboutGame = document.getElementById('btn-about-game');
	const btnExitFinish = document.getElementById('btn-exit-finish');

	// Profile fields
	const profileNameEl = document.getElementById('profile-name');
	const profileAgeEl = document.getElementById('profile-age');
	const profileBestEl = document.getElementById('profile-best');
	const profileLevelEl = document.getElementById('profile-level');

	// Local storage keys
	const STORAGE_KEYS = {
		bestScore: 'cq_best_score',
		progressLevel: 'cq_progress_level',
		muted: 'cq_muted',
		quality: 'cq_quality',
		speak: 'cq_speak',
		player: 'cq_player'
	};

	// Colors and levels
	const BASE_COLORS = [
		{ name: 'Red', hex: '#ef4444' },
		{ name: 'Blue', hex: '#3b82f6' },
		{ name: 'Green', hex: '#10b981' },
		{ name: 'Yellow', hex: '#eab308' },
		{ name: 'Purple', hex: '#8b5cf6' },
		{ name: 'Orange', hex: '#f97316' },
		{ name: 'Pink', hex: '#ec4899' },
		{ name: 'Teal', hex: '#14b8a6' }
	];
	const TRICK_COLORS = [
		{ name: 'Light Blue', hex: '#60a5fa' },
		{ name: 'Cyan', hex: '#22d3ee' },
		{ name: 'Lime', hex: '#84cc16' },
		{ name: 'Indigo', hex: '#6366f1' }
	];

	// Generate 20 levels with grid scaling 2x2→5x5 and increasing difficulty
	const LEVELS = Array.from({ length: 20 }).map((_, index) => {
		const idx = index + 1;
		let gridSide = 2; // 1–4
		if (idx >= 5 && idx <= 8) gridSide = 3; // 5–8
		else if (idx >= 9 && idx <= 13) gridSide = 4; // 9–13
		else if (idx >= 14) gridSide = 5; // 14–20
		const cells = gridSide * gridSide;
		const time = Math.max(5, 16 - Math.floor(idx * 0.6));
		const isTrick = idx % 4 === 0 || idx >= 12;
		const switchColors = idx >= 10;
		return { index, cells, time, isTrick, switchColors };
	});

	// State
	const state = {
		currentLevelIndex: 0,
		score: 0,
		bestScore: 0,
		progressLevel: 0,
		timerId: null,
		timeLeft: 0,
		answerColor: null,
		cells: [],
		isPlaying: false,
		runStartTs: 0,
		totalElapsedMs: 0,
		colorSwitchIntervalId: null,
		speakColors: false,
		player: { name: 'Guest', age: null },
		combo: 0,
		usedSlow: false,
		usedHint: false,
		slowUntil: 0,
		hintsLeft: 0
	};

	// Utility
	function showToast(message) {
		toastEl.textContent = message;
		toastEl.classList.add('toast--show');
		setTimeout(() => toastEl.classList.remove('toast--show'), 1500);
	}
	function switchView(showId) {
		Object.values(views).forEach(v => v.classList.add('view--hidden'));
		views[showId].classList.remove('view--hidden');
		views[showId].classList.add('fade-in');
		setTimeout(() => views[showId].classList.remove('fade-in'), 400);
	}
	function getRandomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
	function pickRandom(arr) { return arr[getRandomInt(0, arr.length - 1)]; }

	function randomHex() {
		const v = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
		return `#${v}`;
	}
	function safeHex(input) {
		if (!input) return randomHex();
		if (typeof input === 'string') return input.startsWith('#') ? input : `#${input.replace(/[^0-9a-f]/gi,'').slice(0,6).padEnd(6,'0')}`;
		if (input.hex) return safeHex(input.hex);
		return randomHex();
	}

	// Audio manager using WebAudio, synthesizing simple tones
	const AudioManager = (function() {
		let ctx = null;
		let masterGain = null;
		let backgroundOsc = null;
		let muted = false;

		function ensureContext() {
			if (!ctx) {
				ctx = new (window.AudioContext || window.webkitAudioContext)();
				masterGain = ctx.createGain();
				masterGain.gain.value = 0.25;
				masterGain.connect(ctx.destination);
			}
		}
		function isMuted() { return muted; }
		function setMuted(value) {
			muted = value;
			if (masterGain) masterGain.gain.value = value ? 0 : 0.25;
		}
		function resume() { ensureContext(); if (ctx.state === 'suspended') ctx.resume(); }
		function beep(freq = 600, dur = 0.12, type = 'sine', vol = 0.5) {
			if (muted) return;
			ensureContext();
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = type; osc.frequency.value = freq;
			gain.gain.value = vol;
			osc.connect(gain); gain.connect(masterGain);
			const now = ctx.currentTime;
			osc.start(now);
			gain.gain.setValueAtTime(vol, now);
			gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
			osc.stop(now + dur + 0.02);
		}
		function playCorrect() { beep(880, 0.16, 'triangle', 0.6); setTimeout(() => beep(1200, 0.12, 'triangle', 0.5), 80); }
		function playWrong() { beep(170, 0.2, 'sawtooth', 0.5); }
		function click() { beep(520, 0.08, 'square', 0.4); }
		function startBackground() {
			if (muted) return;
			ensureContext();
			if (backgroundOsc) return;
			backgroundOsc = ctx.createOscillator();
			const bgGain = ctx.createGain();
			backgroundOsc.type = 'sine';
			backgroundOsc.frequency.value = 220;
			bgGain.gain.value = 0.02;
			backgroundOsc.connect(bgGain); bgGain.connect(masterGain);
			backgroundOsc.start();
		}
		function stopBackground() {
			if (backgroundOsc) { try { backgroundOsc.stop(); } catch(_){} backgroundOsc.disconnect(); backgroundOsc = null; }
		}
		return { resume, setMuted, isMuted, playCorrect, playWrong, click, startBackground, stopBackground };
	})();

	// Persistence
	function loadProgress() {
		state.bestScore = parseInt(localStorage.getItem(STORAGE_KEYS.bestScore) || '0', 10);
		state.progressLevel = parseInt(localStorage.getItem(STORAGE_KEYS.progressLevel) || '0', 10);
		const savedMuted = localStorage.getItem(STORAGE_KEYS.muted);
		if (savedMuted !== null) {
			const m = savedMuted === 'true';
			AudioManager.setMuted(m);
			if (toggleMute) toggleMute.checked = m;
		}
		// quality
		const q = localStorage.getItem(STORAGE_KEYS.quality) || 'high';
		if (qualitySelect) qualitySelect.value = q;
		applyQuality(q);
		// speak
		const speak = (localStorage.getItem(STORAGE_KEYS.speak) || 'false') === 'true';
		if (toggleSpeak) toggleSpeak.checked = speak;
		state.speakColors = speak;
		// player
		const playerStr = localStorage.getItem(STORAGE_KEYS.player);
		if (playerStr) {
			try {
				const p = JSON.parse(playerStr);
				state.player = p;
				updateProfileUI();
				if (p.avatar && avatarPreview) avatarPreview.src = p.avatar;
			} catch(_){}
		}
	}
	function saveBestScore() {
		if (state.score > state.bestScore) {
			state.bestScore = state.score;
			localStorage.setItem(STORAGE_KEYS.bestScore, String(state.bestScore));
		}
	}
	function saveProgressLevel() {
		if (state.currentLevelIndex > state.progressLevel) {
			state.progressLevel = state.currentLevelIndex;
			localStorage.setItem(STORAGE_KEYS.progressLevel, String(state.progressLevel));
		}
	}

	// Levels rendering
	function renderLevels() {
		levelsGridEl.innerHTML = '';
		LEVELS.forEach((lvl, i) => {
			const btn = document.createElement('button');
			btn.className = 'level-btn';
			btn.textContent = `Level ${i + 1}`;
			const locked = i > state.progressLevel + 1; // allow next level unlock
			if (locked) {
				btn.classList.add('locked');
				btn.disabled = true;
			}
			btn.addEventListener('click', () => {
				AudioManager.click();
				startGameAtLevel(i);
			});
			levelsGridEl.appendChild(btn);
		});
	}

	function forceRenderSixBoxes() {
		gridEl.innerHTML = '';
		gridEl.style.setProperty('--cols', '3');
		gridEl.style.display = 'grid';
		// choose a correct answer from BASE_COLORS
		const answerIdx = Math.floor(Math.random() * BASE_COLORS.length);
		state.answerColor = BASE_COLORS[answerIdx];
		promptEl.textContent = `Find the ${state.answerColor.name} Square!`;
		for (let i=0;i<6;i++) {
			const base = BASE_COLORS[i%BASE_COLORS.length];
			const c = document.createElement('div');
			c.className = 'grid__cell color-box';
			c.style.background = base.hex;
			c.style.backgroundColor = base.hex;
			c.setAttribute('data-color', base.hex);
			c.setAttribute('aria-label', base.name);
			c.addEventListener('click', () => handleCellClick({ name: base.name, hex: base.hex }, c));
			gridEl.appendChild(c);
		}
		state.cells = Array.from(gridEl.children);
		console.log('Boxes generated (fallback):', state.cells.length);
	}

	function buildGrid(level) {
		try {
			gridEl.innerHTML = '';
			let cellsCount = Number(level.cells);
			if (!Number.isFinite(cellsCount) || cellsCount < 1) cellsCount = 4;
			let side = Math.round(Math.sqrt(cellsCount));
			if (Number.isNaN(side) || side < 2) side = 2;
			gridEl.style.setProperty('--cols', String(side));
			gridEl.style.display = 'grid';
			const colorsPool = level.isTrick ? [...BASE_COLORS, ...TRICK_COLORS] : [...BASE_COLORS];
			const answer = pickRandom(colorsPool);
			state.answerColor = answer;
			promptEl.textContent = `Find the ${answer.name} Square!`;

			const cells = [];
			const correctIndex = getRandomInt(0, cellsCount - 1);
			for (let i = 0; i < cellsCount; i++) {
				const color = i === correctIndex ? answer : pickRandom(colorsPool);
				const cell = document.createElement('div');
				cell.className = 'grid__cell color-box fade-in';
				cell.style.background = color.hex;
				cell.style.backgroundColor = color.hex; // Ensure backgroundColor is set
				cell.style.border = '2px solid rgba(255,255,255,0.35)';
				cell.setAttribute('role', 'gridcell');
				cell.setAttribute('data-color', color.hex); // Store data-color
				cell.setAttribute('aria-label', color.name);
				cell.addEventListener('click', () => handleCellClick(color, cell));
				cells.push(cell);
				gridEl.appendChild(cell);
			}
			state.cells = Array.from(gridEl.children);
			console.log('Boxes generated:', state.cells.length, 'side:', side, 'cellsCount:', cellsCount);
			if (!gridEl.children.length) forceRenderSixBoxes();

			clearInterval(state.colorSwitchIntervalId);
			if (level.switchColors) {
				const idx = state.currentLevelIndex + 1;
				const switchMs = Math.max(idx > 10 ? 400 : 600, 1600 - idx * 70);
				state.colorSwitchIntervalId = setInterval(() => {
					if (!state.isPlaying) return;
					for (let i = 0; i < state.cells.length; i++) {
						const current = state.cells[i];
						const isAnswerCell = current.getAttribute('data-color') === state.answerColor.hex;
						if (!isAnswerCell && Math.random() < 0.6) {
							const newColor = pickRandom(colorsPool);
							current.style.background = newColor.hex;
							current.style.backgroundColor = newColor.hex;
							current.setAttribute('data-color', newColor.hex);
							current.setAttribute('aria-label', newColor.name);
						}
					}
				}, switchMs);
			}
		} catch(e) {
			console.error('buildGrid error', e);
			forceRenderSixBoxes();
		}
	}

	function updateTopBar() {
		levelIndicatorEl.textContent = `Level ${state.currentLevelIndex + 1}/20`;
		scoreEl.textContent = `Score: ${state.score}`;
		const bestEl = document.getElementById('best');
		const comboEl = document.getElementById('combo');
		bestEl.textContent = `Best: ${state.bestScore}`;
		comboEl.textContent = `Combo: ${state.combo}`;
	}

	// Timer with slow-motion support
	function startTimer(seconds) {
		clearInterval(state.timerId);
		let secs = Number(seconds);
		if (!Number.isFinite(secs) || secs <= 0) secs = 15;
		state.timeLeft = secs;
		timerEl.textContent = String(Math.ceil(state.timeLeft));
		state.timerId = setInterval(() => {
			const now = Date.now();
			const isSlow = now < state.slowUntil;
			state.timeLeft -= isSlow ? 0.5 : 1;
			timerEl.textContent = String(Math.max(0, Math.ceil(state.timeLeft)));
			if (state.timeLeft <= 0) { clearInterval(state.timerId); onTimeOut(); }
		}, 1000);
	}

	// Combo popup
	function showComboPopup(n) {
		const el = document.createElement('div');
		el.textContent = `Combo x${n}!`;
		el.style.position = 'fixed'; el.style.left = '50%'; el.style.top = '18%'; el.style.transform = 'translate(-50%, -50%)';
		el.style.background = 'rgba(17,24,39,0.85)'; el.style.color = '#fff'; el.style.padding = '8px 12px'; el.style.borderRadius = '999px'; el.style.boxShadow = '0 6px 20px rgba(0,0,0,.25)';
		document.body.appendChild(el);
		setTimeout(() => el.remove(), 900);
	}

	function handleCellClick(color, cellEl) {
		if (!state.isPlaying || state.timeLeft <= 0) return;
		AudioManager.click();
		if (color.name === state.answerColor.name) {
			state.combo += 1;
			let gained = 10;
			if (state.combo % 3 === 0) { gained += 30; showComboPopup(state.combo); }
			state.score += gained;
			cellEl.classList.remove('shake', 'flash-wrong');
			cellEl.classList.add('flash-correct');
			AudioManager.playCorrect();
			btnNext.disabled = false;
			clearInterval(state.timerId);
			clearInterval(state.colorSwitchIntervalId);
			saveBestScore();
			saveProgressLevel();
			showToast(`Great! +${gained}`);
			fireConfetti();
			haptic('light');
			state.isPlaying = false;
			updateTopBar();
			persistCurrentRun();
			// auto-advance to next level shortly after a correct pick
			setTimeout(() => { goToNextLevel(); }, 650);
		} else {
			state.combo = 0;
			cellEl.classList.remove('flash-correct');
			cellEl.classList.add('shake', 'flash-wrong');
			AudioManager.playWrong();
			state.score = Math.max(0, state.score - 5);
			haptic('error');
			updateTopBar();
			persistCurrentRun();
		}
	}

	function onTimeOut() {
		state.isPlaying = false;
		AudioManager.playWrong();
		showToast('Time up!');
		btnNext.disabled = true;
		clearInterval(state.colorSwitchIntervalId);
	}

	function startGameAtLevel(levelIndex) {
		state.currentLevelIndex = levelIndex;
		if (levelIndex === 0) {
			state.score = 0;
			state.combo = 0;
			state.usedSlow = false;
			state.usedHint = false;
			state.hintsLeft = 3; // 3 hints per run
			if (btnSlow) btnSlow.disabled = false;
			if (btnHint) btnHint.disabled = false;
			state.runStartTs = Date.now();
		}
		switchView('game');
		btnNext.disabled = true;
		state.isPlaying = true;
		updateTopBar();
		updateProgressBar();
		updateHintUI();
		// Show immediate fallback tiles so something is visible instantly
		forceRenderSixBoxes();
		const level = LEVELS[levelIndex];
		setTimeout(() => { buildGrid(level); }, 0);
		startTimer(level.time);
		showStartHint();
		AudioManager.resume();
		AudioManager.startBackground();
		if (state.speakColors) { speak(`Level ${level.index + 1}: Find the ${state.answerColor.name} square!`); }
	}

	function startNewRun() {
		startGameAtLevel(0);
	}

	// Power-ups
	const btnSlow = document.getElementById('btn-slow');
	const btnHint = document.getElementById('btn-hint');
	btnSlow.addEventListener('click', () => {
		if (state.usedSlow || !state.isPlaying) { showToast('Slow Motion unavailable'); return; }
		state.usedSlow = true;
		btnSlow.disabled = true;
		state.slowUntil = Date.now() + 5000; // 5s slow
		showToast('Slow Motion!');
	});
	btnHint.addEventListener('click', () => {
		if (!state.isPlaying) { showToast('Start a level to use hints'); return; }
		if (state.hintsLeft <= 0) { showToast('No hints left'); return; }
		state.hintsLeft -= 1;
		btnHint.disabled = true; // temporarily disable to avoid double-press
		const answerHex = state.answerColor.hex;
		state.cells.forEach(el => {
			if (el.getAttribute('data-color') === answerHex) {
				el.style.outline = '4px solid #fbbf24';
				el.style.boxShadow = '0 0 30px rgba(251,191,36,.8)';
				setTimeout(() => { el.style.outline = 'none'; el.style.boxShadow = ''; updateHintUI(); }, 1200);
			}
		});
		showToast(`Hint used (${state.hintsLeft} left)`);
	});

	// Persistence of current run
	function persistCurrentRun() {
		const save = {
			level: state.currentLevelIndex,
			score: state.score,
			usedSlow: state.usedSlow,
			usedHint: state.usedHint,
			startTs: state.runStartTs
		};
		localStorage.setItem('cq_current_run', JSON.stringify(save));
	}
	function loadCurrentRun() {
		const s = localStorage.getItem('cq_current_run');
		if (!s) return null;
		try { return JSON.parse(s); } catch(_) { return null; }
	}
	function clearCurrentRun() { localStorage.removeItem('cq_current_run'); }

	// Continue/Restart controls on menu
	(function setupMenuContinue() {
		const container = document.querySelector('#menu .menu__cards');
		const existing = document.getElementById('btn-continue');
		if (existing) return;
		const saved = loadCurrentRun();
		if (saved) {
			const btnCont = document.createElement('button');
			btnCont.id = 'btn-continue';
			btnCont.className = 'btn';
			btnCont.textContent = 'Continue';
			btnCont.addEventListener('click', () => {
				AudioManager.click();
				state.score = saved.score || 0;
				state.runStartTs = saved.startTs || Date.now();
				state.usedSlow = !!saved.usedSlow; state.usedHint = !!saved.usedHint;
				startGameAtLevel(Math.min(saved.level || 0, LEVELS.length - 1));
			});
			container.insertBefore(btnCont, container.firstChild);
		}
	})();

	function finishRun() {
		state.totalElapsedMs = Date.now() - state.runStartTs;
		const seconds = Math.round(state.totalElapsedMs / 1000);
		finalScoreEl.textContent = String(state.score);
		document.getElementById('best-score').textContent = String(state.bestScore);
		finalTimeEl.textContent = `${seconds}s`;
		AudioManager.stopBackground();
		switchView('finish');
		clearCurrentRun();
	}

	function goToNextLevel() {
		const nextIndex = state.currentLevelIndex + 1;
		if (nextIndex >= LEVELS.length) {
			finishRun();
			return;
		}
		state.currentLevelIndex = nextIndex;
		btnNext.disabled = true;
		state.isPlaying = true;
		updateTopBar();
		const level = LEVELS[nextIndex];
		buildGrid(level);
		startTimer(level.time);
	}

	function goToPrevLevel() {
		const prevIndex = state.currentLevelIndex - 1;
		if (prevIndex < 0) { showToast('Already at Level 1'); return; }
		state.currentLevelIndex = prevIndex;
		btnNext.disabled = true;
		state.isPlaying = true;
		updateTopBar();
		const level = LEVELS[prevIndex];
		buildGrid(level);
		startTimer(level.time);
	}

	function exitToMenu() {
		clearInterval(state.timerId);
		clearInterval(state.colorSwitchIntervalId);
		AudioManager.stopBackground();
		switchView('menu');
	}

	function openLevels() {
		renderLevels();
		switchView('levels');
	}
	function openSettings() { switchView('settings'); }
	function openAbout() { switchView('about'); }
	function openProfile() { switchView('profile'); }

	function resetProgress() {
		localStorage.removeItem(STORAGE_KEYS.bestScore);
		localStorage.removeItem(STORAGE_KEYS.progressLevel);
		state.bestScore = 0; state.progressLevel = 0; state.score = 0;
		showToast('Progress reset');
	}

	function applyQuality(q) {
		document.body.classList.remove('quality-low','quality-medium','quality-high');
		document.body.classList.add(`quality-${q}`);
	}
	function updateProfileUI() {
		profileNameEl.textContent = state.player?.name || 'Guest';
		profileAgeEl.textContent = state.player?.age != null ? String(state.player.age) : '-';
		profileBestEl.textContent = String(state.bestScore);
		profileLevelEl.textContent = String(Math.max(1, state.progressLevel + 1));
		if (state.player && state.player.avatar) {
			profileAvatarEl.src = state.player.avatar;
			if (avatarPreview) avatarPreview.src = state.player.avatar;
		} else {
			profileAvatarEl.src = '';
		}
	}
	function speak(text) {
		if (!('speechSynthesis' in window)) return;
		const u = new SpeechSynthesisUtterance(text);
		u.rate = 1.1; u.pitch = 1.0; u.lang = 'en-US';
		speechSynthesis.speak(u);
	}

	// Wire buttons
	btnPlay.addEventListener('click', () => { AudioManager.click(); startNewRun(); });
	btnLevels.addEventListener('click', () => { AudioManager.click(); openLevels(); });
	btnSettings.addEventListener('click', () => { AudioManager.click(); openSettings(); });
	btnAbout.addEventListener('click', () => { AudioManager.click(); openAbout(); });
	btnProfile.addEventListener('click', () => { AudioManager.click(); openProfile(); });
	btnNext.addEventListener('click', () => { AudioManager.click(); goToNextLevel(); });
	btnRestart.addEventListener('click', () => { AudioManager.click(); startNewRun(); });
	btnExit.addEventListener('click', () => { AudioManager.click(); exitToMenu(); });
	btnBackFromLevels.addEventListener('click', () => { AudioManager.click(); switchView('menu'); });
	btnBackFromSettings.addEventListener('click', () => { AudioManager.click(); switchView('menu'); });
	btnBackFromAbout.addEventListener('click', () => { AudioManager.click(); switchView('menu'); });
	btnBackFromProfile.addEventListener('click', () => { AudioManager.click(); switchView('menu'); });
	toggleMute.addEventListener('change', (e) => {
		AudioManager.setMuted(e.target.checked);
		localStorage.setItem(STORAGE_KEYS.muted, String(e.target.checked));
	});
	btnReset.addEventListener('click', () => { AudioManager.click(); resetProgress(); renderLevels(); });
	btnPlayAgain.addEventListener('click', () => { AudioManager.click(); startNewRun(); });
	btnAboutGame.addEventListener('click', () => { AudioManager.click(); switchView('about'); });
	btnExitFinish.addEventListener('click', () => { AudioManager.click(); exitToMenu(); });

	// Settings interactions
	qualitySelect.addEventListener('change', (e) => {
		const q = e.target.value;
		applyQuality(q);
		localStorage.setItem(STORAGE_KEYS.quality, q);
	});
	toggleSpeak.addEventListener('change', (e) => {
		state.speakColors = e.target.checked;
		localStorage.setItem(STORAGE_KEYS.speak, String(e.target.checked));
	});

	// Onboarding
	btnOnboardContinue.addEventListener('click', () => {
		const name = (inputName.value || 'Player').trim().slice(0,18);
		const age = parseInt(inputAge.value || '0', 10);
		if (!name || isNaN(age) || age < 3) { showToast('Please enter a valid name and age'); return; }
		state.player = { name, age, avatar: avatarDataUrl || (state.player && state.player.avatar) || '' };
		localStorage.setItem(STORAGE_KEYS.player, JSON.stringify(state.player));
		updateProfileUI();
		onboarding.classList.add('view--hidden');
		switchView('menu');
		showToast(`Welcome, ${state.player.name}!`);
	});

	btnEditProfile.addEventListener('click', () => { inputName.value = state.player.name || ''; inputAge.value = state.player.age || ''; avatarDataUrl=''; onboarding.classList.remove('view--hidden'); });

	// Keyboard navigation: Right = next level, Left = previous level (only in game view)
	document.addEventListener('keydown', (e) => {
		if (views.game.classList.contains('view--hidden')) return;
		if (e.key === 'ArrowRight') {
			AudioManager.click();
			if (!btnNext.disabled) { goToNextLevel(); }
			else { showToast('Find the correct color first!'); }
		} else if (e.key === 'ArrowLeft') {
			AudioManager.click();
			goToPrevLevel();
		}
	});

	document.addEventListener('keydown', (e) => {
		if (views.game.classList.contains('view--hidden')) return;
		if (e.key === 'h' || e.key === 'H') { btnHint.click(); }
	});

	// Splash flow
	function startApp() {
		loadProgress();
		Object.values(views).forEach(v => v.id !== 'splash' ? v.classList.add('view--hidden') : v.classList.remove('view--hidden'));
		let p = 0;
		const durationMs = 2000;
		const stepMs = 40;
		const steps = Math.ceil(durationMs / stepMs);
		const inc = 100 / steps;
		const timer = setInterval(() => {
			p = Math.min(100, p + inc);
			if (splashProgressEl) splashProgressEl.textContent = `${Math.floor(p)}%`;
			if (splashBarEl) splashBarEl.style.width = `${p}%`;
			if (p >= 100) {
				clearInterval(timer);
				views.splash.classList.add('view--hidden');
				// if no player profile, open onboarding; else go menu
				if (!state.player || !state.player.name) {
					onboarding.classList.remove('view--hidden');
				} else {
					switchView('menu');
				}
			}
		}, stepMs);
	}

	document.addEventListener('visibilitychange', () => {
		if (document.hidden) { AudioManager.stopBackground(); }
		else if (views.game.classList.contains('view--hidden') === false) { AudioManager.startBackground(); }
	});

	const btnQuickMute = document.getElementById('btn-quick-mute');
	if (btnQuickMute) {
		btnQuickMute.addEventListener('click', () => {
			const newMuted = !AudioManager.isMuted();
			AudioManager.setMuted(newMuted);
			localStorage.setItem(STORAGE_KEYS.muted, String(newMuted));
			btnQuickMute.textContent = newMuted ? '🔇' : '🔊';
		});
	}

	function showStartHint() {
		const el = document.getElementById('tap-hint');
		if (!el) return;
		el.style.opacity = '1';
		setTimeout(() => { el.style.opacity = '0.0'; }, 1400);
	}

	function updateProgressBar() {
		if (!levelProgressBar) return;
		const pct = Math.max(0, Math.min(100, (state.currentLevelIndex / Math.max(1, (LEVELS.length - 1))) * 100));
		levelProgressBar.style.width = `${pct}%`;
	}

	// Hints system
	state.hintsLeft = 0;
	function updateHintUI() {
		if (!btnHint) return;
		btnHint.textContent = state.hintsLeft > 0 ? `Color Hint (${state.hintsLeft})` : 'Color Hint';
		btnHint.disabled = !state.isPlaying || state.hintsLeft <= 0;
	}

	// Init
	startApp();
})();
