export const createPdfFixture = async (): Promise<Uint8Array> => {
  const { PDFDocument } = await import("pdf-lib");
  const document = await PDFDocument.create();
  document.addPage([200, 100]);
  document.addPage([100, 200]);
  document.setTitle("OmniConvert fixture");
  document.setAuthor("AahPlexX");
  document.setSubject("Phase 9 document worker");
  document.setKeywords(["omniconvert", "fixture"]);
  document.setCreator("OmniConvert tests");
  document.setProducer("pdf-lib fixture");
  return document.save({ useObjectStreams: false });
};
