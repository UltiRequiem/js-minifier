// minifier.ts
class Minifier {
  input = "";
  len = 0;
  index = 0;
  a = "";
  b = "";
  c;
  lastChar = "";
  output = "";
  options = {};
  locks = {};
  static stringDelimiters = new Set(["'", '"', "`"]);
  static defaultOptions = { flaggedComments: true };
  static keywords = ["delete", "do", "for", "in", "instanceof", "return", "typeof", "yield"];
  static maxKeywordLen = Math.max(...Minifier.keywords.map((k) => k.length));
  static noNewLineCharacters = new Set(["(", "-", "+", "[", "#", "@"]);
  static minify(js, options = {}) {
    const jshrink = new Minifier;
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
  minifyToString(js, options) {
    this.initialize(js, options);
    this.loop();
    this.clean();
    return this.output;
  }
  initialize(js, options) {
    this.options = { ...Minifier.defaultOptions, ...options };
    this.input = `${js}
`;
    this.len = this.input.length;
    this.a = `
`;
    this.b = `
`;
    this.lastChar = `
`;
    this.output = "";
    this.index = 0;
  }
  echo(char) {
    this.output += char;
    this.lastChar = char[char.length - 1];
  }
  loop() {
    while (this.a !== false && this.a !== null && this.a !== "") {
      switch (this.a) {
        case "\r":
        case `
`:
          if (this.b !== false && Minifier.noNewLineCharacters.has(this.b)) {
            this.echo(this.a);
            this.saveString();
            break;
          }
          if (this.b === " ") {
            break;
          }
        case " ":
          if (Minifier.isAlphaNumeric(this.b)) {
            this.echo(this.a);
          }
          this.saveString();
          break;
        default:
          switch (this.b) {
            case "\r":
            case `
`:
              if (`}])+-"'`.includes(this.a)) {
                this.echo(this.a);
                this.saveString();
                break;
              }
              if (Minifier.isAlphaNumeric(this.a)) {
                this.echo(this.a);
                this.saveString();
              }
              break;
            case " ":
              if (!Minifier.isAlphaNumeric(this.a)) {
                break;
              }
            default:
              if (this.a === "/" && (this.b === "'" || this.b === '"')) {
                this.saveRegex();
                continue;
              }
              this.echo(this.a);
              this.saveString();
              break;
          }
      }
      this.b = this.getReal();
      if (this.b === "/") {
        const validTokens = `(,=:[!&|?
`;
        let lastToken = this.a;
        if (lastToken === " ") {
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
  clean() {
    this.input = "";
    this.len = 0;
    this.index = 0;
    this.a = this.b = "";
    this.c = undefined;
    this.options = {};
  }
  getChar() {
    let char;
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
    if (char === "\r") {
      char = `
`;
    }
    if (char !== `
` && char < " ") {
      return " ";
    }
    return char;
  }
  peek() {
    if (this.index >= this.len) {
      return false;
    }
    let char = this.input[this.index];
    if (char === "\r") {
      char = `
`;
    }
    if (char !== `
` && char < " ") {
      return " ";
    }
    return char;
  }
  getReal() {
    const startIndex = this.index;
    const char = this.getChar();
    if (char !== "/") {
      return char;
    }
    this.c = this.getChar();
    if (this.c === "/") {
      this.processOneLineComments(startIndex);
      return this.getReal();
    }
    if (this.c === "*") {
      this.processMultiLineComments(startIndex);
      return this.getReal();
    }
    return char;
  }
  processOneLineComments(startIndex) {
    const thirdCommentString = this.index < this.len ? this.input[this.index] : false;
    this.getNext(`
`);
    this.c = undefined;
    if (thirdCommentString === "@") {
      const endPoint = this.index - startIndex;
      this.c = `
${this.input.substring(startIndex, startIndex + endPoint)}`;
    }
  }
  processMultiLineComments(startIndex) {
    this.getChar();
    const thirdCommentString = this.getChar();
    if (thirdCommentString === "*") {
      const peekChar = this.peek();
      if (peekChar === "/") {
        this.index++;
        return;
      }
    }
    if (this.getNext("*/")) {
      this.getChar();
      this.getChar();
      const char = this.getChar();
      if (this.options.flaggedComments && thirdCommentString === "!" || thirdCommentString === "@") {
        if (startIndex > 0) {
          this.echo(this.a);
          this.a = " ";
          if (this.input[startIndex - 1] === `
`) {
            this.echo(`
`);
          }
        }
        const endPoint = this.index - 1 - startIndex;
        this.echo(this.input.substring(startIndex, startIndex + endPoint));
        this.c = char;
        return;
      }
    } else {
      throw new Error(`Unclosed multiline comment at position: ${this.index - 2}`);
    }
    this.c = this.getChar();
  }
  getNext(string) {
    const pos = this.input.indexOf(string, this.index);
    if (pos === -1) {
      return false;
    }
    this.index = pos;
    return this.index < this.len ? this.input[this.index] : false;
  }
  saveString() {
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
          this.echo(this.a);
          this.a = this.getChar();
          return;
        case `
`:
          if (stringType === "`") {
            this.echo(this.a);
          } else {
            throw new Error(`Unclosed string at position: ${startpos}`);
          }
          break;
        case "\\":
          this.b = this.getChar();
          if (this.b === `
`) {
            break;
          }
          this.echo(this.a + this.b);
          break;
        default:
          this.echo(this.a);
      }
    }
  }
  saveRegex() {
    if (this.a !== " ") {
      this.echo(this.a);
    }
    this.echo(this.b);
    let characterClass = false;
    let characterClassIndex = null;
    while ((this.a = this.getChar()) !== false) {
      if (this.a === "/" && !characterClass) {
        break;
      }
      if (this.a === "[") {
        characterClass = true;
        characterClassIndex = this.index;
      } else if (this.a === "]") {
        characterClass = false;
      }
      if (this.a === "\\") {
        this.echo(this.a);
        this.a = this.getChar();
      }
      if (this.a === `
`) {
        if (characterClass) {
          throw new Error(`Unclosed character class at position: ${characterClassIndex}`);
        }
        throw new Error(`Unclosed regex pattern at position: ${this.index}`);
      }
      this.echo(this.a);
    }
    this.b = this.getReal();
  }
  static isAlphaNumeric(char) {
    if (!char)
      return false;
    return /^[\w$\p{L}]$/u.test(char) || char === "/";
  }
  endsInKeyword() {
    const testOutput = (this.output + this.a).slice(-(Minifier.maxKeywordLen + 10));
    for (const keyword of Minifier.keywords) {
      const pattern = new RegExp(`[^\\w]${keyword}[ ]?$`, "i");
      if (pattern.test(testOutput)) {
        return true;
      }
    }
    return false;
  }
  lock(js) {
    const lock = `"LOCK---${Date.now()}${Math.random()}"`;
    const matches = js.match(/([+-])(\s+)([+-])/g);
    if (!matches) {
      return js;
    }
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
  unlock(js) {
    if (Object.keys(this.locks).length === 0) {
      return js;
    }
    for (const [lock, replacement] of Object.entries(this.locks)) {
      js = js.replace(new RegExp(lock.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), replacement);
    }
    return js;
  }
}
export {
  Minifier
};
