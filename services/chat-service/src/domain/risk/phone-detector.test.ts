import { detectPhoneNumbers, expandNumberWords } from "./phone-detector";

describe("detectPhoneNumbers (Tanzanian formats + obfuscation)", () => {
  const cases: Array<[input: string, expected: string]> = [
    ["0712345678", "0712345678"],
    ["0755-234-678", "0755234678"],
    ["0655123456", "0655123456"],
    ["0620-345-678", "0620345678"],
    ["0712345678", "0712345678"],
    ["0712 345 678", "0712345678"],
    ["0712-345-678", "0712345678"],
    ["+255712345678", "+255712345678"],
    ["+255 712 345 678", "+255712345678"],
    ["255 712 345 678", "+255712345678"],
    ["255712345678", "+255712345678"],
    ["+712345678", "+255712345678"],
    ["0 7 1 2 3 4 5 6 7 8", "0712345678"],
    ["+ 2 5 5 7 1 2 3 4 5 6 7 8", "+255712345678"],
    ["zero seven one two three four five six seven eight", "0712345678"],
  ];

  for (const [input, expected] of cases) {
    it(`detects "${input}"`, () => {
      expect(detectPhoneNumbers(input)).toEqual([expected]);
    });
  }

  const negative = [
    "hello world",
    "order 0712 pieces please", // short fragment, not a phone
    "my reference is 1234567890123456", // generic long number (bank-like)
    "account: 1234567890", // generic 10 digit, not 0[67]
    "check https://example.com/order255712345678 now", // inside a URL
    "item code A1B2C3D4E5",
  ];

  for (const input of negative) {
    it(`does NOT treat "${input}" as a phone`, () => {
      expect(detectPhoneNumbers(input)).toEqual([]);
    });
  }

  it("expands spelled-out digits", () => {
    expect(expandNumberWords("zero seven one two")).toBe("0 7 1 2");
  });

  it("detects multiple phone numbers and deduplicates", () => {
    const result = detectPhoneNumbers(
      "katika call 0712 345 678 au +255 712 345 678 namba yangu",
    );
    expect(result).toEqual(["0712345678", "+255712345678"]);
  });
});
