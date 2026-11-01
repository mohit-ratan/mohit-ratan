export function buildReelSlides(recap) {
  return [
    { id: 'intro', type: 'intro', heading: recap.label, caption: 'A month of showing up.', duration: 3400 },
    ...recap.images.map((photo, index) => ({ id: photo.id, type: 'photo', photo, caption: recap.highlights[index % Math.max(1, recap.highlights.length)] || 'Small steps, worth remembering.', duration: 4400 })),
    { id: 'outro', type: 'outro', heading: 'Look how far you came.', caption: 'Keep building on the work you shared.', duration: 4500 },
  ];
}
export function monthlyReelMusic(recap) {
  const category = [...recap.categories].sort((a, b) => b.posts - a.posts)[0]?.category;
  const themes = { health: 'Upbeat', wealth: 'Focused', relationships: 'Warm' };
  const selected = themes[category] ? category : 'health';
  return { src: `/audio/monthly-${selected}.wav`, label: `${themes[selected]} instrumental` };
}
