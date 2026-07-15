import { navalAlmanack } from './naval-almanack.js';
import { smokeTestStory } from './smoke-test-story.js';

export const contentPacks = [navalAlmanack, smokeTestStory];

export function getContentPack(id) {
  return contentPacks.find((pack) => pack.id === id) || contentPacks[0];
}
