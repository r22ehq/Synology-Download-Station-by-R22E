export const completionSounds = [
  { id: 'soft', label: 'Soft chime', file: 'completion-chime.wav' },
  { id: 'glass', label: 'Glass', file: 'completion-glass.wav' },
  { id: 'warm', label: 'Warm', file: 'completion-warm.wav' },
  { id: 'ripple', label: 'Ripple', file: 'completion-ripple.wav' },
  { id: 'sparkle', label: 'Sparkle', file: 'completion-sparkle.wav' },
  { id: 'bloom', label: 'Bloom', file: 'completion-bloom.wav' },
] as const;

export type CompletionSoundId = typeof completionSounds[number]['id'];

export const getCompletionSound = (id: unknown) =>
  completionSounds.find(sound => sound.id === id) || completionSounds[0];
