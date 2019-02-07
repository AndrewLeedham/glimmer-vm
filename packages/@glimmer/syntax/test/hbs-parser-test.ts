import { hbsParse as parse, hbsPrint as print, hbs, locForSpan } from '@glimmer/syntax';

const MODULE_STACK: string[] = [];

function describe(name: string, callback: () => void) {
  MODULE_STACK.push(name);
  currentModule();

  try {
    callback();
  } finally {
    MODULE_STACK.pop();
    currentModule();
  }
}

function currentModule() {
  if (MODULE_STACK.length === 0) {
    return;
  }

  let last = MODULE_STACK[MODULE_STACK.length - 1];

  QUnit.module(last);
}

function equals<T>(actual: T, expected: T) {
  QUnit.assert.equal(actual, expected);
}

function it(name: string, callback: () => void) {
  QUnit.test(name, callback);
}

function todo(name: string, callback: () => void) {
  QUnit.todo(name, callback);
}

function legacy(name: string, callback: () => void) {
  QUnit.skip(`[not-glimmer] ${name}`, callback);
}

function shouldThrow(callback: () => void, error: typeof Error, pattern?: RegExp) {
  QUnit.assert.raises(callback, error, pattern);
}

describe('@glimmer/syntax - parser', function() {
  function astFor(template: string | hbs.AnyProgram): string {
    let ast = parse(template);
    QUnit.assert.ok(ast.errors.length === 0, 'there were no parse errors');
    return print(ast.result);
  }

  it('parses content', () => {
    equals(astFor('hello'), `CONTENT[ 'hello' ]\n`);
  });

  it('parses simple mustaches', function() {
    equals(astFor('{{123}}'), '{{ NUMBER{123} [] }}\n');
    equals(astFor('{{"foo"}}'), '{{ "foo" [] }}\n');
    equals(astFor('{{false}}'), '{{ BOOLEAN{false} [] }}\n');
    equals(astFor('{{true}}'), '{{ BOOLEAN{true} [] }}\n');
    equals(astFor('{{foo}}'), '{{ /"foo"/ [] }}\n');
    equals(astFor('{{foo?}}'), '{{ /"foo?"/ [] }}\n');
    equals(astFor('{{foo_}}'), '{{ /"foo_"/ [] }}\n');
    equals(astFor('{{foo-}}'), '{{ /"foo-"/ [] }}\n');
    equals(astFor('{{foo:}}'), '{{ /"foo:"/ [] }}\n');
    equals(astFor('{{foo/bar}}'), '{{ /"foo/bar"/ [] }}\n');
  });

  it('parses simple mustaches (whitespace)', function() {
    equals(astFor('{{ 123 }}'), '{{ NUMBER{123} [] }}\n');
    equals(astFor('{{ "foo" }}'), '{{ "foo" [] }}\n');
    equals(astFor('{{ false }}'), '{{ BOOLEAN{false} [] }}\n');
    equals(astFor('{{ true }}'), '{{ BOOLEAN{true} [] }}\n');
    equals(astFor('{{ foo }}'), '{{ /"foo"/ [] }}\n');
    equals(astFor('{{ foo? }}'), '{{ /"foo?"/ [] }}\n');
    equals(astFor('{{ foo_ }}'), '{{ /"foo_"/ [] }}\n');
    equals(astFor('{{ foo- }}'), '{{ /"foo-"/ [] }}\n');
    equals(astFor('{{ foo: }}'), '{{ /"foo:"/ [] }}\n');
  });

  it('parses mustaches with data', function() {
    equals(astFor('{{@foo}}'), '{{ @/"foo"/ [] }}\n');
    equals(astFor('{{@foo.bar}}'), '{{ @/"foo"."bar"/ [] }}\n');
    equals(astFor('{{@foo.bar.baz}}'), '{{ @/"foo"."bar"."baz"/ [] }}\n');

    equals(astFor('{{ @foo }}'), '{{ @/"foo"/ [] }}\n');
    equals(astFor('{{ @foo.bar }}'), '{{ @/"foo"."bar"/ [] }}\n');
    equals(astFor('{{ @foo.bar.baz }}'), '{{ @/"foo"."bar"."baz"/ [] }}\n');
  });

  it('parses mustaches with paths', function() {
    equals(astFor('{{foo.bar}}'), '{{ /"foo"."bar"/ [] }}\n');
    equals(astFor('{{foo.bar.baz}}'), '{{ /"foo"."bar"."baz"/ [] }}\n');

    equals(astFor('{{ foo.bar }}'), '{{ /"foo"."bar"/ [] }}\n');
    equals(astFor('{{ foo.bar.baz }}'), '{{ /"foo"."bar"."baz"/ [] }}\n');
  });

  it('parses mustaches with this/foo (`/` is just a valid identifier character, so `this` is not special', function() {
    equals(astFor('{{this/foo}}'), '{{ /"this/foo"/ [] }}\n');
  });

  it('parses mustaches with this.foo', function() {
    equals(astFor('{{this.foo}}'), '{{ /"this"."foo"/ [] }}\n');
  });

  it('parses mustaches with - in a path', function() {
    equals(astFor('{{foo-bar}}'), '{{ /"foo-bar"/ [] }}\n');
  });

  todo('parses mustaches with escaped [] in a path', function() {
    equals(astFor('{{[foo[\\]]}}'), '{{ /"foo[]"/ [] }}\n');
  });

  todo('parses escaped \\\\ in path', function() {
    equals(astFor('{{[foo\\\\]}}'), '{{ /"foo\\"/ [] }}\n');
  });

  it('parses mustaches with parameters', function() {
    equals(astFor('{{foo bar}}'), '{{ /"foo"/ [/"bar"/] }}\n');
  });

  it('parses mustaches with string parameters', function() {
    equals(astFor('{{foo bar "baz" }}'), '{{ /"foo"/ [/"bar"/, "baz"] }}\n');
  });

  it('parses mustaches with NUMBER parameters', function() {
    equals(astFor('{{foo 1}}'), '{{ /"foo"/ [NUMBER{1}] }}\n');
  });

  it('parses mustaches with BOOLEAN parameters', function() {
    equals(astFor('{{foo true}}'), '{{ /"foo"/ [BOOLEAN{true}] }}\n');
    equals(astFor('{{foo false}}'), '{{ /"foo"/ [BOOLEAN{false}] }}\n');
  });

  it('parses mustaches with undefined and null paths', function() {
    equals(astFor('{{undefined}}'), '{{ UNDEFINED [] }}\n');
    equals(astFor('{{null}}'), '{{ NULL [] }}\n');
  });
  it('parses mustaches with undefined and null parameters', function() {
    equals(astFor('{{foo undefined null}}'), '{{ /"foo"/ [UNDEFINED, NULL] }}\n');
  });

  it('parses mustaches with DATA parameters', function() {
    equals(astFor('{{foo @bar}}'), '{{ /"foo"/ [@/"bar"/] }}\n');
  });

  it('parses mustaches with hash arguments', function() {
    equals(astFor('{{foo bar=baz}}'), '{{ /"foo"/ [] HASH{bar=/"baz"/} }}\n');
    equals(astFor('{{foo bar=1}}'), '{{ /"foo"/ [] HASH{bar=NUMBER{1}} }}\n');
    equals(astFor('{{foo bar=true}}'), '{{ /"foo"/ [] HASH{bar=BOOLEAN{true}} }}\n');
    equals(astFor('{{foo bar=false}}'), '{{ /"foo"/ [] HASH{bar=BOOLEAN{false}} }}\n');
    equals(astFor('{{foo bar=@baz}}'), '{{ /"foo"/ [] HASH{bar=@/"baz"/} }}\n');

    equals(astFor('{{foo bar=baz bat=bam}}'), '{{ /"foo"/ [] HASH{bar=/"baz"/, bat=/"bam"/} }}\n');
    equals(astFor('{{foo bar=baz bat="bam"}}'), '{{ /"foo"/ [] HASH{bar=/"baz"/, bat="bam"} }}\n');

    equals(astFor("{{foo bat='bam'}}"), '{{ /"foo"/ [] HASH{bat="bam"} }}\n');

    equals(
      astFor('{{foo omg bar=baz bat="bam"}}'),
      '{{ /"foo"/ [/"omg"/] HASH{bar=/"baz"/, bat="bam"} }}\n'
    );
    equals(
      astFor('{{foo omg bar=baz bat="bam" baz=1}}'),
      '{{ /"foo"/ [/"omg"/] HASH{bar=/"baz"/, bat="bam", baz=NUMBER{1}} }}\n'
    );
    equals(
      astFor('{{foo omg bar=baz bat="bam" baz=true}}'),
      '{{ /"foo"/ [/"omg"/] HASH{bar=/"baz"/, bat="bam", baz=BOOLEAN{true}} }}\n'
    );
    equals(
      astFor('{{foo omg bar=baz bat="bam" baz=false}}'),
      '{{ /"foo"/ [/"omg"/] HASH{bar=/"baz"/, bat="bam", baz=BOOLEAN{false}} }}\n'
    );
  });

  it('parses contents followed by a mustache', function() {
    equals(astFor('foo bar {{baz}}'), `CONTENT[ 'foo bar ' ]\n{{ /"baz"/ [] }}\n`);
  });

  legacy('parses a partial', function() {
    equals(astFor('{{> foo }}'), '{{> PARTIAL:foo }}\n');
    equals(astFor('{{> "foo" }}'), '{{> PARTIAL:foo }}\n');
    equals(astFor('{{> 1 }}'), '{{> PARTIAL:1 }}\n');
  });

  legacy('parses a partial with context', function() {
    equals(astFor('{{> foo bar}}'), '{{> PARTIAL:foo /"bar"/ }}\n');
  });

  legacy('parses a partial with hash', function() {
    equals(astFor('{{> foo bar=bat}}'), '{{> PARTIAL:foo HASH{bar=/"bat"/} }}\n');
  });

  legacy('parses a partial with context and hash', function() {
    equals(astFor('{{> foo bar bat=baz}}'), '{{> PARTIAL:foo /"bar"/ HASH{bat=/"baz"/} }}\n');
  });

  legacy('parses a partial with a complex name', function() {
    equals(astFor('{{> shared/partial?.bar}}'), '{{> PARTIAL:shared/partial?.bar }}\n');
  });

  legacy('parsers partial blocks', function() {
    equals(
      astFor('{{#> foo}}bar{{/foo}}'),
      "{{> PARTIAL BLOCK:foo PROGRAM:\n  CONTENT[ 'bar' ]\n }}\n"
    );
  });

  legacy('should handle parser block mismatch', function() {
    shouldThrow(
      function() {
        astFor('{{#> goodbyes}}{{/hellos}}');
      },
      Error,
      /goodbyes doesn't match hellos/
    );
  });

  legacy('parsers partial blocks with arguments', function() {
    equals(
      astFor('{{#> foo context hash=value}}bar{{/foo}}'),
      `{{> PARTIAL BLOCK:foo /"context"/ HASH{hash=/"value"/} PROGRAM:\n  CONTENT[ 'bar' ]\n }}\n`
    );
  });

  it('parses a comment', function() {
    equals(astFor('{{! this is a comment }}'), "{{! ' this is a comment ' }}\n");
  });

  it('parses a multi-line comment', function() {
    equals(
      astFor('{{!\nthis is a multi-line comment\n}}'),
      "{{! '\nthis is a multi-line comment\n' }}\n"
    );
  });

  legacy('parses an inverse section', function() {
    equals(
      astFor('{{#foo}} bar {{^}} baz {{/foo}}'),
      `BLOCK:\n  /"foo"/ []\n  PROGRAM:\n    CONTENT[ ' bar ' ]\n  {{^}}\n    CONTENT[ ' baz ' ]\n`
    );
  });

  it('parses an inverse (else-style) section', function() {
    equals(
      astFor('{{#foo}} bar {{else}} baz {{/foo}}'),
      `{{# /"foo"/ [] }}\n  PROGRAM:\n    CONTENT[ ' bar ' ]\n  {{else}}\n    CONTENT[ ' baz ' ]\n`
    );
  });

  it('parses multiple inverse sections', function() {
    equals(
      astFor('{{#foo}} bar {{else if bar}}{{else}} baz {{/foo}}'),
      `{{# /"foo"/ [] }}\n  PROGRAM:\n    CONTENT[ ' bar ' ]\n  {{else}}\n    {{# /"if"/ [/"bar"/] }}\n      PROGRAM:\n      {{else}}\n        CONTENT[ ' baz ' ]\n`
    );
  });

  it('parses empty blocks', function() {
    equals(astFor('{{#foo}}{{/foo}}'), '{{# /"foo"/ [] }}\n  PROGRAM:\n');
  });

  it('parses blocks', function() {
    equals(
      astFor('{{#foo}}hello {{world}} goodbye{{/foo}}'),
      `{{# /"foo"/ [] }}\n  PROGRAM:\n    CONTENT[ 'hello ' ]\n    {{ /"world"/ [] }}\n    CONTENT[ ' goodbye' ]\n`
    );
  });

  legacy('parses empty blocks with empty inverse section', function() {
    equals(astFor('{{#foo}}{{^}}{{/foo}}'), '{{# /"foo"/ [] }}\n  PROGRAM:\n  {{else}}\n');
  });

  it('parses empty blocks with empty inverse (else-style) section', function() {
    equals(astFor('{{#foo}}{{else}}{{/foo}}'), '{{# /"foo"/ [] }}\n  PROGRAM:\n  {{else}}\n');
  });

  legacy('parses non-empty blocks with empty inverse section', function() {
    equals(
      astFor('{{#foo}} bar {{^}}{{/foo}}'),
      `BLOCK:\n  /"foo"/ []\n  PROGRAM:\n    CONTENT[ ' bar ' ]\n  {{^}}\n`
    );
  });

  it('parses non-empty blocks with empty inverse (else-style) section', function() {
    equals(
      astFor('{{#foo}} bar {{else}}{{/foo}}'),
      `{{# /"foo"/ [] }}\n  PROGRAM:\n    CONTENT[ ' bar ' ]\n  {{else}}\n`
    );
  });

  legacy('parses empty blocks with non-empty inverse section', function() {
    equals(
      astFor('{{#foo}}{{^}} bar {{/foo}}'),
      `BLOCK:\n  /"foo"/ []\n  PROGRAM:\n  {{^}}\n    CONTENT[ ' bar ' ]\n`
    );
  });

  it('parses empty blocks with non-empty inverse (else-style) section', function() {
    equals(
      astFor('{{#foo}}{{else}} bar {{/foo}}'),
      `{{# /"foo"/ [] }}\n  PROGRAM:\n  {{else}}\n    CONTENT[ ' bar ' ]\n`
    );
  });

  legacy('parses a standalone inverse section', function() {
    equals(astFor('{{^foo}}bar{{/foo}}'), `BLOCK:\n  /"foo"/ []\n  {{^}}\n    CONTENT[ 'bar' ]\n`);
  });

  it('throws on old inverse section', function() {
    shouldThrow(function() {
      astFor('{{else foo}}bar{{/foo}}');
    }, Error);
  });

  it('parses block with block params', function() {
    equals(
      astFor('{{#foo as |bar baz|}}content{{/foo}}'),
      `{{# /"foo"/ [] as |bar baz| }}\n  PROGRAM:\n    CONTENT[ 'content' ]\n`
    );
  });

  legacy('parses inverse block with block params', function() {
    equals(
      astFor('{{^foo as |bar baz|}}content{{/foo}}'),
      `BLOCK:\n  /"foo"/ []\n  {{^}}\n    BLOCK PARAMS: [ bar baz ]\n    CONTENT[ 'content' ]\n`
    );
  });

  todo('parses chained inverse block with block params', function() {
    equals(
      astFor('{{#foo}}{{else foo as |bar baz|}}content{{/foo}}'),
      `{{# /"foo"/ [] }}\n  PROGRAM:\n  {{else}}\n    {{# /"foo"/ [] as |bar baz| }}\n      PROGRAM:\n        CONTENT[ 'content' ]\n`
    );
  });

  todo("raises if there's a Parse error", function() {
    shouldThrow(
      function() {
        astFor('foo{{^}}bar');
      },
      Error,
      /Parse error on line 1/
    );
    shouldThrow(
      function() {
        astFor('{{foo}');
      },
      Error,
      /Parse error on line 1/
    );
    shouldThrow(
      function() {
        astFor('{{foo &}}');
      },
      Error,
      /Parse error on line 1/
    );
    shouldThrow(
      function() {
        astFor('{{#goodbyes}}{{/hellos}}');
      },
      Error,
      /goodbyes doesn't match hellos/
    );

    shouldThrow(
      function() {
        astFor('{{{{goodbyes}}}} {{{{/hellos}}}}');
      },
      Error,
      /goodbyes doesn't match hellos/
    );
  });

  todo('should handle invalid paths', function() {
    shouldThrow(
      function() {
        astFor('{{foo/../bar}}');
      },
      Error,
      /Invalid path: foo\/\.\. - 1:2/
    );
    shouldThrow(
      function() {
        astFor('{{foo/./bar}}');
      },
      Error,
      /Invalid path: foo\/\. - 1:2/
    );
    shouldThrow(
      function() {
        astFor('{{foo/this/bar}}');
      },
      Error,
      /Invalid path: foo\/this - 1:2/
    );
  });

  todo('knows how to report the correct line number in errors', function() {
    shouldThrow(
      function() {
        astFor('hello\nmy\n{{foo}');
      },
      Error,
      /Parse error on line 3/
    );
    shouldThrow(
      function() {
        astFor('hello\n\nmy\n\n{{foo}');
      },
      Error,
      /Parse error on line 5/
    );
  });

  todo(
    'knows how to report the correct line number in errors when the first character is a newline',
    function() {
      shouldThrow(
        function() {
          astFor('\n\nhello\n\nmy\n\n{{foo}');
        },
        Error,
        /Parse error on line 7/
      );
    }
  );

  describe('externally compiled AST', function() {
    it('can pass through an already-compiled AST', function() {
      equals(print(parse(parse('{{Hello}}').result).result), "CONTENT[ 'Hello' ]\n");
    });
  });

  describe('[not-glimmer] directives', function() {
    legacy('should parse block directives', function() {
      equals(astFor('{{#* foo}}{{/foo}}'), 'DIRECTIVE BLOCK:\n  /"foo"/ []\n  PROGRAM:\n');
    });
    legacy('should parse directives', function() {
      equals(astFor('{{* foo}}'), '{{ DIRECTIVE /"foo"/ [] }}\n');
    });
    legacy('should fail if directives have inverse', function() {
      shouldThrow(
        function() {
          astFor('{{#* foo}}{{^}}{{/foo}}');
        },
        Error,
        /Unexpected inverse/
      );
    });
  });

  it('GH1024 - should track program location properly', function() {
    let source =
      '\n' +
      '  {{#if foo}}\n' +
      '    {{bar}}\n' +
      '       {{else}}    {{baz}}\n' +
      '\n' +
      '     {{/if}}\n' +
      '    ';

    let p = parse(source).result;

    // We really need a deep equals but for now this should be stable...
    equals(
      JSON.stringify(locForSpan(source, p.span)),
      JSON.stringify({
        start: { line: 1, column: 0 },
        end: { line: 7, column: 4 },
      })
    );

    equals(
      JSON.stringify(locForSpan(source, (p.body[1] as hbs.BlockStatement).program.span)),
      JSON.stringify({
        start: { line: 2, column: 13 },
        end: { line: 4, column: 7 },
      })
    );
    equals(
      JSON.stringify(locForSpan(source, (p.body[1] as hbs.BlockStatement).inverse!.span)),
      JSON.stringify({
        start: { line: 4, column: 15 },
        end: { line: 6, column: 5 },
      })
    );
  });
});