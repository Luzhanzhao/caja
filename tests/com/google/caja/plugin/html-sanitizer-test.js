function uriPolicy(value, effects, ltype, hints) {
  if (value && "specialurl" === value.toString()) {
    return value;
  }
  return 'u:' + value.toString();
}

function nmTokenPolicy(nmTokens) {
  if ("specialtoken" === nmTokens) {
    return nmTokens;
  }
  if (/[^a-z\t\n\r ]/i.test(nmTokens)) {
    return null;
  } else {
    return nmTokens.replace(
      /([^\t\n\r ]+)([\t\n\r ]+|$)/g,
      function (_, id, spaces) {
        return 'p-' + id + (spaces ? ' ' : '');
      });
  }
}

var logMessages = [];
function logPolicy(msg, detail) {
  logMessages.push(msg);
}

function check1(original, opt_result) {
  if (opt_result === void 0) {
    opt_result = original;
  }
  var sanitized = html.sanitize(original, uriPolicy, nmTokenPolicy);
  assertEquals(opt_result, sanitized);
}

function check(original, opt_result) {
  check1(original, opt_result);
  jsunit.pass();
}

function interactiveTest(input) {
  var result = html.sanitize(input, uriPolicy, nmTokenPolicy);
  var el = document.getElementById('results');
  el.innerHTML = '';
  el.appendChild(document.createTextNode(result));
}

jsunitRegister('testEmpty',
               function testEmpty() {
  check('');
});

jsunitRegister('testSimpleText',
               function testSimpleText() {
  check('hello world');
});

jsunitRegister('testEntities1',
               function testEntities1() {
  check('&lt;hello world&gt;');
});

jsunitRegister('testEntities2',
               function testEntities2() {
  check('&amp&amp;&&amp',
        '&amp;amp&amp;&amp;&amp;amp');
});

jsunitRegister('testUnknownTagsRemoved',
               function testUnknownTagsRemoved() {
  check('<u:y><b>hello <bogus><i>world</i></bogus></b>',
        '<b>hello <i>world</i></b>');
});

jsunitRegister('testUnsafeTagsRemoved',
               function testUnsafeTagsRemoved() {
  check('<b>hello <i>world</i><script src=foo.js></script></b>',
        '<b>hello <i>world</i></b>');
});

jsunitRegister('testUnsafeAttributesRemoved',
               function testUnsafeAttributesRemoved() {
  check('<b>hello <i onclick="takeOverWorld(this)">world</i></b>',
        '<b>hello <i>world</i></b>');
});

jsunitRegister('testCruftEscaped',
               function testCruftEscaped() {
  check('<b>hello <i>world<</i></b> & tomorrow the universe',
        '<b>hello <i>world&lt;</i></b> &amp; tomorrow the universe');
});

jsunitRegister('testTagCruftRemoved',
               function testTagCruftRemoved() {
  check('<b id="foo" / -->hello <i>world<</i></b>',
        '<b id="p-foo">hello <i>world&lt;</i></b>');
});

jsunitRegister('testIdsAndClassesPrefixed',
               function testIdsAndClassesPrefixed() {
  check('<b id="foo" class="boo bar baz">hello <i>world<</i></b>',
        '<b id="p-foo" class="p-boo p-bar p-baz">hello <i>world&lt;</i></b>');
});

jsunitRegister('testInvalidIdsAndClassesRemoved',
               function testInvalidIdsAndClassesRemoved() {
  check('<b id="a," class="b c/d e">hello <i class="i*j">world<</i></b>',
        '<b>hello <i>world&lt;</i></b>');
});

jsunitRegister('testUsemapPrefixed',
               function testUsemapPrefixed() {
  check('<img usemap="#foo" src="http://bar">',
        '<img usemap="#p-foo" src="u:http://bar">');
});

jsunitRegister('testInvalidUsemapRemoved',
               function testInvalidUsemapRemoved() {
  check1('<img src="http://bar">',
         '<img src="u:http://bar">');
  check1('<img usemap="" src="http://bar">',
         '<img src="u:http://bar">');
  check1('<img usemap="foo" src="http://bar">',
         '<img src="u:http://bar">');
  jsunit.pass();
});

jsunitRegister('testNonStringInput',
               function testNonStringInput() {
  var bad = '<b whacky=foo><script src=badness.js></script>bar</b id=foo>';
  check({ toString: function () { return bad; } },
        '<b>bar</b>');
});

jsunitRegister('testSpecialCharsInAttributes',
               function testSpecialCharsInAttributes() {
  check('<b title="a<b && c>b">bar</b>',
        '<b title="a&lt;b &amp;&amp; c&gt;b">bar</b>');
});

jsunitRegister('testUnclosedTags',
               function testUnclosedTags() {
  check('<div id="foo">Bar<br>Baz',
        '<div id="p-foo">Bar<br>Baz</div>');
});

jsunitRegister('testUnopenedTags',
               function testUnopenedTags() {
  check('Foo<b></select>Bar</b></b>Baz</select>',
        'Foo<b>Bar</b>Baz');
});

jsunitRegister('testUnsafeEndTags',
               function testUnsafeEndTags() {
  check('</meta http-equiv="refresh" content="1;URL=http://evilgadget.com">',
        '');
});

jsunitRegister('testEmptyEndTags',
               function testEmptyEndTags() {
  check('<input></input>',
        '<input>');
});

jsunitRegister('testNoscript',
               function testNoscript() {
  // TODO(kpreid): Shouldn't we emit the noscript content? This is safe but not ideal.
  check('before <noscript>content<img src="http://foo.com/bar" onerror="foo"></noscript> after',
        'before  after');
});

jsunitRegister('testOnLoadStripped',
               function testOnLoadStripped() {
  check('<img src=http://foo.com/bar ONLOAD=alert(1)>',
        '<img src="u:http://foo.com/bar">');
});

jsunitRegister('testClosingTagParameters',
               function testClosingTagParameters() {
  check('<p>1</b style="x"><p>2</p /bar><p>3</p title=">4">5',
        '<p>1<p>2</p><p>3</p>5</p>');
});

jsunitRegister('testOptionalEndTags',
               function testOptionalEndTags() {
  // The difference is significant because in the first, the item contains no
  // space after 'A', but in the third, the item contains 'C' and a space.
  check('<ol> <li>A</li> <li>B<li>C </ol>');
});

jsunitRegister('testFoldingOfHtmlAndBodyTags',
               function testFoldingOfHtmlAndBodyTags() {
  check1('<html><head><title>Foo</title></head>'
         + '<body><p>P 1</p></body></html>',
         '<p>P 1</p>');
  check1('<body bgcolor="blue">Hello</body>',
         'Hello');
  check1('<html>'
         + '<head>'
         + '<title>Blah</title>'
         + '<p>Foo</p>'
         + '</head>'
         + '<body>'
         + '<p>One</p>'
         + '<p>Two</p>'
         + 'Three'
         + '<p>Four</p>'
         + '</body>'
         + '</html>',
         '<p>Foo</p><p>One</p><p>Two</p>Three<p>Four</p>');
  jsunit.pass();
});

jsunitRegister('testEmptyAndValuelessAttributes',
               function testEmptyAndValuelessAttributes() {
  check1('<input checked type=checkbox id="" class=>',
         '<input checked="" type="checkbox" id="" class="">');
  check1('<input checked type=checkbox id= class="">',
         '<input checked="" type="checkbox" id="" class="">');
  check1('<input checked type=checkbox id= class = "">',
         '<input checked="" type="checkbox" id="" class="">');
  jsunit.pass();
});

jsunitRegister('testSgmlShortTags',
               function testSgmlShortTags() {
  // We make no attempt to correctly handle SGML short tags since they are
  // not implemented consistently across browsers, and have been removed from
  // HTML 5.
  //
  // According to http://www.w3.org/QA/2007/10/shorttags.html
  //      Shorttags - the odd side of HTML 4.01
  //      ...
  //      It uses an ill-known feature of SGML called shorthand markup, which
  //      was authorized in HTML up to HTML 4.01. But what used to be a "cool"
  //      feature for SGML experts becomes a liability in HTML, where the
  //      construct is more likely to appear as a typo than as a conscious
  //      choice.
  //
  //      All could be fine if this form typo-that-happens-to-be-legal was
  //      properly implemented in contemporary HTML user-agents. It is not.
  check1('<p/b/', '');  // Short-tag discarded.
  check1('<p<b>', '<p></p>');  // Discard <b attribute
  check1(
      '<p<a href="/">first part of the text</> second part',
      '<p>first part of the text&lt;/&gt; second part</p>');
  jsunit.pass();
});

jsunitRegister('testNul',
               function testNul() {
  // See bug 614 for details.
  check(
      '<A TITLE="x\0  SCRIPT=javascript:alert(1) ignored=ignored">',
      '<a title="x  SCRIPT=javascript:alert(1) ignored=ignored"></a>');
});

jsunitRegister('testDigitsInAttrNames',
               function testDigitsInAttrNames() {
  // See bug 614 for details.
  check(
      '<div style1="expression(\'alert(1)\')">Hello</div>',
      '<div>Hello</div>');
});

jsunitRegister('testIncompleteTagOpen',
               function testIncompleteTagOpen() {
  check1('x<a', 'x');
  check1('x<a ', 'x');
  check1('x<a\n', 'x');
  check1('x<a bc', 'x');
  check1('x<a\nbc', 'x');
  jsunit.pass();
});

jsunitRegister('testUriPolicy',
               function testUriPolicy() {
  assertEquals('<a href="http://www.example.com/">hi</a>',
      html.sanitize('<a href="http://www.example.com/">hi</a>',
        function(uri) { return uri; }));
  assertEquals('<a>hi</a>',
      html.sanitize('<a href="http://www.example.com/">hi</a>',
        function(uri) { return null; }));
  assertEquals('<a>hi</a>',
      html.sanitize('<a href="javascript:alert(1)">hi</a>',
        function(uri) { return uri; }));
  assertEquals('<a>hi</a>',
      html.sanitize('<a href="javascript:alert(1)">hi</a>',
        function(uri) { return null; }));
  assertEquals('<a>hi</a>',
      html.sanitize('<a href=" javascript:alert(1)">hi</a>',
        function(uri) { return uri; }));
  assertEquals('<a>hi</a>',
      html.sanitize('<a href=" javascript:alert(1)">hi</a>',
        function(uri) { return null; }));
  assertEquals('<a href="//www.example.com/">hi</a>',
      html.sanitize('<a href="//www.example.com/">hi</a>',
        function(uri) { return uri; }));
  assertEquals('<a href="foo.html">hi</a>',
      html.sanitize('<a href="foo.html">hi</a>',
        function(uri) { return uri; }));
  assertEquals('<a href="bar/baz.html">hi</a>',
      html.sanitize('<a href="foo.html">hi</a>',
        function(uri) { return "bar/baz.html"; }));
  assertEquals('<a href="mailto:jas@example.com">mail me</a>',
      html.sanitize('<a href="mailto:jas@example.com">mail me</a>',
        function(uri) { return uri; }));
  assertEquals('<a>mail me</a>',
      html.sanitize('<a href="mailto:jas@example.com">mail me</a>',
        function(uri) { return null; }));

  assertEquals('<a href="foo.html">test</a>',
      html.sanitize('<a href="foo.html">test</a>',
        function(uri, effect, ltype, hints) {
      assertEquals("MARKUP", hints.TYPE);
      assertEquals("href", hints.XML_ATTR);
      assertEquals("a", hints.XML_TAG);
      return uri;
  }));
  jsunit.pass();
});

jsunitRegister('testTagPolicy',
               function testTagPolicy() {
  // NOTE: makeHtmlSanitizer / sanitizeWithPolicy is not documented in the wiki
  // JsHtmlSanitizer doc. However, it is used by Caja and other clients. Changes
  // to this API should be noted in releases.
  function checkT(expected, input, tagPolicy) {
    assertEquals(expected, html.sanitizeWithPolicy(input, tagPolicy));
  }
  // pass tag
  checkT('<a href="http://www.example.com/">hi</a> there',
      '<a href="http://www.example.com/">hi</a> there',
      function(name, attribs) {
        return {attribs: attribs};
      });
  // reject tag
  checkT(' there',
      '<a href="http://www.example.com/">hi</a> there',
      function(name, attribs) {
        return null;
      });
  // modify attribs
  checkT('<a x="y">hi</a> there',
      '<a href="http://www.example.com/">hi</a> there',
      function(name, attribs) {
        return {attribs: ["x", "y"]};
      });
  // modify tagName
  checkT('<xax href="http://www.example.com/">hi</xax> there',
      '<a href="http://www.example.com/">hi</a> there',
      function(name, attribs) {
        return {attribs: attribs, tagName: 'x' + name + 'x'};
      });
  function conditionalRewritePolicy(name, attribs) {
    return {attribs: attribs,
            tagName: attribs.length ? 'x' + name + 'x' : name};
  }
  // proper end-tag matching w/ rewrite
  checkT('<span>a<xspanx r="1">b</xspanx>c</span>',
      '<span>a<span r=1>b</span>c</span>',
      conditionalRewritePolicy);
  // proper optional-end-tag handling w/ rewrite - siblings
  // (Note: This example will not sensibly parse as HTML; it is only to stress
  // the intended algorithm here.)
  checkT('<ul><li>a</li><xlix r="1">b</xlix></ul>',
      '<ul><li>a<li r=1>b</li></ul>',
      conditionalRewritePolicy);
  // descendant end-tag matching (Ditto.)
  checkT('<ul><li>a<ul><xlix r="1">b</xlix></ul></li></ul>',
      '<ul><li>a<ul><li r=1>b</li></ul></li></ul>',
      conditionalRewritePolicy);
  jsunit.pass();
});

(function() {
  function registerReplacementTest(name, from, to, input, expectedOutput) {
    var testId = 'testTagPolicyReplacement_' + name;
    jsunitRegister(testId, function() {
      function tagPolicy(name, attribs) {
        if (name === from) {
          // Perform tag replacement.
          return {
            attribs: attribs,
            tagName: to
          };
        } else {
          // Add an attribute to mark that this non-replaced tag was processed.
          var newAttribs = attribs.slice();
          newAttribs.push('seen', '');
          return {
            attribs: newAttribs,
            tagName: name
          };
        }
      }
      assertEquals(expectedOutput, html.sanitizeWithPolicy(input, tagPolicy));
      jsunit.pass();
    });
  }

  // TODO(kpreid): add testing of sanitizing of contents for unambiguity

  registerReplacementTest('CDATA to PCDATA',
      'script', 'xscriptx',
      '<script>&lt; & <img src="s"></script>',
      '<xscriptx>&amp;lt; &amp; &lt;img src="s"&gt;</xscriptx>');

  registerReplacementTest('CDATA to RCDATA',
      'script', 'title',
      '<script>&lt; & <img src="s"></script>',
      '<title>&amp;lt; &amp; &lt;img src="s"&gt;</title>');

  registerReplacementTest('CDATA to CDATA',
      'script', 'style',
      '<script>entity & <img src="s"></script>',
      '<style>entity & <img src="s"></style>');
  // Note that "</>" is an arbitrary choice of innocuous replacement string.
  registerReplacementTest('CDATA to CDATA with conflict',
      'script', 'style',
      '<script>content</sTyLe>content</script>',
      '<style>content</>content</style>');

  registerReplacementTest('RCDATA to PCDATA',
      'title', 'div',
      '<title>&lt; &amp; <img src="s"></title>',
      '<div>&lt; &amp; &lt;img src="s"&gt;</div>');

  registerReplacementTest('RCDATA to RCDATA',
      'title', 'textarea',
      '<title>&lt; &amp; <img src="s"></title>',
      '<textarea>&lt; &amp; &lt;img src="s"&gt;</textarea>');

  // We do not support converting PCDATA to CDATA accurately, because it is not
  // needed for any known use case and could be a security risk.
  registerReplacementTest('RCDATA to CDATA',
      'title', 'style',
      '<title>&lt; &amp; <img src="s"></title>',
      '<style>&lt; &amp; &lt;img src="s"&gt;</style>');
  // Testing specifically the case where the end tag name matches.
  // In the current inaccurate implementation, this is not a risk because it is
  // escaped, but if we choose to implement the more accurate version it must
  // still mangle the end-tag-like text if it matches the new tag name.
  registerReplacementTest('RCDATA to CDATA with conflict',
      'title', 'style',
      '<title>content</sTyLe>content</title>',
      '<style>content&lt;/sTyLe&gt;content</style>');

  // We do not support converting PCDATA to CDATA accurately, because it is not
  // needed for any known use case and could be a security risk.
  registerReplacementTest('PCDATA to CDATA',
      'div', 'script',
      '<div>&lt; &amp; <img src="s"></div>',
      '<script>&lt; &amp; <img src="s" seen=""></script>');

  // Tag will be processed unnecessarily but the result will be safe.
  registerReplacementTest('PCDATA to RCDATA',
      'div', 'title',
      '<div>&lt; &amp; <img src="s"></div>',
      '<title>&lt; &amp; <img src="s" seen=""></title>');

  registerReplacementTest('PCDATA to PCDATA',
      'div', 'span',
      '<div>&lt; &amp; <img src="s"></div>',
      '<span>&lt; &amp; <img src="s" seen=""></span>');

  // TODO(kpreid): tests of PCDATA with nested replacement tags
}());

function assertSanitizerMessages(input, expected, messages) {
  logMessages = [];
  var actual = html.sanitize(input, uriPolicy, nmTokenPolicy, logPolicy);
  assertEquals(expected, actual);
  // legacy sanitizer does not support logging
  if (!html.isLegacy) {
    assertEquals(messages.length, logMessages.length);
    logMessages.forEach(function (val, i) {
      assertEquals(messages[i], val);
    });
  }
}

jsunitRegister('testLogger',
               function testLogger() {
  assertSanitizerMessages('<a href="http://www.example.com/">hi</a>',
    '<a href=\"u:http://www.example.com/\">hi</a>',
    ["a.href changed"]);
  assertSanitizerMessages('<a href="specialurl">hi</a>',
    '<a href=\"specialurl\">hi</a>',
    []);
  assertSanitizerMessages('<div onclick="foo()"></div>',
    '<div></div>',
    ["div.onclick removed"]);
  assertSanitizerMessages(
    '<div onclick="foo()" class="specialtoken" id=baz></div>',
    '<div class="specialtoken" id="p-baz"></div>',
    ["div.onclick removed", "div.id changed"]);
  assertSanitizerMessages(
    '<script>alert(1);</script>',
    '',
    ["script removed"]);
  jsunit.pass();
});

function assertSAXEvents(htmlSource, param, varargs_golden) {
  // events is a flat array of triples (type, data, param)
  var events = [];
  // makeSaxParser doesn't guarantee how text segments are chunked, so here
  // we canonicalize the event stream by combining adjacent text events.
  var addTextEvent = function (type, text, param) {
    var n = events.length;
    if (events[n - 3] === type && events[n - 1] === param) {
      events[n - 2] += text;
    } else {
      events.push(type, text, param);
    }
  };
  var saxParser = html.makeSaxParser({
    startTag: function (name, attribs, param) {
      events.push('startTag', name + '[' + attribs.join(';') + ']', param);
    },
    endTag:   function (name, param) {
      events.push('endTag', name, param);
    },
    pcdata:   function (text, param) {
      addTextEvent('pcdata', text, param);
    },
    cdata:    function (text, param) {
      addTextEvent('cdata', text, param);
    },
    rcdata:   function (text, param) {
      addTextEvent('rcdata', text, param);
    },
    comment:  function (text, param) {
      events.push('comment', text, param);
    },
    startDoc: function (param) {
      events.push('startDoc', '', param);
    },
    endDoc:   function (param) {
      events.push('endDoc', '', param);
    }
  });
  saxParser(htmlSource, param);
  var golden = Array.prototype.slice.call(arguments, 2);
  assertEquals(golden.join("|"), events.join("|"));
}

jsunitRegister('testSaxParser', function () {
  assertSAXEvents(
      "<p id=foo>Foo&amp;Bar</p><script>alert('<b>&amp;</b>')</script>",
      "<param>",

      'startDoc', '', '<param>',
      'startTag', 'p[id;foo]', '<param>',
      'pcdata', 'Foo&amp;Bar', '<param>',
      'endTag', 'p', '<param>',
      'startTag', 'script[]', '<param>',
      'cdata', "alert('<b>&amp;</b>')", '<param>',
      'endTag', 'script', '<param>',
      'endDoc', '', '<param>');
  jsunit.pass();
});

// legacy parser doesn't have comment events
// legacy parser doesn't allow _ in attr names
if (!html.isLegacy) {
  jsunitRegister('testSaxParserComments', function () {
    assertSAXEvents(
        '<some_tag some_attr=x><!--  com>--ment --></some_tag>',
        '$P',

        'startDoc', '', '$P',
        'startTag', 'some_tag[some_attr;x]', '$P',
        'comment', '  com>--ment ', '$P',
        'endTag', 'some_tag', '$P',
        'endDoc', '', '$P');
    jsunit.pass();
  });
}

// legacy parser drops unknown tags
if (!html.isLegacy) {
  jsunitRegister('testSaxParserUnknownTags', function () {
    assertSAXEvents(
        '<div><unknown1><unknown2 bar></unknown1>',
        '$P',
        'startDoc', '', '$P',
        'startTag', 'div[]', '$P',
        'startTag', 'unknown1[]', '$P',
        'startTag', 'unknown2[bar;]', '$P',
        'endTag', 'unknown1', '$P',
        'endDoc', '', '$P'
    );
    jsunit.pass();
  });
}

// legacy parser is more restrictive
if (!html.isLegacy) {
  jsunitRegister('testSaxParserExpansive', function () {
    assertSAXEvents(
        '<x:y 3:.=4></x:y>',
        '$P',
        'startDoc', '', '$P',
        'startTag', 'x:y[3:.;4]', '$P',
        'endTag', 'x:y', '$P',
        'endDoc', '', '$P'
    );
    jsunit.pass();
  });
}

jsunitRegister('testSaxParserConfusingScripts', function () {
  assertSAXEvents(
      '<div class="testcontainer" id="test">' +
      '<script>document.write("<b><script>");</script>' +
      '<script>document.write("document.write(");</script>' +
      '<script>document.write("\'Hello,</b> \'");</script>' +
      '<script>document.write(",\'World!\');<\\/script>");</script>' +
      '!</div>',

      'PARAM',

      'startDoc', '', 'PARAM',
      'startTag', 'div[class;testcontainer;id;test]', 'PARAM',
      'startTag', 'script[]', 'PARAM',
      'cdata', 'document.write("<b><script>");', 'PARAM',
      'endTag', 'script', 'PARAM',
      'startTag', 'script[]', 'PARAM',
      'cdata', 'document.write("document.write(");', 'PARAM',
      'endTag', 'script', 'PARAM',
      'startTag', 'script[]', 'PARAM',
      'cdata', 'document.write("\'Hello,</b> \'");', 'PARAM',
      'endTag', 'script', 'PARAM',
      'startTag', 'script[]', 'PARAM',
      'cdata', 'document.write(",\'World!\');<\\/script>");', 'PARAM',
      'endTag', 'script', 'PARAM',
      'pcdata', '!', 'PARAM',
      'endTag', 'div', 'PARAM',
      'endDoc', '', 'PARAM');
  jsunit.pass();
});
