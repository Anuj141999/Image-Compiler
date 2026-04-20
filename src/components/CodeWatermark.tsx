const SNIPPET = `def compile_image(img):
    pixels = read(img)
    tokens = ocr(pixels)
    return parse(tokens)

class Compiler:
    def __init__(self, lang):
        self.lang = lang
        self.errors = []

    def run(self, src):
        try:
            ast = self.parse(src)
            return self.exec(ast)
        except SyntaxError as e:
            self.errors.append(e)

for line in source.splitlines():
    if line.strip().startswith('#'):
        continue
    yield tokenize(line)

import numpy as np
arr = np.array([1, 2, 3, 4, 5])
print(arr.mean(), arr.std())

# image -> code -> output
async function analyze(img) {
  const code = await ocr(img);
  const result = await execute(code);
  return { code, result };
}

const errors = lines.filter(l => l.error);
if (errors.length) console.warn(errors);

SELECT id, name FROM users
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY id DESC LIMIT 100;

`;

const CodeWatermark = () => {
  const repeated = SNIPPET.repeat(8);
  return (
    <div className="code-watermark" aria-hidden="true">
      <div className="code-watermark-track">
        {repeated}
        {repeated}
      </div>
    </div>
  );
};

export default CodeWatermark;
