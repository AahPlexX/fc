export const SAMPLE_CSV = `name,note,amount\nAlice,"Hello, world",42\nBob,"=SUM(1,2)",7`;
export const SAMPLE_TSV = `name\tnote\nAlice\tHello\nBob\tWorld`;
export const SAMPLE_JSON = JSON.stringify([
  { name: "Alice", note: "A&B", amount: 42 },
  { name: "Bob", note: "<admin>|pipe", amount: 7 },
]);
export const PLAIN_PROSE = "Hello, world\nThis is ordinary prose without a stable tabular shape.";
