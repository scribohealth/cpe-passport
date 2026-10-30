import { mkdir, writeFile } from "node:fs/promises";
// Minimal PDFs with only static text. These are not official certificates/templates.
await mkdir(new URL("../docs/samples/", import.meta.url), { recursive: true });
for (const [name, title] of [
  ["registration", "Pharmacist registration - synthetic sample"],
  ["practising", "Annual practising certificate - synthetic sample"],
]) {
  const content = `BT /F1 18 Tf 60 740 Td (PRIVATE DEMONSTRATION) Tj 0 -35 Td /F1 12 Tf (${title}) Tj 0 -30 Td (Synthetic Pharmacist - TEST-001) Tj 0 -25 Td (Not a valid credential. Do not use for real enrolment.) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((o) => `${String(o).padStart(10, "0")} 00000 n \n`)
    .join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  await writeFile(
    new URL(`../docs/samples/demo-${name}.pdf`, import.meta.url),
    pdf,
  );
}
