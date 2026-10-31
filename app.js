/**
 * MORA MINILAB 3 — SUPER SYNTH
 * Fusión de MoraChord + Piano ahhgag con diseño e integración 1:1 para Arturia MiniLab 3
 * Funciona en Celular (Touch + USB-OTG MIDI) y PC (Mouse + Teclado + USB MIDI)
 */

'use strict';

// ============================================================================
// 1. CATÁLOGO DE 28 PARÁMETROS ASIGNABLES A LAS 8 PERILLAS Y 4 FADERS
// ============================================================================

const WAVE_TYPES = [
  { id: 'sine',     short: 'SENO',   name: 'Senoidal (Sine)' },
  { id: 'triangle', short: 'TRI',    name: 'Triangular' },
  { id: 'sawtooth', short: 'SIERRA', name: 'Diente de Sierra (Saw)' },
  { id: 'square',   short: 'CUAD',   name: 'Cuadrada (Square)' },
  { id: 'pulse',    short: 'PULSO',  name: 'Pulso Estrecho (PWM)' },
  { id: 'supersaw', short: 'SSAW',   name: 'SuperSaw (7 Osc)' },
  { id: 'fm',       short: 'FM 2OP', name: 'Síntesis FM Metálica' },
  { id: 'piano',    short: 'SAMPLE', name: 'Instrumento Sampleado Real' }
];

const WAVE2_TYPES = [
  { id: 'off',      short: 'OFF',    name: 'Apagado' },
  { id: 'sine',     short: 'SENO',   name: 'Senoidal' },
  { id: 'triangle', short: 'TRI',    name: 'Triangular' },
  { id: 'sawtooth', short: 'SIERRA', name: 'Sierra' },
  { id: 'square',   short: 'CUAD',   name: 'Cuadrada' },
  { id: 'noise',    short: 'RUIDO',  name: 'Ruido Analógico' }
];

const FILTER_MODES = [
  { id: 'lowpass',  short: 'LP 24dB', name: 'Pasa-Bajos (Lowpass)' },
  { id: 'bandpass', short: 'BP 12dB', name: 'Pasa-Banda (Bandpass)' },
  { id: 'highpass', short: 'HP 12dB', name: 'Pasa-Altos (Highpass)' },
  { id: 'notch',    short: 'NOTCH',   name: 'Rechaza-Banda (Notch)' }
];

const LFO_TARGETS = [
  { id: 'cutoff', short: 'FILTRO', name: 'Wobble de Filtro' },
  { id: 'pitch',  short: 'PITCH',  name: 'Vibrato de Afinación' },
  { id: 'amp',    short: 'TREM',   name: 'Trémolo de Volumen' }
];

const PARAM_DEFS = {
  // Osciladores & Tipo de Onda
  wave1:       { cat: 'Osciladores y Onda', name: 'Tipo de Onda 1', short: 'Onda Osc 1', min: 0, max: 7, step: 1, fmt: v => {
    const idx = Math.round(v);
    if (idx === 7 && typeof SAMPLE_META !== 'undefined' && typeof hwState !== 'undefined') {
      return SAMPLE_META[hwState.sampleTimbre]?.short || 'SAMPLE';
    }
    return WAVE_TYPES[idx]?.short || 'SAW';
  }},
  wave2:       { cat: 'Osciladores y Onda', name: 'Tipo de Onda 2', short: 'Onda Osc 2', min: 0, max: 5, step: 1, fmt: v => WAVE2_TYPES[Math.round(v)]?.short || 'OFF' },
  osc2Mix:     { cat: 'Osciladores y Onda', name: 'Mezcla Osc 2', short: 'Osc 2 Mix', min: 0, max: 1, step: 0.01, fmt: v => Math.round(v * 100) + '%' },
  detune:      { cat: 'Osciladores y Onda', name: 'Desafinación Unison', short: 'Detune', min: 0, max: 45, step: 0.5, fmt: v => v.toFixed(1) + 'ct' },
  osc2Semi:    { cat: 'Osciladores y Onda', name: 'Semitonos Osc 2', short: 'Osc2 Tono', min: -12, max: 12, step: 1, fmt: v => (v >= 0 ? '+' : '') + Math.round(v) + 'st' },
  subLevel:    { cat: 'Osciladores y Onda', name: 'Sub-Oscilador (-1 Oct)', short: 'Sub Bass', min: 0, max: 1, step: 0.01, fmt: v => Math.round(v * 100) + '%' },
  fmDepth:     { cat: 'Osciladores y Onda', name: 'Profundidad FM', short: 'FM Depth', min: 0, max: 1400, step: 10, fmt: v => Math.round(v) + 'Hz' },
  fmRatio:     { cat: 'Osciladores y Onda', name: 'Ratio Armónico FM', short: 'FM Ratio', min: 0.5, max: 8, step: 0.25, fmt: v => v.toFixed(2) + 'x' },

  // Filtro Multimodo
  cutoff:      { cat: 'Filtro Analógico', name: 'Frecuencia Cutoff', short: 'Cutoff', min: 60, max: 14000, step: 10, log: true, fmt: v => v >= 1000 ? (v / 1000).toFixed(1) + 'kHz' : Math.round(v) + 'Hz' },
  resonance:   { cat: 'Filtro Analógico', name: 'Resonancia (Q)', short: 'Resonancia', min: 0.5, max: 20, step: 0.1, fmt: v => v.toFixed(1) },
  filterMode:  { cat: 'Filtro Analógico', name: 'Modo de Filtro', short: 'Modo Filtro', min: 0, max: 3, step: 1, fmt: v => FILTER_MODES[Math.round(v)]?.short || 'LP' },
  filterEnv:   { cat: 'Filtro Analógico', name: 'Envolvente al Filtro', short: 'Env Filtro', min: -1, max: 1, step: 0.02, fmt: v => (v >= 0 ? '+' : '') + Math.round(v * 100) + '%' },

  // Envolvente ADSR + Glide
  attack:      { cat: 'Envolvente ADSR & Glide', name: 'Attack (Ataque)', short: 'Attack', min: 0.004, max: 2.5, step: 0.005, fmt: v => v < 0.1 ? Math.round(v * 1000) + 'ms' : v.toFixed(2) + 's' },
  decay:       { cat: 'Envolvente ADSR & Glide', name: 'Decay (Caída)', short: 'Decay', min: 0.03, max: 2.5, step: 0.01, fmt: v => v.toFixed(2) + 's' },
  sustain:     { cat: 'Envolvente ADSR & Glide', name: 'Sustain (Sostén)', short: 'Sustain', min: 0.0, max: 1.0, step: 0.01, fmt: v => Math.round(v * 100) + '%' },
  release:     { cat: 'Envolvente ADSR & Glide', name: 'Release (Relajación)', short: 'Release', min: 0.04, max: 4.5, step: 0.02, fmt: v => v.toFixed(2) + 's' },
  glide:       { cat: 'Envolvente ADSR & Glide', name: 'Glide / Portamento', short: 'Glide', min: 0, max: 0.5, step: 0.005, fmt: v => Math.round(v * 1000) + 'ms' },

  // Modulación & LFO
  lfoRate:     { cat: 'Modulación LFO', name: 'Velocidad LFO', short: 'LFO Rate', min: 0.2, max: 18, step: 0.1, fmt: v => v.toFixed(1) + 'Hz' },
  lfoDepth:    { cat: 'Modulación LFO', name: 'Profundidad LFO', short: 'LFO Depth', min: 0, max: 1, step: 0.01, fmt: v => Math.round(v * 100) + '%' },
  lfoTarget:   { cat: 'Modulación LFO', name: 'Destino del LFO', short: 'LFO Dest', min: 0, max: 2, step: 1, fmt: v => LFO_TARGETS[Math.round(v)]?.short || 'FILTRO' },

  // Efectos Master (Drive, Chorus, Eco, Reverb)
  drive:       { cat: 'Efectos (Eco / Reverb / Drive)', name: 'Distorsión / Drive', short: 'Drive', min: 0, max: 1, step: 0.01, fmt: v => Math.round(v * 100) + '%' },
  chorus:      { cat: 'Efectos (Eco / Reverb / Drive)', name: 'Chorus Estéreo', short: 'Chorus', min: 0, max: 1, step: 0.01, fmt: v => Math.round(v * 100) + '%' },
  echoMix:     { cat: 'Efectos (Eco / Reverb / Drive)', name: 'Eco / Delay Nivel', short: 'Eco Mix', min: 0, max: 0.85, step: 0.01, fmt: v => Math.round(v * 100) + '%' },
  echoTime:    { cat: 'Efectos (Eco / Reverb / Drive)', name: 'Tiempo de Eco', short: 'Eco Time', min: 0.08, max: 0.9, step: 0.01, fmt: v => Math.round(v * 1000) + 'ms' },
  echoFB:      { cat: 'Efectos (Eco / Reverb / Drive)', name: 'Repeticiones de Eco', short: 'Eco FBack', min: 0.05, max: 0.85, step: 0.01, fmt: v => Math.round(v * 100) + '%' },
  reverbMix:   { cat: 'Efectos (Eco / Reverb / Drive)', name: 'Reverb Espacial', short: 'Reverb', min: 0, max: 0.95, step: 0.01, fmt: v => Math.round(v * 100) + '%' },

  // Global & Ritmo
  bpm:         { cat: 'Global y Ritmo', name: 'Tempo (BPM)', short: 'BPM Tempo', min: 60, max: 180, step: 1, fmt: v => Math.round(v) + '' },
  drumVol:     { cat: 'Global y Ritmo', name: 'Volumen Batería', short: 'Drum Vol', min: 0, max: 1, step: 0.01, fmt: v => Math.round(v * 100) + '%' },
  masterVol:   { cat: 'Global y Ritmo', name: 'Volumen General', short: 'Master Vol', min: 0, max: 1.2, step: 0.01, fmt: v => Math.round(v * 100) + '%' }
};

// Bancos rápidos para las 8 perillas
const KNOB_BANKS = {
  synth: ['wave1', 'cutoff', 'resonance', 'filterEnv', 'detune', 'subLevel', 'echoMix', 'reverbMix'],
  waves: ['wave1', 'wave2', 'osc2Mix', 'osc2Semi', 'subLevel', 'fmDepth', 'fmRatio', 'drive'],
  fx:    ['cutoff', 'resonance', 'filterMode', 'lfoRate', 'lfoDepth', 'chorus', 'echoMix', 'echoFB']
};

const FADER_BANKS = {
  adsr: ['attack', 'decay', 'sustain', 'release'],
  mix:  ['osc2Mix', 'subLevel', 'echoMix', 'masterVol']
};

// ============================================================================
// 2. PRESETS DE SONIDO (24 Instrumentos Sampleados Reales + Sintetizador + MoraChord)
// ============================================================================

const SOUND_PRESETS = {
  // ── 🎹 PIANOS Y TECLADOS REALES (SAMPLES FLUIDR3_GM) ──
  sample_grand:       { name: '🎹 Acoustic Grand Piano', sampleTimbre: 'grand', wave1: 7, wave2: 0, osc2Mix: 0, detune: 2, osc2Semi: 0, subLevel: 0.08, fmDepth: 0, fmRatio: 1, cutoff: 10500, resonance: 0.7, filterMode: 0, filterEnv: 0.25, attack: 0.004, decay: 1.4, sustain: 0.78, release: 1.6, glide: 0, lfoRate: 4, lfoDepth: 0, lfoTarget: 0, drive: 0.0, chorus: 0.08, echoMix: 0.10, echoTime: 0.32, echoFB: 0.28, reverbMix: 0.30 },
  sample_bright:      { name: '🎹 Bright Studio Piano', sampleTimbre: 'bright', wave1: 7, wave2: 0, osc2Mix: 0, detune: 3, osc2Semi: 0, subLevel: 0.1, fmDepth: 0, fmRatio: 1, cutoff: 12500, resonance: 0.8, filterMode: 0, filterEnv: 0.3, attack: 0.004, decay: 1.2, sustain: 0.8, release: 1.4, glide: 0, lfoRate: 4, lfoDepth: 0, lfoTarget: 0, drive: 0.04, chorus: 0.15, echoMix: 0.14, echoTime: 0.3, echoFB: 0.3, reverbMix: 0.28 },
  sample_rock:        { name: '🎸 Electric Grand CP-80', sampleTimbre: 'rock', wave1: 7, wave2: 3, osc2Mix: 0.1, detune: 6, osc2Semi: 0, subLevel: 0.2, fmDepth: 0, fmRatio: 1, cutoff: 10000, resonance: 1.2, filterMode: 0, filterEnv: 0.35, attack: 0.004, decay: 1.4, sustain: 0.82, release: 1.9, glide: 0, lfoRate: 4, lfoDepth: 0, lfoTarget: 0, drive: 0.12, chorus: 0.28, echoMix: 0.16, echoTime: 0.34, echoFB: 0.32, reverbMix: 0.36 },
  sample_cabaret:     { name: '🎪 Dark Cabaret Honky-Tonk', sampleTimbre: 'cabaret', wave1: 7, wave2: 1, osc2Mix: 0.12, detune: 14, osc2Semi: 0, subLevel: 0.1, fmDepth: 0, fmRatio: 1, cutoff: 7500, resonance: 1.1, filterMode: 0, filterEnv: 0.3, attack: 0.004, decay: 1.0, sustain: 0.7, release: 1.2, glide: 0, lfoRate: 5.5, lfoDepth: 0.05, lfoTarget: 1, drive: 0.1, chorus: 0.38, echoMix: 0.15, echoTime: 0.28, echoFB: 0.32, reverbMix: 0.40 },
  sample_rhodes:      { name: '✨ Fender Rhodes Mark I', sampleTimbre: 'rhodes', wave1: 7, wave2: 0, osc2Mix: 0.15, detune: 5, osc2Semi: 0, subLevel: 0.18, fmDepth: 0, fmRatio: 1, cutoff: 6800, resonance: 1.0, filterMode: 0, filterEnv: 0.25, attack: 0.005, decay: 1.1, sustain: 0.72, release: 1.5, glide: 0.01, lfoRate: 4.2, lfoDepth: 0.14, lfoTarget: 2, drive: 0.08, chorus: 0.32, echoMix: 0.22, echoTime: 0.34, echoFB: 0.36, reverbMix: 0.32 },
  sample_dx_ep:       { name: '💎 Crystal Chorus E-Piano', sampleTimbre: 'dx_ep', wave1: 7, wave2: 0, osc2Mix: 0.12, detune: 7, osc2Semi: 12, subLevel: 0.12, fmDepth: 0, fmRatio: 2, cutoff: 9200, resonance: 0.9, filterMode: 0, filterEnv: 0.3, attack: 0.004, decay: 1.2, sustain: 0.74, release: 1.8, glide: 0, lfoRate: 3.6, lfoDepth: 0.08, lfoTarget: 1, drive: 0.02, chorus: 0.52, echoMix: 0.26, echoTime: 0.36, echoFB: 0.38, reverbMix: 0.38 },
  sample_harpsichord: { name: '🏛️ Clavecín Barroco', sampleTimbre: 'harpsichord', wave1: 7, wave2: 0, osc2Mix: 0, detune: 3, osc2Semi: 0, subLevel: 0.05, fmDepth: 0, fmRatio: 1, cutoff: 11000, resonance: 0.8, filterMode: 0, filterEnv: 0.2, attack: 0.004, decay: 0.9, sustain: 0.65, release: 0.9, glide: 0, lfoRate: 4, lfoDepth: 0, lfoTarget: 0, drive: 0.02, chorus: 0.12, echoMix: 0.14, echoTime: 0.28, echoFB: 0.28, reverbMix: 0.34 },
  sample_clavinet:    { name: '🕺 Funk Clavinet D6', sampleTimbre: 'clavinet', wave1: 7, wave2: 0, osc2Mix: 0, detune: 3, osc2Semi: 0, subLevel: 0.15, fmDepth: 0, fmRatio: 1, cutoff: 4800, resonance: 2.8, filterMode: 0, filterEnv: 0.55, attack: 0.004, decay: 0.45, sustain: 0.6, release: 0.4, glide: 0.01, lfoRate: 5.5, lfoDepth: 0.12, lfoTarget: 0, drive: 0.22, chorus: 0.18, echoMix: 0.16, echoTime: 0.25, echoFB: 0.32, reverbMix: 0.18 },

  // ── ⛪ ÓRGANOS Y ACORDEÓN REALES (SAMPLES CON SUSTAIN INFINITO) ──
  sample_hammond:      { name: '⛪ Hammond B3 Drawbar', sampleTimbre: 'hammond', wave1: 7, wave2: 0, osc2Mix: 0.2, detune: 6, osc2Semi: 12, subLevel: 0.35, fmDepth: 0, fmRatio: 1, cutoff: 8200, resonance: 1.0, filterMode: 0, filterEnv: 0.1, attack: 0.006, decay: 0.3, sustain: 0.96, release: 0.22, glide: 0.008, lfoRate: 6.2, lfoDepth: 0.16, lfoTarget: 1, drive: 0.18, chorus: 0.48, echoMix: 0.14, echoTime: 0.28, echoFB: 0.28, reverbMix: 0.26 },
  sample_perc_organ:   { name: '🔥 Jazz Percussive Organ', sampleTimbre: 'perc_organ', wave1: 7, wave2: 0, osc2Mix: 0.15, detune: 4, osc2Semi: 12, subLevel: 0.3, fmDepth: 0, fmRatio: 1, cutoff: 7800, resonance: 1.1, filterMode: 0, filterEnv: 0.2, attack: 0.005, decay: 0.28, sustain: 0.92, release: 0.2, glide: 0.006, lfoRate: 5.8, lfoDepth: 0.14, lfoTarget: 1, drive: 0.14, chorus: 0.42, echoMix: 0.15, echoTime: 0.27, echoFB: 0.28, reverbMix: 0.24 },
  sample_rock_organ:   { name: '⚡ Rock Organ (Deep Purple)', sampleTimbre: 'rock_organ', wave1: 7, wave2: 3, osc2Mix: 0.22, detune: 8, osc2Semi: 0, subLevel: 0.4, fmDepth: 0, fmRatio: 1, cutoff: 6800, resonance: 1.5, filterMode: 0, filterEnv: 0.15, attack: 0.006, decay: 0.3, sustain: 0.95, release: 0.28, glide: 0.01, lfoRate: 6.5, lfoDepth: 0.18, lfoTarget: 1, drive: 0.42, chorus: 0.5, echoMix: 0.18, echoTime: 0.3, echoFB: 0.32, reverbMix: 0.3 },
  sample_church_organ: { name: '🕍 Órgano de Catedral', sampleTimbre: 'church_organ', wave1: 7, wave2: 2, osc2Mix: 0.2, detune: 8, osc2Semi: 12, subLevel: 0.55, fmDepth: 0, fmRatio: 1, cutoff: 9500, resonance: 0.8, filterMode: 0, filterEnv: 0.15, attack: 0.08, decay: 0.6, sustain: 0.98, release: 1.8, glide: 0.01, lfoRate: 4.0, lfoDepth: 0.06, lfoTarget: 1, drive: 0.05, chorus: 0.38, echoMix: 0.24, echoTime: 0.4, echoFB: 0.42, reverbMix: 0.65 },
  sample_reed_organ:   { name: '🪵 Armonio Cálido (Reed)', sampleTimbre: 'reed_organ', wave1: 7, wave2: 1, osc2Mix: 0.15, detune: 5, osc2Semi: 0, subLevel: 0.2, fmDepth: 0, fmRatio: 1, cutoff: 5800, resonance: 0.9, filterMode: 0, filterEnv: 0.15, attack: 0.04, decay: 0.4, sustain: 0.92, release: 0.55, glide: 0.01, lfoRate: 4.6, lfoDepth: 0.08, lfoTarget: 1, drive: 0.04, chorus: 0.25, echoMix: 0.14, echoTime: 0.3, echoFB: 0.28, reverbMix: 0.32 },
  sample_accordion:    { name: '🪗 Acordeón / Bandoneón', sampleTimbre: 'accordion', wave1: 7, wave2: 2, osc2Mix: 0.15, detune: 9, osc2Semi: 0, subLevel: 0.15, fmDepth: 0, fmRatio: 1, cutoff: 6400, resonance: 1.2, filterMode: 0, filterEnv: 0.2, attack: 0.035, decay: 0.4, sustain: 0.92, release: 0.45, glide: 0.02, lfoRate: 5.2, lfoDepth: 0.12, lfoTarget: 1, drive: 0.06, chorus: 0.35, echoMix: 0.16, echoTime: 0.3, echoFB: 0.3, reverbMix: 0.34 },

  // ── 🎻 VIOLINES, CUERDAS Y ORQUESTA REALES (SAMPLES) ──
  sample_violin:        { name: '🎻 Violín Solista Real', sampleTimbre: 'violin', wave1: 7, wave2: 2, osc2Mix: 0.12, detune: 5, osc2Semi: 0, subLevel: 0.05, fmDepth: 0, fmRatio: 1, cutoff: 7600, resonance: 1.1, filterMode: 0, filterEnv: 0.25, attack: 0.09, decay: 0.5, sustain: 0.92, release: 0.75, glide: 0.045, lfoRate: 5.6, lfoDepth: 0.16, lfoTarget: 1, drive: 0.04, chorus: 0.25, echoMix: 0.2, echoTime: 0.34, echoFB: 0.34, reverbMix: 0.42 },
  sample_viola:         { name: '🎻 Viola de Cámara', sampleTimbre: 'viola', wave1: 7, wave2: 2, osc2Mix: 0.12, detune: 5, osc2Semi: 0, subLevel: 0.1, fmDepth: 0, fmRatio: 1, cutoff: 6400, resonance: 1.0, filterMode: 0, filterEnv: 0.22, attack: 0.09, decay: 0.5, sustain: 0.92, release: 0.8, glide: 0.04, lfoRate: 5.2, lfoDepth: 0.15, lfoTarget: 1, drive: 0.04, chorus: 0.26, echoMix: 0.2, echoTime: 0.34, echoFB: 0.34, reverbMix: 0.42 },
  sample_cello:         { name: '🎻 Violonchelo (Cello)', sampleTimbre: 'cello', wave1: 7, wave2: 2, osc2Mix: 0.15, detune: 6, osc2Semi: 0, subLevel: 0.28, fmDepth: 0, fmRatio: 1, cutoff: 5400, resonance: 1.1, filterMode: 0, filterEnv: 0.25, attack: 0.10, decay: 0.6, sustain: 0.92, release: 0.95, glide: 0.05, lfoRate: 4.8, lfoDepth: 0.14, lfoTarget: 1, drive: 0.05, chorus: 0.28, echoMix: 0.2, echoTime: 0.36, echoFB: 0.35, reverbMix: 0.46 },
  sample_contrabass:    { name: '🎻 Contrabajo Acústico', sampleTimbre: 'contrabass', wave1: 7, wave2: 1, osc2Mix: 0.18, detune: 4, osc2Semi: -12, subLevel: 0.5, fmDepth: 0, fmRatio: 1, cutoff: 3600, resonance: 1.2, filterMode: 0, filterEnv: 0.25, attack: 0.06, decay: 0.5, sustain: 0.88, release: 0.7, glide: 0.04, lfoRate: 4.2, lfoDepth: 0.08, lfoTarget: 1, drive: 0.08, chorus: 0.15, echoMix: 0.1, echoTime: 0.3, echoFB: 0.25, reverbMix: 0.3 },
  sample_strings1:      { name: '🎼 Orquesta de Cuerdas', sampleTimbre: 'strings1', wave1: 7, wave2: 2, osc2Mix: 0.22, detune: 11, osc2Semi: 0, subLevel: 0.25, fmDepth: 0, fmRatio: 1, cutoff: 8200, resonance: 0.8, filterMode: 0, filterEnv: 0.22, attack: 0.16, decay: 0.7, sustain: 0.94, release: 1.4, glide: 0.03, lfoRate: 4.8, lfoDepth: 0.14, lfoTarget: 1, drive: 0.03, chorus: 0.52, echoMix: 0.22, echoTime: 0.36, echoFB: 0.36, reverbMix: 0.50 },
  sample_strings2:      { name: '🌙 Cuerdas Cinematográficas', sampleTimbre: 'strings2', wave1: 7, wave2: 2, osc2Mix: 0.28, detune: 14, osc2Semi: 0, subLevel: 0.3, fmDepth: 0, fmRatio: 1, cutoff: 6200, resonance: 0.8, filterMode: 0, filterEnv: 0.2, attack: 0.34, decay: 0.9, sustain: 0.95, release: 2.1, glide: 0.05, lfoRate: 4.2, lfoDepth: 0.15, lfoTarget: 1, drive: 0.02, chorus: 0.58, echoMix: 0.28, echoTime: 0.4, echoFB: 0.4, reverbMix: 0.58 },
  sample_synth_strings: { name: '🌌 Synth Strings Solina', sampleTimbre: 'synth_strings', wave1: 7, wave2: 4, osc2Mix: 0.35, detune: 16, osc2Semi: 0, subLevel: 0.25, fmDepth: 0, fmRatio: 1, cutoff: 5800, resonance: 1.1, filterMode: 0, filterEnv: 0.25, attack: 0.22, decay: 0.7, sustain: 0.92, release: 1.6, glide: 0.04, lfoRate: 5.0, lfoDepth: 0.18, lfoTarget: 1, drive: 0.05, chorus: 0.65, echoMix: 0.26, echoTime: 0.36, echoFB: 0.38, reverbMix: 0.48 },
  sample_pizzicato:     { name: '🤌 Cuerdas Pizzicato', sampleTimbre: 'pizzicato', wave1: 7, wave2: 0, osc2Mix: 0.1, detune: 3, osc2Semi: 0, subLevel: 0.12, fmDepth: 0, fmRatio: 1, cutoff: 8800, resonance: 0.9, filterMode: 0, filterEnv: 0.4, attack: 0.004, decay: 0.35, sustain: 0.3, release: 0.45, glide: 0, lfoRate: 4, lfoDepth: 0, lfoTarget: 0, drive: 0.02, chorus: 0.2, echoMix: 0.22, echoTime: 0.3, echoFB: 0.35, reverbMix: 0.36 },
  sample_harp:          { name: '👼 Arpa Orquestal', sampleTimbre: 'harp', wave1: 7, wave2: 0, osc2Mix: 0.12, detune: 4, osc2Semi: 12, subLevel: 0.08, fmDepth: 0, fmRatio: 1, cutoff: 9800, resonance: 0.7, filterMode: 0, filterEnv: 0.25, attack: 0.004, decay: 1.2, sustain: 0.65, release: 1.8, glide: 0, lfoRate: 3.8, lfoDepth: 0.05, lfoTarget: 1, drive: 0.0, chorus: 0.3, echoMix: 0.28, echoTime: 0.36, echoFB: 0.4, reverbMix: 0.48 },
  sample_choir:         { name: '👼 Coro Celestial (Aahs)', sampleTimbre: 'choir', wave1: 7, wave2: 1, osc2Mix: 0.2, detune: 12, osc2Semi: 0, subLevel: 0.25, fmDepth: 0, fmRatio: 1, cutoff: 6400, resonance: 0.9, filterMode: 0, filterEnv: 0.2, attack: 0.24, decay: 0.8, sustain: 0.94, release: 1.8, glide: 0.04, lfoRate: 4.4, lfoDepth: 0.12, lfoTarget: 1, drive: 0.02, chorus: 0.55, echoMix: 0.3, echoTime: 0.4, echoFB: 0.42, reverbMix: 0.6 },

  // ── 🎛️ SINTETIZADOR ANALÓGICO / FM ──
  init_synth:      { name: '⚡ Init Super Synth', wave1: 2, wave2: 3, osc2Mix: 0.35, detune: 8, osc2Semi: 0, subLevel: 0.4, fmDepth: 0, fmRatio: 2, cutoff: 3400, resonance: 1.8, filterMode: 0, filterEnv: 0.45, attack: 0.01, decay: 0.35, sustain: 0.7, release: 0.45, glide: 0.02, lfoRate: 4.5, lfoDepth: 0.08, lfoTarget: 0, drive: 0.1, chorus: 0.25, echoMix: 0.2, echoTime: 0.32, echoFB: 0.38, reverbMix: 0.2 },
  warm_analog:     { name: '🌅 Warm Analog Poly', wave1: 2, wave2: 1, osc2Mix: 0.5, detune: 12, osc2Semi: 0, subLevel: 0.35, fmDepth: 0, fmRatio: 1, cutoff: 1400, resonance: 1.2, filterMode: 0, filterEnv: 0.35, attack: 0.08, decay: 0.6, sustain: 0.75, release: 1.4, glide: 0.04, lfoRate: 3.2, lfoDepth: 0.12, lfoTarget: 0, drive: 0.08, chorus: 0.45, echoMix: 0.25, echoTime: 0.36, echoFB: 0.4, reverbMix: 0.35 },
  acid_303:        { name: '🧪 Acid TB-303 Squelch', wave1: 2, wave2: 0, osc2Mix: 0, detune: 2, osc2Semi: 0, subLevel: 0.15, fmDepth: 0, fmRatio: 1, cutoff: 480, resonance: 14.5, filterMode: 0, filterEnv: 0.85, attack: 0.005, decay: 0.22, sustain: 0.15, release: 0.18, glide: 0.08, lfoRate: 6.0, lfoDepth: 0.15, lfoTarget: 0, drive: 0.55, chorus: 0.05, echoMix: 0.22, echoTime: 0.25, echoFB: 0.45, reverbMix: 0.12 },
  supersaw_trance: { name: '🚀 SuperSaw 2000s', wave1: 5, wave2: 2, osc2Mix: 0.4, detune: 22, osc2Semi: 12, subLevel: 0.45, fmDepth: 0, fmRatio: 1, cutoff: 5800, resonance: 2.0, filterMode: 0, filterEnv: 0.4, attack: 0.01, decay: 0.4, sustain: 0.85, release: 0.8, glide: 0.015, lfoRate: 5.0, lfoDepth: 0.05, lfoTarget: 0, drive: 0.18, chorus: 0.6, echoMix: 0.32, echoTime: 0.25, echoFB: 0.45, reverbMix: 0.38 },
  sub_bass:        { name: '🔊 MiniMoog Sub Bass', wave1: 3, wave2: 2, osc2Mix: 0.45, detune: 5, osc2Semi: -12, subLevel: 0.85, fmDepth: 0, fmRatio: 1, cutoff: 680, resonance: 3.2, filterMode: 0, filterEnv: 0.55, attack: 0.005, decay: 0.25, sustain: 0.6, release: 0.22, glide: 0.06, lfoRate: 2.5, lfoDepth: 0.0, lfoTarget: 0, drive: 0.32, chorus: 0.0, echoMix: 0.05, echoTime: 0.25, echoFB: 0.2, reverbMix: 0.08 },
  pwm_strings:     { name: '🎻 Lush PWM Strings', wave1: 4, wave2: 2, osc2Mix: 0.6, detune: 16, osc2Semi: 0, subLevel: 0.25, fmDepth: 0, fmRatio: 1, cutoff: 2600, resonance: 0.9, filterMode: 0, filterEnv: 0.2, attack: 0.38, decay: 0.8, sustain: 0.85, release: 2.2, glide: 0.05, lfoRate: 4.8, lfoDepth: 0.22, lfoTarget: 1, drive: 0.05, chorus: 0.65, echoMix: 0.25, echoTime: 0.38, echoFB: 0.35, reverbMix: 0.48 },

  // ── ⚡ CLÁSICOS DE MORACHORD ──
  grandpiano:      { name: '🎹 Piano Acústico Synth', wave1: 1, wave2: 0, osc2Mix: 0.45, detune: 2, osc2Semi: 0, subLevel: 0.3, fmDepth: 80, fmRatio: 2, cutoff: 3400, resonance: 0.9, filterMode: 0, filterEnv: 0.55, attack: 0.005, decay: 0.8, sustain: 0.45, release: 1.8, glide: 0.005, lfoRate: 4, lfoDepth: 0, lfoTarget: 0, drive: 0.04, chorus: 0.15, echoMix: 0.12, echoTime: 0.3, echoFB: 0.3, reverbMix: 0.28 },
  blackparade:     { name: '🥀 Black Parade Piano', wave1: 1, wave2: 3, osc2Mix: 0.25, detune: 5, osc2Semi: 0, subLevel: 0.35, fmDepth: 140, fmRatio: 3, cutoff: 4200, resonance: 1.6, filterMode: 0, filterEnv: 0.65, attack: 0.004, decay: 0.75, sustain: 0.5, release: 1.9, glide: 0.005, lfoRate: 4, lfoDepth: 0, lfoTarget: 0, drive: 0.12, chorus: 0.22, echoMix: 0.16, echoTime: 0.32, echoFB: 0.32, reverbMix: 0.32 },
  dx7ep:           { name: '✨ DX7 E-Piano 1', wave1: 6, wave2: 0, osc2Mix: 0.3, detune: 3, osc2Semi: 12, subLevel: 0.2, fmDepth: 420, fmRatio: 4, cutoff: 5200, resonance: 1.0, filterMode: 0, filterEnv: 0.4, attack: 0.005, decay: 0.65, sustain: 0.45, release: 2.0, glide: 0.01, lfoRate: 5.2, lfoDepth: 0.1, lfoTarget: 2, drive: 0.04, chorus: 0.45, echoMix: 0.24, echoTime: 0.35, echoFB: 0.36, reverbMix: 0.35 },
  bornslippy:      { name: '🔥 Synthpotting 90s', wave1: 2, wave2: 3, osc2Mix: 0.45, detune: 11, osc2Semi: 0, subLevel: 0.4, fmDepth: 0, fmRatio: 1, cutoff: 3600, resonance: 3.4, filterMode: 0, filterEnv: 0.65, attack: 0.012, decay: 0.32, sustain: 0.55, release: 1.1, glide: 0.01, lfoRate: 4, lfoDepth: 0.06, lfoTarget: 0, drive: 0.16, chorus: 0.38, echoMix: 0.38, echoTime: 0.375, echoFB: 0.48, reverbMix: 0.32 },
  synthbrass:      { name: '🎺 80s Synth Brass (Jump)', wave1: 2, wave2: 2, osc2Mix: 0.7, detune: 9, osc2Semi: 0, subLevel: 0.35, fmDepth: 0, fmRatio: 1, cutoff: 3100, resonance: 2.4, filterMode: 0, filterEnv: 0.7, attack: 0.025, decay: 0.35, sustain: 0.75, release: 0.75, glide: 0.02, lfoRate: 5.5, lfoDepth: 0.08, lfoTarget: 1, drive: 0.15, chorus: 0.42, echoMix: 0.18, echoTime: 0.3, echoFB: 0.32, reverbMix: 0.28 },
  vangelis:        { name: '🌌 Blade Runner (CS-80)', wave1: 2, wave2: 2, osc2Mix: 0.65, detune: 7, osc2Semi: 0, subLevel: 0.4, fmDepth: 0, fmRatio: 1, cutoff: 2400, resonance: 1.5, filterMode: 0, filterEnv: 0.55, attack: 0.32, decay: 0.9, sustain: 0.85, release: 2.8, glide: 0.11, lfoRate: 4.5, lfoDepth: 0.15, lfoTarget: 1, drive: 0.1, chorus: 0.55, echoMix: 0.38, echoTime: 0.42, echoFB: 0.48, reverbMix: 0.55 },
  gfunk:           { name: '🐍 G-Funk Whistle (Moog)', wave1: 0, wave2: 1, osc2Mix: 0.45, detune: 4, osc2Semi: 12, subLevel: 0.0, fmDepth: 0, fmRatio: 1, cutoff: 5400, resonance: 1.2, filterMode: 0, filterEnv: 0.15, attack: 0.02, decay: 0.3, sustain: 0.9, release: 0.45, glide: 0.15, lfoRate: 5.8, lfoDepth: 0.12, lfoTarget: 1, drive: 0.05, chorus: 0.18, echoMix: 0.24, echoTime: 0.3, echoFB: 0.35, reverbMix: 0.22 },
  m1organ:         { name: '🏠 90s House Organ (M1)', wave1: 0, wave2: 3, osc2Mix: 0.38, detune: 3, osc2Semi: 19, subLevel: 0.5, fmDepth: 180, fmRatio: 3, cutoff: 3800, resonance: 1.4, filterMode: 0, filterEnv: 0.5, attack: 0.005, decay: 0.25, sustain: 0.45, release: 0.35, glide: 0.005, lfoRate: 4, lfoDepth: 0, lfoTarget: 0, drive: 0.12, chorus: 0.25, echoMix: 0.2, echoTime: 0.25, echoFB: 0.35, reverbMix: 0.22 },
  dx7bass:         { name: '🎸 DX7 Solid Bass', wave1: 6, wave2: 2, osc2Mix: 0.25, detune: 2, osc2Semi: -12, subLevel: 0.55, fmDepth: 520, fmRatio: 1, cutoff: 2800, resonance: 1.6, filterMode: 0, filterEnv: 0.65, attack: 0.004, decay: 0.22, sustain: 0.3, release: 0.28, glide: 0.015, lfoRate: 4, lfoDepth: 0, lfoTarget: 0, drive: 0.22, chorus: 0.1, echoMix: 0.06, echoTime: 0.25, echoFB: 0.2, reverbMix: 0.1 },
  organ:           { name: '⛪ Órgano Hammond B3', wave1: 0, wave2: 3, osc2Mix: 0.35, detune: 4, osc2Semi: 12, subLevel: 0.5, fmDepth: 90, fmRatio: 2, cutoff: 4500, resonance: 0.8, filterMode: 0, filterEnv: 0.1, attack: 0.008, decay: 0.2, sustain: 0.95, release: 0.25, glide: 0.008, lfoRate: 6.4, lfoDepth: 0.18, lfoTarget: 1, drive: 0.22, chorus: 0.5, echoMix: 0.12, echoTime: 0.28, echoFB: 0.25, reverbMix: 0.25 },
  guitar:          { name: '⚡ Lead Guitar Overdrive', wave1: 2, wave2: 3, osc2Mix: 0.55, detune: 6, osc2Semi: 0, subLevel: 0.2, fmDepth: 120, fmRatio: 1, cutoff: 2900, resonance: 3.5, filterMode: 0, filterEnv: 0.45, attack: 0.008, decay: 0.45, sustain: 0.65, release: 0.85, glide: 0.035, lfoRate: 5.5, lfoDepth: 0.14, lfoTarget: 1, drive: 0.72, chorus: 0.25, echoMix: 0.3, echoTime: 0.34, echoFB: 0.42, reverbMix: 0.28 },
  '8bit':          { name: '👾 8-Bit Chiptune NES', wave1: 3, wave2: 4, osc2Mix: 0.4, detune: 1, osc2Semi: 12, subLevel: 0.35, fmDepth: 0, fmRatio: 1, cutoff: 7500, resonance: 0.8, filterMode: 0, filterEnv: 0.0, attack: 0.004, decay: 0.18, sustain: 0.5, release: 0.12, glide: 0.005, lfoRate: 8, lfoDepth: 0, lfoTarget: 0, drive: 0.1, chorus: 0.0, echoMix: 0.12, echoTime: 0.18, echoFB: 0.3, reverbMix: 0.05 },
  crystal:         { name: '🍷 Cristal Mágico FM', wave1: 6, wave2: 1, osc2Mix: 0.35, detune: 8, osc2Semi: 12, subLevel: 0.0, fmDepth: 360, fmRatio: 2.75, cutoff: 6200, resonance: 1.8, filterMode: 0, filterEnv: 0.35, attack: 0.02, decay: 0.8, sustain: 0.55, release: 2.6, glide: 0.02, lfoRate: 3.8, lfoDepth: 0.12, lfoTarget: 0, drive: 0.0, chorus: 0.48, echoMix: 0.38, echoTime: 0.38, echoFB: 0.48, reverbMix: 0.52 },
  alien:           { name: '🛸 Alienígena Ring/FM', wave1: 6, wave2: 2, osc2Mix: 0.5, detune: 15, osc2Semi: 7, subLevel: 0.2, fmDepth: 850, fmRatio: 0.5, cutoff: 3400, resonance: 5.5, filterMode: 1, filterEnv: 0.75, attack: 0.03, decay: 0.5, sustain: 0.6, release: 1.4, glide: 0.05, lfoRate: 7.5, lfoDepth: 0.45, lfoTarget: 0, drive: 0.25, chorus: 0.4, echoMix: 0.4, echoTime: 0.3, echoFB: 0.5, reverbMix: 0.4 }
};

// ============================================================================
// 3. ESCALAS Y PATRONES DE BATERÍA (De MoraChord + Piano ahhgag)
// ============================================================================

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const NOTE_NAMES_ES = ['Do','Do#','Re','Re#','Mi','Fa','Fa#','Sol','Sol#','La','La#','Si'];

const SCALES = {
  0:  { name: 'Mayor (Jónica)', intervals: [0,2,4,5,7,9,11,12], qual: ['maj','min','min','maj','maj','min','dim','maj'], roman: ['I','ii','iii','IV','V','vi','vii°','VIII'] },
  1:  { name: 'Menor Natural', intervals: [0,2,3,5,7,8,10,12], qual: ['min','dim','maj','min','min','maj','maj','min'], roman: ['i','ii°','bIII','iv','v','bVI','bVII','i'] },
  2:  { name: 'Menor Armónica', intervals: [0,2,3,5,7,8,11,12], qual: ['min','dim','aug','min','maj','maj','dim','min'], roman: ['i','ii°','bIII+','iv','V','bVI','vii°','i'] },
  3:  { name: 'Menor Melódica', intervals: [0,2,3,5,7,9,11,12], qual: ['min','min','aug','maj','maj','dim','dim','min'], roman: ['i','ii','bIII+','IV','V','vi°','vii°','i'] },
  4:  { name: 'Dórica', intervals: [0,2,3,5,7,9,10,12], qual: ['min','min','maj','maj','min','dim','maj','min'], roman: ['i','ii','bIII','IV','v','vi°','bVII','i'] },
  5:  { name: 'Frigia', intervals: [0,1,3,5,7,8,10,12], qual: ['min','maj','maj','min','dim','maj','min','min'], roman: ['i','bII','bIII','iv','v°','bVI','bvii','i'] },
  6:  { name: 'Lidia', intervals: [0,2,4,6,7,9,11,12], qual: ['maj','maj','min','dim','maj','min','min','maj'], roman: ['I','II','iii','#iv°','V','vi','vii','I'] },
  7:  { name: 'Mixolidia', intervals: [0,2,4,5,7,9,10,12], qual: ['maj','min','dim','maj','min','min','maj','maj'], roman: ['I','ii','iii°','IV','v','vi','bVII','I'] },
  9:  { name: 'Frigia Dominante (Árabe)', intervals: [0,1,4,5,7,8,10,12], qual: ['maj','maj','dim','min','dim','maj','min','maj'], roman: ['I','bII','iii°','iv','v°','bVI','bvii','I'] },
  11: { name: 'Húngara Menor', intervals: [0,2,3,6,7,8,11,12], qual: ['min','dim','aug','dim','maj','maj','dim','min'], roman: ['i','ii°','bIII+','#iv°','V','bVI','vii°','i'] },
  12: { name: 'Japonesa (Hirajoshi)', intervals: [0,2,3,7,8,12,14,15], qual: ['min','maj','min','min','maj','min','maj','min'], roman: ['i','II','bIII','v','bVI','i','II','bIII'] },
  13: { name: 'Pentatónica Mayor', intervals: [0,2,4,7,9,12,14,16], qual: ['maj','min','min','maj','min','maj','min','min'], roman: ['I','ii','iii','V','vi','I','ii','iii'] },
  14: { name: 'Pentatónica Menor', intervals: [0,3,5,7,10,12,15,17], qual: ['min','maj','min','min','maj','min','maj','min'], roman: ['i','bIII','iv','v','bVII','i','bIII','iv'] },
  15: { name: 'Blues', intervals: [0,3,5,6,7,10,12,15], qual: ['min','maj','min','dim','min','maj','min','min'], roman: ['i','bIII','iv','#iv°','v','bVII','i','bIII'] },
  16: { name: 'Libre (Cromática 12)', intervals: [0,1,2,3,4,5,6,7], qual: ['maj','min','maj','min','maj','maj','min','maj'], roman: ['I','bII','II','bIII','III','IV','bV','V'], isChromatic: true }
};

const DRUM_PATTERNS = {
  synth:     { kick:[1,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0], deepkick:[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0], hihat:[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], openhat:[0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0], ride:[1,0,0,0,0,0,1,0,1,0,0,0,0,0,1,0] },
  french:    { kick:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0], deepkick:[1,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0], snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,1], hihat:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0], openhat:[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0], ride:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0] },
  disco:     { kick:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0], deepkick:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0], hihat:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0], openhat:[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0], ride:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
  techno:    { kick:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0], deepkick:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0], snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0], hihat:[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0], openhat:[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0], ride:[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1] },
  rock:      { kick:[1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0], deepkick:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0], hihat:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0], openhat:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0], ride:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
  rockalt:   { kick:[1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0], deepkick:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0], hihat:[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], openhat:[0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0], ride:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
  hiphop:    { kick:[1,0,0,0,0,0,0,0,0,0,1,0,0,1,0,0], deepkick:[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0], hihat:[1,0,1,1,1,0,1,0,1,0,1,1,1,0,1,0], openhat:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0], ride:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
  trap:      { kick:[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], deepkick:[1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0], snare:[0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0], hihat:[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], openhat:[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1], ride:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
  dnb:       { kick:[1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0], deepkick:[1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0], snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0], hihat:[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], openhat:[0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0], ride:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0] },
  reggaeton: { kick:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0], deepkick:[1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0], snare:[0,0,0,1,0,0,1,0,0,0,0,1,0,0,1,0], hihat:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0], openhat:[0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0], ride:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
  cumbia:    { kick:[1,0,0,0,0,0,1,0,1,0,0,0,0,0,1,0], deepkick:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0], hihat:[0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0], openhat:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], ride:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
  bossa:     { kick:[1,0,0,0,0,0,1,0,1,0,0,0,0,0,1,0], deepkick:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], snare:[1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1], hihat:[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], openhat:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], ride:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0] },
  reggae:    { kick:[0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0], deepkick:[0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0], snare:[0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0], hihat:[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0], openhat:[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0], ride:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] }
};

const PAD_COLORS = ['#00d2ff', '#38bdf8', '#10b981', '#a855f7', '#f59e0b', '#f43f5e', '#ec4899', '#6366f1'];

// ============================================================================
// 4. ESTADO GLOBAL DEL SINTETIZADOR Y HARDWARE MINILAB 3
// ============================================================================

const synthParams = {
  wave1: 2,          // 2 = Sawtooth
  wave2: 3,          // 3 = Square
  osc2Mix: 0.35,
  detune: 8.0,
  osc2Semi: 0,
  subLevel: 0.40,
  fmDepth: 0,
  fmRatio: 2.0,
  cutoff: 3400,
  resonance: 1.8,
  filterMode: 0,     // 0 = lowpass
  filterEnv: 0.45,
  attack: 0.01,
  decay: 0.35,
  sustain: 0.70,
  release: 0.45,
  glide: 0.02,
  lfoRate: 4.5,
  lfoDepth: 0.08,
  lfoTarget: 0,
  drive: 0.10,
  chorus: 0.25,
  echoMix: 0.20,
  echoTime: 0.32,
  echoFB: 0.38,
  reverbMix: 0.20,
  bpm: 120,
  drumVol: 0.82,
  masterVol: 0.85
};

const hwState = {
  presetId: 'init_synth',
  sampleTimbre: 'grand',
  octave: 3,              // C3 a C5 (25 teclas: MIDI 48 a 72)
  keyOffset: 0,           // 0 = C
  scaleIdx: 0,            // 0 = Mayor
  showGuide: true,
  shiftHeld: false,
  holdActive: false,
  pitchBend: 0,           // -1 a +1 (±2 semitonos)
  modWheel: 0.15,         // 0 a 1
  padMode: 'chords',      // 'chords' | 'drums' | 'presets'
  chordMod: 'center',
  latchMode: 'off',
  activeChordNotes: [],   // Clases de nota (0..11) iluminadas en el teclado
  knobAssignments: [...KNOB_BANKS.synth],
  faderAssignments: [...FADER_BANKS.adsr],
  midiLearnActive: false,
  midiLearnTarget: null,  // { type: 'knob'|'fader'|'pad', index: 0..7 }
  customCCMap: {},        // ccNumber -> { type, index }
  customPadNoteMap: {},   // midiNote -> padIndex (0..7)
  encoderAngle: 0
};

// ============================================================================
// 5. MOTOR DE AUDIO WEB AUDIO API + SAMPLES DE PIANO AHHGAG
// ============================================================================

let actx = null;
let masterGain = null;
let masterLimiter = null;
let analyserNode = null;
let driveNode = null;
let chorusSendGain = null;
let delayNode = null;
let delayFeedbackGain = null;
let delaySendGain = null;
let reverbNode = null;
let reverbSendGain = null;
let drumMasterGain = null;
let pulseWave = null;
let noiseBuffer = null;

// Pool de voces polifónicas sin clics
const MAX_VOICES = 28;
let activeVoices = [];
const heldNotes = new Map();        // sourceId -> voice
const sustainedNotes = new Set();   // Set de voces sostenidas por HOLD
let lastPlayedFreq = null;

// Samples Reales Multi-Instrumento (FluidR3_GM Soundfonts: 24 Pianos, Órganos y Cuerdas/Violines)
const FLUID_BASE = 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/';
const SAMPLE_URLS = {
  // Pianos y Teclados
  grand:         `${FLUID_BASE}acoustic_grand_piano-mp3/`,
  bright:        `${FLUID_BASE}bright_acoustic_piano-mp3/`,
  rock:          `${FLUID_BASE}electric_grand_piano-mp3/`,
  cabaret:       `${FLUID_BASE}honkytonk_piano-mp3/`,
  rhodes:        `${FLUID_BASE}electric_piano_1-mp3/`,
  dx_ep:         `${FLUID_BASE}electric_piano_2-mp3/`,
  harpsichord:   `${FLUID_BASE}harpsichord-mp3/`,
  clavinet:      `${FLUID_BASE}clavinet-mp3/`,
  // Órganos y Acordeón
  hammond:       `${FLUID_BASE}drawbar_organ-mp3/`,
  perc_organ:    `${FLUID_BASE}percussive_organ-mp3/`,
  rock_organ:    `${FLUID_BASE}rock_organ-mp3/`,
  church_organ:  `${FLUID_BASE}church_organ-mp3/`,
  reed_organ:    `${FLUID_BASE}reed_organ-mp3/`,
  accordion:     `${FLUID_BASE}accordion-mp3/`,
  // Violines, Cuerdas y Orquesta
  violin:        `${FLUID_BASE}violin-mp3/`,
  viola:         `${FLUID_BASE}viola-mp3/`,
  cello:         `${FLUID_BASE}cello-mp3/`,
  contrabass:    `${FLUID_BASE}contrabass-mp3/`,
  strings1:      `${FLUID_BASE}string_ensemble_1-mp3/`,
  strings2:      `${FLUID_BASE}string_ensemble_2-mp3/`,
  synth_strings: `${FLUID_BASE}synth_strings_1-mp3/`,
  pizzicato:     `${FLUID_BASE}pizzicato_strings-mp3/`,
  harp:          `${FLUID_BASE}orchestral_harp-mp3/`,
  choir:         `${FLUID_BASE}choir_aahs-mp3/`
};

// Instrumentos de arco/aire que sostienen la nota indefinidamente mediante bucle suave
const SUSTAINED_SAMPLE_TIMBRES = new Set([
  'hammond', 'perc_organ', 'rock_organ', 'church_organ', 'reed_organ', 'accordion',
  'violin', 'viola', 'cello', 'contrabass', 'strings1', 'strings2', 'synth_strings', 'choir'
]);

const ORGAN_TIMBRES = new Set(['hammond', 'perc_organ', 'rock_organ', 'church_organ', 'reed_organ', 'accordion']);
const STRING_TIMBRES = new Set(['violin', 'viola', 'cello', 'contrabass', 'strings1', 'strings2', 'synth_strings', 'choir']);

// Notas de muestra de C2 (36) a C6 (84) usando bemoles (Eb, Gb) que son los nombres reales en FluidR3_GM
const SAMPLE_NOTES = [
  { name: 'C2',  midi: 36 }, { name: 'Eb2', midi: 39 }, { name: 'Gb2', midi: 42 }, { name: 'A2',  midi: 45 },
  { name: 'C3',  midi: 48 }, { name: 'Eb3', midi: 51 }, { name: 'Gb3', midi: 54 }, { name: 'A3',  midi: 57 },
  { name: 'C4',  midi: 60 }, { name: 'Eb4', midi: 63 }, { name: 'Gb4', midi: 66 }, { name: 'A4',  midi: 69 },
  { name: 'C5',  midi: 72 }, { name: 'Eb5', midi: 75 }, { name: 'Gb5', midi: 78 }, { name: 'A5',  midi: 81 },
  { name: 'C6',  midi: 84 }
];
const sampleBuffers = {};
const loadingTimbres = new Set();
const loadedTimbres = new Set();
const keyElementsByMidi = new Map();

function safeGet(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}
function safeSet(key, val) {
  try { localStorage.setItem(key, val); return true; } catch (e) { return false; }
}

function makeDistortionCurve(amount) {
  const n = 44100;
  const curve = new Float32Array(n);
  const k = Math.max(1, amount * 110);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((1 + k / 100) * x) / (1 + (k / 100) * Math.abs(x));
  }
  return curve;
}

function createReverbImpulse(ctx, duration = 2.4, decay = 2.2) {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * duration);
  const buf = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  return buf;
}

function initAudio() {
  if (actx) {
    if (actx.state === 'suspended') actx.resume();
    return;
  }
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  // Pedir buffer mínimo de hardware (0.004s) para eliminar latencia en celulares Android con USB-OTG
  try {
    actx = new AudioCtx({ latencyHint: 0.004 });
  } catch (e) {
    actx = new AudioCtx({ latencyHint: 'interactive' });
  }

  // Keep-Alive silencioso para evitar que el chip de audio de Android/iOS entre en suspensión entre notas MIDI
  try {
    const keepAliveOsc = actx.createOscillator();
    const keepAliveGain = actx.createGain();
    keepAliveOsc.frequency.value = 20;
    keepAliveGain.gain.value = 1e-7;
    keepAliveOsc.connect(keepAliveGain);
    keepAliveGain.connect(actx.destination);
    keepAliveOsc.start();
  } catch (e) {}

  // Onda de pulso estrecho (PWM 22% duty cycle)
  const real = new Float32Array(32);
  const imag = new Float32Array(32);
  for (let n = 1; n < 32; n++) {
    imag[n] = (2 / (n * Math.PI)) * (1 - Math.cos(n * Math.PI * 0.44));
    real[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * 0.44);
  }
  pulseWave = actx.createPeriodicWave(real, imag);

  // Buffer de ruido blanco analógico
  noiseBuffer = actx.createBuffer(1, actx.sampleRate * 2, actx.sampleRate);
  const nd = noiseBuffer.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

  // Cadena Master: Drive -> MasterGain -> (Dry + Chorus + Echo + Reverb) -> Limiter -> Analyser -> Destination
  driveNode = actx.createWaveShaper();
  driveNode.curve = makeDistortionCurve(synthParams.drive);
  driveNode.oversample = '2x';

  masterGain = actx.createGain();
  masterGain.gain.value = synthParams.masterVol;

  masterLimiter = actx.createDynamicsCompressor();
  masterLimiter.threshold.value = -5.0;
  masterLimiter.knee.value = 4.0;
  masterLimiter.ratio.value = 12.0;
  masterLimiter.attack.value = 0.002;
  masterLimiter.release.value = 0.08;

  analyserNode = actx.createAnalyser();
  analyserNode.fftSize = 512;

  driveNode.connect(masterGain);
  masterGain.connect(masterLimiter);

  // Chorus Estéreo tipo Juno
  chorusSendGain = actx.createGain();
  chorusSendGain.gain.value = synthParams.chorus * 0.45;
  const chorusDelayL = actx.createDelay(0.06);
  const chorusDelayR = actx.createDelay(0.06);
  chorusDelayL.delayTime.value = 0.016;
  chorusDelayR.delayTime.value = 0.022;
  const chorusLfo = actx.createOscillator();
  const chorusLfoGainL = actx.createGain();
  const chorusLfoGainR = actx.createGain();
  chorusLfo.type = 'sine';
  chorusLfo.frequency.value = 0.85;
  chorusLfoGainL.gain.value = 0.0035;
  chorusLfoGainR.gain.value = -0.0035;
  chorusLfo.connect(chorusLfoGainL);
  chorusLfo.connect(chorusLfoGainR);
  chorusLfoGainL.connect(chorusDelayL.delayTime);
  chorusLfoGainR.connect(chorusDelayR.delayTime);
  chorusLfo.start();
  masterGain.connect(chorusSendGain);
  chorusSendGain.connect(chorusDelayL);
  chorusSendGain.connect(chorusDelayR);
  chorusDelayL.connect(masterLimiter);
  chorusDelayR.connect(masterLimiter);

  // Eco / Delay con filtro cálido
  delaySendGain = actx.createGain();
  delaySendGain.gain.value = synthParams.echoMix;
  delayNode = actx.createDelay(2.5);
  delayNode.delayTime.value = synthParams.echoTime;
  delayFeedbackGain = actx.createGain();
  delayFeedbackGain.gain.value = synthParams.echoFB;
  const delayFilter = actx.createBiquadFilter();
  delayFilter.type = 'lowpass';
  delayFilter.frequency.value = 1800;

  masterGain.connect(delaySendGain);
  delaySendGain.connect(delayNode);
  delayNode.connect(delayFilter);
  delayFilter.connect(delayFeedbackGain);
  delayFeedbackGain.connect(delayNode);
  delayNode.connect(masterLimiter);

  // Reverb Convolver
  reverbNode = actx.createConvolver();
  reverbNode.buffer = createReverbImpulse(actx, 2.4, 2.2);
  reverbSendGain = actx.createGain();
  reverbSendGain.gain.value = synthParams.reverbMix;
  masterGain.connect(reverbSendGain);
  reverbSendGain.connect(reverbNode);
  reverbNode.connect(masterLimiter);

  // Bus de Batería
  drumMasterGain = actx.createGain();
  drumMasterGain.gain.value = synthParams.drumVol;
  drumMasterGain.connect(masterLimiter);

  masterLimiter.connect(analyserNode);
  analyserNode.connect(actx.destination);

  // Pre-cargar samples iniciales en segundo plano sin bloquear
  preloadPianoSamples(hwState.sampleTimbre || 'grand');
}

async function preloadPianoSamples(timbre) {
  if (!actx || loadingTimbres.has(timbre) || loadedTimbres.has(timbre)) return;
  const baseUrl = SAMPLE_URLS[timbre];
  if (!baseUrl) return;
  loadingTimbres.add(timbre);

  const loadNote = async item => {
    const key = `${timbre}_${item.midi}`;
    if (sampleBuffers[key]) return;
    try {
      const res = await fetch(`${baseUrl}${item.name}.mp3`);
      if (res.ok) {
        const arr = await res.arrayBuffer();
        sampleBuffers[key] = await actx.decodeAudioData(arr);
      }
    } catch (e) {
      // Si está sin conexión y aún no en caché, el motor usa síntesis de respaldo automáticamente
    }
  };

  // Cargar primero el registro central (C3..C5) en paralelo para respuesta instantánea
  const coreNotes = SAMPLE_NOTES.filter(n => n.midi >= 48 && n.midi <= 72);
  const outerNotes = SAMPLE_NOTES.filter(n => n.midi < 48 || n.midi > 72);
  await Promise.all(coreNotes.map(loadNote));
  await Promise.all(outerNotes.map(loadNote));

  loadingTimbres.delete(timbre);
  const hasAny = SAMPLE_NOTES.some(n => !!sampleBuffers[`${timbre}_${n.midi}`]);
  if (hasAny) loadedTimbres.add(timbre);
}

function getClosestPianoSample(timbre, midi) {
  let best = null;
  let minDiff = 999;
  for (const item of SAMPLE_NOTES) {
    const buf = sampleBuffers[`${timbre}_${item.midi}`];
    if (!buf) continue;
    const diff = Math.abs(item.midi - midi);
    if (diff < minDiff) {
      minDiff = diff;
      best = { buffer: buf, baseMidi: item.midi };
    }
  }
  return best;
}

// Congela la ganancia sin clic al soltar durante el Attack/Decay
function holdParamAtTime(audioParam, time) {
  if (typeof audioParam.cancelAndHoldAtTime === 'function') {
    audioParam.cancelAndHoldAtTime(time);
  } else {
    const curVal = audioParam.value;
    audioParam.cancelScheduledValues(time);
    audioParam.setValueAtTime(curVal, time);
  }
}

function stealOldestVoice() {
  const oldest = activeVoices.shift();
  if (!oldest || oldest.cleaned) return;
  oldest.isStopping = true;
  try {
    const now = actx.currentTime;
    holdParamAtTime(oldest.voiceGain.gain, now);
    oldest.voiceGain.gain.setTargetAtTime(0.0001, now, 0.003);
  } catch (e) {}
  setTimeout(() => cleanupVoice(oldest), 25);
}

function cleanupVoice(voice) {
  if (!voice || voice.cleaned) return;
  voice.cleaned = true;
  sustainedNotes.delete(voice);
  voice.sources.forEach(s => {
    try { s.stop(); } catch (e) {}
    try { s.disconnect(); } catch (e) {}
  });
  voice.nodes.forEach(n => {
    try { n.disconnect(); } catch (e) {}
  });
  const idx = activeVoices.indexOf(voice);
  if (idx !== -1) activeVoices.splice(idx, 1);
  if (voice.midi !== undefined && !isMidiStillActive(voice.midi)) {
    const keyEl = keyElementsByMidi.get(voice.midi);
    if (keyEl) keyEl.classList.remove('active');
  }
}

// Crear y disparar una voz de sintetizador / sample con todos los parámetros activos
function createSynthVoice(midi, velocity = 1.0, startTime = null, isChordVoice = false) {
  initAudio();
  while (activeVoices.length >= MAX_VOICES) {
    stealOldestVoice();
  }

  const now = startTime !== null ? startTime : actx.currentTime;
  const bendFactor = Math.pow(2, (hwState.pitchBend * 2) / 12);
  const baseFreq = 440 * Math.pow(2, (midi - 69) / 12);
  const targetFreq = baseFreq * bendFactor;
  const startFreq = (lastPlayedFreq && synthParams.glide > 0.006 && !isChordVoice)
    ? lastPlayedFreq * bendFactor
    : targetFreq;
  if (!isChordVoice) lastPlayedFreq = baseFreq;

  const sources = [];
  const nodes = [];
  const pitchedOscs = [];   // { osc, mult, semi }
  const sampleSources = []; // { src, baseRate }

  // Filtro Multimodo por voz
  const filter = actx.createBiquadFilter();
  const fModeObj = FILTER_MODES[Math.round(synthParams.filterMode)] || FILTER_MODES[0];
  filter.type = fModeObj.id;
  filter.Q.setValueAtTime(synthParams.resonance, now);

  // Envolvente al Filtro
  const baseCut = Math.max(60, Math.min(14000, synthParams.cutoff));
  const envAmt = synthParams.filterEnv;
  const peakCut = Math.max(60, Math.min(15000, baseCut * Math.pow(2, envAmt * 3.2)));
  const susCut = Math.max(60, Math.min(15000, baseCut + (peakCut - baseCut) * synthParams.sustain));
  const atk = Math.max(0.004, synthParams.attack);
  const dec = Math.max(0.02, synthParams.decay);

  filter.frequency.setValueAtTime(baseCut, now);
  filter.frequency.exponentialRampToValueAtTime(peakCut, now + atk);
  filter.frequency.exponentialRampToValueAtTime(susCut, now + atk + dec);
  nodes.push(filter);

  // Ganancia de Voz (Envolvente ADSR)
  const voiceGain = actx.createGain();
  const polyScale = isChordVoice ? 0.14 : 0.22;
  const velGain = Math.max(0.02, polyScale * velocity);
  const susGain = Math.max(0.001, velGain * synthParams.sustain);

  voiceGain.gain.setValueAtTime(0.0001, now);
  voiceGain.gain.linearRampToValueAtTime(velGain, now + atk);
  voiceGain.gain.setTargetAtTime(susGain, now + atk, dec / 3);
  nodes.push(voiceGain);

  // LFO por voz (conectado a Filtro, Pitch o Amp + Mod Strip)
  const totalLfoDepth = Math.min(1.0, synthParams.lfoDepth + hwState.modWheel * 0.65);
  if (totalLfoDepth > 0.01) {
    const lfo = actx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(synthParams.lfoRate, now);
    const lfoGain = actx.createGain();
    const targetIdx = Math.round(synthParams.lfoTarget);

    if (targetIdx === 0) {
      // Filtro Wobble
      lfoGain.gain.value = baseCut * totalLfoDepth * 0.7;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
    } else if (targetIdx === 2) {
      // Trémolo
      lfoGain.gain.value = velGain * totalLfoDepth * 0.45;
      lfo.connect(lfoGain);
      lfoGain.connect(voiceGain.gain);
    }
    lfo.start(now);
    sources.push(lfo);
    nodes.push(lfoGain);
    voiceGain._lfo = lfo;
    voiceGain._lfoGain = lfoGain;
  }

  // OSCILADOR 1 (Según Tipo de Onda elegido: 0..7)
  const w1Idx = Math.round(synthParams.wave1);
  const w1Type = WAVE_TYPES[w1Idx]?.id || 'sawtooth';

  if (w1Type === 'piano') {
    // Reproducir sample real (Piano, Órgano o Violín/Cuerdas) si ya está en memoria; si no, síntesis instantánea mientras descarga
    const timbre = hwState.sampleTimbre || 'grand';
    preloadPianoSamples(timbre);
    const sample = getClosestPianoSample(timbre, midi);
    if (sample && sample.buffer) {
      const src = actx.createBufferSource();
      src.buffer = sample.buffer;
      const baseRate = Math.pow(2, (midi - sample.baseMidi) / 12);
      src.playbackRate.setValueAtTime(baseRate * bendFactor, now);
      if ( synthParams.detune > 0.5 && src.detune ) {
        src.detune.setValueAtTime(-synthParams.detune * 0.35, now);
      }
      // Bucle continuo para Órganos, Violines, Chelos, Cuerdas, Acordeón y Coro
      if (SUSTAINED_SAMPLE_TIMBRES.has(timbre) && sample.buffer.duration > 1.35) {
        src.loop = true;
        src.loopStart = 0.55;
        src.loopEnd = Math.max(1.15, sample.buffer.duration - 0.35);
      }
      const sGain = actx.createGain();
      sGain.gain.value = STRING_TIMBRES.has(timbre) ? 2.85 : (ORGAN_TIMBRES.has(timbre) ? 2.65 : 3.2);
      src.connect(sGain);
      sGain.connect(filter);
      src.start(now);
      sources.push(src);
      nodes.push(sGain);
      sampleSources.push({ src, baseRate });
    } else if (ORGAN_TIMBRES.has(timbre)) {
      // Síntesis instantánea de Órgano Drawbar mientras descarga el MP3
      [1, 2, 3, 4].forEach((harm, idx) => {
        const osc = actx.createOscillator();
        const g = actx.createGain();
        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(startFreq * harm, now);
        g.gain.value = [0.45, 0.28, 0.16, 0.1][idx];
        osc.connect(g);
        g.connect(filter);
        osc.start(now);
        sources.push(osc);
        nodes.push(g);
        pitchedOscs.push({ osc, mult: harm, semi: 0 });
      });
    } else if (STRING_TIMBRES.has(timbre)) {
      // Síntesis instantánea de Violín / Cuerdas Frotadas mientras descarga el MP3
      [-9, 0, 9].forEach((det, idx) => {
        const osc = actx.createOscillator();
        const g = actx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(startFreq, now);
        osc.detune.value = det;
        g.gain.value = idx === 1 ? 0.34 : 0.22;
        osc.connect(g);
        g.connect(filter);
        osc.start(now);
        sources.push(osc);
        nodes.push(g);
        pitchedOscs.push({ osc, mult: 1, semi: 0 });
      });
    } else {
      // Síntesis instantánea de Piano Acústico mientras descarga el MP3
      const oscA = actx.createOscillator();
      const oscB = actx.createOscillator();
      oscA.type = 'triangle';
      oscB.type = 'sine';
      oscA.frequency.setValueAtTime(startFreq, now);
      oscB.frequency.setValueAtTime(startFreq, now);
      oscA.detune.value = -synthParams.detune;
      oscB.detune.value = synthParams.detune;
      oscA.connect(filter);
      oscB.connect(filter);
      oscA.start(now);
      oscB.start(now);
      sources.push(oscA, oscB);
      pitchedOscs.push({ osc: oscA, mult: 1, semi: 0 }, { osc: oscB, mult: 1, semi: 0 });
    }
  } else if (w1Type === 'supersaw') {
    const spread = Math.max(4, synthParams.detune);
    const factors = [-1.5, -1.0, -0.45, 0, 0.45, 1.0, 1.5];
    factors.forEach((f, idx) => {
      const osc = actx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(startFreq, now);
      if (startFreq !== targetFreq) osc.frequency.setTargetAtTime(targetFreq, now, synthParams.glide);
      osc.detune.value = f * spread;
      const g = actx.createGain();
      g.gain.value = idx === 3 ? 0.34 : 0.18;
      osc.connect(g);
      g.connect(filter);
      osc.start(now);
      sources.push(osc);
      nodes.push(g);
      pitchedOscs.push({ osc, mult: 1, semi: 0 });
    });
  } else if (w1Type === 'fm') {
    const carrier = actx.createOscillator();
    const mod = actx.createOscillator();
    const modGain = actx.createGain();
    carrier.type = 'sine';
    mod.type = 'sine';
    const ratio = synthParams.fmRatio || 2;
    const depth = Math.max(80, synthParams.fmDepth || 320);
    carrier.frequency.setValueAtTime(startFreq, now);
    mod.frequency.setValueAtTime(startFreq * ratio, now);
    if (startFreq !== targetFreq) {
      carrier.frequency.setTargetAtTime(targetFreq, now, synthParams.glide);
      mod.frequency.setTargetAtTime(targetFreq * ratio, now, synthParams.glide);
    }
    modGain.gain.setValueAtTime(depth, now);
    modGain.gain.exponentialRampToValueAtTime(Math.max(10, depth * synthParams.sustain), now + atk + dec);
    mod.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(filter);
    carrier.start(now);
    mod.start(now);
    sources.push(carrier, mod);
    nodes.push(modGain);
    pitchedOscs.push({ osc: carrier, mult: 1, semi: 0 }, { osc: mod, mult: ratio, semi: 0 });
  } else {
    // Sine, Triangle, Sawtooth, Square, o Pulse PWM
    const osc1 = actx.createOscillator();
    if (w1Type === 'pulse' && pulseWave) {
      osc1.setPeriodicWave(pulseWave);
    } else {
      osc1.type = w1Type;
    }
    osc1.frequency.setValueAtTime(startFreq, now);
    if (startFreq !== targetFreq) osc1.frequency.setTargetAtTime(targetFreq, now, synthParams.glide);
    osc1.detune.value = -synthParams.detune * 0.5;
    osc1.connect(filter);
    osc1.start(now);
    sources.push(osc1);
    pitchedOscs.push({ osc: osc1, mult: 1, semi: 0 });

    // Si hay FM Depth > 0 en cualquier onda, sumar modulador FM!
    if (synthParams.fmDepth > 5) {
      const fmOsc = actx.createOscillator();
      const fmGain = actx.createGain();
      fmOsc.type = 'sine';
      fmOsc.frequency.setValueAtTime(startFreq * synthParams.fmRatio, now);
      fmGain.gain.value = synthParams.fmDepth;
      fmOsc.connect(fmGain);
      fmGain.connect(osc1.frequency);
      fmOsc.start(now);
      sources.push(fmOsc);
      nodes.push(fmGain);
      pitchedOscs.push({ osc: fmOsc, mult: synthParams.fmRatio, semi: 0 });
    }
  }

  // OSCILADOR 2 (Secundario / Unison / Armónico / Ruido)
  const w2Idx = Math.round(synthParams.wave2);
  const w2Type = WAVE2_TYPES[w2Idx]?.id || 'off';
  if (w2Type !== 'off' && synthParams.osc2Mix > 0.01) {
    const osc2Gain = actx.createGain();
    osc2Gain.gain.value = synthParams.osc2Mix * 0.75;
    nodes.push(osc2Gain);

    if (w2Type === 'noise' && noiseBuffer) {
      const nSrc = actx.createBufferSource();
      nSrc.buffer = noiseBuffer;
      nSrc.loop = true;
      nSrc.connect(osc2Gain);
      osc2Gain.connect(filter);
      nSrc.start(now);
      sources.push(nSrc);
    } else {
      const osc2 = actx.createOscillator();
      osc2.type = w2Type;
      const semiRatio = Math.pow(2, synthParams.osc2Semi / 12);
      osc2.frequency.setValueAtTime(startFreq * semiRatio, now);
      if (startFreq !== targetFreq) {
        osc2.frequency.setTargetAtTime(targetFreq * semiRatio, now, synthParams.glide);
      }
      osc2.detune.value = synthParams.detune;
      osc2.connect(osc2Gain);
      osc2Gain.connect(filter);
      osc2.start(now);
      sources.push(osc2);
      pitchedOscs.push({ osc: osc2, mult: 1, semi: synthParams.osc2Semi });
      voiceGain._osc2Gain = osc2Gain;
    }
  }

  // SUB-OSCILADOR (-1 Octava)
  if (synthParams.subLevel > 0.01) {
    const subOsc = actx.createOscillator();
    const subGain = actx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(startFreq * 0.5, now);
    if (startFreq !== targetFreq) subOsc.frequency.setTargetAtTime(targetFreq * 0.5, now, synthParams.glide);
    subGain.gain.value = synthParams.subLevel * 0.65;
    subOsc.connect(subGain);
    subGain.connect(filter);
    subOsc.start(now);
    sources.push(subOsc);
    nodes.push(subGain);
    pitchedOscs.push({ osc: subOsc, mult: 0.5, semi: 0 });
    voiceGain._subGain = subGain;
  }

  // Vibrato LFO al Pitch si el destino es Pitch (1) o si hay ModWheel (funciona en Osciladores y en Samples!)
  if ((Math.round(synthParams.lfoTarget) === 1 && totalLfoDepth > 0.01) || hwState.modWheel > 0.15) {
    const vibLfo = actx.createOscillator();
    const vibGain = actx.createGain();
    vibLfo.type = 'sine';
    vibLfo.frequency.value = synthParams.lfoRate;
    vibGain.gain.value = (Math.round(synthParams.lfoTarget) === 1 ? totalLfoDepth * 35 : hwState.modWheel * 22);
    vibLfo.connect(vibGain);
    pitchedOscs.forEach(po => {
      try { vibGain.connect(po.osc.detune); } catch (e) {}
    });
    sampleSources.forEach(ss => {
      try { if (ss.src.detune) vibGain.connect(ss.src.detune); } catch (e) {}
    });
    vibLfo.start(now);
    sources.push(vibLfo);
    nodes.push(vibGain);
  }

  filter.connect(voiceGain);
  voiceGain.connect(driveNode);

  const voice = {
    midi,
    baseFreq,
    filter,
    voiceGain,
    sources,
    nodes,
    pitchedOscs,
    sampleSources,
    startTime: now,
    cleaned: false,
    isStopping: false
  };

  activeVoices.push(voice);
  return voice;
}

function stopSynthVoice(voice, atTime = null) {
  if (!voice || voice.cleaned || voice.isStopping) return;
  voice.isStopping = true;
  const now = actx ? actx.currentTime : 0;
  const t = atTime !== null ? Math.max(now, atTime) : now;
  const rel = Math.max(0.03, synthParams.release);
  const minAttackGate = Math.max(0.035, Math.min(0.16, synthParams.attack * 0.8));
  const stopT = Math.max(t, voice.startTime + minAttackGate);

  try {
    holdParamAtTime(voice.voiceGain.gain, stopT);
    voice.voiceGain.gain.setTargetAtTime(0.0001, stopT, rel / 3.2);
    holdParamAtTime(voice.filter.frequency, stopT);
    voice.filter.frequency.setTargetAtTime(Math.max(60, synthParams.cutoff * 0.6), stopT, rel / 2.5);
  } catch (e) {}

  const cleanupDelayMs = Math.max(50, (stopT - now + rel + 0.12) * 1000);
  setTimeout(() => cleanupVoice(voice), cleanupDelayMs);
}

// Actualizar voces activas en vivo cuando se gira una perilla o fader o Pitch Bend
function updateActiveVoicesLive(paramKey) {
  if (!actx) return;
  const now = actx.currentTime;

  if (paramKey === 'drive' && driveNode) {
    driveNode.curve = makeDistortionCurve(synthParams.drive);
  }
  if (paramKey === 'chorus' && chorusSendGain) {
    chorusSendGain.gain.setTargetAtTime(synthParams.chorus * 0.45, now, 0.02);
  }
  if (paramKey === 'echoMix' && delaySendGain) {
    delaySendGain.gain.setTargetAtTime(synthParams.echoMix, now, 0.02);
  }
  if (paramKey === 'echoTime' && delayNode) {
    delayNode.delayTime.setTargetAtTime(synthParams.echoTime, now, 0.03);
  }
  if (paramKey === 'echoFB' && delayFeedbackGain) {
    delayFeedbackGain.gain.setTargetAtTime(synthParams.echoFB, now, 0.02);
  }
  if (paramKey === 'reverbMix' && reverbSendGain) {
    reverbSendGain.gain.setTargetAtTime(synthParams.reverbMix, now, 0.02);
  }
  if (paramKey === 'drumVol' && drumMasterGain) {
    drumMasterGain.gain.setTargetAtTime(synthParams.drumVol, now, 0.02);
  }
  if (paramKey === 'masterVol' && masterGain) {
    masterGain.gain.setTargetAtTime(synthParams.masterVol, now, 0.02);
  }

  const bendFactor = Math.pow(2, (hwState.pitchBend * 2) / 12);

  activeVoices.forEach(v => {
    if (!v || v.cleaned || v.isStopping) return;

    if (paramKey === 'cutoff') {
      v.filter.frequency.setTargetAtTime(synthParams.cutoff, now, 0.015);
    } else if (paramKey === 'resonance') {
      v.filter.Q.setTargetAtTime(synthParams.resonance, now, 0.015);
    } else if (paramKey === 'filterMode') {
      const fm = FILTER_MODES[Math.round(synthParams.filterMode)] || FILTER_MODES[0];
      v.filter.type = fm.id;
    } else if (paramKey === 'wave1') {
      const wType = WAVE_TYPES[Math.round(synthParams.wave1)]?.id;
      if (wType && ['sine', 'triangle', 'sawtooth', 'square', 'pulse'].includes(wType)) {
        v.pitchedOscs.forEach((po, idx) => {
          if (idx === 0 && po.mult === 1) {
            try {
              if (wType === 'pulse' && pulseWave) po.osc.setPeriodicWave(pulseWave);
              else po.osc.type = wType;
            } catch (e) {}
          }
        });
      }
    } else if (paramKey === 'detune') {
      v.pitchedOscs.forEach((po, idx) => {
        try { po.osc.detune.setTargetAtTime((idx % 2 === 0 ? -1 : 1) * synthParams.detune, now, 0.02); } catch (e) {}
      });
    } else if (paramKey === 'pitchBend' || paramKey === 'osc2Semi') {
      v.pitchedOscs.forEach(po => {
        const semiMult = Math.pow(2, (po.semi ? synthParams.osc2Semi : 0) / 12);
        const f = v.baseFreq * po.mult * semiMult * bendFactor;
        try { po.osc.frequency.setTargetAtTime(f, now, 0.01); } catch (e) {}
      });
      if (v.sampleSources) {
        v.sampleSources.forEach(ss => {
          try { ss.src.playbackRate.setTargetAtTime(ss.baseRate * bendFactor, now, 0.01); } catch (e) {}
        });
      }
    } else if (paramKey === 'subLevel' && v.voiceGain._subGain) {
      v.voiceGain._subGain.gain.setTargetAtTime(synthParams.subLevel * 0.65, now, 0.02);
    } else if (paramKey === 'osc2Mix' && v.voiceGain._osc2Gain) {
      v.voiceGain._osc2Gain.gain.setTargetAtTime(synthParams.osc2Mix * 0.75, now, 0.02);
    }
  });
}

// ============================================================================
// 6. DISPARO DE NOTAS, HOLD/SUSTAIN Y ACORDES
// ============================================================================

function isMidiStillActive(midi) {
  for (const v of heldNotes.values()) {
    if (v && v.midi === midi && !v.cleaned && !v.isStopping) return true;
  }
  for (const v of sustainedNotes.values()) {
    if (v && v.midi === midi && !v.cleaned && !v.isStopping) return true;
  }
  return false;
}

function noteOn(midi, velocity = 1.0, sourceId = `m_${midi}`) {
  initAudio();
  if (heldNotes.has(sourceId)) {
    const oldV = heldNotes.get(sourceId);
    heldNotes.delete(sourceId);
    stopSynthVoice(oldV);
  }
  // Si esa misma nota MIDI ya estaba sostenida por HOLD, detener la voz previa de esa nota para no duplicarla
  for (const sv of [...sustainedNotes]) {
    if (sv.midi === midi) {
      sustainedNotes.delete(sv);
      stopSynthVoice(sv);
    }
  }

  const v = createSynthVoice(midi, velocity, null, false);
  heldNotes.set(sourceId, v);

  const keyEl = keyElementsByMidi.get(midi);
  if (keyEl) keyEl.classList.add('active');

  const nName = NOTE_NAMES[midi % 12] + (Math.floor(midi / 12) - 1);
  const esName = NOTE_NAMES_ES[midi % 12];
  updateOledDisplay(null, `♪ ${nName} (${esName})`, `${Math.round(440 * Math.pow(2, (midi - 69) / 12))} Hz`);
}

function noteOff(midi, sourceId = `m_${midi}`) {
  if (!heldNotes.has(sourceId)) {
    if (!isMidiStillActive(midi)) {
      const keyEl = keyElementsByMidi.get(midi);
      if (keyEl) keyEl.classList.remove('active');
    }
    return;
  }

  const v = heldNotes.get(sourceId);
  heldNotes.delete(sourceId);

  if (hwState.holdActive && v) {
    // Mantener la voz en el Set de notas sostenidas y dejar la tecla iluminada mientras HOLD esté activo
    sustainedNotes.add(v);
    const keyEl = keyElementsByMidi.get(midi);
    if (keyEl) keyEl.classList.add('active');
  } else {
    stopSynthVoice(v);
    if (!isMidiStillActive(midi)) {
      const keyEl = keyElementsByMidi.get(midi);
      if (keyEl) keyEl.classList.remove('active');
    }
  }
}

function releaseAllSustained() {
  const toStop = [...sustainedNotes];
  sustainedNotes.clear();
  toStop.forEach(v => {
    stopSynthVoice(v);
    if (v && !isMidiStillActive(v.midi)) {
      const keyEl = keyElementsByMidi.get(v.midi);
      if (keyEl) keyEl.classList.remove('active');
    }
  });
}

function panicStopAll() {
  const heldCopy = [...heldNotes.values()];
  heldNotes.clear();
  heldCopy.forEach(v => cleanupVoice(v));

  const sustainedCopy = [...sustainedNotes];
  sustainedNotes.clear();
  sustainedCopy.forEach(v => cleanupVoice(v));

  if (typeof activeTouchPointers !== 'undefined') activeTouchPointers.clear();
  if (typeof pressedPcKeys !== 'undefined') pressedPcKeys.clear();
  if (typeof pressedPcPads !== 'undefined') pressedPcPads.clear();

  stopAllPadVoices();
  stopLatchedChord();
  if (isPlayingDrums) toggleBeat();

  // Iterar sobre una copia de activeVoices para que .splice() dentro de cleanupVoice no saltee voces
  const allVoicesCopy = [...activeVoices];
  allVoicesCopy.forEach(v => cleanupVoice(v));
  activeVoices = [];

  keyElementsByMidi.forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.rgb-pad.active').forEach(el => el.classList.remove('active'));
  updateOledDisplay('🛑 STOP ALL', 'Audio Silenciado', 'Listo');
}

// ============================================================================
// 7. ACORDES INTELIGENTES (MoraChord + Guía Luminosa de Piano ahhgag)
// ============================================================================

let latchedChordState = null; // { padIdx, rootMidi, qual, name, voices: [] }
const padActiveVoices = Array.from({ length: 8 }, () => []);
const padReleaseTimers = new Array(8).fill(null);
const padHoldTimers = new Array(8).fill(null);
const padDownTimestamps = new Array(8).fill(0);

function stopAllPadVoices(exceptIdx = -1) {
  for (let idx = 0; idx < 8; idx++) {
    if (idx === exceptIdx) continue;
    if (padReleaseTimers[idx]) {
      clearTimeout(padReleaseTimers[idx]);
      padReleaseTimers[idx] = null;
    }
    if (padActiveVoices[idx] && padActiveVoices[idx].length > 0) {
      padActiveVoices[idx].forEach(v => stopSynthVoice(v));
      padActiveVoices[idx] = [];
    }
    const el = document.getElementById(`rgb-pad-${idx}`);
    if (el) el.classList.remove('active');
  }
}

function getChordIntervals(baseQual, mod) {
  const bass = -12;
  if (mod === 'center') {
    if (baseQual === 'maj') return { i: [bass, 0, 4, 7], s: '' };
    if (baseQual === 'min') return { i: [bass, 0, 3, 7], s: 'm' };
    if (baseQual === 'dim') return { i: [bass, 0, 3, 6], s: 'dim' };
    if (baseQual === 'aug') return { i: [bass, 0, 4, 8], s: 'aug' };
  } else if (mod === 'flip') {
    return baseQual === 'maj' ? { i: [bass, 0, 3, 7], s: 'm' } : { i: [bass, 0, 4, 7], s: '' };
  } else if (mod === '7th') {
    return baseQual === 'maj' ? { i: [bass, 0, 4, 7, 11], s: 'Maj7' } : { i: [bass, 0, 3, 7, 10], s: 'm7' };
  } else if (mod === 'dom7') {
    return { i: [bass, 0, 4, 7, 10], s: '7' };
  } else if (mod === '9th') {
    return baseQual === 'maj' ? { i: [bass, 0, 4, 7, 11, 14], s: 'Maj9' } : { i: [bass, 0, 3, 7, 10, 14], s: 'm9' };
  } else if (mod === 'sus4') {
    return { i: [bass, 0, 5, 7], s: 'sus4' };
  } else if (mod === '6th') {
    return baseQual === 'maj' ? { i: [bass, 0, 4, 7, 9], s: '6' } : { i: [bass, 0, 3, 7, 9], s: 'm6' };
  } else if (mod === 'dim') {
    return { i: [bass, 0, 3, 6, 9], s: 'dim7' };
  } else if (mod === 'aug') {
    return { i: [bass, 0, 4, 8], s: '+' };
  }
  return { i: [bass, 0, 4, 7], s: '' };
}

function getDegreeChordInfo(padIdx) {
  const scale = SCALES[hwState.scaleIdx] || SCALES[0];
  const rootMidi = (hwState.octave + 1) * 12 + hwState.keyOffset + scale.intervals[padIdx];
  const baseQual = scale.qual[padIdx] || 'maj';
  const { i, s } = getChordIntervals(baseQual, hwState.chordMod);
  const rootName = NOTE_NAMES[(rootMidi % 12 + 12) % 12];
  const roman = scale.roman[padIdx] || '';
  return { rootMidi, baseQual, intervals: i, name: `${rootName}${s}`, roman };
}

function highlightChordOnKeys(intervals, rootMidi) {
  hwState.activeChordNotes = intervals.filter(iv => iv >= 0).map(iv => (rootMidi + iv) % 12);
  keyElementsByMidi.forEach((k, m) => {
    k.classList.toggle('chord-tone', hwState.showGuide && hwState.activeChordNotes.includes(m % 12));
  });
}

function stopLatchedChord() {
  if (latchedChordState && latchedChordState.voices) {
    latchedChordState.voices.forEach(v => stopSynthVoice(v));
  }
  latchedChordState = null;
  document.querySelectorAll('.rgb-pad.latched').forEach(p => p.classList.remove('latched'));
  checkStopSequencerClock();
}

function triggerChordPadDown(padIdx, velocity = 0.9) {
  initAudio();
  const padEl = document.getElementById(`rgb-pad-${padIdx}`);
  const info = getDegreeChordInfo(padIdx);
  highlightChordOnKeys(info.intervals, info.rootMidi);
  updateOledDisplay(`🎼 Acorde ${info.name}`, `PAD ${padIdx + 1} · Grado ${info.roman}`, info.name);

  padDownTimestamps[padIdx] = performance.now();
  if (padReleaseTimers[padIdx]) {
    clearTimeout(padReleaseTimers[padIdx]);
    padReleaseTimers[padIdx] = null;
  }

  const lMode = hwState.latchMode;
  if (lMode === 'off' && !hwState.holdActive) {
    // Detener acordes previos de otros pads para transición limpia
    stopAllPadVoices();
    const vel = Math.max(0.65, Math.min(1.0, velocity));
    const voices = info.intervals.map(iv => createSynthVoice(info.rootMidi + iv, vel, null, true));
    padActiveVoices[padIdx] = voices;
    if (padEl) padEl.classList.add('active');
  } else if (lMode === 'pad' || hwState.holdActive) {
    stopAllPadVoices();
    if (latchedChordState && latchedChordState.padIdx === padIdx) {
      stopLatchedChord();
      return;
    }
    stopLatchedChord();
    const voices = info.intervals.map(iv => createSynthVoice(info.rootMidi + iv, 0.85, null, true));
    latchedChordState = { padIdx, ...info, voices };
    if (padEl) padEl.classList.add('latched');
  } else {
    // Modos rítmicos / Arpegiador (4x, arp_up, arp_down, arp_updown, arp_random, on_the_run, seq_16)
    stopAllPadVoices();
    if (latchedChordState && latchedChordState.padIdx === padIdx) {
      stopLatchedChord();
      return;
    }
    stopLatchedChord();
    latchedChordState = { padIdx, ...info, voices: [] };
    if (padEl) padEl.classList.add('latched');
    ensureSequencerClock();
  }
}

function triggerChordPadUp(padIdx) {
  const releaseNow = () => {
    padReleaseTimers[padIdx] = null;
    const padEl = document.getElementById(`rgb-pad-${padIdx}`);
    if (padEl) padEl.classList.remove('active');
    if (padActiveVoices[padIdx] && padActiveVoices[padIdx].length > 0) {
      padActiveVoices[padIdx].forEach(v => stopSynthVoice(v));
      padActiveVoices[padIdx] = [];
    }
  };

  if (hwState.latchMode === 'off' && !hwState.holdActive) {
    const elapsed = performance.now() - (padDownTimestamps[padIdx] || 0);
    // Si fue un toque rápido o golpe de pad físico MIDI (< 260ms), sostener al menos 320ms musicales
    if (elapsed < 260) {
      if (padReleaseTimers[padIdx]) clearTimeout(padReleaseTimers[padIdx]);
      padReleaseTimers[padIdx] = setTimeout(releaseNow, Math.max(90, 320 - elapsed));
      return;
    }
  }
  releaseNow();
}

// ============================================================================
// 8. CAJA DE RITMOS Y SECUENCIADOR DE 16 PASOS (De MoraChord)
// ============================================================================

let isPlayingDrums = false;
let isClockRunning = false;
let currentStep = 0;
let nextStepTime = 0;
let clockTimer = null;
let currentDrumSteps = JSON.parse(JSON.stringify(DRUM_PATTERNS.synth));
let synthSeqSteps = [0, 3, 7, 12, 10, 7, 15, 12, 0, 3, 5, 7, 10, 8, 7, 3].map((p, i) => ({
  pitch: p,
  gate: true,
  slide: i % 4 === 2
}));

function playKick(time) {
  initAudio();
  const osc = actx.createOscillator();
  const gain = actx.createGain();
  osc.frequency.setValueAtTime(145, time);
  osc.frequency.exponentialRampToValueAtTime(32, time + 0.12);
  gain.gain.setValueAtTime(0.95, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.42);
  osc.connect(gain);
  gain.connect(drumMasterGain);
  osc.start(time);
  osc.stop(time + 0.44);
}

function playDeepKick(time) {
  initAudio();
  const osc = actx.createOscillator();
  const gain = actx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(92, time);
  osc.frequency.exponentialRampToValueAtTime(34, time + 0.14);
  gain.gain.setValueAtTime(0.9, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.65);
  osc.connect(gain);
  gain.connect(drumMasterGain);
  osc.start(time);
  osc.stop(time + 0.68);
}

function playSnare(time) {
  initAudio();
  const noise = actx.createBufferSource();
  noise.buffer = noiseBuffer;
  const filter = actx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 900;
  const nGain = actx.createGain();
  nGain.gain.setValueAtTime(0.75, time);
  nGain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
  noise.connect(filter);
  filter.connect(nGain);
  nGain.connect(drumMasterGain);
  noise.start(time);
  noise.stop(time + 0.2);

  const body = actx.createOscillator();
  const bGain = actx.createGain();
  body.type = 'triangle';
  body.frequency.setValueAtTime(210, time);
  body.frequency.exponentialRampToValueAtTime(110, time + 0.08);
  bGain.gain.setValueAtTime(0.55, time);
  bGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
  body.connect(bGain);
  bGain.connect(drumMasterGain);
  body.start(time);
  body.stop(time + 0.14);
}

function playHiHat(time, open = false) {
  initAudio();
  const noise = actx.createBufferSource();
  noise.buffer = noiseBuffer;
  const filter = actx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = open ? 4200 : 5800;
  const dur = open ? 0.32 : 0.065;
  const gain = actx.createGain();
  gain.gain.setValueAtTime(0.32, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(drumMasterGain);
  noise.start(time);
  noise.stop(time + dur + 0.02);
}

function playRide(time) {
  initAudio();
  const noise = actx.createBufferSource();
  noise.buffer = noiseBuffer;
  const bp = actx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 5200;
  bp.Q.value = 2.5;
  const gain = actx.createGain();
  gain.gain.setValueAtTime(0.18, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
  noise.connect(bp);
  bp.connect(gain);
  gain.connect(drumMasterGain);
  noise.start(time);
  noise.stop(time + 0.2);
}

function ensureSequencerClock() {
  initAudio();
  if (!isClockRunning) {
    isClockRunning = true;
    currentStep = 0;
    nextStepTime = actx.currentTime + 0.04;
    runClockScheduler();
  }
}

function checkStopSequencerClock() {
  const needsArp = latchedChordState && hwState.latchMode !== 'off' && hwState.latchMode !== 'pad';
  if (!isPlayingDrums && !needsArp && isClockRunning) {
    isClockRunning = false;
    if (clockTimer) {
      clearTimeout(clockTimer);
      clockTimer = null;
    }
  }
}

function scheduleStep(step, time) {
  // 1. Batería
  if (isPlayingDrums) {
    if (currentDrumSteps.kick[step]) playKick(time);
    if (currentDrumSteps.deepkick[step]) playDeepKick(time);
    if (currentDrumSteps.snare[step]) playSnare(time);
    if (currentDrumSteps.hihat[step]) playHiHat(time, false);
    if (currentDrumSteps.openhat[step]) playHiHat(time, true);
    if (currentDrumSteps.ride[step]) playRide(time);
  }

  // 2. Arpegiador / Latch Rítmico
  if (latchedChordState && hwState.latchMode !== 'off' && hwState.latchMode !== 'pad') {
    const mode = hwState.latchMode;
    const beatDur = 60 / synthParams.bpm;
    const tones = latchedChordState.intervals;
    const root = latchedChordState.rootMidi;

    if (mode === '4x' && step % 4 === 0) {
      tones.forEach(iv => {
        const v = createSynthVoice(root + iv, 0.78, time, true);
        stopSynthVoice(v, time + beatDur * 0.7);
      });
    } else if (mode.startsWith('arp_') || mode === 'on_the_run' || mode === 'seq_16') {
      let noteMidi = null;
      let gate = beatDur * 0.22;

      if (mode === 'arp_up') {
        noteMidi = root + tones[step % tones.length];
      } else if (mode === 'arp_down') {
        noteMidi = root + tones[tones.length - 1 - (step % tones.length)];
      } else if (mode === 'arp_updown') {
        const cycle = Math.max(1, tones.length * 2 - 2);
        const pos = step % cycle;
        const idx = pos < tones.length ? pos : cycle - pos;
        noteMidi = root + tones[idx];
      } else if (mode === 'arp_random') {
        noteMidi = root + tones[Math.floor(Math.random() * tones.length)];
      } else if (mode === 'on_the_run') {
        const otr = [0, 3, 7, 12, 10, 7, 15, 12];
        noteMidi = root + otr[step % 8];
      } else if (mode === 'seq_16') {
        const st = synthSeqSteps[step % 16];
        if (st && st.gate) {
          noteMidi = root + st.pitch;
          if (st.slide) gate = beatDur * 0.46;
        }
      }

      if (noteMidi !== null) {
        const v = createSynthVoice(noteMidi, 0.85, time, false);
        stopSynthVoice(v, time + gate);
      }
    }
  }
}

function runClockScheduler() {
  if (!isClockRunning) return;
  while (nextStepTime < actx.currentTime + 0.1) {
    scheduleStep(currentStep, nextStepTime);
    const stepDur = (60 / synthParams.bpm) * 0.25;
    nextStepTime += stepDur;
    currentStep = (currentStep + 1) % 16;
  }
  clockTimer = setTimeout(runClockScheduler, 25);
}

function toggleBeat() {
  initAudio();
  isPlayingDrums = !isPlayingDrums;
  const btn = document.getElementById('btn-deck-beat');
  if (btn) btn.classList.toggle('active', isPlayingDrums);
  if (isPlayingDrums) {
    ensureSequencerClock();
    updateOledDisplay('🥁 BEAT ON', document.getElementById('drum-pattern-select').selectedOptions[0].text, `${Math.round(synthParams.bpm)} BPM`);
  } else {
    checkStopSequencerClock();
    updateOledDisplay('🥁 BEAT OFF', 'Ritmo Detenido', `${Math.round(synthParams.bpm)} BPM`);
  }
  renderRgbPads();
}

// ============================================================================
// 9. RENDERIZADO DEL HARDWARE ARTURIA MINILAB 3 (8 KNOBS, 4 FADERS, 8 PADS, 25 TECLAS)
// ============================================================================

function getNormalizedParamValue(key) {
  const def = PARAM_DEFS[key];
  if (!def) return 0.5;
  const val = synthParams[key];
  if (def.log) {
    const minL = Math.log(def.min);
    const maxL = Math.log(def.max);
    return Math.max(0, Math.min(1, (Math.log(Math.max(def.min, val)) - minL) / (maxL - minL)));
  }
  return Math.max(0, Math.min(1, (val - def.min) / (def.max - def.min)));
}

function setNormalizedParamValue(key, norm) {
  const def = PARAM_DEFS[key];
  if (!def) return;
  const clamped = Math.max(0, Math.min(1, norm));
  let val;
  if (def.log) {
    const minL = Math.log(def.min);
    const maxL = Math.log(def.max);
    val = Math.exp(minL + clamped * (maxL - minL));
  } else {
    val = def.min + clamped * (def.max - def.min);
  }
  if (def.step >= 1) val = Math.round(val);
  else val = Math.round(val / def.step) * def.step;

  synthParams[key] = val;
  updateActiveVoicesLive(key);
  refreshKnobsAndFadersUI();
  updateOledDisplay(`🎛️ ${def.name}`, def.fmt(val), `${Math.round(clamped * 100)}%`, clamped);
}

// Construye las 8 Perillas (2x4)
function renderKnobsGrid() {
  const grid = document.getElementById('knobs-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const radius = 17;
  const arcLen = 2 * Math.PI * radius * 0.75; // 270 grados
  const fullCircle = 2 * Math.PI * radius;

  for (let i = 0; i < 8; i++) {
    const paramKey = hwState.knobAssignments[i] || 'cutoff';
    const def = PARAM_DEFS[paramKey] || PARAM_DEFS.cutoff;
    const cell = document.createElement('div');
    cell.className = 'knob-cell';
    cell.id = `knob-cell-${i}`;

    cell.innerHTML = `
      <span class="knob-num-badge">K${i + 1}</span>
      <span class="knob-val-badge" id="knob-val-${i}">${def.fmt(synthParams[paramKey])}</span>
      <div class="knob-cap-wrap" id="knob-wrap-${i}" title="Arrastrá verticalmente para girar | Rueda del mouse | Doble click para elegir qué controla">
        <svg class="knob-svg" viewBox="0 0 42 42">
          <circle class="knob-track-arc" cx="21" cy="21" r="${radius}" stroke-dasharray="${arcLen} ${fullCircle}"></circle>
          <circle class="knob-val-arc" id="knob-arc-${i}" cx="21" cy="21" r="${radius}" stroke-dasharray="0 ${fullCircle}"></circle>
        </svg>
        <div class="knob-rotor" id="knob-rotor-${i}">
          <div class="knob-pointer"></div>
        </div>
      </div>
      <button class="param-assign-btn" id="knob-assign-${i}" title="Click para cambiar el control asignado a la Perilla ${i + 1}">
        ▾ ${def.short}
      </button>
    `;

    grid.appendChild(cell);

    const wrap = cell.querySelector(`#knob-wrap-${i}`);
    const assignBtn = cell.querySelector(`#knob-assign-${i}`);

    // Arrastrar para girar la perilla
    let startY = 0;
    let startNorm = 0;
    wrap.addEventListener('pointerdown', e => {
      e.preventDefault();
      initAudio();
      if (hwState.midiLearnActive) {
        selectMidiLearnTarget('knob', i);
        return;
      }
      if (hwState.shiftHeld) {
        openParamAssignModal('knob', i);
        return;
      }
      wrap.setPointerCapture(e.pointerId);
      startY = e.clientY;
      startNorm = getNormalizedParamValue(hwState.knobAssignments[i]);

      const onMove = ev => {
        const dy = startY - ev.clientY;
        const pKey = hwState.knobAssignments[i];
        const sensitivity = PARAM_DEFS[pKey]?.step === 1 ? 95 : 135;
        setNormalizedParamValue(pKey, startNorm + dy / sensitivity);
      };
      const onUp = () => {
        wrap.removeEventListener('pointermove', onMove);
        wrap.removeEventListener('pointerup', onUp);
        wrap.removeEventListener('pointercancel', onUp);
      };
      wrap.addEventListener('pointermove', onMove);
      wrap.addEventListener('pointerup', onUp);
      wrap.addEventListener('pointercancel', onUp);
    });

    // Rueda del mouse sobre la perilla
    wrap.addEventListener('wheel', e => {
      e.preventDefault();
      initAudio();
      const pKey = hwState.knobAssignments[i];
      const cur = getNormalizedParamValue(pKey);
      const delta = e.deltaY < 0 ? 0.05 : -0.05;
      setNormalizedParamValue(pKey, cur + delta);
    }, { passive: false });

    // Doble click o click en el botón de etiqueta abre el selector de parámetro
    wrap.addEventListener('dblclick', () => openParamAssignModal('knob', i));
    assignBtn.addEventListener('click', () => {
      if (hwState.midiLearnActive) {
        selectMidiLearnTarget('knob', i);
      } else {
        openParamAssignModal('knob', i);
      }
    });
  }
}

// Construye los 4 Faders verticales
function renderFadersGrid() {
  const grid = document.getElementById('faders-grid');
  if (!grid) return;
  grid.innerHTML = '';

  for (let i = 0; i < 4; i++) {
    const paramKey = hwState.faderAssignments[i] || 'attack';
    const def = PARAM_DEFS[paramKey] || PARAM_DEFS.attack;
    const cell = document.createElement('div');
    cell.className = 'fader-cell';
    cell.id = `fader-cell-${i}`;

    cell.innerHTML = `
      <span class="fader-val-top" id="fader-val-${i}">${def.fmt(synthParams[paramKey])}</span>
      <div class="fader-track-wrap" id="fader-wrap-${i}" title="Deslizá el Fader ${i + 1} | Click en el nombre para reasignar">
        <div class="fader-ticks"></div>
        <div class="fader-slot">
          <div class="fader-fill" id="fader-fill-${i}" style="height: 50%;"></div>
        </div>
        <div class="fader-cap" id="fader-cap-${i}" style="bottom: 50%;"></div>
      </div>
      <button class="param-assign-btn" id="fader-assign-${i}" title="Click para elegir qué controla el Fader ${i + 1}">
        ▾ ${def.short}
      </button>
    `;

    grid.appendChild(cell);

    const wrap = cell.querySelector(`#fader-wrap-${i}`);
    const assignBtn = cell.querySelector(`#fader-assign-${i}`);

    const updateFromPointer = ev => {
      const rect = wrap.getBoundingClientRect();
      const pad = 8;
      const norm = 1 - ((ev.clientY - (rect.top + pad)) / Math.max(20, rect.height - pad * 2));
      setNormalizedParamValue(hwState.faderAssignments[i], norm);
    };

    wrap.addEventListener('pointerdown', e => {
      e.preventDefault();
      initAudio();
      if (hwState.midiLearnActive) {
        selectMidiLearnTarget('fader', i);
        return;
      }
      if (hwState.shiftHeld) {
        openParamAssignModal('fader', i);
        return;
      }
      wrap.setPointerCapture(e.pointerId);
      updateFromPointer(e);
      const onMove = ev => updateFromPointer(ev);
      const onUp = () => {
        wrap.removeEventListener('pointermove', onMove);
        wrap.removeEventListener('pointerup', onUp);
        wrap.removeEventListener('pointercancel', onUp);
      };
      wrap.addEventListener('pointermove', onMove);
      wrap.addEventListener('pointerup', onUp);
      wrap.addEventListener('pointercancel', onUp);
    });

    wrap.addEventListener('wheel', e => {
      e.preventDefault();
      initAudio();
      const pKey = hwState.faderAssignments[i];
      const cur = getNormalizedParamValue(pKey);
      setNormalizedParamValue(pKey, cur + (e.deltaY < 0 ? 0.05 : -0.05));
    }, { passive: false });

    assignBtn.addEventListener('click', () => {
      if (hwState.midiLearnActive) selectMidiLearnTarget('fader', i);
      else openParamAssignModal('fader', i);
    });
  }
}

// Sincroniza ángulos de las 8 perillas y altura de los 4 faders
function refreshKnobsAndFadersUI() {
  const radius = 17;
  const maxArc = 2 * Math.PI * radius * 0.75;
  const fullCircle = 2 * Math.PI * radius;

  for (let i = 0; i < 8; i++) {
    const pKey = hwState.knobAssignments[i];
    const def = PARAM_DEFS[pKey];
    if (!def) continue;
    const norm = getNormalizedParamValue(pKey);
    const angle = -135 + norm * 270;

    const rotor = document.getElementById(`knob-rotor-${i}`);
    const arc = document.getElementById(`knob-arc-${i}`);
    const valEl = document.getElementById(`knob-val-${i}`);
    const assignEl = document.getElementById(`knob-assign-${i}`);

    if (rotor) rotor.style.transform = `rotate(${angle}deg)`;
    if (arc) arc.setAttribute('stroke-dasharray', `${norm * maxArc} ${fullCircle}`);
    if (valEl) valEl.textContent = def.fmt(synthParams[pKey]);
    if (assignEl) assignEl.textContent = `▾ ${def.short}`;
  }

  for (let i = 0; i < 4; i++) {
    const pKey = hwState.faderAssignments[i];
    const def = PARAM_DEFS[pKey];
    if (!def) continue;
    const norm = getNormalizedParamValue(pKey);
    const pct = Math.round(norm * 100);

    const fill = document.getElementById(`fader-fill-${i}`);
    const cap = document.getElementById(`fader-cap-${i}`);
    const valEl = document.getElementById(`fader-val-${i}`);
    const assignEl = document.getElementById(`fader-assign-${i}`);

    if (fill) fill.style.height = `${pct}%`;
    if (cap) cap.style.bottom = `${pct}%`;
    if (valEl) valEl.textContent = def.fmt(synthParams[pKey]);
    if (assignEl) assignEl.textContent = `▾ ${def.short}`;
  }

  // Actualizar resumen superior de OLED
  const wName = WAVE_TYPES[Math.round(synthParams.wave1)]?.short || 'SAW';
  const oledWave = document.getElementById('oled-Wave-txt');
  const oledBpm = document.getElementById('oled-bpm-txt');
  if (oledWave) oledWave.textContent = wName;
  if (oledBpm) oledBpm.textContent = `${Math.round(synthParams.bpm)} BPM`;
}

const DEFAULT_USER_PAD_PRESETS = [
  'init_synth', 'supersaw_trance', 'acid_303', 'sample_grand',
  'blackparade', 'bornslippy', 'vangelis', 'gfunk'
];

function getDrumPadLabels() {
  return [
    { main: 'KICK', sub: 'Bombo' },
    { main: '808 SUB', sub: 'Sub Grave' },
    { main: 'SNARE', sub: 'Redoblante' },
    { main: 'HI-HAT', sub: 'Cerrado' },
    { main: 'OPEN HH', sub: 'Abierto' },
    { main: 'RIDE', sub: 'Platillo' },
    { main: isPlayingDrums ? '■ STOP' : '▶ BEAT', sub: 'Ritmo Loop' },
    { main: 'SEQ 16', sub: 'Editar Pasos' }
  ];
}

function triggerPadDown(i, velocity = 0.95, isScreenPointer = false) {
  if (i < 0 || i > 7) return;
  initAudio();

  if (isScreenPointer && hwState.midiLearnActive) {
    selectMidiLearnTarget('pad', i);
    return;
  }

  const pad = document.getElementById(`rgb-pad-${i}`);

  if (hwState.padMode === 'chords') {
    triggerChordPadDown(i, velocity);
  } else if (hwState.padMode === 'drums') {
    if (pad) pad.classList.add('active');
    padDownTimestamps[i] = performance.now();
    const t = actx.currentTime;
    const drumLabels = getDrumPadLabels();
    if (i === 0) { playKick(t); updateOledDisplay('🥁 PAD 1 · KICK', 'Bombo Analógico', 'Drums'); }
    else if (i === 1) { playDeepKick(t); updateOledDisplay('🥁 PAD 2 · 808 SUB', 'Sub Bass Drop', 'Drums'); }
    else if (i === 2) { playSnare(t); updateOledDisplay('🥁 PAD 3 · SNARE', 'Redoblante', 'Drums'); }
    else if (i === 3) { playHiHat(t, false); updateOledDisplay('🥁 PAD 4 · HI-HAT', 'Hit Cerrado', 'Drums'); }
    else if (i === 4) { playHiHat(t, true); updateOledDisplay('🥁 PAD 5 · OPEN HH', 'Hit Abierto', 'Drums'); }
    else if (i === 5) { playRide(t); updateOledDisplay('🥁 PAD 6 · RIDE', 'Platillo Cymbal', 'Drums'); }
    else if (i === 6) { toggleBeat(); }
    else if (i === 7) {
      updateOledDisplay('🎛️ PAD 8 · SEQ 16', drumLabels[7].sub, '16 Pasos');
      openSequencerModal();
    }
  } else if (hwState.padMode === 'presets') {
    if (pad) pad.classList.add('active');
    if (padHoldTimers[i]) clearTimeout(padHoldTimers[i]);
    padHoldTimers[i] = setTimeout(() => {
      padHoldTimers[i] = null;
      safeSet(`minilab_user_preset_${i}`, JSON.stringify({
        presetId: hwState.presetId,
        synthParams: { ...synthParams },
        knobAssignments: [...hwState.knobAssignments],
        faderAssignments: [...hwState.faderAssignments]
      }));
      updateOledDisplay(`💾 GUARDADO USER ${i + 1}`, 'Snapshot Almacenado', 'OK');
      renderRgbPads();
    }, 650);
  }
}

function triggerPadUp(i) {
  if (i < 0 || i > 7) return;
  const pad = document.getElementById(`rgb-pad-${i}`);

  if (hwState.padMode === 'chords') {
    triggerChordPadUp(i);
  } else if (hwState.padMode === 'drums') {
    const elapsed = performance.now() - (padDownTimestamps[i] || 0);
    const delay = Math.max(0, 110 - elapsed);
    setTimeout(() => {
      const el = document.getElementById(`rgb-pad-${i}`);
      if (el) el.classList.remove('active');
    }, delay);
  } else if (hwState.padMode === 'presets') {
    if (pad) pad.classList.remove('active');
    if (padHoldTimers[i] !== null) {
      clearTimeout(padHoldTimers[i]);
      padHoldTimers[i] = null;
      const raw = safeGet(`minilab_user_preset_${i}`);
      if (raw) {
        try {
          const data = JSON.parse(raw);
          if (data.presetId && SOUND_PRESETS[data.presetId]) hwState.presetId = data.presetId;
          if (data.synthParams) Object.assign(synthParams, data.synthParams);
          if (data.knobAssignments) hwState.knobAssignments = data.knobAssignments;
          if (data.faderAssignments) hwState.faderAssignments = data.faderAssignments;
          Object.keys(synthParams).forEach(k => updateActiveVoicesLive(k));
          renderKnobsGrid();
          renderFadersGrid();
          refreshKnobsAndFadersUI();
          updateOledDisplay(`📂 CARGADO USER ${i + 1}`, 'Snapshot Personal', 'OK');
        } catch (err) {}
      } else {
        const fallbackId = DEFAULT_USER_PAD_PRESETS[i] || 'init_synth';
        loadSoundPreset(fallbackId);
        updateOledDisplay(`📂 USER ${i + 1} (FAV)`, SOUND_PRESETS[fallbackId]?.name || fallbackId, 'Hold=Guardar');
      }
      // Tocar acorde de muestra breve para escuchar el sonido cargado
      const info = getDegreeChordInfo(0);
      stopAllPadVoices();
      const previewVoices = info.intervals.map(iv => createSynthVoice(info.rootMidi + iv, 0.8, null, true));
      padActiveVoices[i] = previewVoices;
      if (padReleaseTimers[i]) clearTimeout(padReleaseTimers[i]);
      padReleaseTimers[i] = setTimeout(() => {
        padActiveVoices[i].forEach(v => stopSynthVoice(v));
        padActiveVoices[i] = [];
      }, 300);
    }
  }
}

// Construye o actualiza los 8 Pads RGB sin destruir eventos activos
function renderRgbPads() {
  const row = document.getElementById('rgb-pads-row');
  if (!row) return;

  const drumLabels = getDrumPadLabels();

  // Crear los 8 elementos solo la primera vez para no romper pointercapture/eventos en vivo
  if (row.children.length !== 8) {
    row.innerHTML = '';
    for (let i = 0; i < 8; i++) {
      const pad = document.createElement('div');
      pad.className = 'rgb-pad';
      pad.id = `rgb-pad-${i}`;
      pad.style.setProperty('--pad-color', PAD_COLORS[i]);
      pad.innerHTML = `
        <span class="pad-num">PAD ${i + 1} · [${i + 1}]</span>
        <span class="pad-main-lbl" id="pad-main-${i}"></span>
        <span class="pad-sub-lbl" id="pad-sub-${i}"></span>
      `;

      pad.addEventListener('pointerdown', e => {
        e.preventDefault();
        try { pad.setPointerCapture(e.pointerId); } catch (_) {}
        triggerPadDown(i, 0.95, true);
      });

      const onUp = e => {
        e.preventDefault();
        triggerPadUp(i);
      };

      pad.addEventListener('pointerup', onUp);
      pad.addEventListener('pointercancel', onUp);
      row.appendChild(pad);
    }
  }

  for (let i = 0; i < 8; i++) {
    const pad = document.getElementById(`rgb-pad-${i}`);
    const mainEl = document.getElementById(`pad-main-${i}`);
    const subEl = document.getElementById(`pad-sub-${i}`);
    if (!pad || !mainEl || !subEl) continue;

    pad.classList.remove('latched');
    let mainTxt = '';
    let subTxt = '';

    if (hwState.padMode === 'chords') {
      const info = getDegreeChordInfo(i);
      mainTxt = info.name;
      subTxt = info.roman;
      if (latchedChordState && latchedChordState.padIdx === i) {
        pad.classList.add('latched');
      }
    } else if (hwState.padMode === 'drums') {
      mainTxt = drumLabels[i].main;
      subTxt = drumLabels[i].sub;
      if (i === 6 && isPlayingDrums) pad.classList.add('latched');
    } else {
      const saved = safeGet(`minilab_user_preset_${i}`);
      const fallbackId = DEFAULT_USER_PAD_PRESETS[i] || 'init_synth';
      const fallbackShort = (SOUND_PRESETS[fallbackId]?.name || 'Synth').replace(/^[^\s]+\s/, '').slice(0, 11);
      mainTxt = `USER ${i + 1}`;
      subTxt = saved ? '★ Guardado' : fallbackShort;
      if (saved) pad.classList.add('latched');
    }

    mainEl.textContent = mainTxt;
    subEl.textContent = subTxt;
  }
}

// Construye las 25 Teclas exactas del Arturia MiniLab 3 (2 octavas completas de Do a Do)
const PC_KEY_HINTS = {
  0: 'Z', 1: 'S', 2: 'X', 3: 'D', 4: 'C', 5: 'V', 6: 'G', 7: 'B', 8: 'H', 9: 'N', 10: 'J', 11: 'M',
  12: 'Q', 13: 'A', 14: 'W', 15: 'F', 16: 'E', 17: 'R', 18: 'K', 19: 'T', 20: 'L', 21: 'Y', 22: 'Ñ', 23: 'U', 24: 'I'
};

function renderKeybed25() {
  const keybed = document.getElementById('keybed-25');
  if (!keybed) return;
  keybed.innerHTML = '';
  keyElementsByMidi.clear();

  const startMidi = (hwState.octave + 1) * 12; // e.g. oct 3 -> C3 (48) a C5 (72) = 25 teclas
  const scale = SCALES[hwState.scaleIdx] || SCALES[0];
  const rootClass = hwState.keyOffset % 12;

  const isInScale = midi => {
    if (scale.isChromatic) return true;
    const rel = ((midi % 12) - rootClass + 12) % 12;
    return scale.intervals.some(iv => (iv % 12) === rel);
  };

  const blackSemitones = new Set([1, 3, 6, 8, 10]);
  let whiteIdx = 0;
  const blackKeysToRender = [];

  for (let offset = 0; offset < 25; offset++) {
    const midi = startMidi + offset;
    const semi = midi % 12;
    const octNum = Math.floor(midi / 12) - 1;
    const inScale = hwState.showGuide && isInScale(midi);
    const inChord = hwState.showGuide && hwState.activeChordNotes.includes(semi);

    if (!blackSemitones.has(semi)) {
      const wKey = document.createElement('div');
      wKey.className = `white-key${semi === 0 ? ' c-note' : ''}${inScale ? ' in-scale' : ''}${inChord ? ' chord-tone' : ''}`;
      wKey.dataset.midi = midi;
      const noteLbl = semi === 0 ? `C${octNum}` : NOTE_NAMES[semi];
      wKey.innerHTML = `
        <span class="key-note-lbl">${noteLbl}</span>
        <span class="key-pc-hint">${PC_KEY_HINTS[offset] || ''}</span>
      `;
      keybed.appendChild(wKey);
      keyElementsByMidi.set(midi, wKey);
      whiteIdx++;
    } else {
      // Guardar tecla negra centrada en el borde entre la tecla blanca anterior y la siguiente
      blackKeysToRender.push({
        midi,
        semi,
        leftPct: (whiteIdx / 15) * 100,
        inScale,
        inChord,
        pcHint: PC_KEY_HINTS[offset] || ''
      });
    }
  }

  blackKeysToRender.forEach(bk => {
    const bKey = document.createElement('div');
    bKey.className = `black-key${bk.inScale ? ' in-scale' : ''}${bk.inChord ? ' chord-tone' : ''}`;
    bKey.dataset.midi = bk.midi;
    bKey.style.left = `${bk.leftPct}%`;
    bKey.innerHTML = `<span class="key-note-lbl">${NOTE_NAMES[bk.semi]}</span>`;
    keybed.appendChild(bKey);
    keyElementsByMidi.set(bk.midi, bKey);
  });

  // Actualizar etiqueta OLED de octava e indicadores LED OCT- / OCT+
  const oledOct = document.getElementById('oled-oct-txt');
  if (oledOct) oledOct.textContent = `OCT: C${hwState.octave}-C${hwState.octave + 2}`;

  const btnOctDown = document.getElementById('hw-btn-oct-down');
  const btnOctUp = document.getElementById('hw-btn-oct-up');
  if (btnOctDown) btnOctDown.classList.toggle('active', hwState.octave < 3);
  if (btnOctUp) btnOctUp.classList.toggle('active', hwState.octave > 3);
}

// Eventos multi-touch con glissando y expresión vertical en las 25 teclas
const activeTouchPointers = new Map();

function setupKeybedTouchEvents() {
  const keybed = document.getElementById('keybed-25');
  if (!keybed) return;

  const findKeyElement = (x, y) => {
    const el = document.elementFromPoint(x, y);
    return el ? el.closest('[data-midi]') : null;
  };

  keybed.addEventListener('pointerdown', e => {
    e.preventDefault();
    initAudio();
    try { keybed.setPointerCapture(e.pointerId); } catch (_) {}

    const keyEl = findKeyElement(e.clientX, e.clientY);
    if (!keyEl) return;
    const midi = parseInt(keyEl.dataset.midi);
    const sourceId = `ptr_${e.pointerId}`;
    activeTouchPointers.set(e.pointerId, { midi, sourceId });
    noteOn(midi, 0.95, sourceId);
  }, { passive: false });

  keybed.addEventListener('pointermove', e => {
    if (!activeTouchPointers.has(e.pointerId)) return;
    e.preventDefault();
    const keyEl = findKeyElement(e.clientX, e.clientY);
    if (!keyEl) return;
    const newMidi = parseInt(keyEl.dataset.midi);
    const cur = activeTouchPointers.get(e.pointerId);

    if (newMidi !== cur.midi) {
      noteOff(cur.midi, cur.sourceId);
      cur.midi = newMidi;
      noteOn(newMidi, 0.9, cur.sourceId);
    } else {
      // Expresión vertical en la tecla: deslizar hacia arriba abre el filtro
      const rect = keyEl.getBoundingClientRect();
      const relY = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
      const voice = heldNotes.get(cur.sourceId);
      if (voice && voice.filter && actx) {
        const modCut = Math.min(14000, synthParams.cutoff * (1 + relY * 1.4));
        voice.filter.frequency.setTargetAtTime(modCut, actx.currentTime, 0.03);
      }
    }
  }, { passive: false });

  const endTouch = e => {
    if (!activeTouchPointers.has(e.pointerId)) return;
    const cur = activeTouchPointers.get(e.pointerId);
    noteOff(cur.midi, cur.sourceId);
    activeTouchPointers.delete(e.pointerId);
  };

  keybed.addEventListener('pointerup', endTouch);
  keybed.addEventListener('pointercancel', endTouch);
}

// ============================================================================
// 10. TOUCH STRIPS (PITCH BEND & MODULATION) + MAIN ENCODER
// ============================================================================

function setupTouchStrips() {
  const pitchStrip = document.getElementById('pitch-strip');
  const modStrip = document.getElementById('mod-strip');
  const pitchLeds = document.getElementById('pitch-leds');
  const modLeds = document.getElementById('mod-leds');

  // Crear 7 LEDs por tira como en el Arturia MiniLab 3
  if (pitchLeds) {
    pitchLeds.innerHTML = Array.from({ length: 7 }, (_, i) => `<div class="strip-led-dot ${i === 3 ? 'lit' : ''}"></div>`).join('');
  }
  if (modLeds) {
    modLeds.innerHTML = Array.from({ length: 7 }, (_, i) => `<div class="strip-led-dot ${i >= 5 ? 'lit' : ''}"></div>`).join('');
  }

  const updatePitchVisual = bend => {
    hwState.pitchBend = Math.max(-1, Math.min(1, bend));
    const pct = 50 - hwState.pitchBend * 46;
    const thumb = document.getElementById('pitch-thumb');
    const fill = document.getElementById('pitch-fill');
    if (thumb) thumb.style.top = `${pct}%`;
    if (fill) {
      if (hwState.pitchBend >= 0) {
        fill.style.top = `${pct}%`;
        fill.style.height = `${50 - pct}%`;
      } else {
        fill.style.top = '50%';
        fill.style.height = `${pct - 50}%`;
      }
    }
    updateActiveVoicesLive('pitchBend');
  };

  const updateModVisual = mod => {
    hwState.modWheel = Math.max(0, Math.min(1, mod));
    const pct = Math.round(hwState.modWheel * 100);
    const thumb = document.getElementById('mod-thumb');
    const fill = document.getElementById('mod-fill');
    if (thumb) thumb.style.top = `${100 - pct * 0.92}%`;
    if (fill) fill.style.height = `${pct}%`;
    if (modLeds) {
      const dots = modLeds.querySelectorAll('.strip-led-dot');
      dots.forEach((d, idx) => {
        const threshold = (6 - idx) / 6;
        d.classList.toggle('lit', hwState.modWheel >= threshold - 0.08);
      });
    }
    updateOledDisplay('🌊 MODULATION STRIP', `${pct}%`, 'Vibrato & LFO', hwState.modWheel);
  };

  if (pitchStrip) {
    const onPitchPointer = e => {
      const rect = pitchStrip.getBoundingClientRect();
      const norm = 1 - Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      const bend = (norm - 0.5) * 2;
      updatePitchVisual(bend);
      updateOledDisplay('↕️ PITCH BEND', `${(bend * 2).toFixed(1)} st`, 'Tira Táctil', norm);
    };
    pitchStrip.addEventListener('pointerdown', e => {
      e.preventDefault();
      initAudio();
      pitchStrip.setPointerCapture(e.pointerId);
      onPitchPointer(e);
      const move = ev => onPitchPointer(ev);
      const up = () => {
        updatePitchVisual(0); // Resorte automático al centro
        updateOledDisplay('↕️ PITCH BEND', '0.0 st', 'Centro', 0.5);
        pitchStrip.removeEventListener('pointermove', move);
        pitchStrip.removeEventListener('pointerup', up);
        pitchStrip.removeEventListener('pointercancel', up);
      };
      pitchStrip.addEventListener('pointermove', move);
      pitchStrip.addEventListener('pointerup', up);
      pitchStrip.addEventListener('pointercancel', up);
    });
  }

  if (modStrip) {
    const onModPointer = e => {
      const rect = modStrip.getBoundingClientRect();
      const norm = 1 - Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      updateModVisual(norm);
    };
    modStrip.addEventListener('pointerdown', e => {
      e.preventDefault();
      initAudio();
      modStrip.setPointerCapture(e.pointerId);
      onModPointer(e);
      const move = ev => onModPointer(ev);
      const up = () => {
        modStrip.removeEventListener('pointermove', move);
        modStrip.removeEventListener('pointerup', up);
        modStrip.removeEventListener('pointercancel', up);
      };
      modStrip.addEventListener('pointermove', move);
      modStrip.addEventListener('pointerup', up);
      modStrip.addEventListener('pointercancel', up);
    });
  }

  window._updatePitchVisual = updatePitchVisual;
  window._updateModVisual = updateModVisual;
}

// ============================================================================
// 11. PANTALLA OLED + OSCILOSCOPIO EN TIEMPO REAL
// ============================================================================

function updateOledDisplay(mainTitle, paramName, paramVal, barNorm = null) {
  const mainEl = document.getElementById('oled-main-text');
  const pNameEl = document.getElementById('oled-param-name');
  const pValEl = document.getElementById('oled-param-val');
  const barEl = document.getElementById('oled-bar-fill');

  if (mainTitle && mainEl) mainEl.textContent = mainTitle;
  if (paramName && pNameEl) pNameEl.textContent = paramName;
  if (paramVal !== undefined && pValEl) pValEl.textContent = paramVal;
  if (barNorm !== null && barEl) {
    barEl.style.width = `${Math.round(Math.max(0, Math.min(1, barNorm)) * 100)}%`;
  }
}

function startOledOscilloscope() {
  const canvas = document.getElementById('oled-scope');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const data = new Uint8Array(256);
  let lastIdleSig = '';

  function draw() {
    requestAnimationFrame(draw);
    const hasVoices = analyserNode && activeVoices.length > 0;
    if (!hasVoices) {
      const idleSig = `${Math.round(synthParams.wave1)}_${synthParams.fmRatio}`;
      if (idleSig === lastIdleSig) return; // Ahorrar CPU/GPU en móviles cuando no suenan notas
      lastIdleSig = idleSig;
    } else {
      lastIdleSig = '';
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.6;
    ctx.beginPath();

    if (hasVoices) {
      analyserNode.getByteTimeDomainData(data);
      const slice = canvas.width / data.length;
      let x = 0;
      for (let i = 0; i < data.length; i++) {
        const v = data[i] / 128.0;
        const y = (v * canvas.height) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += slice;
      }
    } else {
      // Dibujar forma de onda guía según wave1 seleccionada
      const wIdx = Math.round(synthParams.wave1);
      const midY = canvas.height / 2;
      for (let x = 0; x < canvas.width; x++) {
        const t = (x / canvas.width) * Math.PI * 4;
        let y = 0;
        if (wIdx === 0) y = Math.sin(t);
        else if (wIdx === 1) y = (2 / Math.PI) * Math.asin(Math.sin(t));
        else if (wIdx === 2 || wIdx === 5) y = ((t / (2 * Math.PI)) % 1) * 2 - 1;
        else if (wIdx === 3) y = Math.sin(t) >= 0 ? 0.85 : -0.85;
        else if (wIdx === 4) y = (t % (2 * Math.PI)) < 1.4 ? 0.9 : -0.6;
        else if (wIdx === 6) y = Math.sin(t + Math.sin(t * synthParams.fmRatio) * 1.8);
        else y = Math.sin(t) * Math.exp(-(x / canvas.width) * 1.8);
        const py = midY - y * (canvas.height * 0.36);
        if (x === 0) ctx.moveTo(x, py);
        else ctx.lineTo(x, py);
      }
    }
    ctx.stroke();
  }
  requestAnimationFrame(draw);
}

// ============================================================================
// 12. MODALES: SELECTOR DE 28 CONTROLES Y SECUENCIADOR 16 PASOS
// ============================================================================

let currentAssignTarget = null; // { type: 'knob'|'fader', index }

function openParamAssignModal(type, index) {
  currentAssignTarget = { type, index };
  const modal = document.getElementById('param-modal');
  const title = document.getElementById('param-modal-title');
  const body = document.getElementById('param-modal-body');
  if (!modal || !body) return;

  const currentKey = type === 'knob' ? hwState.knobAssignments[index] : hwState.faderAssignments[index];
  title.textContent = `🎛️ Elegir Parámetro para ${type === 'knob' ? 'Perilla ' + (index + 1) : 'Fader ' + (index + 1)}`;

  // Agrupar los 28 parámetros por categoría
  const categories = {};
  Object.entries(PARAM_DEFS).forEach(([key, def]) => {
    if (!categories[def.cat]) categories[def.cat] = [];
    categories[def.cat].push({ key, ...def });
  });

  body.innerHTML = '';
  Object.entries(categories).forEach(([catName, items]) => {
    const block = document.createElement('div');
    block.className = 'param-category-block';
    block.innerHTML = `<div class="param-cat-title">${catName}</div>`;
    const grid = document.createElement('div');
    grid.className = 'param-options-grid';

    items.forEach(item => {
      const btn = document.createElement('button');
      btn.className = `param-option-btn ${item.key === currentKey ? 'selected' : ''}`;
      btn.innerHTML = `
        <strong>${item.short}</strong>
        <span>${item.name} (${item.fmt(synthParams[item.key])})</span>
      `;
      btn.addEventListener('click', () => {
        if (type === 'knob') hwState.knobAssignments[index] = item.key;
        else hwState.faderAssignments[index] = item.key;
        modal.classList.add('hidden');
        refreshKnobsAndFadersUI();
        updateOledDisplay(`✅ ASIGNADO ${type === 'knob' ? 'K' + (index + 1) : 'F' + (index + 1)}`, item.name, item.fmt(synthParams[item.key]));
      });
      grid.appendChild(btn);
    });

    block.appendChild(grid);
    body.appendChild(block);
  });

  modal.classList.remove('hidden');
}

function openSequencerModal() {
  const modal = document.getElementById('seq-modal');
  const body = document.getElementById('seq-modal-body');
  if (!modal || !body) return;

  const tracks = [
    { id: 'kick', label: 'KICK' },
    { id: 'deepkick', label: '808 SUB' },
    { id: 'snare', label: 'SNARE' },
    { id: 'hihat', label: 'C. HAT' },
    { id: 'openhat', label: 'O. HAT' },
    { id: 'ride', label: 'RIDE' }
  ];

  body.innerHTML = '';
  tracks.forEach(t => {
    const row = document.createElement('div');
    row.className = 'seq-track-row';
    row.innerHTML = `<span class="seq-track-name">${t.label}</span>`;
    const stepsWrap = document.createElement('div');
    stepsWrap.className = 'seq-steps-16';

    for (let s = 0; s < 16; s++) {
      const btn = document.createElement('button');
      btn.className = `seq-step-btn ${currentDrumSteps[t.id][s] ? 'on' : ''}`;
      btn.textContent = s + 1;
      btn.addEventListener('click', () => {
        currentDrumSteps[t.id][s] = currentDrumSteps[t.id][s] ? 0 : 1;
        btn.classList.toggle('on', !!currentDrumSteps[t.id][s]);
      });
      stepsWrap.appendChild(btn);
    }
    row.appendChild(stepsWrap);
    body.appendChild(row);
  });

  modal.classList.remove('hidden');
}

// ============================================================================
// 13. INTEGRACIÓN WEB MIDI API 1:1 PARA ARTURIA MINILAB 3 + MIDI LEARN
// ============================================================================

// Mapeos de fábrica del Arturia MiniLab 3 (Modo Analog Lab y Modo User)
const DEFAULT_MINILAB3_CC_TO_KNOB = {
  // Knobs 1..8 (User Mode & Analog Lab CCs habituales en Arturia MiniLab 3)
  74: 0, 86: 0,
  71: 1, 87: 1,
  76: 2, 89: 2,
  77: 3, 90: 3,
  93: 4, 110: 4,
  18: 5, 111: 5,
  19: 6, 116: 6,
  16: 7, 117: 7
};

const DEFAULT_MINILAB3_CC_TO_FADER = {
  // Faders 1..4
  82: 0, 14: 0, 73: 0,
  83: 1, 15: 1, 75: 1,
  85: 2, 30: 2, 79: 2,
  17: 3, 31: 3, 72: 3
};

function selectMidiLearnTarget(type, index) {
  document.querySelectorAll('.midi-target').forEach(el => el.classList.remove('midi-target'));
  hwState.midiLearnTarget = { type, index };
  const cellId = type === 'pad' ? `rgb-pad-${index}` : `${type}-cell-${index}`;
  const cell = document.getElementById(cellId);
  if (cell) cell.classList.add('midi-target');
  const label = type === 'knob' ? `Perilla ${index + 1}` : (type === 'fader' ? `Fader ${index + 1}` : `Pad ${index + 1}`);
  updateOledDisplay('🎯 MIDI LEARN', `Mové/Tocá ${label}`, 'en tu Arturia');
}

function resolveMidiNoteToPad(channel, note) {
  // 1. Mapa personalizado aprendido con MIDI Learn
  if (hwState.customPadNoteMap && hwState.customPadNoteMap[note] !== undefined) {
    return hwState.customPadNoteMap[note];
  }
  // 2. Canal 10 (channel === 9): Canal estándar de los 8 Pads en Arturia MiniLab 3 (Bank A: 36..43, Bank B: 44..51, o cualquier nota en Ch 10)
  if (channel === 9) {
    return ((note - 36) % 8 + 64) % 8;
  }
  // 3. Notas 36..43 (C1..G1): En varios modos del Arturia MiniLab 3 los Pads envían notas 36..43 por el Canal 1, mientras las 25 teclas empiezan en C3 (MIDI 48)
  const keybedStartMidi = (hwState.octave + 1) * 12;
  if (note >= 36 && note <= 43 && keybedStartMidi > 43) {
    return note - 36;
  }
  return -1;
}

function initWebMidi() {
  const statusBtn = document.getElementById('btn-midi-status');
  const statusTxt = document.getElementById('midi-status-text');

  // Cargar mapas MIDI personalizados si existen
  const savedMap = safeGet('minilab3_custom_cc_map');
  if (savedMap) {
    try { hwState.customCCMap = JSON.parse(savedMap); } catch (e) {}
  }
  const savedPadNotes = safeGet('minilab3_custom_pad_notes');
  if (savedPadNotes) {
    try { hwState.customPadNoteMap = JSON.parse(savedPadNotes); } catch (e) {}
  }

  if (!navigator.requestMIDIAccess) {
    if (statusTxt) statusTxt.textContent = 'MIDI: Modo Touch/PC';
    return;
  }

  navigator.requestMIDIAccess({ sysex: false }).then(midiAccess => {
    const attachInputs = () => {
      let count = 0;
      let deviceName = '';
      for (const input of midiAccess.inputs.values()) {
        count++;
        deviceName = input.name || 'Controlador MIDI';
        input.onmidimessage = handleMidiMessage;
      }
      if (count > 0) {
        statusBtn?.classList.add('connected');
        const shortName = deviceName.toLowerCase().includes('minilab') ? 'Arturia MiniLab 3' : deviceName.slice(0, 16);
        if (statusTxt) statusTxt.textContent = `🎹 ${shortName}`;
        updateOledDisplay('🔌 MIDI CONECTADO', shortName, 'Listo');
      } else {
        statusBtn?.classList.remove('connected');
        if (statusTxt) statusTxt.textContent = 'MIDI: Sin dispositivo';
      }
    };

    attachInputs();
    midiAccess.onstatechange = attachInputs;
  }).catch(() => {
    if (statusTxt) statusTxt.textContent = 'MIDI: Touch Activo';
  });
}

function handleMidiMessage(event) {
  if (!event.data || event.data.length < 2) return;
  const [status, data1, data2 = 0] = event.data;
  const cmd = status & 0xf0;
  const channel = status & 0x0f;

  // 1. NOTE ON (0x90) con velocidad > 0
  if (cmd === 0x90 && data2 > 0) {
    // Si MIDI Learn está apuntando a un Pad y el usuario toca un Pad físico que envía Nota MIDI:
    if (hwState.midiLearnActive && hwState.midiLearnTarget && hwState.midiLearnTarget.type === 'pad') {
      const targetIdx = hwState.midiLearnTarget.index;
      hwState.customPadNoteMap[data1] = targetIdx;
      // Si asigna el Pad 1, auto-mapear las 8 notas consecutivas para los 8 Pads
      if (targetIdx === 0) {
        for (let p = 0; p < 8; p++) hwState.customPadNoteMap[data1 + p] = p;
      }
      safeSet('minilab3_custom_pad_notes', JSON.stringify(hwState.customPadNoteMap));
      updateOledDisplay('✅ PAD MIDI OK', `Nota ${data1} → PAD ${targetIdx + 1}`, targetIdx === 0 ? 'Pads 1-8 Listos' : 'Guardado');
      toggleMidiLearn(false);
      triggerPadDown(targetIdx, data2 / 127, false);
      return;
    }

    const padIdx = resolveMidiNoteToPad(channel, data1);
    if (padIdx >= 0 && padIdx < 8) {
      triggerPadDown(padIdx, data2 / 127, false);
      return;
    }
    noteOn(data1, data2 / 127, `midi_${data1}`);
  }
  // 2. NOTE OFF (0x80 o 0x90 con velocidad 0)
  else if (cmd === 0x80 || (cmd === 0x90 && data2 === 0)) {
    const padIdx = resolveMidiNoteToPad(channel, data1);
    if (padIdx >= 0 && padIdx < 8) {
      triggerPadUp(padIdx);
      return;
    }
    noteOff(data1, `midi_${data1}`);
  }
  // 3. POLYPHONIC AFTERTOUCH (0xA0) / CHANNEL AFTERTOUCH (0xD0) - Los Pads del Arturia MiniLab 3 envían presión!
  else if (cmd === 0xa0 || cmd === 0xd0) {
    const pressure = (cmd === 0xa0 ? data2 : data1) / 127;
    if (pressure > 0.05 && actx && activeVoices.length > 0) {
      const now = actx.currentTime;
      const boostCut = Math.min(14000, synthParams.cutoff * (1 + pressure * 1.2));
      activeVoices.forEach(v => {
        if (v && v.filter && !v.cleaned) {
          try { v.filter.frequency.setTargetAtTime(boostCut, now, 0.03); } catch (e) {}
        }
      });
    }
  }
  // 4. PROGRAM CHANGE (0xC0) - En modo Program Change los Pads 1-8 envían PC 0..7
  else if (cmd === 0xc0) {
    const padIdx = data1 % 8;
    triggerPadDown(padIdx, 0.95, false);
    setTimeout(() => triggerPadUp(padIdx), 240);
  }
  // 5. PITCH BEND (0xE0)
  else if (cmd === 0xe0) {
    const val14 = (data2 << 7) | data1;
    const bend = (val14 - 8192) / 8192;
    if (window._updatePitchVisual) window._updatePitchVisual(bend);
  }
  // 6. CONTROL CHANGE (0xB0)
  else if (cmd === 0xb0) {
    const cc = data1;
    const val = data2;

    // Si MIDI Learn está esperando un movimiento físico, vincular este CC (Perilla, Fader o Pad en modo CC)
    if (hwState.midiLearnActive && hwState.midiLearnTarget) {
      const t = hwState.midiLearnTarget;
      if (t.type === 'pad') {
        if (val === 0) return; // Esperar al golpe de bajada del pad
        hwState.customCCMap[cc] = { type: 'pad', index: t.index };
        if (t.index === 0) {
          for (let p = 0; p < 8; p++) hwState.customCCMap[cc + p] = { type: 'pad', index: p };
        }
        safeSet('minilab3_custom_cc_map', JSON.stringify(hwState.customCCMap));
        updateOledDisplay('✅ PAD CC OK', `CC ${cc} → PAD ${t.index + 1}`, t.index === 0 ? 'Pads 1-8 Listos' : 'Guardado');
        toggleMidiLearn(false);
        triggerPadDown(t.index, val / 127, false);
        return;
      }

      hwState.customCCMap[cc] = { ...t };
      safeSet('minilab3_custom_cc_map', JSON.stringify(hwState.customCCMap));
      updateOledDisplay('✅ MIDI LEARN OK', `CC ${cc} → ${t.type === 'knob' ? 'Perilla ' + (t.index + 1) : 'Fader ' + (t.index + 1)}`, 'Guardado');
      toggleMidiLearn(false);
      return;
    }

    // Modulation Strip (CC 1)
    if (cc === 1 && channel !== 9) {
      if (window._updateModVisual) window._updateModVisual(val / 127);
      return;
    }

    // Hold / Sustain Pedal (CC 64)
    if (cc === 64 && channel !== 9) {
      setHoldState(val >= 64);
      return;
    }

    // Encoder Principal del MiniLab 3 (CC 28)
    if (cc === 28) {
      const dir = val > 64 ? 1 : (val < 64 ? -1 : 0);
      if (dir !== 0) cyclePresetByStep(dir);
      return;
    }

    // Verificar primero el mapa MIDI Learn personalizado (incluye Pads en modo CC)
    const customTarget = hwState.customCCMap[cc];
    if (customTarget) {
      if (customTarget.type === 'pad') {
        if (val > 0) triggerPadDown(customTarget.index, val / 127, false);
        else triggerPadUp(customTarget.index);
        return;
      }
      const pKey = customTarget.type === 'knob'
        ? hwState.knobAssignments[customTarget.index]
        : hwState.faderAssignments[customTarget.index];
      applyMidiCcToParam(pKey, val);
      return;
    }

    // Si llega un CC por el Canal 10 (channel === 9), son los Pads del MiniLab 3 en modo Switched CC / Gate
    if (channel === 9) {
      const padIdx = cc % 8;
      if (val > 0) triggerPadDown(padIdx, val / 127, false);
      else triggerPadUp(padIdx);
      return;
    }

    // Verificar mapa de fábrica de las 8 Perillas del Arturia MiniLab 3
    if (DEFAULT_MINILAB3_CC_TO_KNOB[cc] !== undefined) {
      const kIdx = DEFAULT_MINILAB3_CC_TO_KNOB[cc];
      const pKey = hwState.knobAssignments[kIdx];
      applyMidiCcToParam(pKey, val);
      return;
    }

    // Verificar mapa de fábrica de los 4 Faders del Arturia MiniLab 3
    if (DEFAULT_MINILAB3_CC_TO_FADER[cc] !== undefined) {
      const fIdx = DEFAULT_MINILAB3_CC_TO_FADER[cc];
      const pKey = hwState.faderAssignments[fIdx];
      setNormalizedParamValue(pKey, val / 127);
    }
  }
}

function applyMidiCcToParam(paramKey, ccVal) {
  // Soporta valor absoluto (0..127)
  setNormalizedParamValue(paramKey, ccVal / 127);
}

function toggleMidiLearn(forceState = null) {
  hwState.midiLearnActive = forceState !== null ? forceState : !hwState.midiLearnActive;
  const btn = document.getElementById('btn-midi-learn');
  const pill = document.getElementById('btn-midi-status');
  btn?.classList.toggle('active', hwState.midiLearnActive);
  pill?.classList.toggle('learning', hwState.midiLearnActive);

  if (hwState.midiLearnActive) {
    selectMidiLearnTarget('pad', 0);
    updateOledDisplay('🎯 MIDI LEARN ACTIVO', 'Tocá un Pad/Perilla/Fader', 'y mové tu Arturia');
  } else {
    hwState.midiLearnTarget = null;
    document.querySelectorAll('.midi-target').forEach(el => el.classList.remove('midi-target'));
  }
}

// ============================================================================
// 14. GESTIÓN DE PRESETS, TECLADO DE PC Y BOTONES DEL PANEL
// ============================================================================

function loadSoundPreset(presetId) {
  const p = SOUND_PRESETS[presetId];
  if (!p) return;
  hwState.presetId = presetId;
  if (p.sampleTimbre) {
    hwState.sampleTimbre = p.sampleTimbre;
    if (actx) {
      const isCached = loadedTimbres.has(p.sampleTimbre);
      if (!isCached) {
        updateOledDisplay(p.name, '⏳ Cargando Samples HD...', 'Listo para tocar');
      }
      preloadPianoSamples(p.sampleTimbre).then(() => {
        if (hwState.presetId === presetId) {
          updateOledDisplay(p.name, `Sample HD (${p.sampleTimbre.toUpperCase()})`, '✓ En Memoria');
        }
      });
    }
  }

  Object.keys(PARAM_DEFS).forEach(k => {
    if (p[k] !== undefined) {
      synthParams[k] = p[k];
      updateActiveVoicesLive(k);
    }
  });

  const sel = document.getElementById('preset-select');
  if (sel) sel.value = presetId;

  refreshKnobsAndFadersUI();
  const subLabel = p.sampleTimbre
    ? `Sample HD · ${p.sampleTimbre.toUpperCase()}`
    : (WAVE_TYPES[Math.round(synthParams.wave1)]?.name || 'Synth');
  updateOledDisplay(p.name, subLabel, `Cut: ${Math.round(synthParams.cutoff)}Hz`);
}

function cyclePresetByStep(dir) {
  const keys = Object.keys(SOUND_PRESETS);
  const curIdx = keys.indexOf(hwState.presetId);
  const nextIdx = (curIdx + dir + keys.length) % keys.length;
  loadSoundPreset(keys[nextIdx]);
  hwState.encoderAngle += dir * 24;
  const ind = document.getElementById('main-encoder-ind');
  if (ind) ind.parentElement.style.transform = `rotate(${hwState.encoderAngle}deg)`;
}

function setHoldState(active) {
  hwState.holdActive = active;
  const btn = document.getElementById('hw-btn-hold');
  if (btn) btn.classList.toggle('active', active);
  if (!active) {
    releaseAllSustained();
    if (hwState.latchMode === 'off') stopLatchedChord();
  }
  updateOledDisplay(active ? '🔒 HOLD: ON' : '🔓 HOLD: OFF', 'Sustain & Latch', active ? 'Activo' : 'Manual');
}

// Teclas 1..8 de la PC disparan directamente los 8 Pads RGB (PAD 1..8)
const PC_KEY_TO_PAD = {
  '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '7': 6, '8': 7
};

// Mapa de teclado de PC para las 25 teclas (2 octavas completas)
const PC_KEY_TO_OFFSET = {
  'z': 0, 's': 1, 'x': 2, 'd': 3, 'c': 4, 'v': 5, 'g': 6, 'b': 7, 'h': 8, 'n': 9, 'j': 10, 'm': 11,
  ',': 12, 'q': 12, 'a': 13, 'w': 14, 'f': 15, 'e': 16, 'r': 17, 'k': 18, 't': 19, 'l': 20, 'y': 21, 'ñ': 22, ';': 22, 'u': 23, 'i': 24
};
const pressedPcKeys = new Set();
const pressedPcPads = new Set();

function setupPcKeyboard() {
  window.addEventListener('keydown', e => {
    if (e.repeat || e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;
    const k = e.key.toLowerCase();

    if (k === ' ') {
      e.preventDefault();
      toggleBeat();
      return;
    }
    if (e.key === 'ArrowLeft') {
      hwState.octave = Math.max(1, hwState.octave - 1);
      renderKeybed25();
      renderRgbPads();
      return;
    }
    if (e.key === 'ArrowRight') {
      hwState.octave = Math.min(5, hwState.octave + 1);
      renderKeybed25();
      renderRgbPads();
      return;
    }

    // Números 1 a 8 disparan los 8 Pads RGB
    if (PC_KEY_TO_PAD[k] !== undefined && !pressedPcPads.has(k)) {
      e.preventDefault();
      pressedPcPads.add(k);
      triggerPadDown(PC_KEY_TO_PAD[k], 0.95, false);
      return;
    }

    if (PC_KEY_TO_OFFSET[k] !== undefined && !pressedPcKeys.has(k)) {
      pressedPcKeys.add(k);
      const midi = (hwState.octave + 1) * 12 + PC_KEY_TO_OFFSET[k];
      noteOn(midi, 0.9, `pc_${k}`);
    }
  });

  window.addEventListener('keyup', e => {
    const k = e.key.toLowerCase();
    if (PC_KEY_TO_PAD[k] !== undefined && pressedPcPads.has(k)) {
      pressedPcPads.delete(k);
      triggerPadUp(PC_KEY_TO_PAD[k]);
      return;
    }
    if (PC_KEY_TO_OFFSET[k] !== undefined && pressedPcKeys.has(k)) {
      pressedPcKeys.delete(k);
      const midi = (hwState.octave + 1) * 12 + PC_KEY_TO_OFFSET[k];
      noteOff(midi, `pc_${k}`);
    }
  });
}

// ============================================================================
// 15. INICIALIZACIÓN Y EVENTOS DE INTERFAZ
// ============================================================================

function bindAllControls() {
  // Selector de Preset / Sonido
  document.getElementById('preset-select')?.addEventListener('change', e => {
    initAudio();
    loadSoundPreset(e.target.value);
  });

  // Tonalidad y Escala
  document.getElementById('btn-key-prev')?.addEventListener('click', () => {
    hwState.keyOffset = (hwState.keyOffset + 11) % 12;
    document.getElementById('top-key-label').textContent = NOTE_NAMES[hwState.keyOffset];
    renderRgbPads();
    renderKeybed25();
  });
  document.getElementById('btn-key-next')?.addEventListener('click', () => {
    hwState.keyOffset = (hwState.keyOffset + 1) % 12;
    document.getElementById('top-key-label').textContent = NOTE_NAMES[hwState.keyOffset];
    renderRgbPads();
    renderKeybed25();
  });
  document.getElementById('scale-select')?.addEventListener('change', e => {
    hwState.scaleIdx = parseInt(e.target.value);
    renderRgbPads();
    renderKeybed25();
  });

  // Tema visual del chasis
  document.getElementById('theme-select')?.addEventListener('change', e => {
    document.body.classList.remove('theme-white', 'theme-black', 'theme-cyber', 'theme-80s', 'theme-mcr');
    document.body.classList.add(`theme-${e.target.value}`);
    safeSet('minilab3_theme', e.target.value);
  });

  // Modo Compacto para agrandar el teclado en pantallas chicas
  document.getElementById('btn-compact-toggle')?.addEventListener('click', e => {
    document.body.classList.toggle('compact-deck');
    e.currentTarget.classList.toggle('active', document.body.classList.contains('compact-deck'));
  });

  // Panic / Stop All
  document.getElementById('btn-panic')?.addEventListener('click', panicStopAll);

  // MIDI Learn
  document.getElementById('btn-midi-learn')?.addEventListener('click', () => toggleMidiLearn());
  document.getElementById('btn-midi-status')?.addEventListener('click', () => toggleMidiLearn());

  // Botones Hardware Izquierda: SHIFT, HOLD, OCT-, OCT+
  const shiftBtn = document.getElementById('hw-btn-shift');
  shiftBtn?.addEventListener('click', () => {
    hwState.shiftHeld = !hwState.shiftHeld;
    shiftBtn.classList.toggle('active', hwState.shiftHeld);
    updateOledDisplay(hwState.shiftHeld ? '🔶 SHIFT ACTIVO' : 'SHIFT OFF', 'Tocá cualquier perilla', 'para elegir parámetro');
  });

  document.getElementById('hw-btn-hold')?.addEventListener('click', () => {
    setHoldState(!hwState.holdActive);
  });

  document.getElementById('hw-btn-oct-down')?.addEventListener('click', () => {
    if (hwState.octave > 1) {
      hwState.octave--;
      renderKeybed25();
      updateOledDisplay('🎹 OCTAVA −', `Rango: C${hwState.octave} a C${hwState.octave + 2}`, `Oct ${hwState.octave}`);
    }
  });

  document.getElementById('hw-btn-oct-up')?.addEventListener('click', () => {
    if (hwState.octave < 5) {
      hwState.octave++;
      renderKeybed25();
      updateOledDisplay('🎹 OCTAVA +', `Rango: C${hwState.octave} a C${hwState.octave + 2}`, `Oct ${hwState.octave}`);
    }
  });

  // Encoder Principal (Arrastrar para cambiar Preset, doble click para abrir selector)
  const mainEnc = document.getElementById('main-encoder');
  if (mainEnc) {
    let lastEncY = 0;
    mainEnc.addEventListener('pointerdown', e => {
      e.preventDefault();
      initAudio();
      mainEnc.setPointerCapture(e.pointerId);
      lastEncY = e.clientY;
      const move = ev => {
        const dy = lastEncY - ev.clientY;
        if (Math.abs(dy) >= 18) {
          cyclePresetByStep(dy > 0 ? 1 : -1);
          lastEncY = ev.clientY;
        }
      };
      const up = () => {
        mainEnc.removeEventListener('pointermove', move);
        mainEnc.removeEventListener('pointerup', up);
      };
      mainEnc.addEventListener('pointermove', move);
      mainEnc.addEventListener('pointerup', up);
    });
    mainEnc.addEventListener('dblclick', () => openParamAssignModal('knob', 0));
  }

  // Botones al lado del Encoder: BEAT, ARP, SEQ 16, GUÍA
  document.getElementById('btn-deck-beat')?.addEventListener('click', toggleBeat);

  document.getElementById('btn-deck-arp')?.addEventListener('click', e => {
    const sel = document.getElementById('latch-arp-select');
    if (!sel) return;
    if (hwState.latchMode === 'off') {
      hwState.latchMode = 'arp_up';
      sel.value = 'arp_up';
      e.currentTarget.classList.add('active');
      updateOledDisplay('🌀 ARPEGIADOR ON', 'Modo: Arp Subida 1/16', 'Tocá un Pad Acorde');
    } else {
      hwState.latchMode = 'off';
      sel.value = 'off';
      e.currentTarget.classList.remove('active');
      stopLatchedChord();
      updateOledDisplay('🌀 ARPEGIADOR OFF', 'Modo Manual', 'OK');
    }
  });

  document.getElementById('btn-deck-seq')?.addEventListener('click', openSequencerModal);

  document.getElementById('btn-deck-guide')?.addEventListener('click', e => {
    hwState.showGuide = !hwState.showGuide;
    e.currentTarget.classList.toggle('active', hwState.showGuide);
    renderKeybed25();
  });

  // Bancos de las 8 Perillas
  document.querySelectorAll('[data-bank]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-bank]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const bank = KNOB_BANKS[btn.dataset.bank];
      if (bank) {
        hwState.knobAssignments = [...bank];
        refreshKnobsAndFadersUI();
        updateOledDisplay(`🎛️ BANCO PERILLAS`, btn.textContent, '8 Controles listos');
      }
    });
  });

  // Bancos de los 4 Faders
  document.querySelectorAll('[data-fbank]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-fbank]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const fbank = FADER_BANKS[btn.dataset.fbank];
      if (fbank) {
        hwState.faderAssignments = [...fbank];
        refreshKnobsAndFadersUI();
        updateOledDisplay(`🎚️ BANCO FADERS`, btn.textContent, '4 Faders listos');
      }
    });
  });

  // Modos de los 8 Pads RGB
  document.querySelectorAll('[data-padmode]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-padmode]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      hwState.padMode = btn.dataset.padmode;
      renderRgbPads();
    });
  });

  document.getElementById('chord-mod-select')?.addEventListener('change', e => {
    hwState.chordMod = e.target.value;
    renderRgbPads();
  });

  document.getElementById('latch-arp-select')?.addEventListener('change', e => {
    hwState.latchMode = e.target.value;
    document.getElementById('btn-deck-arp')?.classList.toggle('active', hwState.latchMode !== 'off');
    if (hwState.latchMode === 'off') stopLatchedChord();
    else if (latchedChordState) ensureSequencerClock();
  });

  document.getElementById('drum-pattern-select')?.addEventListener('change', e => {
    const p = DRUM_PATTERNS[e.target.value];
    if (p) currentDrumSteps = JSON.parse(JSON.stringify(p));
  });

  // Cierre de Modales
  document.getElementById('btn-close-param-modal')?.addEventListener('click', () => {
    document.getElementById('param-modal')?.classList.add('hidden');
  });
  document.getElementById('btn-close-seq-modal')?.addEventListener('click', () => {
    document.getElementById('seq-modal')?.classList.add('hidden');
  });
  document.getElementById('btn-seq-random')?.addEventListener('click', () => {
    ['kick', 'deepkick', 'snare', 'hihat', 'openhat', 'ride'].forEach(t => {
      for (let s = 0; s < 16; s++) {
        currentDrumSteps[t][s] = Math.random() > (t === 'hihat' ? 0.4 : 0.78) ? 1 : 0;
      }
    });
    openSequencerModal();
  });
  document.getElementById('btn-seq-clear')?.addEventListener('click', () => {
    ['kick', 'deepkick', 'snare', 'hihat', 'openhat', 'ride'].forEach(t => {
      currentDrumSteps[t].fill(0);
    });
    openSequencerModal();
  });

  // Descargar todos los 24 instrumentos samplados para uso 100% Offline sin internet
  document.getElementById('btn-offline-samples')?.addEventListener('click', downloadAllSamplesForOffline);
}

let isDownloadingOfflinePack = false;

async function downloadAllSamplesForOffline() {
  if (isDownloadingOfflinePack) return;
  initAudio();
  isDownloadingOfflinePack = true;
  const btn = document.getElementById('btn-offline-samples');
  const timbres = Object.keys(SAMPLE_URLS);
  const total = timbres.length;
  let completed = 0;

  if (btn) btn.textContent = '⏳ 0%';
  updateOledDisplay('📥 DESCARGANDO PACK', `0 / ${total} Instrumentos`, '0%', 0);

  for (const t of timbres) {
    await preloadPianoSamples(t);
    completed++;
    const pct = Math.round((completed / total) * 100);
    if (btn) btn.textContent = `⏳ ${pct}%`;
    updateOledDisplay('📥 DESCARGANDO PACK', `${completed} / ${total} (${t.toUpperCase()})`, `${pct}%`, completed / total);
  }

  isDownloadingOfflinePack = false;
  safeSet('minilab3_offline_pack_ready', '1');
  if (btn) {
    btn.textContent = '✓ Offline OK';
    btn.classList.add('offline-ready');
  }
  updateOledDisplay('✅ PACK OFFLINE LISTO', '24 Instrumentos en Caché', '100%', 1);
}

let deferredPwaPrompt = null;

function setupPwaAndUpdates() {
  const installBtn = document.getElementById('btn-install-pwa');
  const updateBtn = document.getElementById('btn-update-app');
  const offlineBtn = document.getElementById('btn-offline-samples');

  if (safeGet('minilab3_offline_pack_ready') === '1' && offlineBtn) {
    offlineBtn.textContent = '✓ Offline OK';
    offlineBtn.classList.add('offline-ready');
  }

  // Capturar evento de instalación PWA en Android / Chrome / Edge
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPwaPrompt = e;
    installBtn?.classList.remove('hidden');
  });

  installBtn?.addEventListener('click', async () => {
    if (!deferredPwaPrompt) return;
    deferredPwaPrompt.prompt();
    const { outcome } = await deferredPwaPrompt.userChoice;
    deferredPwaPrompt = null;
    if (outcome === 'accepted') {
      installBtn.classList.add('hidden');
      updateOledDisplay('📲 APP INSTALADA', 'Mora MiniLab 3', 'Pantalla Completa');
    }
  });

  window.addEventListener('appinstalled', () => {
    deferredPwaPrompt = null;
    installBtn?.classList.add('hidden');
  });

  // Botón de Actualizar App (Limpia caché de código manteniendo los samples MP3 intactos)
  updateBtn?.addEventListener('click', async () => {
    updateOledDisplay('🔄 ACTUALIZANDO...', 'Descargando última versión', 'GitHub Pages');
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          await reg.update();
          if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          if (reg.active) reg.active.postMessage({ type: 'CLEAR_SHELL_CACHE' });
        }
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(
          keys.filter(k => k.includes('-shell-')).map(k => caches.delete(k))
        );
      }
    } catch (e) {}
    setTimeout(() => window.location.reload(), 250);
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(reg => {
      // Buscar actualizaciones en GitHub automáticamente al abrir
      reg.update().catch(() => {});

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            if (updateBtn) {
              updateBtn.textContent = '✨ ¡Nueva Versión!';
              updateBtn.classList.add('update-ready');
            }
            updateOledDisplay('✨ ACTUALIZACIÓN LISTA', 'Tocá "Nueva Versión" arriba', 'Para aplicar cambios');
          }
        });
      });
    }).catch(() => {});
  }
}

function initApp() {
  const savedTheme = safeGet('minilab3_theme') || 'white';
  document.body.classList.remove('theme-white', 'theme-black', 'theme-cyber', 'theme-80s', 'theme-mcr');
  document.body.classList.add(`theme-${savedTheme}`);
  const themeSel = document.getElementById('theme-select');
  if (themeSel) themeSel.value = savedTheme;

  renderKnobsGrid();
  renderFadersGrid();
  renderRgbPads();
  renderKeybed25();
  setupKeybedTouchEvents();
  setupTouchStrips();
  setupPcKeyboard();
  bindAllControls();
  loadSoundPreset('init_synth');
  initWebMidi();
  startOledOscilloscope();
  setupPwaAndUpdates();
}

window.addEventListener('DOMContentLoaded', initApp);
