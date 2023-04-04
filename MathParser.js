const math = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  floor: Math.floor,
  abs: Math.abs,
  gamma: (() => {
    // Approximation for the Gamma function
    // taken from https://stackoverflow.com/questions/15454183/how-to-make-a-function-that-computes-the-factorial-for-numbers-with-decimals
    var g = 7;
    var C = [
      0.99999999999980993, 676.5203681218851, -1259.1392167224028,
      771.32342877765313, -176.61502916214059, 12.507343278686905,
      -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
    ];

    return (z) => {
      if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
      else {
        z -= 1;

        var x = C[0];
        for (var i = 1; i < g + 2; i++) x += C[i] / (z + i);

        var t = z + g + 0.5;
        return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
      }
    };
  })(),
  factorial: (n) => {
    const g = math.gamma(n + 1);
    return Math.abs(g - Math.round(g)) < 1e-6 ? Math.round(g) : g;
  },
};

function MathParser() {
  const prefixOperators = ["-", "+", "sin", "cos", "tan", "floor", "abs"];

  const postfixOperators = ["!"];

  const infixBindingPower = {
    "*": [3, 4],
    "/": [3, 4],
    "+": [1, 2],
    "-": [1, 2],
  };

  const operators = Object.keys(infixBindingPower);

  const tokenizer = new RegExp(
    [
      // Numbers
      "(?:\\.\\d+|\\d+\\.?)\\d*",

      // Prefix operators
      prefixOperators.map((op) => (op.length == 1 ? `\\${op}` : op)).join("|"),

      // Infix operators
      "[" +
        Object.keys(infixBindingPower)
          .map((ch) => `\\${ch}`)
          .join("") +
        "]",

      // Parens
      "\\(|\\)",

      // Postfix
      "[" + postfixOperators.map((ch) => `\\${ch}`).join("") + "]",

      // Parameters/constants
      "\\w+",
    ]
      .map((regex) => `(${regex})`)
      .join("|"),
    "g"
  );

  // const tokenizer = new RegExp(
  //   `((?:(?:\\.\\d|\\d\\.?)\\d*)|[${infixBindingPower
  //     .map((ch) => `\\${ch}`)
  //     .join("")}]|\\w+|\\(|\\))`,
  //   "g"
  // );

  function exprBp(tokens, minBp) {
    let lhs = tokens.pop();

    if (lhs == "(") {
      lhs = exprBp(tokens, 0);
      if (tokens.pop() != ")") {
        throw Error("Expected closing paren ')'");
      }
    }

    if (prefixOperators.includes(lhs)) {
      let rhs = exprBp(tokens, 0);
      lhs = [lhs, [rhs]];
    }

    while (true) {
      if (tokens.length == 0) {
        break;
      }

      let op = tokens[tokens.length - 1];

      if (postfixOperators.includes(op)) {
        tokens.pop();
        lhs = [op, [lhs]];
        continue;
      }

      if (infixBindingPower.hasOwnProperty(op)) {
        let [leftBp, rightBp] = infixBindingPower[op];

        if (leftBp < minBp) {
          break;
        }

        tokens.pop();
        let rhs = exprBp(tokens, rightBp);

        lhs = [op, [lhs, rhs]];
        continue;
      }

      break;
    }

    return lhs;
  }

  function tokenize(input) {
    return input.match(tokenizer).reverse();
  }

  function expr(input) {
    const tokens = tokenize(input);
    console.log("tokens", tokens);
    return exprBp(tokens, 0);
  }

  function displayExpr(input) {
    if (Array.isArray(input)) {
      return `(${input[0]} ${input[1].map(displayExpr).join(" ")})`;
    } else {
      return input;
    }
  }

  const functionToJavascript = {
    "+": "+",
    "-": "-",
    "!": "math.factorial",
    sin: "math.sin",
    cos: "math.cos",
    tan: "math.tan",
    floor: "math.floor",
    abs: "math.abs",
  };

  const functions = {
    "*": (x, y) => x * y,
    "/": (x, y) => x / y,
    "+": (x, y) => x + y,
    "-": (x, y) => x - y,
    "!": math.factorial,
    sin: math.sin,
    cos: math.cos,
    tan: math.tan,
    floor: math.floor,
    abs: math.abs,
  };

  let usesT = false;

  function genCode(expr) {
    if (Array.isArray(expr)) {
      const [fn, args] = expr;
      if (args.length == 1) {
        return `${functionToJavascript[fn]}(${genCode(args[0])})`;
      }
      if ("+-*/".includes(fn)) {
        return `${genCode(args[0])}${fn}${genCode(args[1])}`;
      }
      return `${functionToJavascript[fn]}(${args
        .map((arg) => genCode(arg))
        .join(",")})`;
    }
    if (expr == "t") usesT = true;
    return expr;
  }

  function evaluate(expr, scope) {
    if (Array.isArray(expr)) {
      const [fnName, args] = expr;
      const fn = functions[fnName];
      return fn.apply(
        null,
        args.map((arg) => evaluate(arg, scope))
      );
    }

    if (scope.hasOwnProperty(expr)) {
      return scope[expr];
    }

    return Number(expr);
  }

  function parse(input) {
    usesT = false;
    let ast = expr(input);
    let body = genCode(ast);
    let evaluator = new Function("x", "t", `return ${body}`);
    return evaluator;
  }

  return {
    get lastParsedExpressionUsesT() {
      return usesT;
    },
    parse,
    evaluate,
    expr,
  };

  // let s = expr("-1 * -sin(2 + 3)");
  // let s = expr("sin(x)!+2*2.38/10.28!");
  // let s = expr("sin(y * abs(x*2))");
  // console.log(displayExpr(s));
  // console.log(JSON.stringify(s));

  // let body = genCode(s);

  // console.log(body);

  // let evaluator = new Function("x", "t", `return ${body}`);
}
