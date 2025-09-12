/**
 * JavaScript Minifier - TypeScript port of JShrink
 * 
 * This is a TypeScript port of the JShrink PHP library
 * Original: https://github.com/tedious/JShrink
 */

export interface MinifierOptions {
  flaggedComments?: boolean;
}

export class Minifier {
  private input = '';
  private len = 0;
  private index = 0;
  private a: string | false = '';
  private b: string | false = '';
  private c?: string | false;
  private lastChar = '';
  private output = '';
  private options: MinifierOptions = {};
  private locks: Record<string, string> = {};

  private static readonly stringDelimiters = new Set(['\'', '"', '`']);
  private static readonly defaultOptions: MinifierOptions = { flaggedComments: true };
  private static readonly keywords = ['delete', 'do', 'for', 'in', 'instanceof', 'return', 'typeof', 'yield'];
  private static readonly maxKeywordLen = Math.max(...Minifier.keywords.map(k => k.length));

  private static readonly noNewLineCharacters = new Set(['(', '-', '+', '[', '#', '@']);

  /**
   * Takes a string containing javascript and removes unneeded characters
   * to shrink the code without altering its functionality.
   */
  public static minify(js: string, options: MinifierOptions = {}): string {
    const jshrink = new Minifier();
    
    try {
      js = jshrink.lock(js);
      js = jshrink.minifyToString(js, options).trimStart();
      js = jshrink.unlock(js);
      return js;
    } catch (error) {
      jshrink.clean();
      throw error;
    }
  }

  /**
   * Processes a javascript string and outputs only the required characters
   */
  private minifyToString(js: string, options: MinifierOptions): string {
    this.initialize(js, options);
    this.loop();
    this.clean();
    return this.output;
  }

  /**
   * Initializes internal variables, normalizes new lines
   */
  private initialize(js: string, options: MinifierOptions): void {
    this.options = { ...Minifier.defaultOptions, ...options };
    this.input = `${js}\n`; // Add newline to handle comments at end
    this.len = this.input.length;
    this.a = '\n';
    this.b = '\n';
    this.lastChar = '\n';
    this.output = '';
    this.index = 0;
  }

  /**
   * Output a character and update lastChar
   */
  private echo(char: string): void {
    this.output += char;
    this.lastChar = char[char.length - 1];
  }

  /**
   * The primary loop that processes the input string
   */
  private loop(): void {
    while (this.a !== false && this.a !== null && this.a !== '') {
      switch (this.a) {
        case '\r':
        case '\n':
          // Preserve newline if next character can't stand alone
          if (this.b !== false && Minifier.noNewLineCharacters.has(this.b)) {
            this.echo(this.a);
            this.saveString();
            break;
          }

          // Skip if B is a space, go to string/regex check
          if (this.b === ' ') {
            break;
          }

        // Treat newline like space
        case ' ':
          if (Minifier.isAlphaNumeric(this.b)) {
            this.echo(this.a);
          }
          this.saveString();
          break;

        default:
          switch (this.b) {
            case '\r':
            case '\n':
              if ('}])+-"\''.includes(this.a)) {
                this.echo(this.a);
                this.saveString();
                break;
              } else {
                if (Minifier.isAlphaNumeric(this.a)) {
                  this.echo(this.a);
                  this.saveString();
                }
              }
              break;

            case ' ':
              if (!Minifier.isAlphaNumeric(this.a)) {
                break;
              }

            default:
              // Check for regex that breaks stuff
              if (this.a === '/' && (this.b === '\'' || this.b === '"')) {
                this.saveRegex();
                continue;
              }

              this.echo(this.a);
              this.saveString();
              break;
          }
      }

      // Get next real character
      this.b = this.getReal();

      // Check for regex patterns
      if (this.b === '/') {
        const validTokens = '(,=:[!&|?\n';
        let lastToken = this.a;
        if (lastToken === ' ') {
          lastToken = this.lastChar;
        }

        if (validTokens.includes(lastToken)) {
          this.saveRegex();
        } else if (this.endsInKeyword()) {
          this.saveRegex();
        }
      }
    }
  }

  /**
   * Clean up variables
   */
  private clean(): void {
    this.input = '';
    this.len = 0;
    this.index = 0;
    this.a = this.b = '';
    this.c = undefined;
    this.options = {};
  }

  /**
   * Get the next character from input
   */
  private getChar(): string | false {
    let char: string | false;

    // Check look ahead buffer first
    if (this.c !== undefined) {
      char = this.c;
      this.c = undefined;
    } else {
      char = this.index < this.len ? this.input[this.index] : false;
      if (char === false) {
        return false;
      }
      this.index++;
    }

    // Convert \r to \n
    if (char === '\r') {
      char = '\n';
    }

    // Normalize whitespace except newlines
    if (char !== '\n' && char < '\x20') {
      return ' ';
    }

    return char;
  }

  /**
   * Peek at the next character without advancing index
   */
  private peek(): string | false {
    if (this.index >= this.len) {
      return false;
    }

    let char = this.input[this.index];
    
    if (char === '\r') {
      char = '\n';
    }

    if (char !== '\n' && char < '\x20') {
      return ' ';
    }

    return char;
  }

  /**
   * Get the next "real" character, skipping comments
   */
  private getReal(): string | false {
    const startIndex = this.index;
    const char = this.getChar();

    if (char !== '/') {
      return char;
    }

    this.c = this.getChar();

    if (this.c === '/') {
      this.processOneLineComments(startIndex);
      return this.getReal();
    }if (this.c === '*') {
      this.processMultiLineComments(startIndex);
      return this.getReal();
    }

    return char;
  }

  /**
   * Process single-line comments
   */
  private processOneLineComments(startIndex: number): void {
    const thirdCommentString = this.index < this.len ? this.input[this.index] : false;

    // Skip to end of line
    this.getNext('\n');
    this.c = undefined;

    // Handle conditional comments
    if (thirdCommentString === '@') {
      const endPoint = this.index - startIndex;
      this.c = `\n${this.input.substring(startIndex, startIndex + endPoint)}`;
    }
  }

  /**
   * Process multi-line comments
   */
  private processMultiLineComments(startIndex: number): void {
    this.getChar(); // consume current c
    const thirdCommentString = this.getChar();

    // Detect empty comment /**/
    if (thirdCommentString === '*') {
      const peekChar = this.peek();
      if (peekChar === '/') {
        this.index++;
        return;
      }
    }

    // Find end of comment
    if (this.getNext('*/')) {
      this.getChar(); // get *
      this.getChar(); // get /
      const char = this.getChar(); // get next real character

      // Preserve flagged comments and conditional comments
      if (
        (this.options.flaggedComments && thirdCommentString === '!') ||
        (thirdCommentString === '@')
      ) {
        if (startIndex > 0) {
          this.echo(this.a);
          this.a = ' ';

          if (this.input[startIndex - 1] === '\n') {
            this.echo('\n');
          }
        }

        const endPoint = (this.index - 1) - startIndex;
        this.echo(this.input.substring(startIndex, startIndex + endPoint));
        
        // Fix: Don't add extra space after preserved comments
        this.c = char;
        return;
      }
    } else {
      throw new Error(`Unclosed multiline comment at position: ${this.index - 2}`);
    }

    this.c = this.getChar();
  }

  /**
   * Find the next occurrence of a string
   */
  private getNext(string: string): string | false {
    const pos = this.input.indexOf(string, this.index);
    
    if (pos === -1) {
      return false;
    }

    this.index = pos;
    return this.index < this.len ? this.input[this.index] : false;
  }

  /**
   * Save a complete string (quoted)
   */
  private saveString(): void {
    const startpos = this.index;
    this.a = this.b;

    if (!Minifier.stringDelimiters.has(this.a)) {
      return;
    }

    const stringType = this.a;
    this.echo(this.a);

    while ((this.a = this.getChar()) !== false) {
      switch (this.a) {
        case stringType:
          // String is finished - echo the closing quote and return immediately
          this.echo(this.a);
          this.a = this.getChar(); // Move to next character
          return;

        case '\n':
          if (stringType === '`') {
            // Template literals can contain newlines
            this.echo(this.a);
          } else {
            throw new Error(`Unclosed string at position: ${startpos}`);
          }
          break;

        case '\\':
          // Handle escaped characters
          this.b = this.getChar();
          
          if (this.b === '\n') {
            // Skip escaped newlines
            break;
          }

          this.echo(this.a + this.b);
          break;

        default:
          this.echo(this.a);
      }
    }
  }

  /**
   * Save a complete regex pattern
   */
  private saveRegex(): void {
    if (this.a !== ' ') {
      this.echo(this.a);
    }

    this.echo(this.b);
    
    let characterClass = false;
    let characterClassIndex: number | null = null;

    while ((this.a = this.getChar()) !== false) {
      if (this.a === '/' && !characterClass) {
        break;
      }

      if (this.a === '[') {
        characterClass = true;
        characterClassIndex = this.index;
      } else if (this.a === ']') {
        characterClass = false;
      }

      if (this.a === '\\') {
        this.echo(this.a);
        this.a = this.getChar();
      }

      if (this.a === '\n') {
        if (characterClass) {
          throw new Error(`Unclosed character class at position: ${characterClassIndex}`);
        }
        throw new Error(`Unclosed regex pattern at position: ${this.index}`);
      }

      this.echo(this.a);
    }
    
    this.b = this.getReal();
  }

  /**
   * Check if a character is alphanumeric
   */
  private static isAlphaNumeric(char: string | false): boolean {
    if (!char) return false;
    return /^[\w$\p{L}]$/u.test(char) || char === '/';
  }

  /**
   * Check if output ends with a keyword
   */
  private endsInKeyword(): boolean {
    const testOutput = (this.output + this.a).slice(-(Minifier.maxKeywordLen + 10));
    
    for (const keyword of Minifier.keywords) {
      const pattern = new RegExp(`[^\\w]${keyword}[ ]?$`, 'i');
      if (pattern.test(testOutput)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Lock patterns to prevent minification
   */
  private lock(js: string): string {
    const lock = `"LOCK---${Date.now()}${Math.random()}"`;
    const matches = js.match(/([+-])(\s+)([+-])/g);
    
    if (!matches) {
      return js;
    }

    // Process all matches
    for (const match of matches) {
      const parts = match.match(/([+-])(\s+)([+-])/);
      if (parts) {
        const lockKey = `"LOCK---${Date.now()}${Math.random()}"`;
        this.locks[lockKey] = parts[2];
        js = js.replace(match, `${parts[1]}${lockKey}${parts[3]}`);
      }
    }

    return js;
  }

  /**
   * Unlock patterns after minification
   */
  private unlock(js: string): string {
    if (Object.keys(this.locks).length === 0) {
      return js;
    }

    for (const [lock, replacement] of Object.entries(this.locks)) {
      js = js.replace(new RegExp(lock.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement);
    }

    return js;
  }
}