// The learner's own story character, put together on the profile page and in the intro. In the
// stories it stands in for Kumar (see stories.ts, fillName), drawn by StoryCharacter like the cast.
export type FaceShape = 'round' | 'oval' | 'wide' | 'square';
export type EyeStyle = 'dots' | 'big' | 'lashes' | 'tiny';
export type NoseStyle = 'curve' | 'button' | 'round' | 'pointy';
export type AvatarHair = 'short' | 'curly' | 'bob' | 'bun' | 'long' | 'messy' | 'spiky' | 'mohawk' | 'bald';
export type AvatarShirt = 'plain' | 'stripes' | 'checked' | 'hoodie' | 'shirt' | 'blazer' | 'cardigan' | 'tshirt';
export type AvatarExtra = 'none' | 'glasses' | 'shades' | 'beard' | 'moustache' | 'stubble' | 'headphones' | 'crown';

export type Avatar = { skin: string; face: FaceShape; eyes: EyeStyle; nose: NoseStyle; hairStyle: AvatarHair; hair: string; shirt: AvatarShirt; top: string; extra: AvatarExtra };

// Every choice, in the order the editor shows them. Colours are swatches rather than free pickers,
// so every combination stays in the storybook palette.
export const avatarChoices = {
  face: ['round', 'oval', 'wide', 'square'],
  skin: ['#f6d7bd', '#f0c9a8', '#e2b08c', '#d9a07a', '#c99068', '#9a6440', '#7a4a2e', '#5a3624'],
  eyes: ['dots', 'big', 'lashes', 'tiny'],
  nose: ['curve', 'button', 'round', 'pointy'],
  hairStyle: ['short', 'curly', 'bob', 'bun', 'long', 'messy', 'spiky', 'mohawk', 'bald'],
  hair: ['#15110e', '#3b2a20', '#7a4a2a', '#c4522e', '#e2c25a', '#d8d4cc', '#5b3a8a', '#3d6fd1', '#e86a9a'],
  shirt: ['plain', 'stripes', 'checked', 'hoodie', 'shirt', 'blazer', 'cardigan', 'tshirt'],
  top: ['#e6a527', '#d64b45', '#4b78c2', '#34824d', '#8a62b6', '#3f9a9c', '#172a45', '#fffdf7', '#f19a8a'],
  extra: ['none', 'glasses', 'shades', 'beard', 'moustache', 'stubble', 'headphones', 'crown']
} as const satisfies { [K in keyof Avatar]: readonly Avatar[K][] };

export type AvatarPart = keyof typeof avatarChoices;
export const avatarParts = Object.keys(avatarChoices) as AvatarPart[];

export const defaultAvatar: Avatar = { skin: '#f0c9a8', face: 'round', eyes: 'dots', nose: 'curve', hairStyle: 'short', hair: '#3b2a20', shirt: 'plain', top: '#e6a527', extra: 'none' };

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}
// A random character; extras stay rare enough that most rolls are a plain face.
export function randomAvatar(): Avatar {
  return {
    skin: pick(avatarChoices.skin),
    face: pick(avatarChoices.face),
    eyes: pick(avatarChoices.eyes),
    nose: pick(avatarChoices.nose),
    hairStyle: pick(avatarChoices.hairStyle),
    hair: pick(avatarChoices.hair),
    shirt: pick(avatarChoices.shirt),
    top: pick(avatarChoices.top),
    extra: Math.random() < 0.4 ? 'none' : pick(avatarChoices.extra)
  };
}

// Whatever was stored, only known choices come back; anything unknown falls back to the default.
export function parseAvatar(raw: string | null): Avatar | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (!value || typeof value !== 'object') return null;
    const avatar = { ...defaultAvatar };
    for (const part of avatarParts) {
      const choice = value[part];
      if ((avatarChoices[part] as readonly unknown[]).includes(choice)) (avatar as Record<AvatarPart, unknown>)[part] = choice;
    }
    return avatar;
  } catch {
    return null;
  }
}
