declare module 'twemoji-parser' {
  export interface EmojiEntity {
    url: string;
    indices: [number, number];
    text: string;
    type: 'emoji';
  }

  export interface ParseOptions {
    buildUrl?: (codepoints: string, assetType: string) => string;
    assetType?: string;
  }

  export function parse(text: string, options?: ParseOptions): EmojiEntity[];
}
