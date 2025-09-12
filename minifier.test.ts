import { describe, test, expect } from "bun:test";
import { Minifier } from "./minifier";

describe("Minifier", () => {
  describe("Basic minification", () => {
    test("should remove unnecessary whitespace", () => {
      const input = "var x = 1;    var y = 2;";
      const expected = "var x=1;var y=2;";
      expect(Minifier.minify(input)).toBe(expected);
    });

    test("should remove line breaks", () => {
      const input = "var x = 1;\nvar y = 2;";
      const expected = "var x=1;var y=2;";
      expect(Minifier.minify(input)).toBe(expected);
    });

    test("should preserve necessary spaces around operators", () => {
      const input = "var x = a + b;";
      const expected = "var x=a+b;";
      expect(Minifier.minify(input)).toBe(expected);
    });

    test("should handle mixed whitespace", () => {
      const input = "  var   x   =   1  ;  \n  var   y   =   2  ;  ";
      const expected = "var x=1;var y=2;";
      expect(Minifier.minify(input)).toBe(expected);
    });

    test("should preserve spaces around increment/decrement operators", () => {
      const input = "x + +y; a - -b;";
      const expected = "x+ +y;a- -b;";
      expect(Minifier.minify(input)).toBe(expected);
    });
  });

  describe("Comment handling", () => {
    test("should remove single-line comments", () => {
      const input = "var x = 1; // this is a comment\nvar y = 2;";
      const expected = "var x=1;var y=2;";
      expect(Minifier.minify(input)).toBe(expected);
    });

    test("should remove multi-line comments", () => {
      const input = "var x = 1; /* this is a\nmulti-line comment */ var y = 2;";
      const expected = "var x=1;var y=2;";
      expect(Minifier.minify(input)).toBe(expected);
    });

    test("should preserve flagged comments by default", () => {
      const input = "var x = 1; /*! important comment */ var y = 2;";
      const expected = "var x=1;/*! important comment */var y=2;";
      expect(Minifier.minify(input)).toBe(expected);
    });

    test("should remove flagged comments when option is false", () => {
      const input = "var x = 1; /*! important comment */ var y = 2;";
      const expected = "var x=1;var y=2;";
      expect(Minifier.minify(input, { flaggedComments: false })).toBe(expected);
    });

    test("should preserve conditional comments", () => {
      const input = "var x = 1; /*@ conditional comment */ var y = 2;";
      const expected = "var x=1;/*@ conditional comment */var y=2;";
      expect(Minifier.minify(input)).toBe(expected);
    });

    test("should handle empty comments", () => {
      const input = "var x = 1; /**/ var y = 2;";
      const expected = "var x=1;var y=2;";
      expect(Minifier.minify(input)).toBe(expected);
    });

    test("should handle comments at end of file", () => {
      const input = "var x = 1; // comment at end";
      const expected = "var x=1;";
      expect(Minifier.minify(input)).toBe(expected);
    });
  });

  describe("String handling", () => {
    test("should preserve single-quoted strings", () => {
      const input = "var x = 'hello world';";
      const expected = "var x='hello world';";
      expect(Minifier.minify(input)).toBe(expected);
    });

    test("should preserve double-quoted strings", () => {
      const input = 'var x = "hello world";';
      const expected = 'var x="hello world";';
      expect(Minifier.minify(input)).toBe(expected);
    });

    test("should preserve template literals", () => {
      const input = "var x = `hello world`;";
      const expected = "var x=`hello world`;";
      expect(Minifier.minify(input)).toBe(expected);
    });

    test("should handle escaped quotes in strings", () => {
      const input = "var x = 'hello \\'world\\'';";
      const expected = "var x='hello \\'world\\'';";
      expect(Minifier.minify(input)).toBe(expected);
    });

    test("should handle newlines in template literals", () => {
      const input = "var x = `hello\nworld`;";
      const expected = "var x=`hello\nworld`;";
      expect(Minifier.minify(input)).toBe(expected);
    });

    test("should handle escaped characters in strings", () => {
      const input = "var x = 'hello\\nworld\\t';";
      const expected = "var x='hello\\nworld\\t';";
      expect(Minifier.minify(input)).toBe(expected);
    });

    test("should handle strings with mixed quotes", () => {
      const input = 'var x = "It\'s a test";';
      const expected = 'var x="It\'s a test";';
      expect(Minifier.minify(input)).toBe(expected);
    });
  });

  describe("Regular expression handling", () => {
    test("should preserve regex after return statement", () => {
      const input = "return /test/g;";
      const expected = "return/test/g;";
      expect(Minifier.minify(input)).toBe(expected);
    });

    test("should preserve regex after assignment", () => {
      const input = "var x = /test/i;";
      const expected = "var x=/test/i;";
      expect(Minifier.minify(input)).toBe(expected);
    });

    test("should preserve regex in function call", () => {
      const input = "match(/test/g);";
      const expected = "match(/test/g);";
      expect(Minifier.minify(input)).toBe(expected);
    });

    test("should handle regex with character classes", () => {
      const input = "var x = /[a-z]/g;";
      const expected = "var x=/[a-z]/g;";
      expect(Minifier.minify(input)).toBe(expected);
    });

    test("should handle regex with escaped characters", () => {
      const input = "var x = /\\d+\\.\\d+/;";
      const expected = "var x=/\\d+\\.\\d+/;";
      expect(Minifier.minify(input)).toBe(expected);
    });

    test("should handle regex with forward slashes in character class", () => {
      const input = "var x = /[/]/;";
      const expected = "var x=/[/]/;";
      expect(Minifier.minify(input)).toBe(expected);
    });

    test("should distinguish division from regex", () => {
      const input = "var x = a / b;";
      const expected = "var x=a/b;";
      expect(Minifier.minify(input)).toBe(expected);
    });

    test("should handle regex after keywords", () => {
      const input = "if (test) return /pattern/;";
      const expected = "if(test)return/pattern/;";
      expect(Minifier.minify(input)).toBe(expected);
    });
  });

  describe("Complex JavaScript constructs", () => {
    test("should handle function declarations", () => {
      const input = "function test() { return 1; }";
      const expected = "function test(){return 1;}";
      expect(Minifier.minify(input)).toBe(expected);
    });

    test("should handle object literals", () => {
      const input = "var obj = { a: 1, b: 2 };";
      const expected = "var obj={a:1,b:2};";
      expect(Minifier.minify(input)).toBe(expected);
    });

    test("should handle array literals", () => {
      const input = "var arr = [ 1, 2, 3 ];";
      const expected = "var arr=[1,2,3];";
      expect(Minifier.minify(input)).toBe(expected);
    });

    test("should handle conditional statements", () => {
      const input = "if (x > 0) { y = 1; } else { y = 0; }";
      const expected = "if(x>0){y=1;}else{y=0;}";
      expect(Minifier.minify(input)).toBe(expected);
    });

    test("should handle loops", () => {
      const input = "for (var i = 0; i < 10; i++) { console.log(i); }";
      const expected = "for(var i=0;i<10;i++){console.log(i);}";
      expect(Minifier.minify(input)).toBe(expected);
    });

    test("should handle try-catch blocks", () => {
      const input = "try { doSomething(); } catch (e) { handleError(e); }";
      const expected = "try{doSomething();}catch(e){handleError(e);}";
      expect(Minifier.minify(input)).toBe(expected);
    });
  });

  describe("Edge cases and error handling", () => {
    test("should throw error for unclosed string", () => {
      const input = "var x = 'unclosed string";
      expect(() => Minifier.minify(input)).toThrow("Unclosed string");
    });

    test("should throw error for unclosed multi-line comment", () => {
      const input = "var x = 1; /* unclosed comment";
      expect(() => Minifier.minify(input)).toThrow("Unclosed multiline comment");
    });

    test("should throw error for unclosed regex", () => {
      const input = "var x = /unclosed";
      expect(() => Minifier.minify(input)).toThrow("Unclosed regex pattern");
    });

    test("should throw error for unclosed character class in regex", () => {
      const input = "var x = /[unclosed/;";
      expect(() => Minifier.minify(input)).toThrow("Unclosed character class");
    });

    test("should handle empty input", () => {
      const input = "";
      const expected = "";
      expect(Minifier.minify(input)).toBe(expected);
    });

    test("should handle whitespace-only input", () => {
      const input = "   \n\t  \r\n  ";
      const expected = "";
      expect(Minifier.minify(input)).toBe(expected);
    });

    test("should handle input with only comments", () => {
      const input = "// just a comment\n/* another comment */";
      const expected = "";
      expect(Minifier.minify(input)).toBe(expected);
    });
  });

  describe("Real-world examples", () => {
    test("should minify jQuery-style code", () => {
      const input = `
        $(document).ready(function() {
          $('.button').click(function() {
            alert('Hello World!');
          });
        });
      `;
      const expected = "$(document).ready(function(){$('.button').click(function(){alert('Hello World!');});});";
      expect(Minifier.minify(input)).toBe(expected);
    });

    test("should minify ES6 code", () => {
      const input = `
        const arrow = (x, y) => {
          return x + y;
        };
        
        class MyClass {
          constructor(name) {
            this.name = name;
          }
        }
      `;
      const expected = "const arrow=(x,y)=>{return x+y;};class MyClass{constructor(name){this.name=name;}}";
      expect(Minifier.minify(input)).toBe(expected);
    });

    test("should handle complex regex patterns", () => {
      const input = `
        var emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/;
        var phoneRegex = /^\\+?[1-9]\\d{1,14}$/;
      `;
      const expected = "var emailRegex=/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/;var phoneRegex=/^\\+?[1-9]\\d{1,14}$/;";
      expect(Minifier.minify(input)).toBe(expected);
    });
  });

  describe("Options handling", () => {
    test("should respect flaggedComments option", () => {
      const input = "var x = 1; /*! keep this */ var y = 2;";
      
      const withFlagged = Minifier.minify(input, { flaggedComments: true });
      expect(withFlagged).toContain("/*! keep this */");
      
      const withoutFlagged = Minifier.minify(input, { flaggedComments: false });
      expect(withoutFlagged).not.toContain("/*! keep this */");
    });

    test("should use default options when none provided", () => {
      const input = "var x = 1; /*! flagged comment */";
      const result = Minifier.minify(input);
      expect(result).toContain("/*! flagged comment */");
    });
  });
});