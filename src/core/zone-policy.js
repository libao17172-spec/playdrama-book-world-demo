export function getZoneNarrationAction(progress, zoneId, isAnotherNarrationPlaying) {
  const visited = progress.visitedZones.includes(zoneId);
  const played = progress.playedNarrations.includes(`zone:${zoneId}`);
  if (!visited && !played && !isAnotherNarrationPlaying) return 'auto-play';
  if (isAnotherNarrationPlaying) return 'show-title';
  return 'offer-replay';
}
